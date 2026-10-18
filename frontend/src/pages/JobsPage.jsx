import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi } from '../api/client';
import Sidebar from '../components/Sidebar';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import {
  Briefcase,
  Plus,
  Search,
  Users,
  Copy,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  Sliders,
  ChevronRight,
  ShieldCheck,
  X,
  Award,
  Lock,
  ArrowDown,
  Code2,
  Mic,
  Terminal,
  Layers,
  Bug,
  GripVertical,
  Trash2,
  FileText,
} from 'lucide-react';

const SKILLS_SUGGESTIONS = [
  'React',
  'Node.js',
  'Python',
  'FastAPI',
  'TypeScript',
  'MongoDB',
  'PostgreSQL',
  'AWS',
  'Docker',
  'Machine Learning',
  'System Design',
  'Data Structures',
];

const SOFTWARE_PIPELINE_TEMPLATES = {
  fullstack_standard: {
    id: 'fullstack_standard',
    label: 'Fullstack / Backend Standard',
    desc: '4 Stages: Resume -> Voice AI Screen -> DSA Coding -> Executive HR',
    stages: [
      { id: 'st_resume', type: 'resume_vetting', name: 'Resume Qualifications Vetting', desc: 'AI keyword & competency alignment', required: true, locked: true },
      { id: 'st_voice', type: 'voice_ai_tech', name: 'AI Technical Voice Screen', desc: 'Adaptive verbal technical assessment', required: true, locked: false },
      { id: 'st_dsa', type: 'dsa_coding', name: 'Algorithmic Coding (DSA)', desc: 'Interactive IDE data structures problem', required: true, locked: false },
      { id: 'st_hr', type: 'hr_interview', name: 'Executive HR & Offer', desc: 'Behavioral, cultural fit & final offer', required: true, locked: true },
    ],
  },
  junior_campus: {
    id: 'junior_campus',
    label: 'Junior / Campus Developer',
    desc: '4 Stages: Resume -> CS Fundamentals MCQs -> Core DSA -> Executive HR',
    stages: [
      { id: 'st_resume', type: 'resume_vetting', name: 'Resume Qualifications Vetting', desc: 'AI competency alignment', required: true, locked: true },
      { id: 'st_mcq', type: 'tech_mcq', name: 'CS Fundamentals & Syntax MCQs', desc: 'Timed test on OOP, OS, DBMS & Web concepts', required: true, locked: false },
      { id: 'st_dsa', type: 'dsa_coding', name: 'Core Algorithmic Coding', desc: 'Foundational problem solving & test execution', required: true, locked: false },
      { id: 'st_hr', type: 'hr_interview', name: 'Executive HR & Offer', desc: 'Aptitude, culture & offer negotiation', required: true, locked: true },
    ],
  },
  senior_architect: {
    id: 'senior_architect',
    label: 'Senior / Staff & Architect',
    desc: '5 Stages: Resume -> Tech Voice -> DSA -> System Design (HLD) -> Executive HR',
    stages: [
      { id: 'st_resume', type: 'resume_vetting', name: 'Resume Qualifications Vetting', desc: 'Seniority & stack vetting', required: true, locked: true },
      { id: 'st_voice', type: 'voice_ai_tech', name: 'AI Technical Voice Deep-Dive', desc: 'Microservices, scalability & trade-offs', required: true, locked: false },
      { id: 'st_dsa', type: 'dsa_coding', name: 'Advanced DSA Problem Solving', desc: 'Complex algorithms & performance optimization', required: true, locked: false },
      { id: 'st_design', type: 'system_design', name: 'System Design (HLD / LLD)', desc: 'Scalable distributed systems & DB architecture', required: true, locked: false },
      { id: 'st_hr', type: 'hr_interview', name: 'Executive HR & Offer', desc: 'Leadership alignment, salary & executive offer', required: true, locked: true },
    ],
  },
  frontend_ui: {
    id: 'frontend_ui',
    label: 'Frontend / UI Engineer',
    desc: '4 Stages: Resume -> Web Core MCQs -> Take-Home UI Challenge -> Executive HR',
    stages: [
      { id: 'st_resume', type: 'resume_vetting', name: 'Resume Qualifications Vetting', desc: 'UI/UX & web portfolio review', required: true, locked: true },
      { id: 'st_mcq', type: 'tech_mcq', name: 'Modern Web & React MCQs', desc: 'DOM, React lifecycle, CSS & state management', required: true, locked: false },
      { id: 'st_takehome', type: 'take_home_code', name: 'Interactive UI Challenge', desc: 'Component architecture & responsive build', required: true, locked: false },
      { id: 'st_hr', type: 'hr_interview', name: 'Executive HR & Offer', desc: 'Design taste, teamwork & offer review', required: true, locked: true },
    ],
  },
  devops_cloud: {
    id: 'devops_cloud',
    label: 'DevOps / Cloud & SRE',
    desc: '4 Stages: Resume -> Cloud Voice Screen -> Live Infra Debugging -> Executive HR',
    stages: [
      { id: 'st_resume', type: 'resume_vetting', name: 'Resume Qualifications Vetting', desc: 'Cloud certification & infra experience', required: true, locked: true },
      { id: 'st_voice', type: 'voice_ai_tech', name: 'AI Cloud & DevOps Voice Screen', desc: 'Docker, K8s, CI/CD & AWS/GCP architecture', required: true, locked: false },
      { id: 'st_debug', type: 'debugging_round', name: 'Infra Scripting & Bug-Hunt', desc: 'Log analysis, script debugging & config repair', required: true, locked: false },
      { id: 'st_hr', type: 'hr_interview', name: 'Executive HR & Offer', desc: 'On-call expectation, fit & offer', required: true, locked: true },
    ],
  },
};

