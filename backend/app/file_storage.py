import os
import uuid
import aiofiles
from pathlib import Path
from fastapi import UploadFile
from app.config import get_settings

settings = get_settings()

ALLOWED_EXTENSIONS = {".pdf", ".doc", ".docx"}
MAX_FILE_SIZE = 5 * 1024 * 1024  # 5 MB


async def save_resume(file: UploadFile, candidate_id: str) -> str:
    """Save uploaded resume and return its storage path/URL."""
    ext = Path(file.filename).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"Invalid file type '{ext}'. Allowed: PDF, DOC, DOCX")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise ValueError("File too large. Maximum size is 5 MB.")

    if settings.STORAGE_BACKEND == "s3":
        return await _save_to_s3(content, candidate_id, ext)
    else:
        return await _save_local(content, candidate_id, ext)


async def _save_local(content: bytes, candidate_id: str, ext: str) -> str:
    upload_dir = Path(settings.LOCAL_UPLOAD_DIR) / "resumes"
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{candidate_id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = upload_dir / filename

    async with aiofiles.open(filepath, "wb") as f:
        await f.write(content)

    return f"/uploads/resumes/{filename}"


async def _save_to_s3(content: bytes, candidate_id: str, ext: str) -> str:
    import boto3
    s3 = boto3.client(
        "s3",
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=settings.AWS_REGION,
    )
    filename = f"resumes/{candidate_id}_{uuid.uuid4().hex[:8]}{ext}"
    s3.put_object(
        Bucket=settings.AWS_S3_BUCKET,
        Key=filename,
        Body=content,
        ContentType="application/pdf" if ext == ".pdf" else "application/octet-stream",
    )
    return f"https://{settings.AWS_S3_BUCKET}.s3.{settings.AWS_REGION}.amazonaws.com/{filename}"


def get_full_resume_path(resume_url: str) -> str:
    """Convert a relative URL to an absolute local file path."""
    if resume_url.startswith("/uploads/"):
        relative = resume_url.lstrip("/")
        return os.path.join(os.getcwd(), relative)
    return resume_url
