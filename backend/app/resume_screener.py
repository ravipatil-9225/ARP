"""
AI Resume Screener & Skill Matching Engine:
1. Parses resume text from PDF / DOCX with multi-page extraction
2. Extracts and structures tech keywords, tools, concepts from the Job Description (JD)
3. Deeply compares the candidate's uploaded resume AND candidate profile skills against the JD
4. Identifies skills matched in resume, profile skills matched against JD, and missing skills
5. Employs intelligent semantic matching with extensive tech alias/synonym mapping
6. Provides objective, calibrated scoring and constructive recruiter/candidate feedback
"""
import json
import re
from typing import Optional, List, Dict, Tuple, Set
import fitz  # PyMuPDF
from pathlib import Path
from app.config import get_settings
from app.models import ResumeAnalysisResult

settings = get_settings()

# ── Extensive Software & Tech Skills Taxonomy ──────────────────────────────────
# Maps canonical skill names to recognized variations, acronyms, and related frameworks.
TECH_SKILLS_TAXONOMY: Dict[str, List[str]] = {
    # Frontend
    "React": ["react", "react.js", "reactjs", "mern", "react native", "react-native"],
    "Next.js": ["next.js", "nextjs", "next"],
    "Vue.js": ["vue", "vue.js", "vuejs", "mevn", "nuxt", "nuxt.js"],
    "Angular": ["angular", "angular.js", "angularjs", "mean"],
    "Svelte": ["svelte", "sveltekit"],
    "JavaScript": ["javascript", "js", "ecmascript", "es6", "es2015"],
    "TypeScript": ["typescript", "ts"],
    "HTML/CSS": ["html", "html5", "css", "css3"],
    "Tailwind CSS": ["tailwind", "tailwindcss", "tailwind css"],
    "Bootstrap": ["bootstrap", "bootstrap5"],
    "Sass/SCSS": ["sass", "scss"],
    "Redux": ["redux", "redux toolkit", "rtk", "zustand", "mobx", "recoil"],
    "Webpack/Vite": ["webpack", "vite", "babel", "turbopack"],

    # Backend
    "Node.js": ["node.js", "nodejs", "node", "mern", "mean"],
    "Express": ["express", "express.js", "expressjs"],
    "NestJS": ["nestjs", "nest.js"],
    "Python": ["python", "python3", "py"],
    "FastAPI": ["fastapi", "fast-api"],
    "Django": ["django", "django rest framework", "drf"],
    "Flask": ["flask"],
    "Java": ["java", "core java", "java 8", "java 11", "java 17", "java 21"],
    "Spring Boot": ["spring boot", "springboot", "spring framework", "spring"],
    "Go / Golang": ["golang", "go"],
    "Rust": ["rust"],
    "C# / .NET": ["c#", "csharp", ".net", "dotnet", "asp.net", "entity framework"],
    "C++": ["c++", "cpp"],
    "PHP": ["php", "laravel", "symfony"],
    "Ruby": ["ruby", "ruby on rails", "rails"],
    "REST API": ["rest", "rest api", "restful", "restful api", "apis", "api development", "postman"],
    "GraphQL": ["graphql", "apollo", "relay"],
    "gRPC": ["grpc", "protobuf"],
    "Microservices": ["microservices", "microservice architecture", "distributed systems"],
    "WebSockets": ["websockets", "websocket", "socket.io"],

    # Databases & Caching
    "MongoDB": ["mongodb", "mongo", "nosql", "documentdb", "mongoose", "mern", "mean"],
    "PostgreSQL": ["postgresql", "postgres", "psql"],
    "MySQL": ["mysql", "mariadb"],
    "SQL": ["sql", "rdbms", "relational database", "sqlite"],
    "Redis": ["redis", "in-memory cache", "caching"],
    "Elasticsearch": ["elasticsearch", "elastic search", "elk"],
    "Cassandra": ["cassandra"],
    "DynamoDB": ["dynamodb"],
    "Firebase": ["firebase", "firestore"],

    # Cloud & DevOps
    "AWS": ["aws", "amazon web services", "ec2", "s3", "lambda", "cloudfront", "rds", "iam"],
    "Azure": ["azure", "microsoft azure"],
    "GCP": ["gcp", "google cloud", "google cloud platform"],
    "Docker": ["docker", "container", "containers", "containerization", "docker-compose"],
    "Kubernetes": ["kubernetes", "k8s", "helm"],
    "CI/CD": ["ci/cd", "ci cd", "continuous integration", "github actions", "gitlab ci", "jenkins"],
    "Terraform": ["terraform", "iac", "infrastructure as code"],
    "Linux": ["linux", "ubuntu", "debian", "centos", "bash", "shell scripting", "unix"],
    "Nginx": ["nginx", "apache", "reverse proxy"],

    # Testing & Code Quality
    "Unit Testing": ["unit testing", "jest", "mocha", "pytest", "junit", "cypress", "playwright", "selenium", "tdd"],

    # AI / Machine Learning / Data Science
    "Machine Learning": ["machine learning", "ml", "data science", "predictive modeling"],
    "Deep Learning": ["deep learning", "neural networks", "cnn", "rnn", "transformer", "transformers"],
    "Artificial Intelligence": ["artificial intelligence", "ai", "generative ai", "genai", "rag", "llm", "large language models", "langchain"],
    "PyTorch": ["pytorch", "torch"],
    "TensorFlow": ["tensorflow", "keras"],
    "Pandas/NumPy": ["pandas", "numpy", "scipy", "scikit-learn", "sklearn"],
    "NLP": ["nlp", "natural language processing", "spacy", "nltk", "bert"],
    "Computer Vision": ["computer vision", "opencv"],

    # UI/UX & Design
    "UI/UX": ["ui/ux", "ui design", "ux design", "user interface", "user experience", "figma", "wireframe", "wireframing", "prototyping", "design system", "design systems", "adobe xd"],
    "Figma": ["figma", "figma components", "auto layout"],

    # Core Engineering & Principles
    "Data Structures": ["data structures", "algorithms", "dsa", "leetcode", "problem solving", "algorithmic"],
    "System Design": ["system design", "hld", "lld", "high level design", "low level design", "software architecture", "scalability"],
    "Object-Oriented Programming": ["oop", "object-oriented", "design patterns", "solid principles"],
    "Git": ["git", "github", "gitlab", "version control", "bitbucket"],
    "Agile": ["agile", "scrum", "sprints", "jira", "kanban"],
}


