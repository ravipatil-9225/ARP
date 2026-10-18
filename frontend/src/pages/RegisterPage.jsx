import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import {
  Briefcase, Building2, ShieldCheck, ChevronRight, ArrowRight,
  CheckCircle2, User, Sparkles, Phone, Lock, Mail
} from 'lucide-react';

export default function RegisterPage() {
  const { register, candidateRegister } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialRole = searchParams.get('role') === 'recruiter' ? 'recruiter' : 'candidate';
  const [selectedRole, setSelectedRole] = useState(initialRole);

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    industry: '',
    website: '',
  });
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
    if (form.password !== form.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (form.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      if (selectedRole === 'candidate') {
        await candidateRegister({
          name: form.name,
          email: form.email,
          password: form.password,
          phone: form.phone,
        });
        toast.success('Candidate profile created! Complete your details to get recommended.');
        navigate('/candidate/profile');
      } else {
        await register({
          name: form.name,
          email: form.email,
          password: form.password,
          industry: form.industry || undefined,
          website: form.website || undefined,
        });
        toast.success('Organization workspace initialized successfully!');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-canvas)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 24px',
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
        {/* Left Information Banner */}
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
              ? 'Join the Future of AI-Matched Career Opportunities'
              : 'Scale Your Technical Hiring with Automated Intelligence'}
          </h1>

          <p style={{ fontSize: '1rem', color: 'var(--text-secondary)', marginBottom: '32px', lineHeight: 1.6 }}>
            {selectedRole === 'candidate'
              ? 'Create your candidate profile in under 2 minutes. Upload your resume for auto-fill, get ML-scored job recommendations, and take assessments seamlessly.'
              : 'Automate candidate screening, conduct AI-driven voice & algorithmic code evaluations, and schedule HR interviews effortlessly.'}
          </p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '36px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary-subtle)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={16} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selectedRole === 'candidate'
                  ? 'Smart resume parsing with AI skill extraction'
                  : 'Automated multi-metric resume vetting against role criteria'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--success-subtle)', color: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={16} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selectedRole === 'candidate'
                  ? 'Real-time multi-stage interview pipeline tracker'
                  : 'Multi-round automated technical & behavioural evaluation'}
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--indigo-subtle)', color: 'var(--indigo-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={16} />
              </div>
              <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                {selectedRole === 'candidate'
                  ? '1-Click Apply without filling redundant application forms'
                  : 'Direct Google Meet & Microsoft Teams round coordination'}
              </span>
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={() => navigate('/careers')}
            style={{ gap: '6px' }}
          >
            <span>Browse Active Openings</span>
            <ArrowRight size={14} />
          </button>
        </div>

        {/* Right Form Card */}
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
              marginBottom: '24px',
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

          <div style={{ marginBottom: '22px' }}>
            <h2 style={{ fontSize: '1.45rem', fontWeight: 700, marginBottom: '6px' }}>
              {selectedRole === 'candidate' ? 'Create Candidate Account' : 'Register Organization'}
            </h2>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              {selectedRole === 'candidate'
                ? 'Sign up to build your profile and access AI recommendations.'
                : 'Set up your recruiting portal and launch job requisitions in minutes.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="label">
                {selectedRole === 'candidate' ? 'Full Name *' : 'Company Name *'}
              </label>
              <input
                className="input"
                type="text"
                placeholder={selectedRole === 'candidate' ? 'Jane Doe' : 'Acme Corporation'}
                value={form.name}
                onChange={setField('name')}
                required
              />
            </div>

            <div className="form-group">
              <label className="label">
                {selectedRole === 'candidate' ? 'Email Address *' : 'Work Email Address *'}
              </label>
              <input
                className="input"
                type="email"
                placeholder={selectedRole === 'candidate' ? 'jane@example.com' : 'recruiting@acme.com'}
                value={form.email}
                onChange={setField('email')}
                required
              />
            </div>

            {selectedRole === 'candidate' ? (
              <div className="form-group">
                <label className="label">Phone Number (Optional)</label>
                <input
                  className="input"
                  type="tel"
                  placeholder="+91 9876543210"
                  value={form.phone}
                  onChange={setField('phone')}
                />
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div className="form-group">
                  <label className="label">Industry</label>
                  <input
                    className="input"
                    type="text"
                    placeholder="e.g. SaaS / AI"
                    value={form.industry}
                    onChange={setField('industry')}
                  />
                </div>
                <div className="form-group">
                  <label className="label">Company Website</label>
                  <input
                    className="input"
                    type="url"
                    placeholder="https://acme.com"
                    value={form.website}
                    onChange={setField('website')}
                  />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group">
                <label className="label">Password *</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Min 6 characters"
                  value={form.password}
                  onChange={setField('password')}
                  required
                />
              </div>

              <div className="form-group">
                <label className="label">Confirm Password *</label>
                <input
                  className="input"
                  type="password"
                  placeholder="Re-type password"
                  value={form.confirmPassword}
                  onChange={setField('confirmPassword')}
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={loading}
              style={{ marginTop: '8px' }}
            >
              {loading ? (
                <>
                  <span className="spinner" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>{selectedRole === 'candidate' ? 'Create Candidate Profile' : 'Initialize Workspace'}</span>
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </form>

          <div
            style={{
              marginTop: '22px',
              paddingTop: '16px',
              borderTop: '1px solid var(--border-subtle)',
              textAlign: 'center',
              fontSize: '0.875rem',
              color: 'var(--text-muted)',
            }}
          >
            Already have an account?{' '}
            <Link
              to={`/login?role=${selectedRole}`}
              style={{ fontWeight: 600, color: 'var(--primary-light)' }}
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
