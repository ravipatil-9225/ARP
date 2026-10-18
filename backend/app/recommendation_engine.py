"""
Hybrid Job Recommendation Engine
- Direct Skill Overlap (Jaccard / Set Intersection) — 45%
- TF-IDF Cosine Similarity (text matching) — 30%
- Experience Proximity Score — 15%
- Education Tier Match — 10%
"""
import re
import math
from collections import Counter
from typing import List, Dict, Any


def _tokenize(text: str) -> List[str]:
    """Simple word tokenizer for TF-IDF."""
    text = text.lower()
    text = re.sub(r'[^a-z0-9\s\+\#\.]', ' ', text)
    tokens = text.split()
    # Remove very short/common stop words
    stop_words = {'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
                  'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
                  'would', 'could', 'should', 'may', 'might', 'shall', 'can',
                  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from',
                  'and', 'or', 'but', 'not', 'if', 'then', 'than', 'so',
                  'as', 'it', 'its', 'this', 'that', 'these', 'those',
                  'we', 'you', 'he', 'she', 'they', 'our', 'your', 'my'}
    return [t for t in tokens if t not in stop_words and len(t) > 1]


def _compute_tf(tokens: List[str]) -> Dict[str, float]:
    """Compute term frequency."""
    counter = Counter(tokens)
    total = len(tokens) if tokens else 1
    return {word: count / total for word, count in counter.items()}


def _cosine_similarity(tf1: Dict[str, float], tf2: Dict[str, float]) -> float:
    """Compute cosine similarity between two TF vectors."""
    all_words = set(tf1.keys()) | set(tf2.keys())
    if not all_words:
        return 0.0

    dot_product = sum(tf1.get(w, 0) * tf2.get(w, 0) for w in all_words)
    mag1 = math.sqrt(sum(v ** 2 for v in tf1.values())) or 1
    mag2 = math.sqrt(sum(v ** 2 for v in tf2.values())) or 1

    return dot_product / (mag1 * mag2)


def _skill_overlap_score(candidate_skills: List[str], job_skills: List[str]) -> tuple:
    """
    Compute skill overlap score (0-100).
    Returns (score, matched_skills, missing_skills).
    """
    if not job_skills:
        return 80.0, candidate_skills[:5], []

    cand_lower = {s.lower().strip() for s in candidate_skills}
    job_lower = {s.lower().strip() for s in job_skills}

    matched = []
    missing = []

    for js in job_skills:
        js_clean = js.lower().strip()
        # Check exact match or partial containment
        found = False
        for cs in cand_lower:
            if js_clean == cs or js_clean in cs or cs in js_clean:
                found = True
                break
        if found:
            matched.append(js)
        else:
            missing.append(js)

    score = (len(matched) / len(job_skills)) * 100.0 if job_skills else 80.0
    return round(score, 1), matched, missing


def _experience_score(candidate_years: float, job_min_years: float) -> float:
    """Score experience proximity (0-100)."""
    if job_min_years <= 0:
        return 90.0
    if candidate_years >= job_min_years:
        # Bonus for exceeding, capped at 100
        return min(100.0, 85.0 + (candidate_years - job_min_years) * 3)
    else:
        # Penalize for being under, but not too harshly
        ratio = candidate_years / job_min_years
        return max(30.0, ratio * 80.0)


def _education_score(candidate_education: List[Dict], job_education_req: str) -> float:
    """Score education match (0-100)."""
    if not job_education_req:
        return 85.0

    req_lower = job_education_req.lower()
    if not candidate_education:
        return 50.0

    # Check if any of the candidate's education matches
    all_edu_text = " ".join([
        f"{e.get('degree', '')} {e.get('institution', '')} {e.get('field', '')}"
        for e in candidate_education
    ]).lower()

    # Tier matching
    tiers = {
        "phd": 100, "doctorate": 100,
        "master": 90, "m.tech": 90, "ms": 90, "mca": 90, "m.s": 90, "mba": 90,
        "bachelor": 80, "b.tech": 80, "b.e": 80, "bca": 80, "b.sc": 80, "b.s": 80,
        "diploma": 65, "associate": 60,
    }

    # What does the job require?
    required_tier = 70  # default
    for keyword, tier_score in tiers.items():
        if keyword in req_lower:
            required_tier = tier_score
            break

    # What does candidate have?
    candidate_tier = 60  # default
    for keyword, tier_score in tiers.items():
        if keyword in all_edu_text:
            candidate_tier = max(candidate_tier, tier_score)

    if candidate_tier >= required_tier:
        return 95.0
    elif candidate_tier >= required_tier - 10:
        return 80.0
    else:
        return 60.0


