import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, role }) {
  const { company, candidate, loading } = useAuth();

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div className="spinner" style={{ width: '32px', height: '32px' }} />
      </div>
    );
  }

  // If specific role requested:
  if (role === 'recruiter') {
    if (!company) {
      if (candidate) return <Navigate to="/candidate/jobs" replace />;
      return <Navigate to="/login" replace />;
    }
  } else if (role === 'candidate') {
    if (!candidate) {
      if (company) return <Navigate to="/dashboard" replace />;
      return <Navigate to="/login?role=candidate" replace />;
    }
  } else {
    // Any authenticated user
    if (!company && !candidate) {
      return <Navigate to="/login" replace />;
    }
  }

  return children;
}
