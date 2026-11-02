# Proctoring Privacy & DPDP Act Compliance Notice

This policy documents data protection practices, collection boundaries, retention cycles, and compliance measures for the automated proctoring and anti-cheat system in PrismHire.

> [!IMPORTANT]
> **Legal Notice:** This documentation and system design provide technical safeguards and architectural best practices. Formal legal review and advisory under India's **Digital Personal Data Protection (DPDP) Act, 2023** (and other relevant regional privacy frameworks) must be completed prior to production deployment.

---

## 1. What Data is Collected & Computed

| Data Element | Processing Location | Storage | Purpose |
| :--- | :--- | :--- | :--- |
| **Video Frames (Continuous)** | Client-side in browser RAM | **Never stored or transmitted.** Processed ephemerally via `@mediapipe/tasks-vision`. | Real-time face presence, head pose, and object detection. |
| **Facial Biometric Embeddings** | Client-side in browser RAM | **Never sent to server.** 128-dimensional mathematical vector computed via `@vladmandic/face-api`. | Periodic candidate swap verification against start selfie. |
| **ID Card Snapshot & Start Selfie** | Encrypted transmission to backend | Stored in isolated directory (`uploads/proctor/{app_id}/`). Served strictly via authenticated recruiter route. | One-time identity credential check & recruiter audit. |
| **Flagged Violation Snapshots** | Captured only upon verified violation | Stored on server disk with randomized UUID filename. Maximum 500 KB JPEG. | Evidentiary documentation for human recruiter review. |
| **Audio Voice Profile (Voice Round)** | 10-second reference WAV | Stored temporarily for speaker diarization. | Voice enrollment baseline. |
| **Audio Anomaly Snippets** | 6-second WAV when voice spike occurs | Stored on server disk with randomized UUID filename. | Second-speaker detection. |
| **Browser Activity Events** | Client browser event listeners | Stored as structured text records in MongoDB (`proctor_events`). | Audit trail for tab switches, fullscreen exits, and DevTools. |

---

## 2. Consent & Candidate Agency

1. **Pre-Assessment Consent Gate**:
   - Before webcam or microphone permissions are requested, candidates are presented with the **Consent Gate**.
   - Requires an explicit, affirmative checkbox:
     > *"PrismHire collects facial video frames and audio samples strictly for identity verification and proctoring integrity during this evaluation. Images and audio are deleted 60 days after the session."*
   - The consent version (`version: "v1"`) and UTC timestamp (`accepted_at`) are immutably stored in the `proctor_sessions` MongoDB collection.
2. **Right to Decline**:
   - Candidates may decline automated proctoring.
   - If declined, automated proctoring does not initiate, camera and mic are not activated, and the candidate is provided with an HR contact option to schedule a human-supervised manual interview without penalty.

---

## 3. Data Retention & 60-Day Automated Purge Policy

1. **Retention Period**:
   - All evidentiary media (ID card photo, baseline selfie, flagged violation snapshots, and audio clips) are assigned an expiration timestamp:
     $$\text{media\_purge\_after} = \text{session.ended\_at} + 60\text{ days}$$
2. **Automated Purge Execution (`app/proctor/purge.py`)**:
   - When the purge job executes, it permanently deletes the application's media folder (`uploads/proctor/{application_id}/`).
   - Clears `id_photo_path` and `baseline_selfie_path` on the session document.
   - Sets `media_purged = true`.
   - Clears `snapshot_path` references in `proctor_events`.
   - **Audit Record Preservation**: The numerical risk score, event counts, and recruiter notes are preserved for hiring pipeline continuity while all biometric media is erased.
3. **Manual Purge Trigger**:
   ```bash
   python -c "import asyncio; from app.proctor.purge import purge_expired_proctor_evidence; asyncio.run(purge_expired_proctor_evidence())"
   ```

---

## 4. Access Control & Non-Public Media Serving

- Proctoring media is **never** statically hosted on public web servers.
- The `app.mount("/uploads")` static mount was specifically restricted to prevent directory traversal into proctoring folders.
- Evidence files can only be accessed by authenticated recruiters belonging to the company that posted the job, via `GET /api/proctor/{application_id}/media/{file_id}`.

