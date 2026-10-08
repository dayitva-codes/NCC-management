import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ErrorBanner } from '../components/Form';
import { RefreshingBuffer } from '../components/RefreshingBuffer';

/**
 * ==============================================================================
 * NCC MOCK TEST ARENA: TIMED CADET EXAMINATION TERMINAL
 * ==============================================================================
 * High-stakes military examination interface featuring:
 * - Server-authoritative timer countdown that auto-submits upon expiry.
 * - Progressive instant saving (each option click saves directly to DBMS).
 * - Interactive question palette (Answered, Flagged for Review, Not Visited).
 * - Keyboard navigation (1-4 for options, Arrow keys / 'n' / 'p' for next/previous).
 * - Full responsive layout adapting to desktop monitors, tablets, and phones.
 * ==============================================================================
 */
export default function NCCMockTestArena() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const sessionId = searchParams.get('session');

  const [session, setSession] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({}); // { qid: { selected_option, is_marked_for_review } }
  const [secondsLeft, setSecondsLeft] = useState(null);
  const [saveStatus, setSaveStatus] = useState('synced'); // 'synced', 'saving', 'error'
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [timeSpentPerQ, setTimeSpentPerQ] = useState({});
  const [mobilePaletteOpen, setMobilePaletteOpen] = useState(false);

  useEffect(() => {
    if (!sessionId) {
      navigate('/ncc-mock-tests');
      return;
    }
    loadArenaSession();
  }, [sessionId]);

  // Server-authoritative timer countdown
  useEffect(() => {
    if (secondsLeft === null || secondsLeft <= 0) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          handleAutoSubmitOnExpiry();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [secondsLeft]);

  // Track per-question time spent
  useEffect(() => {
    const qInterval = setInterval(() => {
      if (session && session.questions && session.questions[currentIndex]) {
        const qid = session.questions[currentIndex].id;
        setTimeSpentPerQ((prev) => ({
          ...prev,
          [qid]: (prev[qid] || 0) + 1,
        }));
      }
    }, 1000);
    return () => clearInterval(qInterval);
  }, [currentIndex, session]);

  // Keyboard navigation shortcuts
  useEffect(() => {
    function handleKeyDown(e) {
      if (['1', '2', '3', '4'].includes(e.key)) {
        const optIdx = parseInt(e.key, 10) - 1;
        handleSelectOption(optIdx);
      } else if (e.key === 'ArrowRight' || e.key === 'n') {
        handleNext();
      } else if (e.key === 'ArrowLeft' || e.key === 'p') {
        handlePrev();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, session, answers]);

  async function loadArenaSession() {
    setError('');
    try {
      const sess = await api.getNCCSession(sessionId);
      if (sess.status === 'completed' || sess.status === 'expired') {
        navigate(`/ncc-mock-tests/results?session=${sessionId}`);
        return;
      }
      setSession(sess);
      setSecondsLeft(sess.remaining_seconds);
      setAnswers(sess.saved_answers || {});
    } catch (err) {
      setError(err.message || 'Failed to load test session');
    }
  }

  async function handleAutoSubmitOnExpiry() {
    alert('Time has expired! Your responses are being submitted automatically.');
    await handleSubmitExam(true);
  }

  async function handleSelectOption(optionIdx) {
    if (!session || !session.questions[currentIndex]) return;
    const q = session.questions[currentIndex];
    const currentAns = answers[q.id] || {};

    const newOption = currentAns.selected_option === optionIdx ? null : optionIdx;
    const updated = {
      ...currentAns,
      selected_option: newOption,
    };

    setAnswers((prev) => ({ ...prev, [q.id]: updated }));
    await progressiveSave(q.id, newOption, updated.is_marked_for_review);
  }

  async function handleToggleReview() {
    if (!session || !session.questions[currentIndex]) return;
    const q = session.questions[currentIndex];
    const currentAns = answers[q.id] || {};

    const newReview = !currentAns.is_marked_for_review;
    const updated = {
      ...currentAns,
      is_marked_for_review: newReview,
    };

    setAnswers((prev) => ({ ...prev, [q.id]: updated }));
    await progressiveSave(q.id, updated.selected_option, newReview);
  }

  async function handleClearOption() {
    if (!session || !session.questions[currentIndex]) return;
    const q = session.questions[currentIndex];
    const currentAns = answers[q.id] || {};

    const updated = {
      ...currentAns,
      selected_option: null,
    };

    setAnswers((prev) => ({ ...prev, [q.id]: updated }));
    await progressiveSave(q.id, null, updated.is_marked_for_review);
  }

  async function progressiveSave(qid, selectedOpt, isReview) {
    setSaveStatus('saving');
    try {
      await api.saveNCCAnswer(sessionId, {
        question_id: qid,
        selected_option: selectedOpt,
        is_marked_for_review: isReview || false,
        time_spent_seconds: timeSpentPerQ[qid] || 0,
      });
      setSaveStatus('synced');
    } catch (err) {
      setSaveStatus('error');
      console.error('Progressive save error:', err);
    }
  }

  async function handleSubmitExam(force = false) {
    if (!force) {
      const unanswered = session.questions.filter((q) => answers[q.id]?.selected_option == null).length;
      const msg = unanswered > 0
        ? `You have ${unanswered} unanswered question(s). Are you sure you want to finalize and submit?`
        : 'Are you sure you want to finish the exam and view your scorecard?';
      if (!window.confirm(msg)) return;
    }

    setSubmitting(true);
    setError('');
    try {
      await api.submitNCCSession(sessionId);
      navigate(`/ncc-mock-tests/results?session=${sessionId}`);
    } catch (err) {
      setError(err.message || 'Submission failed');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (session && currentIndex < session.questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    }
  }

  function handlePrev() {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  }

  function formatTime(totalSec) {
    if (totalSec == null) return '--:--:--';
    const hrs = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  if (!session) {
    return (
      <RefreshingBuffer
        label="Securing Cadet Examination Station..."
        subtext="Authorizing session token and loading question paper from database"
      />
    );
  }

  const currentQ = session.questions[currentIndex];
  const qAns = answers[currentQ?.id] || {};

  // Compute question palette counts
  let answeredCount = 0;
  let reviewCount = 0;
  let notAnsweredCount = 0;

  session.questions.forEach((q) => {
    const a = answers[q.id];
    if (a?.selected_option != null) answeredCount++;
    else notAnsweredCount++;
    if (a?.is_marked_for_review) reviewCount++;
  });

  return (
    <div className="ncc-arena-wrapper">
      {/* Top Contest Bar */}
      <div className="ncc-arena-topbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 20 }}>🇮🇳</span>
          <div>
            <h2 style={{ fontSize: 16, margin: 0, color: '#f8fafc', fontWeight: 800 }}>{session.title}</h2>
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              Marking: +{session.marks_per_correct} Correct • {session.marks_per_wrong} Wrong • 0 Unanswered
            </div>
          </div>
        </div>

        {/* Sync Indicator & Countdown Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
          <div style={{ fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: saveStatus === 'synced' ? '#22c55e' : saveStatus === 'saving' ? '#eab308' : '#ef4444',
            }} />
            <span style={{ color: '#94a3b8' }}>
              {saveStatus === 'synced' ? 'Synced ✓' : saveStatus === 'saving' ? 'Saving…' : 'Sync Warning'}
            </span>
          </div>

          <div style={{
            background: secondsLeft < 300 ? '#7f1d1d' : '#1e293b',
            padding: '6px 14px',
            borderRadius: 6,
            fontWeight: 800,
            fontFamily: 'monospace',
            fontSize: 16,
            color: secondsLeft < 300 ? '#fca5a5' : '#38bdf8',
            border: '1px solid rgba(255,255,255,0.1)'
          }}>
            ⏱ {formatTime(secondsLeft)}
          </div>

          <button
            onClick={() => handleSubmitExam(false)}
            disabled={submitting}
            style={{
              padding: '8px 18px',
              background: '#dc2626',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 800,
              fontSize: 13,
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Exam'}
          </button>
        </div>
      </div>

      {/* Mobile Question Palette Toggle Bar (Visible on mobile/narrow screens) */}
      <div className="ncc-palette-toggle-bar" style={{
        padding: '10px 16px',
        background: '#f1f5f9',
        borderBottom: '1px solid #e2e8f0',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>
          Q{currentIndex + 1}/{session.questions.length} • {answeredCount} Answered
        </span>
        <button
          type="button"
          onClick={() => setMobilePaletteOpen(!mobilePaletteOpen)}
          style={{
            padding: '6px 12px',
            fontSize: 12,
            background: mobilePaletteOpen ? '#dc2626' : 'var(--navy-900)',
            color: '#fff',
            border: 'none',
            borderRadius: 4,
            cursor: 'pointer',
            fontWeight: 700
          }}
        >
          {mobilePaletteOpen ? '✕ Close Palette' : '📋 Question Palette (' + answeredCount + '/' + session.questions.length + ')'}
        </button>
      </div>

      <ErrorBanner message={error} />

      {/* Main Examination Arena Split */}
      <div className="ncc-arena-split">
        {/* Left Side: Question Pane */}
        <div className="ncc-arena-question-pane">
          <div>
            {/* Question Meta Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '4px 10px', borderRadius: 4, fontWeight: 700, fontSize: 12 }}>
                  QUESTION {currentIndex + 1} OF {session.questions.length}
                </span>
                <span style={{ background: '#f1f5f9', color: '#475569', padding: '4px 10px', borderRadius: 4, fontSize: 12, fontWeight: 600 }}>
                  Topic: {currentQ.topic_code.replace(/_/g, ' ').toUpperCase()}
                </span>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  background: currentQ.difficulty === 'easy' ? '#dcfce7' : currentQ.difficulty === 'medium' ? '#fef3c7' : '#fee2e2',
                  color: currentQ.difficulty === 'easy' ? '#15803d' : currentQ.difficulty === 'medium' ? '#b45309' : '#b91c1c'
                }}>
                  {currentQ.difficulty}
                </span>
              </div>

              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>
                +{session.marks_per_correct} / {session.marks_per_wrong} MARKS
              </div>
            </div>

            {/* Question Statement */}
            <div style={{
              fontSize: 16,
              fontWeight: 600,
              lineHeight: 1.6,
              color: 'var(--navy-900)',
              marginBottom: 28,
              padding: '16px 20px',
              background: '#f8fafc',
              borderRadius: 8,
              border: '1px solid #e2e8f0'
            }}>
              {currentQ.statement}
            </div>

            {/* 4 Options Grid */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = qAns.selected_option === optIdx;
                const letter = String.fromCharCode(65 + optIdx); // 'A', 'B', 'C', 'D'

                return (
                  <div
                    key={optIdx}
                    onClick={() => handleSelectOption(optIdx)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 14,
                      padding: '14px 18px',
                      borderRadius: 8,
                      border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                      background: isSelected ? '#eff6ff' : '#fff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      background: isSelected ? '#2563eb' : '#f1f5f9',
                      color: isSelected ? '#fff' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: 13
                    }}>
                      {letter}
                    </div>
                    <div style={{ fontSize: 14, color: isSelected ? '#1e3a8a' : '#1e293b', fontWeight: isSelected ? 600 : 400 }}>
                      {opt}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Toolbar */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            paddingTop: 20,
            borderTop: '1px solid #e2e8f0',
            marginTop: 20
          }}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleToggleReview}
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: qAns.is_marked_for_review ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  background: qAns.is_marked_for_review ? '#f3e8ff' : '#fff',
                  color: qAns.is_marked_for_review ? '#6b21a8' : '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                {qAns.is_marked_for_review ? '★ Marked for Review' : '☆ Mark for Review'}
              </button>

              {qAns.selected_option != null && (
                <button
                  type="button"
                  onClick={handleClearOption}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    fontSize: 12,
                    cursor: 'pointer'
                  }}
                >
                  Clear Selection
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: currentIndex === 0 ? '#f1f5f9' : '#fff',
                  color: currentIndex === 0 ? '#94a3b8' : '#1e293b',
                  fontWeight: 600,
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer'
                }}
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === session.questions.length - 1}
                style={{
                  padding: '8px 22px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--navy-900)',
                  color: '#fff',
                  fontWeight: 700,
                  cursor: currentIndex === session.questions.length - 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Next Question →
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Interactive Question Palette */}
        <div
          className="ncc-arena-palette-pane"
          style={{
            display: typeof window !== 'undefined' && window.innerWidth <= 900 && !mobilePaletteOpen ? 'none' : 'flex'
          }}
        >
          <div>
            <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 12px 0' }}>
              QUESTION PALETTE
            </h4>

            {/* Palette Summary Legend */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, fontSize: 11, marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#16a34a' }} />
                <span>Answered ({answeredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#e2e8f0' }} />
                <span>Not Answered ({notAnsweredCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#7c3aed' }} />
                <span>Marked ({reviewCount})</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: '#2563eb' }} />
                <span>Ans & Review</span>
              </div>
            </div>

            {/* Bubble Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, 1fr)',
              gap: 8,
              maxHeight: 'calc(100vh - 350px)',
              overflowY: 'auto',
              padding: 4
            }}>
              {session.questions.map((q, idx) => {
                const a = answers[q.id];
                const isCurrent = idx === currentIndex;
                const isAns = a?.selected_option != null;
                const isRev = a?.is_marked_for_review;

                let bg = '#fff';
                let color = '#334155';
                let border = '1px solid #cbd5e1';

                if (isAns && isRev) {
                  bg = '#2563eb';
                  color = '#fff';
                  border = '1px solid #1d4ed8';
                } else if (isRev) {
                  bg = '#7c3aed';
                  color = '#fff';
                  border = '1px solid #6b21a8';
                } else if (isAns) {
                  bg = '#16a34a';
                  color = '#fff';
                  border = '1px solid #15803d';
                } else {
                  bg = '#f1f5f9';
                  color = '#64748b';
                  border = '1px solid #e2e8f0';
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => {
                      setCurrentIndex(idx);
                      setMobilePaletteOpen(false);
                    }}
                    style={{
                      height: 38,
                      borderRadius: 6,
                      border: isCurrent ? '2px solid #000' : border,
                      background: bg,
                      color: color,
                      fontWeight: 800,
                      fontSize: 12,
                      cursor: 'pointer',
                      boxShadow: isCurrent ? '0 0 0 2px #38bdf8' : 'none'
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Keyboard Help */}
          <div style={{ fontSize: 11, color: '#94a3b8', background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0' }}>
            <div><strong>Keyboard Shortcuts:</strong></div>
            <div>• Keys <code>1-4</code>: Select Option A-D</div>
            <div>• Keys <code>N / →</code>: Next Question</div>
            <div>• Keys <code>P / ←</code>: Previous Question</div>
          </div>
        </div>
      </div>
    </div>
  );
}
