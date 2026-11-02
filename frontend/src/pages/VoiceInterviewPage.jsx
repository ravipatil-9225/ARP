import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { voiceApi } from '../api/client';
import toast from 'react-hot-toast';
import ProctoringWrapper from '../proctoring/components/ProctoringWrapper';

export default function VoiceInterviewPage() {
  const { applicationId } = useParams();
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);

  return (
    <ProctoringWrapper
      applicationId={applicationId}
      sessionType="voice"
      isAiSpeaking={isAiSpeaking}
    >
      <VoiceInterviewContent
        applicationId={applicationId}
        isAiSpeaking={isAiSpeaking}
        setIsAiSpeaking={setIsAiSpeaking}
      />
    </ProctoringWrapper>
  );
}

function VoiceInterviewContent({ applicationId, isAiSpeaking, setIsAiSpeaking }) {
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [answerText, setAnswerText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [lastEvaluation, setLastEvaluation] = useState(null);
  const [speechSupported, setSpeechSupported] = useState(true);

  const recognitionRef = useRef(null);

  // Load or start session
  useEffect(() => {
    loadSession();
    setupSpeechRecognition();
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, [applicationId]);

  const setupSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript + ' ';
        }
      }
      if (finalTranscript) {
        setAnswerText((prev) => (prev ? prev + ' ' + finalTranscript : finalTranscript).trim());
      }
    };

    recognition.onerror = (err) => {
      console.warn('Speech recognition error:', err);
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
  };

  const loadSession = async () => {
    try {
      setLoading(true);
      const res = await voiceApi.getSession(applicationId);
      setSession(res.data);
      const qIdx = res.data.current_question_index;
      if (qIdx < res.data.questions.length) {
        setCurrentQuestion(res.data.questions[qIdx]);
        // Auto-speak question with browser TTS
        speakQuestion(res.data.questions[qIdx].question);
      }
    } catch (err) {
      toast.error('Failed to load voice interview session');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const speakQuestion = (text) => {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1.0;
    utterance.onstart = () => setIsAiSpeaking(true);
    utterance.onend = () => setIsAiSpeaking(false);
    utterance.onerror = () => setIsAiSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition not supported in your browser. You can type your answer below.');
      return;
    }

    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
      toast('Microphone paused', { icon: '⏸️' });
    } else {
      if (isAiSpeaking && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        setIsAiSpeaking(false);
      }
      try {
        recognitionRef.current.start();
        setIsRecording(true);
        toast.success('Listening... Speak your answer now!');
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleSubmitAnswer = async () => {
    if (!answerText.trim()) {
      toast.error('Please provide an answer by speaking or typing.');
      return;
    }

    if (isRecording && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsRecording(false);
    }

    try {
      setIsSubmitting(true);
      const res = await voiceApi.submitAnswer(applicationId, {
        question_id: currentQuestion.id,
        answer_text: answerText.trim(),
      });

      setLastEvaluation(res.data.evaluated_question);

      if (res.data.is_completed) {
        toast.success('Voice Interview Completed! Calculating your score...');
        await loadSession();
      } else {
        toast.success(`Answer evaluated! Score: ${res.data.evaluated_question.score}%`);
        setAnswerText('');
        await loadSession();
      }
    } catch (err) {
      toast.error('Failed to evaluate answer. Please try again.');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a16', color: '#f1f5f9' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 16px' }} />
          <p style={{ color: '#94a3b8' }}>Initializing AI Voice Bot & Acoustic Model...</p>
        </div>
      </div>
    );
  }

  const qIndex = session ? session.current_question_index : 0;
  const totalQ = session ? session.total_questions : 6;
  const progressPct = Math.round((qIndex / totalQ) * 100);

  // Completed State View
  if (session?.is_completed) {
    const passed = session.passed_cutoff;
    return (
      <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #1e1e42 0%, #0a0a16 100%)', color: '#f1f5f9', padding: '40px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: '640px', width: '100%', background: '#12122b', border: '1px solid #282856', borderRadius: '24px', padding: '36px', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>{passed ? '🎉' : '📊'}</div>
            <h1 style={{ fontSize: '28px', fontWeight: '800', marginBottom: '8px', color: passed ? '#10b981' : '#f59e0b' }}>
              {passed ? 'Voice Round Cleared!' : 'Voice Interview Completed'}
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '15px' }}>
              {session.candidate_name} • {session.job_title} at {session.company_name}
            </p>
          </div>

          {/* Score Hero */}
          <div style={{ background: '#19193b', borderRadius: '16px', padding: '24px', textAlign: 'center', marginBottom: '24px', border: '1px solid #32326b' }}>
            <div style={{ color: '#94a3b8', fontSize: '13px', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>
              Composite Voice Score
            </div>
            <div style={{ fontSize: '48px', fontWeight: '900', color: passed ? '#34d399' : '#fbbf24', letterSpacing: '-1px' }}>
              {session.final_score}%
            </div>
            <div style={{ marginTop: '8px', fontSize: '13px', color: '#cbd5e1' }}>
              Required Cutoff: <strong style={{ color: '#f1f5f9' }}>{session.cutoff_required}%</strong> •
              Status: <span style={{ color: passed ? '#34d399' : '#f87171', fontWeight: '700' }}>{passed ? 'QUALIFIED FOR ROUND 2' : 'BELOW CUTOFF'}</span>
            </div>
          </div>

          {/* 3-Tier Breakdown */}
          <div style={{ marginBottom: '28px' }}>
            <h3 style={{ fontSize: '15px', color: '#cbd5e1', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
              Adaptive 3-Tier Performance Breakdown
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              <div style={{ background: '#151533', padding: '16px', borderRadius: '12px', border: '1px solid #22224d', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: '600' }}>
                  🟢 EASY (25%)
                </span>
                <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px', color: '#f1f5f9' }}>
                  {session.level_breakdown?.easy ?? 0}%
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Fundamentals</div>
              </div>

              <div style={{ background: '#151533', padding: '16px', borderRadius: '12px', border: '1px solid #22224d', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: '600' }}>
                  🟡 MEDIUM (35%)
                </span>
                <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px', color: '#f1f5f9' }}>
                  {session.level_breakdown?.medium ?? 0}%
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Scenarios</div>
              </div>

              <div style={{ background: '#151533', padding: '16px', borderRadius: '12px', border: '1px solid #22224d', textAlign: 'center' }}>
                <span style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '20px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', fontWeight: '600' }}>
                  🔴 HARD (40%)
                </span>
                <div style={{ fontSize: '22px', fontWeight: '800', marginTop: '10px', color: '#f1f5f9' }}>
                  {session.level_breakdown?.hard ?? 0}%
                </div>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>Architecture</div>
              </div>
            </div>
          </div>

          {/* Action Button */}
          {passed ? (
            <button
              onClick={() => navigate(`/interview/dsa/${applicationId}`)}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                border: 'none',
                borderRadius: '12px',
                color: 'white',
                fontWeight: '700',
                fontSize: '16px',
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(99, 102, 241, 0.4)',
                transition: 'all 0.2s',
              }}
            >
              Proceed to Round 2: Practical Coding Assessment →
            </button>
          ) : (
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
              View Application Status
            </button>
          )}
        </div>
      </div>
    );
  }

  // Active Question View
  const levelMeta = {
    easy: { color: '#10b981', label: '🟢 Tier 1: Fundamentals (Easy)', bg: 'rgba(16, 185, 129, 0.12)' },
    medium: { color: '#f59e0b', label: '🟡 Tier 2: Applied Scenarios (Medium)', bg: 'rgba(245, 158, 11, 0.12)' },
    hard: { color: '#ef4444', label: '🔴 Tier 3: Architecture & Edge Cases (Hard)', bg: 'rgba(239, 68, 68, 0.12)' },
  }[currentQuestion?.level || 'easy'];

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #141432 0%, #080811 100%)', color: '#f1f5f9', padding: '30px 20px' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
        {/* Top Header Bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', background: 'rgba(18, 18, 43, 0.8)', padding: '16px 24px', borderRadius: '16px', border: '1px solid #252554' }}>
          <div>
            <h2 style={{ fontSize: '18px', fontWeight: '700', margin: 0, color: '#f1f5f9' }}>
              🎤 Round 1: AI Voice Interview
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '13px', margin: '4px 0 0' }}>
              {session?.job_title} • {session?.company_name}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>Question</span>
            <div style={{ fontSize: '18px', fontWeight: '800', color: '#a78bfa' }}>
              {qIndex + 1} / {totalQ}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ background: '#181836', borderRadius: '8px', height: '8px', marginBottom: '24px', overflow: 'hidden' }}>
          <div style={{ width: `${progressPct}%`, background: 'linear-gradient(90deg, #6366f1, #8b5cf6)', height: '100%', transition: 'width 0.4s' }} />
        </div>

        {/* Question Card */}
        <div style={{ background: '#12122b', borderRadius: '20px', border: '1px solid #282856', padding: '32px', marginBottom: '24px', boxShadow: '0 10px 40px rgba(0,0,0,0.5)' }}>
          {/* Level Badge */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
            <span style={{ fontSize: '12px', fontWeight: '700', padding: '6px 14px', borderRadius: '30px', background: levelMeta.bg, color: levelMeta.color, border: `1px solid ${levelMeta.color}44` }}>
              {levelMeta.label}
            </span>
            <span style={{ fontSize: '12px', color: '#94a3b8' }}>
              Topic: <strong style={{ color: '#cbd5e1' }}>{currentQuestion?.focus_topic}</strong>
            </span>
          </div>

          {/* Question Text */}
          <h1 style={{ fontSize: '22px', fontWeight: '600', lineHeight: '1.5', color: '#f1f5f9', marginBottom: '20px' }}>
            {currentQuestion?.question}
          </h1>

          {/* Voice Bot Controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
            <button
              onClick={() => speakQuestion(currentQuestion?.question)}
              disabled={isAiSpeaking}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                background: '#1f1f44',
                color: '#a78bfa',
                border: '1px solid #333366',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {isAiSpeaking ? '🔊 AI Speaking...' : '🔁 Re-listen to Question'}
            </button>
            {isAiSpeaking && (
              <span style={{ fontSize: '12px', color: '#a78bfa', animation: 'pulse 1.5s infinite' }}>
                AI Voice Active...
              </span>
            )}
          </div>

          {/* Voice Wave Visualizer */}
          <div style={{ height: '70px', background: '#0a0a18', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '24px', border: '1px solid #1f1f3d' }}>
            {[20, 45, 60, 30, 80, 50, 95, 40, 70, 35, 85, 25, 65, 40, 75, 30].map((h, i) => (
              <div
                key={i}
                style={{
                  width: '4px',
                  height: isRecording || isAiSpeaking ? `${h}%` : '15%',
                  background: isRecording ? '#10b981' : isAiSpeaking ? '#8b5cf6' : '#282856',
                  borderRadius: '2px',
                  transition: 'height 0.2s ease',
                }}
              />
            ))}
          </div>

          {/* Microphone & Answer Section */}
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <button
              onClick={toggleRecording}
              style={{
                width: '76px',
                height: '76px',
                borderRadius: '50%',
                background: isRecording ? '#ef4444' : 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                color: 'white',
                fontSize: '30px',
                cursor: 'pointer',
                boxShadow: isRecording ? '0 0 25px rgba(239, 68, 68, 0.6)' : '0 0 25px rgba(16, 185, 129, 0.4)',
                transition: 'all 0.3s',
                marginBottom: '12px',
              }}
            >
              {isRecording ? '⏹️' : '🎙️'}
            </button>
            <p style={{ fontSize: '13px', color: isRecording ? '#34d399' : '#94a3b8', margin: 0 }}>
              {isRecording ? 'Listening to your microphone... Click to pause' : 'Click the microphone to answer with voice'}
            </p>
          </div>

          {/* Speech-to-Text / Manual Transcript Editor */}
          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', fontSize: '13px', color: '#cbd5e1', marginBottom: '8px' }}>
              Your Response Transcript (speak to auto-fill or type to refine):
            </label>
            <textarea
              rows={4}
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Your spoken words will appear here automatically. You can also edit or type manually..."
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: '#0c0c1c',
                border: '1px solid #2c2c5c',
                color: '#f1f5f9',
                fontSize: '14px',
                fontFamily: 'inherit',
                lineHeight: '1.6',
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
          </div>

          {/* Submit Answer Button */}
          <button
            onClick={handleSubmitAnswer}
            disabled={isSubmitting || !answerText.trim()}
            style={{
              width: '100%',
              padding: '15px',
              borderRadius: '12px',
              background: !answerText.trim() ? '#282856' : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              color: !answerText.trim() ? '#64748b' : 'white',
              border: 'none',
              fontWeight: '700',
              fontSize: '15px',
              cursor: !answerText.trim() || isSubmitting ? 'not-allowed' : 'pointer',
              boxShadow: answerText.trim() ? '0 4px 15px rgba(99, 102, 241, 0.3)' : 'none',
            }}
          >
            {isSubmitting ? 'AI Agent Evaluating Answer...' : 'Submit Answer & Proceed →'}
          </button>
        </div>

        {/* Previous Answer Evaluation Card (if any) */}
        {lastEvaluation && (
          <div style={{ background: '#101026', borderRadius: '16px', border: '1px solid #20204d', padding: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                Latest Question Evaluated: <strong>{lastEvaluation.focus_topic}</strong>
              </span>
              <span style={{ fontSize: '14px', fontWeight: '800', color: lastEvaluation.score >= 60 ? '#34d399' : '#f59e0b' }}>
                Score: {lastEvaluation.score}%
              </span>
            </div>
            <p style={{ color: '#cbd5e1', fontSize: '13px', margin: 0, lineHeight: '1.5' }}>
              💬 <em>{lastEvaluation.feedback}</em>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