def extract_text_from_file(filepath: str) -> str:
    """Extract full raw text from PDF or DOCX file."""
    path = Path(filepath)
    ext = path.suffix.lower()

    if ext == ".pdf":
        doc = fitz.open(filepath)
        pages_text = []
        for page in doc:
            p_text = page.get_text("text")
            if p_text:
                pages_text.append(p_text)
        doc.close()
        full_text = "\n".join(pages_text).strip()
        # Clean excessive duplicate spaces while retaining structure
        full_text = re.sub(r'[ \t]+', ' ', full_text)
        return full_text

    elif ext in (".doc", ".docx"):
        from docx import Document
        doc = Document(filepath)
        return "\n".join([para.text for para in doc.paragraphs if para.text]).strip()

    raise ValueError(f"Unsupported file type: {ext}")


def _normalize_token(text: str) -> str:
    """Normalize a skill token for lenient semantic comparison."""
    if not text:
        return ""
    cleaned = text.lower().strip()
    # Replace separators like hyphens and underscores with spaces, except specific terms
    cleaned = re.sub(r'[\s_]+', ' ', cleaned)
    return cleaned


def _build_variant_patterns(variants: List[str]) -> List[re.Pattern]:
    """Compile regex patterns with boundary awareness for skill variants."""
    patterns = []
    for var in variants:
        v_clean = var.strip()
        if not v_clean:
            continue
        # If the term contains special characters like '.', '+', '#', handle boundaries safely
        escaped = re.escape(v_clean)
        # Match where word is preceded and followed by non-alphanumeric or start/end
        pat = re.compile(r'(?:^|[^a-zA-Z0-9])' + escaped + r'(?:$|[^a-zA-Z0-9])', re.IGNORECASE)
        patterns.append(pat)
    return patterns


def extract_keywords_from_jd(jd_text: str, required_skills: List[str]) -> Tuple[List[str], List[str]]:
    """
    Extracts all software technology keywords mentioned in the JD description text
    and unifies them with explicit required_skills.
    """
    clean_jd = (jd_text or "").lower()
    
    # 1. Clean explicit required skills
    normalized_req = []
    for s in (required_skills or []):
        s_strip = s.strip()
        if s_strip and s_strip not in normalized_req:
            normalized_req.append(s_strip)

    # 2. Scan JD body for any technology keywords from taxonomy
    extracted_from_jd = []
    for canonical, variants in TECH_SKILLS_TAXONOMY.items():
        # Check if already in required_skills
        if any(r.lower() == canonical.lower() for r in normalized_req):
            continue
        patterns = _build_variant_patterns(variants)
        for pat in patterns:
            if pat.search(clean_jd):
                if canonical not in extracted_from_jd and canonical not in normalized_req:
                    extracted_from_jd.append(canonical)
                break

    return normalized_req, extracted_from_jd


