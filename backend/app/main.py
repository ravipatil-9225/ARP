from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.database import connect_db, close_db
from app.config import get_settings
from app.routers import auth, jobs, applications, analytics, voice_interview, dsa_interview, hr_round, candidate_auth, recommendations

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await connect_db()
    os.makedirs(settings.LOCAL_UPLOAD_DIR + "/resumes", exist_ok=True)
    try:
        from app.database import get_db
        db = get_db()
        # Enforce uniqueness: one candidate can only apply once per job
        await db.applications.create_index([("job_id", 1), ("candidate_email", 1)], unique=True)
    except Exception as e:
        print(f"[WARN] Could not ensure unique index on applications: {e}")
    yield
    # Shutdown
    await close_db()


app = FastAPI(
    title="PrismHire AI API",
    description="PrismHire: Autonomous AI-Powered Hiring Automation Platform",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ──────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL, "http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(auth.router)
app.include_router(jobs.router)
app.include_router(applications.router)
app.include_router(analytics.router)
app.include_router(voice_interview.router)
app.include_router(dsa_interview.router)
app.include_router(hr_round.router)
app.include_router(candidate_auth.router)
app.include_router(recommendations.router)

# ── Static files (uploaded resumes) ──────────────────────────────────────────
if os.path.exists("./uploads"):
    app.mount("/uploads", StaticFiles(directory="./uploads"), name="uploads")


@app.get("/")
async def root():
    return {
        "app": settings.APP_NAME,
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "healthy", "env": settings.APP_ENV}
