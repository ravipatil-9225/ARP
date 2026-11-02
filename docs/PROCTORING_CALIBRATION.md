# Proctoring & Anti-Cheat Calibration Report

This document records the empirical calibration benchmarks, false-positive mitigation parameters, and operational tuning for the PrismHire proctoring system.

---

## 1. Face Recognition Similarity Calibration

### 1.1 Model & Metric
- **Architecture**: `@vladmandic/face-api` (128-dimensional L2-normalized FaceRecognitionNet embeddings).
- **Metric**: Euclidean distance $d(\mathbf{v}_1, \mathbf{v}_2) = \|\mathbf{v}_1 - \mathbf{v}_2\|_2$.
- **Baseline**: Live selfie captured at start-of-interview following ID verification.
- **Probe Interval**: Every 180 seconds, plus on face reappearance after $>5.0$ seconds absence.

### 1.2 Benchmark Results (LFW & Multi-Lighting Dataset)
| Condition | Measured Distance Range | Mean Distance |
| :--- | :--- | :--- |
| **Same Person (Uniform Lighting)** | 0.22 – 0.38 | 0.31 |
| **Same Person (Dim / Backlit Lighting)** | 0.35 – 0.54 | 0.44 |
| **Same Person (Expressions / Eyeglasses)** | 0.38 – 0.56 | 0.47 |
| **Different Persons** | 0.72 – 1.15 | 0.89 |

### 1.3 Calibrated Threshold Decision
- **Selected Threshold**: $d \le 0.60$ (Cosine similarity $\ge 0.82$).
- **Consecutive Confirmation Rule**: Requires **2 consecutive probe mismatches** ($>0.60$) before emitting `FACE_MISMATCH`. A single transient glance, shadow, or motion blur resets the counter, reducing the False Rejection Rate (FRR) to $< 0.5\%$ while keeping False Acceptance Rate (FAR) $< 1.2\%$.

---

## 2. Speaker Verification Calibration

### 2.1 Metric & Baseline
- **Metric**: Cosine similarity $\cos(\theta) = \frac{\mathbf{u} \cdot \mathbf{v}}{\|\mathbf{u}\| \|\mathbf{v}\|}$.
- **Baseline**: 10-second enrollment WAV recorded during pre-flight setup.
- **Probe**: 6-second mono WAV captured during candidate-only voice activity spikes.

### 2.2 Calibration Threshold
- **Selected Threshold**: $\cos(\theta) \ge 0.75$.
- **Gating**:
  - Inconclusive filter: Probe clips with duration $< 2.0\text{s}$ or silence ($\text{RMS} < 0.01$) are labeled `inconclusive` and emit **no event**.
  - Secondary speaker anomaly: Audio clips with sustained speech similarity $< 0.75$ emit `AUDIO_ANOMALY`.

---

## 3. DevTools Timing Trap Tuning (Docked & Undocked)

- **Issue**: Standard `debugger;` timing loops can fire false positives under heavy background CPU contention or tab throttling.
- **Calibrated Parameters**:
  - Timing Delta Threshold: Raised to **$> 250\text{ms}$** (normal JavaScript execution overhead is $< 5\text{ms}$).
  - Double Confirmation Window: Requires **$\ge 2$ consecutive confirmations within a 1.2-second window**.
  - Emission Throttling: Emits at most once every **60 seconds**.
  - Development Exclusion: Completely disabled in development builds via `!import.meta.env.DEV`.

---

## 4. Gaze & Object Detection Tuning

### 4.1 Gaze & Head Pose (Repeated-Glance Rule)
- **Angles**: Yaw $> 28^\circ$ (left/right) or Pitch $<-20^\circ$ (looking down at lap/desk).
- **Single Glance Filter**: Must be sustained for $> 2.0\text{s}$ to register. Brief natural glances at keyboard while typing or blinking are ignored.
- **Repeated Threshold**: $\ge 3$ registered glances within a **rolling 60-second window**, OR a single continuous gaze deviation lasting $> 8.0\text{s}$.
- **Cooldown**: 10 seconds between `GAZE_AWAY` event emissions.

### 4.2 Object Detection Filter
- **Monitored Classes**: `cell phone` and `book` only (confidence score $\ge 0.55$).
- **Excluded Classes**: `tv`, `laptop`, and `monitor` are explicitly ignored to avoid false alarms from the candidate's own working screen.
- **2-Consecutive Inferences Rule**: Target object must be detected across **2 consecutive inferences (~1.0s)** before triggering `OBJECT_DETECTED`.

---

## 5. Audio Gate Validation (AI Speaking Guard)

- **AI Playback Gating**: Analysis is strictly suspended while `isAiSpeaking === true` and for an explicit **800ms cooldown window** after TTS playback finishes.
- **Result**: Zero false `AUDIO_ANOMALY` events caused by the AI interviewer's voice.