def _check_skill_match(
    skill_name: str,
    resume_text: str,
    candidate_skills: List[str]
) -> Tuple[bool, bool, bool]:
    """
    Checks if a skill matches in the resume text, in the candidate's profile skills, or both.
    Returns (matched, in_resume, in_profile).
    """
    s_norm = skill_name.strip().lower()
    variants = [s_norm]

    # Look up taxonomy synonyms
    for canonical, var_list in TECH_SKILLS_TAXONOMY.items():
        if canonical.lower() == s_norm or s_norm in [v.lower() for v in var_list]:
            variants.extend(var_list)
            variants.append(canonical.lower())

    variants = list(set([v.strip().lower() for v in variants if v.strip()]))

    # 1. Check in Candidate Profile Skills
    in_profile = False
    for p_skill in (candidate_skills or []):
        p_clean = p_skill.strip().lower()
        if not p_clean:
            continue
        # Direct equality or variant equality
        if p_clean in variants or s_norm in p_clean or p_clean in s_norm:
            in_profile = True
            break
        # Reverse check against taxonomy for p_skill
        for canonical, var_list in TECH_SKILLS_TAXONOMY.items():
            if p_clean == canonical.lower() or p_clean in [v.lower() for v in var_list]:
                if any(v in variants for v in var_list) or canonical.lower() in variants:
                    in_profile = True
                    break
        if in_profile:
            break

    # 2. Check in Resume Text
    in_resume = False
    resume_lower = resume_text.lower()
    patterns = _build_variant_patterns(variants)
    for pat in patterns:
        if pat.search(resume_lower):
            in_resume = True
            break

    matched = in_profile or in_resume
    return matched, in_resume, in_profile


def _build_screening_prompt(
    resume_text: str,
    jd_text: str,
    required_skills: list,
    jd_extra_keywords: list,
    candidate_skills: list,
    min_experience: float,
    education_req: str
) -> str:
    """Builds a rich prompt for LLM evaluation that incorporates profile skills and JD comparison."""
    return f"""
You are an expert AI technical recruiter and resume evaluator with 15 years of industry experience.

Analyze the candidate's uploaded RESUME and CANDIDATE PROFILE SKILLS against the JOB DESCRIPTION.

## JOB DESCRIPTION:
{jd_text}

## REQUIRED SKILLS FROM REQUISITION:
{', '.join(required_skills) if required_skills else 'Extracted from JD'}

## ADDITIONAL JD KEYWORDS DETECTED:
{', '.join(jd_extra_keywords) if jd_extra_keywords else 'None'}

## CANDIDATE DECLARED PROFILE SKILLS:
{', '.join(candidate_skills) if candidate_skills else 'None declared in profile'}

## MINIMUM EXPERIENCE REQUIRED:
{min_experience} years

## EDUCATION REQUIREMENT:
{education_req or 'Not specified'}

## CANDIDATE RESUME TEXT:
{resume_text[:10000]}

## INSTRUCTIONS:
1. Cross-reference both the candidate's RESUME and their CANDIDATE PROFILE SKILLS with the JOB DESCRIPTION and REQUIRED SKILLS.
2. If a required skill or JD keyword is present in the resume OR in their declared profile skills, count it as MATCHED.
3. Evaluate the candidate on:
   - Skills Alignment (45%): Core required skills matched + relevant profile skills matching the JD.
   - Experience Relevance (25%): Years and practical depth of relevant work.
   - Education Relevance (15%): Academic alignment.
   - Applied Engineering & Projects (15%): Real-world projects, APIs, deployments, frameworks demonstrated.
4. Return ONLY a valid JSON object with this exact structure:
{{
  "score": <float 0-100, fair and calibrated according to match quality>,
  "skills_matched": [<list of required skills the candidate possesses in resume or profile>],
  "skills_missing": [<list of required skills the candidate lacks>],
  "profile_skills_matched": [<candidate profile skills that directly align with this role>],
  "keyword_match_percentage": <float 0-100>,
  "experience_match": <float 0-100>,
  "education_match": <float 0-100>,
  "overall_feedback": "<2-3 sentence assessment highlighting key matches and qualifications>",
  "strengths": ["<strength 1>", "<strength 2>", "<strength 3>"],
  "weaknesses": ["<constructive area 1>", "<constructive area 2>"]
}}

Be objective, thorough, and fair. Do NOT output anything outside the JSON object.
"""


