import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationsApi, jobsApi } from '../api/client';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import HrProctorReportModal from '../components/HrProctorReportModal';
import toast from 'react-hot-toast';
import {
  Briefcase,
  ChevronLeft,
  Users,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  FileText,
  Clock,
  Sparkles,
  Sliders,
  ChevronRight,
  ShieldCheck,
  X,
  Award,
  Search,
  Filter,
  ArrowUpRight,
  Download,
  Mail,
  Phone,
  GraduationCap,
} from 'lucide-react';

const STATUS_MAP = {
  applied: { label: 'Applied', cls: 'badge-blue' },
  resume_screening: { label: 'Screening', cls: 'badge-yellow' },
  resume_rejected: { label: 'Resume Declined', cls: 'badge-red' },
  voice_round_invited: { label: 'Voice Invited', cls: 'badge-purple' },
  voice_round_in_progress: { label: 'Voice In-Progress', cls: 'badge-yellow' },
  voice_round_passed: { label: 'Voice Qualified', cls: 'badge-green' },
  voice_round_failed: { label: 'Voice Declined', cls: 'badge-red' },
  dsa_round_invited: { label: 'DSA Assessment', cls: 'badge-purple' },
  dsa_round_in_progress: { label: 'DSA In-Progress', cls: 'badge-yellow' },
  dsa_round_passed: { label: 'DSA Qualified', cls: 'badge-green' },
  dsa_round_failed: { label: 'DSA Declined', cls: 'badge-red' },
  hr_round_invited: { label: 'HR Final Invited', cls: 'badge-purple' },
  hr_round_completed: { label: 'HR Evaluated', cls: 'badge-blue' },
  selected: { label: 'Offer Extended', cls: 'badge-green' },
  rejected: { label: 'Archived', cls: 'badge-red' },
};

function StatusBadge({ status }) {
  const item = STATUS_MAP[status] || { label: status || 'Pending', cls: 'badge-gray' };
  return (
    <span className={`badge ${item.cls}`}>
      <span className="badge-dot" />
      <span>{item.label}</span>
    </span>
  );
}

function ScoreBar({ score, cutoff }) {
  const isHigh = score >= cutoff;
  const isMed = score >= cutoff * 0.8;
  const fillClass = isHigh ? 'high' : isMed ? 'medium' : 'low';
  const textColor = isHigh ? 'var(--success-light)' : isMed ? 'var(--warning-light)' : 'var(--danger-light)';

  return (
    <div style={{ minWidth: '90px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
        <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: textColor }}>
          {score != null ? `${score.toFixed(1)}%` : '—'}
        </span>
        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
          min {cutoff}%
        </span>
      </div>
      <div className="score-bar-track">
        <div
          className={`score-bar-fill ${fillClass}`}
          style={{ width: `${Math.min(score || 0, 100)}%` }}
        />
      </div>
    </div>
  );
}

