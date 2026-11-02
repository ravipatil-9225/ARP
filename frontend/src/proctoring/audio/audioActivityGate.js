/**
 * Audio Activity Gate for proctoring.
 * Suspends anomaly analysis while the AI interviewer is speaking and for 800ms after it stops.
 */
export class AudioActivityGate {
  constructor(cooldownMs = 800) {
    this.cooldownMs = cooldownMs;
    this.isAiSpeaking = false;
    this.lastAiSpeakingEndedAt = 0;
  }

  setAiSpeaking(speaking, now = Date.now()) {
    if (this.isAiSpeaking && !speaking) {
      // Just stopped speaking
      this.lastAiSpeakingEndedAt = now;
    }
    this.isAiSpeaking = Boolean(speaking);
  }

  /**
   * Returns true if audio analysis is allowed, false if gated/suspended.
   */
  canAnalyzeAudio(now = Date.now()) {
    if (this.isAiSpeaking) {
      return false;
    }
    if (now - this.lastAiSpeakingEndedAt < this.cooldownMs) {
      return false;
    }
    return true;
  }
}
