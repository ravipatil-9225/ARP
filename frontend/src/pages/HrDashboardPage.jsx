import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { hrApi } from '../api/client';
import Navbar from '../components/Navbar';
import BatchScheduleModal from '../components/BatchScheduleModal';
import SingleScheduleModal from '../components/SingleScheduleModal';
import HrEvaluationModal from '../components/HrEvaluationModal';
import toast from 'react-hot-toast';
import {
  Users, Calendar, Clock, Video, Award, CheckCircle2, XCircle,
  Sparkles, Coffee, ExternalLink, Filter, Search, ArrowRight,
  ShieldCheck, RefreshCw, FileText, ChevronRight, AlertCircle, Phone
} from 'lucide-react';

export default function HrDashboardPage() {
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending_schedule'); // 'all' | 'pending_schedule' | 'scheduled' | 'evaluated'
  const [searchQuery, setSearchQuery] = useState('');

  // Selected candidates for batch actions
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Modals state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [singleCandidate, setSingleCandidate] = useState(null);
  const [evaluatingCandidate, setEvaluatingCandidate] = useState(null);

  useEffect(() => {
    fetchQueue();
  }, []);

  const fetchQueue = async () => {
    setLoading(true);
    try {
      const res = await hrApi.getQueue();
      setCandidates(res.data || []);
      setSelectedIds(new Set());
    } catch (err) {
      console.error(err);
      toast.error('Failed to load HR candidate queue');
    } finally {
      setLoading(false);
    }
  };

  // Selection helpers
  const handleToggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = (filteredList) => {
    if (selectedIds.size === filteredList.length && filteredList.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredList.map((c) => c.application_id)));
    }
  };

  // Filter candidates
  const filteredCandidates = candidates.filter((c) => {
    // Filter tab match
    if (filter !== 'all' && c.queue_status !== filter) return false;

    // Search query match
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const nameMatch = c.candidate_name?.toLowerCase().includes(q);
      const emailMatch = c.candidate_email?.toLowerCase().includes(q);
      const jobMatch = c.job_title?.toLowerCase().includes(q);
      if (!nameMatch && !emailMatch && !jobMatch) return false;
    }
    return true;
  });

  const selectedCandidatesList = candidates.filter((c) =>
    selectedIds.has(c.application_id)
  );

  const pendingCount = candidates.filter((c) => c.queue_status === 'pending_schedule').length;
  const scheduledCount = candidates.filter((c) => c.queue_status === 'scheduled').length;
  const evaluatedCount = candidates.filter((c) => c.queue_status === 'evaluated').length;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-canvas)' }}>
      <Navbar />

      <main style={{ maxWidth: '1240px', margin: '0 auto', padding: '32px 24px 100px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }} className="fade-in">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
              <h1 style={{ fontSize: '1.875rem', fontWeight: 800, letterSpacing: '-0.02em' }}>
                HR Interview Orchestration Panel
              </h1>
              <span
                style={{
                  padding: '3px 10px',
                  borderRadius: 'var(--radius-full)',
                  background: 'var(--indigo-subtle)',
                  color: 'var(--indigo-light)',
                  fontSize: '12px',
                  fontWeight: 700,
                }}
              >
                Post-DSA Qualified Pipeline
              </span>
            </div>
            <p style={{ fontSize: '0.9375rem', color: 'var(--text-secondary)' }}>
              Manage candidates who passed the DSA Coding Round. Schedule 1-on-1 slots, automate sequential batch appointments with buffer gaps, or conduct live evaluations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              className="btn btn-secondary btn-sm"
              onClick={fetchQueue}
              disabled={loading}
              style={{ gap: '6px' }}
            >
              <RefreshCw size={14} className={loading ? 'spinner' : ''} />
              <span>Refresh Queue</span>
            </button>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (selectedCandidatesList.length === 0) {
                  // Select pending candidates by default
                  const pendings = candidates.filter((c) => c.queue_status === 'pending_schedule');
                  if (pendings.length > 0) {
                    setSelectedIds(new Set(pendings.map((c) => c.application_id)));
                  }
                }
                setBatchModalOpen(true);
              }}
              style={{ gap: '6px' }}
            >
              <Sparkles size={14} />
              <span>Batch Schedule Wizard</span>
            </button>
          </div>
        </div>

        {/* KPI Summary Strip */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--primary-subtle)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Award size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800 }}>{candidates.length}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Total DSA-Cleared Students</div>
            </div>
          </div>

          <div
            className="card"
            style={{
              padding: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              border: pendingCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
              background: pendingCount > 0 ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.05) 0%, var(--bg-card) 100%)' : 'var(--bg-card)',
            }}
          >
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f59e0b' }}>{pendingCount}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Awaiting HR Scheduling</div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#60a5fa' }}>{scheduledCount}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Scheduled & Confirmed</div>
            </div>
          </div>

          <div className="card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--success-subtle)', color: 'var(--success-light)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--success-light)' }}>{evaluatedCount}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Evaluated Decisions</div>
            </div>
          </div>
        </div>

        {/* Filter Tabs & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', marginBottom: '22px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {[
              { id: 'pending_schedule', label: `Awaiting Schedule (${pendingCount})` },
              { id: 'scheduled', label: `Scheduled Interviews (${scheduledCount})` },
              { id: 'evaluated', label: `Completed & Evaluated (${evaluatedCount})` },
              { id: 'all', label: `All Candidates (${candidates.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilter(tab.id)}
                style={{
                  padding: '7px 16px',
                  borderRadius: 'var(--radius-full)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: filter === tab.id ? '1px solid var(--primary-light)' : '1px solid var(--border-subtle)',
                  background: filter === tab.id ? 'var(--primary-subtle)' : 'var(--bg-card)',
                  color: filter === tab.id ? 'var(--primary-light)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
            <Search
              size={15}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}
            />
            <input
              className="input"
              placeholder="Search by candidate name, role, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ paddingLeft: '36px', height: '36px', fontSize: '0.8125rem' }}
            />
          </div>
        </div>

        {/* Multi-Select Action Bar */}
        {filteredCandidates.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 16px', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '10px', border: '1px solid var(--border-subtle)', marginBottom: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.8125rem', fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={selectedIds.size === filteredCandidates.length && filteredCandidates.length > 0}
                onChange={() => handleSelectAll(filteredCandidates)}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <span>Select All in Current View ({filteredCandidates.length})</span>
            </label>

            {selectedIds.size > 0 && (
              <span style={{ fontSize: '0.8125rem', color: 'var(--primary-light)', fontWeight: 600 }}>
                {selectedIds.size} student{selectedIds.size > 1 ? 's' : ''} selected
              </span>
            )}
          </div>
        )}

        {/* Candidates List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0' }}>
            <div className="spinner" style={{ width: '36px', height: '36px', margin: '0 auto 16px' }} />
            <p style={{ color: 'var(--text-muted)' }}>Loading qualified candidates from DSA assessment round...</p>
          </div>
        ) : filteredCandidates.length === 0 ? (
          <div
            className="card"
            style={{
              padding: '60px 24px',
              textAlign: 'center',
              border: '1px dashed var(--border-medium)',
            }}
          >
            <div style={{ width: '54px', height: '54px', borderRadius: '50%', background: 'var(--primary-subtle)', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
              <Users size={24} />
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '8px' }}>
              No candidates in this queue view
            </h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '420px', margin: '0 auto 20px', fontSize: '0.875rem' }}>
              {filter === 'pending_schedule'
                ? 'All cleared candidates have already been scheduled for their HR interviews!'
                : 'No candidates matched the selected filter.'}
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {filteredCandidates.map((cand) => {
              const isSelected = selectedIds.has(cand.application_id);
              const isPending = cand.queue_status === 'pending_schedule';
              const isScheduled = cand.queue_status === 'scheduled';
              const isEvaluated = cand.queue_status === 'evaluated';

              return (
                <div
                  key={cand.application_id}
                  className="card"
                  style={{
                    padding: '24px',
                    border: isSelected
                      ? '1px solid var(--primary)'
                      : isPending
                      ? '1px solid rgba(245, 158, 11, 0.35)'
                      : '1px solid var(--border-subtle)',
                    background: isSelected
                      ? 'rgba(99, 102, 241, 0.05)'
                      : isPending
                      ? 'linear-gradient(180deg, rgba(245, 158, 11, 0.02) 0%, var(--bg-card) 100%)'
                      : 'var(--bg-card)',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px', flexWrap: 'wrap' }}>
                    {/* Left: Checkbox + Candidate Header */}
                    <div style={{ display: 'flex', gap: '14px', flex: 1, minWidth: '320px' }}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleToggleSelect(cand.application_id)}
                        style={{ width: '18px', height: '18px', marginTop: '4px', cursor: 'pointer' }}
                      />

                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px', flexWrap: 'wrap' }}>
                          <h2 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                            {cand.candidate_name}
                          </h2>

                          {/* Queue Status Pill */}
                          <span
                            style={{
                              padding: '3px 10px',
                              borderRadius: 'var(--radius-full)',
                              fontSize: '11px',
                              fontWeight: 700,
                              background:
                                isEvaluated ? 'var(--success-subtle)' :
                                isScheduled ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                              color:
                                isEvaluated ? 'var(--success-light)' :
                                isScheduled ? '#60a5fa' : '#f59e0b',
                              border:
                                isEvaluated ? '1px solid rgba(16, 185, 129, 0.3)' :
                                isScheduled ? '1px solid rgba(96, 165, 250, 0.3)' : '1px solid rgba(245, 158, 11, 0.3)',
                            }}
                          >
                            {isEvaluated
                              ? `✓ ${cand.status === 'selected' ? 'Offer Extended' : 'Rejected'}`
                              : isScheduled
                              ? '📅 Scheduled'
                              : '⏳ Awaiting Schedule'}
                          </span>
                        </div>

                        {/* Contact & Job info */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: '14px', flexWrap: 'wrap' }}>
                          <span style={{ color: 'var(--primary-light)', fontWeight: 600 }}>{cand.job_title}</span>
                          <span>•</span>
                          <span>{cand.candidate_email}</span>
                          {cand.candidate_phone && (
                            <>
                              <span>•</span>
                              <span>{cand.candidate_phone}</span>
                            </>
                          )}
                        </div>

                        {/* 3-Round Score Dossier Ribbon */}
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', marginBottom: '14px' }}>
                          {/* Resume Score */}
                          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8125rem', border: '1px solid var(--border-subtle)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Resume: </span>
                            <span style={{ fontWeight: 700, color: 'var(--text-primary)' }}>{Math.round(cand.resume_score || 0)}%</span>
                          </div>

                          {/* Voice Score */}
                          <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8125rem', border: '1px solid var(--border-subtle)' }}>
                            <span style={{ color: 'var(--text-muted)' }}>Voice AI: </span>
                            <span style={{ fontWeight: 700, color: '#38bdf8' }}>{Math.round(cand.voice_score || 0)}%</span>
                          </div>

                          {/* DSA Score (Prominent) */}
                          <div style={{ background: 'rgba(16, 185, 129, 0.12)', padding: '6px 14px', borderRadius: '8px', fontSize: '0.8125rem', border: '1px solid rgba(16, 185, 129, 0.35)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Award size={14} color="var(--success-light)" />
                            <span style={{ color: 'var(--success-light)', fontWeight: 700 }}>
                              DSA Cleared: {Math.round(cand.dsa_score || 0)}%
                            </span>
                          </div>

                          {/* HR Score if evaluated */}
                          {cand.hr_score !== null && cand.hr_score !== undefined && (
                            <div style={{ background: 'rgba(139, 92, 246, 0.12)', padding: '6px 12px', borderRadius: '8px', fontSize: '0.8125rem', border: '1px solid rgba(139, 92, 246, 0.3)' }}>
                              <span style={{ color: '#c084fc' }}>HR Score: </span>
                              <span style={{ fontWeight: 700, color: '#c084fc' }}>{cand.hr_score}%</span>
                            </div>
                          )}
                        </div>

                        {/* Meeting Schedule details if already scheduled */}
                        {isScheduled && (
                          <div style={{ background: 'rgba(59, 130, 246, 0.08)', padding: '10px 14px', borderRadius: '8px', borderLeft: '3px solid #3b82f6', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                            <Calendar size={14} color="#60a5fa" />
                            <span><strong>Slot:</strong> {cand.scheduled_hr_time}</span>
                            <span>•</span>
                            <span><strong>Duration:</strong> {cand.slot_duration_mins || 30} mins</span>
                            {cand.meeting_link && (
                              <a
                                href={cand.meeting_link}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#60a5fa', fontWeight: 600, textDecoration: 'none', marginLeft: 'auto' }}
                              >
                                <span>Open Video Room</span>
                                <ExternalLink size={12} />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions Buttons */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end', minWidth: '180px' }}>
                      {/* Schedule 1-on-1 */}
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSingleCandidate(cand)}
                        style={{ gap: '6px', width: '100%' }}
                      >
                        <Calendar size={14} />
                        <span>{isScheduled ? 'Reschedule 1-on-1' : 'Schedule 1-on-1'}</span>
                      </button>

                      {/* Join Meeting Room if scheduled */}
                      {isScheduled && cand.meeting_link && (
                        <a
                          href={cand.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm"
                          style={{ gap: '6px', width: '100%', textDecoration: 'none', background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)' }}
                        >
                          <Video size={14} />
                          <span>Launch Video Call</span>
                          <ExternalLink size={12} />
                        </a>
                      )}

                      {/* Evaluate Candidate Button */}
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={() => setEvaluatingCandidate(cand)}
                        style={{ gap: '6px', width: '100%', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)' }}
                      >
                        <FileText size={14} />
                        <span>{isEvaluated ? 'Re-Evaluate Rubric' : 'Conduct HR Scorecard'}</span>
                      </button>

                      <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate(`/status/${cand.application_id}`)}
                        style={{ fontSize: '0.75rem', gap: '4px' }}
                      >
                        <span>Audit Report</span>
                        <ChevronRight size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Action Bar for Multi-Selection */}
      {selectedIds.size > 0 && (
        <div
          style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#0e1526',
            border: '1px solid var(--primary)',
            boxShadow: '0 12px 30px rgba(0,0,0,0.6)',
            borderRadius: '16px',
            padding: '14px 24px',
            zIndex: 900,
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            maxWidth: '90%',
          }}
          className="fade-in"
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 700 }}>
              {selectedIds.size}
            </div>
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
              Candidates Selected for HR Round
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setBatchModalOpen(true)}
              style={{ gap: '6px' }}
            >
              <Sparkles size={14} />
              <span>Batch Schedule with Buffer Gaps</span>
            </button>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIds(new Set())}
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Modals */}
      {batchModalOpen && (
        <BatchScheduleModal
          selectedCandidates={
            selectedCandidatesList.length > 0
              ? selectedCandidatesList
              : candidates.filter((c) => c.queue_status === 'pending_schedule')
          }
          onClose={() => setBatchModalOpen(false)}
          onSuccess={() => fetchQueue()}
        />
      )}

      {singleCandidate && (
        <SingleScheduleModal
          candidate={singleCandidate}
          onClose={() => setSingleCandidate(null)}
          onSuccess={() => fetchQueue()}
        />
      )}

      {evaluatingCandidate && (
        <HrEvaluationModal
          candidate={evaluatingCandidate}
          onClose={() => setEvaluatingCandidate(null)}
          onSuccess={() => fetchQueue()}
        />
      )}
    </div>
  );
}
