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
 * - Fully accessible keyboard navigation conforming to national online exam standards
 *   (Keys 1-4 & A-D for options, Up/Down arrows, Space/Enter activation, Tab focus,
 *    Arrow keys / 'N' / 'P' for question navigation, 'M'/'R' for review, 'X'/'Del' to clear).
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
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);

  // References to option DOM elements for focus management and screen reader accessibility
  const optionRefs = useRef([]);

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

  // Keyboard navigation shortcuts conforming to traditional examination standards
  useEffect(() => {
    function handleKeyDown(e) {
      // 1. Never intercept when user is typing in standard inputs or textareas
      const targetTag = e.target?.tagName?.toLowerCase();
      if (targetTag === 'input' || targetTag === 'textarea' || e.target?.isContentEditable) {
        return;
      }

      // 2. Escape closes modals or mobile drawer
      if (e.key === 'Escape') {
        if (showShortcutsModal) {
          setShowShortcutsModal(false);
          return;
        }
        if (mobilePaletteOpen) {
          setMobilePaletteOpen(false);
          return;
        }
      }

      // If shortcuts modal is open, ignore further shortcuts
      if (showShortcutsModal) {
        return;
      }

      // 3. Toggle keyboard shortcuts help with '?' or 'H'
      if (e.key === '?' || (e.shiftKey && e.key === '/') || ((e.key === 'h' || e.key === 'H') && !e.ctrlKey && !e.altKey)) {
        e.preventDefault();
        setShowShortcutsModal(true);
        return;
      }

      // 4. Submit exam keybinding: Alt + S or Ctrl + Enter
      if ((e.altKey && (e.key === 's' || e.key === 'S')) || (e.ctrlKey && e.key === 'Enter')) {
        e.preventDefault();
        handleSubmitExam(false);
        return;
      }

      if (!session || !session.questions || !session.questions[currentIndex]) {
        return;
      }

      const q = session.questions[currentIndex];
      const totalOptions = q.options?.length || 4;
      const keyLower = e.key.toLowerCase();

      // 5. Number keys: '1', '2', '3', '4' (standard row and numpad)
      let numMatch = null;
      if (/^[1-9]$/.test(e.key)) {
        numMatch = parseInt(e.key, 10) - 1;
      } else if (e.code && /^Numpad[1-9]$/.test(e.code)) {
        numMatch = parseInt(e.code.replace('Numpad', ''), 10) - 1;
      }

      if (numMatch !== null && numMatch >= 0 && numMatch < totalOptions && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        handleSelectOption(numMatch);
        if (optionRefs.current[numMatch]) {
          optionRefs.current[numMatch].focus();
        }
        return;
      }

      // 6. Letter keys: 'A', 'B', 'C', 'D' (case-insensitive) for option selection
      if (keyLower.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const letterIdx = keyLower.charCodeAt(0) - 97; // 'a' -> 0, 'b' -> 1, 'c' -> 2, 'd' -> 3
        if (letterIdx >= 0 && letterIdx < totalOptions) {
          e.preventDefault();
          handleSelectOption(letterIdx);
          if (optionRefs.current[letterIdx]) {
            optionRefs.current[letterIdx].focus();
          }
          return;
        }
      }

      // 7. Arrow Up & Arrow Down: Navigate & cycle through option choices
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleArrowOption(1);
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        handleArrowOption(-1);
        return;
      }

      // 8. Navigation: Next question (ArrowRight, 'N', or 'S' for Save & Next)
      if (e.key === 'ArrowRight' || keyLower === 'n' || (!e.ctrlKey && !e.altKey && keyLower === 's')) {
        e.preventDefault();
        handleNext();
        return;
      }

      // 9. Navigation: Previous question (ArrowLeft, 'P')
      if (e.key === 'ArrowLeft' || keyLower === 'p') {
        e.preventDefault();
        handlePrev();
        return;
      }

      // 10. Review Flag: 'M', 'R', or 'F' (Mark / Review / Flag)
      if (keyLower === 'm' || keyLower === 'r' || keyLower === 'f') {
        e.preventDefault();
        handleToggleReview();
        return;
      }

      // 11. Clear selection: 'X', Backspace, Delete, or Alt + C
      if (keyLower === 'x' || e.key === 'Backspace' || e.key === 'Delete' || (e.altKey && keyLower === 'c')) {
        e.preventDefault();
        handleClearOption();
        return;
      }

      // 12. Toggle question palette: 'Q'
      if (keyLower === 'q' && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setMobilePaletteOpen((prev) => !prev);
        return;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, session, answers, showShortcutsModal, mobilePaletteOpen]);

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

  async function handleSelectOption(optionIdx, forceSelect = false) {
    if (!session || !session.questions || !session.questions[currentIndex]) return;
    const q = session.questions[currentIndex];
    const currentAns = answers[q.id] || {};

    const newOption = (!forceSelect && currentAns.selected_option === optionIdx) ? null : optionIdx;
    const updated = {
      ...currentAns,
      selected_option: newOption,
    };

    setAnswers((prev) => ({ ...prev, [q.id]: updated }));
    await progressiveSave(q.id, newOption, updated.is_marked_for_review);
  }

  function handleArrowOption(direction) {
    if (!session || !session.questions || !session.questions[currentIndex]) return;
    const q = session.questions[currentIndex];
    const totalOptions = q.options?.length || 4;
    const currentAns = answers[q.id] || {};
    const currentOpt = currentAns.selected_option;

    let nextOpt;
    if (currentOpt == null) {
      nextOpt = direction > 0 ? 0 : totalOptions - 1;
    } else {
      nextOpt = Math.max(0, Math.min(totalOptions - 1, currentOpt + direction));
    }

    handleSelectOption(nextOpt, true);
    if (optionRefs.current[nextOpt]) {
      optionRefs.current[nextOpt].focus();
    }
  }

  async function handleToggleReview() {
    if (!session || !session.questions || !session.questions[currentIndex]) return;
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
    if (!session || !session.questions || !session.questions[currentIndex]) return;
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

        {/* Sync Indicator, Shortcuts Guide Button & Countdown Timer */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
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

          <button
            type="button"
            onClick={() => setShowShortcutsModal(true)}
            className="ncc-shortcuts-btn"
            title="View keyboard shortcuts (?)"
            aria-label="View keyboard shortcuts"
          >
            <span>⌨️</span> Keybindings <kbd>?</kbd>
          </button>

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
            type="button"
            onClick={() => handleSubmitExam(false)}
            disabled={submitting}
            title="Submit Exam (Alt + S)"
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
            <div
              id="ncc-question-statement"
              style={{
                fontSize: 16,
                fontWeight: 600,
                lineHeight: 1.6,
                color: 'var(--navy-900)',
                marginBottom: 24,
                padding: '16px 20px',
                background: '#f8fafc',
                borderRadius: 8,
                border: '1px solid #e2e8f0'
              }}
            >
              {currentQ.statement}
            </div>

            {/* Options List with Full Accessibility & Traditional Exam Keybindings */}
            <div
              role="radiogroup"
              aria-labelledby="ncc-question-statement"
              className="ncc-arena-options-list"
            >
              {currentQ.options.map((opt, optIdx) => {
                const isSelected = qAns.selected_option === optIdx;
                const letter = String.fromCharCode(65 + optIdx); // 'A', 'B', 'C', 'D'

                return (
                  <div
                    key={optIdx}
                    ref={(el) => (optionRefs.current[optIdx] = el)}
                    role="radio"
                    aria-checked={isSelected}
                    aria-label={`Option ${letter}: ${opt}`}
                    tabIndex={0}
                    onClick={() => handleSelectOption(optIdx)}
                    onKeyDown={(e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleSelectOption(optIdx);
                      } else if (e.key === 'ArrowDown') {
                        e.preventDefault();
                        handleArrowOption(1);
                      } else if (e.key === 'ArrowUp') {
                        e.preventDefault();
                        handleArrowOption(-1);
                      }
                    }}
                    className={`ncc-arena-option ${isSelected ? 'selected' : ''}`}
                  >
                    <div className="ncc-arena-option-main">
                      {/* Accessible Radio Circle Indicator */}
                      <div
                        className={`ncc-arena-radio-circle ${isSelected ? 'selected' : ''}`}
                        aria-hidden="true"
                      >
                        {isSelected && <span className="ncc-arena-radio-inner-dot" />}
                      </div>

                      {/* Option Letter Badge (A, B, C, D) */}
                      <div className={`ncc-arena-letter-badge ${isSelected ? 'selected' : ''}`}>
                        {letter}
                      </div>

                      {/* Option Text Statement */}
                      <div className="ncc-arena-option-text">
                        {opt}
                      </div>
                    </div>

                    {/* Keybinding shortcut hint pills */}
                    <div className="ncc-arena-key-hints" aria-hidden="true">
                      {isSelected ? (
                        <span className="ncc-selected-pill">
                          ✓ Selected
                        </span>
                      ) : (
                        <>
                          <kbd className="ncc-key-pill">{letter}</kbd>
                          <span style={{ color: '#cbd5e1', fontSize: 10 }}>/</span>
                          <kbd className="ncc-key-pill">{optIdx + 1}</kbd>
                        </>
                      )}
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
                title="Mark for review (Shortcut: M)"
                style={{
                  padding: '8px 14px',
                  borderRadius: 6,
                  border: qAns.is_marked_for_review ? '2px solid #7c3aed' : '1px solid #cbd5e1',
                  background: qAns.is_marked_for_review ? '#f3e8ff' : '#fff',
                  color: qAns.is_marked_for_review ? '#6b21a8' : '#475569',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>{qAns.is_marked_for_review ? '★ Marked for Review' : '☆ Mark for Review'}</span>
                <kbd className="ncc-key-pill" style={{ fontSize: 10, padding: '1px 5px' }}>M</kbd>
              </button>

              {qAns.selected_option != null && (
                <button
                  type="button"
                  onClick={handleClearOption}
                  title="Clear option (Shortcut: X or Del)"
                  style={{
                    padding: '8px 14px',
                    borderRadius: 6,
                    border: '1px solid #e2e8f0',
                    background: '#f8fafc',
                    color: '#64748b',
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>Clear Selection</span>
                  <kbd className="ncc-key-pill" style={{ fontSize: 10, padding: '1px 5px' }}>X</kbd>
                </button>
              )}
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handlePrev}
                disabled={currentIndex === 0}
                title="Previous question (Shortcut: P or ←)"
                style={{
                  padding: '8px 18px',
                  borderRadius: 6,
                  border: '1px solid #cbd5e1',
                  background: currentIndex === 0 ? '#f1f5f9' : '#fff',
                  color: currentIndex === 0 ? '#94a3b8' : '#1e293b',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: currentIndex === 0 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>← Previous</span>
                <kbd className="ncc-key-pill" style={{ fontSize: 10, padding: '1px 5px' }}>P</kbd>
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex === session.questions.length - 1}
                title="Next question (Shortcut: N or →)"
                style={{
                  padding: '8px 22px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'var(--navy-900)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: currentIndex === session.questions.length - 1 ? 'not-allowed' : 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6
                }}
              >
                <span>Next Question →</span>
                <kbd className="ncc-key-pill" style={{ fontSize: 10, padding: '1px 5px', background: '#1e3a8a', color: '#93c5fd', borderColor: '#3b82f6' }}>N</kbd>
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
              maxHeight: 'calc(100vh - 380px)',
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
                    type="button"
                    aria-label={`Go to question ${idx + 1}`}
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

          {/* Quick Keybindings Reference Card */}
          <div style={{
            fontSize: 11,
            background: '#ffffff',
            padding: 12,
            borderRadius: 8,
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            marginTop: 14
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <strong style={{ color: 'var(--navy-900)', fontSize: 11, display: 'flex', alignItems: 'center', gap: 6 }}>
                ⌨️ Keybindings
              </strong>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: 'pointer',
                  padding: 0
                }}
              >
                All Keys [?]
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, color: '#475569', fontSize: 11 }}>
              <div>• <kbd className="ncc-key-pill">A-D</kbd> or <kbd className="ncc-key-pill">1-4</kbd> : Select Option</div>
              <div>• <kbd className="ncc-key-pill">↑</kbd> <kbd className="ncc-key-pill">↓</kbd> : Move between options</div>
              <div>• <kbd className="ncc-key-pill">Space</kbd> / <kbd className="ncc-key-pill">↵</kbd> : Confirm choice</div>
              <div>• <kbd className="ncc-key-pill">N</kbd> / <kbd className="ncc-key-pill">→</kbd> : Next Question</div>
              <div>• <kbd className="ncc-key-pill">P</kbd> / <kbd className="ncc-key-pill">←</kbd> : Prev Question</div>
              <div>• <kbd className="ncc-key-pill">M</kbd> : Review | <kbd className="ncc-key-pill">X</kbd> : Clear</div>
            </div>
          </div>
        </div>
      </div>

      {/* Accessible Keyboard Shortcuts Guide Modal */}
      {showShortcutsModal && (
        <div
          className="ncc-modal-overlay"
          onClick={() => setShowShortcutsModal(false)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="ncc-shortcuts-title"
        >
          <div
            className="ncc-modal-content"
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '16px 20px',
              borderBottom: '1px solid #e2e8f0',
              background: '#0a192f',
              color: '#fff',
              borderRadius: '12px 12px 0 0'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20 }}>⌨️</span>
                <div>
                  <h3 id="ncc-shortcuts-title" style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#f8fafc' }}>
                    Examination Terminal Keybindings
                  </h3>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>
                    Full keyboard accessibility & traditional online exam shortcuts
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                aria-label="Close shortcuts guide"
                style={{
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: 'none',
                  color: '#fff',
                  borderRadius: 6,
                  width: 30,
                  height: 30,
                  cursor: 'pointer',
                  fontSize: 16,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                ✕
              </button>
            </div>

            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
              {/* Section 1: Option Selection */}
              <div>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--navy-900)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🎯</span> Option Selection
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 8, fontSize: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div><kbd className="ncc-key-pill">A</kbd> <kbd className="ncc-key-pill">B</kbd> <kbd className="ncc-key-pill">C</kbd> <kbd className="ncc-key-pill">D</kbd></div>
                  <div>Directly choose Option A, B, C, or D</div>

                  <div><kbd className="ncc-key-pill">1</kbd> <kbd className="ncc-key-pill">2</kbd> <kbd className="ncc-key-pill">3</kbd> <kbd className="ncc-key-pill">4</kbd></div>
                  <div>Select options by number (Top row & Numpad)</div>

                  <div><kbd className="ncc-key-pill">↑</kbd> <kbd className="ncc-key-pill">↓</kbd> (Up / Down)</div>
                  <div>Cycle & navigate through options</div>

                  <div><kbd className="ncc-key-pill">Tab</kbd> / <kbd className="ncc-key-pill">Shift+Tab</kbd></div>
                  <div>Move keyboard focus between options & buttons</div>

                  <div><kbd className="ncc-key-pill">Space</kbd> or <kbd className="ncc-key-pill">Enter</kbd></div>
                  <div>Select the currently focused option</div>

                  <div><kbd className="ncc-key-pill">X</kbd> or <kbd className="ncc-key-pill">Del</kbd> / <kbd className="ncc-key-pill">Backspace</kbd></div>
                  <div>Clear response for the active question</div>
                </div>
              </div>

              {/* Section 2: Question Navigation */}
              <div>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--navy-900)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>🧭</span> Question Navigation
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 8, fontSize: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div><kbd className="ncc-key-pill">N</kbd> or <kbd className="ncc-key-pill">→</kbd> (Right)</div>
                  <div>Advance to Next Question</div>

                  <div><kbd className="ncc-key-pill">P</kbd> or <kbd className="ncc-key-pill">←</kbd> (Left)</div>
                  <div>Go back to Previous Question</div>

                  <div><kbd className="ncc-key-pill">S</kbd> (Save & Next)</div>
                  <div>Save response & proceed forward</div>

                  <div><kbd className="ncc-key-pill">Q</kbd></div>
                  <div>Toggle Question Palette drawer / view</div>
                </div>
              </div>

              {/* Section 3: Review & Submission */}
              <div>
                <h4 style={{ fontSize: 13, textTransform: 'uppercase', color: 'var(--navy-900)', margin: '0 0 10px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>⭐</span> Review & Submission
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr', gap: 8, fontSize: 12, background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div><kbd className="ncc-key-pill">M</kbd> or <kbd className="ncc-key-pill">R</kbd> / <kbd className="ncc-key-pill">F</kbd></div>
                  <div>Toggle Mark for Review flag</div>

                  <div><kbd className="ncc-key-pill">?</kbd> or <kbd className="ncc-key-pill">H</kbd></div>
                  <div>Open / close this Keybindings Guide</div>

                  <div><kbd className="ncc-key-pill">Alt + S</kbd> / <kbd className="ncc-key-pill">Ctrl+Enter</kbd></div>
                  <div>Finalize & Submit Examination Paper</div>

                  <div><kbd className="ncc-key-pill">Esc</kbd></div>
                  <div>Close modal or palette drawer</div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid #e2e8f0',
              background: '#f8fafc',
              borderRadius: '0 0 12px 12px',
              display: 'flex',
              justifyContent: 'flex-end',
            }}>
              <button
                type="button"
                onClick={() => setShowShortcutsModal(false)}
                style={{
                  padding: '8px 20px',
                  background: 'var(--navy-900)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Got it, Return to Exam (Esc)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
