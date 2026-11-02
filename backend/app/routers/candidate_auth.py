"""
Candidate Authentication & Profile Management Router
- Register / Login with role='candidate' JWT
- Full profile CRUD (contact, skills, education, experience, links)
- Resume upload with AI auto-fill extraction
- Candidate-scoped application listing
"""
import re
import json
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, status, Depends, UploadFile, File, Form
from bson import ObjectId

from app.database import get_db
from app.config import get_settings
from app.auth import hash_password, verify_password, create_access_token

settings = get_settings()
router = APIRouter(prefix="/api/candidate", tags=["Candidate Auth & Profile"])


# ── JWT Dependency for Candidates ─────────────────────────────────────────────

from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt

candidate_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/candidate/login", auto_error=False)


async def get_current_candidate(token: str = Depends(candidate_oauth2)):
    """Decode JWT and verify role=candidate."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate candidate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    if not token:
        raise credentials_exception
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id is None or role != "candidate":
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    db = get_db()
    candidate = await db.candidates.find_one({"_id": ObjectId(user_id)})
    if candidate is None:
        raise credentials_exception
    return candidate


async def get_optional_candidate(token: Optional[str] = Depends(candidate_oauth2)) -> Optional[dict]:
    """Decode JWT and return candidate if valid, else None."""
    if not token:
        return None
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        role: str = payload.get("role")
        if user_id and role == "candidate":
            db = get_db()
            return await db.candidates.find_one({"_id": ObjectId(user_id)})
    except Exception:
        pass
    return None


def _serialize_candidate(doc: dict) -> dict:
    return {
        "id": str(doc["_id"]),
        "name": doc.get("name", ""),
        "email": doc.get("email", ""),
        "phone": doc.get("phone", ""),
        "prn_no": doc.get("prn_no", ""),
        "headline": doc.get("headline", ""),
        "location": doc.get("location", ""),
        "resume_url": doc.get("resume_url", ""),
        "skills": doc.get("skills", []),
        "experience_years": doc.get("experience_years", 0),
        "experience_history": doc.get("experience_history", []),
        "education": doc.get("education", []),
        "links": doc.get("links", {}),
        "preferred_locations": doc.get("preferred_locations", []),
        "profile_completed_percentage": doc.get("profile_completed_percentage", 0),
        "role": "candidate",
        "created_at": doc.get("created_at").isoformat() if hasattr(doc.get("created_at"), "isoformat") else str(doc.get("created_at", "")),
    }


def _compute_profile_completion(doc: dict) -> int:
    """Calculate profile completeness percentage based on filled fields."""
    checks = [
        bool(doc.get("name")),
        bool(doc.get("email")),
        bool(doc.get("phone")),
        bool(doc.get("headline")),
        bool(doc.get("location")),
        bool(doc.get("resume_url")),
        len(doc.get("skills", [])) >= 1,
        len(doc.get("education", [])) >= 1,
        len(doc.get("experience_history", [])) >= 1,
        bool(doc.get("links", {}).get("linkedin") or doc.get("links", {}).get("github")),
    ]
    return int((sum(checks) / len(checks)) * 100)


# ── Register ──────────────────────────────────────────────────────────────────

@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_candidate(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone: str = Form(""),
):
    db = get_db()
    email_lower = email.strip().lower()

    # Check email uniqueness
    existing = await db.candidates.find_one({"email": email_lower, "password_hash": {"$exists": True}})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    # Check if a candidate doc already exists (from a previous non-auth apply)
    existing_profile = await db.candidates.find_one({"email": email_lower})

    if existing_profile:
        # Upgrade existing candidate record with auth
        await db.candidates.update_one(
            {"_id": existing_profile["_id"]},
            {"$set": {
                "name": name,
                "password_hash": hash_password(password),
                "phone": phone or existing_profile.get("phone", ""),
                "updated_at": datetime.utcnow(),
            }}
        )
        candidate_id = existing_profile["_id"]
        doc = await db.candidates.find_one({"_id": candidate_id})
    else:
        doc = {
            "name": name,
            "email": email_lower,
            "password_hash": hash_password(password),
            "phone": phone,
            "headline": "",
            "location": "",
            "resume_url": "",
            "skills": [],
            "experience_years": 0,
            "experience_history": [],
            "education": [],
            "links": {},
            "preferred_locations": [],
            "profile_completed_percentage": 0,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow(),
        }
        result = await db.candidates.insert_one(doc)
        doc["_id"] = result.inserted_id
        candidate_id = result.inserted_id

    # Compute profile completion
    completion = _compute_profile_completion(doc)
    await db.candidates.update_one({"_id": candidate_id}, {"$set": {"profile_completed_percentage": completion}})
    doc["profile_completed_percentage"] = completion

    token = create_access_token({"sub": str(candidate_id), "role": "candidate"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _serialize_candidate(doc),
    }


# ── Login ─────────────────────────────────────────────────────────────────────

@router.post("/login")
async def login_candidate(
    email: str = Form(...),
    password: str = Form(...),
):
    db = get_db()
    candidate = await db.candidates.find_one({"email": email.strip().lower()})
    if not candidate or not candidate.get("password_hash"):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not verify_password(password, candidate["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token({"sub": str(candidate["_id"]), "role": "candidate"})
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": _serialize_candidate(candidate),
    }


# ── Get Profile ───────────────────────────────────────────────────────────────

@router.get("/profile")
async def get_profile(candidate: dict = Depends(get_current_candidate)):
    return _serialize_candidate(candidate)


# ── Update Profile ────────────────────────────────────────────────────────────

@router.put("/profile")
async def update_profile(
    candidate: dict = Depends(get_current_candidate),
    name: str = Form(None),
    phone: str = Form(None),
    prn_no: str = Form(None),
    headline: str = Form(None),
    location: str = Form(None),
    skills: str = Form(None),  # JSON array string
    experience_years: float = Form(None),
    experience_history: str = Form(None),  # JSON array string
    education: str = Form(None),  # JSON array string
    links: str = Form(None),  # JSON object string
    preferred_locations: str = Form(None),  # JSON array string
):
    db = get_db()
    update = {"updated_at": datetime.utcnow()}

    if name is not None:
        update["name"] = name
    if phone is not None:
        update["phone"] = phone
    if prn_no is not None:
        update["prn_no"] = prn_no.strip()
    if headline is not None:
        update["headline"] = headline
    if location is not None:
        update["location"] = location
    if experience_years is not None:
        update["experience_years"] = experience_years

    # Parse JSON fields
    if skills is not None:
        try:
            update["skills"] = json.loads(skills)
        except json.JSONDecodeError:
            update["skills"] = [s.strip() for s in skills.split(",") if s.strip()]
    if experience_history is not None:
        try:
            update["experience_history"] = json.loads(experience_history)
        except json.JSONDecodeError:
            pass
    if education is not None:
        try:
            update["education"] = json.loads(education)
        except json.JSONDecodeError:
            pass
    if links is not None:
        try:
            update["links"] = json.loads(links)
        except json.JSONDecodeError:
            pass
    if preferred_locations is not None:
        try:
            update["preferred_locations"] = json.loads(preferred_locations)
        except json.JSONDecodeError:
            pass

    await db.candidates.update_one({"_id": candidate["_id"]}, {"$set": update})

    # Recompute profile completion
    updated_doc = await db.candidates.find_one({"_id": candidate["_id"]})
    completion = _compute_profile_completion(updated_doc)
    await db.candidates.update_one({"_id": candidate["_id"]}, {"$set": {"profile_completed_percentage": completion}})
    updated_doc["profile_completed_percentage"] = completion

    return _serialize_candidate(updated_doc)


# ── Upload Resume with AI Auto-Fill ──────────────────────────────────────────

@router.post("/profile/resume")
async def upload_resume(
    resume: UploadFile = File(...),
    candidate: dict = Depends(get_current_candidate),
):
    """Upload resume PDF and optionally auto-fill profile fields from it."""
    from app.file_storage import save_resume
    db = get_db()

    resume_url = await save_resume(resume, str(candidate["_id"]))
    update = {"resume_url": resume_url, "updated_at": datetime.utcnow()}

    # Try to extract text and auto-fill fields
    auto_filled = {}
    try:
        from app.resume_screener import extract_text_from_file
        from app.file_storage import get_full_resume_path
        filepath = get_full_resume_path(resume_url)
        resume_text = extract_text_from_file(filepath)

        if resume_text and len(resume_text) > 50:
            auto_filled = _extract_profile_from_resume(resume_text)
            # Only fill fields that are currently empty
            if not candidate.get("skills") and auto_filled.get("skills"):
                update["skills"] = auto_filled["skills"]
            if not candidate.get("headline") and auto_filled.get("headline"):
                update["headline"] = auto_filled["headline"]
            if not candidate.get("experience_years") and auto_filled.get("experience_years"):
                update["experience_years"] = auto_filled["experience_years"]
    except Exception as e:
        print(f"[WARN] Resume auto-fill extraction failed: {e}")

    await db.candidates.update_one({"_id": candidate["_id"]}, {"$set": update})

    # Recompute profile completion
    updated_doc = await db.candidates.find_one({"_id": candidate["_id"]})
    completion = _compute_profile_completion(updated_doc)
    await db.candidates.update_one({"_id": candidate["_id"]}, {"$set": {"profile_completed_percentage": completion}})
    updated_doc["profile_completed_percentage"] = completion

    return {
        "message": "Resume uploaded successfully",
        "resume_url": resume_url,
        "auto_filled": auto_filled,
        "profile": _serialize_candidate(updated_doc),
    }


def _extract_profile_from_resume(resume_text: str) -> dict:
    """Heuristic extraction of profile fields from resume text."""
    text_lower = resume_text.lower()
    result = {}

    # Extract skills from common tech keywords
    known_skills = [
        "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "Ruby", "PHP", "Swift", "Kotlin",
        "React", "Angular", "Vue", "Node.js", "Next.js", "Django", "Flask", "FastAPI", "Spring Boot", "Express",
        "MongoDB", "PostgreSQL", "MySQL", "Redis", "Docker", "Kubernetes", "AWS", "Azure", "GCP",
        "Git", "Linux", "REST API", "GraphQL", "TensorFlow", "PyTorch", "Machine Learning", "Deep Learning",
        "HTML", "CSS", "SQL", "NoSQL", "Microservices", "CI/CD", "Agile", "Scrum",
        "Data Structures", "Algorithms", "System Design", "OOP",
    ]
    found_skills = []
    for skill in known_skills:
        pattern = r'\b' + re.escape(skill.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(skill)
    if found_skills:
        result["skills"] = found_skills[:20]

    # Extract experience years
    exp_matches = re.findall(r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\s*(?:of\s+)?(?:experience|exp)?', text_lower)
    if exp_matches:
        try:
            result["experience_years"] = max([float(m) for m in exp_matches if float(m) < 40])
        except Exception:
            pass

    # Build a headline from first meaningful line
    lines = resume_text.strip().split('\n')
    for line in lines[1:6]:
        cleaned = line.strip()
        if len(cleaned) > 15 and len(cleaned) < 120 and not cleaned.startswith('http'):
            # Likely a headline/title
            if any(kw in cleaned.lower() for kw in ['developer', 'engineer', 'designer', 'analyst', 'scientist', 'manager', 'intern', 'student']):
                result["headline"] = cleaned
                break

    return result


# ── 1-Click Apply (from candidate profile) ───────────────────────────────────

@router.post("/apply/{job_id}")
async def candidate_apply(
    job_id: str,
    candidate: dict = Depends(get_current_candidate),
):
    """Apply using stored profile and resume — no form re-entry needed."""
    from app.file_storage import get_full_resume_path

    db = get_db()
    job = await db.jobs.find_one({"_id": ObjectId(job_id), "is_active": True})
    if not job:
        raise HTTPException(status_code=404, detail="Job not found or no longer accepting applications")

    # Check deadline
    if job.get("deadline") and datetime.utcnow() > job["deadline"]:
        raise HTTPException(status_code=400, detail="Application deadline has passed")

    # Check resume exists
    if not candidate.get("resume_url"):
        raise HTTPException(status_code=400, detail="Please upload your resume in your profile before applying")

    # Check duplicate application (by job and email / candidate_id)
    candidate_email = candidate.get("email", "").strip().lower()
    existing = await db.applications.find_one({
        "job_id": job["_id"],
        "$or": [
            {"candidate_email": candidate_email},
            {"candidate_id": candidate["_id"]}
        ]
    })
    if existing:
        raise HTTPException(
            status_code=400,
            detail="You have already submitted an application for this position. Candidates can only apply once per job."
        )

    from app.routers.jobs import DEFAULT_SOFTWARE_PIPELINE
    pipeline = job.get("pipeline") or DEFAULT_SOFTWARE_PIPELINE

    # Create application
    app_doc = {
        "job_id": job["_id"],
        "job_title": job["title"],
        "company_id": job["company_id"],
        "company_name": job.get("company_name", ""),
        "candidate_id": candidate["_id"],
        "candidate_name": candidate["name"],
        "candidate_email": candidate["email"],
        "resume_url": candidate["resume_url"],
        "status": "applied",
        "applied_via_profile": True,
        "pipeline": pipeline,
        "applied_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }
    app_result = await db.applications.insert_one(app_doc)
    application_id = str(app_result.inserted_id)

    # Increment application count on job
    await db.jobs.update_one({"_id": job["_id"]}, {"$inc": {"application_count": 1}})

    # Kick off background resume screening
    import asyncio
    from app.routers.applications import _run_resume_screening
    resume_filepath = get_full_resume_path(candidate["resume_url"])
    asyncio.create_task(_run_resume_screening(
        application_id=application_id,
        job_id=str(job["_id"]),
        resume_filepath=resume_filepath,
    ))

    return {
        "message": "Application submitted successfully! Our AI is reviewing your resume.",
        "application_id": application_id,
        "status": "applied",
    }


# ── My Applications (Candidate Dashboard) ────────────────────────────────────

@router.get("/applications")
async def get_my_applications(candidate: dict = Depends(get_current_candidate)):
    """Fetch all applications for the logged-in candidate with live status and custom pipeline."""
    db = get_db()
    cursor = db.applications.find({"candidate_id": candidate["_id"]}).sort("applied_at", -1)
    results = []
    from app.routers.jobs import DEFAULT_SOFTWARE_PIPELINE
    job_cache = {}

    async for doc in cursor:
        pipeline = doc.get("pipeline")
        if not pipeline and doc.get("job_id"):
            try:
                jid = doc["job_id"] if isinstance(doc["job_id"], ObjectId) else ObjectId(doc["job_id"])
                if jid not in job_cache:
                    job_cache[jid] = await db.jobs.find_one({"_id": jid})
                j = job_cache.get(jid)
                pipeline = (j.get("pipeline") if j else None)
            except Exception:
                pipeline = None
        if not pipeline:
            pipeline = DEFAULT_SOFTWARE_PIPELINE

        results.append({
            "id": str(doc["_id"]),
            "job_id": str(doc["job_id"]),
            "job_title": doc.get("job_title", ""),
            "company_name": doc.get("company_name", ""),
            "status": doc.get("status", "applied"),
            "resume_score": doc.get("resume_score"),
            "resume_feedback": doc.get("resume_feedback"),
            "voice_score": doc.get("voice_score"),
            "dsa_score": doc.get("dsa_score"),
            "hr_score": doc.get("hr_score"),
            "final_score": doc.get("final_score"),
            "meeting_link": doc.get("meeting_link"),
            "meeting_platform": doc.get("meeting_platform"),
            "scheduled_hr_time": doc.get("scheduled_hr_time"),
            "scheduled_hr_end_time": doc.get("scheduled_hr_end_time"),
            "slot_duration_mins": doc.get("slot_duration_mins"),
            "skills_matched": doc.get("skills_matched", []),
            "skills_missing": doc.get("skills_missing", []),
            "profile_skills_matched": doc.get("profile_skills_matched", []),
            "keyword_match_percentage": doc.get("keyword_match_percentage"),
            "strengths": doc.get("strengths", []),
            "weaknesses": doc.get("weaknesses", []),
            "pipeline": pipeline,
            "applied_at": doc.get("applied_at").isoformat() if hasattr(doc.get("applied_at"), "isoformat") else str(doc.get("applied_at", "")),
            "updated_at": doc.get("updated_at").isoformat() if hasattr(doc.get("updated_at"), "isoformat") else str(doc.get("updated_at", "")),
        })
    return results
