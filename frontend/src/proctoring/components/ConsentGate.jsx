import React, { useState } from 'react';
import { Shield, AlertCircle, CheckCircle } from 'lucide-react';
import { proctorApi } from '../../api/client';

export default function ConsentGate({ applicationId, onConsentAccepted }) {
  const [agreed, setAgreed] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async () => {
    if (!agreed) return;
    try {
      setSubmitting(true);
      setError(null);
      await proctorApi.recordConsent(applicationId, { version: 'v1' });
      onConsentAccepted();
    } catch (err) {
      setError('Failed to record consent. Please check your network and retry.');
    } finally {
      setSubmitting(false);
    }
  };

  if (declined) {
    return (
      <div className="modal-overlay" style={{ zIndex: 9999 }}>
        <div className="modal" style={{ maxWidth: '480px', textAlign: 'center' }}>
          <AlertCircle size={48} color="var(--warning)" style={{ margin: '0 auto 16px' }} />
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Automated Proctoring Declined
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, marginBottom: '24px' }}>
            Without consent for video and audio monitoring, automated evaluation cannot proceed.
            You may request an HR-supervised manual proctoring session instead.
          </p>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              marginBottom: '24px',
              textAlign: 'left',
              fontSize: '0.8125rem',
              color: 'var(--text-secondary)',
            }}
          >
            <p style={{ margin: '0 0 6px' }}><strong style={{ color: 'var(--text-primary)' }}>HR Contact:</strong> support@prismhire.ai</p>
            <p style={{ margin: 0 }}><strong style={{ color: 'var(--text-primary)' }}>Application ID:</strong> {applicationId}</p>
          </div>
          <button
            onClick={() => setDeclined(false)}
            className="btn btn-primary"
            style={{ width: '100%', justifyContent: 'center' }}
          >
            Review Consent Terms Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: '560px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <div
            style={{
              width: '44px',
              height: '44px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--indigo-subtle)',
              border: '1px solid var(--border-medium)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--indigo-light)',
            }}
          >
            <Shield size={24} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
              Assessment Integrity & Privacy Notice
            </h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
              Digital Personal Data Protection (DPDP) Compliance
            </p>
          </div>
        </div>

        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            fontSize: '0.875rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            marginBottom: '20px',
          }}
        >
          <p style={{ margin: '0 0 10px', color: 'var(--text-primary)' }}>
            PrismHire monitors your assessment session to ensure fairness and assessment integrity.
          </p>
          <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
            <li style={{ marginBottom: '4px' }}>
              <strong>Tier 1 — Webcam Basics:</strong> Real-time on-device face presence, multiple faces, gaze/head pose, and object detection (phone, book).
            </li>
            <li style={{ marginBottom: '4px' }}>
              <strong>Tier 3 — Browser Lockdown:</strong> Fullscreen enforcement, tab switch & window blur logging, DevTools detection, and secondary monitor check.
            </li>
            <li>
              <strong>Evidence Retention:</strong> Snapshot evidence clips are automatically purged after 60 days.
            </li>
          </ul>
        </div>

        {error && (
          <div
            style={{
              padding: '12px',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-subtle)',
              border: '1px solid var(--danger)',
              color: 'var(--danger-light)',
              fontSize: '0.8125rem',
              marginBottom: '16px',
            }}
          >
            {error}
          </div>
        )}

        <label
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
            cursor: 'pointer',
            userSelect: 'none',
            marginBottom: '24px',
          }}
        >
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            style={{ marginTop: '4px', width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            I understand and give consent for automated video, audio, and browser proctoring for the duration of this assessment.
          </span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px' }}>
          <button
            type="button"
            onClick={() => setDeclined(true)}
            className="btn btn-secondary"
            style={{ padding: '8px 18px', fontSize: '0.875rem' }}
          >
            Decline
          </button>
          <button
            type="button"
            disabled={!agreed || submitting}
            onClick={handleSubmit}
            className="btn btn-primary"
            style={{
              padding: '8px 22px',
              fontSize: '0.875rem',
              opacity: agreed && !submitting ? 1 : 0.5,
              cursor: agreed && !submitting ? 'pointer' : 'not-allowed',
            }}
          >
            {submitting ? 'Starting...' : 'Accept & Start Assessment'}
            <CheckCircle size={16} style={{ marginLeft: '6px' }} />
          </button>
        </div>
      </div>
    </div>
  );
}
