import os
import re
from datetime import datetime, timedelta
from typing import Optional, List
from bson import ObjectId
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form, status, Query
from fastapi.responses import FileResponse

from app.database import get_db
from app.config import get_settings
from app.auth import get_current_company
from app.routers.candidate_auth import get_optional_candidate
from app.models import (
    ProctorConsentRequest,
    ProctorEventsBatchRequest,
    ProctorFinalizeRequest,
)
from app.proctor.scoring import (
    ProctorEventType,
    ProctorSeverity,
    ProctorRiskLevel,
    get_server_severity,
    compute_session_score,
)
from app.proctor.storage import (
    save_proctor_file,
    get_proctor_file_path,
    get_proctor_upload_dir,
)

settings = get_settings()
router = APIRouter(prefix="/api/proctor", tags=["Proctoring & Anti-Cheat"])


# ── Auth & Permission Helpers ──────────────────────────────────────────────────

async def verify_candidate_application(application_id: str, candidate: Optional[dict] = None) -> dict:
    """Confirms that application exists and belongs to the authenticated candidate (if authenticated)."""
    db = get_db()
    try:
        app_obj_id = ObjectId(application_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid application ID format")

    application = await db.applications.find_one({"_id": app_obj_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    if candidate:
        candidate_id = candidate.get("_id")
        candidate_email = candidate.get("email", "").lower()
        app_cand_id = application.get("candidate_id")
        app_cand_email = application.get("candidate_email", "").lower()

        # If logged in as another candidate, reject
        if candidate_id and app_cand_id and str(candidate_id) != str(app_cand_id) and candidate_email != app_cand_email:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access forbidden: You do not own this application"
            )

    return application


async def verify_recruiter_application(application_id: str, company: dict) -> dict:
    """Confirms that application exists and belongs to the recruiter's company."""
    db = get_db()
    try:
        app_obj_id = ObjectId(application_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid application ID format")

    application = await db.applications.find_one({"_id": app_obj_id})
    if not application:
        raise HTTPException(status_code=404, detail="Application not found")

    company_id = company.get("_id")
    app_comp_id = application.get("company_id")

    if not company_id or not app_comp_id or str(company_id) != str(app_comp_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access forbidden: Recruiter does not own this job application"
        )

    return application


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.post("/{application_id}/session/start")
async def start_or_resume_session(
    application_id: str,
    session_type: str = Query("voice", pattern="^(voice|dsa)$"),
    candidate: Optional[dict] = Depends(get_optional_candidate),
):
    """Initializes or resumes a proctor session document. Returns feature flag state."""
    application = await verify_candidate_application(application_id, candidate)
    db = get_db()
    now = datetime.utcnow()

    session = await db.proctor_sessions.find_one({
        "application_id": application["_id"],
        "session_type": session_type,
    })

    if not session:
        candidate_obj_id = candidate["_id"] if candidate else application.get("candidate_id")
        session_doc = {
            "application_id": application["_id"],
            "candidate_id": candidate_obj_id,
            "session_type": session_type,
            "status": "pending_setup",
            "consent": None,
            "monitor_check": {
                "status": "pending",
                "screen_count": None,
            },
            "risk_score": 0,
            "risk_level": "low",
            "summary": "Session initialized.",
            "media_purge_after": None,
            "media_purged": False,
            "started_at": now,
            "ended_at": None,
        }
        res = await db.proctor_sessions.insert_one(session_doc)
        session_id = str(res.inserted_id)
        consent_accepted = False
        curr_status = "pending_setup"
    else:
        session_id = str(session["_id"])
        consent_accepted = bool(session.get("consent") and session["consent"].get("accepted_at"))
        curr_status = session.get("status", "in_progress")

    return {
        "session_id": session_id,
        "application_id": application_id,
        "proctoring_enabled": settings.PROCTORING_ENABLED,
        "status": curr_status,
        "consent_accepted": consent_accepted,
        "session_type": session_type,
    }


@router.post("/{application_id}/consent")
async def record_consent(
    application_id: str,
    payload: ProctorConsentRequest,
    candidate: Optional[dict] = Depends(get_optional_candidate),
):
    """Records candidate consent version and timestamp."""
    application = await verify_candidate_application(application_id, candidate)
    db = get_db()
    now = datetime.utcnow()

    res = await db.proctor_sessions.update_one(
        {"application_id": application["_id"]},
        {
            "$set": {
                "consent": {
                    "version": payload.version,
                    "accepted_at": now,
                },
                "status": "in_progress",
            }
        }
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Proctor session not found for this application")

    return {"status": "consent_recorded", "version": payload.version, "accepted_at": now.isoformat()}


@router.post("/{application_id}/events")
async def log_events_batch(
    application_id: str,
    payload: ProctorEventsBatchRequest,
    candidate: Optional[dict] = Depends(get_optional_candidate),
):
    """
    Batched event logging (up to 100 events).
    Dedupes on (session_id, client_event_id).
    Derives severity strictly on the server from event_type.
    """
    if len(payload.events) > 100:
        raise HTTPException(status_code=400, detail="Batch exceeds maximum limit of 100 events")

    application = await verify_candidate_application(application_id, candidate)
    db = get_db()
    now = datetime.utcnow()

    session = await db.proctor_sessions.find_one({"application_id": application["_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Proctor session not found")

    inserted_count = 0
    for ev in payload.events:
        try:
            ev_enum = ProctorEventType(ev.event_type)
            server_severity = get_server_severity(ev.event_type)
        except ValueError:
            raise HTTPException(status_code=400, detail=f"Unknown or invalid event type: {ev.event_type}")

        event_doc = {
            "session_id": session["_id"],
            "application_id": application["_id"],
            "client_event_id": ev.client_event_id,
            "event_type": ev_enum.value,
            "severity": server_severity.value,  # Authoritative server mapping
            "occurred_at": ev.occurred_at,
            "received_at": now,
            "detail": ev.detail or "",
            "duration_seconds": ev.duration_seconds,
            "snapshot_path": None,
            "metadata": ev.metadata or {},
        }

        # Dedupe via upsert on (session_id, client_event_id)
        res = await db.proctor_events.update_one(
            {"session_id": session["_id"], "client_event_id": ev.client_event_id},
            {"$setOnInsert": event_doc},
            upsert=True
        )
        if res.upserted_id:
            inserted_count += 1

    return {"status": "events_recorded", "accepted": len(payload.events), "inserted": inserted_count}


@router.post("/{application_id}/snapshot")
async def upload_snapshot(
    application_id: str,
    image: UploadFile = File(...),
    client_event_id: Optional[str] = Form(None),
    candidate: Optional[dict] = Depends(get_optional_candidate),
):
    """
    Uploads a flagged frame JPEG snapshot (max 500 KB).
    Links to the corresponding event if client_event_id is provided.
    """
    if image.content_type not in ["image/jpeg", "image/jpg"]:
        raise HTTPException(status_code=400, detail="Only image/jpeg format is accepted for snapshots")

    application = await verify_candidate_application(application_id, candidate)
    db = get_db()

    image_bytes = await image.read()
    file_id, full_path = await save_proctor_file(application_id, image_bytes, "jpg", max_bytes=500 * 1024)

    if client_event_id:
        session = await db.proctor_sessions.find_one({"application_id": application["_id"]})
        if session:
            await db.proctor_events.update_one(
                {"session_id": session["_id"], "client_event_id": client_event_id},
                {"$set": {"snapshot_path": full_path}}
            )

    return {"status": "snapshot_saved", "file_id": file_id}


@router.post("/{application_id}/audio-anomaly")
async def upload_audio_anomaly(
    application_id: str,
    audio: UploadFile = File(...),
    candidate: Optional[dict] = Depends(get_optional_candidate),
):
    """
    Uploads a flagged background audio anomaly clip (WAV format, max 1MB).
    """
    application = await verify_candidate_application(application_id, candidate)
    db = get_db()

    audio_bytes = await audio.read()
    file_id, full_path = await save_proctor_file(application_id, audio_bytes, "wav", max_bytes=1024 * 1024)

    return {"status": "audio_saved", "file_id": file_id}


@router.post("/{application_id}/session/finalize")
async def finalize_session(
    application_id: str,
    payload: Optional[ProctorFinalizeRequest] = None,
    candidate: Optional[dict] = Depends(get_optional_candidate),
):
    """
    Ends session, recomputes risk score and level from stored events,
    sets media_purge_after = ended_at + 60 days.
    """
    application = await verify_candidate_application(application_id, candidate)
    db = get_db()
    now = datetime.utcnow()

    session = await db.proctor_sessions.find_one({"application_id": application["_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="Proctor session not found")

    # Aggregate all events from DB
    cursor = db.proctor_events.find({"session_id": session["_id"]})
    event_counts = {}
    event_list = []
    async for ev in cursor:
        etype = ev["event_type"]
        event_counts[etype] = event_counts.get(etype, 0) + 1
        event_list.append(ev)

    score, risk_level, breakdown = compute_session_score(event_counts)

    # Determine status
    if risk_level in (ProctorRiskLevel.CRITICAL, ProctorRiskLevel.HIGH):
        session_status = "flagged"
    else:
        session_status = "passed"

    summary_text = payload.summary if payload and payload.summary else (
        f"Session finalized with score {score}/100 ({risk_level.value} risk). Total events: {len(event_list)}."
    )

    purge_date = now + timedelta(days=60)

    await db.proctor_sessions.update_one(
        {"_id": session["_id"]},
        {
            "$set": {
                "status": session_status,
                "risk_score": score,
                "risk_level": risk_level.value,
                "summary": summary_text,
                "ended_at": now,
                "media_purge_after": purge_date,
                "media_purged": False,
            }
        }
    )

    return {
        "status": session_status,
        "risk_score": score,
        "risk_level": risk_level.value,
        "summary": summary_text,
        "media_purge_after": purge_date.isoformat(),
    }


@router.get("/{application_id}/report")
async def get_proctor_report(
    application_id: str,
    company: dict = Depends(get_current_company),
):
    """Recruiter only. Full proctor session details, score, events, and authorized media links."""
    application = await verify_recruiter_application(application_id, company)
    db = get_db()

    session = await db.proctor_sessions.find_one({"application_id": application["_id"]})
    if not session:
        raise HTTPException(status_code=404, detail="No proctor session recorded for this application")

    cursor = db.proctor_events.find({"session_id": session["_id"]}).sort("received_at", 1)
    events = []
    async for ev in cursor:
        snapshot_url = None
        if ev.get("snapshot_path"):
            fname = os.path.basename(ev["snapshot_path"])
            file_id = os.path.splitext(fname)[0]
            snapshot_url = f"/api/proctor/{application_id}/media/{file_id}"

        events.append({
            "client_event_id": ev.get("client_event_id"),
            "event_type": ev.get("event_type"),
            "severity": ev.get("severity"),
            "occurred_at": ev.get("occurred_at").isoformat() if ev.get("occurred_at") else None,
            "received_at": ev.get("received_at").isoformat() if ev.get("received_at") else None,
            "detail": ev.get("detail"),
            "duration_seconds": ev.get("duration_seconds"),
            "snapshot_url": snapshot_url,
            "metadata": ev.get("metadata", {}),
        })

    return {
        "session_id": str(session["_id"]),
        "application_id": application_id,
        "candidate_id": str(session.get("candidate_id", "")),
        "candidate_name": application.get("candidate_name", ""),
        "session_type": session.get("session_type", "voice"),
        "status": session.get("status", "pending_setup"),
        "consent": session.get("consent"),
        "monitor_check": session.get("monitor_check", {}),
        "risk_score": session.get("risk_score", 0),
        "risk_level": session.get("risk_level", "low"),
        "summary": session.get("summary", ""),
        "total_events": len(events),
        "events": events,
        "media_purge_after": session.get("media_purge_after").isoformat() if session.get("media_purge_after") else None,
        "media_purged": session.get("media_purged", False),
        "disclaimer_notes": (
            "Automated signals are indicators for human review, not proof of misconduct. "
            "Browser-side checks can be bypassed by a determined candidate. "
            "Recruiters must make the final decision; risk scores do not represent an automated rejection."
        ),
    }


@router.get("/{application_id}/media/{file_id}")
async def get_authorized_media(
    application_id: str,
    file_id: str,
    company: dict = Depends(get_current_company),
):
    """
    Recruiter only. Serves media files through an authorized route.
    Uploads folder is NOT statically mounted.
    """
    await verify_recruiter_application(application_id, company)
    full_path = get_proctor_file_path(application_id, file_id)

    if not full_path or not os.path.exists(full_path):
        raise HTTPException(status_code=404, detail="Media file not found or has been purged")

    ext = os.path.splitext(full_path)[1].lower()
    media_type = "image/jpeg" if ext in [".jpg", ".jpeg"] else ("audio/wav" if ext == ".wav" else "application/octet-stream")

    return FileResponse(full_path, media_type=media_type)
