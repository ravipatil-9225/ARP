
import { useState, useEffect, useRef, useCallback } from 'react';
import { proctorApi } from '../../api/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const IMMEDIATE_FLUSH_EVENTS = new Set([
  'DEVTOOLS_OPEN',
  'FULLSCREEN_EXIT',
]);

/**
 * useProctoring - Central Event Bus, Session Lifecycle, and Event Queue.
 */
export function useProctoring({ applicationId, sessionType = 'voice' }) {
  const [session, setSession] = useState(null);
  const [proctoringEnabled, setProctoringEnabled] = useState(false);
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flagCount, setFlagCount] = useState(0);
  const [recentViolation, setRecentViolation] = useState(null);

  const eventQueueRef = useRef([]);
  const inFlightRef = useRef(false);
  const retryCountRef = useRef(0);
  const flushTimerRef = useRef(null);

  // ── Session Init ────────────────────────────────────────────────────────────

  const initSession = useCallback(async () => {
    if (!applicationId) return;
    try {
      setLoading(true);
      const res = await proctorApi.startSession(applicationId, sessionType);
      setSession(res.data);
      setProctoringEnabled(Boolean(res.data.proctoring_enabled));
      setConsentAccepted(Boolean(res.data.consent_accepted));
    } catch (err) {
      console.warn('[Proctoring] Failed to initialize session:', err);
      // Graceful fallback: do not crash the candidate page
      setProctoringEnabled(false);
    } finally {
      setLoading(false);
    }
  }, [applicationId, sessionType]);

  useEffect(() => {
    initSession();
  }, [initSession]);

  // ── Flush Queue ─────────────────────────────────────────────────────────────

  const flushQueue = useCallback(async () => {
    if (!applicationId || inFlightRef.current || eventQueueRef.current.length === 0) {
      return;
    }

    inFlightRef.current = true;
    // Slice up to 100 events
    const batch = eventQueueRef.current.slice(0, 100);

    try {
      await proctorApi.logEvents(applicationId, { events: batch });
      // Successfully sent - remove from queue
      eventQueueRef.current.splice(0, batch.length);
      retryCountRef.current = 0;
    } catch (err) {
      console.warn('[Proctoring] Batch event flush failed, scheduling retry:', err);
      // Exponential backoff retry: 1s, 2s, 4s, 8s, max 15s
      retryCountRef.current += 1;
      const delay = Math.min(1000 * Math.pow(2, retryCountRef.current - 1), 15000);
      setTimeout(() => {
        inFlightRef.current = false;
        flushQueue();
      }, delay);
      return;
    } finally {
      inFlightRef.current = false;
    }
  }, [applicationId]);

  // ── Log Event ───────────────────────────────────────────────────────────────

  const logEvent = useCallback((eventType, payload = {}) => {
    const event = {
      client_event_id: generateUUID(),
      event_type: eventType,
      occurred_at: new Date().toISOString(),
      detail: payload.detail || '',
      duration_seconds: payload.duration_seconds || null,
      metadata: payload.metadata || {},
    };

    // Queue in memory
    eventQueueRef.current.push(event);
    setFlagCount((prev) => prev + 1);
    setRecentViolation({ type: eventType, detail: event.detail, time: Date.now() });

    // Flush immediately for critical events
    if (IMMEDIATE_FLUSH_EVENTS.has(eventType)) {
      flushQueue();
    }
  }, [flushQueue]);

  // Periodic flush every 10 seconds
  useEffect(() => {
    flushTimerRef.current = setInterval(() => {
      flushQueue();
    }, 10000);

    return () => {
      if (flushTimerRef.current) clearInterval(flushTimerRef.current);
    };
  }, [flushQueue]);

  // Flush on pagehide / unload with keepalive fetch
  useEffect(() => {
    const handlePageHide = () => {
      if (!applicationId || eventQueueRef.current.length === 0) return;
      const batch = eventQueueRef.current.slice(0, 100);
      const token = localStorage.getItem('smarthire_token');

      try {
        fetch(`${API_URL}/api/proctor/${applicationId}/events`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ events: batch }),
          keepalive: true,
        });
      } catch (e) {
        // Suppress unload errors
      }
    };

    window.addEventListener('pagehide', handlePageHide);
    return () => {
      window.removeEventListener('pagehide', handlePageHide);
    };
  }, [applicationId]);

  // ── Finalize Session ────────────────────────────────────────────────────────

  const finalizeSession = useCallback(async (summary = null) => {
    if (!applicationId) return;
    try {
      // First flush any remaining events
      await flushQueue();
      const res = await proctorApi.finalizeSession(applicationId, { summary });
      return res.data;
    } catch (err) {
      console.warn('[Proctoring] Failed to finalize session:', err);
    }
  }, [applicationId, flushQueue]);

  return {
    session,
    proctoringEnabled,
    consentAccepted,
    setConsentAccepted,
    loading,
    flagCount,
    recentViolation,
    logEvent,
    flushQueue,
    finalizeSession,
    eventQueueRef,
  };
}