const AVAILABLE_SOFTWARE_BLOCKS = [
  { type: 'voice_ai_tech', name: 'AI Technical Voice Screen', desc: 'Verbal technical Q&A on framework & architecture concepts', icon: Mic },
  { type: 'dsa_coding', name: 'Algorithmic Coding (DSA)', desc: 'Interactive browser IDE with live test-case runner', icon: Code2 },
  { type: 'tech_mcq', name: 'CS & Stack MCQs', desc: 'Timed objective assessment on algorithms, OS, DBMS & syntax', icon: Terminal },
  { type: 'system_design', name: 'System Design (HLD/LLD)', desc: 'Architectural design, scalability & schema evaluation', icon: Layers },
  { type: 'take_home_code', name: 'Take-Home Project / Repo', desc: 'Mini-project repository evaluation for code cleanliness', icon: FileText },
  { type: 'debugging_round', name: 'Live Bug-Hunt / Refactor', desc: 'Hands-on debugging and unit test recovery under time limit', icon: Bug },
];

export default function JobsPage() {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [skillInput, setSkillInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedTemplateKey, setSelectedTemplateKey] = useState('fullstack_standard');
  const [pipeline, setPipeline] = useState(SOFTWARE_PIPELINE_TEMPLATES.fullstack_standard.stages);

  const [form, setForm] = useState({
    title: '',
    description: '',
    required_skills: [],
    min_experience_years: 0,
    education_requirement: '',
    interview_type: 'off_campus',
    meeting_platform: 'google_meet',
    dsa_problem_count: 1,
    cutoffs: { resume_score: 65, voice_interview_score: 60, dsa_round_score: 55 },
  });

  const fetchJobs = () => {
    setLoading(true);
    jobsApi
      .list()
      .then((res) => setJobs(res.data))
      .catch(() => toast.error('Failed to load job requisitions'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const addSkill = (skill) => {
    const s = skill.trim();
    if (s && !form.required_skills.includes(s)) {
      setForm((p) => ({ ...p, required_skills: [...p.required_skills, s] }));
    }
    setSkillInput('');
  };

  const removeSkill = (skill) => {
    setForm((p) => ({
      ...p,
      required_skills: p.required_skills.filter((s) => s !== skill),
    }));
  };

  const selectTemplate = (key) => {
    setSelectedTemplateKey(key);
    if (key !== 'custom' && SOFTWARE_PIPELINE_TEMPLATES[key]) {
      setPipeline(SOFTWARE_PIPELINE_TEMPLATES[key].stages);
    }
  };

  const addIntermediateStage = (block) => {
    setSelectedTemplateKey('custom');
    const newStage = {
      id: `st_${Date.now()}`,
      type: block.type,
      name: block.name,
      desc: block.desc,
      required: true,
      locked: false,
    };
    // Insert right before the last stage (which is locked HR round)
    setPipeline((prev) => {
      const copy = [...prev];
      copy.splice(copy.length - 1, 0, newStage);
      return copy;
    });
    toast.success(`Added ${block.name} to pipeline!`);
  };

  const removeIntermediateStage = (index) => {
    setSelectedTemplateKey('custom');
    setPipeline((prev) => prev.filter((_, i) => i !== index));
    toast.success('Stage removed from pipeline');
  };

  const moveStage = (fromIndex, toIndex) => {
    // Cannot move beyond the first or last stage (locked boundaries)
    if (toIndex <= 0 || toIndex >= pipeline.length - 1) return;
    setSelectedTemplateKey('custom');
    setPipeline((prev) => {
      const copy = [...prev];
      const [moved] = copy.splice(fromIndex, 1);
      copy.splice(toIndex, 0, moved);
      return copy;
    });
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Please enter a role title');
      return;
    }
    if (!form.description.trim()) {
      toast.error('Please enter a job description');
      return;
    }

    setCreating(true);
    try {
      const payload = {
        ...form,
        pipeline,
      };
      const res = await jobsApi.create(payload);
      setJobs((p) => [res.data, ...p]);
      setShowModal(false);
      resetForm();
      toast.success('Requisition created! Public link is live 🚀');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create job');
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setForm({
      title: '',
      description: '',
      required_skills: [],
      min_experience_years: 0,
      education_requirement: '',
      interview_type: 'off_campus',
      meeting_platform: 'google_meet',
      dsa_problem_count: 1,
      cutoffs: { resume_score: 65, voice_interview_score: 60, dsa_round_score: 55 },
    });
    setSelectedTemplateKey('fullstack_standard');
    setPipeline(SOFTWARE_PIPELINE_TEMPLATES.fullstack_standard.stages);
  };

  const copyLink = (link) => {
    navigator.clipboard.writeText(link);
    toast.success('Candidate application link copied to clipboard!');
  };

  const toggleJob = async (job) => {
    try {
      const res = await jobsApi.toggle(job.id);
      setJobs((p) =>
        p.map((j) => (j.id === job.id ? { ...j, is_active: res.data.is_active } : j))
      );
      toast.success(res.data.is_active ? 'Requisition activated' : 'Requisition paused');
    } catch {
      toast.error('Failed to update requisition status');
    }
  };

  const setField = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const setCutoff = (key) => (e) =>
    setForm((p) => ({ ...p, cutoffs: { ...p.cutoffs, [key]: Number(e.target.value) } }));

  // Filtering
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !searchTerm ||
      job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      job.required_skills?.some((s) => s.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && job.is_active) ||
      (statusFilter === 'paused' && !job.is_active);

    return matchesSearch && matchesStatus;
  });

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Navbar />
      <div className="dashboard-layout">
        <Sidebar active="jobs" />
        <main className="dashboard-content">
          {/* Header */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '16px',
              marginBottom: '28px',
            }}
            className="fade-in"
          >
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Job Requisitions</h1>
                <span className="brand-tag">Positions</span>
              </div>
              <p style={{ fontSize: '0.875rem' }}>
                Manage live career openings, qualification benchmarks, and applicant pipelines.
              </p>
            </div>

            <button className="btn btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} />
              <span>Create New Requisition</span>
            </button>
          </div>

          {/* Filter Bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '12px',
              marginBottom: '24px',
            }}
          >
            {/* Search */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'var(--bg-card)',
                border: '1px solid var(--border-medium)',
                borderRadius: 'var(--radius-sm)',
                padding: '6px 14px',
                width: '100%',
                maxWidth: '380px',
              }}
            >
              <Search size={16} color="var(--text-muted)" />
              <input
                type="text"
                placeholder="Filter by title, skill, or keyword..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  outline: 'none',
                  width: '100%',
                }}
              />
            </div>

            {/* Status Tabs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {['all', 'active', 'paused'].map((st) => (
                <button
                  key={st}
                  className={`btn btn-sm ${
                    statusFilter === st ? 'btn-primary' : 'btn-secondary'
                  }`}
                  onClick={() => setStatusFilter(st)}
                  style={{ textTransform: 'capitalize' }}
                >
                  {st} ({jobs.filter((j) => st === 'all' || (st === 'active' ? j.is_active : !j.is_active)).length})
                </button>
              ))}
            </div>
          </div>

          {/* Job List */}
          {loading ? (
            <div className="loading-overlay">
              <div className="spinner" style={{ width: 44, height: 44 }} />
              <p>Loading job requisitions...</p>
            </div>
          ) : filteredJobs.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {filteredJobs.map((job) => (
                <div
                  key={job.id}
                  className="card card-hoverable fade-in"
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '20px',
                    padding: '22px 26px',
                  }}
                >
                  <div style={{ flex: 1, minWidth: '300px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <span className={`badge ${job.is_active ? 'badge-green' : 'badge-gray'}`}>
                        <span className="badge-dot" />
                        <span>{job.is_active ? 'Accepting Applications' : 'Paused / Inactive'}</span>
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Created {new Date(job.created_at).toLocaleDateString()}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: '1.25rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '8px',
                        cursor: 'pointer',
                      }}
                      onClick={() => navigate(`/jobs/${job.id}/applications`)}
                    >
                      {job.title}
                    </h3>

                    {/* Meta tags */}
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                      <span className="badge badge-blue">
                        <Briefcase size={12} />
                        <span>{job.interview_type ? job.interview_type.replace('_', ' ') : 'Full-time'}</span>
                      </span>
                      <span className="badge badge-gray">
                        <Clock size={12} />
                        <span>{job.min_experience_years > 0 ? `${job.min_experience_years}+ Yrs Exp` : 'Any Experience'}</span>
                      </span>
                      {job.education_requirement && (
                        <span className="badge badge-gray">
                          <Award size={12} />
                          <span>{job.education_requirement}</span>
                        </span>
                      )}
                    </div>

                    <p
                      style={{
                        fontSize: '0.875rem',
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        marginBottom: '14px',
                        maxWidth: '720px',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {job.description}
                    </p>

                    {/* Skill chips */}
                    {job.required_skills?.length > 0 && (
                      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        {job.required_skills.map((s) => (
                          <span
                            key={s}
                            style={{
                              fontSize: '0.75rem',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-xs)',
                              background: 'rgba(255,255,255,0.04)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-secondary)',
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Pipeline Stages Strip */}
                    {job.pipeline?.length > 0 && (
                      <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary-light)', marginRight: '2px' }}>
                          Pipeline ({job.pipeline.length}):
                        </span>
                        {job.pipeline.map((stage, sIdx) => (
                          <span
                            key={stage.id || sIdx}
                            style={{
                              fontSize: '0.6875rem',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-full)',
                              background: 'rgba(59, 130, 246, 0.08)',
                              border: '1px solid rgba(59, 130, 246, 0.25)',
                              color: '#93c5fd',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                            }}
                          >
                            <span style={{ fontWeight: 700, opacity: 0.8 }}>{sIdx + 1}.</span>
                            <span>{stage.name}</span>
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Actions & Stats */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => toggleJob(job)}
                      >
                        {job.is_active ? 'Pause' : 'Activate'}
                      </button>

                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate(`/jobs/${job.id}/applications`)}
                      >
                        <Users size={14} />
                        <span>View Candidates ({job.application_count || 0})</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => copyLink(job.apply_link)}
                        title="Copy candidate application link"
                      >
                        <Copy size={13} />
                        <span>Copy Apply Link</span>
                      </button>

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => window.open(job.apply_link, '_blank')}
                        title="Preview candidate application view"
                      >
                        <ExternalLink size={13} />
                        <span>Candidate View</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              className="card"
              style={{
                textAlign: 'center',
                padding: '56px 24px',
                border: '1px dashed var(--border-medium)',
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: 'var(--radius-md)',
                  background: 'rgba(37, 99, 235, 0.1)',
                  color: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Briefcase size={26} />
              </div>
              <h3 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>No Job Requisitions Found</h3>
              <p style={{ fontSize: '0.875rem', maxWidth: '420px', margin: '0 auto 20px' }}>
                Create your first opening to start receiving and screening candidate applications automatically.
              </p>
              <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                <Plus size={16} />
                <span>Create New Requisition</span>
              </button>
            </div>
          )}

          {/* Create Job Requisition Modal */}
          {showModal && (
            <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
              <div className="modal" style={{ maxWidth: '680px' }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '20px',
                    paddingBottom: '14px',
                    borderBottom: '1px solid var(--border-subtle)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '36px',
                        height: '36px',
                        borderRadius: 'var(--radius-sm)',
                        background: 'rgba(37, 99, 235, 0.15)',
                        color: 'var(--primary-light)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Briefcase size={20} />
                    </div>
                    <div>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>Post New Requisition</h2>
                      <p style={{ fontSize: '0.8125rem' }}>Configure role requirements and automated grading criteria</p>
                    </div>
                  </div>
                  <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                    <X size={18} />
                  </button>
                </div>

                <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
                  {/* Title */}
                  <div className="form-group">
                    <label className="label">Role Title *</label>
                    <input
                      className="input"
                      type="text"
                      placeholder="e.g. Senior Full Stack Engineer, Product Designer"
                      value={form.title}
                      onChange={setField('title')}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="form-group">
                    <label className="label">Role Overview & Responsibilities *</label>
                    <textarea
                      className="textarea"
                      placeholder="Detail the expectations, responsibilities, and team impact for this opening..."
                      value={form.description}
                      onChange={setField('description')}
                      style={{ minHeight: '100px' }}
                      required
                    />
                  </div>

                  {/* Two column: Experience & Education */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="label">Minimum Experience (Years)</label>
                      <input
                        className="input"
                        type="number"
                        min="0"
                        step="0.5"
                        value={form.min_experience_years}
                        onChange={setField('min_experience_years')}
                      />
                    </div>
                    <div className="form-group">
                      <label className="label">Education Benchmark</label>
                      <input
                        className="input"
                        type="text"
                        placeholder="e.g. B.Tech / BS in CS or equivalent"
                        value={form.education_requirement}
                        onChange={setField('education_requirement')}
                      />
                    </div>
                  </div>

                  {/* Interview Type & Meeting Platform */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="label">Interview Model</label>
                      <select className="select" value={form.interview_type} onChange={setField('interview_type')}>
                        <option value="off_campus">Full-time / Off-Campus</option>
                        <option value="on_campus">University / Campus Drive</option>
                      </select>
                    </div>
                    <div className="form-group">
                      <label className="label">Virtual Meeting Platform</label>
                      <select className="select" value={form.meeting_platform} onChange={setField('meeting_platform')}>
                        <option value="google_meet">Google Meet</option>
                        <option value="microsoft_teams">Microsoft Teams</option>
                      </select>
                    </div>
                  </div>

                  {/* Skills selector */}
                  <div className="form-group">
                    <label className="label">Target Technical Skills</label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <input
                        className="input"
                        type="text"
                        placeholder="Type skill & press Enter (e.g. React, Python)"
                        value={skillInput}
                        onChange={(e) => setSkillInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSkill(skillInput);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => addSkill(skillInput)}
                      >
                        Add
                      </button>
                    </div>

                    {/* Skill chips */}
                    {form.required_skills.length > 0 && (
                      <div className="tags-container" style={{ marginTop: '8px' }}>
                        {form.required_skills.map((skill) => (
                          <span key={skill} className="tag-chip">
                            <span>{skill}</span>
                            <span className="tag-remove-btn" onClick={() => removeSkill(skill)}>
                              <X size={12} />
                            </span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Suggested pills */}
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '6px' }}>
                      <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Suggestions:</span>
                      {SKILLS_SUGGESTIONS.filter((s) => !form.required_skills.includes(s)).slice(0, 6).map((s) => (
                        <button
                          key={s}
                          type="button"
                          className="btn btn-ghost btn-sm"
                          style={{ padding: '2px 8px', fontSize: '0.6875rem' }}
                          onClick={() => addSkill(s)}
                        >
                          + {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* ── Custom Software Assessment Pipeline Builder ── */}
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-medium)',
                      borderRadius: 'var(--radius-md)',
                      padding: '20px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: 'rgba(37,99,235,0.15)',
                            color: 'var(--primary-light)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Layers size={16} />
                        </div>
                        <div>
                          <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, margin: 0 }}>
                            Custom Software Assessment Pipeline
                          </h4>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Resume & HR rounds are locked corporate anchors. Customize intermediate tech evaluations.
                          </span>
                        </div>
                      </div>
                      <span className="brand-tag" style={{ fontSize: '0.6875rem' }}>
                        {pipeline.length} Assessment Stages
                      </span>
                    </div>

                    {/* Preset Template Selector */}
                    <div style={{ marginBottom: '18px' }}>
                      <label className="label" style={{ fontSize: '0.75rem', marginBottom: '6px' }}>
                        Choose Software Role Template or Build Custom:
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                        {Object.entries(SOFTWARE_PIPELINE_TEMPLATES).map(([key, tpl]) => {
                          const isSelected = selectedTemplateKey === key;
                          return (
                            <button
                              key={key}
                              type="button"
                              onClick={() => selectTemplate(key)}
                              style={{
                                textAlign: 'left',
                                padding: '10px 12px',
                                borderRadius: 'var(--radius-sm)',
                                background: isSelected ? 'rgba(37,99,235,0.12)' : 'rgba(255,255,255,0.02)',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                                color: isSelected ? 'var(--primary-light)' : 'var(--text-secondary)',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                              }}
                            >
                              <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{tpl.label}</div>
                              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                                {tpl.stages.length} Stages
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Visual Pipeline Stack */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '18px' }}>
                      {pipeline.map((stage, idx) => {
                        const isFirst = idx === 0;
                        const isLast = idx === pipeline.length - 1;
                        const isLocked = stage.locked;

                        return (
                          <div
                            key={stage.id}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '10px 14px',
                              borderRadius: 'var(--radius-sm)',
                              background: isLocked ? 'rgba(255,255,255,0.04)' : 'rgba(37,99,235,0.05)',
                              border: isLocked ? '1px dashed var(--border-medium)' : '1px solid rgba(37,99,235,0.3)',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <span
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '50%',
                                  background: isLocked ? 'rgba(255,255,255,0.08)' : 'var(--primary)',
                                  color: '#fff',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                }}
                              >
                                {idx + 1}
                              </span>

                              <div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                                    {stage.name}
                                  </span>
                                  {isLocked && (
                                    <span
                                      className="badge badge-gray"
                                      style={{ fontSize: '0.625rem', padding: '1px 6px', gap: '3px' }}
                                    >
                                      <Lock size={10} />
                                      <span>Fixed Anchor</span>
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                  {stage.desc}
                                </div>
                              </div>
                            </div>

                            {/* Actions on stage */}
                            {!isLocked && (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                {idx > 1 && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '4px' }}
                                    title="Move Up"
                                    onClick={() => moveStage(idx, idx - 1)}
                                  >
                                    ↑
                                  </button>
                                )}
                                {idx < pipeline.length - 2 && (
                                  <button
                                    type="button"
                                    className="btn btn-ghost btn-sm"
                                    style={{ padding: '4px' }}
                                    title="Move Down"
                                    onClick={() => moveStage(idx, idx + 1)}
                                  >
                                    ↓
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  style={{ padding: '4px', color: 'var(--danger-light)' }}
                                  title="Remove Stage"
                                  onClick={() => removeIntermediateStage(idx)}
                                >
                                  <Trash2 size={13} />
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Add Intermediate Evaluation Block */}
                    <div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '8px' }}>
                        + Add Software Assessment Block into Pipeline:
                      </span>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px' }}>
                        {AVAILABLE_SOFTWARE_BLOCKS.map((block) => {
                          const Icon = block.icon;
                          const alreadyIn = pipeline.some((st) => st.type === block.type);

                          return (
                            <button
                              key={block.type}
                              type="button"
                              onClick={() => addIntermediateStage(block)}
                              disabled={alreadyIn}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                padding: '8px 10px',
                                borderRadius: 'var(--radius-sm)',
                                background: alreadyIn ? 'rgba(255,255,255,0.01)' : 'rgba(255,255,255,0.03)',
                                border: '1px solid var(--border-subtle)',
                                color: alreadyIn ? 'var(--text-muted)' : 'var(--text-primary)',
                                cursor: alreadyIn ? 'not-allowed' : 'pointer',
                                textAlign: 'left',
                              }}
                            >
                              <div
                                style={{
                                  width: '24px',
                                  height: '24px',
                                  borderRadius: '4px',
                                  background: alreadyIn ? 'rgba(255,255,255,0.05)' : 'rgba(37,99,235,0.15)',
                                  color: alreadyIn ? 'var(--text-muted)' : 'var(--primary-light)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  flexShrink: 0,
                                }}
                              >
                                <Icon size={13} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {block.name}
                                </div>
                                <div style={{ fontSize: '0.625rem', color: 'var(--text-muted)' }}>
                                  {alreadyIn ? 'Already Added' : 'Click to add'}
                                </div>
                              </div>
                              {!alreadyIn && <Plus size={13} color="var(--primary-light)" />}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-sm)',
                      padding: '16px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
                      <Sliders size={16} color="var(--primary-light)" />
                      <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        Assessment Passing Cutoffs (%)
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                      <div className="form-group">
                        <label className="label" style={{ fontSize: '0.6875rem' }}>Resume Vetting</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="100"
                          value={form.cutoffs.resume_score}
                          onChange={setCutoff('resume_score')}
                        />
                      </div>
                      <div className="form-group">
                        <label className="label" style={{ fontSize: '0.6875rem' }}>Voice Round</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="100"
                          value={form.cutoffs.voice_interview_score}
                          onChange={setCutoff('voice_interview_score')}
                        />
                      </div>
                      <div className="form-group">
                        <label className="label" style={{ fontSize: '0.6875rem' }}>DSA Coding</label>
                        <input
                          className="input"
                          type="number"
                          min="0"
                          max="100"
                          value={form.cutoffs.dsa_round_score}
                          onChange={setCutoff('dsa_round_score')}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      gap: '12px',
                      marginTop: '8px',
                      paddingTop: '16px',
                      borderTop: '1px solid var(--border-subtle)',
                    }}
                  >
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setShowModal(false)}
                      disabled={creating}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={creating}
                    >
                      {creating ? (
                        <>
                          <span className="spinner" />
                          <span>Publishing...</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={16} />
                          <span>Publish Requisition</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
