"""
Job Recommendation Router — Candidate-facing endpoint
that uses the ML recommendation engine to rank jobs.
"""
from fastapi import APIRouter, Depends
from app.database import get_db
from app.routers.candidate_auth import get_current_candidate
from app.recommendation_engine import recommend_jobs

router = APIRouter(prefix="/api/candidate/jobs", tags=["Job Recommendations"])


@router.get("/recommendations")
async def get_recommendations(candidate: dict = Depends(get_current_candidate)):
    """Return jobs ranked by match score against candidate profile."""
    db = get_db()

    # Fetch all active jobs
    cursor = db.jobs.find({"is_active": True}).sort("created_at", -1).limit(100)
    jobs = []
    async for doc in cursor:
        jobs.append(doc)

    if not jobs:
        return []

    # Run recommendation engine
    recommendations = recommend_jobs(candidate, jobs)
    return recommendations