def _match_tier_label(score: float) -> str:
    """Human-readable match tier label."""
    if score >= 85:
        return "Strong Match"
    elif score >= 70:
        return "Good Match"
    elif score >= 55:
        return "Moderate Match"
    elif score >= 40:
        return "Partial Match"
    else:
        return "Low Match"


def recommend_jobs(candidate_profile: Dict[str, Any], jobs: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Rank all active jobs by match score against the candidate profile.
    Returns sorted list with match details.
    """
    candidate_skills = candidate_profile.get("skills", [])
    candidate_exp = candidate_profile.get("experience_years", 0)
    candidate_education = candidate_profile.get("education", [])

    # Build candidate text for TF-IDF
    candidate_text_parts = [
        candidate_profile.get("headline", ""),
        candidate_profile.get("name", ""),
        " ".join(candidate_skills),
    ]
    for exp in candidate_profile.get("experience_history", []):
        candidate_text_parts.append(exp.get("title", ""))
        candidate_text_parts.append(exp.get("description", ""))
    for edu in candidate_education:
        candidate_text_parts.append(edu.get("degree", ""))
        candidate_text_parts.append(edu.get("field", ""))

    candidate_tokens = _tokenize(" ".join(candidate_text_parts))
    candidate_tf = _compute_tf(candidate_tokens)

    results = []

    for job in jobs:
        job_skills = job.get("required_skills", [])

        # 1. Skill overlap (45%)
        skill_score, matched_skills, missing_skills = _skill_overlap_score(candidate_skills, job_skills)

        # 2. TF-IDF cosine similarity (30%)
        job_text = f"{job.get('title', '')} {job.get('description', '')} {' '.join(job_skills)}"
        job_tokens = _tokenize(job_text)
        job_tf = _compute_tf(job_tokens)
        tfidf_score = _cosine_similarity(candidate_tf, job_tf) * 100.0

        # 3. Experience proximity (15%)
        exp_score = _experience_score(candidate_exp, job.get("min_experience_years", 0))

        # 4. Education match (10%)
        edu_score = _education_score(candidate_education, job.get("education_requirement", ""))

        # Composite weighted score
        composite = round(
            (skill_score * 0.45) +
            (tfidf_score * 0.30) +
            (exp_score * 0.15) +
            (edu_score * 0.10),
            1
        )
        composite = min(99.0, max(5.0, composite))

        # Build experience status text
        job_min_exp = job.get("min_experience_years", 0)
        if job_min_exp <= 0:
            exp_status = "No experience requirement"
        elif candidate_exp >= job_min_exp:
            exp_status = f"Meets requirement ({candidate_exp}/{job_min_exp} years)"
        else:
            exp_status = f"Below requirement ({candidate_exp}/{job_min_exp} years)"

        # Build recommendation reason
        reasons = []
        if matched_skills:
            reasons.append(f"Matches {len(matched_skills)} of {len(job_skills)} required skills")
        if exp_score >= 80:
            reasons.append("experience aligns well with the role")
        if edu_score >= 80:
            reasons.append("education meets requirements")
        why = ". ".join(reasons) + "." if reasons else "Based on profile similarity analysis."

        results.append({
            "job_id": str(job.get("_id", job.get("id", ""))),
            "job_token": job.get("job_token", ""),
            "title": job.get("title", ""),
            "company_name": job.get("company_name", ""),
            "description": job.get("description", ""),
            "required_skills": job_skills,
            "min_experience_years": job_min_exp,
            "education_requirement": job.get("education_requirement"),
            "interview_type": job.get("interview_type", "off_campus"),
            "created_at": job["created_at"].isoformat() if hasattr(job.get("created_at"), "isoformat") else (str(job.get("created_at")) if job.get("created_at") else None),
            "match_score": composite,
            "match_tier": _match_tier_label(composite),
            "matching_skills": matched_skills,
            "missing_skills": missing_skills,
            "experience_status": exp_status,
            "why_recommended": why,
            "score_breakdown": {
                "skill_overlap": round(skill_score, 1),
                "text_similarity": round(tfidf_score, 1),
                "experience_fit": round(exp_score, 1),
                "education_fit": round(edu_score, 1),
            },
        })

    # Sort by match score descending
    results.sort(key=lambda x: x["match_score"], reverse=True)
    return results
