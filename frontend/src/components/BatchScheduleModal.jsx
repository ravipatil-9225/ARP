import { useState, useMemo } from 'react';
import toast from 'react-hot-toast';
import { hrApi } from '../api/client';
import {
  Calendar, Clock, Video, Users, Coffee, Sparkles, CheckCircle2,
  X, AlertCircle, ArrowRight, ShieldCheck, Mail
} from 'lucide-react';

export default function BatchScheduleModal({ selectedCandidates, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('sequential'); // 'sequential' | 'group'

  // Default to tomorrow 10:00 AM in local time string (YYYY-MM-DDTHH:mm)
  const defaultStartTime = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  }, []);

  const [startTime, setStartTime] = useState(defaultStartTime);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [gapMinutes, setGapMinutes] = useState(10);
  const [platform, setPlatform] = useState('google_meet');
  const [notes, setNotes] = useState('');

  // Dynamically compute the timetable preview
  const timetablePreview = useMemo(() => {
    if (!startTime || !selectedCandidates.length) return [];
    const base = new Date(startTime);
    if (isNaN(base.getTime())) return [];

    return selectedCandidates.map((cand, idx) => {
      let slotStart, slotEnd;
      if (mode === 'sequential') {
        const startOffsetMins = idx * (durationMinutes + gapMinutes);
        slotStart = new Date(base.getTime() + startOffsetMins * 60000);
        slotEnd = new Date(slotStart.getTime() + durationMinutes * 60000);
      } else {
        slotStart = new Date(base.getTime());
        slotEnd = new Date(base.getTime() + durationMinutes * 60000);
      }

      const formatTime = (d) =>
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      return {
        ...cand,
        startFormatted: formatTime(slotStart),
        endFormatted: formatTime(slotEnd),
        dateFormatted: slotStart.toLocaleDateString([], {
          month: 'short',
          day: 'numeric',
          weekday: 'short',
        }),
      };
    });
  }, [selectedCandidates, startTime, durationMinutes, gapMinutes, mode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCandidates.length) {
      toast.error('No candidates selected');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        application_ids: selectedCandidates.map((c) => c.application_id),
        start_time: startTime,
        duration_minutes: Number(durationMinutes),
        gap_minutes: mode === 'sequential' ? Number(gapMinutes) : 0,
        meeting_platform: platform,
        mode,
        notes,
      };

      const res = await hrApi.batchSchedule(payload);
      toast.success(res.data.message || 'Interviews scheduled & invites sent!');
      onSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to schedule interviews');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
      }}
      onClick={onClose}
    >
      <div
        className="card"
        style={{
          width: '100%',
          maxWidth: '780px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '32px',
          position: 'relative',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-medium)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            right: '20px',
            top: '20px',
            background: 'none',
            border: 'none',
            color: 'var(--text-muted)',
            cursor: 'pointer',
          }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-subtle)',
                color: 'var(--primary-light)',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Batch Scheduling Engine
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              {selectedCandidates.length} Candidates Selected
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            Schedule Final HR Interviews
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Automatically calculate non-overlapping interview slots with buffer breaks or coordinate a group discussion.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Mode Selector */}
          <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-subtle)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button
              type="button"
              onClick={() => setMode('sequential')}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'sequential' ? 'var(--primary)' : 'transparent',
                color: mode === 'sequential' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <Clock size={16} />
              <span>One-by-One with Buffer Gaps</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('group')}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'group' ? 'var(--primary)' : 'transparent',
                color: mode === 'group' ? '#fff' : 'var(--text-secondary)',
                fontWeight: 600,
                fontSize: '0.875rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <Users size={16} />
              <span>Group Call (All at Once)</span>
            </button>
          </div>

          {/* Form Fields Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="label">
                <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Initial Start Date & Time
              </label>
              <input
                className="input"
                type="datetime-local"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">
                <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Duration per Slot
              </label>
              <select
                className="input"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes (Standard)</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            {mode === 'sequential' ? (
              <div className="form-group">
                <label className="label">
                  <Coffee size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Buffer Gap Between
                </label>
                <select
                  className="input"
                  value={gapMinutes}
                  onChange={(e) => setGapMinutes(Number(e.target.value))}
                >
                  <option value={0}>0 Minutes (No break)</option>
                  <option value={5}>5 Minutes Break</option>
                  <option value={10}>10 Minutes Break</option>
                  <option value={15}>15 Minutes Break</option>
                  <option value={20}>20 Minutes Break</option>
                </select>
              </div>
            ) : (
              <div className="form-group">
                <label className="label">
                  <Video size={13} style={{ display: 'inline', marginRight: '4px' }} />
                  Meeting Platform
                </label>
                <select
                  className="input"
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value)}
                >
                  <option value="google_meet">Google Meet</option>
                  <option value="microsoft_teams">Microsoft Teams</option>
                </select>
              </div>
            )}
          </div>

          {mode === 'sequential' && (
            <div className="form-group">
              <label className="label">
                <Video size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Video Conferencing Platform
              </label>
              <select
                className="input"
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
              >
                <option value="google_meet">Google Meet (Auto-generated distinct rooms)</option>
                <option value="microsoft_teams">Microsoft Teams</option>
              </select>
            </div>
          )}

          {/* Timetable Preview Box */}
          <div style={{ background: 'rgba(0, 0, 0, 0.25)', borderRadius: '12px', border: '1px solid var(--border-subtle)', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                🗓️ Calculated Schedule Preview ({selectedCandidates.length} Slots)
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {mode === 'sequential' ? `+${gapMinutes}m break between candidates` : 'All candidates in one session'}
              </span>
            </div>

            <div style={{ maxHeight: '180px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {timetablePreview.map((item, idx) => (
                <div
                  key={item.application_id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.04)',
                    fontSize: '0.8125rem',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ width: '22px', height: '22px', borderRadius: '50%', background: 'var(--primary-subtle)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 700 }}>
                      {idx + 1}
                    </span>
                    <span style={{ fontWeight: 600 }}>{item.candidate_name}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>({item.job_title})</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: 'var(--success-light)', fontWeight: 600 }}>
                      DSA: {Math.round(item.dsa_score || 0)}%
                    </span>
                    <span style={{ background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                      {item.startFormatted} – {item.endFormatted}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes / Special Instructions */}
          <div className="form-group">
            <label className="label">HR Interview Instructions (Optional)</label>
            <input
              className="input"
              placeholder="e.g. Please be ready with your final year project presentation and system design notes."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ gap: '8px', minWidth: '180px' }}>
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Scheduling & Notifying...</span>
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  <span>Confirm & Dispatch Invites</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
