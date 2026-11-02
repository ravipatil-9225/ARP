import React from 'react';
import { Maximize2, ShieldAlert } from 'lucide-react';

export default function LockdownCover({ isFullscreen, onReturnFullscreen }) {
  if (isFullscreen) return null;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999, background: 'rgba(9, 13, 22, 0.95)' }}>
      <div className="modal" style={{ maxWidth: '440px', textAlign: 'center', border: '1px solid var(--warning)' }}>
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--warning-subtle)',
            border: '1px solid var(--warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--warning-light)',
            margin: '0 auto 16px',
          }}
        >
          <ShieldAlert size={28} />
        </div>
        <h2 style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
          Fullscreen Mode Required
        </h2>
        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
          To maintain assessment integrity, this evaluation must be completed in fullscreen mode.
          Exiting fullscreen is logged as a proctoring flag.
        </p>
        <button
          type="button"
          onClick={onReturnFullscreen}
          className="btn btn-primary"
          style={{ width: '100%', justifyContent: 'center', padding: '12px 24px', fontSize: '0.95rem' }}
        >
          <Maximize2 size={16} style={{ marginRight: '8px' }} />
          Enter Fullscreen Mode
        </button>
      </div>
    </div>
  );
}
