import pytest
from app.proctor.scoring import (
    ProctorEventType,
    ProctorSeverity,
    ProctorRiskLevel,
    get_server_severity,
    compute_session_score,
)

def test_server_derived_severity():
    assert get_server_severity("GAZE_AWAY") == ProctorSeverity.LOW
    assert get_server_severity("WINDOW_BLUR") == ProctorSeverity.LOW
    assert get_server_severity("NO_FACE") == ProctorSeverity.MEDIUM
    assert get_server_severity("TAB_SWITCH") == ProctorSeverity.MEDIUM
    assert get_server_severity("AUDIO_ANOMALY") == ProctorSeverity.HIGH
    assert get_server_severity("OBJECT_DETECTED") == ProctorSeverity.HIGH
    assert get_server_severity("DEVTOOLS_OPEN") == ProctorSeverity.CRITICAL

    with pytest.raises(ValueError):
        get_server_severity("UNKNOWN_EVENT")

def test_caps_enforced():
    # GAZE_AWAY weight=2, max_count=8, cap=16
    score, level, breakdown = compute_session_score({"GAZE_AWAY": 100})
    assert score == 16
    assert breakdown["GAZE_AWAY"] == 16
    assert level == ProctorRiskLevel.LOW

    # TAB_SWITCH weight=6, max_count=4, cap=24
    score, level, breakdown = compute_session_score({"TAB_SWITCH": 10})
    assert score == 24
    assert breakdown["TAB_SWITCH"] == 24
    assert level == ProctorRiskLevel.LOW

def test_100_ceiling():
    # If all events happen to max count:
    all_events = {ev.value: 10 for ev in ProctorEventType}
    score, level, breakdown = compute_session_score(all_events)
    assert score == 100
    assert level == ProctorRiskLevel.CRITICAL

def test_high_floor_raises_tier():
    # 1 OBJECT_DETECTED is 12 points (score <= 25, which would normally be LOW)
    score, level, _ = compute_session_score({"OBJECT_DETECTED": 1})
    assert score == 12
    # Floor must raise tier to HIGH
    assert level == ProctorRiskLevel.HIGH

    # 1 MULTIPLE_FACES is 15 points (score <= 25)
    score, level, _ = compute_session_score({"MULTIPLE_FACES": 1})
    assert score == 15
    assert level == ProctorRiskLevel.HIGH

    # 1 DEVTOOLS_OPEN is 25 points (score <= 25)
    score, level, _ = compute_session_score({"DEVTOOLS_OPEN": 1})
    assert score == 25
    assert level == ProctorRiskLevel.HIGH

def test_floors_never_lower_tier():
    # Score 80 would be CRITICAL. An event with HIGH floor (OBJECT_DETECTED) shouldn't lower it to HIGH.
    score, level, _ = compute_session_score({
        "OBJECT_DETECTED": 3, # 36
        "DEVTOOLS_OPEN": 2,   # 50
    })
    assert score == 86
    assert level == ProctorRiskLevel.CRITICAL

def test_clean_session():
    # No events = 0 score, low risk
    score, level, breakdown = compute_session_score({})
    assert score == 0
    assert level == ProctorRiskLevel.LOW
    assert breakdown == {}
