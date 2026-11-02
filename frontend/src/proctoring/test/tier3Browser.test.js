import { describe, it, expect, vi, beforeEach } from 'vitest';
import { encodeWAV } from '../audio/wavEncoder';
import { AudioActivityGate } from '../audio/audioActivityGate';

describe('Phase 2: Tier 3 Browser Lockdown & Audio Capture', () => {
  // ── 1. WAV Encoder Output Test ──────────────────────────────────────────────
  it('encodes Float32 PCM to a valid 16 kHz mono 16-bit WAV with correct headers', async () => {
    // 16000 samples = exactly 1 second at 16kHz
    const sampleRate = 16000;
    const samples = new Float32Array(sampleRate);
    for (let i = 0; i < samples.length; i++) {
      // 440 Hz sine wave
      samples[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
    }

    const blob = encodeWAV(samples, sampleRate);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe('audio/wav');

    // Expected size: 44 bytes header + (16000 samples * 2 bytes/sample) = 32044 bytes
    expect(blob.size).toBe(44 + 16000 * 2);

    const arrayBuffer = await blob.arrayBuffer();
    const view = new DataView(arrayBuffer);

    // RIFF header
    const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    expect(riff).toBe('RIFF');

    // WAVE format
    const wave = String.fromCharCode(view.getUint8(8), view.getUint8(9), view.getUint8(10), view.getUint8(11));
    expect(wave).toBe('WAVE');

    // fmt chunk
    const fmt = String.fromCharCode(view.getUint8(12), view.getUint8(13), view.getUint8(14), view.getUint8(15));
    expect(fmt).toBe('fmt ');

    // Audio format = 1 (PCM)
    expect(view.getUint16(20, true)).toBe(1);

    // Channel count = 1 (Mono)
    expect(view.getUint16(22, true)).toBe(1);

    // Sample rate = 16000
    expect(view.getUint32(24, true)).toBe(16000);

    // Byte rate = 32000 (16000 * 2)
    expect(view.getUint32(28, true)).toBe(32000);

    // Block align = 2
    expect(view.getUint16(32, true)).toBe(2);

    // Bits per sample = 16
    expect(view.getUint16(34, true)).toBe(16);

    // data chunk header
    const data = String.fromCharCode(view.getUint8(36), view.getUint8(37), view.getUint8(38), view.getUint8(39));
    expect(data).toBe('data');
    expect(view.getUint32(40, true)).toBe(16000 * 2);
  });

  // ── 2. Audio Activity Gate Test ─────────────────────────────────────────────
  it('audio gate suspends analysis while AI is speaking and for 800ms after it stops', () => {
    const gate = new AudioActivityGate(800);
    const t0 = 1000000;

    // Initially quiet
    expect(gate.canAnalyzeAudio(t0)).toBe(true);

    // AI begins speaking
    gate.setAiSpeaking(true);
    expect(gate.canAnalyzeAudio(t0 + 100)).toBe(false);
    expect(gate.canAnalyzeAudio(t0 + 1000)).toBe(false);

    // AI stops speaking at t0 + 2000
    const stopTime = t0 + 2000;
    gate.setAiSpeaking(false, stopTime);

    // 200ms after stopping (within 800ms cooldown) -> still false!
    expect(gate.canAnalyzeAudio(stopTime + 200)).toBe(false);

    // 799ms after stopping -> still false!
    expect(gate.canAnalyzeAudio(stopTime + 799)).toBe(false);

    // 801ms after stopping -> analysis resumes!
    expect(gate.canAnalyzeAudio(stopTime + 801)).toBe(true);
  });

  // ── 3. Visibility Change and Window Blur Deduplication Test ─────────────────
  it('suppresses WINDOW_BLUR when blur follows visibilitychange within 500ms', () => {
    const loggedEvents = [];
    const logEvent = (type, payload) => loggedEvents.push({ type, payload });

    let lastVisibilityTime = 0;

    function simulateVisibilityChange(now) {
      lastVisibilityTime = now;
      logEvent('TAB_SWITCH', { detail: 'Tab focus lost' });
    }

    function simulateBlur(now) {
      if (now - lastVisibilityTime > 500) {
        logEvent('WINDOW_BLUR', { detail: 'Window focus lost' });
      }
    }

    const t = 500000;

    // User switches tab: triggers visibilitychange at t, then blur at t + 50ms
    simulateVisibilityChange(t);
    simulateBlur(t + 50);

    // Exactly 1 event should be logged (TAB_SWITCH), and 0 WINDOW_BLUR
    expect(loggedEvents.length).toBe(1);
    expect(loggedEvents[0].type).toBe('TAB_SWITCH');

    // Standalone blur event later (e.g. 1000ms after last visibility change)
    simulateBlur(t + 1000);
    expect(loggedEvents.length).toBe(2);
    expect(loggedEvents[1].type).toBe('WINDOW_BLUR');
  });
});
