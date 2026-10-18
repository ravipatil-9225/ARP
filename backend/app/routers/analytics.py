"""
Analytics router — HR dashboard statistics.
"""
from fastapi import APIRouter, Depends
from app.auth import get_current_company
from app.database import get_db
from bson import ObjectId

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])


@router.get("/dashboard")
async def get_dashboard_stats(company: dict = Depends(get_current_company)):
    db = get_db()
    company_id = company["_id"]

    # Total jobs
    total_jobs = await db.jobs.count_documents({"company_id": company_id})
    active_jobs = await db.jobs.count_documents({"company_id": company_id, "is_active": True})

    # Get all company job IDs
    job_ids = []
    async for job in db.jobs.find({"company_id": company_id}, {"_id": 1}):
        job_ids.append(job["_id"])

    if not job_ids:
        return {
            "total_jobs": total_jobs,
            "active_jobs": active_jobs,
            "total_applications": 0,
            "pipeline": {},
            "recent_applications": [],
        }

    # Application counts by status
    pipeline = [
        {"$match": {"job_id": {"$in": job_ids}}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    status_counts = {}
    async for doc in db.applications.aggregate(pipeline):
        status_counts[doc["_id"]] = doc["count"]

    total_applications = sum(status_counts.values())

    # Map granular status codes to the 5 pipeline stages
    # Stage 1: Applications Ingested (All applicants who applied or were screened)
    stage_1_count = total_applications
    
    # Stage 2: Voice Assessment (Invited, in-progress, passed, or progressed beyond voice)
    voice_statuses = {
        "voice_round_invited", "voice_round_in_progress", "voice_round_passed",
        "dsa_round_invited", "dsa_round_in_progress", "dsa_round_passed",
        "hr_round_invited", "hr_round_completed", "selected"
    }
    stage_2_count = sum(status_counts.get(s, 0) for s in voice_statuses)

    # Stage 3: Technical Coding / DSA (Invited, in-progress, passed, or progressed beyond DSA)
    dsa_statuses = {
        "dsa_round_invited", "dsa_round_in_progress", "dsa_round_passed",
        "hr_round_invited", "hr_round_completed", "selected"
    }
    stage_3_count = sum(status_counts.get(s, 0) for s in dsa_statuses)

    # Stage 4: Executive HR Interview (Invited, completed, or selected)
    hr_statuses = {
        "hr_round_invited", "hr_round_completed", "selected"
    }
    stage_4_count = sum(status_counts.get(s, 0) for s in hr_statuses)

    # Stage 5: Selected & Offer Stage
    selected_statuses = {"selected"}
    stage_5_count = sum(status_counts.get(s, 0) for s in selected_statuses)

    mapped_pipeline = {
        "stage_1_applied": stage_1_count,
        "stage_2_voice": stage_2_count,
        "stage_3_dsa": stage_3_count,
        "stage_4_hr": stage_4_count,
        "stage_5_selected": stage_5_count,
        # Preserve raw status counts as well
        **status_counts
    }

    # Recent 5 applications
    recent = []
    cursor = db.applications.find(
        {"job_id": {"$in": job_ids}}
    ).sort("applied_at", -1).limit(5)
    async for doc in cursor:
        recent.append({
            "id": str(doc["_id"]),
            "candidate_name": doc.get("candidate_name"),
            "candidate_email": doc.get("candidate_email", ""),
            "job_title": doc.get("job_title"),
            "status": doc.get("status"),
            "resume_score": doc.get("resume_score"),
            "applied_at": doc.get("applied_at").isoformat() if doc.get("applied_at") else None,
        })

    return {
        "total_jobs": total_jobs,
        "active_jobs": active_jobs,
        "total_applications": total_applications,
        "pipeline": mapped_pipeline,
        "recent_applications": recent,
    }


@router.get("/job/{job_id}/funnel")
async def get_job_funnel(job_id: str, company: dict = Depends(get_current_company)):
    """Get pipeline funnel stats for a specific job."""
    db = get_db()
    pipeline = [
        {"$match": {"job_id": ObjectId(job_id)}},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
    ]
    funnel = {}
    async for doc in db.applications.aggregate(pipeline):
        funnel[doc["_id"]] = doc["count"]

    # Average scores
    score_pipeline = [
        {"$match": {"job_id": ObjectId(job_id), "resume_score": {"$exists": True}}},
        {"$group": {
            "_id": None,
            "avg_resume_score": {"$avg": "$resume_score"},
            "avg_voice_score": {"$avg": "$voice_score"},
            "avg_dsa_score": {"$avg": "$dsa_score"},
        }}
    ]
    avg_scores = {}
    async for doc in db.applications.aggregate(score_pipeline):
        avg_scores = {
            "avg_resume_score": round(doc.get("avg_resume_score", 0) or 0, 1),
            "avg_voice_score": round(doc.get("avg_voice_score", 0) or 0, 1),
            "avg_dsa_score": round(doc.get("avg_dsa_score", 0) or 0, 1),
        }

    return {"funnel": funnel, "avg_scores": avg_scores}
