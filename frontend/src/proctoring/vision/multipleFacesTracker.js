/**
 * MultipleFacesTracker:
 * Tracks face count over time. Emits MULTIPLE_FACES only when > 1 face
 * has been continuously present for >= 1.5 seconds.
 */
export class MultipleFacesTracker {
  constructor({ debounceSec = 1.5, cooldownSec = 10 } = {}) {
    this.debounceSec = debounceSec;
    this.cooldownSec = cooldownSec;
    this.multiFaceStartTime = null;
    this.lastEmissionTime = -Infinity;
  }

  update(faceCount, timestampSec) {
    if (faceCount > 1) {
      if (this.multiFaceStartTime === null) {
        this.multiFaceStartTime = timestampSec;
      }
      const duration = timestampSec - this.multiFaceStartTime;
      if (
        duration >= this.debounceSec &&
        timestampSec - this.lastEmissionTime >= this.cooldownSec
      ) {
        this.lastEmissionTime = timestampSec;
        return {
          shouldEmit: true,
          faceCount,
          duration,
        };
      }
    } else {
      this.multiFaceStartTime = null;
    }

    return { shouldEmit: false, faceCount };
  }
}

