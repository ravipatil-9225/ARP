import os
import pytest
from datetime import datetime, timedelta
from bson import ObjectId
from app.proctor.purge import purge_expired_proctor_evidence
from app.proctor.storage import save_proctor_file, get_proctor_upload_dir
from app.config import get_settings

settings = get_settings()

@pytest.mark.asyncio
async def test_purge_expired_proctor_evidence(monkeypatch):
    """
    Purge test:
    - Creates dummy session and events with expired media_purge_after
    - Saves a real file on disk
    - Calls purge_expired_proctor_evidence()
    - Verifies file on disk deleted, session updated to media_purged=True, record kept.
    """
    app_id = str(ObjectId())
    sess_id = ObjectId()
    now = datetime.utcnow()
    past_purge_date = now - timedelta(days=1)

    # Mock DB collections in-memory
    mock_sessions = [
        {
            "_id": sess_id,
            "application_id": ObjectId(app_id),
            "media_purge_after": past_purge_date,
            "media_purged": False,
            "id_verification": {
                "id_photo_path": "some/path/id.jpg",
                "baseline_selfie_path": "some/path/selfie.jpg",
            },
            "risk_score": 45,
            "risk_level": "medium",
            "summary": "Preserved summary",
        }
    ]

    mock_events = [
        {
            "_id": ObjectId(),
            "session_id": sess_id,
            "snapshot_path": "some/path/snap.jpg",
        }
    ]

    class MockCursor:
        def __init__(self, items):
            self.items = items
        def __aiter__(self):
            self._iter = iter(self.items)
            return self
        async def __anext__(self):
            try:
                return next(self._iter)
            except StopIteration:
                raise StopAsyncIteration

    class MockDB:
        def __init__(self):
            self.sessions = mock_sessions
            self.events = mock_events

        @property
        def proctor_sessions(self):
            class SessionsColl:
                @staticmethod
                def find(query):
                    # Return items matching query
                    matched = [
                        s for s in mock_sessions
                        if s["media_purge_after"] <= now and not s["media_purged"]
                    ]
                    return MockCursor(matched)

                @staticmethod
                async def update_one(query, update):
                    for s in mock_sessions:
                        if s["_id"] == query["_id"]:
                            for k, v in update.get("$set", {}).items():
                                if "." in k:
                                    p1, p2 = k.split(".", 1)
                                    s[p1][p2] = v
                                else:
                                    s[k] = v
                            return True
                    return False
            return SessionsColl

        @property
        def proctor_events(self):
            class EventsColl:
                @staticmethod
                async def update_many(query, update):
                    for ev in mock_events:
                        if ev["session_id"] == query["session_id"]:
                            for k, v in update.get("$set", {}).items():
                                ev[k] = v
            return EventsColl

    fake_db = MockDB()
    monkeypatch.setattr("app.proctor.purge.get_db", lambda: fake_db)

    # Create dummy file on disk
    file_id, full_path = await save_proctor_file(app_id, b"dummy jpeg bytes", "jpg")
    assert os.path.exists(full_path)

    # Run purge
    purged_count = await purge_expired_proctor_evidence()
    assert purged_count == 1

    # Verify directory and file deleted
    proctor_dir = get_proctor_upload_dir(app_id)
    assert not os.path.exists(proctor_dir)

    # Verify session record preserved, but media_purged is True
    session = mock_sessions[0]
    assert session["media_purged"] is True
    assert session["id_verification"]["id_photo_path"] is None
    assert session["risk_score"] == 45
    assert session["summary"] == "Preserved summary"