export default function ApplicationsPage() {
  const { jobId } = useParams();
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [hrScoreModal, setHrScoreModal] = useState(null);
  const [hrScore, setHrScore] = useState('');
  const [hrNotes, setHrNotes] = useState('');
  const [proctorReportAppId, setProctorReportAppId] = useState(null);

  useEffect(() => {
    Promise.all([applicationsApi.listForJob(jobId), jobsApi.get(jobId)])
      .then(([appRes, jobRes]) => {
        setApplications(appRes.data || []);
        setJob(jobRes.data);
      })
      .catch(() => toast.error('Failed to load candidate applications'))
      .finally(() => setLoading(false));
  }, [jobId]);

  const submitHrScore = async () => {
    if (!hrScore) {
      toast.error('Please enter an evaluation score');
      return;
    }
    try {
      await applicationsApi.setHrScore(hrScoreModal.id, Number(hrScore), hrNotes);
      toast.success('HR evaluation saved successfully');
      setApplications((p) =>
        p.map((a) =>
          a.id === hrScoreModal.id
            ? { ...a, hr_score: Number(hrScore), status: 'hr_round_completed' }
            : a
        )
      );
      if (selected && selected.id === hrScoreModal.id) {
        setSelected((p) => ({ ...p, hr_score: Number(hrScore), status: 'hr_round_completed' }));
      }
      setHrScoreModal(null);
      setHrScore('');
      setHrNotes('');
    } catch {
      toast.error('Failed to save HR score');
    }
  };

  const finalizeDecision = async (appId, decision) => {
    try {
      await applicationsApi.finalize(appId, decision);
      toast.success(
        decision === 'selected'
          ? 'Candidate selected & offer extended!'
          : 'Candidate status updated to archived'
      );
      setApplications((p) =>
        p.map((a) => (a.id === appId ? { ...a, status: decision } : a))
      );
      if (selected && selected.id === appId) {
        setSelected((p) => ({ ...p, status: decision }));
      }
    } catch {
      toast.error('Failed to finalize decision');
    }
  };

  const copyApplyLink = () => {
    if (job?.apply_link) {
      navigator.clipboard.writeText(job.apply_link);
      toast.success('Job application link copied to clipboard!');
    }
  };

  // Filter applications
  const filtered = applications.filter((app) => {
    const matchesFilter = filter === 'all' || app.status === filter;
    const matchesSearch =
      !searchTerm ||
      app.candidate_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.candidate_email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const resumeCutoff = job?.cutoffs?.resume_score || 65;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Navbar />
      <div className="dashboard-layout">
        <Sidebar active="jobs" />
        <main className="dashboard-content">
          {/* Header */}
          <div style={{ marginBottom: '28px' }} className="fade-in">
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => navigate('/jobs')}
              style={{ marginBottom: '12px', gap: '6px' }}
            >
              <ChevronLeft size={16} />
              <span>Back to Requisitions</span>
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>{job?.title || 'Requisition Candidates'}</h1>
                  <span className={`badge ${job?.is_active ? 'badge-green' : 'badge-gray'}`}>
                    {job?.is_active ? 'Active Requisition' : 'Paused'}
                  </span>
                </div>
                <p style={{ fontSize: '0.875rem' }}>
                  Evaluating applicant pool, competency scores, and interview round decisions.
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button className="btn btn-secondary btn-sm" onClick={copyApplyLink}>
                  <Copy size={14} />
                  <span>Copy Apply Link</span>
                </button>
                {job?.apply_link && (
                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => window.open(job.apply_link, '_blank')}
                  >
                    <span>Public View</span>
                    <ExternalLink size={14} />
                  </button>
                )}
              </div>
            </div>

            {/* Custom Assessment Pipeline Indicator */}
            {job?.pipeline?.length > 0 && (
              <div
                style={{
                  marginTop: '16px',
                  padding: '12px 18px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary-light)', fontSize: '0.8125rem', fontWeight: 700 }}>
                  <ShieldCheck size={16} />
                  <span>Custom Assessment Pipeline ({job.pipeline.length} Stages):</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  {job.pipeline.map((stage, sIdx) => (
                    <div key={stage.id || sIdx} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-full)',
                          background: 'rgba(59, 130, 246, 0.08)',
                          border: '1px solid rgba(59, 130, 246, 0.25)',
                          color: '#93c5fd',
                          fontWeight: 600,
                        }}
                      >
                        {sIdx + 1}. {stage.name}
                      </span>
                      {sIdx < job.pipeline.length - 1 && (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Stats Bar */}
          <div className="stats-grid" style={{ marginBottom: '24px' }}>
            <div className="stat-card" style={{ padding: '16px 20px' }}>
              <div className="stat-label">Total Applicants</div>
              <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '4px' }}>
                {applications.length}
              </div>
            </div>
            <div className="stat-card" style={{ padding: '16px 20px' }}>
              <div className="stat-label">Resume Qualified</div>
              <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--success-light)' }}>
                {applications.filter((a) => (a.resume_score || 0) >= resumeCutoff).length}
              </div>
            </div>
            <div className="stat-card" style={{ padding: '16px 20px' }}>
              <div className="stat-label">In Live Assessment</div>
              <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '4px', color: 'var(--primary-light)' }}>
                {applications.filter((a) => ['voice_round_invited', 'dsa_round_invited', 'hr_round_invited'].includes(a.status)).length}
              </div>
            </div>
            <div className="stat-card" style={{ padding: '16px 20px' }}>
              <div className="stat-label">Offers Extended</div>
              <div className="stat-value" style={{ fontSize: '1.75rem', marginTop: '4px', color: '#10b981' }}>
                {applications.filter((a) => a.status === 'selected').length}
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '20px',
            }}
          >
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 12px',
                width: '100%',
                maxWidth: '320px',
              }}
            >
              <Search size={15} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Search candidate by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.8125rem',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            {/* Stage filter pills */}
            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
              {[
                { id: 'all', label: 'All Candidates' },
                { id: 'applied', label: 'Applied' },
                { id: 'voice_round_invited', label: 'Voice Round' },
                { id: 'dsa_round_invited', label: 'DSA Round' },
                { id: 'hr_round_invited', label: 'HR Final' },
                { id: 'selected', label: 'Offer Extended' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`btn btn-sm ${filter === tab.id ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setFilter(tab.id)}
                  style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner" style={{ width: 44, height: 44 }} />
              <p>Loading candidate roster...</p>
            </div>
          ) : filtered.length > 0 ? (
            <div className="table-wrapper fade-in">
              <table className="table">
                <thead>
                  <tr>
                    <th>Candidate Profile</th>
                    <th>Vetting Score</th>
                    <th>Voice Round</th>
                    <th>DSA Round</th>
                    <th>HR Final</th>
                    <th>Stage Status</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div className="avatar-circle">
                            {app.candidate_name?.[0]?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                              {app.candidate_name}
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {app.candidate_email}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <ScoreBar score={app.resume_score} cutoff={resumeCutoff} />
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: app.voice_score ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {app.voice_score != null ? `${app.voice_score.toFixed(1)}%` : '—'}
                        </span>
                      </td>

                      <td>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: app.dsa_score ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                          {app.dsa_score != null ? `${app.dsa_score.toFixed(1)}%` : '—'}
                        </span>
                      </td>

                      <td>
                        {app.hr_score != null ? (
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {app.hr_score.toFixed(1)}%
                          </span>
                        ) : (
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '2px 8px', fontSize: '0.75rem' }}
                            onClick={() => {
                              setHrScoreModal(app);
                              setHrScore(app.hr_score || '');
                            }}
                          >
                            + Score HR
                          </button>
                        )}
                      </td>

                      <td>
                        <StatusBadge status={app.status} />
                      </td>

                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                          <button
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '4px 10px', fontSize: '0.75rem', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                            onClick={() => setProctorReportAppId(app.id)}
                            title="Inspect proctoring flags and verification evidence"
                          >
                            🛡️ Proctor Report
                          </button>
                          <button
                            className="btn btn-secondary btn-sm"
                            onClick={() => setSelected(app)}
                          >
                            <span>Review Dossier</span>
                            <ChevronRight size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '56px 24px',
                border: '1px dashed var(--border-medium)',
              }}
            >
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--radius-sm)',
                  background: 'rgba(255,255,255,0.04)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  color: 'var(--text-muted)',
                }}
              >
                <Users size={22} />
              </div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>
                No Candidates Match This Filter
              </h3>
              <p style={{ fontSize: '0.875rem', maxWidth: '400px', margin: '0 auto 20px' }}>
                Try switching the status filter tab or share the requisition application link to ingest candidate resumes.
              </p>
              <button className="btn btn-secondary btn-sm" onClick={() => setFilter('all')}>
                Show All Candidates
              </button>
            </div>
          )}

          {/* Candidate Dossier Modal */}
          {selected && (
            <div
              className="modal-overlay"
              onClick={(e) => e.target === e.currentTarget && setSelected(null)}
            >
              <div className="modal" style={{ maxWidth: '720px' }}>
                {/* Header */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    paddingBottom: '16px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div className="avatar-circle" style={{ width: '42px', height: '42px', fontSize: '1rem' }}>
                      {selected.candidate_name?.[0]?.toUpperCase()}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800 }}>{selected.candidate_name}</h2>
                        <StatusBadge status={selected.status} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Mail size={12} /> {selected.candidate_email}
                        </span>
                        {selected.candidate_phone && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Phone size={12} /> {selected.candidate_phone}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>
                    <X size={18} />
                  </button>
                </div>

                {/* Score Summary Grid */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(4, 1fr)',
                    gap: '12px',
                    marginBottom: '24px',
                  }}
                >
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Resume Vetting</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', color: (selected.resume_score || 0) >= resumeCutoff ? 'var(--success-light)' : 'var(--warning-light)' }}>
                      {selected.resume_score != null ? `${selected.resume_score.toFixed(1)}%` : '—'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Voice Round</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>
                      {selected.voice_score != null ? `${selected.voice_score.toFixed(1)}%` : 'Pending'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>Coding (DSA)</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>
                      {selected.dsa_score != null ? `${selected.dsa_score.toFixed(1)}%` : 'Pending'}
                    </div>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-sm)', padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.6875rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600 }}>HR Final</div>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, marginTop: '2px', color: 'var(--text-primary)' }}>
                      {selected.hr_score != null ? `${selected.hr_score.toFixed(1)}%` : 'Unrated'}
                    </div>
                  </div>
                </div>

                {/* Candidate Feedback */}
                {selected.resume_feedback && (
                  <div
                    style={{
                      background: 'rgba(37, 99, 235, 0.06)',
                      border: '1px solid rgba(37, 99, 235, 0.2)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                      marginBottom: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                      <Sparkles size={15} color="var(--primary-light)" />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Competency Screening Assessment:
                      </span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                      {selected.resume_feedback}
                    </p>
                  </div>
                )}

                {/* Skills Matched vs Missing */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success-light)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Verified Competencies ({selected.skills_matched?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selected.skills_matched?.length > 0 ? (
                        selected.skills_matched.map((s) => (
                          <span key={s} className="badge badge-green" style={{ fontSize: '0.6875rem' }}>
                            {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None recorded</span>
                      )}
                    </div>
                  </div>

                  <div style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-sm)', padding: '14px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--warning-light)', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Unverified Skills ({selected.skills_missing?.length || 0})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selected.skills_missing?.length > 0 ? (
                        selected.skills_missing.map((s) => (
                          <span key={s} className="badge badge-yellow" style={{ fontSize: '0.6875rem' }}>
                            {s}
                          </span>
                        ))
                      ) : (
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>None missing</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Profile Skills Matching JD */}
                {selected.profile_skills_matched?.length > 0 && (
                  <div style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-sm)', padding: '14px', marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', textTransform: 'uppercase', marginBottom: '8px' }}>
                      Profile Skills Verified Against JD ({selected.profile_skills_matched.length})
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                      {selected.profile_skills_matched.map((ps) => (
                        <span key={ps} className="badge badge-blue" style={{ fontSize: '0.6875rem' }}>
                          ★ {ps}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Resume Download Link if available */}
                {selected.resume_url && (
                  <div style={{ marginBottom: '24px' }}>
                    <a
                      href={`http://localhost:8000${selected.resume_url}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-secondary btn-sm"
                      style={{ gap: '6px' }}
                    >
                      <Download size={14} />
                      <span>Download Uploaded Resume</span>
                      <ExternalLink size={12} />
                    </a>
                  </div>
                )}

                {/* Footer Decision Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    paddingTop: '20px',
                    borderTop: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      className="btn btn-secondary btn-sm"
                      onClick={() => {
                        setHrScoreModal(selected);
                        setHrScore(selected.hr_score || '');
                      }}
                    >
                      <span>Record HR Interview Score</span>
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      style={{ padding: '6px 12px', fontSize: '0.8125rem', color: '#818cf8', border: '1px solid rgba(99,102,241,0.2)' }}
                      onClick={() => setProctorReportAppId(selected.id)}
                    >
                      🛡️ Proctor Report
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => finalizeDecision(selected.id, 'rejected')}
                      disabled={selected.status === 'rejected'}
                    >
                      <XCircle size={15} />
                      <span>Archive Candidate</span>
                    </button>

                    <button
                      className="btn btn-success btn-sm"
                      onClick={() => finalizeDecision(selected.id, 'selected')}
                      disabled={selected.status === 'selected'}
                    >
                      <CheckCircle2 size={15} />
                      <span>Extend Formal Offer</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* HR Score Input Modal */}
          {hrScoreModal && (
            <div
              className="modal-overlay"
              onClick={(e) => e.target === e.currentTarget && setHrScoreModal(null)}
            >
              <div className="modal" style={{ maxWidth: '480px' }}>
                <div style={{ marginBottom: '18px' }}>
                  <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
                    HR Round Evaluation
                  </h3>
                  <p style={{ fontSize: '0.8125rem' }}>
                    Candidate: <strong>{hrScoreModal.candidate_name}</strong>
                  </p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div className="form-group">
                    <label className="label">Evaluation Score (0 - 100) *</label>
                    <input
                      className="input"
                      type="number"
                      min="0"
                      max="100"
                      placeholder="e.g. 85"
                      value={hrScore}
                      onChange={(e) => setHrScore(e.target.value)}
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">HR Notes & Culture Fit Observations</label>
                    <textarea
                      className="textarea"
                      placeholder="Enter leadership observations, communication feedback, compensation alignment..."
                      value={hrNotes}
                      onChange={(e) => setHrNotes(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setHrScoreModal(null)}
                    >
                      Cancel
                    </button>
                    <button className="btn btn-primary" onClick={submitHrScore}>
                      Save Evaluation
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Proctoring & Security Audit Modal */}
          {proctorReportAppId && (
            <HrProctorReportModal
              applicationId={proctorReportAppId}
              onClose={() => setProctorReportAppId(null)}
            />
          )}
        </main>
      </div>
    </div>
  );
}
