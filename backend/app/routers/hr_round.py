"""
Round 3: Dedicated HR Portal & Video Meeting Scheduling Router
- Post-DSA Cleared Queue listing all qualified candidates
- Sequential scheduling engine with automated buffer gap calculation
- Group / All-at-once scheduling mode
- Candidate audit dossier (Resume + Voice AI + DSA code & quality)
- Evaluation scorecard, 4-round composite score, and offer/rejection emails
"""
import uuid
import re
from datetime import datetime, timedelta
from typing import Optional, Literal, List
from pydantic import BaseModel, Field
from fastapi import APIRouter, HTTPException, Depends
from bson import ObjectId

from app.database import get_db
from app.config import get_settings
from app.auth import get_current_company
from app.email_service import (
    send_hr_round_invite_email,
    send_selection_email,
    send_final_rejection_email,
)

settings = get_settings()
router = APIRouter(prefix="/api/hr", tags=["HR Interview Round"])


# ── Schemas ───────────────────────────────────────────────────────────────────

class HRScheduleInput(BaseModel):
    scheduled_time: str
    meeting_platform: Optional[Literal["google_meet", "microsoft_teams"]] = None
    custom_meeting_link: Optional[str] = None
    notes: Optional[str] = None


class BatchScheduleInput(BaseModel):
    application_ids: List[str]
    start_time: str  # Format: "YYYY-MM-DDTHH:MM" or parseable datetime string
    duration_minutes: int = 30
    gap_minutes: int = 10
    meeting_platform: Optional[Literal["google_meet", "microsoft_teams"]] = "google_meet"
    mode: Literal["sequential", "group"] = "sequential"
    notes: Optional[str] = None


class SingleScheduleInput(BaseModel):
    application_id: str
    scheduled_time: str
    duration_minutes: int = 30
    meeting_platform: Optional[Literal["google_meet", "microsoft_teams"]] = "google_meet"
    custom_meeting_link: Optional[str] = None
    notes: Optional[str] = None


class HREvaluateInput(BaseModel):
    communication_score: float = Field(..., ge=0, le=100)
    cultural_fit_score: float = Field(..., ge=0, le=100)
    domain_score: float = Field(..., ge=0, le=100)
    overall_hr_score: float = Field(..., ge=0, le=100)
    notes: Optional[str] = None
    decision: Literal["selected", "rejected"]


# ── Helpers ───────────────────────────────────────────────────────────────────

def _generate_meeting_link(platform: str) -> str:
    room_id = f"{uuid.uuid4().hex[:3]}-{uuid.uuid4().hex[:4]}-{uuid.uuid4().hex[:3]}"
    if platform == "microsoft_teams":
        return f"https://teams.microsoft.com/l/meetup-join/19%3ameeting_{uuid.uuid4().hex[:12]}%40thread.v2/0?context=%7b%22Tid%22%3a%22prismhire-enterprise%22%7d"
    else:
        return f"https://meet.google.com/{room_id}"


def _parse_datetime(dt_str: str) -> datetime:
    """Parse various datetime string formats safely."""
    formats = (
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M",
        "%Y-%m-%d %I:%M %p",
        "%Y/%m/%d %H:%M",
    )
    for fmt in formats:
        try:
            return datetime.strptime(dt_str.strip(), fmt)
        except (ValueError, TypeError):
            continue
    try:
        from dateutil import parser
        return parser.parse(dt_str)
    except Exception:
        # Fallback to 2 hours from now
        return datetime.utcnow() + timedelta(hours=2)


# ── GET /api/hr/queue/cleared ─────────────────────────────────────────────────

