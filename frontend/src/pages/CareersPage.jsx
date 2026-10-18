import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { jobsApi, applicationsApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import {
  Briefcase,
  Search,
  MapPin,
  Clock,
  Sparkles,
  ExternalLink,
  Building2,
  CheckCircle2,
  ChevronRight,
  Share2,
  Award,
} from 'lucide-react';
import toast from 'react-hot-toast';

export default function CareersPage() {
  const navigate = useNavigate();
  const { candidate } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('');
  const [selectedExp, setSelectedExp] = useState('all');

  useEffect(() => {
    setLoading(true);
    jobsApi
      .explore()
      .then((res) => setJobs(res.data || []))
      .catch(() => {
        // Fallback to sample public demo listings if explore endpoint has no jobs yet
        setJobs([]);
      })
      .finally(() => setLoading(false));

    // Fetch applied job IDs if candidate is logged in
    if (candidate) {
      import('../api/client').then(({ candidateApi }) => {
        candidateApi
          .getMyApplications?.()
          .then((res) => {
            const ids = new Set((res.data || []).map((a) => String(a.job_id)));
            setAppliedJobIds(ids);
          })
          .catch(() => {});
      });
    }
  }, [candidate]);

  const copyShareLink = (job) => {
    const link = job.apply_link || `${window.location.origin}/apply/${job.job_token}`;
    navigator.clipboard.writeText(link);
    toast.success('Application link copied to clipboard!');
  };

  // Filter jobs
  const filteredJobs = jobs.filter((job) => {
    const matchesSearch =
      !search ||
      job.title?.toLowerCase().includes(search.toLowerCase()) ||
      job.company_name?.toLowerCase().includes(search.toLowerCase()) ||
      job.description?.toLowerCase().includes(search.toLowerCase()) ||
      job.required_skills?.some((s) => s.toLowerCase().includes(search.toLowerCase()));

    const matchesSkill =
      !selectedSkill ||
      job.required_skills?.some((s) => s.toLowerCase() === selectedSkill.toLowerCase());

    const exp = job.min_experience_years || 0;
    const matchesExp =
      selectedExp === 'all' ||
      (selectedExp === 'entry' && exp <= 1) ||
      (selectedExp === 'mid' && exp > 1 && exp <= 4) ||
      (selectedExp === 'senior' && exp > 4);

    return matchesSearch && matchesSkill && matchesExp;
  });

  // Extract all unique skills across active jobs
  const allSkills = Array.from(
    new Set(jobs.flatMap((j) => j.required_skills || []))
  ).slice(0, 10);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Navbar />

      {/* Hero Banner */}
      <section
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          background: 'linear-gradient(180deg, rgba(14, 21, 38, 0.7) 0%, rgba(9, 13, 22, 1) 100%)',
          padding: '64px 24px 56px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '820px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '6px 14px',
              borderRadius: 'var(--radius-full)',
              background: 'rgba(37, 99, 235, 0.1)',
              border: '1px solid rgba(37, 99, 235, 0.25)',
              color: 'var(--primary-light)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '20px',
            }}
          >
            <Sparkles size={14} />
            <span>PrismHire Official Careers & Talent Portal</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(2rem, 4vw, 3rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              marginBottom: '16px',
              lineHeight: 1.15,
            }}
          >
            Find Your Next High-Impact Career Move
          </h1>

          <p
            style={{
              fontSize: '1.125rem',
              color: 'var(--text-secondary)',
              maxWidth: '640px',
              margin: '0 auto 36px',
            }}
          >
            Explore verified opportunities at top-tier companies. Transparent requirements, direct
            application review, and fast-track hiring pipelines.
          </p>

          {/* Search bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              maxWidth: '680px',
              margin: '0 auto',
              background: 'var(--bg-card)',
              border: '1px solid var(--border-medium)',
              borderRadius: 'var(--radius-md)',
              padding: '6px 10px 6px 16px',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <Search size={18} color="var(--text-muted)" />
            <input
              type="text"
              placeholder="Search by role, skill (e.g. React, Python), or company..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                color: 'var(--text-primary)',
                fontSize: '0.9375rem',
                outline: 'none',
              }}
            />
            {search && (
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setSearch('')}
                style={{ padding: '4px 8px', fontSize: '11px' }}
              >
                Clear
              </button>
            )}
            <button className="btn btn-primary" style={{ padding: '8px 18px' }}>
              Search Roles
            </button>
          </div>

          {/* Quick Skill Tags */}
          {allSkills.length > 0 && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexWrap: 'wrap',
                gap: '8px',
                marginTop: '20px',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Popular tags:</span>
              {allSkills.map((s) => (
                <button
                  key={s}
                  onClick={() => setSelectedSkill(selectedSkill === s ? '' : s)}
                  className={`btn btn-sm ${
                    selectedSkill === s ? 'btn-primary' : 'btn-secondary'
                  }`}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.75rem',
                    borderRadius: 'var(--radius-full)',
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Main Content Area */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '48px 24px' }}>
        {/* Controls header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '28px',
            paddingBottom: '16px',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '4px' }}>
              Open Opportunities{' '}
              <span style={{ color: 'var(--text-muted)', fontSize: '1rem', fontWeight: 500 }}>
                ({filteredJobs.length})
              </span>
            </h2>
            <p style={{ fontSize: '0.8125rem' }}>
              Positions accepting applications with automated assessment pipelines
            </p>
          </div>

          {/* Experience level filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Experience:</span>
            <select
              className="select"
              value={selectedExp}
              onChange={(e) => setSelectedExp(e.target.value)}
              style={{ padding: '6px 32px 6px 12px', fontSize: '0.8125rem', width: 'auto' }}
            >
              <option value="all">All Levels</option>
              <option value="entry">Entry / Junior (0-1 yrs)</option>
              <option value="mid">Mid-Level (2-4 yrs)</option>
              <option value="senior">Senior (5+ yrs)</option>
            </select>
          </div>
        </div>

        {/* Listings */}
        {loading ? (
          <div className="loading-overlay">
            <div className="spinner" style={{ width: 44, height: 44 }} />
            <p>Loading open opportunities...</p>
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
                  padding: '24px 28px',
                }}
              >
                {/* Left job details */}
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <div className="avatar-circle" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                      {job.company_name?.[0]?.toUpperCase() || 'C'}
                    </div>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {job.company_name}
                    </span>
                    <CheckCircle2 size={14} color="#10b981" />
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>• Verified Employer</span>
                  </div>

                  <h3
                    style={{
                      fontSize: '1.25rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      marginBottom: '10px',
                      cursor: 'pointer',
                    }}
                    onClick={() => navigate(`/apply/${job.job_token}`)}
                  >
                    {job.title}
                  </h3>

                  {/* Badges / Metadata */}
                  <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
                    <span className="badge badge-blue">
                      <Briefcase size={12} />
                      <span>{job.interview_type ? job.interview_type.replace('_', ' ') : 'Full-time'}</span>
                    </span>

                    <span className="badge badge-gray">
                      <Clock size={12} />
                      <span>{job.min_experience_years > 0 ? `${job.min_experience_years}+ Yrs Exp` : 'Fresher / Entry Level'}</span>
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
                      marginBottom: '16px',
                      maxWidth: '720px',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                    }}
                  >
                    {job.description}
                  </p>

                  {/* Required skills */}
                  {job.required_skills?.length > 0 && (
                    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
                      {job.required_skills.map((skill) => (
                        <span
                          key={skill}
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            padding: '3px 9px',
                            borderRadius: 'var(--radius-xs)',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Right CTA */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '10px' }}>
                  {appliedJobIds.has(String(job.id || job._id)) ? (
                    <button
                      className="btn btn-secondary"
                      style={{ minWidth: '130px', color: 'var(--success-light)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                      onClick={() => navigate('/candidate/applications')}
                    >
                      <CheckCircle2 size={15} color="var(--success)" />
                      <span>Applied</span>
                    </button>
                  ) : (
                    <button
                      className="btn btn-primary"
                      style={{ minWidth: '130px' }}
                      onClick={() => navigate(`/apply/${job.job_token}`)}
                    >
                      <span>Apply Now</span>
                      <ChevronRight size={16} />
                    </button>
                  )}

                  <button
                    className="btn btn-ghost btn-sm"
                    onClick={() => copyShareLink(job)}
                    style={{ fontSize: '0.75rem' }}
                  >
                    <Share2 size={13} />
                    <span>Copy Link</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            className="card"
            style={{ textAlign: 'center', padding: '64px 24px', border: '1px dashed var(--border-medium)' }}
          >
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(255,255,255,0.04)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
                color: 'var(--text-muted)',
              }}
            >
              <Briefcase size={24} />
            </div>
            <h3 style={{ fontSize: '1.125rem', marginBottom: '8px' }}>No Active Roles Match Your Criteria</h3>
            <p style={{ maxWidth: '440px', margin: '0 auto 20px', fontSize: '0.875rem' }}>
              Try adjusting your search query, clearing the skill filter, or exploring different experience levels.
            </p>
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch('');
                setSelectedSkill('');
                setSelectedExp('all');
              }}
            >
              Reset Filters
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
