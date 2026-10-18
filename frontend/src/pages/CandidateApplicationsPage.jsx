import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { candidateApi } from '../api/client';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import {
  FileText, CheckCircle2, Clock, XCircle, Mic, Code, Users,
  ArrowRight, ExternalLink, Calendar, RefreshCw, Award, AlertCircle,
  Building2, Video, ChevronRight, Sparkles, ShieldCheck
} from 'lucide-react';

export default function CandidateApplicationsPage() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'active' | 'action_needed' | 'completed'

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const res = await candidateApi.getMyApplications();
      setApplications(res.data || []);
    } catch (err) {
      console.error(err);
      toast.error('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  // Helper to determine status category
  const getStatusCategory = (status) => {
    if (['selected', 'offer_extended'].includes(status)) return 'offer';
    if (['resume_rejected', 'rejected', 'voice_failed', 'dsa_failed'].includes(status)) return 'rejected';
    if (['voice_round_invited', 'voice_round_started', 'dsa_round_invited', 'dsa_round_started', 'hr_round_invited', 'hr_round_scheduled'].includes(status)) {
      return 'action_needed';
    }
    return 'in_progress';
  };

  const filteredApps = applications.filter((app) => {
    if (filter === 'all') return true;
    const cat = getStatusCategory(app.status);
    if (filter === 'action_needed') return cat === 'action_needed';
    if (filter === 'active') return cat === 'in_progress' || cat === 'action_needed';
    if (filter === 'completed') return cat === 'offer' || cat === 'rejected';
    return true;
  });

  const actionNeededCount = applications.filter((a) => getStatusCategory(a.status) === 'action_needed').length;
  const offersCount = applications.filter((a) => getStatusCategory(a.status) === 'offer').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }} className="fade-in">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                My Applications
              </h1>
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
                {applications.length} Total
              </span>
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
              Real-time pipeline progression, test evaluations, and action items for your job submissions.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchApplications}
              disabled={loading}
              style={{ gap: '6px' }}
            >
              <RefreshCw size={14} className={loading ? 'spinner' : ''} />
              <span>Refresh Status</span>
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/candidate/jobs')}
              style={{ gap: '6px' }}
            >
              <Sparkles size={14} />
              <span>Browse More Jobs</span>
            </button>
          </div>
        </div>

        {/* Action Needed Banner if tests are pending */}
        {actionNeededCount > 0 && (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(16, 185, 129, 0.12) 0%, rgba(59, 130, 246, 0.12) 100%)',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '28px',
              gap: '16px',
            }}
            className="fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--success-subtle)',
                  color: 'var(--success-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <AlertCircle size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '2px', color: 'var(--success-light)' }}>
                  Action Required: {actionNeededCount} Assessment{actionNeededCount > 1 ? 's' : ''} Ready!
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  You have been invited to one or more technical rounds. Click below to start your evaluations.
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setFilter('action_needed')}
              style={{ flexShrink: 0, gap: '6px' }}
            >
              <span>View Action Items</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Filter Pills */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', flexWrap: 'wrap' }}>
          {[
            { id: 'all', label: `All Applications (${applications.length})` },
            { id: 'action_needed', label: `Action Needed (${actionNeededCount})` },
            { id: 'active', label: 'In Progress Pipeline' },
            { id: 'completed', label: 'Completed' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              style={{
                padding: '7px 16px',
                borderRadius: 'var(--radius-full)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: filter === tab.id ? '1px solid var(--primary-light)' : '1px solid var(--border-subtle)',
                background: filter === tab.id ? 'var(--primary-subtle)' : 'var(--bg-card)',
                color: filter === tab.id ? 'var(--primary-light)' : 'var(--text-secondary)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Applications List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading your application tracking data...</p>
          </div>
        ) : filteredApps.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              border: '1px dashed var(--border-medium)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'var(--primary-subtle)',
                color: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <FileText size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              No applications in this view
            </h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 20px', fontSize: '0.875rem' }}>
              {applications.length === 0
                ? 'You have not submitted any applications yet. Browse listed jobs and apply in one click!'
                : 'No applications match your current status filter.'}
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => navigate('/candidate/jobs')}>
              Explore Open Requisitions
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {filteredApps.map((app) => {
              const cat = getStatusCategory(app.status);
              const isVoiceReady = ['voice_round_invited', 'voice_round_started'].includes(app.status);
              const isDsaReady = ['dsa_round_invited', 'dsa_round_started'].includes(app.status);
              const isHrReady = ['hr_round_invited', 'hr_round_scheduled'].includes(app.status);

              return (
                <div
                  key={app.id}
                  className="card"
                  style={{
                    padding: '28px',
                    border: cat === 'action_needed' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid var(--border-subtle)',
                    background: cat === 'action_needed' ? 'linear-gradient(180deg, rgba(59, 130, 246, 0.03) 0%, var(--bg-card) 100%)' : 'var(--bg-card)',
                  }}
                >
                  {/* Top Bar: Title, Company, Applied Date, Status Badge */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '24px', flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--primary-light)' }}>
                          {app.company_name || 'Hiring Enterprise'}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>•</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Applied {new Date(app.applied_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </span>
                      </div>
                      <h2 style={{ fontSize: '1.35rem', fontWeight: 700 }}>{app.job_title}</h2>
                    </div>

                    {/* Status Pill */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          padding: '6px 14px',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.8125rem',
                          fontWeight: 700,
                          textTransform: 'capitalize',
                          background:
                            cat === 'offer' ? 'var(--success-subtle)' :
                            cat === 'rejected' ? 'var(--danger-subtle)' :
                            cat === 'action_needed' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.06)',
                          color:
                            cat === 'offer' ? 'var(--success-light)' :
                            cat === 'rejected' ? 'var(--danger-light)' :
                            cat === 'action_needed' ? '#60a5fa' : 'var(--text-secondary)',
                          border:
                            cat === 'offer' ? '1px solid rgba(16, 185, 129, 0.3)' :
                            cat === 'rejected' ? '1px solid rgba(239, 68, 68, 0.3)' :
                            cat === 'action_needed' ? '1px solid rgba(96, 165, 250, 0.4)' : '1px solid var(--border-subtle)',
                        }}
                      >
                        {app.status ? app.status.replace(/_/g, ' ') : 'Applied'}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic Visual Timeline Pipeline */}
                  {(() => {
                    const stages = app.pipeline && app.pipeline.length > 0 ? app.pipeline : [
                      { id: 'st_resume', type: 'resume_vetting', name: 'Resume Vetting', desc: 'Screening' },
                      { id: 'st_voice', type: 'voice_ai_tech', name: 'Voice AI Round', desc: 'Technical conversation' },
                      { id: 'st_dsa', type: 'dsa_coding', name: 'DSA Coding', desc: 'Problem solving' },
                      { id: 'st_hr', type: 'hr_interview', name: 'HR Final Round', desc: 'Executive discussion' },
                    ];

                    const getStageStatusInfo = (stage, idx) => {
                      const t = stage.type;
                      if (t === 'resume_vetting') {
                        const hasScore = app.resume_score !== null && app.resume_score !== undefined;
                        const isPass = hasScore && app.resume_score >= 60;
                        return {
                          isCompleted: hasScore,
                          isActive: app.status === 'applied' || app.status === 'resume_screening',
                          bgColor: hasScore ? (isPass ? 'var(--success-subtle)' : 'var(--danger-subtle)') : (app.status === 'applied' || app.status === 'resume_screening' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)'),
                          textColor: hasScore ? (isPass ? 'var(--success-light)' : 'var(--danger-light)') : (app.status === 'applied' || app.status === 'resume_screening' ? '#60a5fa' : 'var(--text-muted)'),
                          statusText: hasScore ? `Score: ${Math.round(app.resume_score)}/100` : (app.status === 'applied' || app.status === 'resume_screening' ? 'Reviewing...' : 'Pending')
                        };
                      }
                      if (t === 'voice_ai_tech') {
                        const hasScore = app.voice_score !== null && app.voice_score !== undefined;
                        const isCleared = hasScore || ['voice_round_passed', 'dsa_round_invited', 'dsa_round_in_progress', 'dsa_round_passed', 'hr_round_invited', 'hr_round_completed', 'selected'].includes(app.status);
                        return {
                          isCompleted: isCleared,
                          isActive: isVoiceReady,
                          bgColor: isCleared ? 'var(--success-subtle)' : isVoiceReady ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                          textColor: isCleared ? 'var(--success-light)' : isVoiceReady ? '#60a5fa' : 'var(--text-muted)',
                          statusText: hasScore ? `Score: ${Math.round(app.voice_score)}/100` : isCleared ? 'Cleared' : isVoiceReady ? 'Action Required' : 'Pending'
                        };
                      }
                      if (t === 'dsa_coding') {
                        const hasScore = app.dsa_score !== null && app.dsa_score !== undefined;
                        const isCleared = hasScore || ['dsa_round_passed', 'hr_round_invited', 'hr_round_completed', 'selected'].includes(app.status);
                        return {
                          isCompleted: isCleared,
                          isActive: isDsaReady,
                          bgColor: isCleared ? 'var(--success-subtle)' : isDsaReady ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                          textColor: isCleared ? 'var(--success-light)' : isDsaReady ? '#60a5fa' : 'var(--text-muted)',
                          statusText: hasScore ? `Score: ${Math.round(app.dsa_score)}/100` : isCleared ? 'Cleared' : isDsaReady ? 'Action Required' : 'Pending'
                        };
                      }
                      if (t === 'hr_interview') {
                        const hasScore = app.hr_score !== null && app.hr_score !== undefined;
                        const isCleared = hasScore || ['hr_round_completed', 'selected'].includes(app.status);
                        return {
                          isCompleted: isCleared,
                          isActive: isHrReady,
                          bgColor: isCleared ? 'var(--success-subtle)' : isHrReady ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                          textColor: isCleared ? 'var(--success-light)' : isHrReady ? '#60a5fa' : 'var(--text-muted)',
                          statusText: hasScore ? `Score: ${Math.round(app.hr_score)}/100` : isCleared ? 'Completed' : isHrReady ? 'Meeting Ready' : 'Pending'
                        };
                      }
                      // custom technical stages (tech_mcq, system_design, take_home_code, debugging_round)
                      const isCleared = ['dsa_round_passed', 'hr_round_invited', 'hr_round_completed', 'selected'].includes(app.status);
                      return {
                        isCompleted: isCleared,
                        isActive: isDsaReady,
                        bgColor: isCleared ? 'var(--success-subtle)' : isDsaReady ? 'rgba(59, 130, 246, 0.2)' : 'rgba(255, 255, 255, 0.06)',
                        textColor: isCleared ? 'var(--success-light)' : isDsaReady ? '#60a5fa' : 'var(--text-muted)',
                        statusText: isCleared ? 'Cleared' : isDsaReady ? 'Action Required' : 'Pending'
                      };
                    };

                    return (
                      <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '20px', borderRadius: '14px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${stages.length}, minmax(130px, 1fr))`, gap: '14px', overflowX: 'auto', paddingBottom: '4px' }}>
                          {stages.map((stage, idx) => {
                            const info = getStageStatusInfo(stage, idx);
                            return (
                              <div key={stage.id || idx} style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <div
                                    style={{
                                      width: '26px',
                                      height: '26px',
                                      minWidth: '26px',
                                      borderRadius: '50%',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: info.bgColor,
                                      color: info.textColor,
                                      fontSize: '11px',
                                      fontWeight: 700,
                                    }}
                                  >
                                    {idx + 1}
                                  </div>
                                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={stage.name}>
                                    {stage.name}
                                  </span>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: info.textColor, paddingLeft: '34px', fontWeight: info.isCompleted || info.isActive ? 700 : 400 }}>
                                  {info.statusText}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Actions & Launch Section */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
                    {/* Feedback or summary text */}
                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', flex: 1, minWidth: '240px' }}>
                      {app.scheduled_hr_time && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#c084fc', fontWeight: 700, marginBottom: '6px' }}>
                          <Calendar size={14} />
                          <span>Final HR Interview: {app.scheduled_hr_time}</span>
                        </div>
                      )}
                      {app.resume_feedback && (
                        <div>
                          <span><strong>Resume Insights:</strong> {app.resume_feedback}</span>
                          {app.skills_matched?.length > 0 && (
                            <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '4px', marginTop: '6px' }}>
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Verified Skills:</span>
                              {app.skills_matched.slice(0, 4).map((sk, idx) => (
                                <span key={idx} style={{
                                  fontSize: '0.6875rem',
                                  padding: '1px 6px',
                                  borderRadius: 'var(--radius-xs)',
                                  background: 'var(--success-subtle)',
                                  color: 'var(--success-light)',
                                  border: '1px solid rgba(16, 185, 129, 0.25)',
                                  fontWeight: 600,
                                }}>
                                  ✓ {sk}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Stage Buttons */}
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      {isVoiceReady && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/interview/voice/${app.id}`)}
                          style={{ gap: '6px', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
                        >
                          <Mic size={15} />
                          <span>Start AI Voice Interview</span>
                        </button>
                      )}

                      {isDsaReady && (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/interview/dsa/${app.id}`)}
                          style={{ gap: '6px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)' }}
                        >
                          <Code size={15} />
                          <span>Enter Coding Arena (DSA)</span>
                        </button>
                      )}

                      {isHrReady && app.meeting_link && (
                        <a
                          href={app.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ gap: '6px', textDecoration: 'none', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
                        >
                          <Video size={15} />
                          <span>Join HR Video Meeting</span>
                          <ExternalLink size={13} />
                        </a>
                      )}

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/status/${app.id}`)}
                        style={{ gap: '4px' }}
                      >
                        <span>Full Assessment Report</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
