"""
Applications router — handles:
- Candidate registration & resume upload (/apply/{job_token})
- Background AI resume screening
- HR dashboard to view all applications
- Manual HR score overrides
"""
import asyncio
from fastapi import APIRouter, HTTPException, UploadFile, File, Form, BackgroundTasks, Depends
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.database import get_db
from app.models import CandidateRegister, ApplicationOut
from app.auth import get_current_company
from app.file_storage import save_resume, get_full_resume_path
from app.resume_screener import screen_resume
from app.email_service import (
    send_resume_rejection_email,
    send_voice_round_invite_email,
)
from app.config import get_settings

settings = get_settings()
router = APIRouter(prefix="/api/applications", tags=["Applications"])


def _serialize_app(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "job_id": str(doc["job_id"]),
        "job_title": doc.get("job_title", ""),
        "company_name": doc.get("company_name", ""),
        "candidate_id": str(doc["candidate_id"]),
        "candidate_name": doc.get("candidate_name", ""),
        "candidate_email": doc.get("candidate_email", ""),
        "resume_url": doc.get("resume_url", ""),
        "resume_score": doc.get("resume_score"),
        "resume_feedback": doc.get("resume_feedback"),
        "voice_score": doc.get("voice_score"),
        "dsa_score": doc.get("dsa_score"),
        "hr_score": doc.get("hr_score"),
        "final_score": doc.get("final_score"),
        "status": doc.get("status", "applied"),
        "skills_matched": doc.get("skills_matched", []),
        "skills_missing": doc.get("skills_missing", []),
        "profile_skills_matched": doc.get("profile_skills_matched", []),
        "keyword_match_percentage": doc.get("keyword_match_percentage"),
        "jd_keywords_matched": doc.get("jd_keywords_matched", []),
        "experience_match": doc.get("experience_match"),
        "education_match": doc.get("education_match"),
        "strengths": doc.get("strengths", []),
        "weaknesses": doc.get("weaknesses", []),
        "pipeline": doc.get("pipeline"),
        "applied_at": doc.get("applied_at", datetime.utcnow()).isoformat(),
        "updated_at": doc.get("updated_at", datetime.utcnow()).isoformat(),
    }


async def _run_resume_screening(application_id: str, job_id: str, resume_filepath: str):
    """Background task: screen resume and update application status."""
    db = get_db()
    try:
        # Fetch job details
        job = await db.jobs.find_one({"_id": ObjectId(job_id)})
        if not job:
            return

        application = await db.applications.find_one({"_id": ObjectId(application_id)})
        if not application:
            return

        # Update status to screening
        await db.applications.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": {"status": "resume_screening", "updated_at": datetime.utcnow()}}
        )

        # Fetch candidate to compare profile skills keywords with JD
        candidate = None
        if application.get("candidate_id"):
            cid = application["candidate_id"]
            cid_oid = cid if isinstance(cid, ObjectId) else ObjectId(cid)
            candidate = await db.candidates.find_one({"_id": cid_oid})
        if not candidate and application.get("candidate_email"):
            candidate = await db.candidates.find_one({"email": application["candidate_email"].lower()})

        candidate_skills = candidate.get("skills", []) if candidate else []
        candidate_exp = candidate.get("experience_years", 0) if candidate else 0
        candidate_education = candidate.get("education", []) if candidate else []
        candidate_headline = candidate.get("headline", "") if candidate else ""

        # Run optimized resume screening comparing resume text + profile skills against JD
        result = await screen_resume(
            resume_filepath=resume_filepath,
            jd_text=job.get("description", ""),
            required_skills=job.get("required_skills", []),
            min_experience=job.get("min_experience_years", 0),
            education_req=job.get("education_requirement"),
            job_title=job.get("title", ""),
            candidate_skills=candidate_skills,
            candidate_exp=candidate_exp,
            candidate_education=candidate_education,
            candidate_headline=candidate_headline,
        )

        cutoff = job.get("cutoffs", {}).get("resume_score", 65.0)
        passed = result.score >= cutoff

        # Update application with rich matching results
        update_data = {
            "resume_score": result.score,
            "resume_feedback": result.overall_feedback,
            "skills_matched": result.skills_matched,
            "skills_missing": result.skills_missing,
            "profile_skills_matched": getattr(result, "profile_skills_matched", []),
            "keyword_match_percentage": getattr(result, "keyword_match_percentage", None),
            "jd_keywords_matched": getattr(result, "jd_keywords_matched", []),
            "strengths": result.strengths,
            "weaknesses": result.weaknesses,
            "experience_match": result.experience_match,
            "education_match": result.education_match,
            "status": "voice_round_invited" if passed else "resume_rejected",
            "updated_at": datetime.utcnow(),
        }
        await db.applications.update_one({"_id": ObjectId(application_id)}, {"$set": update_data})

        # Send email
        candidate_name = application.get("candidate_name", "Candidate")
        candidate_email = application.get("candidate_email", "")
        job_title = job.get("title", "Position")
        company_name = job.get("company_name", "Company")

        if passed:
            voice_link = f"{settings.FRONTEND_URL}/interview/voice/{application_id}"
            send_voice_round_invite_email(
                to=candidate_email,
                candidate_name=candidate_name,
                job_title=job_title,
                company_name=company_name,
                score=result.score,
                voice_link=voice_link,
            )
        else:
            send_resume_rejection_email(
                to=candidate_email,
                candidate_name=candidate_name,
                job_title=job_title,
                company_name=company_name,
                score=result.score,
                feedback=result.overall_feedback,
            )

    except Exception as e:
        print(f"[ERROR] Resume screening failed for application {application_id}: {e}")
        await db.applications.update_one(
            {"_id": ObjectId(application_id)},
            {"$set": {"status": "applied", "screening_error": str(e), "updated_at": datetime.utcnow()}}
        )