def _heuristic_screen_resume(
    resume_text: str,
    jd_text: str,
    required_skills: list,
    min_experience: float = 0,
    education_req: Optional[str] = None,
    candidate_skills: Optional[list] = None,
    candidate_exp: float = 0,
    candidate_education: Optional[list] = None,
    candidate_headline: Optional[str] = None,
    job_title: Optional[str] = None,
) -> ResumeAnalysisResult:
    """
    Intelligent semantic heuristic evaluator:
    Compares the uploaded resume AND candidate profile skills against the JD and required skills.
    Never fails due to external API quota limits.
    """
    resume_clean = resume_text or ""
    text_lower = resume_clean.lower()
    c_skills = candidate_skills or []

    # 1. Extract required skills and contextual JD keywords
    clean_required, jd_extra_keywords = extract_keywords_from_jd(jd_text, required_skills)

    # Fallback if no required skills were configured
    if not clean_required:
        if jd_extra_keywords:
            clean_required = jd_extra_keywords[:5]
            jd_extra_keywords = jd_extra_keywords[5:]
        else:
            clean_required = ["Software Development", "Problem Solving"]

    # 2. Match Required Skills against Resume + Profile
    skills_matched = []
    skills_missing = []
    matched_profile_skills = set()

    for skill in clean_required:
        matched, in_resume, in_profile = _check_skill_match(skill, resume_clean, c_skills)
        if matched:
            source_tag = []
            if in_resume:
                source_tag.append("Resume")
            if in_profile:
                source_tag.append("Profile")
                matched_profile_skills.add(skill)
            tag_str = f"{skill} ({' & '.join(source_tag)})"
            skills_matched.append(tag_str)
        else:
            skills_missing.append(skill)

    # 3. Match Profile Skills against the entire JD corpus
    profile_matches = []
    for p_skill in c_skills:
        p_clean = p_skill.strip()
        if not p_clean:
            continue
        # Check if p_skill matches any required skill or extra JD keyword or appears in JD text
        pat = re.compile(r'(?:^|[^a-zA-Z0-9])' + re.escape(p_clean.lower()) + r'(?:$|[^a-zA-Z0-9])', re.IGNORECASE)
        in_jd = (pat.search(jd_text.lower()) is not None) or any(
            p_clean.lower() in [v.lower() for v in TECH_SKILLS_TAXONOMY.get(k, [])]
            for k in (clean_required + jd_extra_keywords)
        )
        if in_jd and p_clean not in profile_matches:
            profile_matches.append(p_clean)

    # 4. Match Extra JD Keywords against Candidate (Resume + Profile)
    extra_keywords_matched = []
    for extra_kw in jd_extra_keywords:
        matched, _, in_p = _check_skill_match(extra_kw, resume_clean, c_skills)
        if matched:
            extra_keywords_matched.append(extra_kw)
            if in_p:
                matched_profile_skills.add(extra_kw)

    # Compute skill ratios
    req_ratio = len(skills_matched) / max(len(clean_required), 1)
    extra_ratio = len(extra_keywords_matched) / max(len(jd_extra_keywords), 1) if jd_extra_keywords else 1.0

    # Total keyword coverage percentage
    total_target_keywords = len(clean_required) + len(jd_extra_keywords)
    total_matched_keywords = len(skills_matched) + len(extra_keywords_matched)
    keyword_match_pct = round((total_matched_keywords / max(total_target_keywords, 1)) * 100, 1)

    # 5. Experience Matching
    exp_matches = re.findall(r'(\d+(?:\.\d+)?)\+?\s*(?:years?|yrs?)\b', text_lower)
    detected_exp = 0.0
    if exp_matches:
        try:
            detected_exp = max([float(m) for m in exp_matches if float(m) < 40])
        except Exception:
            detected_exp = 0.0

    effective_exp = max(detected_exp, float(candidate_exp or 0.0))

    if min_experience <= 0:
        experience_match = 95.0
    elif effective_exp >= min_experience:
        experience_match = 98.0
    elif effective_exp > 0:
        experience_match = round(min(90.0, (effective_exp / min_experience) * 92), 1)
    else:
        # Fresher applying to entry role
        experience_match = 80.0 if min_experience <= 1 else 65.0

    # 6. Education Matching
    edu_keywords = [
        "bachelor", "b.tech", "b.e", "btech", "be", "master", "m.tech", "ms", "degree",
        "computer science", "information technology", "engineering", "bca", "mca", "diploma"
    ]
    has_edu_in_resume = any(kw in text_lower for kw in edu_keywords)
    has_edu_in_profile = bool(candidate_education)
    education_match = 95.0 if (has_edu_in_resume or has_edu_in_profile) else 75.0

    # 7. Applied Engineering / Project Evidence
    proj_keywords = [
        "project", "developed", "built", "designed", "implemented", "github", "deployed",
        "api", "database", "full-stack", "frontend", "backend", "architecture", "portfolio", "application"
    ]
    proj_count = sum(1 for kw in proj_keywords if kw in text_lower)
    project_score = min(98.0, 65.0 + (proj_count * 3.5))

    # 8. Calibrated Overall Score Formula
    # Core Skills: 40%
    # Extra JD Keywords / Profile Synergy: 20%
    # Experience: 20%
    # Education: 10%
    # Projects & Applied Depth: 10%
    core_skills_score = req_ratio * 100.0
    synergy_score = min(100.0, (len(profile_matches) * 12.0) + (extra_ratio * 50.0)) if (profile_matches or jd_extra_keywords) else core_skills_score

    total_score = round(
        (0.40 * core_skills_score) +
        (0.20 * synergy_score) +
        (0.20 * experience_match) +
        (0.10 * education_match) +
        (0.10 * project_score),
        1
    )
    total_score = max(30.0, min(98.0, total_score))

    # 9. Strengths Synthesis
    strengths = []
    if skills_matched:
        matched_clean_names = [s.split(" (")[0] for s in skills_matched[:3]]
        strengths.append(f"Strong competency in core requirements: {', '.join(matched_clean_names)}")
    if profile_matches:
        strengths.append(f"Candidate profile directly matches JD tech stack: {', '.join(profile_matches[:4])}")
    if experience_match >= 85:
        strengths.append(f"Experience level aligns well with the position benchmark ({effective_exp:.1f} yrs detected)")
    if education_match >= 90:
        strengths.append("Academic foundation aligned with Computer Science / Engineering requirements")
    if project_score >= 85:
        strengths.append("Demonstrated practical development projects, deployment and technical implementation")
    if not strengths:
        strengths.append("Foundational understanding of core software development concepts")

    # 10. Constructive Areas / Weaknesses
    weaknesses = []
    if skills_missing:
        weaknesses.append(f"Could strengthen proficiency in target requirements: {', '.join(skills_missing[:3])}")
    if min_experience > 0 and effective_exp < min_experience:
        weaknesses.append(f"Target experience requested is {min_experience} yrs; candidate profile reflects {effective_exp:.1f} yrs")
    if not weaknesses:
        weaknesses.append("Continue deepening specialized domain knowledge and advanced architectural patterns")

    # 11. Comprehensive Feedback Text
    matched_count = len(skills_matched)
    total_req_count = len(clean_required)
    feedback_parts = [
        f"Candidate scored {total_score}%. Matches {matched_count} of {total_req_count} core role requirements based on resume & profile analysis."
    ]
    if profile_matches:
        feedback_parts.append(f"Profile skills verified against JD: {', '.join(profile_matches[:4])}.")
    if skills_missing:
        feedback_parts.append(f"Pending skills: {', '.join(skills_missing[:3])}.")

    overall_feedback = " ".join(feedback_parts)

    return ResumeAnalysisResult(
        score=total_score,
        skills_matched=skills_matched,
        skills_missing=skills_missing,
        profile_skills_matched=list(matched_profile_skills.union(set(profile_matches))),
        keyword_match_percentage=keyword_match_pct,
        jd_keywords_matched=extra_keywords_matched,
        experience_match=experience_match,
        education_match=education_match,
        overall_feedback=overall_feedback,
        strengths=strengths,
        weaknesses=weaknesses,
    )


