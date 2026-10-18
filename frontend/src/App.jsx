import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Public & Interview Pages
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import CareersPage from './pages/CareersPage';
import ApplyPage from './pages/ApplyPage';
import VoiceInterviewPage from './pages/VoiceInterviewPage';
import DsaInterviewPage from './pages/DsaInterviewPage';
import CandidateStatusPage from './pages/CandidateStatusPage';

// Employer Pages
import DashboardPage from './pages/DashboardPage';
import JobsPage from './pages/JobsPage';
import ApplicationsPage from './pages/ApplicationsPage';

// HR Dedicated Panel
import HrDashboardPage from './pages/HrDashboardPage';

// Candidate Pages
import CandidateJobsPage from './pages/CandidateJobsPage';
import CandidateApplicationsPage from './pages/CandidateApplicationsPage';
import CandidateProfilePage from './pages/CandidateProfilePage';

import './index.css';

// Full-screen loading spinner shown while auth context initializes
function LoadingScreen() {
  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-canvas)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '20px',
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #2563eb, #3b82f6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '24px',
          boxShadow: '0 0 32px rgba(37, 99, 235, 0.5)',
          animation: 'pulse 2s ease-in-out infinite',
        }}
      >
        ⬡
      </div>
      <div className="spinner" style={{ width: '28px', height: '28px' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Initializing PrismHire...</p>
    </div>
  );
}

function HomeRedirect() {
  const { role, loading } = useAuth();
  if (loading) return <LoadingScreen />;
  if (role === 'candidate') return <Navigate to="/candidate/jobs" replace />;
  if (role === 'recruiter') return <Navigate to="/dashboard" replace />;
  return <Navigate to="/careers" replace />;
}

function AppRoutes() {
  const { loading } = useAuth();

  if (loading) return <LoadingScreen />;

  return (
    <Routes>
      {/* Public Careers & Candidate Routes */}
      <Route path="/careers" element={<CareersPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/apply/:jobToken" element={<ApplyPage />} />
      <Route path="/interview/voice/:applicationId" element={<VoiceInterviewPage />} />
      <Route path="/interview/dsa/:applicationId" element={<DsaInterviewPage />} />
      <Route path="/status/:applicationId" element={<CandidateStatusPage />} />

      {/* Candidate Dedicated Portal Routes */}
      <Route
        path="/candidate/jobs"
        element={
          <ProtectedRoute role="candidate">
            <CandidateJobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/dashboard"
        element={<Navigate to="/candidate/jobs" replace />}
      />
      <Route
        path="/candidate/applications"
        element={
          <ProtectedRoute role="candidate">
            <CandidateApplicationsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/candidate/profile"
        element={
          <ProtectedRoute role="candidate">
            <CandidateProfilePage />
          </ProtectedRoute>
        }
      />

      {/* Employer / HR Dedicated Workspace Routes */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="recruiter">
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute role="recruiter">
            <JobsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:jobId/applications"
        element={
          <ProtectedRoute role="recruiter">
            <ApplicationsPage />
          </ProtectedRoute>
        }
      />

      {/* HR Dedicated Orchestration Panel */}
      <Route
        path="/hr/dashboard"
        element={
          <ProtectedRoute role="recruiter">
            <HrDashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/hr/interviews"
        element={
          <ProtectedRoute role="recruiter">
            <HrDashboardPage />
          </ProtectedRoute>
        }
      />

      {/* Default Routing */}
      <Route path="/" element={<HomeRedirect />} />
      <Route path="*" element={<HomeRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#0f172a',
              color: '#f8fafc',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'Plus Jakarta Sans, sans-serif',
              boxShadow: '0 10px 25px rgba(0,0,0,0.4)',
            },
            success: { iconTheme: { primary: '#10b981', secondary: '#090d16' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#090d16' } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
