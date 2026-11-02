/**
 * Computes head pose (yaw and pitch in degrees) from key face landmarks.
 * Landmarks normalized coordinates: x in [0, 1], y in [0, 1], z in [0, 1].
 * Points:
 * - noseTip: 4
 * - leftEyeOuter: 33
 * - rightEyeOuter: 263
 * - chin: 152
 */
export function computeHeadPose({ nose, leftEye, rightEye, chin }) {
  if (!nose || !leftEye || !rightEye || !chin) {
    return { yaw: 0, pitch: 0 };
  }

  // Interocular distance & midpoint
  const eyeMidX = (leftEye.x + rightEye.x) / 2;
  const eyeMidY = (leftEye.y + rightEye.y) / 2;
  const eyeDist = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y) || 0.1;

  // Yaw: horizontal displacement of nose tip from eye midpoint relative to eye span
  // When looking forward, nose tip is approximately centered between eyes
  const noseXOffset = nose.x - eyeMidX;
  // Scale to degrees (-90 to +90 approx)
  const yaw = (noseXOffset / (eyeDist / 2)) * 45;

  // Pitch: vertical displacement of nose tip relative to eye-to-chin line
  const faceHeight = Math.hypot(chin.x - eyeMidX, chin.y - eyeMidY) || 0.1;
  // Natural forward-facing nose position is typically ~35-40% down from eyes to chin
  const naturalNoseYRatio = 0.38;
  const currentNoseYRatio = (nose.y - eyeMidY) / faceHeight;
  const pitchRatio = currentNoseYRatio - naturalNoseYRatio;
  // Looking down gives negative pitch
  const pitch = -pitchRatio * 90;

  return { yaw, pitch };
}

/**
 * GlanceTracker:
 * Evaluates whether head pose constitutes a glance (>28 deg yaw or <-20 deg pitch sustained >2.0s).
 * Emits GAZE_AWAY if >= 3 glances in rolling 60s OR single glance > 8.0s.
 * Enforces 10s cooldown between emissions.
 */
export class GlanceTracker {
  constructor({
    yawThreshold = 28,
    pitchThreshold = -20,
    glanceDurationThresholdSec = 2.0,
    sustainedGlanceThresholdSec = 8.0,
    rollingWindowSec = 60,
    cooldownSec = 10,
  } = {}) {
    this.yawThreshold = yawThreshold;
    this.pitchThreshold = pitchThreshold;
    this.glanceDurationThresholdSec = glanceDurationThresholdSec;
    this.sustainedGlanceThresholdSec = sustainedGlanceThresholdSec;
    this.rollingWindowSec = rollingWindowSec;
    this.cooldownSec = cooldownSec;

    this.currentGlanceStart = null;
    this.glanceLoggedForCurrentDeviation = false;
    this.completedGlances = []; // timestamps of completed glances
    this.lastEmissionTime = -Infinity;
  }

  update({ yaw, pitch }, timestampSec) {
    const isDeviated =
      Math.abs(yaw) > this.yawThreshold || pitch < this.pitchThreshold;

    let shouldEmit = false;
    let reason = '';

    if (isDeviated) {
      if (this.currentGlanceStart === null) {
        this.currentGlanceStart = timestampSec;
        this.glanceLoggedForCurrentDeviation = false;
      }

      const currentDuration = timestampSec - this.currentGlanceStart;

      // Check single sustained glance > 8s
      if (
        currentDuration > this.sustainedGlanceThresholdSec &&
        timestampSec - this.lastEmissionTime > this.cooldownSec
      ) {
        shouldEmit = true;
        reason = `Sustained gaze away (${currentDuration.toFixed(1)}s)`;
        this.lastEmissionTime = timestampSec;
      }

      // Record a glance once sustained for > 2.0s
      if (
        currentDuration > this.glanceDurationThresholdSec &&
        !this.glanceLoggedForCurrentDeviation
      ) {
        this.completedGlances.push(timestampSec);
        this.glanceLoggedForCurrentDeviation = true;

        // Check rolling 60s window for >= 3 glances
        const cutoff = timestampSec - this.rollingWindowSec;
        this.completedGlances = this.completedGlances.filter((t) => t >= cutoff);

        if (
          this.completedGlances.length >= 3 &&
          timestampSec - this.lastEmissionTime > this.cooldownSec
        ) {
          shouldEmit = true;
          reason = `Repeated glances away (${this.completedGlances.length} in 60s)`;
          this.lastEmissionTime = timestampSec;
        }
      }
    } else {
      // Returned to normal posture
      this.currentGlanceStart = null;
      this.glanceLoggedForCurrentDeviation = false;
    }

    // Prune glances older than window
    const cutoff = timestampSec - this.rollingWindowSec;
    this.completedGlances = this.completedGlances.filter((t) => t >= cutoff);

    return { shouldEmit, reason };
  }
}