async def analyze_resume_with_gemini(
    resume_text: str,
    jd_text: str,
    required_skills: list,
    min_experience: float,
    education_req: str,
    candidate_skills: list,
    jd_extra_keywords: list,
) -> ResumeAnalysisResult:
    """Analyze resume using Google Gemini with profile skills and JD comparison."""
    import google.generativeai as genai
    genai.configure(api_key=settings.GEMINI_API_KEY)
    model = genai.GenerativeModel("gemini-1.5-flash")

    prompt = _build_screening_prompt(
        resume_text=resume_text,
        jd_text=jd_text,
        required_skills=required_skills,
        jd_extra_keywords=jd_extra_keywords,
        candidate_skills=candidate_skills,
        min_experience=min_experience,
        education_req=education_req,
    )
    response = model.generate_content(prompt)
    raw = response.text.strip()

    # Extract JSON even if there's surrounding text
    match = re.search(r'\{.*\}', raw, re.DOTALL)
    if match:
        raw = match.group(0)

    data = json.loads(raw)
    return ResumeAnalysisResult(**data)


async def analyze_resume_with_openai(
    resume_text: str,
    jd_text: str,
    required_skills: list,
    min_experience: float,
    education_req: str,
    candidate_skills: list,
    jd_extra_keywords: list,
) -> ResumeAnalysisResult:
    """Analyze resume using OpenAI GPT-4o with profile skills and JD comparison."""
    from openai import AsyncOpenAI
    client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)

    prompt = _build_screening_prompt(
        resume_text=resume_text,
        jd_text=jd_text,
        required_skills=required_skills,
        jd_extra_keywords=jd_extra_keywords,
        candidate_skills=candidate_skills,
        min_experience=min_experience,
        education_req=education_req,
    )
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        response_format={"type": "json_object"},
    )
    data = json.loads(response.choices[0].message.content)
    return ResumeAnalysisResult(**data)


