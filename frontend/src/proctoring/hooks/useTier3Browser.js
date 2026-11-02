import { useEffect, useRef, useState, useCallback } from 'react';
import { encodeWAV } from '../audio/wavEncoder';
import { AudioActivityGate } from '../audio/audioActivityGate';

/**
 * useTier3Browser - Browser Lockdown, Event Listeners, and Audio Capture.
 *
 * @param {Object} config
 * @param {string} config.applicationId
 * @param {string} config.sessionType - 'voice' | 'dsa'
 * @param {boolean} config.enabled - Feature flag state
 * @param {boolean} config.isAiSpeaking - External flag when AI interviewer speaks
 * @param {Function} config.logEvent - Callback to buffer/send proctor events
 * @param {Function} [config.onAudioAnomalyClip] - Callback to send 6s WAV
 */
export function useTier3Browser({
  applicationId,
  sessionType = 'voice',
  enabled = true,
  isAiSpeaking = false,
  logEvent,
  onAudioAnomalyClip,
}) {
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement));
  const [monitorStatus, setMonitorStatus] = useState('pending'); // 'pending' | 'ok' | 'multiple' | 'unsupported'
  const [screenCount, setScreenCount] = useState(1);
  const [isAudioMonitoringActive, setIsAudioMonitoringActive] = useState(false);

  const lastVisibilityChangeTime = useRef(0);
  const tabHiddenStartTime = useRef(0);
  const fullscreenExitStartTime = useRef(0);
  const audioGate = useRef(new AudioActivityGate(800));

  // Audio capture refs
  const audioContextRef = useRef(null);
  const audioStreamRef = useRef(null);
  const lastAudioAnomalyTime = useRef(0);
  const pcmBufferRef = useRef([]);

  // DevTools undocked timing check state
  const devToolsConfirmedCount = useRef(0);
  const devToolsFirstConfirmTime = useRef(0);
  const lastDevToolsEmissionTime = useRef(0);

  // Sync AI speaking state to audio gate
  useEffect(() => {
    audioGate.current.setAiSpeaking(isAiSpeaking);
  }, [isAiSpeaking]);

  // ── 3.1 Fullscreen Enforcement (User-gesture gated) ─────────────────────────

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        if (fullscreenExitStartTime.current > 0) {
          const duration = (Date.now() - fullscreenExitStartTime.current) / 1000;
          fullscreenExitStartTime.current = 0;
          logEvent('FULLSCREEN_EXIT', {
            detail: `Returned to fullscreen after ${duration.toFixed(1)}s`,
            duration_seconds: duration,
          });
        }
      }
    } catch (err) {
      console.warn('[Proctoring] Fullscreen request rejected:', err);
    }
  }, [logEvent]);

  useEffect(() => {
    if (!enabled) return;

    const handleFullscreenChange = () => {
      const active = Boolean(document.fullscreenElement);
      setIsFullscreen(active);
      if (!active) {
        fullscreenExitStartTime.current = Date.now();
        // Emit exit notification immediately
        logEvent('FULLSCREEN_EXIT', {
          detail: 'Candidate exited fullscreen mode',
        });
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [enabled, logEvent]);

  // ── 3.2 Tab Switch & Window Blur (Deduplicated) ─────────────────────────────

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      const now = Date.now();
      lastVisibilityChangeTime.current = now;

      if (document.hidden) {
        tabHiddenStartTime.current = now;
      } else {
        if (tabHiddenStartTime.current > 0) {
          const duration = (now - tabHiddenStartTime.current) / 1000;
          tabHiddenStartTime.current = 0;
          logEvent('TAB_SWITCH', {
            detail: `Tab switched or minimized for ${duration.toFixed(1)}s`,
            duration_seconds: duration,
          });
        }
      }
    };

    const handleWindowBlur = () => {
      const now = Date.now();
      // Only log blur if no visibilitychange occurred within previous 500ms
      if (now - lastVisibilityChangeTime.current > 500) {
        logEvent('WINDOW_BLUR', {
          detail: 'Window focus lost while tab remained visible',
        });
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [enabled, logEvent]);

  // ── 3.3 & 3.4 DevTools & Input Blocking (DSA Route Only) ───────────────────

  useEffect(() => {
    if (!enabled || sessionType !== 'dsa') return;

    // Block right-click context menu
    const handleContextMenu = (e) => {
      e.preventDefault();
      logEvent('CLIPBOARD_ATTEMPT', { detail: 'Context menu (right-click) blocked' });
    };

    // Block clipboard actions
    const handleCopy = (e) => {
      e.preventDefault();
      logEvent('CLIPBOARD_ATTEMPT', { detail: 'Copy command blocked' });
    };
    const handleCut = (e) => {
      e.preventDefault();
      logEvent('CLIPBOARD_ATTEMPT', { detail: 'Cut command blocked' });
    };
    const handlePaste = (e) => {
      e.preventDefault();
      logEvent('CLIPBOARD_ATTEMPT', { detail: 'Paste command blocked' });
    };

    // Block inspector shortcut keys
    const handleKeyDown = (e) => {
      // F12
      if (e.key === 'F12') {
        e.preventDefault();
        logEvent('DEVTOOLS_OPEN', { detail: 'F12 inspector key blocked' });
        return;
      }
      // Ctrl+Shift+I / J / C or Cmd+Opt+I / J / C
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && ['I', 'J', 'C', 'i', 'j', 'c'].includes(e.key)) {
        e.preventDefault();
        logEvent('DEVTOOLS_OPEN', { detail: `DevTools key shortcut blocked: Ctrl+Shift+${e.key}` });
        return;
      }
      // Ctrl+U (view source)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'u' || e.key === 'U')) {
        e.preventDefault();
        logEvent('DEVTOOLS_OPEN', { detail: 'View Source key shortcut blocked: Ctrl+U' });
        return;
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    window.addEventListener('keydown', handleKeyDown);

    // Docked & Undocked DevTools periodic check (only in production / non-DEV)
    let devToolsInterval = null;
    if (!import.meta.env.DEV) {
      devToolsInterval = setInterval(() => {
        const now = performance.now();
        const wallNow = Date.now();

        // 1. Docked check
        if (window.outerWidth - window.innerWidth > 160 || window.outerHeight - window.innerHeight > 160) {
          if (wallNow - lastDevToolsEmissionTime.current > 60000) {
            lastDevToolsEmissionTime.current = wallNow;
            logEvent('DEVTOOLS_OPEN', { detail: 'Docked DevTools detected via window dimension differential' });
          }
        }

        // 2. Undocked timing check (>250ms on 2 confirmations within 1.2s)
        const t0 = performance.now();
        // eslint-disable-next-line no-debugger
        debugger;
        const delta = performance.now() - t0;

        if (delta > 250) {
          if (devToolsConfirmedCount.current === 0) {
            devToolsConfirmedCount.current = 1;
            devToolsFirstConfirmTime.current = now;
          } else if (now - devToolsFirstConfirmTime.current <= 1200) {
            // Second confirmation within 1.2s!
            devToolsConfirmedCount.current = 0;
            if (wallNow - lastDevToolsEmissionTime.current > 60000) {
              lastDevToolsEmissionTime.current = wallNow;
              logEvent('DEVTOOLS_OPEN', { detail: 'Undocked DevTools detected via confirmed debugger trap' });
            }
          } else {
            // Reset if outside 1.2s window
            devToolsConfirmedCount.current = 1;
            devToolsFirstConfirmTime.current = now;
          }
        }
      }, 1000);
    }

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      window.removeEventListener('keydown', handleKeyDown);
      if (devToolsInterval) clearInterval(devToolsInterval);
    };
  }, [enabled, sessionType, logEvent]);

  // ── 3.5 Multi-Monitor Detection ─────────────────────────────────────────────

  useEffect(() => {
    if (!enabled) return;

    async function checkMonitors() {
      // Chromium-based browsers support window.getScreenDetails
      if ('getScreenDetails' in window) {
        try {
          const screenDetails = await window.getScreenDetails();
          const count = screenDetails.screens.length;
          setScreenCount(count);

          if (count > 1) {
            setMonitorStatus('multiple');
            logEvent('MULTIPLE_MONITORS', {
              detail: `${count} screens detected connected`,
              screen_count: count,
            });
          } else {
            setMonitorStatus('ok');
          }

          screenDetails.addEventListener('screenschange', () => {
            const updatedCount = screenDetails.screens.length;
            setScreenCount(updatedCount);
            if (updatedCount > 1) {
              setMonitorStatus('multiple');
              logEvent('MULTIPLE_MONITORS', {
                detail: `Display configuration change: ${updatedCount} screens connected`,
                screen_count: updatedCount,
              });
            } else {
              setMonitorStatus('ok');
            }
          });
        } catch (err) {
          // Permission denied or dismissed
          setMonitorStatus('ok');
        }
      } else {
        // Non-Chromium (Firefox, Safari) - set unsupported, no penalty applied
        setMonitorStatus('unsupported');
      }
    }

    checkMonitors();
  }, [enabled, logEvent]);

  // ── 3.6 Audio Capture & RMS Gating ──────────────────────────────────────────

  const startAudioMonitoring = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false,
        },
      });
      audioStreamRef.current = stream;

      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);

      // Node for capturing raw PCM samples for 6s buffer
      const processor = audioCtx.createScriptProcessor(4096, 1, 1);
      source.connect(processor);
      processor.connect(audioCtx.destination);

      pcmBufferRef.current = [];
      const maxSamples = 16000 * 6; // 6 seconds at 16kHz

      processor.onaudioprocess = (e) => {
        const inputData = e.inputBuffer.getChannelData(0);
        // Maintain rolling 6-second circular buffer
        for (let i = 0; i < inputData.length; i++) {
          pcmBufferRef.current.push(inputData[i]);
        }
        if (pcmBufferRef.current.length > maxSamples) {
          pcmBufferRef.current.splice(0, pcmBufferRef.current.length - maxSamples);
        }
      };

      // Periodic RMS calculation every 400ms
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Float32Array(bufferLength);

      const checkRmsInterval = setInterval(() => {
        if (!audioGate.current.canAnalyzeAudio()) {
          return; // AI is speaking or in 800ms cooldown gate
        }

        analyser.getFloatTimeDomainData(dataArray);
        let sumSquares = 0;
        for (let i = 0; i < bufferLength; i++) {
          sumSquares += dataArray[i] * dataArray[i];
        }
        const rms = Math.sqrt(sumSquares / bufferLength);

        // Voice activity threshold
        const RMS_THRESHOLD = 0.04;
        const now = Date.now();

        if (rms > RMS_THRESHOLD) {
          // Limit anomaly WAV dispatch to at most once per 60s
          if (now - lastAudioAnomalyTime.current > 60000 && pcmBufferRef.current.length >= 16000 * 2) {
            lastAudioAnomalyTime.current = now;
            const samplesCopy = new Float32Array(pcmBufferRef.current);
            const wavBlob = encodeWAV(samplesCopy, 16000);

            if (onAudioAnomalyClip) {
              onAudioAnomalyClip(wavBlob);
            }
          }
        }
      }, 400);

      setIsAudioMonitoringActive(true);

      return () => {
        clearInterval(checkRmsInterval);
        processor.disconnect();
        source.disconnect();
        if (audioCtx.state !== 'closed') audioCtx.close();
        stream.getTracks().forEach((t) => t.stop());
      };
    } catch (err) {
      console.warn('[Proctoring] Audio monitoring init failed:', err);
    }
  }, [onAudioAnomalyClip]);

  return {
    isFullscreen,
    enterFullscreen,
    monitorStatus,
    screenCount,
    isAudioMonitoringActive,
    startAudioMonitoring,
  };
}

