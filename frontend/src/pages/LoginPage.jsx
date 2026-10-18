import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Briefcase, ShieldCheck, Award, Users, ChevronRight, ArrowRight,
  Sparkles, Building2, Lock, Mail, User, CheckCircle2
} from 'lucide-react';

export default function LoginPage() {
  const { login, candidateLogin } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Role: 'candidate' | 'recruiter'
  const initialRole = searchParams.get('role') === 'recruiter' ? 'recruiter' : 'candidate';
  const [selectedRole, setSelectedRole] = useState(initialRole);

  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const roleParam = searchParams.get('role');
    if (roleParam === 'recruiter' || roleParam === 'candidate') {
      setSelectedRole(roleParam);
    }
  }, [searchParams]);

  const handleRoleChange = (role) => {
    setSelectedRole(role);
    setSearchParams({ role });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (selectedRole === 'candidate') {
        await candidateLogin(form.email, form.password);
        toast.success('Welcome back to your Talent Hub!');
        navigate('/candidate/jobs');
      } else {
        await login(form.email, form.password);
        toast.success('Welcome back to your hiring workspace!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-canvas)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '32px 24px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1020px',
          display: 'grid',
          gridTemplateColumns: '1.05fr 1fr',
          gap: '36px',
          alignItems: 'center',
        }}
        className="fade-in"
      >
        {/* Left Enterprise Value Banner */}
        <div style={{ padding: '24px 16px' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              marginBottom: '28px',
            }}
            onClick={() => navigate('/careers')}
          >
            <div className="brand-logo-mark">
              <Briefcase size={20} strokeWidth={2.5} />
            </div>
            <div>
              <span className="brand-text" style={{ fontSize: '1.25rem' }}>PrismHire</span>
              <span className="brand-tag" style={{ marginLeft: '8px' }}>
                {selectedRole === 'candidate' ? 'Candidate Talent Hub' : 'Talent Cloud'}
              </span>
            </div>
          </div>

          <h1
            style={{
              fontSize: '2.25rem',
              fontWeight: 800,
              lineHeight: 1.2,
              marginBottom: '16px',
              letterSpacing: '-0.03em',
            }}
          >
            {selectedRole === 'candidate'
              ? 'Find Your Next Career Step with AI Matching'
              : 'The Modern Recruitment Operating System'}
          </h1>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
            {selectedRole === 'candidate'
              ? 'Create a verified talent profile, get matched with tailored requisitions using vector ML, and track technical assessments in one unified dashboard.'
              : 'Streamline applicant screening, automated technical assessments, and executive hiring decisions in one unified platform.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-subtle)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Sparkles size={16} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selectedRole === 'candidate'
                  ? 'ML-powered recommendations matching your skills & experience'
                  : 'Automated multi-criteria resume vetting against role requirements'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--success-subtle)', color: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Award size={16} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selectedRole === 'candidate'
                  ? '1-Click Apply using your profile & auto-parsed resume'
                  : 'Structured assessment pipelines (Voice, DSA coding, and HR rounds)'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--indigo-subtle)', color: 'var(--indigo-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Users size={16} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selectedRole === 'candidate'
                  ? 'Live assessment status tracker with direct round entry'
                  : 'Comprehensive candidate dossiers with verifiable competency matching'}
              </span>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/careers')}
            style={{ gap: '6px' }}
          >
            <span>Preview Public Job Board</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Right Sign-in Form Card */}
        <div
          className="card"
          style={{
            padding: '36px 32px',
            border: '1px solid var(--border-medium)',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          {/* Role Selection Tabs */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              background: 'rgba(255, 255, 255, 0.04)',
              borderRadius: '12px',
              padding: '4px',
              marginBottom: '28px',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <button
              type="button"
              onClick={() => handleRoleChange('candidate')}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                background: selectedRole === 'candidate' ? 'var(--primary)' : 'transparent',
                color: selectedRole === 'candidate' ? '#fff' : 'var(--text-secondary)',
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
              <User size={15} />
              <span>Job Seeker</span>
            </button>
            <button
              type="button"
              onClick={() => handleRoleChange('recruiter')}
              style={{
                padding: '9px 12px',
                borderRadius: '8px',
                border: 'none',
                background: selectedRole === 'recruiter' ? 'var(--primary)' : 'transparent',
                color: selectedRole === 'recruiter' ? '#fff' : 'var(--text-secondary)',
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
              <Building2 size={15} />
              <span>Employer</span>
            </button>
          </div>

          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '6px' }}>
              {selectedRole === 'candidate' ? 'Candidate Sign In' : 'Employer Sign In'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {selectedRole === 'candidate'
                ? 'Sign in to access your profile, recommended jobs, and applications.'
                : 'Access your hiring workspace, requisitions, and candidate pipeline.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div className="form-group">
              <label className="label">
                {selectedRole === 'candidate' ? 'Email Address' : 'Work Email Address'}
              </label>
              <input
                className="input"
                type="email"
                placeholder={selectedRole === 'candidate' ? 'candidate@example.com' : 'recruiter@company.com'}
                value={form.email}
                onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••••••"
                value={form.password}
                onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                required
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: '6px' }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Authenticating...</span>
                </>
              ) : (
                <>
                  <span>{selectedRole === 'candidate' ? 'Sign In as Candidate' : 'Sign In to Workspace'}</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '24px',
              paddingTop: '18px',
              borderTop: '1px solid var(--border-subtle)',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
            }}
          >
            {selectedRole === 'candidate' ? (
              <>
                New candidate?{' '}
                <Link to="/register?role=candidate" style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
                  Create Candidate Profile
                </Link>
              </>
            ) : (
              <>
                Need to register your organization?{' '}
                <Link to="/register?role=recruiter" style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
                  Create an Employer Account
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