# ── Public: Candidate applies ──────────────────────────────────────────────────

@router.post("/apply/{job_token}")
async def apply_for_job(
    job_token: str,
    background_tasks: BackgroundTasks,
    name: str = Form(...),
    email: str = Form(...),
    phone: str = Form(...),
    college_or_company: str = Form(...),
    graduation_year: Optional[int] = Form(None),
    resume: UploadFile = File(...),
):
    db = get_db()

    # Validate job
    job = await db.jobs.find_one({"job_token": job_token, "is_active": True})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer accepting applications")

    # Check deadline
    if job.get("deadline") and datetime.utcnow() > job["deadline"]:
        raise HTTPException(status_code=400, detail="Application deadline has passed")

    # Check duplicate application (by job and email)
    clean_email = email.strip().lower()
    existing = await db.applications.find_one({
        "job_id": job["_id"],
        "candidate_email": clean_email,
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted an application for this position. Candidates can only apply once per job."
        )

    # Upsert candidate
    candidate_doc = {
        "name": name,
        "email": email.lower(),
        "phone": phone,
        "college_or_company": college_or_company,
        "graduation_year": graduation_year,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    candidate_result = await db.candidates.find_one_and_update(
        {"email": email.lower()},
        {"$setOnInsert": candidate_doc},
        upsert=True,
        return_document=True,
    )
    if candidate_result is None:
        # If newly inserted, fetch it
        candidate_result = await db.candidates.find_one({"email": email.lower()})

    candidate_id = candidate_result["_id"]

    # Save resume
    resume_url = await save_resume(resume, str(candidate_id))

    # Create application
    from app.routers.jobs import DEFAULT_SOFTWARE_PIPELINE
    pipeline = job.get("pipeline") or DEFAULT_SOFTWARE_PIPELINE

    app_doc = {
        "job_id": job["_id"],
        "job_title": job["title"],
        "company_id": job["company_id"],
        "company_name": job.get("company_name", ""),
        "candidate_id": candidate_id,
        "candidate_name": name,
        "candidate_email": email.lower(),
        "resume_url": resume_url,
        "status": "applied",
        "pipeline": pipeline,
        "applied_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    app_result = await db.applications.insert_one(app_doc)
    application_id = str(app_result.inserted_id)

    # Increment application count on job
    await db.jobs.update_one({"_id": job["_id"]}, {"$inc": {"application_count": 1}})

    # Get full local path for screener
    resume_filepath = get_full_resume_path(resume_url)

    # Kick off background screening
    background_tasks.add_task(
        _run_resume_screening,
        application_id=application_id,
        job_id=str(job["_id"]),
        resume_filepath=resume_filepath,
    )

    return {
        "message": "Application submitted successfully! Our AI is reviewing your resume.",
        "application_id": application_id,
        "status": "applied",
    }


# ── HR: View applications for a job ───────────────────────────────────────────

@router.get("/job/{job_id}", response_model=List[dict])
async def get_applications_for_job(job_id: str, company: dict = Depends(get_current_company)):
    db = get_db()

    # Verify job belongs to company
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "company_id": company["_id"]})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    cursor = db.applications.find({"job_id": ObjectId(job_id)}).sort("resume_score", -1)
    applications = []
    async for doc in cursor:
        applications.append(_serialize_app(doc))
    return applications


@router.get("/{application_id}")
async def get_application_detail(application_id: str, company: dict = Depends(get_current_company)):
    db = get_db()
    doc = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")

    # Verify the job belongs to this company
    job = await db.jobs.find_one({"_id": doc["job_id"], "company_id": company["_id"]})
    if not job:
        raise HTTPException(status_code=403, detail="Not authorized to view this application")

    return _serialize_app(doc)


@router.post("/{application_id}/hr-score")
async def set_hr_score(
    application_id: str,
    score: float,
    notes: Optional[str] = None,
    company: dict = Depends(get_current_company),
):
    """HR manually enters score after the HR video round."""
    db = get_db()
    doc = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")

    # Compute final composite score
    resume_score = doc.get("resume_score", 0) or 0
    voice_score = doc.get("voice_score", 0) or 0
    dsa_score = doc.get("dsa_score", 0) or 0
    final_score = round((resume_score * 0.20) + (voice_score * 0.30) + (dsa_score * 0.30) + (score * 0.20), 2)

    update = {
        "hr_score": score,
        "hr_notes": notes,
        "final_score": final_score,
        "status": "hr_round_completed",
        "updated_at": datetime.utcnow(),
    }
    await db.applications.update_one({"_id": ObjectId(application_id)}, {"$set": update})
    return {"final_score": final_score, "hr_score": score}


@router.post("/{application_id}/finalize")
async def finalize_decision(
    application_id: str,
    decision: str,  # "selected" | "rejected"
    company: dict = Depends(get_current_company),
):
    """HR finalizes hiring decision."""
    from app.email_service import send_selection_email, send_resume_rejection_email
    db = get_db()
    doc = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")

    status_value = "selected" if decision == "selected" else "rejected"
    await db.applications.update_one(
        {"_id": ObjectId(application_id)},
        {"$set": {"status": status_value, "updated_at": datetime.utcnow()}}
    )

    if decision == "selected":
        send_selection_email(
            to=doc["candidate_email"],
            candidate_name=doc["candidate_name"],
            job_title=doc.get("job_title", ""),
            company_name=doc.get("company_name", ""),
            final_score=doc.get("final_score", 0),
        )

    return {"status": status_value}


# ── Candidate: check own application status ───────────────────────────────────

@router.get("/status/{application_id}/public")
async def get_application_status_public(application_id: str):
    db = get_db()
    doc = await db.applications.find_one({"_id": ObjectId(application_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Application not found")

    job = None
    if doc.get("job_id"):
        jid = doc["job_id"] if isinstance(doc["job_id"], ObjectId) else ObjectId(doc["job_id"])
        job = await db.jobs.find_one({"_id": jid})

    from app.routers.jobs import DEFAULT_SOFTWARE_PIPELINE
    pipeline = doc.get("pipeline") or (job.get("pipeline") if job else None) or DEFAULT_SOFTWARE_PIPELINE

    return {
        "application_id": application_id,
        "job_id": str(doc.get("job_id", "")),
        "status": doc.get("status", "applied"),
        "resume_score": doc.get("resume_score"),
        "resume_feedback": doc.get("resume_feedback"),
        "skills_matched": doc.get("skills_matched", []),
        "skills_missing": doc.get("skills_missing", []),
        "profile_skills_matched": doc.get("profile_skills_matched", []),
        "keyword_match_percentage": doc.get("keyword_match_percentage"),
        "strengths": doc.get("strengths", []),
        "weaknesses": doc.get("weaknesses", []),
        "candidate_name": doc.get("candidate_name"),
        "job_title": doc.get("job_title"),
        "company_name": doc.get("company_name"),
        "pipeline": pipeline,
    }
