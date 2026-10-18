import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Briefcase, Building2, ExternalLink, LogOut, Compass, ShieldCheck,
  User, CheckCircle2, FileText, Sparkles, Award, Layers, Users
} from 'lucide-react';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { company, candidate, role, logout } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Brand identity */}
        <div
          className="brand-wrapper"
          onClick={() => navigate(role === 'candidate' ? '/candidate/jobs' : company ? '/dashboard' : '/careers')}
        >
          <div className="brand-logo-mark">
            <Briefcase size={20} strokeWidth={2.5} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="brand-text">PrismHire</span>
              <span className="brand-tag">
                {role === 'candidate' ? 'Candidate Hub' : 'Talent Cloud'}
              </span>
            </div>
          </div>
        </div>

        {/* Center Navigation Links */}
        <div className="nav-links">
          {role === 'candidate' ? (
            <>
              <div
                className={`nav-tab ${location.pathname === '/candidate/jobs' ? 'active' : ''}`}
                onClick={() => navigate('/candidate/jobs')}
              >
                <Sparkles size={15} color="var(--primary-light)" />
                <span>Jobs & Recommendations</span>
              </div>
              <div
                className={`nav-tab ${location.pathname === '/candidate/applications' ? 'active' : ''}`}
                onClick={() => navigate('/candidate/applications')}
              >
                <FileText size={15} />
                <span>My Applications</span>
              </div>
              <div
                className={`nav-tab ${location.pathname === '/candidate/profile' ? 'active' : ''}`}
                onClick={() => navigate('/candidate/profile')}
              >
                <User size={15} />
                <span>My Profile</span>
              </div>
              <div
                className={`nav-tab ${location.pathname === '/careers' ? 'active' : ''}`}
                onClick={() => navigate('/careers')}
              >
                <Compass size={15} />
                <span>All Openings</span>
              </div>
            </>
          ) : company ? (
            <>
              <div
                className={`nav-tab ${location.pathname === '/dashboard' ? 'active' : ''}`}
                onClick={() => navigate('/dashboard')}
              >
                Dashboard
              </div>
              <div
                className={`nav-tab ${location.pathname.startsWith('/jobs') ? 'active' : ''}`}
                onClick={() => navigate('/jobs')}
              >
                Requisitions
              </div>
              <div
                className={`nav-tab ${location.pathname.startsWith('/hr') ? 'active' : ''}`}
                onClick={() => navigate('/hr/dashboard')}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Users size={15} color="#818cf8" />
                <span>HR Panel</span>
              </div>
              <div
                className={`nav-tab ${location.pathname === '/careers' ? 'active' : ''}`}
                onClick={() => navigate('/careers')}
              >
                <Compass size={15} />
                <span>Public Job Board</span>
              </div>
            </>
          ) : (
            <>
              <div
                className={`nav-tab ${location.pathname === '/careers' ? 'active' : ''}`}
                onClick={() => navigate('/careers')}
              >
                <Compass size={15} />
                <span>Explore Careers</span>
              </div>
            </>
          )}
        </div>

        {/* Right side profile / action */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {role === 'candidate' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {/* Profile completion badge */}
              <div
                onClick={() => navigate('/candidate/profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: candidate?.profile_completed_percentage >= 80 ? 'var(--success-subtle)' : 'rgba(245, 158, 11, 0.1)',
                  border: `1px solid ${candidate?.profile_completed_percentage >= 80 ? 'rgba(16, 185, 129, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                  fontSize: '12px',
                  fontWeight: 600,
                  color: candidate?.profile_completed_percentage >= 80 ? 'var(--success-light)' : '#f59e0b',
                  cursor: 'pointer',
                }}
                title="Profile completeness"
              >
                <Award size={13} />
                <span>{candidate?.profile_completed_percentage || 0}% Profile</span>
              </div>

              {/* Candidate Info chip */}
              <div
                onClick={() => navigate('/candidate/profile')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                }}
              >
                <div className="avatar-circle" style={{ width: '28px', height: '28px', fontSize: '12px', background: 'var(--primary)' }}>
                  {candidate?.name?.[0]?.toUpperCase() || 'C'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '130px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {candidate?.name || 'Candidate'}
                </div>
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  logout();
                  navigate('/login?role=candidate');
                }}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : company ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="avatar-circle" style={{ width: '28px', height: '28px', fontSize: '12px' }}>
                  {company?.name?.[0]?.toUpperCase() || 'E'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {company?.name}
                </div>
                <ShieldCheck size={14} color="#10b981" />
              </div>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => {
                  logout();
                  navigate('/login');
                }}
                title="Sign out"
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => navigate('/login?role=candidate')}
                style={{ color: 'var(--primary-light)' }}
              >
                Candidate Sign In
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => navigate('/login')}>
                Employer Login
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => navigate('/register')}>
                Post a Job
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
