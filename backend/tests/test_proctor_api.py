import pytest
from datetime import datetime
from bson import ObjectId
from fastapi.testclient import TestClient
from app.main import app
from app.auth import create_access_token
from app.database import get_db

client = TestClient(app)

@pytest.fixture
def auth_tokens():
    # Candidate 1 (owner)
    cand1_id = str(ObjectId())
    cand1_token = create_access_token({"sub": cand1_id, "role": "candidate", "email": "candidate1@example.com"})

    # Candidate 2 (intruder)
    cand2_id = str(ObjectId())
    cand2_token = create_access_token({"sub": cand2_id, "role": "candidate", "email": "candidate2@example.com"})

    # Recruiter 1 (matching company)
    comp1_id = str(ObjectId())
    recruiter_token = create_access_token({"sub": comp1_id, "role": "company", "email": "recruiter@example.com"})

    # Recruiter 2 (wrong company)
    comp2_id = str(ObjectId())
    wrong_recruiter_token = create_access_token({"sub": comp2_id, "role": "company", "email": "other@example.com"})

    return {
        "cand1_id": cand1_id,
        "cand1_token": cand1_token,
        "cand2_id": cand2_id,
        "cand2_token": cand2_token,
        "comp1_id": comp1_id,
        "recruiter_token": recruiter_token,
        "wrong_recruiter_token": wrong_recruiter_token,
    }

def test_unauthenticated_request_rejected():
    fake_app_id = str(ObjectId())
    # Recruiter-only report endpoint requires company auth
    res = client.get(f"/api/proctor/{fake_app_id}/report")
    assert res.status_code == 401

