import { useState } from 'react';
import toast from 'react-hot-toast';
import { hrApi } from '../api/client';
import { Calendar, Clock, Video, X, Sparkles, User, Link2 } from 'lucide-react';

export default function SingleScheduleModal({ candidate, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);

  // Default to tomorrow 10:00 AM
  const defaultStartTime = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(10, 0, 0, 0);
    const offset = d.getTimezoneOffset() * 60000;
    return new Date(d.getTime() - offset).toISOString().slice(0, 16);
  })();

  const [scheduledTime, setScheduledTime] = useState(defaultStartTime);
  const [durationMinutes, setDurationMinutes] = useState(30);
  const [platform, setPlatform] = useState('google_meet');
  const [customLink, setCustomLink] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        application_id: candidate.application_id,
        scheduled_time: scheduledTime,
        duration_minutes: Number(durationMinutes),
        meeting_platform: platform,
        custom_meeting_link: customLink || undefined,
        notes,
      };

      const res = await hrApi.singleSchedule(payload);
      toast.success(res.data.message || 'Interview scheduled successfully!');
      onSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to schedule interview');
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
          maxWidth: '540px',
          padding: '30px',
          position: 'relative',
          boxShadow: 'var(--shadow-xl)',
          border: '1px solid var(--border-medium)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
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

        <div style={{ marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--primary-subtle)',
                color: 'var(--primary-light)',
                fontSize: '11px',
                fontWeight: 700,
              }}
            >
              1-on-1 Scheduling
            </span>
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
            Schedule {candidate.candidate_name}
          </h2>
          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
            Role: <strong>{candidate.job_title}</strong> • DSA Score: <strong>{candidate.dsa_score}%</strong>
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="form-group">
            <label className="label">
              <Calendar size={13} style={{ display: 'inline', marginRight: '4px' }} />
              Interview Date & Start Time
            </label>
            <input
              className="input"
              type="datetime-local"
              value={scheduledTime}
              onChange={(e) => setScheduledTime(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="label">
                <Clock size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Duration
              </label>
              <select
                className="input"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
              >
                <option value={15}>15 Minutes</option>
                <option value={20}>20 Minutes</option>
                <option value={30}>30 Minutes</option>
                <option value={45}>45 Minutes</option>
                <option value={60}>60 Minutes</option>
              </select>
            </div>

            <div className="form-group">
              <label className="label">
                <Video size={13} style={{ display: 'inline', marginRight: '4px' }} />
                Platform
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
          </div>

          <div className="form-group">
            <label className="label">Custom Meeting Link (Optional)</label>
            <input
              className="input"
              placeholder="Leave blank to auto-generate secure meeting room"
              value={customLink}
              onChange={(e) => setCustomLink(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="label">Instructions / Notes for Candidate (Optional)</label>
            <input
              className="input"
              placeholder="e.g. Please have your code repository and resume ready."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ gap: '6px' }}>
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Sparkles size={15} />
                  <span>Confirm Schedule</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
