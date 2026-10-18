import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { applicationsApi } from '../api/client';
import toast from 'react-hot-toast';
import {
  Briefcase,
  FileText,
  Mic,
  Code2,
  Users,
  CheckCircle2,
  Clock,
  ChevronRight,
  ShieldCheck,
  Building2,
  ExternalLink,
  ChevronLeft,
} from 'lucide-react';

export default function CandidateStatusPage() {
  const { applicationId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);

  const loadStatus = async (isBackground = false) => {
    try {
      if (!isBackground) setLoading(true);
      const res = await applicationsApi.getPublicStatus(applicationId);
      setData(res.data);
    } catch (err) {
      if (!isBackground) {
        toast.error('Failed to load application status');
      }
      console.error(err);
    } finally {
      if (!isBackground) setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus(false);
    // Real-time synchronization polling every 3 seconds for candidate status
    const interval = setInterval(() => {
      loadStatus(true);
    }, 3000);
    return () => clearInterval(interval);
  }, [applicationId]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-canvas)',
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ width: 44, height: 44, margin: '0 auto 16px' }} />
          <p>Retrieving your recruitment progress...</p>
        </div>
      </div>
    );
  }

  const status = data?.status || 'applied';

  // Build steps dynamically based on the job requisition's custom software pipeline
  const pipelineConfig = data?.pipeline || [
    { id: 'st_resume', type: 'resume_vetting', name: 'Resume Qualifications Vetting', desc: 'Automated requirement & competency matching' },
    { id: 'st_voice', type: 'voice_ai_tech', name: 'Round 1: AI Technical Voice Screen', desc: 'Adaptive conversational technical proficiency evaluation' },
    { id: 'st_dsa', type: 'dsa_coding', name: 'Round 2: Algorithmic & Coding Assessment (DSA)', desc: 'Hands-on problem solving and code quality analysis' },
    { id: 'st_hr', type: 'hr_interview', name: 'Round 3: Executive HR & Leadership Interview', desc: 'Cultural alignment and strategic role discussion' },
  ];

  const getStageMeta = (stage, index) => {
    switch (stage.type) {
      case 'resume_vetting':
        return {
          icon: FileText,
          title: stage.name || 'Resume Qualifications Vetting',
          desc: data?.resume_score
            ? `Screening Score: ${data.resume_score.toFixed(1)}% Match`
            : stage.desc || 'Automated requirement & competency matching',
          isCompleted: !!data?.resume_score,
          isActive: status === 'applied' || status === 'resume_screening',
        };

      case 'voice_ai_tech':
        return {
          icon: Mic,
          title: stage.name || 'AI Technical Voice Assessment',
          desc: stage.desc || 'Adaptive conversational technical proficiency evaluation',
          isCompleted: [
            'voice_round_passed',
            'dsa_round_invited',
            'dsa_round_in_progress',
            'dsa_round_passed',
            'hr_round_invited',
            'hr_round_completed',
            'selected',
          ].includes(status),
          isActive: ['voice_round_invited', 'voice_round_in_progress'].includes(status),
          actionUrl: `/interview/voice/${applicationId}`,
          actionText: 'Begin Voice Assessment',
        };

      case 'dsa_coding':
        return {
          icon: Code2,
          title: stage.name || 'Algorithmic Coding (DSA)',
          desc: stage.desc || 'Hands-on problem solving and code quality analysis',
          isCompleted: [
            'dsa_round_passed',
            'hr_round_invited',
            'hr_round_completed',
            'selected',
          ].includes(status),
          isActive: ['dsa_round_invited', 'dsa_round_in_progress'].includes(status),
          actionUrl: `/interview/dsa/${applicationId}`,
          actionText: 'Enter Coding IDE',
        };

      case 'tech_mcq':
      case 'system_design':
      case 'take_home_code':
      case 'debugging_round':
        return {
          icon: Code2,
          title: stage.name,
          desc: stage.desc || 'Custom technical milestone',
          isCompleted: [
            'dsa_round_passed',
            'hr_round_invited',
            'hr_round_completed',
            'selected',
          ].includes(status),
          isActive: ['dsa_round_invited', 'dsa_round_in_progress'].includes(status),
          actionUrl: `/interview/dsa/${applicationId}`,
          actionText: 'Open Assessment Sandbox',
        };

      case 'hr_interview':
        return {
          icon: Users,
          title: stage.name || 'Executive HR & Leadership Interview',
          desc: stage.desc || 'Cultural alignment and strategic role discussion',
          isCompleted: ['hr_round_completed', 'selected'].includes(status),
          isActive: status === 'hr_round_invited',
        };

      default:
        return {
          icon: FileText,
          title: stage.name,
          desc: stage.desc,
          isCompleted: false,
          isActive: false,
        };
    }
  };

  const steps = [
    ...pipelineConfig.map((stage, idx) => ({
      id: stage.id || `st_${idx}`,
      ...getStageMeta(stage, idx),
    })),
    // Final Offer Milestone Anchor
    {
      id: 'step_offer_final',
      title: 'Hiring Decision & Final Offer',
      icon: CheckCircle2,
      desc:
        status === 'selected'
          ? 'Congratulations! Formal Offer Extended.'
          : 'Final review by the hiring committee',
      isCompleted: status === 'selected',
      isActive: ['hr_round_completed', 'selected'].includes(status),
    },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', padding: '36px 24px' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>
        {/* Top Back Action */}
        <div style={{ marginBottom: '24px' }}>
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/careers')}
            style={{ gap: '6px' }}
          >
            <ChevronLeft size={16} />
            <span>Back to Career Portal</span>
          </button>
        </div>

        {/* Brand Banner */}
        <div className="card fade-in" style={{ marginBottom: '24px', padding: '28px 32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span className="brand-tag">Candidate Tracker</span>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
              Ref: <strong style={{ color: 'var(--text-secondary)' }}>{applicationId}</strong>
            </span>
          </div>

          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '6px' }}>
            Candidate Recruitment Journey
          </h1>

          <p style={{ fontSize: '0.9375rem' }}>
            Applicant: <strong style={{ color: 'var(--text-primary)' }}>{data?.candidate_name}</strong> • Position:{' '}
            <strong style={{ color: 'var(--primary-light)' }}>{data?.job_title}</strong> at{' '}
            <strong style={{ color: 'var(--text-primary)' }}>{data?.company_name}</strong>
          </p>
        </div>

        {/* Current Status Highlight Card */}
        <div
          className="card fade-in"
          style={{
            padding: '24px 32px',
            marginBottom: '28px',
            border: '1px solid var(--border-medium)',
            background: 'var(--bg-card)',
          }}
        >
          <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', fontWeight: 700 }}>
            Current Recruitment Pipeline Stage
          </div>
          <div
            style={{
              fontSize: '1.375rem',
              fontWeight: 800,
              color:
                status === 'selected'
                  ? 'var(--success-light)'
                  : status.includes('rejected') || status.includes('failed')
                  ? 'var(--danger-light)'
                  : 'var(--primary-light)',
              marginTop: '6px',
            }}
          >
            {status.replace(/_/g, ' ').toUpperCase()}
          </div>
          {data?.resume_feedback && (
            <div style={{ marginTop: '16px' }}>
              <p
                style={{
                  fontSize: '0.875rem',
                  color: 'var(--text-secondary)',
                  padding: '12px 16px',
                  background: 'rgba(255,255,255,0.02)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-subtle)',
                  lineHeight: 1.6,
                }}
              >
                "{data.resume_feedback}"
              </p>

              {/* JD & Profile Skills Match Breakdown */}
              {((data.skills_matched && data.skills_matched.length > 0) || (data.profile_skills_matched && data.profile_skills_matched.length > 0)) && (
                <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {data.skills_matched && data.skills_matched.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success-light)', minWidth: '130px' }}>
                        Matched Skills:
                      </span>
                      {data.skills_matched.map((sk, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.6875rem',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: 'var(--success-subtle)',
                            color: 'var(--success-light)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            fontWeight: 600,
                          }}
                        >
                          ✓ {sk}
                        </span>
                      ))}
                    </div>
                  )}

                  {data.profile_skills_matched && data.profile_skills_matched.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#60a5fa', minWidth: '130px' }}>
                        Profile Skills in JD:
                      </span>
                      {data.profile_skills_matched.map((psk, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.6875rem',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: '#93c5fd',
                            border: '1px solid rgba(59, 130, 246, 0.25)',
                            fontWeight: 600,
                          }}
                        >
                          ★ {psk}
                        </span>
                      ))}
                    </div>
                  )}

                  {data.skills_missing && data.skills_missing.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--danger-light)', minWidth: '130px' }}>
                        Missing Requirements:
                      </span>
                      {data.skills_missing.map((msk, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.6875rem',
                            padding: '3px 8px',
                            borderRadius: 'var(--radius-full)',
                            background: 'rgba(239, 68, 68, 0.08)',
                            color: 'var(--danger-light)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                          }}
                        >
                          ✕ {msk}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Timeline Progression */}
        <div className="card fade-in" style={{ padding: '36px' }}>
          <h3 style={{ fontSize: '1.125rem', marginBottom: '24px', paddingBottom: '14px', borderBottom: '1px solid var(--border-subtle)' }}>
            Hiring Assessment Pipeline
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {steps.map((st, i) => {
              const Icon = st.icon;
              const isLast = i === steps.length - 1;

              return (
                <div
                  key={st.id}
                  style={{
                    display: 'flex',
                    gap: '20px',
                    position: 'relative',
                    paddingBottom: isLast ? '0' : '32px',
                  }}
                >
                  {/* Connector Line */}
                  {!isLast && (
                    <div
                      style={{
                        position: 'absolute',
                        left: '20px',
                        top: '42px',
                        bottom: '0',
                        width: '2px',
                        background: st.isCompleted ? 'var(--success)' : 'var(--border-subtle)',
                      }}
                    />
                  )}

                  {/* Icon Circle */}
                  <div
                    style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '50%',
                      background: st.isCompleted
                        ? 'var(--success-subtle)'
                        : st.isActive
                        ? 'var(--primary-subtle)'
                        : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${
                        st.isCompleted
                          ? 'var(--success)'
                          : st.isActive
                          ? 'var(--primary)'
                          : 'var(--border-subtle)'
                      }`,
                      color: st.isCompleted
                        ? 'var(--success-light)'
                        : st.isActive
                        ? 'var(--primary-light)'
                        : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      zIndex: 1,
                    }}
                  >
                    {st.isCompleted ? <CheckCircle2 size={20} /> : <Icon size={18} />}
                  </div>

                  {/* Step Description */}
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <h4
                        style={{
                          fontSize: '1rem',
                          fontWeight: 700,
                          color: st.isCompleted
                            ? 'var(--success-light)'
                            : st.isActive
                            ? 'var(--text-primary)'
                            : 'var(--text-secondary)',
                        }}
                      >
                        {st.title}
                      </h4>
                      {st.isActive && (
                        <span className="badge badge-blue" style={{ fontSize: '0.6875rem' }}>
                          <span className="badge-dot" />
                          <span>Action Required</span>
                        </span>
                      )}
                    </div>

                    <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                      {st.desc}
                    </p>

                    {/* Action Button */}
                    {st.isActive && st.actionUrl && (
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(st.actionUrl)}
                        style={{ marginTop: '14px', gap: '6px' }}
                      >
                        <span>{st.actionText}</span>
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
