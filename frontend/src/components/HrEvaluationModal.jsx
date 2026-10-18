import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { hrApi } from '../api/client';
import {
  Award, CheckCircle2, XCircle, Star, Sparkles, FileText,
  Mic, Code, User, X, AlertCircle, Save
} from 'lucide-react';

export default function HrEvaluationModal({ candidate, onClose, onSuccess }) {
  const [dossier, setDossier] = useState(null);
  const [loadingDossier, setLoadingDossier] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    communication_score: 80,
    cultural_fit_score: 85,
    domain_score: 80,
    overall_hr_score: 82,
    notes: '',
    decision: 'selected', // 'selected' | 'rejected'
  });

  useEffect(() => {
    if (candidate?.application_id) {
      fetchDossier(candidate.application_id);
    }
  }, [candidate]);

  const fetchDossier = async (appId) => {
    setLoadingDossier(true);
    try {
      const res = await hrApi.getSummary(appId);
      setDossier(res.data);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load candidate dossier');
    } finally {
      setLoadingDossier(false);
    }
  };

  const resumeScore = candidate?.resume_score || 0;
  const voiceScore = candidate?.voice_score || 0;
  const dsaScore = candidate?.dsa_score || 0;
  const hrScore = Number(form.overall_hr_score) || 0;

  // Composite Formula: Resume 20%, Voice 30%, DSA 30%, HR 20%
  const compositeScore = Math.round(
    (resumeScore * 0.20) + (voiceScore * 0.30) + (dsaScore * 0.30) + (hrScore * 0.20)
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const payload = {
        communication_score: Number(form.communication_score),
        cultural_fit_score: Number(form.cultural_fit_score),
        domain_score: Number(form.domain_score),
        overall_hr_score: Number(form.overall_hr_score),
        notes: form.notes,
        decision: form.decision,
      };

      const res = await hrApi.evaluate(candidate.application_id, payload);
      toast.success(res.data.message || 'Evaluation submitted successfully!');
      onSuccess(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit evaluation');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.8)',
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
          maxWidth: '960px',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '32px',
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

        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span
              style={{
                padding: '3px 10px',
                borderRadius: 'var(--radius-full)',
                background: 'var(--indigo-subtle)',
                color: 'var(--indigo-light)',
                fontSize: '12px',
                fontWeight: 700,
              }}
            >
              Final HR Round Evaluation
            </span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Application ID: {candidate.application_id?.slice(-8)}
            </span>
          </div>
          <h2 style={{ fontSize: '1.6rem', fontWeight: 800 }}>
            {candidate.candidate_name}
          </h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Review candidate multi-round audit trail, assign HR rubric ratings, and make the final offer decision.
          </p>
        </div>

        {/* 2-Column Split View */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.1fr', gap: '24px', alignItems: 'start' }}>
          {/* Left Column: Multi-round Audit Dossier */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              Candidate Audit Dossier
            </h3>

            {/* Score Cards Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Resume Vetting</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-light)' }}>
                  {resumeScore}%
                </div>
              </div>

              <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Voice AI Round</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#38bdf8' }}>
                  {voiceScore ? `${Math.round(voiceScore)}%` : 'N/A'}
                </div>
              </div>

              <div style={{ background: 'rgba(16, 185, 129, 0.08)', padding: '12px', borderRadius: '10px', textAlign: 'center', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--success-light)' }}>DSA Assessment</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--success-light)' }}>
                  {dsaScore ? `${Math.round(dsaScore)}%` : 'N/A'}
                </div>
              </div>
            </div>

            {/* Resume Details Box */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <FileText size={16} color="var(--primary-light)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>Resume Feedback & Skills</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
                {candidate.resume_feedback || 'Resume passed initial vetting against role requirements.'}
              </p>
              {candidate.skills_matched?.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {candidate.skills_matched.slice(0, 6).map((s) => (
                    <span key={s} style={{ fontSize: '0.75rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--success-light)' }}>
                      ✓ {s}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* DSA Assessment Details Box */}
            <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <Code size={16} color="var(--success-light)" />
                <span style={{ fontSize: '0.8125rem', fontWeight: 700 }}>DSA Coding Performance</span>
              </div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                Candidate successfully cleared the algorithmic coding assessment with a score of <strong>{candidate.dsa_score || 0}%</strong>.
              </p>
            </div>
          </div>

          {/* Right Column: HR Evaluation Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <h3 style={{ fontSize: '0.9375rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)' }}>
              HR Scorecard & Decision
            </h3>

            {/* Communication Score */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="label" style={{ margin: 0 }}>Communication & Articulation</label>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                  {form.communication_score}/100
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={form.communication_score}
                onChange={(e) => setForm((p) => ({ ...p, communication_score: e.target.value }))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Cultural Fit */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="label" style={{ margin: 0 }}>Culture & Team Collaboration Fit</label>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                  {form.cultural_fit_score}/100
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={form.cultural_fit_score}
                onChange={(e) => setForm((p) => ({ ...p, cultural_fit_score: e.target.value }))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Domain & Problem Solving */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="label" style={{ margin: 0 }}>Domain Depth & Problem Solving</label>
                <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--primary-light)' }}>
                  {form.domain_score}/100
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={form.domain_score}
                onChange={(e) => setForm((p) => ({ ...p, domain_score: e.target.value }))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>

            {/* Overall HR Score */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                <label className="label" style={{ margin: 0 }}>Overall HR Score</label>
                <span style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--success-light)' }}>
                  {form.overall_hr_score}/100
                </span>
              </div>
              <input
                className="input"
                type="number"
                min="0"
                max="100"
                value={form.overall_hr_score}
                onChange={(e) => setForm((p) => ({ ...p, overall_hr_score: e.target.value }))}
                required
              />
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="label">Evaluation Notes & Qualitative Feedback</label>
              <textarea
                className="input"
                rows={3}
                placeholder="Candidate demonstrated great clarity on distributed systems and showed high enthusiasm for our engineering culture..."
                value={form.notes}
                onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              />
            </div>

            {/* Composite Final Score Banner */}
            <div style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15) 0%, rgba(16, 185, 129, 0.15) 100%)', padding: '14px 18px', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>4-Round Final Composite Score</div>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success-light)' }}>
                  {compositeScore}%
                </div>
              </div>
              <div style={{ textAlign: 'right', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Resume 20% • Voice 30%<br />DSA 30% • HR 20%
              </div>
            </div>

            {/* Decision Radio Selector */}
            <div className="form-group">
              <label className="label">Final Decision</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, decision: 'selected' }))}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: form.decision === 'selected' ? '2px solid var(--success)' : '1px solid var(--border-subtle)',
                    background: form.decision === 'selected' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: form.decision === 'selected' ? 'var(--success-light)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Extend Offer (Select)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, decision: 'rejected' }))}
                  style={{
                    padding: '12px',
                    borderRadius: '8px',
                    border: form.decision === 'rejected' ? '2px solid var(--danger)' : '1px solid var(--border-subtle)',
                    background: form.decision === 'rejected' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                    color: form.decision === 'rejected' ? 'var(--danger-light)' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                  }}
                >
                  <XCircle size={16} />
                  <span>Reject</span>
                </button>
              </div>
            </div>

            {/* Submit Action */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '10px' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={submitting}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting} style={{ gap: '8px' }}>
                {submitting ? (
                  <>
                    <span className="spinner" />
                    <span>Finalizing Decision...</span>
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    <span>Submit & Notify Candidate</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
