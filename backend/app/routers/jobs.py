from fastapi import APIRouter, HTTPException, status, Depends
from typing import List, Optional
from datetime import datetime
from bson import ObjectId
from app.models import JobCreate, JobOut, CutoffConfig, PipelineStage
from app.auth import get_current_company
from app.database import get_db
from app.config import get_settings
import uuid

settings = get_settings()
router = APIRouter(prefix="/api/jobs", tags=["Jobs"])


DEFAULT_SOFTWARE_PIPELINE = [
    {
        "id": "step_resume",
        "type": "resume_vetting",
        "name": "Resume Qualifications Vetting",
        "desc": "Automated requirement, skills & competency scoring",
        "required": True,
        "locked": True,
    },
    {
        "id": "step_voice",
        "type": "voice_ai_tech",
        "name": "Round 1: AI Technical Voice Screen",
        "desc": "Adaptive conversational technical proficiency & concept evaluation",
        "required": True,
        "locked": False,
    },
    {
        "id": "step_dsa",
        "type": "dsa_coding",
        "name": "Round 2: Algorithmic & Coding Assessment (DSA)",
        "desc": "Hands-on problem solving, data structures and code quality analysis",
        "required": True,
        "locked": False,
    },
    {
        "id": "step_hr",
        "type": "hr_interview",
        "name": "Round 3: Executive HR & Leadership Interview",
        "desc": "Cultural alignment, behavioral assessment and strategic fit discussion",
        "required": True,
        "locked": True,
    },
]


def _serialize_job(doc: dict) -> JobOut:
    raw_pipeline = doc.get("pipeline") or DEFAULT_SOFTWARE_PIPELINE
    pipeline = [PipelineStage(**st) for st in raw_pipeline]
    return JobOut(
        id=str(doc["_id"]),
        company_id=str(doc["company_id"]),
        company_name=doc.get("company_name", ""),
        title=doc["title"],
        description=doc["description"],
        required_skills=doc.get("required_skills", []),
        min_experience_years=doc.get("min_experience_years", 0),
        education_requirement=doc.get("education_requirement"),
        interview_type=doc.get("interview_type", "off_campus"),
        meeting_platform=doc.get("meeting_platform", "google_meet"),
        cutoffs=CutoffConfig(**doc.get("cutoffs", {})),
        dsa_problem_count=doc.get("dsa_problem_count", 1),
        apply_link=f"{settings.FRONTEND_URL}/apply/{doc['job_token']}",
        is_active=doc.get("is_active", True),
        application_count=doc.get("application_count", 0),
        created_at=doc["created_at"],
        deadline=doc.get("deadline"),
        pipeline=pipeline,
    )


@router.post("/", response_model=JobOut, status_code=status.HTTP_201_CREATED)
async def create_job(payload: JobCreate, company: dict = Depends(get_current_company)):
    db = get_db()
    job_token = str(uuid.uuid4())

    pipeline_data = (
        [stage.model_dump() for stage in payload.pipeline]
        if payload.pipeline
        else DEFAULT_SOFTWARE_PIPELINE
    )

    doc = {
        "company_id": company["_id"],
        "company_name": company["name"],
        "title": payload.title,
        "description": payload.description,
        "required_skills": payload.required_skills,
        "min_experience_years": payload.min_experience_years,
        "education_requirement": payload.education_requirement,
        "interview_type": payload.interview_type,
        "meeting_platform": payload.meeting_platform,
        "cutoffs": payload.cutoffs.model_dump(),
        "dsa_problem_count": payload.dsa_problem_count,
        "max_applications": payload.max_applications,
        "deadline": payload.deadline,
        "pipeline": pipeline_data,
        "job_token": job_token,
        "is_active": True,
        "application_count": 0,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    result = await db.jobs.insert_one(doc)
    doc["_id"] = result.inserted_id
    return _serialize_job(doc)


@router.get("/", response_model=List[JobOut])
async def list_my_jobs(company: dict = Depends(get_current_company)):
    db = get_db()
    cursor = db.jobs.find({"company_id": company["_id"]}).sort("created_at", -1)
    jobs = []
    async for doc in cursor:
        jobs.append(_serialize_job(doc))
    return jobs


@router.get("/{job_id}", response_model=JobOut)
async def get_job(job_id: str, company: dict = Depends(get_current_company)):
    db = get_db()
    doc = await db.jobs.find_one({"_id": ObjectId(job_id), "company_id": company["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    return _serialize_job(doc)


@router.put("/{job_id}/toggle")
async def toggle_job_status(job_id: str, company: dict = Depends(get_current_company)):
    db = get_db()
    doc = await db.jobs.find_one({"_id": ObjectId(job_id), "company_id": company["_id"]})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found")
    new_status = not doc.get("is_active", True)
    await db.jobs.update_one(
        {"_id": ObjectId(job_id)},
        {"$set": {"is_active": new_status, "updated_at": datetime.utcnow()}}
    )
    return {"is_active": new_status}


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_job(job_id: str, company: dict = Depends(get_current_company)):
    db = get_db()
    result = await db.jobs.delete_one({"_id": ObjectId(job_id), "company_id": company["_id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Job not found")


# Public endpoint — explore all active jobs across companies for public job board
@router.get("/public/explore/all")
async def explore_public_jobs():
    db = get_db()
    cursor = db.jobs.find({"is_active": True}).sort("created_at", -1).limit(50)
    jobs = []
    async for doc in cursor:
        jobs.append({
            "id": str(doc["_id"]),
            "job_token": doc.get("job_token"),
            "company_name": doc.get("company_name", "Featured Employer"),
            "title": doc["title"],
            "description": doc["description"],
            "required_skills": doc.get("required_skills", []),
            "min_experience_years": doc.get("min_experience_years", 0),
            "education_requirement": doc.get("education_requirement"),
            "interview_type": doc.get("interview_type", "Full-time"),
            "created_at": doc.get("created_at").isoformat() if doc.get("created_at") else None,
            "apply_link": f"{settings.FRONTEND_URL}/apply/{doc.get('job_token')}",
        })
    return jobs


# Public endpoint — anyone with the job token can view the job
@router.get("/public/{job_token}")
async def get_public_job(job_token: str):
    db = get_db()
    doc = await db.jobs.find_one({"job_token": job_token, "is_active": True})
    if not doc:
        raise HTTPException(status_code=404, detail="Job not found or no longer active")
    raw_pipeline = doc.get("pipeline") or DEFAULT_SOFTWARE_PIPELINE
    return {
        "id": str(doc["_id"]),
        "company_name": doc.get("company_name", ""),
        "title": doc["title"],
        "description": doc["description"],
        "required_skills": doc.get("required_skills", []),
        "min_experience_years": doc.get("min_experience_years", 0),
        "education_requirement": doc.get("education_requirement"),
        "interview_type": doc.get("interview_type"),
        "deadline": doc.get("deadline"),
        "pipeline": raw_pipeline,
    }
