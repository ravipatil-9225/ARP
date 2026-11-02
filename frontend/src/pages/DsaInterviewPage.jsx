import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { dsaApi } from '../api/client';
import toast from 'react-hot-toast';
import ProctoringWrapper from '../proctoring/components/ProctoringWrapper';

export default function DsaInterviewPage() {
  const { applicationId } = useParams();

  return (
    <ProctoringWrapper applicationId={applicationId} sessionType="dsa">
      <DsaInterviewContent applicationId={applicationId} />
    </ProctoringWrapper>
  );
}

function DsaInterviewContent({ applicationId }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [activeProblemIdx, setActiveProblemIdx] = useState(0);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);
  const [testResults, setTestResults] = useState(null);
  const [latestSubmission, setLatestSubmission] = useState(null);

  useEffect(() => {
    loadSession();
  }, [applicationId]);

  const loadSession = async () => {
    try {
      setLoading(true);
      const res = await dsaApi.getSession(applicationId);
      setSession(res.data);
      if (res.data.problems && res.data.problems.length > 0) {
        const prob = res.data.problems[activeProblemIdx];
        const existingSub = res.data.submissions?.[prob.id];
        if (existingSub) {
          setCode(existingSub.code);
          setLatestSubmission(existingSub);
        } else {
          setCode(prob.starter_code[language] || prob.starter_code['python']);
        }
      }
    } catch (err) {
      toast.error('Failed to load DSA assessment session');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProblem = (idx) => {
    setActiveProblemIdx(idx);
    setTestResults(null);
    const prob = session.problems[idx];
    const existingSub = session.submissions?.[prob.id];
    if (existingSub) {
      setCode(existingSub.code);
      setLatestSubmission(existingSub);
    } else {
      setCode(prob.starter_code[language] || prob.starter_code['python']);
      setLatestSubmission(null);
    }
  };

  const handleLanguageChange = (newLang) => {
    setLanguage(newLang);
    const prob = session.problems[activeProblemIdx];
    setCode(prob.starter_code[newLang] || prob.starter_code['python']);
  };

  const handleResetCode = () => {
    const prob = session.problems[activeProblemIdx];
    setCode(prob.starter_code[language] || prob.starter_code['python']);
    toast('Code reset to template', { icon: '🔄' });
  };

  const handleRunCode = async () => {
    const prob = session.problems[activeProblemIdx];
    try {
      setIsRunning(true);
      setTestResults(null);
      const res = await dsaApi.runCode(applicationId, {
        problem_id: prob.id,
        language: language,
        code: code,
      });
      setTestResults(res.data);
      if (res.data.all_passed) {
        toast.success('All sample test cases passed! ✨');
      } else {
        toast.error('Some test cases failed. Check output below.');
      }
    } catch (err) {
      toast.error('Error running test cases');
      console.error(err);
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    const prob = session.problems[activeProblemIdx];
    try {
      setIsSubmitting(true);
      const res = await dsaApi.submitCode(applicationId, {
        problem_id: prob.id,
        language: language,
        code: code,
      });
      setLatestSubmission(res.data.submission);
      toast.success(res.data.message);
      // Reload session to keep submissions state synchronized
      const updated = await dsaApi.getSession(applicationId);
      setSession(updated.data);
    } catch (err) {
      toast.error('Failed to submit solution');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFinalizeAssessment = async () => {
    try {
      setIsFinalizing(true);
      const res = await dsaApi.finalize(applicationId);
      toast.success('Round 2 Assessment Evaluated!');
      await loadSession();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to finalize assessment');
      console.error(err);
    } finally {
      setIsFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a16', color: '#f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#94a3b8' }}>Preparing Sandboxed Code Environment & Problem Suites...</p>
        </div>
      </div>
    );
  }

  // Completed State View
  if (session?.is_completed) {
    const passed = session.passed_cutoff;
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #1e1e42 0%, #0a0a16 100%)', color: '#f1f5f9', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '680px', width: '100%', background: '#12122b', border: '1px solid #282856', borderRadius: '24px', padding: '36px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>{passed ? '🏆' : '📉'}</div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: passed ? '#10b981' : '#f59e0b' }}>
              {passed ? 'Round 2 Qualified!' : 'Assessment Completed'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '15px' }}>
              {session.candidate_name} • {session.job_title} at {session.company_name}
            </p>
          </div>

          <div style={{ background: '#19193b', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '28px', border: '1px solid #32326b' }}>
            <div style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Practical Coding Score
            </div>
            <div style={{ fontSize: '48px', fontWeight: '900', color: passed ? '#34d399' : '#fbbf24', letterSpacing: '-1px' }}>
              {session.total_score}%
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#cbd5e1' }}>
              Required Cutoff: <strong style={{ color: '#f1f5f9' }}>{session.cutoff_required}%</strong> •
              Status: <span style={{ color: passed ? '#34d399' : '#f87171', fontWeight: '700' }}>{passed ? 'INVITED TO FINAL HR ROUND' : 'BELOW CUTOFF'}</span>
            </div>
          </div>

          {passed && (
            <div style={{ background: '#16213e', borderRadius: '16px', padding: '24px', marginBottom: '28px', borderLeft: '4px solid #8b5cf6' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
                <span style={{ fontSize: '24px' }}>{session.meeting_platform === 'microsoft_teams' ? '🔷' : '🟢'}</span>
                <h3 style={{ margin: 0, fontSize: '17px', color: '#f1f5f9' }}>
                  Round 3: Final HR Video Interview Scheduled!
                </h3>
              </div>
              <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px', lineHeight: '1.6' }}>
                Your meeting link has been auto-generated via <strong>{session.meeting_platform === 'microsoft_teams' ? 'Microsoft Teams' : 'Google Meet'}</strong>. Our HR team will join you at the designated slot.
              </p>
              {session.meeting_link && (
                <a
                  href={session.meeting_link}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: 'block',
                    textAlign: 'center',
                    padding: '14px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                    color: 'white',
                    textDecoration: 'none',
                    fontWeight: '700',
                    fontSize: '15px',
                  }}
                >
                  Join {session.meeting_platform === 'microsoft_teams' ? 'Microsoft Teams' : 'Google Meet'} Call →
                </a>
              )}
            </div>
          )}

          <button
            onClick={() => navigate(`/status/${applicationId}`)}
            style={{
              width: '100%',
              padding: '14px',
              background: '#282856',
              border: 'none',
              borderRadius: '12px',
              color: '#cbd5e1',
              fontWeight: '600',
              fontSize: '15px',
              cursor: 'pointer',
            }}
          >
            Go to Candidate Pipeline Dashboard →
          </button>
        </div>
      </div>
    );
  }

  const currentProblem = session?.problems?.[activeProblemIdx];
  const allProblemsSubmitted = session?.problems?.every((p) => session.submissions?.[p.id]);

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a16', color: '#f1f5f9', display: 'flex', flexDirection: 'column' }}>
      {/* Top Navbar */}
      <header style={{ height: '64px', borderBottom: '1px solid #1f1f3d', background: '#101026', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{ fontSize: '20px' }}>💻</div>
          <div>
            <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: '#f1f5f9' }}>
              Round 2: Practical Coding Assessment
            </h2>
            <p style={{ margin: 0, fontSize: '12px', color: '#94a3b8' }}>
              {session?.job_title} • {session?.company_name}
            </p>
          </div>
        </div>

        {/* Problem Tabs */}
        <div style={{ display: 'flex', gap: '8px' }}>
          {session?.problems?.map((p, idx) => {
            const isSub = !!session.submissions?.[p.id];
            return (
              <button
                key={p.id}
                onClick={() => handleSelectProblem(idx)}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  border: activeProblemIdx === idx ? '1px solid #6366f1' : '1px solid #24244a',
                  background: activeProblemIdx === idx ? '#1e1e42' : '#14142d',
                  color: activeProblemIdx === idx ? '#a78bfa' : '#94a3b8',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                <span>Problem {idx + 1}</span>
                {isSub && <span style={{ color: '#10b981', fontSize: '12px' }}>✓</span>}
              </button>
            );
          })}
        </div>

        {/* Finalize Button */}
        <div>
          <button
            onClick={handleFinalizeAssessment}
            disabled={!allProblemsSubmitted || isFinalizing}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              background: allProblemsSubmitted ? 'linear-gradient(135deg, #10b981, #059669)' : '#282856',
              color: allProblemsSubmitted ? 'white' : '#64748b',
              fontWeight: '700',
              fontSize: '13px',
              cursor: allProblemsSubmitted && !isFinalizing ? 'pointer' : 'not-allowed',
            }}
          >
            {isFinalizing ? 'Evaluating Total Score...' : 'Finalize Round 2 Assessment →'}
          </button>
        </div>
      </header>

      {/* Main Workspace Body */}
      <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '45% 55%', height: 'calc(100vh - 64px)' }}>
        {/* Left Column: Problem Details */}
        <div style={{ borderRight: '1px solid #1f1f3d', overflowY: 'auto', padding: '24px 28px', background: '#0e0e1e' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8' }}>
              {currentProblem?.category}
            </span>
            <span style={{ fontSize: '11px', fontWeight: '700', padding: '4px 10px', borderRadius: '20px', background: currentProblem?.difficulty === 'Easy' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', color: currentProblem?.difficulty === 'Easy' ? '#34d399' : '#fbbf24' }}>
              {currentProblem?.difficulty}
            </span>
          </div>

          <h1 style={{ fontSize: '24px', fontWeight: '800', marginBottom: '16px', color: '#f1f5f9' }}>
            {currentProblem?.title}
          </h1>

          <div style={{ color: '#cbd5e1', fontSize: '14px', lineHeight: '1.7', whiteSpace: 'pre-wrap', marginBottom: '24px' }}>
            {currentProblem?.description}
          </div>

          {/* Examples */}
          <div style={{ marginBottom: '24px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#f1f5f9', marginBottom: '12px' }}>Examples:</h3>
            {currentProblem?.examples?.map((ex, i) => (
              <div key={i} style={{ background: '#14142d', borderRadius: '10px', padding: '14px', marginBottom: '12px', border: '1px solid #23234d', fontSize: '13px' }}>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: '#94a3b8' }}>Input: </strong>
                  <code style={{ color: '#a78bfa' }}>{ex.input}</code>
                </div>
                <div style={{ marginBottom: '6px' }}>
                  <strong style={{ color: '#94a3b8' }}>Output: </strong>
                  <code style={{ color: '#34d399' }}>{ex.output}</code>
                </div>
                {ex.explanation && (
                  <div style={{ color: '#64748b', fontSize: '12px' }}>
                    <em>Explanation: {ex.explanation}</em>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Constraints */}
          {currentProblem?.constraints && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#94a3b8', marginBottom: '10px' }}>Constraints:</h3>
              <ul style={{ paddingLeft: '20px', margin: 0, color: '#cbd5e1', fontSize: '13px', lineHeight: '1.8' }}>
                {currentProblem.constraints.map((c, i) => (
                  <li key={i}><code>{c}</code></li>
                ))}
              </ul>
            </div>
          )}

          {/* Latest AI Review Card if submitted */}
          {latestSubmission && (
            <div style={{ background: '#13132e', borderRadius: '14px', border: '1px solid #282858', padding: '18px', marginTop: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#818cf8' }}>
                  🤖 AI Evaluator Review
                </span>
                <span style={{ fontSize: '14px', fontWeight: '800', color: '#34d399' }}>
                  Score: {latestSubmission.problem_score}%
                </span>
              </div>
              <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#cbd5e1', marginBottom: '8px' }}>
                <div>Time: <strong style={{ color: '#f1f5f9' }}>{latestSubmission.ai_review?.time_complexity}</strong></div>
                <div>Space: <strong style={{ color: '#f1f5f9' }}>{latestSubmission.ai_review?.space_complexity}</strong></div>
                <div>Tests: <strong style={{ color: '#34d399' }}>{latestSubmission.passed_tests}/{latestSubmission.total_tests}</strong></div>
              </div>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                {latestSubmission.ai_review?.summary}
              </p>
            </div>
          )}
        </div>

        {/* Right Column: Code Arena & Console */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: '#0b0b18' }}>
          {/* Editor Header Bar */}
          <div style={{ height: '48px', borderBottom: '1px solid #1f1f3d', background: '#121226', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Language:</span>
              <select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                style={{
                  background: '#1a1a36',
                  color: '#f1f5f9',
                  border: '1px solid #2c2c5c',
                  borderRadius: '6px',
                  padding: '4px 10px',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                <option value="python">Python 3.12</option>
                <option value="javascript">JavaScript (ES6)</option>
              </select>
            </div>

            <button
              onClick={handleResetCode}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                fontSize: '12px',
                cursor: 'pointer',
              }}
            >
              🔄 Reset to Starter Code
            </button>
          </div>

          {/* Code Textarea Editor */}
          <div style={{ flex: 1, position: 'relative' }}>
            <textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Tab') {
                  e.preventDefault();
                  const start = e.target.selectionStart;
                  const end = e.target.selectionEnd;
                  setCode(code.substring(0, start) + '    ' + code.substring(end));
                  setTimeout(() => {
                    e.target.selectionStart = e.target.selectionEnd = start + 4;
                  }, 0);
                }
              }}
              spellCheck="false"
              style={{
                width: '100%',
                height: '100%',
                padding: '18px',
                background: '#0d0d1e',
                color: '#f8fafc',
                border: 'none',
                fontFamily: "'Fira Code', Consolas, 'Courier New', monospace",
                fontSize: '14px',
                lineHeight: '1.6',
                resize: 'none',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Action Footer Bar */}
          <div style={{ height: '56px', borderTop: '1px solid #1f1f3d', background: '#121226', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', padding: '0 16px' }}>
            <button
              onClick={handleRunCode}
              disabled={isRunning || isSubmitting}
              style={{
                padding: '9px 18px',
                borderRadius: '8px',
                border: '1px solid #333366',
                background: '#1c1c38',
                color: '#cbd5e1',
                fontSize: '13px',
                fontWeight: '600',
                cursor: isRunning ? 'not-allowed' : 'pointer',
              }}
            >
              {isRunning ? 'Running Sample Tests...' : '▶️ Run Sample Tests'}
            </button>

            <button
              onClick={handleSubmitSolution}
              disabled={isRunning || isSubmitting}
              style={{
                padding: '9px 22px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                color: 'white',
                fontSize: '13px',
                fontWeight: '700',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                boxShadow: '0 2px 10px rgba(99, 102, 241, 0.4)',
              }}
            >
              {isSubmitting ? 'AI Reviewing Code...' : '🚀 Submit Code'}
            </button>
          </div>

          {/* Run Output Results Console */}
          {testResults && (
            <div style={{ maxHeight: '200px', overflowY: 'auto', background: '#080812', borderTop: '1px solid #23234d', padding: '16px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: testResults.all_passed ? '#34d399' : '#f87171', marginBottom: '10px' }}>
                {testResults.all_passed ? '✅ All Sample Tests Passed' : '❌ Sample Test Failed'}
              </div>
              {testResults.results.map((r, i) => (
                <div key={i} style={{ fontSize: '12px', marginBottom: '8px', fontFamily: 'monospace', color: r.passed ? '#34d399' : '#f87171' }}>
                  Test {i + 1}: {r.passed ? 'PASSED' : 'FAILED'} — Input: {r.input} | Expected: {r.expected} | Got: {r.actual ?? r.error} ({r.duration_ms}ms)
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
