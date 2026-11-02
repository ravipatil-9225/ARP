import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  X,
  Eye,
  Clock,
  Monitor,
  Info,
} from 'lucide-react';
import { proctorApi } from '../api/client';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export default function HrProctorReportModal({ applicationId, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'high_critical'
  const [activeSnapshotUrl, setActiveSnapshotUrl] = useState(null);

  useEffect(() => {
    async function fetchReport() {
      if (!applicationId) return;
      try {
        setLoading(true);
        setError(null);
        const res = await proctorApi.getReport(applicationId);
        setReport(res.data);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load proctoring report');
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [applicationId]);

  if (!applicationId) return null;

  const getTierColor = (level) => {
    switch (level) {
      case 'low':
        return { text: 'var(--success-light)', bg: 'var(--success-subtle)', border: 'var(--success)' };
      case 'medium':
        return { text: 'var(--warning-light)', bg: 'var(--warning-subtle)', border: 'var(--warning)' };
      case 'high':
        return { text: 'var(--warning-light)', bg: 'rgba(249, 115, 22, 0.15)', border: '#f97316' };
      case 'critical':
        return { text: 'var(--danger-light)', bg: 'var(--danger-subtle)', border: 'var(--danger)' };
      default:
        return { text: 'var(--text-muted)', bg: 'rgba(255,255,255,0.04)', border: 'var(--border-subtle)' };
    }
  };

  const filteredEvents = (report?.events || []).filter((ev) => {
    if (severityFilter === 'high_critical') {
      return ev.severity === 'high' || ev.severity === 'critical';
    }
    return true;
  });

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ maxWidth: '840px', padding: 0, overflow: 'hidden' }}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px',
            borderBottom: '1px solid var(--border-subtle)',
            background: 'rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'var(--indigo-subtle)',
                border: '1px solid var(--border-medium)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--indigo-light)',
              }}
            >
              <Shield size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Proctoring & Assessment Integrity Report
              </h2>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Candidate: {report?.candidate_name || 'Candidate'} • Session: {report?.session_type?.toUpperCase()}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm"
            style={{ padding: '6px', color: 'var(--text-muted)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div style={{ padding: '24px', maxHeight: 'calc(90vh - 80px)', overflowY: 'auto' }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-muted)' }}>
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  border: '2px solid var(--primary)',
                  borderTopColor: 'transparent',
                  borderRadius: '50%',
                  margin: '0 auto 12px',
                  animation: 'spin 0.8s linear infinite',
                }}
              />
              <span>Loading proctoring logs & evidence...</span>
            </div>
          )}

          {error && (
            <div
              style={{
                textAlign: 'center',
                padding: '32px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <AlertTriangle size={36} color="var(--warning)" style={{ margin: '0 auto 8px' }} />
              <p style={{ fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 4px' }}>{error}</p>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', margin: 0 }}>
                No proctoring session document was recorded for this candidate.
              </p>
            </div>
          )}

          {report && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Mandatory Notice Banner */}
              <div
                style={{
                  background: 'var(--warning-subtle)',
                  border: '1px solid var(--warning)',
                  borderRadius: 'var(--radius-md)',
                  padding: '14px 16px',
                  fontSize: '0.8125rem',
                  color: 'var(--warning-light)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  lineHeight: 1.5,
                }}
              >
                <Info size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                <div>
                  <strong>Auditor Notice:</strong> Automated signals are indicators for human review, not proof of misconduct.
                  Browser-side checks can be bypassed by a determined candidate.
                  Recruiters must make the final decision; risk scores do not represent an automated rejection.
                </div>
              </div>

              {/* Summary Cards */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                {/* Risk Score */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: getTierColor(report.risk_level).bg,
                    border: `1px solid ${getTierColor(report.risk_level).border}`,
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Server Risk Score
                  </span>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                    <span style={{ fontSize: '1.8rem', fontWeight: 900, color: getTierColor(report.risk_level).text }}>
                      {report.risk_score}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>/ 100</span>
                  </div>
                  <span
                    style={{
                      display: 'inline-block',
                      marginTop: '8px',
                      fontSize: '0.6875rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'rgba(0,0,0,0.2)',
                      color: getTierColor(report.risk_level).text,
                    }}
                  >
                    {report.risk_level} Risk
                  </span>
                </div>

                {/* Total Events */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Total Flags
                  </span>
                  <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--text-primary)' }}>
                    {report.total_events || 0}
                  </span>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', margin: '8px 0 0' }}>
                    Webcam + Browser events
                  </p>
                </div>

                {/* Hardware */}
                <div
                  style={{
                    padding: '16px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Monitor Status
                  </span>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Monitor size={14} color="var(--text-muted)" />
                    <span>{report.monitor_check?.status || 'ok'}</span>
                  </div>
                </div>
              </div>

              {/* Timeline Table */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h3 style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Clock size={16} color="var(--indigo-light)" />
                    Chronological Flag Timeline ({filteredEvents.length} events)
                  </h3>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => setSeverityFilter('all')}
                      className={`btn btn-sm ${severityFilter === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      All Events
                    </button>
                    <button
                      onClick={() => setSeverityFilter('high_critical')}
                      className={`btn btn-sm ${severityFilter === 'high_critical' ? 'btn-danger' : 'btn-secondary'}`}
                      style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    >
                      High & Critical Only
                    </button>
                  </div>
                </div>

                {filteredEvents.length === 0 ? (
                  <div style={{ padding: '32px', textAlign: 'center', background: 'rgba(255, 255, 255, 0.02)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                    <ShieldCheck size={28} color="var(--success-light)" style={{ margin: '0 auto 8px' }} />
                    <p style={{ margin: 0 }}>No proctoring violations recorded in this view.</p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                      <thead style={{ background: '#040711', color: 'var(--text-muted)', textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' }}>
                        <tr>
                          <th style={{ padding: '10px 14px' }}>Time</th>
                          <th style={{ padding: '10px 14px' }}>Event Type</th>
                          <th style={{ padding: '10px 14px' }}>Severity</th>
                          <th style={{ padding: '10px 14px' }}>Detail</th>
                          <th style={{ padding: '10px 14px' }}>Evidence</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredEvents.map((ev, idx) => (
                          <tr key={idx} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                            <td style={{ padding: '10px 14px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                              {ev.occurred_at ? new Date(ev.occurred_at).toLocaleTimeString() : '—'}
                            </td>
                            <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                              {ev.event_type}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              <span
                                style={{
                                  display: 'inline-block',
                                  padding: '2px 8px',
                                  borderRadius: 'var(--radius-full)',
                                  fontSize: '0.6875rem',
                                  fontWeight: 800,
                                  textTransform: 'uppercase',
                                  background: getTierColor(ev.severity).bg,
                                  color: getTierColor(ev.severity).text,
                                  border: `1px solid ${getTierColor(ev.severity).border}`,
                                }}
                              >
                                {ev.severity}
                              </span>
                            </td>
                            <td style={{ padding: '10px 14px', color: 'var(--text-secondary)', maxWidth: '280px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {ev.detail || '—'}
                            </td>
                            <td style={{ padding: '10px 14px' }}>
                              {ev.snapshot_url ? (
                                <button
                                  onClick={() => setActiveSnapshotUrl(`${API_URL}${ev.snapshot_url}`)}
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '2px 8px', fontSize: '0.75rem', color: 'var(--indigo-light)' }}
                                >
                                  <Eye size={13} style={{ marginRight: '4px' }} />
                                  <span>View</span>
                                </button>
                              ) : (
                                <span style={{ color: 'var(--text-disabled)' }}>—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fullscreen Snapshot Enlarge Modal */}
      {activeSnapshotUrl && (
        <div
          className="modal-overlay"
          style={{ zIndex: 10000, background: 'rgba(0,0,0,0.92)' }}
          onClick={() => setActiveSnapshotUrl(null)}
        >
          <div style={{ position: 'relative', maxWidth: '720px', width: '100%', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border-medium)' }}>
            <button
              onClick={() => setActiveSnapshotUrl(null)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'rgba(0,0,0,0.7)',
                border: 'none',
                color: 'white',
                borderRadius: '50%',
                padding: '6px',
                cursor: 'pointer',
              }}
            >
              <X size={18} />
            </button>
            <img src={activeSnapshotUrl} alt="Violation Evidence" style={{ width: '100%', height: 'auto', display: 'block' }} />
          </div>
        </div>
      )}
    </div>
  );
}
