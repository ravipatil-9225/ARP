import React, { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';

const FRIENDLY_VIOLATION_MESSAGES = {
  NO_FACE: 'Please stay centered in front of the camera.',
  MULTIPLE_FACES: 'Multiple people detected in view.',
  GAZE_AWAY: 'Please focus your attention on the screen.',
  OBJECT_DETECTED: 'Unauthorized object detected in camera view.',
  AUDIO_ANOMALY: 'Secondary voice or background speech detected.',
  FULLSCREEN_EXIT: 'Please remain in fullscreen mode.',
  TAB_SWITCH: 'Window focus lost. Avoid switching tabs.',
  WINDOW_BLUR: 'Window focus lost.',
  DEVTOOLS_OPEN: 'Developer inspection tools are prohibited.',
  CLIPBOARD_ATTEMPT: 'Copying and pasting are disabled.',
  MULTIPLE_MONITORS: 'Please disconnect external monitors.',
  FACE_MISMATCH: 'Candidate identity verification alert.',
  LIVENESS_FAILED: 'Liveness check unconfirmed.',
};

export default function SecurityViolationAlert({ recentViolation }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (recentViolation && recentViolation.time) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [recentViolation]);

  if (!visible || !recentViolation) return null;

  const message =
    FRIENDLY_VIOLATION_MESSAGES[recentViolation.type] ||
    recentViolation.detail ||
    'Proctoring flag detected.';

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '24px',
        right: '24px',
        zIndex: 950,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        background: 'rgba(19, 28, 49, 0.95)',
        color: 'var(--danger-light)',
        border: '1px solid var(--danger)',
        padding: '12px 18px',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        fontSize: '0.85rem',
        fontWeight: 600,
        animation: 'modalEnter 0.2s ease',
      }}
    >
      <AlertTriangle size={18} color="var(--danger)" style={{ flexShrink: 0 }} />
      <span>{message}</span>
    </div>
  );
}