def test_endpoint_security_and_events(auth_tokens, monkeypatch):
    cand1_id = auth_tokens["cand1_id"]
    cand1_token = auth_tokens["cand1_token"]
    cand2_token = auth_tokens["cand2_token"]
    comp1_id = auth_tokens["comp1_id"]
    recruiter_token = auth_tokens["recruiter_token"]
    wrong_recruiter_token = auth_tokens["wrong_recruiter_token"]

    app_id = str(ObjectId())

    # In-memory mock database state
    mock_applications = {
        app_id: {
            "_id": ObjectId(app_id),
            "candidate_id": ObjectId(cand1_id),
            "candidate_name": "Alice Smith",
            "candidate_email": "candidate1@example.com",
            "company_id": ObjectId(comp1_id),
        }
    }
    mock_candidates = {
        cand1_id: {"_id": ObjectId(cand1_id), "email": "candidate1@example.com", "name": "Alice Smith"},
        auth_tokens["cand2_id"]: {"_id": ObjectId(auth_tokens["cand2_id"]), "email": "candidate2@example.com", "name": "Bob Jones"},
    }
    mock_companies = {
        comp1_id: {"_id": ObjectId(comp1_id), "email": "recruiter@example.com"},
        auth_tokens["wrong_recruiter_token"]: {"_id": ObjectId(comp1_id), "email": "other@example.com"},
    }
    mock_sessions = {}
    mock_events = []

    class MockAsyncCursor:
        def __init__(self, data):
            self.data = data
        def __aiter__(self):
            self._iter = iter(self.data)
            return self
        async def __anext__(self):
            try:
                return next(self._iter)
            except StopIteration:
                raise StopAsyncIteration
        def sort(self, field, order):
            return self

    class MockDB:
        @property
        def applications(self):
            class Coll:
                @staticmethod
                async def find_one(q):
                    aid = str(q.get("_id"))
                    return mock_applications.get(aid)
            return Coll

        @property
        def candidates(self):
            class Coll:
                @staticmethod
                async def find_one(q):
                    cid = str(q.get("_id"))
                    return mock_candidates.get(cid)
            return Coll

        @property
        def companies(self):
            class Coll:
                @staticmethod
                async def find_one(q):
                    cid = str(q.get("_id"))
                    return mock_companies.get(cid)
            return Coll

        @property
        def proctor_sessions(self):
            class Coll:
                @staticmethod
                async def find_one(q):
                    for s in mock_sessions.values():
                        if q.get("application_id") and s.get("application_id") == q["application_id"]:
                            return s
                        if q.get("_id") and s.get("_id") == q["_id"]:
                            return s
                    return None
                @staticmethod
                async def insert_one(doc):
                    sid = ObjectId()
                    doc["_id"] = sid
                    mock_sessions[str(sid)] = doc
                    class Res:
                        inserted_id = sid
                    return Res()
                @staticmethod
                async def update_one(q, u):
                    for s in mock_sessions.values():
                        matched = False
                        if q.get("_id") and s.get("_id") == q["_id"]:
                            matched = True
                        if q.get("application_id") and s.get("application_id") == q["application_id"]:
                            matched = True
                        if matched:
                            for k, v in u.get("$set", {}).items():
                                if "." in k:
                                    p1, p2 = k.split(".", 1)
                                    s.setdefault(p1, {})[p2] = v
                                else:
                                    s[k] = v
                            class Res:
                                matched_count = 1
                            return Res()
                    class Res:
                        matched_count = 0
                    return Res()
            return Coll

        @property
        def proctor_events(self):
            class Coll:
                @staticmethod
                def find(q):
                    matched = [e for e in mock_events if e.get("session_id") == q.get("session_id")]
                    return MockAsyncCursor(matched)
                @staticmethod
                async def update_one(q, u, upsert=False):
                    sess_id = q.get("session_id")
                    ev_id = q.get("client_event_id")
                    for e in mock_events:
                        if e.get("session_id") == sess_id and e.get("client_event_id") == ev_id:
                            # Already exists - deduplicate!
                            class Res:
                                upserted_id = None
                            return Res()
                    if upsert:
                        doc = u.get("$setOnInsert", {})
                        doc["_id"] = ObjectId()
                        mock_events.append(doc)
                        class Res:
                            upserted_id = doc["_id"]
                        return Res()
                    class Res:
                        upserted_id = None
                    return Res()
            return Coll

    monkeypatch.setattr("app.routers.proctor.get_db", lambda: MockDB())
    monkeypatch.setattr("app.routers.candidate_auth.get_db", lambda: MockDB())
    monkeypatch.setattr("app.auth.get_db", lambda: MockDB())

    # 1. Wrong candidate rejected (403)
    res_wrong = client.post(
        f"/api/proctor/{app_id}/session/start",
        headers={"Authorization": f"Bearer {cand2_token}"}
    )
    assert res_wrong.status_code == 403

    # 2. Right candidate successfully starts session
    res_start = client.post(
        f"/api/proctor/{app_id}/session/start",
        headers={"Authorization": f"Bearer {cand1_token}"}
    )
    assert res_start.status_code == 200
    data = res_start.json()
    assert data["application_id"] == app_id
    assert data["status"] == "pending_setup"

    # 3. Recruiter-only endpoint rejects candidate (401/403)
    res_report_cand = client.get(
        f"/api/proctor/{app_id}/report",
        headers={"Authorization": f"Bearer {cand1_token}"}
    )
    assert res_report_cand.status_code in [401, 403]

    # 4. Unknown event type rejected (400)
    bad_payload = {
        "events": [
            {
                "client_event_id": "ev-1",
                "event_type": "MADE_UP_EVENT_TYPE",
                "occurred_at": datetime.utcnow().isoformat(),
            }
        ]
    }
    res_bad_ev = client.post(
        f"/api/proctor/{app_id}/events",
        json=bad_payload,
        headers={"Authorization": f"Bearer {cand1_token}"}
    )
    assert res_bad_ev.status_code == 400

    # 5. Events posted: Severity is server-derived, duplicates deduped
    events_payload = {
        "events": [
            {
                "client_event_id": "ev-uuid-1",
                "event_type": "TAB_SWITCH",
                "occurred_at": datetime.utcnow().isoformat(),
                "detail": "Switched tabs",
            },
            {
                "client_event_id": "ev-uuid-2",
                "event_type": "OBJECT_DETECTED",
                "occurred_at": datetime.utcnow().isoformat(),
                "detail": "Phone visible",
            }
        ]
    }
    res_ev = client.post(
        f"/api/proctor/{app_id}/events",
        json=events_payload,
        headers={"Authorization": f"Bearer {cand1_token}"}
    )
    assert res_ev.status_code == 200
    assert res_ev.json()["inserted"] == 2

    # Check that severity was server-derived (TAB_SWITCH -> medium, OBJECT_DETECTED -> high)
    tab_ev = next(e for e in mock_events if e["client_event_id"] == "ev-uuid-1")
    obj_ev = next(e for e in mock_events if e["client_event_id"] == "ev-uuid-2")
    assert tab_ev["severity"] == "medium"
    assert obj_ev["severity"] == "high"

    # Post duplicate event (same client_event_id)
    res_ev_dupe = client.post(
        f"/api/proctor/{app_id}/events",
        json=events_payload,
        headers={"Authorization": f"Bearer {cand1_token}"}
    )
    assert res_ev_dupe.status_code == 200
    # Duplicate was ignored, inserted count is 0
    assert res_ev_dupe.json()["inserted"] == 0

    # 6. Finalize session: server recomputes risk score from DB events
    res_fin = client.post(
        f"/api/proctor/{app_id}/session/finalize",
        json={"summary": "Candidate completed interview"},
        headers={"Authorization": f"Bearer {cand1_token}"}
    )
    assert res_fin.status_code == 200
    fin_data = res_fin.json()
    # TAB_SWITCH (6 pts) + OBJECT_DETECTED (12 pts) = 18 pts
    assert fin_data["risk_score"] == 18
    # OBJECT_DETECTED forces floor >= high
    assert fin_data["risk_level"] == "high"
    assert "media_purge_after" in fin_data

    # 7. Recruiter fetches report
    res_report = client.get(
        f"/api/proctor/{app_id}/report",
        headers={"Authorization": f"Bearer {recruiter_token}"}
    )
    assert res_report.status_code == 200
    report_data = res_report.json()
    assert report_data["risk_score"] == 18
    assert report_data["risk_level"] == "high"
    assert len(report_data["events"]) == 2
    assert "disclaimer_notes" in report_data

