import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('smarthire_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 → redirect to login
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('smarthire_token');
      localStorage.removeItem('smarthire_company');
      localStorage.removeItem('smarthire_candidate');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;

// ── Auth ──────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post('/api/auth/register', data),
  login: (data) => api.post('/api/auth/login', data),
  me: () => api.get('/api/auth/me'),
};

// ── Jobs ──────────────────────────────────────────────
export const jobsApi = {
  create: (data) => api.post('/api/jobs/', data),
  list: () => api.get('/api/jobs/'),
  get: (id) => api.get(`/api/jobs/${id}`),
  toggle: (id) => api.put(`/api/jobs/${id}/toggle`),
  delete: (id) => api.delete(`/api/jobs/${id}`),
  getPublic: (token) => api.get(`/api/jobs/public/${token}`),
  explore: () => api.get('/api/jobs/public/explore/all'),
};

// ── Applications ──────────────────────────────────────
export const applicationsApi = {
  apply: (jobToken, formData) =>
    api.post(`/api/applications/apply/${jobToken}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  listForJob: (jobId) => api.get(`/api/applications/job/${jobId}`),
  get: (id) => api.get(`/api/applications/${id}`),
  setHrScore: (id, score, notes) => api.post(`/api/applications/${id}/hr-score`, null, {
    params: { score, notes },
  }),
  finalize: (id, decision) => api.post(`/api/applications/${id}/finalize`, null, {
    params: { decision },
  }),
  getPublicStatus: (id) => api.get(`/api/applications/status/${id}/public`),
};

// ── Analytics ─────────────────────────────────────────
export const analyticsApi = {
  dashboard: () => api.get('/api/analytics/dashboard'),
  jobFunnel: (jobId) => api.get(`/api/analytics/job/${jobId}/funnel`),
};

// ── Round 1: Voice Interview ─────────────────────────
export const voiceApi = {
  getSession: (applicationId) => api.get(`/api/voice/${applicationId}/session`),
  submitAnswer: (applicationId, data) => api.post(`/api/voice/${applicationId}/answer`, data),
};

// ── Round 2: DSA Assessment ──────────────────────────
export const dsaApi = {
  getSession: (applicationId) => api.get(`/api/dsa/${applicationId}/session`),
  runCode: (applicationId, data) => api.post(`/api/dsa/${applicationId}/run`, data),
  submitCode: (applicationId, data) => api.post(`/api/dsa/${applicationId}/submit`, data),
  finalize: (applicationId) => api.post(`/api/dsa/${applicationId}/finalize`),
};

// ── Round 3: HR Round & Scheduling ───────────────────
export const hrApi = {
  getQueue: (statusFilter) => api.get('/api/hr/queue/cleared', { params: statusFilter ? { status_filter: statusFilter } : {} }),
  batchSchedule: (data) => api.post('/api/hr/schedule/batch', data),
  singleSchedule: (data) => api.post('/api/hr/schedule/single', data),
  schedule: (applicationId, data) => api.post(`/api/hr/${applicationId}/schedule`, data),
  getSummary: (applicationId) => api.get(`/api/hr/${applicationId}/summary`),
  evaluate: (applicationId, data) => api.post(`/api/hr/${applicationId}/evaluate`, data),
};

// ── Candidate Auth & Profile ─────────────────────────
export const candidateApi = {
  register: (formData) =>
    api.post('/api/candidate/register', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  login: (formData) =>
    api.post('/api/candidate/login', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  getProfile: () => api.get('/api/candidate/profile'),
  updateProfile: (formData) =>
    api.put('/api/candidate/profile', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadResume: (formData) =>
    api.post('/api/candidate/profile/resume', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  apply: (jobId) => api.post(`/api/candidate/apply/${jobId}`),
  getMyApplications: () => api.get('/api/candidate/applications'),
  getRecommendations: () => api.get('/api/candidate/jobs/recommendations'),
};

// ── Proctoring & Security ────────────────────────────
export const proctorApi = {
  startSession: (appId, sessionType = 'voice') =>
    api.post(`/api/proctor/${appId}/session/start?session_type=${sessionType}`),
  recordConsent: (appId, data) => api.post(`/api/proctor/${appId}/consent`, data),
  logEvents: (appId, data) => api.post(`/api/proctor/${appId}/events`, data),
  uploadSnapshot: (appId, formData) =>
    api.post(`/api/proctor/${appId}/snapshot`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  uploadAudioAnomaly: (appId, formData) =>
    api.post(`/api/proctor/${appId}/audio-anomaly`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  finalizeSession: (appId, data = {}) => api.post(`/api/proctor/${appId}/session/finalize`, data),
  getReport: (appId) => api.get(`/api/proctor/${appId}/report`),
};

