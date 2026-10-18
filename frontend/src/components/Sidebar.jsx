import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Briefcase,
  Compass,
  Building2,
  LogOut,
  ShieldCheck,
  ChevronRight,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function Sidebar({ active }) {
  const navigate = useNavigate();
  const { logout, company } = useAuth();

  const handleLogout = () => {
    logout();
    toast.success('Signed out successfully');
    navigate('/login');
  };

  const navItems = [
    { id: 'dashboard', path: '/dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'jobs', path: '/jobs', icon: Briefcase, label: 'Job Requisitions' },
    { id: 'careers', path: '/careers', icon: Compass, label: 'Careers Portal' },
  ];

  return (
    <aside className="sidebar">
      {/* Company info card */}
      <div className="sidebar-company-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div className="avatar-circle">
            {company?.name?.[0]?.toUpperCase() || <Building2 size={16} />}
          </div>
          <div style={{ overflow: 'hidden', flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span
                style={{
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {company?.name || 'Workspace'}
              </span>
              <ShieldCheck size={13} color="#10b981" />
            </div>
            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '1px' }}>
              {company?.industry || 'Verified Employer'}
            </div>
          </div>
        </div>
      </div>

      <div className="sidebar-section-title">Navigation</div>

      {/* Nav items */}
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive = active === item.id;
        return (
          <div
            key={item.id}
            className={`sidebar-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(item.path)}
          >
            <Icon size={18} strokeWidth={isActive ? 2.2 : 1.8} />
            <span style={{ flex: 1 }}>{item.label}</span>
            {isActive && <ChevronRight size={14} opacity={0.6} />}
          </div>
        );
      })}

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Footer / Sign Out */}
      <div className="sidebar-footer">
        <div
          className="sidebar-item"
          onClick={handleLogout}
          style={{ color: 'var(--danger-light)' }}
        >
          <LogOut size={18} strokeWidth={1.8} />
          <span>Sign Out</span>
        </div>
      </div>
    </aside>
  );
}