@router.get("/queue/cleared")
async def get_cleared_candidates_queue(
    company: dict = Depends(get_current_company),
    status_filter: Optional[str] = None,
):
    """
    Fetch all candidates who cleared the DSA round or have been invited/scheduled
    for HR round, enriched with scores, dossiers, and meeting timetable status.
    """
    db = get_db()

    # Find jobs for this company
    jobs_cursor = db.jobs.find({"company_id": company["_id"]})
    company_jobs = []
    async for j in jobs_cursor:
        company_jobs.append(j)

    job_map = {j["_id"]: j for j in company_jobs}
    job_ids = list(job_map.keys())

    if not job_ids:
        return []

    # Query applications that cleared DSA or are in HR round
    query = {
        "job_id": {"$in": job_ids},
        "$or": [
            {"status": {"$in": ["dsa_cleared", "hr_round_invited", "hr_round_scheduled", "hr_round_completed", "selected", "rejected"]}},
            {"dsa_score": {"$exists": True, "$ne": None, "$gte": 30.0}},
        ]
    }

    cursor = db.applications.find(query).sort("applied_at", -1)
    results = []

    async for doc in cursor:
        app_id = doc["_id"]
        job = job_map.get(doc["job_id"], {})

        # Check DSA session details
        dsa_session = await db.dsa_sessions.find_one({"application_id": app_id})
        dsa_submissions_count = len(dsa_session.get("submissions", {})) if dsa_session else 0

        # Determine queue status: 'pending_schedule' | 'scheduled' | 'evaluated'
        raw_status = doc.get("status", "applied")
        is_scheduled = bool(doc.get("scheduled_hr_time"))
        is_evaluated = raw_status in ["selected", "rejected", "hr_round_completed"]

        if is_evaluated:
            queue_status = "evaluated"
        elif is_scheduled:
            queue_status = "scheduled"
        else:
            queue_status = "pending_schedule"

        if status_filter and status_filter != "all" and queue_status != status_filter:
            continue

        results.append({
            "application_id": str(app_id),
            "candidate_id": str(doc.get("candidate_id", "")),
            "candidate_name": doc.get("candidate_name", "Unknown Candidate"),
            "candidate_email": doc.get("candidate_email", ""),
            "candidate_phone": doc.get("candidate_phone", ""),
            "job_id": str(doc["job_id"]),
            "job_title": doc.get("job_title", job.get("title", "Engineering")),
            "status": raw_status,
            "queue_status": queue_status,
            "resume_url": doc.get("resume_url"),
            "resume_score": doc.get("resume_score"),
            "resume_feedback": doc.get("resume_feedback"),
            "skills_matched": doc.get("skills_matched", []),
            "skills_missing": doc.get("skills_missing", []),
            "voice_score": doc.get("voice_score"),
            "dsa_score": doc.get("dsa_score"),
            "hr_score": doc.get("hr_score"),
            "final_score": doc.get("final_score"),
            "dsa_submissions_count": dsa_submissions_count,
            "meeting_platform": doc.get("meeting_platform", job.get("meeting_platform", "google_meet")),
            "meeting_link": doc.get("meeting_link"),
            "scheduled_hr_time": doc.get("scheduled_hr_time"),
            "scheduled_hr_end_time": doc.get("scheduled_hr_end_time"),
            "scheduled_hr_timestamp": doc.get("scheduled_hr_timestamp"),
            "slot_duration_mins": doc.get("slot_duration_mins", 30),
            "applied_at": doc.get("applied_at").isoformat() if hasattr(doc.get("applied_at"), "isoformat") else str(doc.get("applied_at", "")),
            "cutoff_required": job.get("cutoffs", {}).get("dsa_round_score", 55.0),
        })

    return results


# ── POST /api/hr/schedule/batch ───────────────────────────────────────────────

@router.post("/schedule/batch")
async def batch_schedule_hr_interviews(
    payload: BatchScheduleInput,
    company: dict = Depends(get_current_company),
):
    """
    Schedule multiple candidates either sequentially with buffer gaps between each interview
    or all at once for group discussion / panel interview.
    Automatically assigns meeting rooms and sends candidate notification emails.
    """
    db = get_db()
    if not payload.application_ids:
        raise HTTPException(status_code=400, detail="No candidate application IDs provided")

    start_dt = _parse_datetime(payload.start_time)
    duration = max(10, min(120, payload.duration_minutes))
    gap = max(0, min(60, payload.gap_minutes))
    platform = payload.meeting_platform or "google_meet"

    timetable = []

    # If group mode, generate one room for all
    group_meeting_link = _generate_meeting_link(platform) if payload.mode == "group" else None

    for i, app_id_str in enumerate(payload.application_ids):
        try:
            app_id = ObjectId(app_id_str)
        except Exception:
            continue

        app_doc = await db.applications.find_one({"_id": app_id})
        if not app_doc:
            continue

        # Calculate slot times
        if payload.mode == "sequential":
            slot_start = start_dt + timedelta(minutes=i * (duration + gap))
            slot_end = slot_start + timedelta(minutes=duration)
            meeting_link = _generate_meeting_link(platform)
        else:
            # Group mode: all start at the same time
            slot_start = start_dt
            slot_end = start_dt + timedelta(minutes=duration)
            meeting_link = group_meeting_link

        time_display = f"{slot_start.strftime('%b %d, %Y at %I:%M %p')} - {slot_end.strftime('%I:%M %p')}"

        update_data = {
            "status": "hr_round_scheduled",
            "meeting_platform": platform,
            "meeting_link": meeting_link,
            "scheduled_hr_time": time_display,
            "scheduled_hr_end_time": slot_end.strftime("%I:%M %p"),
            "scheduled_hr_timestamp": slot_start.isoformat(),
            "slot_duration_mins": duration,
            "slot_gap_mins": gap if payload.mode == "sequential" else 0,
            "hr_scheduling_notes": payload.notes,
            "updated_at": datetime.utcnow(),
        }

        await db.applications.update_one({"_id": app_id}, {"$set": update_data})

        # Dispatch email notification to candidate
        try:
            send_hr_round_invite_email(
                to=app_doc["candidate_email"],
                candidate_name=app_doc["candidate_name"],
                job_title=app_doc.get("job_title", "Software Engineer"),
                company_name=company.get("name", "PrismHire"),
                dsa_score=app_doc.get("dsa_score", 80.0) or 80.0,
                platform=platform,
                meeting_link=meeting_link,
                scheduled_time=time_display,
            )
        except Exception as e:
            print(f"[WARN] Failed to send email invite: {e}")

        timetable.append({
            "application_id": app_id_str,
            "candidate_name": app_doc.get("candidate_name"),
            "candidate_email": app_doc.get("candidate_email"),
            "job_title": app_doc.get("job_title"),
            "start_time": slot_start.strftime("%Y-%m-%d %I:%M %p"),
            "end_time": slot_end.strftime("%I:%M %p"),
            "meeting_link": meeting_link,
            "meeting_platform": platform,
        })

    return {
        "message": f"Successfully scheduled {len(timetable)} candidate(s)!",
        "scheduled_count": len(timetable),
        "mode": payload.mode,
        "duration_minutes": duration,
        "gap_minutes": gap if payload.mode == "sequential" else 0,
        "timetable": timetable,
    }


