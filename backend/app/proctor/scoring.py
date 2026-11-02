from typing import Dict, List, Tuple
from enum import Enum

class ProctorEventType(str, Enum):
    # Tier 1: Webcam basics
    GAZE_AWAY = "GAZE_AWAY"
    NO_FACE = "NO_FACE"
    MULTIPLE_FACES = "MULTIPLE_FACES"
    OBJECT_DETECTED = "OBJECT_DETECTED"
    # Tier 3: Browser & audio lockdown
    WINDOW_BLUR = "WINDOW_BLUR"
    FULLSCREEN_EXIT = "FULLSCREEN_EXIT"
    CLIPBOARD_ATTEMPT = "CLIPBOARD_ATTEMPT"
    TAB_SWITCH = "TAB_SWITCH"
    AUDIO_ANOMALY = "AUDIO_ANOMALY"
    MULTIPLE_MONITORS = "MULTIPLE_MONITORS"
    DEVTOOLS_OPEN = "DEVTOOLS_OPEN"

class ProctorSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ProctorRiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

EVENT_RULES: Dict[ProctorEventType, Dict[str, any]] = {
    ProctorEventType.GAZE_AWAY: {
        "severity": ProctorSeverity.LOW,
        "weight": 2,
        "max_count": 8,
        "cap": 16,
    },
    ProctorEventType.WINDOW_BLUR: {
        "severity": ProctorSeverity.LOW,
        "weight": 3,
        "max_count": 6,
        "cap": 18,
    },
    ProctorEventType.NO_FACE: {
        "severity": ProctorSeverity.MEDIUM,
        "weight": 4,
        "max_count": 6,
        "cap": 24,
    },
    ProctorEventType.FULLSCREEN_EXIT: {
        "severity": ProctorSeverity.MEDIUM,
        "weight": 5,
        "max_count": 4,
        "cap": 20,
    },
    ProctorEventType.CLIPBOARD_ATTEMPT: {
        "severity": ProctorSeverity.MEDIUM,
        "weight": 5,
        "max_count": 4,
        "cap": 20,
    },
    ProctorEventType.TAB_SWITCH: {
        "severity": ProctorSeverity.MEDIUM,
        "weight": 6,
        "max_count": 4,
        "cap": 24,
    },
    ProctorEventType.AUDIO_ANOMALY: {
        "severity": ProctorSeverity.HIGH,
        "weight": 8,
        "max_count": 4,
        "cap": 32,
    },
    ProctorEventType.OBJECT_DETECTED: {
        "severity": ProctorSeverity.HIGH,
        "weight": 12,
        "max_count": 3,
        "cap": 36,
    },
    ProctorEventType.MULTIPLE_MONITORS: {
        "severity": ProctorSeverity.HIGH,
        "weight": 15,
        "max_count": 2,
        "cap": 30,
    },
    ProctorEventType.MULTIPLE_FACES: {
        "severity": ProctorSeverity.HIGH,
        "weight": 15,
        "max_count": 3,
        "cap": 45,
    },
    ProctorEventType.DEVTOOLS_OPEN: {
        "severity": ProctorSeverity.CRITICAL,
        "weight": 25,
        "max_count": 2,
        "cap": 50,
    },
}

# Floor triggers
HIGH_FLOOR_EVENTS = {
    ProctorEventType.OBJECT_DETECTED,
    ProctorEventType.MULTIPLE_FACES,
    ProctorEventType.MULTIPLE_MONITORS,
    ProctorEventType.AUDIO_ANOMALY,
    ProctorEventType.DEVTOOLS_OPEN,
}

CRITICAL_FLOOR_EVENTS = set()  # No Tier 2 events to trigger critical floor

def get_server_severity(event_type: str) -> ProctorSeverity:
    """Return the authoritative server-derived severity for an event type."""
    try:
        ev_enum = ProctorEventType(event_type)
        return EVENT_RULES[ev_enum]["severity"]
    except (ValueError, KeyError):
        raise ValueError(f"Unknown event type: {event_type}")

def compute_session_score(event_counts: Dict[str, int]) -> Tuple[int, ProctorRiskLevel, Dict[str, int]]:
    """
    Computes (risk_score, risk_level, breakdown).
    - Raw score = sum(weight * min(count, max_count))
    - Final score = min(100, raw)
    - Tiers: 0-25 low, 26-50 medium, 51-75 high, 76-100 critical
    - Floors applied:
      * Any OBJECT_DETECTED, MULTIPLE_FACES, MULTIPLE_MONITORS, AUDIO_ANOMALY, or DEVTOOLS_OPEN forces >= high
    """
    raw_score = 0
    breakdown = {}
    present_event_types = set()

    for ev_type_str, count in event_counts.items():
        if count <= 0:
            continue
        try:
            ev_enum = ProctorEventType(ev_type_str)
        except ValueError:
            continue

        present_event_types.add(ev_enum)
        rule = EVENT_RULES[ev_enum]
        effective_count = min(count, rule["max_count"])
        points = effective_count * rule["weight"]
        raw_score += points
        breakdown[ev_enum.value] = points

    final_score = min(100, raw_score)

    # Base tier from score
    if final_score <= 25:
        risk_level = ProctorRiskLevel.LOW
    elif final_score <= 50:
        risk_level = ProctorRiskLevel.MEDIUM
    elif final_score <= 75:
        risk_level = ProctorRiskLevel.HIGH
    else:
        risk_level = ProctorRiskLevel.CRITICAL

    # Apply floors: a tier can be raised, never lowered
    tier_order = {
        ProctorRiskLevel.LOW: 0,
        ProctorRiskLevel.MEDIUM: 1,
        ProctorRiskLevel.HIGH: 2,
        ProctorRiskLevel.CRITICAL: 3,
    }

    current_rank = tier_order[risk_level]

    if any(ev in present_event_types for ev in HIGH_FLOOR_EVENTS):
        current_rank = max(current_rank, tier_order[ProctorRiskLevel.HIGH])

    if any(ev in present_event_types for ev in CRITICAL_FLOOR_EVENTS):
        current_rank = max(current_rank, tier_order[ProctorRiskLevel.CRITICAL])

    rank_to_tier = {v: k for k, v in tier_order.items()}
    final_risk_level = rank_to_tier[current_rank]

    return final_score, final_risk_level, breakdown

