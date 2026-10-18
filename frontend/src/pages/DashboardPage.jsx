import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { analyticsApi } from '../api/client';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import {
  Briefcase,
  Users,
  Award,
  TrendingUp,
  Plus,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Building2,
  FileText,
  Clock,
  Sparkles,
  ArrowUpRight,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, subtext, colorClass }) {
  return (
    <div className="stat-card">
      <div className="stat-header">
        <span className="stat-label">{label}</span>
        <div className={`stat-icon-frame ${colorClass}`}>
          <Icon size={20} strokeWidth={2.2} />
        </div>
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-trend">
        <ArrowUpRight size={13} />
        <span>{subtext}</span>
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    applied: { cls: 'badge-blue', label: 'Applied' },
    resume_screening: { cls: 'badge-yellow', label: 'Screening' },
    resume_rejected: { cls: 'badge-red', label: 'Resume Declined' },
    voice_round_invited: { cls: 'badge-purple', label: 'Voice Invited' },
    voice_round_in_progress: { cls: 'badge-yellow', label: 'Voice In-Progress' },
    voice_round_passed: { cls: 'badge-green', label: 'Voice Qualified' },
    voice_round_failed: { cls: 'badge-red', label: 'Voice Declined' },
    dsa_round_invited: { cls: 'badge-purple', label: 'DSA Assessment' },
    dsa_round_in_progress: { cls: 'badge-yellow', label: 'DSA In-Progress' },
    dsa_round_passed: { cls: 'badge-green', label: 'DSA Qualified' },
    dsa_round_failed: { cls: 'badge-red', label: 'DSA Declined' },
    hr_round_invited: { cls: 'badge-purple', label: 'HR Final Invited' },
    hr_round_completed: { cls: 'badge-blue', label: 'HR Evaluated' },
    selected: { cls: 'badge-green', label: 'Offer Extended' },
    rejected: { cls: 'badge-red', label: 'Archived' },
  };

  const { cls, label } = map[status] || { cls: 'badge-gray', label: status || 'Pending' };

  return (
    <span className={`badge ${cls}`}>
      <span className="badge-dot" />
      <span>{label}</span>
    </span>
  );
}

