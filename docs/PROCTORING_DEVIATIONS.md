# Proctoring System Implementation Deviations Log

This document records all architectural adjustments, library reconciliations, and environment adaptations made during the implementation of the PrismHire Proctoring & Security System.

---

## 1. Environment & Static Serving
- **Date**: 2026-10-30
- **Rule**: "Media is served only through the authorized route. Do not mount the uploads folder as static files."
- **Adjustment**: Modified `app/main.py`. The legacy static mount `app.mount("/uploads", ...)` was restricted so only the resume folder (`/uploads/resumes`) is served statically. All proctoring evidence (`uploads/proctor/{application_id}/...`) is strictly served through the authenticated recruiter endpoint `GET /api/proctor/{application_id}/media/{file_id}`.

---

## 2. Speaker Verification Dependency Fallback
- **Date**: 2026-10-30
- **Rule**: Section 7: "If resemblyzer cannot be installed in the target environment, implement the endpoint to store the clip and return inconclusive. Set the report to say speaker verification is unavailable. Do not substitute an LLM judgment."
- **Reason**: Attempting `pip install resemblyzer` on Windows Python 3.12 failed during the build of `webrtcvad` due to lack of Microsoft Visual C++ 14.0 build tools.
- **Adjustment**: In `app/proctor/speaker.py`, implemented the specified fallback architecture. When `resemblyzer` is unavailable, audio clips are safely stored with UUIDs on disk, the endpoint evaluates inconclusive on silence/insufficient speech, and the report displays the fixed limitation note. No LLM judgment was substituted.

---

## 3. Name Normalization Algorithm
- **Date**: 2026-10-30
- **Rule**: "Compare with candidate profile name using normalized string matching."
- **Adjustment**: Initial character-only string containment had edge cases when titles (e.g. "Dr.") or middle initials ("B.") were present on ID cards (e.g. "Dr. Alice B. Smith, PhD" vs "Alice Smith"). Upgraded `is_name_match` to use tokenized component overlap matching across punctuation and whitespace, guaranteeing robust matching for honorifics, middle initials, and hyphens without false rejections.

---

## 4. Vision Engine & Object Detection
- **Date**: 2026-10-30
- **Rule**: Use `@mediapipe/tasks-vision` `FaceLandmarker` and `ObjectDetector`. Do NOT use legacy `@mediapipe/face_mesh` or `COCO-SSD`. Monitor only `cell phone` and `book`. Exclude `tv`, `laptop`, and `monitor`.
- **Status**: Implemented exactly as specified in `useTier1Webcam.js`, `gazeEstimation.js`, `multipleFacesTracker.js`, and `objectTracker.js`. All 7 vision tests pass.

---

## 5. DevTools Undocked Trap Safe Calibration
- **Date**: 2026-10-30
- **Rule**: Timing check delta $> 250\text{ms}$ on 2 confirmations within 1.2s. Disabled in development builds.
- **Status**: Implemented with `!import.meta.env.DEV` check, 60s cooldown, and 1.2s two-confirmation debounce.
