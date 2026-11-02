/**
 * ObjectDetectionTracker:
 * Filters detections for only 'cell phone' and 'book'.
 * Requires target object class to be detected in 2 consecutive inferences
 * before emitting OBJECT_DETECTED.
 */
export class ObjectDetectionTracker {
  constructor({
    allowedClasses = ['cell phone', 'book'],
    minScore = 0.55,
    cooldownSec = 10,
  } = {}) {
    this.allowedClasses = new Set(allowedClasses);
    this.minScore = minScore;
    this.cooldownSec = cooldownSec;

    // Map: className -> consecutiveCount
    this.consecutiveCounts = new Map();
    this.lastEmissionTimes = new Map();
  }

  update(rawDetections = [], timestampSec) {
    // Filter for valid target classes with confidence >= minScore
    const detectedTargets = new Map();

    for (const det of rawDetections) {
      const category = det.categories?.[0];
      if (!category) continue;

      const className = category.categoryName?.toLowerCase();
      const score = category.score ?? 0;

      if (this.allowedClasses.has(className) && score >= this.minScore) {
        // Keep highest confidence if multiple
        const existing = detectedTargets.get(className);
        if (!existing || score > existing.score) {
          detectedTargets.set(className, {
            className,
            score,
            boundingBox: det.boundingBox,
          });
        }
      }
    }

    const emitted = [];

    // Check consecutive confirmations
    for (const [className, info] of detectedTargets.entries()) {
      const count = (this.consecutiveCounts.get(className) || 0) + 1;
      this.consecutiveCounts.set(className, count);

      const lastEmitted = this.lastEmissionTimes.get(className) || -Infinity;

      if (count >= 2 && timestampSec - lastEmitted >= this.cooldownSec) {
        this.lastEmissionTimes.set(className, timestampSec);
        emitted.push({
          className,
          score: info.score,
          boundingBox: info.boundingBox,
        });
      }
    }

    // Reset counts for classes not seen in this inference
    for (const monitored of this.allowedClasses) {
      if (!detectedTargets.has(monitored)) {
        this.consecutiveCounts.set(monitored, 0);
      }
    }

    return emitted;
  }
}