# ── POST /api/hr/schedule/single ──────────────────────────────────────────────

@router.post("/schedule/single")
async def single_schedule_hr_interview(
    payload: SingleScheduleInput,
    company: dict = Depends(get_current_company),
):
    """Schedule or reschedule an individual candidate for HR interview."""
    db = get_db()
    try:
        app_id = ObjectId(payload.application_id)
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid application ID")

    app_doc = await db.applications.find_one({"_id": app_id})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    platform = payload.meeting_platform or "google_meet"
    meeting_link = payload.custom_meeting_link or _generate_meeting_link(platform)
    start_dt = _parse_datetime(payload.scheduled_time)
    duration = max(10, min(120, payload.duration_minutes))
    slot_end = start_dt + timedelta(minutes=duration)

    time_display = f"{start_dt.strftime('%b %d, %Y at %I:%M %p')} - {slot_end.strftime('%I:%M %p')}"

    update_data = {
        "status": "hr_round_scheduled",
        "meeting_platform": platform,
        "meeting_link": meeting_link,
        "scheduled_hr_time": time_display,
        "scheduled_hr_end_time": slot_end.strftime("%I:%M %p"),
        "scheduled_hr_timestamp": start_dt.isoformat(),
        "slot_duration_mins": duration,
        "hr_scheduling_notes": payload.notes,
        "updated_at": datetime.utcnow(),
    }

    await db.applications.update_one({"_id": app_id}, {"$set": update_data})

    try:
        send_hr_round_invite_email(
            to=app_doc["candidate_email"],
            candidate_name=app_doc["candidate_name"],
            job_title=app_doc.get("job_title", "Software Engineer"),
            company_name=company.get("name", "PrismHire"),
            dsa_score=app_doc.get("dsa_score", 80.0) or 80.0,
            platform=platform,
            meeting_link=meeting_link,
            scheduled_time=time_display,
        )
    except Exception as e:
        print(f"[WARN] Failed to send single email invite: {e}")

    return {
        "message": f"Interview scheduled for {app_doc['candidate_name']}!",
        "scheduled_time": time_display,
        "meeting_link": meeting_link,
        "platform": platform,
    }


# ── GET /api/hr/{application_id}/summary ──────────────────────────────────────

