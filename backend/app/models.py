from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Literal
from datetime import datetime
from bson import ObjectId


# ── Helpers ───────────────────────────────────────────────────────────────────

class PyObjectId(str):
    @classmethod
    def __get_validators__(cls):
        yield cls.validate

    @classmethod
    def validate(cls, v):
        if not ObjectId.is_valid(v):
            raise ValueError("Invalid ObjectId")
        return str(v)


# ── Company / HR ──────────────────────────────────────────────────────────────

class CompanyCreate(BaseModel):
    name: str
    email: EmailStr
    password: str
    industry: Optional[str] = None
    website: Optional[str] = None
    logo_url: Optional[str] = None


class CompanyLogin(BaseModel):
    email: EmailStr
    password: str


class CompanyOut(BaseModel):
    id: str
    name: str
    email: str
    industry: Optional[str]
    website: Optional[str]
    logo_url: Optional[str]
    created_at: datetime


# ── Job Description ────────────────────────────────────────────────────────────

class CutoffConfig(BaseModel):
    resume_score: float = Field(ge=0, le=100, default=65.0)
    voice_interview_score: float = Field(ge=0, le=100, default=60.0)
    dsa_round_score: float = Field(ge=0, le=100, default=55.0)


class PipelineStage(BaseModel):
    id: str
    type: str  # 'resume_vetting', 'dsa_coding', 'voice_ai_tech', 'tech_mcq', 'system_design', 'take_home_code', 'debugging_round', 'hr_interview'
    name: str
    desc: Optional[str] = None
    required: bool = True
    locked: bool = False  # True for resume_vetting and hr_interview


class JobCreate(BaseModel):
    title: str
    description: str
    required_skills: Optional[List[str]] = []
    min_experience_years: Optional[float] = 0
    education_requirement: Optional[str] = None
    interview_type: Literal["on_campus", "off_campus"] = "off_campus"
    meeting_platform: Literal["google_meet", "microsoft_teams"] = "google_meet"
    cutoffs: CutoffConfig = CutoffConfig()
    dsa_problem_count: Literal[1, 2] = 1
    max_applications: Optional[int] = None
    deadline: Optional[datetime] = None
    pipeline: Optional[List[PipelineStage]] = None


class JobOut(BaseModel):
    id: str
    company_id: str
    company_name: str
    title: str
    description: str
    required_skills: List[str]
    min_experience_years: float
    education_requirement: Optional[str]
    interview_type: str
    meeting_platform: str
    cutoffs: CutoffConfig
    dsa_problem_count: int
    apply_link: str
    is_active: bool
    application_count: int
    created_at: datetime
    deadline: Optional[datetime]
    pipeline: Optional[List[PipelineStage]] = None


# ── Candidate ─────────────────────────────────────────────────────────────────

class CandidateRegister(BaseModel):
    name: str
    email: EmailStr
    phone: str
    college_or_company: str
    graduation_year: Optional[int] = None


class CandidateOut(BaseModel):
    id: str
    name: str
    email: str
    phone: str
    college_or_company: str
    created_at: datetime


# ── Application ────────────────────────────────────────────────────────────────

class ApplicationStatus(str):
    APPLIED = "applied"
    RESUME_SCREENING = "resume_screening"
    RESUME_REJECTED = "resume_rejected"
    VOICE_ROUND_INVITED = "voice_round_invited"
    VOICE_ROUND_IN_PROGRESS = "voice_round_in_progress"
    VOICE_ROUND_PASSED = "voice_round_passed"
    VOICE_ROUND_FAILED = "voice_round_failed"
    DSA_ROUND_INVITED = "dsa_round_invited"
    DSA_ROUND_IN_PROGRESS = "dsa_round_in_progress"
    DSA_ROUND_PASSED = "dsa_round_passed"
    DSA_ROUND_FAILED = "dsa_round_failed"
    HR_ROUND_INVITED = "hr_round_invited"
    HR_ROUND_COMPLETED = "hr_round_completed"
    SELECTED = "selected"
    REJECTED = "rejected"


class ApplicationOut(BaseModel):
    id: str
    job_id: str
    job_title: str
    company_name: str
    candidate_id: str
    candidate_name: str
    candidate_email: str
    resume_url: str
    resume_score: Optional[float] = None
    resume_feedback: Optional[str] = None
    voice_score: Optional[float] = None
    dsa_score: Optional[float] = None
    hr_score: Optional[float] = None
    final_score: Optional[float] = None
    status: str
    applied_at: datetime
    updated_at: datetime


# ── Resume Analysis ───────────────────────────────────────────────────────────

class ResumeAnalysisResult(BaseModel):
    score: float  # 0-100
    skills_matched: List[str]
    skills_missing: List[str]
    profile_skills_matched: Optional[List[str]] = []
    keyword_match_percentage: Optional[float] = None
    jd_keywords_matched: Optional[List[str]] = []
    experience_match: float  # 0-100
    education_match: float  # 0-100
    overall_feedback: str
    strengths: List[str]
    weaknesses: List[str]


# ── Auth Token ────────────────────────────────────────────────────────────────

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    company: CompanyOut


class TokenData(BaseModel):
    company_id: Optional[str] = None


# ── Round 1: Voice Interview Models ──────────────────────────────────────────

class VoiceQuestion(BaseModel):
    id: str
    level: Literal["easy", "medium", "hard"]
    question: str
    focus_topic: str
    candidate_answer: Optional[str] = None
    score: Optional[float] = None
    feedback: Optional[str] = None


class VoiceAnswerSubmit(BaseModel):
    question_id: str
    answer_text: str
    time_taken_seconds: Optional[int] = None


class VoiceSessionState(BaseModel):
    application_id: str
    candidate_name: str
    job_title: str
    company_name: str
    current_level: Literal["easy", "medium", "hard"]
    current_question_index: int
    total_questions: int
    questions: List[dict]
    is_completed: bool
    final_score: Optional[float] = None
    passed_cutoff: Optional[bool] = None
    cutoff_required: float
    level_breakdown: Optional[dict] = None


# ── Round 2: Practical Coding / DSA Models ───────────────────────────────────

class DsaRunCodeRequest(BaseModel):
    problem_id: str
    language: Literal["python", "javascript"] = "python"
    code: str


class DsaSubmitRequest(BaseModel):
    problem_id: str
    language: Literal["python", "javascript"] = "python"
    code: str


class DsaFinalizeRequest(BaseModel):
    application_id: str


# ── Round 3: HR Round Scheduling Models ──────────────────────────────────────

class HRScheduleRequest(BaseModel):
    scheduled_time: str
    meeting_platform: Optional[Literal["google_meet", "microsoft_teams"]] = None
    custom_meeting_link: Optional[str] = None
    interviewer_notes: Optional[str] = None

