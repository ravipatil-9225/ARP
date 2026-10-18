import { createContext, useContext, useState, useEffect } from 'react';
import { authApi, candidateApi } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [loading, setLoading] = useState(true);

  // Recruiter state
  const [company, setCompany] = useState(null);

  // Candidate state
  const [candidate, setCandidate] = useState(null);

  // Initialize auth state from localStorage (runs once on mount)
  useEffect(() => {
    try {
      const storedCompany = localStorage.getItem('smarthire_company');
      const storedCandidate = localStorage.getItem('smarthire_candidate');
      if (storedCompany) {
        setCompany(JSON.parse(storedCompany));
      } else if (storedCandidate) {
        setCandidate(JSON.parse(storedCandidate));
      }
    } catch {
      // Clear corrupt storage
      localStorage.removeItem('smarthire_company');
      localStorage.removeItem('smarthire_candidate');
      localStorage.removeItem('smarthire_token');
    } finally {
      setLoading(false);
    }
  }, []);

  // Derive the active role
  const role = candidate ? 'candidate' : company ? 'recruiter' : null;

  // ── Recruiter Auth ─────────────────────────────────────────────────────
  const login = async (email, password) => {
    const res = await authApi.login({ email, password });
    const { access_token, company: companyData } = res.data;
    localStorage.setItem('smarthire_token', access_token);
    localStorage.setItem('smarthire_company', JSON.stringify(companyData));
    localStorage.removeItem('smarthire_candidate');
    setCompany(companyData);
    setCandidate(null);
    return companyData;
  };

  const register = async (data) => {
    const res = await authApi.register(data);
    const { access_token, company: companyData } = res.data;
    localStorage.setItem('smarthire_token', access_token);
    localStorage.setItem('smarthire_company', JSON.stringify(companyData));
    localStorage.removeItem('smarthire_candidate');
    setCompany(companyData);
    setCandidate(null);
    return companyData;
  };

  // ── Candidate Auth ─────────────────────────────────────────────────────
  const candidateLogin = async (email, password) => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('password', password);
    const res = await candidateApi.login(formData);
    const { access_token, user } = res.data;
    localStorage.setItem('smarthire_token', access_token);
    localStorage.setItem('smarthire_candidate', JSON.stringify(user));
    localStorage.removeItem('smarthire_company');
    setCandidate(user);
    setCompany(null);
    return user;
  };

  const candidateRegister = async ({ name, email, password, phone }) => {
    const formData = new FormData();
    formData.append('name', name);
    formData.append('email', email);
    formData.append('password', password);
    if (phone) formData.append('phone', phone);
    const res = await candidateApi.register(formData);
    const { access_token, user } = res.data;
    localStorage.setItem('smarthire_token', access_token);
    localStorage.setItem('smarthire_candidate', JSON.stringify(user));
    localStorage.removeItem('smarthire_company');
    setCandidate(user);
    setCompany(null);
    return user;
  };

  const updateCandidateState = (updatedUser) => {
    localStorage.setItem('smarthire_candidate', JSON.stringify(updatedUser));
    setCandidate(updatedUser);
  };

  // ── Logout ─────────────────────────────────────────────────────────────
  const logout = () => {
    localStorage.removeItem('smarthire_token');
    localStorage.removeItem('smarthire_company');
    localStorage.removeItem('smarthire_candidate');
    setCompany(null);
    setCandidate(null);
  };

  return (
    <AuthContext.Provider
      value={{
        company,
        candidate,
        role,
        login,
        register,
        candidateLogin,
        candidateRegister,
        updateCandidateState,
        logout,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};