async def screen_resume(
    resume_filepath: str,
    jd_text: str,
    required_skills: list,
    min_experience: float = 0,
    education_req: Optional[str] = None,
    job_title: Optional[str] = None,
    candidate_skills: Optional[list] = None,
    candidate_exp: float = 0,
    candidate_education: Optional[list] = None,
    candidate_headline: Optional[str] = None,
) -> ResumeAnalysisResult:
    """
    Main entry point:
    1. Extracts full resume text from uploaded PDF/DOCX.
    2. Extracts JD keywords and unifies with role requirements.
    3. Evaluates candidate resume AND profile skills against the JD.
    """
    resume_text = extract_text_from_file(resume_filepath)

    if not resume_text or len(resume_text) < 30:
        raise ValueError("Could not extract sufficient text from the resume. Please upload a valid text-based PDF or DOCX.")

    # Extract extra keywords from JD text
    clean_required, jd_extra_keywords = extract_keywords_from_jd(jd_text, required_skills)
    c_skills = candidate_skills or []

    # 1. Try Gemini
    if settings.PRIMARY_AI_PROVIDER == "gemini" and settings.GEMINI_API_KEY:
        try:
            return await analyze_resume_with_gemini(
                resume_text=resume_text,
                jd_text=jd_text,
                required_skills=clean_required,
                min_experience=min_experience,
                education_req=education_req,
                candidate_skills=c_skills,
                jd_extra_keywords=jd_extra_keywords,
            )
        except Exception as gemini_err:
            print(f"[WARN] Gemini screening failed ({gemini_err}), checking OpenAI fallback...")

    # 2. Try OpenAI
    if settings.OPENAI_API_KEY:
        try:
            return await analyze_resume_with_openai(
                resume_text=resume_text,
                jd_text=jd_text,
                required_skills=clean_required,
                min_experience=min_experience,
                education_req=education_req,
                candidate_skills=c_skills,
                jd_extra_keywords=jd_extra_keywords,
            )
        except Exception as openai_err:
            print(f"[WARN] OpenAI screening failed ({openai_err}), falling back to intelligent evaluator...")

    # 3. Intelligent Semantic Evaluator (Robust, deterministic, zero-quota-exhaustion)
    print(f"[INFO] Screening resume comparing JD & profile skills ({len(c_skills)} candidate skills against {len(clean_required)} required).")
    return _heuristic_screen_resume(
        resume_text=resume_text,
        jd_text=jd_text,
        required_skills=clean_required,
        min_experience=min_experience,
        education_req=education_req,
        candidate_skills=c_skills,
        candidate_exp=candidate_exp,
        candidate_education=candidate_education,
        candidate_headline=candidate_headline,
        job_title=job_title,
    )
