import { describe, it, expect } from 'vitest';
import { computeHeadPose, GlanceTracker } from '../vision/gazeEstimation';
import { MultipleFacesTracker } from '../vision/multipleFacesTracker';
import { ObjectDetectionTracker } from '../vision/objectTracker';

describe('Phase 4: Tier 1 Vision Engine Tests', () => {
  // ── 1. Head Pose Angle Math ─────────────────────────────────────────────────
  it('computes centered yaw and pitch when looking forward', () => {
    const forwardFace = {
      nose: { x: 0.5, y: 0.45 },
      leftEye: { x: 0.4, y: 0.35 },
      rightEye: { x: 0.6, y: 0.35 },
      chin: { x: 0.5, y: 0.75 },
    };
    const { yaw, pitch } = computeHeadPose(forwardFace);
    expect(Math.abs(yaw)).toBeLessThan(5); // Nearly 0 yaw
    expect(Math.abs(pitch)).toBeLessThan(15); // Normal forward pitch
  });

  it('computes significant yaw when looking left or right', () => {
    // Nose displaced to the right (x = 0.58 instead of center 0.5)
    const turnedRightFace = {
      nose: { x: 0.58, y: 0.45 },
      leftEye: { x: 0.4, y: 0.35 },
      rightEye: { x: 0.6, y: 0.35 },
      chin: { x: 0.5, y: 0.75 },
    };
    const { yaw } = computeHeadPose(turnedRightFace);
    expect(yaw).toBeGreaterThan(28); // Exceeds 28 deg threshold
  });

  // ── 2. Multiple-Face Debounce ───────────────────────────────────────────────
  it('multiple-face debounce: triggers only when >1 face persists for >= 1.5s', () => {
    const tracker = new MultipleFacesTracker({ debounceSec: 1.5 });

    // Single face at t = 10.0s
    expect(tracker.update(1, 10.0).shouldEmit).toBe(false);

    // Second face appears at t = 10.5s
    expect(tracker.update(2, 10.5).shouldEmit).toBe(false);

    // At t = 11.5s (duration = 1.0s < 1.5s) -> should NOT emit yet
    expect(tracker.update(2, 11.5).shouldEmit).toBe(false);

    // At t = 12.0s (duration = 1.5s >= 1.5s) -> triggers emission!
    const res = tracker.update(2, 12.0);
    expect(res.shouldEmit).toBe(true);
    expect(res.faceCount).toBe(2);

    // Immediate next frame within cooldown -> should not re-emit
    expect(tracker.update(2, 12.1).shouldEmit).toBe(false);

    // Return to 1 face resets tracker
    expect(tracker.update(1, 13.0).shouldEmit).toBe(false);
  });

  // ── 3. Glance Counter: 3 Glances in 60s vs Spread Over 90s vs Sustained 8.5s ──
  it('glance counter: 3 glances in 60s triggers GAZE_AWAY', () => {
    const tracker = new GlanceTracker({
      glanceDurationThresholdSec: 2.0,
      rollingWindowSec: 60,
    });

    const glancePose = { yaw: 35, pitch: 0 };
    const normalPose = { yaw: 0, pitch: 0 };

    // Glance 1: t = 5 to 7.5 (duration 2.5s > 2.0s)
    tracker.update(glancePose, 5.0);
    tracker.update(glancePose, 7.5);
    tracker.update(normalPose, 8.0);

    // Glance 2: t = 20 to 22.5
    tracker.update(glancePose, 20.0);
    tracker.update(glancePose, 22.5);
    tracker.update(normalPose, 23.0);

    // Glance 3: t = 40 to 42.5 (3 glances within 42.5 - 5 = 37.5s <= 60s)
    tracker.update(glancePose, 40.0);
    const res = tracker.update(glancePose, 42.5);
    expect(res.shouldEmit).toBe(true);
  });

  it('glance counter: 3 glances spread over 90s does NOT trigger', () => {
    const tracker = new GlanceTracker({
      glanceDurationThresholdSec: 2.0,
      rollingWindowSec: 60,
    });

    const glancePose = { yaw: 35, pitch: 0 };
    const normalPose = { yaw: 0, pitch: 0 };

    // Glance 1: t = 0 to 2.5
    tracker.update(glancePose, 0.0);
    tracker.update(glancePose, 2.5);
    tracker.update(normalPose, 3.0);

    // Glance 2: t = 50 to 52.5
    tracker.update(glancePose, 50.0);
    tracker.update(glancePose, 52.5);
    tracker.update(normalPose, 53.0);

    // Glance 3: t = 90 to 92.5 (Glance 1 has expired from the 60s window!)
    tracker.update(glancePose, 90.0);
    const res = tracker.update(glancePose, 92.5);
    expect(res.shouldEmit).toBe(false);
  });

  it('glance counter: single sustained 8.5s glance triggers GAZE_AWAY', () => {
    const tracker = new GlanceTracker({
      sustainedGlanceThresholdSec: 8.0,
    });

    const glancePose = { yaw: 35, pitch: 0 };

    tracker.update(glancePose, 10.0);
    tracker.update(glancePose, 15.0); // 5s -> no
    expect(tracker.update(glancePose, 17.0).shouldEmit).toBe(false); // 7s -> no

    // At 18.5s (8.5s continuous) -> triggers!
    const res = tracker.update(glancePose, 18.5);
    expect(res.shouldEmit).toBe(true);
    expect(res.reason).toContain('Sustained gaze away');
  });

  // ── 4. Object Detection Confirmation (2 Consecutive Inferences) ─────────────
  it('object confirmation: requires 2 consecutive inferences and ignores unmonitored classes', () => {
    const tracker = new ObjectDetectionTracker({
      allowedClasses: ['cell phone', 'book'],
      minScore: 0.55,
    });

    // 1st inference with 'cell phone' -> count = 1, should not emit yet
    const det1 = [{ categories: [{ categoryName: 'cell phone', score: 0.85 }] }];
    expect(tracker.update(det1, 10.0).length).toBe(0);

    // 2nd consecutive inference with 'cell phone' -> count = 2, emits!
    const det2 = [{ categories: [{ categoryName: 'cell phone', score: 0.88 }] }];
    const res2 = tracker.update(det2, 10.5);
    expect(res2.length).toBe(1);
    expect(res2[0].className).toBe('cell phone');

    // Unmonitored classes ('laptop', 'tv', 'monitor') are ignored even if score is high
    const unmonitored = [
      { categories: [{ categoryName: 'laptop', score: 0.99 }] },
      { categories: [{ categoryName: 'tv', score: 0.95 }] },
    ];
    expect(tracker.update(unmonitored, 11.0).length).toBe(0);
    expect(tracker.update(unmonitored, 11.5).length).toBe(0);
  });
});

