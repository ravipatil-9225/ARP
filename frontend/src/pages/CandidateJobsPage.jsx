import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { candidateApi, jobsApi } from '../api/client';
import Navbar from '../components/Navbar';
import toast from 'react-hot-toast';
import {
  Sparkles, Briefcase, Search, CheckCircle2, AlertCircle, ArrowRight,
  TrendingUp, Award, ExternalLink, Filter, MapPin, Clock, Calendar,
  ChevronRight, Building2, User, Zap, ShieldCheck, X
} from 'lucide-react';

export default function CandidateJobsPage() {
  const navigate = useNavigate();
  const { candidate } = useAuth();

  const [loading, setLoading] = useState(true);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [myApplications, setMyApplications] = useState([]);
  const [activeTab, setActiveTab] = useState('recommended'); // 'recommended' | 'all'
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTier, setSelectedTier] = useState('all');
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [viewingJob, setViewingJob] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Parallel fetch recommendations, all jobs, and current candidate applications
      const [recRes, allRes, appRes] = await Promise.allSettled([
        candidateApi.getRecommendations(),
        jobsApi.explore(),
        candidateApi.getMyApplications(),
      ]);

      if (recRes.status === 'fulfilled') {
        setRecommendedJobs(recRes.value.data || []);
      }
      if (allRes.status === 'fulfilled') {
        setAllJobs(allRes.value.data || []);
      }
      if (appRes.status === 'fulfilled') {
        setMyApplications(appRes.value.data || []);
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to load job listings');
    } finally {
      setLoading(false);
    }
  };

  const appliedJobIds = new Set(myApplications.map((a) => a.job_id));

  const handleApply = async (jobId) => {
    if (!candidate?.resume_url) {
      toast.error('Please upload your resume in your profile before applying!', {
        duration: 4000,
        icon: '📄',
      });
      navigate('/candidate/profile');
      return;
    }

    setApplyingJobId(jobId);
    try {
      const res = await candidateApi.apply(jobId);
      toast.success(res.data.message || 'Application submitted successfully!');
      // Refresh applications list
      const appRes = await candidateApi.getMyApplications();
      setMyApplications(appRes.data || []);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Application failed');
    } finally {
      setApplyingJobId(null);
    }
  };

  // Filter jobs based on active tab, search, and tier
  const displayedJobs = (activeTab === 'recommended' ? recommendedJobs : allJobs).filter((job) => {
    const q = searchQuery.toLowerCase();
    const titleMatch = job.title?.toLowerCase().includes(q);
    const companyMatch = job.company_name?.toLowerCase().includes(q);
    const skillMatch = job.required_skills?.some((s) => s.toLowerCase().includes(q));
    const textMatch = !q || titleMatch || companyMatch || skillMatch;

    if (!textMatch) return false;

    if (activeTab === 'recommended' && selectedTier !== 'all') {
      if (selectedTier === 'strong' && job.match_score < 85) return false;
      if (selectedTier === 'good' && (job.match_score < 70 || job.match_score >= 85)) return false;
      if (selectedTier === 'moderate' && job.match_score >= 70) return false;
    }
    return true;
  });

  const completion = candidate?.profile_completed_percentage || 0;
  const topMatch = recommendedJobs[0]?.match_score || 0;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Navbar />

      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '32px 24px' }}>
        {/* Profile Completion Alert Banner if < 70% */}
        {completion < 70 && (
          <div
            style={{
              background: 'linear-gradient(90deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.12) 100%)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '28px',
              gap: '16px',
            }}
            className="fade-in"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  background: 'var(--primary-subtle)',
                  color: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Sparkles size={18} />
              </div>
              <div>
                <h4 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: '2px' }}>
                  Boost Your Job Matching Score (Profile {completion}% Complete)
                </h4>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  Add your skills, work history, and upload your resume to unlock accurate AI recommendations and 1-click apply.
                </p>
              </div>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => navigate('/candidate/profile')}
              style={{ flexShrink: 0, gap: '6px' }}
            >
              <span>Complete Profile</span>
              <ArrowRight size={14} />
            </button>
          </div>
        )}

        {/* Hero & Metrics Header */}
        <div style={{ marginBottom: '32px' }} className="fade-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '16px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                  Welcome, {candidate?.name?.split(' ')[0] || 'Candidate'} 👋
                </h1>
                <span
                  style={{
                    padding: '4px 10px',
                    borderRadius: 'var(--radius-full)',
                    background: 'var(--primary-subtle)',
                    color: 'var(--primary-light)',
                    fontSize: '12px',
                    fontWeight: 700,
                  }}
                >
                  Candidate Portal
                </span>
              </div>
              <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
                Discover role requisitions tailored to your verified skills, experience, and profile vector.
              </p>
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                className="btn btn-secondary btn-sm"
                onClick={() => navigate('/candidate/applications')}
                style={{ gap: '6px' }}
              >
                <Briefcase size={15} />
                <span>My Applications ({myApplications.length})</span>
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => navigate('/candidate/profile')}
                style={{ gap: '6px' }}
              >
                <User size={15} />
                <span>Edit Profile</span>
              </button>
            </div>
          </div>

          {/* Stat Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--primary-subtle)',
                  color: 'var(--primary-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Sparkles size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{recommendedJobs.length}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>AI Matched Requisitions</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--success-subtle)',
                  color: 'var(--success-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <TrendingUp size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success-light)' }}>
                  {topMatch ? `${Math.round(topMatch)}%` : '--'}
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Top Match Score</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'var(--indigo-subtle)',
                  color: 'var(--indigo-light)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Briefcase size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{myApplications.length}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Applied Positions</div>
              </div>
            </div>

            <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div
                style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.1)',
                  color: '#f59e0b',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Award size={22} />
              </div>
              <div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{allJobs.length}</div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total Listed Openings</div>
              </div>
            </div>
          </div>
        </div>

        {/* Controls Bar: Tabs, Search & Filters */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '24px',
            flexWrap: 'wrap',
          }}
        >
          {/* Main Tabs */}
          <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-card)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <button
              onClick={() => setActiveTab('recommended')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'recommended' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'recommended' ? '#fff' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <Sparkles size={16} />
              <span>Recommended For You ({recommendedJobs.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('all')}
              style={{
                padding: '8px 18px',
                borderRadius: '8px',
                fontSize: '0.875rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                background: activeTab === 'all' ? 'var(--primary)' : 'transparent',
                color: activeTab === 'all' ? '#fff' : 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s ease',
              }}
            >
              <Briefcase size={16} />
              <span>All Listed Jobs ({allJobs.length})</span>
            </button>
          </div>

          {/* Search Input & Tier Filters */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, justifyContent: 'flex-end', minWidth: '280px' }}>
            <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
              <Search
                size={16}
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
              />
              <input
                className="input"
                placeholder="Search by title, skill, company..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px', height: '38px', fontSize: '0.875rem' }}
              />
            </div>

            {activeTab === 'recommended' && (
              <select
                className="input"
                value={selectedTier}
                onChange={(e) => setSelectedTier(e.target.value)}
                style={{ width: '170px', height: '38px', fontSize: '0.875rem', cursor: 'pointer' }}
              >
                <option value="all">All Match Scores</option>
                <option value="strong">85%+ Strong Match</option>
                <option value="good">70%–84% Good Match</option>
                <option value="moderate">&lt; 70% Moderate</option>
              </select>
            )}
          </div>
        </div>

        {/* Job Cards Listing */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)' }}>Calculating vector recommendations across active jobs...</p>
          </div>
        ) : displayedJobs.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              border: '1px dashed var(--border-medium)',
            }}
          >
            <div
              style={{
                width: '54px',
                height: '54px',
                borderRadius: '50%',
                background: 'var(--primary-subtle)',
                color: 'var(--primary-light)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px',
              }}
            >
              <Search size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>No matching jobs found</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px', fontSize: '0.875rem' }}>
              {searchQuery
                ? `No requisitions matched your search query "${searchQuery}". Try removing filters or searching other skills.`
                : 'There are currently no active openings posted by recruiters. Please check back shortly!'}
            </p>
            {searchQuery && (
              <button className="btn btn-secondary btn-sm" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {displayedJobs.map((job) => {
              const jobId = job.job_id || job.id || job._id;
              const isApplied = appliedJobIds.has(jobId);
              const score = job.match_score;
              const hasScore = score !== undefined && score !== null;

              // Color based on match score
              const scoreColor =
                score >= 85 ? 'var(--success-light)' : score >= 70 ? 'var(--primary-light)' : '#f59e0b';
              const scoreBg =
                score >= 85 ? 'var(--success-subtle)' : score >= 70 ? 'var(--primary-subtle)' : 'rgba(245, 158, 11, 0.1)';

              return (
                <div
                  key={jobId}
                  className="card"
                  style={{
                    padding: '24px',
                    transition: 'all 0.25s ease',
                    border: hasScore && score >= 85 ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid var(--border-subtle)',
                    background: hasScore && score >= 85 ? 'linear-gradient(180deg, rgba(16, 185, 129, 0.03) 0%, var(--bg-card) 100%)' : 'var(--bg-card)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Left: Job Info */}
                    <div style={{ flex: 1, minWidth: '300px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, letterSpacing: '-0.01em' }}>
                          {job.title}
                        </h2>
                        {hasScore && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                              background: scoreBg,
                              border: `1px solid ${scoreColor}40`,
                              fontSize: '12px',
                              fontWeight: 700,
                              color: scoreColor,
                            }}
                          >
                            <Sparkles size={12} />
                            <span>{Math.round(score)}% {job.match_tier || 'Match'}</span>
                          </div>
                        )}
                        {isApplied && (
                          <div
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                              background: 'var(--success-subtle)',
                              color: 'var(--success-light)',
                              fontSize: '12px',
                              fontWeight: 700,
                            }}
                          >
                            <CheckCircle2 size={12} />
                            <span>Applied</span>
                          </div>
                        )}
                      </div>

                      {/* Company & Details Chips */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', color: 'var(--text-muted)', fontSize: '0.8125rem', marginBottom: '14px', flexWrap: 'wrap' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px', color: 'var(--text-secondary)', fontWeight: 600 }}>
                          <Building2 size={14} />
                          {job.company_name || 'Hiring Enterprise'}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                          <Clock size={14} />
                          {job.min_experience_years > 0 ? `${job.min_experience_years}+ Yrs Exp` : 'Fresher / Any Exp'}
                        </span>
                        {job.education_requirement && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                            <Award size={14} />
                            {job.education_requirement}
                          </span>
                        )}
                        <span style={{ textTransform: 'capitalize' }}>
                          {job.interview_type ? job.interview_type.replace('_', ' ') : 'Off Campus'}
                        </span>
                      </div>

                      {/* AI Explainability Reason */}
                      {job.why_recommended && (
                        <div
                          style={{
                            background: 'rgba(255, 255, 255, 0.03)',
                            borderLeft: `3px solid ${scoreColor}`,
                            padding: '8px 12px',
                            borderRadius: '0 8px 8px 0',
                            fontSize: '0.8125rem',
                            color: 'var(--text-secondary)',
                            marginBottom: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                          }}
                        >
                          <Zap size={14} color={scoreColor} style={{ flexShrink: 0 }} />
                          <span><strong>Why Matched:</strong> {job.why_recommended}</span>
                        </div>
                      )}

                      {/* Short Description */}
                      <p
                        style={{
                          fontSize: '0.875rem',
                          color: 'var(--text-secondary)',
                          lineHeight: 1.5,
                          marginBottom: '16px',
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {job.description}
                      </p>

                      {/* Skills Tags: Matched vs Missing */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>Required Skills:</span>
                        {job.required_skills?.map((skill) => {
                          const isMatched = job.matching_skills?.includes(skill);
                          return (
                            <span
                              key={skill}
                              style={{
                                padding: '3px 8px',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                background: isMatched ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.05)',
                                color: isMatched ? 'var(--success-light)' : 'var(--text-muted)',
                                border: isMatched ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                              }}
                            >
                              {isMatched && <CheckCircle2 size={11} />}
                              {skill}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', alignItems: 'flex-end', justifyContent: 'center' }}>
                      {isApplied ? (
                        <button
                          className="btn btn-secondary btn-sm"
                          onClick={() => navigate('/candidate/applications')}
                          style={{ gap: '6px', color: 'var(--success-light)', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                        >
                          <CheckCircle2 size={15} color="var(--success)" />
                          <span>Track Application</span>
                        </button>
                      ) : (
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={() => handleApply(jobId)}
                          disabled={applyingJobId === jobId}
                          style={{ gap: '6px', minWidth: '150px' }}
                        >
                          {applyingJobId === jobId ? (
                            <>
                              <span className="spinner" />
                              <span>Submitting...</span>
                            </>
                          ) : (
                            <>
                              <Zap size={15} />
                              <span>1-Click Apply</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => setViewingJob(job)}
                        style={{ fontSize: '0.8125rem', gap: '4px' }}
                      >
                        <span>View Details</span>
                        <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Full Job Details Modal */}
      {viewingJob && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '24px',
          }}
          onClick={() => setViewingJob(null)}
        >
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: '680px',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: '32px',
              position: 'relative',
              boxShadow: 'var(--shadow-xl)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setViewingJob(null)}
              style={{
                position: 'absolute',
                right: '20px',
                top: '20px',
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
              }}
            >
              <X size={20} />
            </button>

            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--primary-light)', fontWeight: 700 }}>
                  {viewingJob.company_name || 'Hiring Company'}
                </span>
                {viewingJob.match_score && (
                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: 'var(--radius-full)',
                      background: 'var(--primary-subtle)',
                      color: 'var(--primary-light)',
                      fontSize: '11px',
                      fontWeight: 700,
                    }}
                  >
                    {Math.round(viewingJob.match_score)}% Match
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>{viewingJob.title}</h2>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px', marginBottom: '24px', background: 'rgba(255, 255, 255, 0.02)', padding: '16px', borderRadius: '12px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Experience</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{viewingJob.min_experience_years || 0}+ Years</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Education</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{viewingJob.education_requirement || 'Any'}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Assessment</div>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', textTransform: 'capitalize' }}>
                  {viewingJob.interview_type ? viewingJob.interview_type.replace('_', ' ') : 'Standard'}
                </div>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Required Skills & Tech Stack
              </h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {viewingJob.required_skills?.map((skill) => (
                  <span
                    key={skill}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.06)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                    }}
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <h4 style={{ fontSize: '0.875rem', fontWeight: 700, marginBottom: '8px', color: 'var(--text-secondary)' }}>
                Role Description & Responsibilities
              </h4>
              <div style={{ fontSize: '0.875rem', lineHeight: 1.6, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap' }}>
                {viewingJob.description}
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button className="btn btn-secondary" onClick={() => setViewingJob(null)}>
                Close
              </button>
              {appliedJobIds.has(viewingJob.job_id || viewingJob.id || viewingJob._id) ? (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    setViewingJob(null);
                    navigate('/candidate/applications');
                  }}
                  style={{ gap: '6px' }}
                >
                  <CheckCircle2 size={16} />
                  <span>View in Applications</span>
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  onClick={() => {
                    handleApply(viewingJob.job_id || viewingJob.id || viewingJob._id);
                    setViewingJob(null);
                  }}
                  style={{ gap: '6px' }}
                >
                  <Zap size={16} />
                  <span>1-Click Apply Now</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
