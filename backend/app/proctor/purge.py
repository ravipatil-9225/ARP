import os
import shutil
from datetime import datetime
from app.database import get_db
from app.config import get_settings

settings = get_settings()

async def purge_expired_proctor_evidence() -> int:
    """
    Deletes all media for sessions past media_purge_after.
    Deletes ID photo, baseline selfie, snapshots, and audio files.
    Sets media_purged = True on the session document, while preserving the score and event records.
    Returns the number of sessions purged.
    """
    db = get_db()
    now = datetime.utcnow()
    cursor = db.proctor_sessions.find({
        "media_purge_after": {"$lte": now, "$ne": None},
        "media_purged": False
    })

    purged_count = 0
    async for session in cursor:
        app_id = str(session["application_id"])
        proctor_dir = os.path.join(settings.LOCAL_UPLOAD_DIR, "proctor", app_id)

        # Remove directory if exists
        if os.path.exists(proctor_dir):
            try:
                shutil.rmtree(proctor_dir)
            except Exception as e:
                print(f"[WARN] Error deleting proctor directory {proctor_dir}: {e}")

        # Update session
        await db.proctor_sessions.update_one(
            {"_id": session["_id"]},
            {
                "$set": {
                    "media_purged": True,
                    "id_verification.id_photo_path": None,
                    "id_verification.baseline_selfie_path": None,
                    "updated_at": now
                }
            }
        )

        # Clear snapshot_paths on events for this session
        await db.proctor_events.update_many(
            {"session_id": session["_id"]},
            {"$set": {"snapshot_path": None}}
        )

        purged_count += 1

    return purged_count

