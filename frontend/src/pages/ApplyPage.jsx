import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jobsApi, applicationsApi } from '../api/client';
import toast from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase,
  Building2,
  CheckCircle2,
  UploadCloud,
  FileText,
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  Share2,
  Copy,
  ExternalLink,
  Sparkles,
  Info,
  AlertCircle,
} from 'lucide-react';

export default function ApplyPage() {
  const { jobToken } = useParams();
  const navigate = useNavigate();
  const { candidate } = useAuth();
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(1); // 1=preview & form, 2=submitted
  const [submitting, setSubmitting] = useState(false);
  const [applicationId, setApplicationId] = useState(null);
  const [alreadyApplied, setAlreadyApplied] = useState(false);
  const [existingAppId, setExistingAppId] = useState(null);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    college_or_company: '',
    graduation_year: '',
  });
  const [resume, setResume] = useState(null);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'application/pdf': ['.pdf'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxFiles: 1,
    maxSize: 5 * 1024 * 1024,
    onDrop: (acceptedFiles, rejectedFiles) => {
      if (rejectedFiles.length > 0) {
        toast.error('Please upload a PDF or Word document under 5MB');
        return;
      }
      if (acceptedFiles.length > 0) {
        setResume(acceptedFiles[0]);
        toast.success(`Resume attached: ${acceptedFiles[0].name}`);
      }
    },
  });

  useEffect(() => {
    // Pre-populate if candidate is logged in
    if (candidate) {
      setForm((prev) => ({
        ...prev,
        name: prev.name || candidate.name || '',
        email: prev.email || candidate.email || '',
        phone: prev.phone || candidate.phone || '',
        college_or_company: prev.college_or_company || candidate.college || candidate.company || '',
        graduation_year: prev.graduation_year || candidate.graduation_year || '',
      }));
    }

    jobsApi
      .getPublic(jobToken)
      .then(async (res) => {
        const jobData = res.data;
        setJob(jobData);

        // If candidate logged in, check if already applied for this job
        if (candidate?.email) {
          try {
            const { applicationsApi: appsApi } = await import('../api/client');
            const myApps = await appsApi.candidateMyApplications?.() || [];
            // Check in stored apps or profile
            const matching = (myApps.data || []).find(
              (a) => String(a.job_id) === String(jobData.id || jobData._id)
            );
            if (matching) {
              setAlreadyApplied(true);
              setExistingAppId(matching.id || matching._id);
            }
          } catch {
            // Ignore pre-check failures
          }
        }
      })
      .catch(() => toast.error('Job requisition not found or no longer active'))
      .finally(() => setLoading(false));
  }, [jobToken, candidate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (alreadyApplied) {
      toast.error('You have already submitted an application for this position.');
      return;
    }
    if (!resume) {
      toast.error('Please attach your resume to continue');
      return;
    }
    setSubmitting(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => {
      if (v) fd.append(k, v);
    });
    fd.append('resume', resume);

    try {
      const res = await applicationsApi.apply(jobToken, fd);
      setApplicationId(res.data.application_id);
      setStep(2);
      toast.success('Application submitted successfully!');
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Submission failed. Please check details.';
      if (errorMsg.toLowerCase().includes('already applied') || errorMsg.toLowerCase().includes('already submitted')) {
        setAlreadyApplied(true);
      }
      toast.error(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

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
          <p>Loading position details...</p>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div
        style={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'var(--bg-canvas)',
          padding: '24px',
        }}
      >
        <div className="card" style={{ maxWidth: '480px', textAlign: 'center', padding: '48px 32px' }}>
          <div
            style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.1)',
              color: 'var(--danger-light)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Briefcase size={26} />
          </div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>Position Closed or Not Found</h2>
          <p style={{ fontSize: '0.875rem', marginBottom: '24px' }}>
            This job requisition is no longer accepting submissions or the application link has expired.
          </p>
          <button className="btn btn-primary" onClick={() => navigate('/careers')}>
            Browse Open Opportunities
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)', paddingBottom: '64px' }}>
      {/* Top Application Bar */}
      <header
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'rgba(14, 21, 38, 0.8)',
          backdropFilter: 'blur(12px)',
          position: 'sticky',
          top: 0,
          zIndex: 40,
          padding: '12px 24px',
        }}
      >
        <div
          style={{
            maxWidth: '1000px',
            margin: '0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <button
            className="btn btn-ghost btn-sm"
            onClick={() => navigate('/careers')}
            style={{ gap: '6px' }}
          >
            <ChevronLeft size={16} />
            <span>All Open Positions</span>
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Hiring Team:</span>
            <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {job.company_name}
            </span>
            <ShieldCheck size={14} color="#10b981" />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ maxWidth: '840px', margin: '36px auto 0', padding: '0 24px' }}>
        {step === 2 ? (
          /* Submission Success State */
          <div className="card fade-in" style={{ padding: '48px 36px', textAlign: 'center' }}>
            <div
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.12)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                color: 'var(--success-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 20px',
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: '8px' }}>
              Application Successfully Ingested!
            </h2>
            <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', maxWidth: '520px', margin: '0 auto 24px' }}>
              Your profile and resume for <strong style={{ color: 'var(--text-primary)' }}>{job.title}</strong> have been
              received by the hiring team at {job.company_name}.
            </p>

            {/* Reference ID Pill */}
            {applicationId && (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--border-medium)',
                  marginBottom: '32px',
                }}
              >
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Application ID:
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.875rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                  {applicationId}
                </span>
                <button
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 6px' }}
                  onClick={() => {
                    navigator.clipboard.writeText(applicationId);
                    toast.success('ID copied to clipboard');
                  }}
                  title="Copy Application ID"
                >
                  <Copy size={13} />
                </button>
              </div>
            )}

            {/* Assessment Progression Roadmap */}
            <div
              style={{
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '24px',
                textAlign: 'left',
                maxWidth: '600px',
                margin: '0 auto 32px',
              }}
            >
              <h4 style={{ fontSize: '0.875rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '14px' }}>
                Your Assessment Pipeline
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {(job?.pipeline || [
                  { name: 'Resume Qualifications Vetting', desc: 'Automated requirement & competency matching' },
                  { name: 'AI Technical Voice Screen', desc: 'Adaptive conversational technical proficiency evaluation' },
                  { name: 'Algorithmic & Coding Assessment (DSA)', desc: 'Hands-on problem solving and code quality analysis' },
                  { name: 'Executive HR & Leadership Interview', desc: 'Cultural alignment and strategic role discussion' },
                ]).map((stage, idx) => (
                  <div key={stage.id || idx} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{
                      width: '22px', height: '22px', borderRadius: '50%',
                      background: idx === 0 ? 'var(--success-subtle)' : 'rgba(255,255,255,0.06)',
                      color: idx === 0 ? 'var(--success-light)' : 'var(--text-secondary)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '11px', fontWeight: 700,
                    }}>
                      {idx + 1}
                    </div>
                    <span style={{ fontSize: '0.875rem', color: idx === 0 ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      <strong>{stage.name}:</strong>{' '}
                      {idx === 0 ? 'In progress against role requirements.' : stage.desc || 'Upcoming stage'}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* CTAs */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/status/${applicationId}`)}
              >
                <span>Track Live Application Status</span>
                <ChevronRight size={16} />
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => navigate('/careers')}
              >
                Explore Other Openings
              </button>
            </div>
          </div>
        ) : (
          /* Main Application Form */
          <div className="fade-in">
            {/* Role Header Banner */}
            <div
              className="card"
              style={{
                marginBottom: '24px',
                padding: '32px',
                border: '1px solid var(--border-medium)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div className="avatar-circle" style={{ width: '32px', height: '32px' }}>
                  {job.company_name?.[0]?.toUpperCase() || 'C'}
                </div>
                <span style={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '1rem' }}>
                  {job.company_name}
                </span>
                <CheckCircle2 size={16} color="#10b981" />
                <span className="brand-tag">Verified Employer</span>
              </div>

              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, marginBottom: '14px' }}>
                {job.title}
              </h1>

              {/* Meta pills */}
              <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '18px' }}>
                <span className="badge badge-blue">
                  <Briefcase size={13} />
                  <span>{job.interview_type ? job.interview_type.replace('_', ' ') : 'Full-time'}</span>
                </span>
                <span className="badge badge-gray">
                  <Clock size={13} />
                  <span>{job.min_experience_years > 0 ? `${job.min_experience_years}+ Yrs Experience` : 'Entry / Any Experience'}</span>
                </span>
                {job.education_requirement && (
                  <span className="badge badge-gray">
                    <Award size={13} />
                    <span>{job.education_requirement}</span>
                  </span>
                )}
              </div>

              {/* Overview text */}
              <div
                style={{
                  fontSize: '0.9375rem',
                  color: 'var(--text-secondary)',
                  lineHeight: 1.6,
                  whiteSpace: 'pre-wrap',
                  marginBottom: '20px',
                }}
              >
                {job.description}
              </div>

              {/* Required Skills */}
              {job.required_skills?.length > 0 && (
                <div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-muted)', marginBottom: '8px' }}>
                    Target Skills & Competencies:
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {job.required_skills.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontSize: '0.8125rem',
                          fontWeight: 500,
                          padding: '3px 10px',
                          borderRadius: 'var(--radius-xs)',
                          background: 'rgba(37, 99, 235, 0.1)',
                          border: '1px solid rgba(37, 99, 235, 0.25)',
                          color: 'var(--primary-light)',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Application Submission Form */}
            <div className="card" style={{ padding: '36px' }}>
              {alreadyApplied ? (
                <div
                  style={{
                    padding: '24px',
                    borderRadius: 'var(--radius-md)',
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    marginBottom: '24px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '16px',
                  }}
                >
                  <div
                    style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: 'var(--danger-light)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <AlertCircle size={22} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                      Application Already Submitted
                    </h4>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5, marginBottom: '14px' }}>
                      You have already applied for the <strong>{job.title}</strong> role. Under PrismHire hiring policies, candidates cannot submit multiple applications for the same position.
                    </p>
                    <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                      {existingAppId ? (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate(`/status/${existingAppId}`)}
                        >
                          <CheckCircle2 size={14} />
                          <span>Track Your Application</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => navigate('/candidate/applications')}
                        >
                          <CheckCircle2 size={14} />
                          <span>View My Applications</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigate('/careers')}
                      >
                        Browse Other Open Positions
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}

              <div style={{ marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>Candidate Application</h3>
                <p style={{ fontSize: '0.8125rem' }}>
                  Please provide your contact information and attach your latest resume (PDF or DOCX).
                </p>
              </div>

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
                {/* 1. Contact Details */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="label">Full Legal Name *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Alex Morgan"
                      value={form.name}
                      onChange={setField('name')}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Primary Email Address *</label>
                    <input
                      className="input"
                      type="email"
                      placeholder="alex.morgan@example.com"
                      value={form.email}
                      onChange={setField('email')}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="form-group">
                    <label className="label">Phone / WhatsApp Number *</label>
                    <input
                      className="input"
                      type="tel"
                      placeholder="+1 (555) 000-0000 or +91 9876543210"
                      value={form.phone}
                      onChange={setField('phone')}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="label">Current Employer or University *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Google / Stanford University / Freelance"
                      value={form.college_or_company}
                      onChange={setField('college_or_company')}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ maxWidth: '300px' }}>
                  <label className="label">Graduation Year (Optional)</label>
                  <input
                    className="input"
                    type="number"
                    min="1990"
                    max="2032"
                    placeholder="e.g. 2024"
                    value={form.graduation_year}
                    onChange={setField('graduation_year')}
                  />
                </div>

                {/* 2. Resume Upload Zone */}
                <div className="form-group">
                  <label className="label">Curriculum Vitae / Resume *</label>

                  <div
                    {...getRootProps()}
                    className={`dropzone ${isDragActive ? 'active' : ''}`}
                    style={{
                      padding: resume ? '24px' : '40px 24px',
                      background: resume ? 'rgba(16, 185, 129, 0.05)' : undefined,
                      borderColor: resume ? 'var(--success)' : undefined,
                    }}
                  >
                    <input {...getInputProps()} />

                    {resume ? (
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: 'var(--radius-sm)',
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--success-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <FileText size={22} />
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9375rem' }}>
                            {resume.name}
                          </div>
                          <div style={{ fontSize: '0.75rem', color: 'var(--success-light)', marginTop: '2px' }}>
                            {(resume.size / 1024).toFixed(1)} KB • Attached and ready for review
                          </div>
                        </div>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ marginLeft: '12px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setResume(null);
                          }}
                        >
                          Replace File
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="dropzone-icon-box">
                          <UploadCloud size={28} />
                        </div>
                        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)', marginBottom: '4px' }}>
                          {isDragActive ? 'Drop your resume file here' : 'Drag & drop your resume or browse file'}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          Supports PDF, DOCX, and DOC (Max file size: 5MB)
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Notice */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Info size={16} color="var(--text-muted)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <p style={{ fontSize: '0.8125rem', margin: 0 }}>
                    By applying, your resume will be automatically parsed and evaluated against the job qualifications.
                    Eligible candidates receive an invitation to Round 1 assessment immediately via email.
                  </p>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  className="btn btn-primary btn-lg"
                  disabled={submitting || alreadyApplied}
                  style={{
                    marginTop: '8px',
                    opacity: alreadyApplied ? 0.6 : 1,
                    cursor: alreadyApplied ? 'not-allowed' : 'pointer',
                  }}
                >
                  {submitting ? (
                    <>
                      <span className="spinner" />
                      <span>Ingesting Application & Vetting Resume...</span>
                    </>
                  ) : alreadyApplied ? (
                    <>
                      <CheckCircle2 size={18} color="#10b981" />
                      <span>Already Applied for this Job</span>
                    </>
                  ) : (
                    <>
                      <span>Submit Application for {job.title}</span>
                      <ChevronRight size={18} />
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
