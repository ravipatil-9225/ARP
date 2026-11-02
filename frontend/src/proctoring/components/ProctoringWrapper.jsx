import React, { useState, useEffect } from 'react';
import { useProctoring } from '../hooks/useProctoring';
import { useTier3Browser } from '../hooks/useTier3Browser';
import { useTier1Webcam } from '../hooks/useTier1Webcam';
import ConsentGate from './ConsentGate';
import ProctoringHUD from './ProctoringHUD';
import SecurityViolationAlert from './SecurityViolationAlert';
import LockdownCover from './LockdownCover';
import { proctorApi } from '../../api/client';

/**
 * ProctoringWrapper — Tier 1 (Webcam) + Tier 3 (Browser lockdown) only.
 *
 * Flow: Consent → Fullscreen → Interview starts with continuous monitoring.
 * No Tier 2 identity verification steps (ID check, liveness, voice enrollment).
 */
export default function ProctoringWrapper({
  applicationId,
  sessionType = 'voice',
  isAiSpeaking = false,
  children,
}) {
  const {
    session,
    proctoringEnabled,
    consentAccepted,
    setConsentAccepted,
    loading,
    flagCount,
    recentViolation,
    logEvent,
  } = useProctoring({ applicationId, sessionType });

  // Interview is active once consent has been accepted
  const interviewStarted = Boolean(consentAccepted);

  // ── Tier 3 Browser & Audio Lockdown ─────────────────────────────────────────
  const handleAudioAnomalyClip = async (wavBlob) => {
    logEvent('AUDIO_ANOMALY', { detail: 'Background voice activity or whispering detected' });
    try {
      const formData = new FormData();
      formData.append('audio', wavBlob, 'anomaly.wav');
      await proctorApi.uploadAudioAnomaly(applicationId, formData);
    } catch (err) {
      console.warn('[Proctoring] Audio anomaly upload notice:', err);
    }
  };

  const {
    isFullscreen,
    enterFullscreen,
    isAudioMonitoringActive,
    startAudioMonitoring,
  } = useTier3Browser({
    applicationId,
    sessionType,
    enabled: proctoringEnabled && interviewStarted,
    isAiSpeaking,
    logEvent,
    onAudioAnomalyClip: handleAudioAnomalyClip,
  });

  // ── Tier 1 Webcam Vision Engine ─────────────────────────────────────────────
  const {
    videoRef,
    isCameraActive,
    isFaceMisaligned,
    misalignmentReason,
  } = useTier1Webcam({
    applicationId,
    enabled: proctoringEnabled && interviewStarted,
    logEvent,
  });

  // Start audio monitoring once interview has started
  useEffect(() => {
    if (proctoringEnabled && interviewStarted && !isAudioMonitoringActive) {
      startAudioMonitoring();
    }
  }, [proctoringEnabled, interviewStarted, isAudioMonitoringActive, startAudioMonitoring]);

  // If proctoring feature flag is disabled, seamlessly render children immediately
  if (!proctoringEnabled && !loading) {
    return <>{children}</>;
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '20px', height: '20px', border: '2px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
          <span>Initializing secure assessment session...</span>
        </div>
      </div>
    );
  }

  const handleConsentAndStart = async () => {
    try {
      await enterFullscreen();
    } catch (e) {
      console.warn('Could not auto-enter fullscreen:', e);
    }
    setConsentAccepted(true);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      {/* Webcam element for Tier-1 vision capture (off-screen but rendered so browser decodes frames) */}
      <video
        ref={videoRef}
        playsInline
        muted
        style={{
          position: 'fixed',
          top: '-9999px',
          left: '-9999px',
          width: '640px',
          height: '480px',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
      />

      {/* 1. Consent Gate — after accept, enters fullscreen and starts interview */}
      {!consentAccepted && (
        <ConsentGate
          applicationId={applicationId}
          onConsentAccepted={handleConsentAndStart}
        />
      )}

      {/* 2. Fullscreen Enforcement Overlay (Active during the interview) */}
      {interviewStarted && (
        <LockdownCover
          isFullscreen={isFullscreen}
          onReturnFullscreen={enterFullscreen}
        />
      )}

      {/* 3. Floating HUD Indicator (Active during the interview) */}
      {interviewStarted && (
        <ProctoringHUD
          proctoringEnabled={proctoringEnabled}
          isFullscreen={isFullscreen}
          cameraActive={isCameraActive}
          micActive={isAudioMonitoringActive}
          flagCount={flagCount}
        />
      )}

      {/* 4. Non-blocking security violation toast */}
      {interviewStarted && <SecurityViolationAlert recentViolation={recentViolation} />}

      {/* 5. Real-time Face Misalignment Warning Banner */}
      {interviewStarted && isFaceMisaligned && (
        <div
          style={{
            position: 'fixed',
            top: '18px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            background: 'linear-gradient(135deg, rgba(220, 38, 38, 0.96), rgba(185, 28, 28, 0.96))',
            color: '#ffffff',
            padding: '10px 22px',
            borderRadius: '12px',
            boxShadow: '0 8px 30px rgba(220, 38, 38, 0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            fontWeight: 700,
            fontSize: '13px',
            backdropFilter: 'blur(8px)',
            border: '1.5px solid rgba(255, 255, 255, 0.35)',
            animation: 'pulse 1.5s infinite',
            pointerEvents: 'none',
          }}
        >
          <span style={{ fontSize: '18px' }}>⚠️</span>
          <span>Face Misaligned ({misalignmentReason}): Please face your screen directly and keep your head centered!</span>
        </div>
      )}

      {/* 6. Actual assessment interview content (ONLY mounted after consent is accepted) */}
      {interviewStarted && children}
    </div>
  );
}