@router.get("/{application_id}/summary")
async def get_candidate_full_dossier(
    application_id: str,
    company: dict = Depends(get_current_company),
):
    """Full candidate multi-round audit dossier for HR interviewers."""
    db = get_db()
    app_doc = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await db.jobs.find_one({"_id": app_doc["job_id"], "company_id": company["_id"]})
    if not job:
        raise HTTPException(status_code=403, detail="Unauthorized")

    voice_session = await db.voice_sessions.find_one({"application_id": ObjectId(application_id)})
    dsa_session = await db.dsa_sessions.find_one({"application_id": ObjectId(application_id)})

    return {
        "application": {
            "id": str(app_doc["_id"]),
            "candidate_name": app_doc.get("candidate_name"),
            "candidate_email": app_doc.get("candidate_email"),
            "candidate_phone": app_doc.get("candidate_phone", ""),
            "job_title": app_doc.get("job_title"),
            "status": app_doc.get("status"),
            "resume_url": app_doc.get("resume_url"),
            "resume_score": app_doc.get("resume_score"),
            "resume_feedback": app_doc.get("resume_feedback"),
            "skills_matched": app_doc.get("skills_matched", []),
            "skills_missing": app_doc.get("skills_missing", []),
            "voice_score": app_doc.get("voice_score"),
            "dsa_score": app_doc.get("dsa_score"),
            "hr_score": app_doc.get("hr_score"),
            "hr_breakdown": doc_hr_breakdown if (doc_hr_breakdown := app_doc.get("hr_breakdown")) else {},
            "hr_notes": app_doc.get("hr_notes", ""),
            "final_score": app_doc.get("final_score"),
            "meeting_platform": app_doc.get("meeting_platform"),
            "meeting_link": app_doc.get("meeting_link"),
            "scheduled_hr_time": app_doc.get("scheduled_hr_time"),
            "scheduled_hr_end_time": app_doc.get("scheduled_hr_end_time"),
        },
        "voice_details": {
            "completed": voice_session.get("is_completed", False) if voice_session else False,
            "final_score": voice_session.get("final_score") if voice_session else None,
            "level_breakdown": voice_session.get("level_breakdown") if voice_session else {},
            "questions": voice_session.get("questions", []) if voice_session else [],
        },
        "dsa_details": {
            "completed": dsa_session.get("is_completed", False) if dsa_session else False,
            "total_score": dsa_session.get("total_score") if dsa_session else None,
            "submissions": dsa_session.get("submissions", {}) if dsa_session else {},
        },
        "cutoffs": job.get("cutoffs", {}),
    }


# ── POST /api/hr/{application_id}/evaluate ────────────────────────────────────

@router.post("/{application_id}/evaluate")
async def evaluate_and_finalize_candidate(
    application_id: str,
    payload: HREvaluateInput,
    company: dict = Depends(get_current_company),
):
    """HR conducts evaluation, system calculates 4-round composite score & dispatches offer/rejection."""
    db = get_db()
    app_doc = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not app_doc:
        raise HTTPException(status_code=404, detail="Application not found")

    job = await db.jobs.find_one({"_id": app_doc["job_id"], "company_id": company["_id"]})
    if not job:
        raise HTTPException(status_code=403, detail="Unauthorized")

    resume_score = app_doc.get("resume_score", 0) or 0
    voice_score = app_doc.get("voice_score", 0) or 0
    dsa_score = app_doc.get("dsa_score", 0) or 0
    hr_score = payload.overall_hr_score

    # Composite: Resume 20%, Voice 30%, DSA 30%, HR 20%
    composite_final_score = round(
        (resume_score * 0.20) + (voice_score * 0.30) + (dsa_score * 0.30) + (hr_score * 0.20),
        1
    )

    status_value = "selected" if payload.decision == "selected" else "rejected"

    update = {
        "hr_score": hr_score,
        "hr_breakdown": {
            "communication": payload.communication_score,
            "cultural_fit": payload.cultural_fit_score,
            "domain_depth": payload.domain_score,
        },
        "hr_notes": payload.notes,
        "final_score": composite_final_score,
        "status": status_value,
        "updated_at": datetime.utcnow(),
    }
    await db.applications.update_one({"_id": ObjectId(application_id)}, {"$set": update})

    # Trigger final communications
    cand_email = app_doc["candidate_email"]
    cand_name = app_doc["candidate_name"]
    job_title = app_doc.get("job_title", "Software Engineer")
    comp_name = company.get("name", "PrismHire")

    try:
        if payload.decision == "selected":
            send_selection_email(
                to=cand_email,
                candidate_name=cand_name,
                job_title=job_title,
                company_name=comp_name,
                final_score=composite_final_score,
            )
        else:
            send_final_rejection_email(
                to=cand_email,
                candidate_name=cand_name,
                job_title=job_title,
                company_name=comp_name,
                final_score=composite_final_score,
            )
    except Exception as e:
        print(f"[WARN] Failed to send final decision email: {e}")

    return {
        "message": f"Candidate successfully marked as {status_value.upper()}!",
        "status": status_value,
        "final_score": composite_final_score,
        "hr_score": hr_score,
    }
