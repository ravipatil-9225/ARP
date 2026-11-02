import os
import uuid
import aiofiles
from datetime import datetime
from fastapi import HTTPException, UploadFile
from app.config import get_settings

settings = get_settings()

def get_proctor_upload_dir(application_id: str, create: bool = False) -> str:
    path = os.path.join(settings.LOCAL_UPLOAD_DIR, "proctor", str(application_id))
    if create:
        os.makedirs(path, exist_ok=True)
    return path

async def save_proctor_file(
    application_id: str,
    file_bytes: bytes,
    extension: str,
    max_bytes: int = 500 * 1024,
) -> tuple[str, str]:
    """
    Saves a proctor media file with a randomized UUID filename.
    Returns (file_id, relative_or_absolute_filepath).
    Enforces maximum size limits.
    """
    if len(file_bytes) > max_bytes:
        raise HTTPException(status_code=400, detail=f"File exceeds maximum allowed size of {max_bytes} bytes")

    file_id = str(uuid.uuid4())
    clean_ext = extension.lstrip(".")
    filename = f"{file_id}.{clean_ext}"
    dir_path = get_proctor_upload_dir(application_id, create=True)
    full_path = os.path.join(dir_path, filename)

    async with aiofiles.open(full_path, "wb") as f:
        await f.write(file_bytes)

    return file_id, full_path

def get_proctor_file_path(application_id: str, file_id: str) -> str | None:
    """Finds a file matching file_id with any extension under application proctor dir."""
    dir_path = get_proctor_upload_dir(application_id)
    if not os.path.exists(dir_path):
        return None
    for fname in os.listdir(dir_path):
        if fname.startswith(file_id):
            return os.path.join(dir_path, fname)
    return None