export default function DashboardPage() {
  const { company } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    try {
      const res = await analyticsApi.dashboard();
      setStats(res.data);
    } catch {
      // Keep existing data on background refresh error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    // Real-time synchronization polling every 4 seconds
    const interval = setInterval(fetchStats, 4000);
    return () => clearInterval(interval);
  }, []);

  const pipelineStages = [
    { key: 'stage_1_applied', label: '1. Applications Ingested', color: '#3b82f6' },
    { key: 'stage_2_voice', label: '2. Voice Assessment', color: '#8b5cf6' },
    { key: 'stage_3_dsa', label: '3. Technical Coding (DSA)', color: '#6366f1' },
    { key: 'stage_4_hr', label: '4. Executive HR Interview', color: '#0ea5e9' },
    { key: 'stage_5_selected', label: '5. Selected & Offer Stage', color: '#10b981' },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Navbar />
      <div className="dashboard-layout">
        <Sidebar active="dashboard" />
        <main className="dashboard-content">
          {/* Executive Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '32px',
            }}
            className="fade-in"
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>
                  Recruitment Overview
                </h1>
                <span className="brand-tag">Enterprise Hub</span>
              </div>
              <p style={{ fontSize: '0.875rem' }}>
                Real-time talent metrics and applicant pipelines for{' '}
                <strong style={{ color: 'var(--text-primary)' }}>{company?.name}</strong>.
              </p>
            </div>

            {/* Quick Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/careers')}
              >
                <span>Live Career Board</span>
                <ExternalLink size={14} />
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate('/jobs')}
              >
                <Plus size={16} />
                <span>Create Requisition</span>
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading-overlay">
              <div className="spinner" style={{ width: 44, height: 44 }} />
              <p>Loading talent metrics...</p>
            </div>
          ) : (
            <>
              {/* Executive KPI Stats */}
              <div className="stats-grid fade-in">
                <StatCard
                  icon={Briefcase}
                  label="Active Requisitions"
                  value={stats?.active_jobs ?? 0}
                  subtext={`${stats?.total_jobs ?? 0} total posted`}
                  colorClass="blue"
                />
                <StatCard
                  icon={Users}
                  label="Total Applicants"
                  value={stats?.total_applications ?? 0}
                  subtext="Ingested candidates"
                  colorClass="indigo"
                />
                <StatCard
                  icon={TrendingUp}
                  label="In Assessment"
                  value={
                    (stats?.pipeline?.voice_round_invited || 0) +
                    (stats?.pipeline?.dsa_round_invited || 0) +
                    (stats?.pipeline?.hr_round_invited || 0)
                  }
                  subtext="Active pipeline"
                  colorClass="yellow"
                />
                <StatCard
                  icon={Award}
                  label="Offers Extended"
                  value={stats?.pipeline?.selected ?? 0}
                  subtext="Qualified hires"
                  colorClass="green"
                />
              </div>

              {/* Main Dual Grid */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'minmax(0, 1.8fr) minmax(0, 1.2fr)',
                  gap: '24px',
                }}
              >
                {/* Recent Candidates */}
                <div>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '16px',
                    }}
                  >
                    <div>
                      <h2 style={{ fontSize: '1.125rem' }}>Recent Candidate Activity</h2>
                      <p style={{ fontSize: '0.8125rem' }}>Latest applicants undergoing automated assessment</p>
                    </div>
                    {stats?.total_jobs > 0 && (
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate('/jobs')}
                      >
                        <span>View All Requisitions</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>

                  {stats?.recent_applications?.length > 0 ? (
                    <div className="table-wrapper">
                      <table className="table">
                        <thead>
                          <tr>
                            <th>Candidate</th>
                            <th>Target Role</th>
                            <th>Match Index</th>
                            <th>Status Stage</th>
                          </tr>
                        </thead>
                        <tbody>
                          {stats.recent_applications.map((app) => {
                            const score = app.resume_score;
                            const scoreHigh = score >= 65;
                            return (
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
                                  <span style={{ fontWeight: 500, color: 'var(--text-secondary)' }}>
                                    {app.job_title}
                                  </span>
                                </td>
                                <td>
                                  {score != null ? (
                                    <span
                                      className={`badge ${scoreHigh ? 'badge-green' : 'badge-yellow'}`}
                                      style={{ fontWeight: 700 }}
                                    >
                                      {score.toFixed(1)}% Match
                                    </span>
                                  ) : (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                      Pending
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <StatusBadge status={app.status} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div
                      className="card"
                      style={{
                        textAlign: 'center',
                        padding: '48px 24px',
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
                          margin: '0 auto 14px',
                          color: 'var(--text-muted)',
                        }}
                      >
                        <FileText size={22} />
                      </div>
                      <h3 style={{ fontSize: '1rem', marginBottom: '6px' }}>
                        No Applications Received Yet
                      </h3>
                      <p style={{ fontSize: '0.8125rem', maxWidth: '380px', margin: '0 auto 18px' }}>
                        Create a job requisition and share its application link with candidates or on job boards.
                      </p>
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate('/jobs')}
                      >
                        <Plus size={14} />
                        <span>Post Your First Opening</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Right Column: Pipeline Funnel Breakdown */}
                <div>
                  <div style={{ marginBottom: '16px' }}>
                    <h2 style={{ fontSize: '1.125rem' }}>Assessment Pipeline Stages</h2>
                    <p style={{ fontSize: '0.8125rem' }}>Candidate conversion through hiring milestones</p>
                  </div>

                  <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {pipelineStages.map((stage) => {
                      const count = stats?.pipeline?.[stage.key] || 0;
                      const total = stats?.total_applications || 1;
                      const pct = Math.min(100, Math.round((count / total) * 100));

                      return (
                        <div key={stage.key}>
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              marginBottom: '8px',
                            }}
                          >
                            <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                              {stage.label}
                            </span>
                            <span style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {count}{' '}
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400 }}>
                                ({pct}%)
                              </span>
                            </span>
                          </div>
                          <div className="score-bar-track">
                            <div
                              style={{
                                width: `${pct}%`,
                                height: '100%',
                                background: stage.color,
                                borderRadius: 'var(--radius-full)',
                                transition: 'width 0.8s ease',
                              }}
                            />
                          </div>
                        </div>
                      );
                    })}

                    {/* Operational Note */}
                    <div
                      style={{
                        padding: '12px 14px',
                        background: 'rgba(37, 99, 235, 0.08)',
                        border: '1px solid rgba(37, 99, 235, 0.2)',
                        borderRadius: 'var(--radius-sm)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        marginTop: '8px',
                      }}
                    >
                      <ShieldCheck size={18} color="#60a5fa" />
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        Automated candidate screening, voice round invites, and assessment grading are live and active.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
