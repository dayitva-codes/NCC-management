import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/Form';
import { RefreshingBuffer } from '../components/RefreshingBuffer';

/**
 * ==============================================================================
 * NCC MOCK TEST RESULTS: CERTIFIED SCORECARD & POST-EXAM ANALYSIS
 * ==============================================================================
 * Comprehensive cadet performance debriefing after mock test submission:
 * - Pass / Merit / Distinction verdict with exact percentage.
 * - Negative marking accounting (+1 correct, -0.25 incorrect).
 * - Per-topic proficiency breakdown (Radar charts, accuracy by topic).
 * - Complete question-by-question review with official NCC Directorate explanations.
 * ==============================================================================
 */
export default function NCCMockTestResults() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isOfficer = user && ['mentor', 'admin', 'co', 'co_admin'].includes(user.role);
  const sessionId = searchParams.get('session');

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'wrong', 'unanswered'

  useEffect(() => {
    if (!sessionId) {
      navigate('/ncc-mock-tests');
      return;
    }
    loadResults();
  }, [sessionId]);

  async function loadResults() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getNCCSessionResults(sessionId);
      setResults(data);
    } catch (err) {
      setError(err.message || 'Failed to retrieve examination scorecard');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <RefreshingBuffer
        label="Auditing Examination Scorecard..."
        subtext="Calculating accuracy, negative marking adjustments, and psychometric topic breakdown"
      />
    );
  }

  if (!results) {
    return (
      <div style={{ maxWidth: 800, margin: '40px auto', textAlign: 'center' }}>
        <ErrorBanner message={error || 'No test results found'} />
        <button onClick={() => navigate('/ncc-mock-tests')} style={{ padding: '10px 20px', background: 'var(--navy-900)', color: '#fff', border: 'none', borderRadius: 6 }}>
          Return to Portal
        </button>
      </div>
    );
  }

  const filteredQuestions = results.questions_review.filter((q) => {
    if (filterMode === 'wrong') return q.is_correct === false;
    if (filterMode === 'unanswered') return q.selected_option == null;
    return true;
  });

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #091a32 0%, #166534 100%)',
        borderRadius: 12,
        padding: 'clamp(20px, 4vw, 36px)',
        color: '#fff',
        marginBottom: 28,
        boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap', flex: 1, minWidth: 260 }}>
            <span style={{ fontSize: 36 }}>📋</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: '#86efac', textTransform: 'uppercase' }}>
                OFFICIAL EXAMINATION SCORECARD & PERFORMANCE REVIEW
              </div>
              <h1 style={{ fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 900, margin: '4px 0 0 0' }}>
                {results.title}
              </h1>
              <p style={{ margin: '6px 0 0 0', color: '#bbf7d0', fontSize: 13 }}>
                Status: COMPLETED • Time Taken: {Math.round(results.time_spent_seconds / 60)} min {results.time_spent_seconds % 60} sec
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {isOfficer && (
              <button
                onClick={() => navigate('/ncc-mock-tests/pipeline')}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(255,255,255,0.15)',
                  border: '1px solid rgba(255,255,255,0.3)',
                  color: '#fff',
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                ← Attempts Pipeline
              </button>
            )}
            <button
              onClick={() => window.print()}
              style={{
                padding: '8px 14px',
                background: 'rgba(255,255,255,0.25)',
                border: 'none',
                color: '#fff',
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              🖨️ Print Scorecard
            </button>
          </div>
        </div>

        {/* Examinee Identity Strip */}
        {results.cadet_name && (
          <div style={{
            marginTop: 18,
            paddingTop: 14,
            borderTop: '1px solid rgba(255,255,255,0.18)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: 12,
            alignItems: 'center',
            fontSize: 13,
          }}>
            <span style={{
              background: 'rgba(255,255,255,0.2)',
              padding: '4px 10px',
              borderRadius: 6,
              fontWeight: 800,
              letterSpacing: '0.04em',
              color: '#fff',
            }}>
              🎖️ {results.cadet_rank || 'CDT'} {results.cadet_name.toUpperCase()}
            </span>
            {results.cadet_regimental_number && (
              <span style={{ color: '#dcfce7', fontWeight: 600 }}>
                Regimental No: <strong style={{ color: '#fff' }}>{results.cadet_regimental_number}</strong>
              </span>
            )}
            {results.college_name && (
              <span style={{ color: '#dcfce7' }}>
                Unit / College: <strong style={{ color: '#fff' }}>{results.college_name}</strong>
              </span>
            )}
            {results.battalion_name && (
              <span style={{ color: '#dcfce7' }}>
                Battalion: <strong style={{ color: '#fff' }}>{results.battalion_name}</strong>
              </span>
            )}
          </div>
        )}
      </div>

      <ErrorBanner message={error} />

      {/* Key Scorecard Metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 180px), 1fr))', gap: 16, marginBottom: 28 }}>
        <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>TOTAL SCORE</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: results.total_score >= 0 ? '#16a34a' : '#dc2626', marginTop: 4 }}>
            {results.total_score}
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Out of {results.max_possible_score} pts</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>ACCURACY</div>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#2563eb', marginTop: 4 }}>
            {results.accuracy_percentage}%
          </div>
          <div style={{ fontSize: 11, color: '#64748b' }}>Correct vs Attempted</div>
        </div>

        <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>BREAKDOWN</div>
          <div style={{ fontSize: 14, fontWeight: 800, marginTop: 12, display: 'flex', justifyContent: 'center', gap: 10 }}>
            <span style={{ color: '#16a34a' }}>✓ {results.total_correct}</span>
            <span style={{ color: '#dc2626' }}>✗ {results.total_wrong}</span>
            <span style={{ color: '#64748b' }}>○ {results.total_unanswered}</span>
          </div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 8 }}>Correct • Wrong • Left</div>
        </div>

        {results.cohort_average_score != null && (
          <div style={{ background: '#fff', padding: 20, borderRadius: 10, border: '1px solid var(--border-color)', textAlign: 'center' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>COHORT BENCHMARK</div>
            <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy-900)', marginTop: 8 }}>
              {results.cohort_average_score} pts
            </div>
            <div style={{ fontSize: 11, color: results.total_score >= results.cohort_average_score ? '#16a34a' : '#dc2626', marginTop: 4, fontWeight: 700 }}>
              {results.total_score >= results.cohort_average_score ? '▲ Above Average' : '▼ Below Average'}
            </div>
          </div>
        )}
      </div>

      {/* AI Mentor Exam Diagnostic & Regimen */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
        borderRadius: 12,
        padding: 'clamp(20px, 3vw, 28px)',
        color: '#fff',
        marginBottom: 32,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 4px 16px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 24 }}>🤖</span>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, margin: 0, color: '#f8fafc' }}>
              AI MENTOR DIAGNOSTIC & PERSONALIZED CADET REGIMEN
            </h3>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>
              Automated cognitive analysis generated from your performance in this mock examination
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 280px), 1fr))', gap: 16 }}>
          {/* Card 1: Diagnostic Assessment */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#38bdf8', marginBottom: 8 }}>
              🎯 COGNITIVE DIAGNOSIS
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: '#cbd5e1', margin: 0 }}>
              {results.total_wrong === 0 && results.total_unanswered === 0
                ? "Flawless score! Cadet demonstrated mastery across all tested syllabus objectives. Ready for Certificate A/B/C distinction."
                : results.topic_breakdown?.filter(t => t.accuracy < 60).length > 0
                ? `Cadet shows conceptual vulnerability in: ${results.topic_breakdown.filter(t => t.accuracy < 60).map(t => t.topic_name).join(', ')}. Review standard NCC Handbook sections before re-attempting.`
                : "Solid baseline performance. Minor errors noted in question precision. Re-drilling with timed 20-Q sprints will reinforce retention."}
            </p>
          </div>

          {/* Card 2: 3-Day Action Plan */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#4ade80', marginBottom: 8 }}>
              📋 3-DAY ACTION REGIMEN
            </div>
            <div style={{ fontSize: 12, color: '#e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div><strong>Day 1:</strong> Review explanations for the {results.total_wrong} incorrect questions below.</div>
              <div><strong>Day 2:</strong> Execute a 20-min Quick Practice Sprint targeting weak areas.</div>
              <div><strong>Day 3:</strong> Attempt a full-length Certificate Mock under 90-min strict timing.</div>
            </div>
          </div>

          {/* Card 3: Memory Aid */}
          <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: 16, border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#fbbf24', marginBottom: 8 }}>
              💡 MENTOR MEMORY AID
            </div>
            <p style={{ fontSize: 13, lineHeight: 1.5, color: '#cbd5e1', margin: 0 }}>
              "Always memorize weapon dimensions, effective ranges, and drill timings by rote — they form 40%+ of official objective certificate papers."
            </p>
          </div>
        </div>
      </div>

      {/* Topic-Wise Breakdown Table */}
      {results.topic_breakdown && results.topic_breakdown.length > 0 && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 24, marginBottom: 32 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: '0 0 16px 0' }}>
            SYLLABUS TOPIC-WISE ACCURACY BREAKDOWN
          </h3>
          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>TOPIC</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>QUESTIONS</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>CORRECT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>WRONG</th>
                  <th style={{ padding: '10px 12px' }}>ACCURACY METER</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>MARKS</th>
                </tr>
              </thead>
              <tbody>
                {results.topic_breakdown.map((t) => (
                  <tr key={t.topic_code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--navy-900)' }}>{t.topic_name}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>{t.total_questions}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#16a34a', fontWeight: 700 }}>{t.correct}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center', color: '#dc2626', fontWeight: 700 }}>{t.wrong}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ flex: 1, background: '#e2e8f0', height: 8, borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${t.accuracy}%`, background: t.accuracy >= 75 ? '#16a34a' : t.accuracy >= 50 ? '#eab308' : '#dc2626', height: '100%' }} />
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, minWidth: 35 }}>{t.accuracy}%</span>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: 700 }}>
                      {t.marks_obtained > 0 ? `+${t.marks_obtained}` : t.marks_obtained}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Question Review Section with Filter Pills */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
              DETAILED QUESTION-BY-QUESTION REVIEW
            </h3>
            <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Inspect your selections, correct handbook keys, detailed rationale, and official syllabus citations.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setFilterMode('all')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: filterMode === 'all' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: filterMode === 'all' ? '#eff6ff' : '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              All ({results.questions_review.length})
            </button>
            <button
              onClick={() => setFilterMode('wrong')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: filterMode === 'wrong' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                background: filterMode === 'wrong' ? '#fee2e2' : '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Incorrect ({results.total_wrong})
            </button>
            <button
              onClick={() => setFilterMode('unanswered')}
              style={{
                padding: '6px 12px',
                borderRadius: 6,
                border: filterMode === 'unanswered' ? '2px solid #64748b' : '1px solid #cbd5e1',
                background: filterMode === 'unanswered' ? '#f1f5f9' : '#fff',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer'
              }}
            >
              Unanswered ({results.total_unanswered})
            </button>
          </div>
        </div>

        {/* Questions List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {filteredQuestions.map((q, idx) => {
            const isCorrect = q.is_correct === true;
            const isWrong = q.is_correct === false;
            const isSkipped = q.selected_option == null;

            return (
              <div
                key={q.id}
                style={{
                  border: `1px solid ${isCorrect ? '#86efac' : isWrong ? '#fca5a5' : '#cbd5e1'}`,
                  borderRadius: 10,
                  padding: 20,
                  background: isCorrect ? '#f0fdf4' : isWrong ? '#fff5f5' : '#f8fafc'
                }}
              >
                {/* Header Badge */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontWeight: 800, fontSize: 13, color: 'var(--navy-900)' }}>Q{idx + 1}.</span>
                    <span style={{ background: '#e2e8f0', color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                      {q.topic_code.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  </div>

                  <span style={{
                    fontWeight: 800,
                    fontSize: 12,
                    color: isCorrect ? '#16a34a' : isWrong ? '#dc2626' : '#64748b',
                  }}>
                    {isCorrect ? '✓ CORRECT (+1.0)' : isWrong ? '✗ WRONG (-0.25)' : '○ UNANSWERED (0.0)'}
                  </span>
                </div>

                {/* Statement */}
                <div style={{ fontSize: 15, fontWeight: 600, color: '#1e293b', marginBottom: 16 }}>
                  {q.statement}
                </div>

                {/* 4 Options */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 8, marginBottom: 16 }}>
                  {q.options.map((opt, optIdx) => {
                    const isCadetPick = q.selected_option === optIdx;
                    const isTheKey = q.correct_option === optIdx;
                    const letter = String.fromCharCode(65 + optIdx);

                    let bg = '#fff';
                    let border = '1px solid #cbd5e1';
                    let badge = '';

                    if (isTheKey) {
                      bg = '#dcfce7';
                      border = '2px solid #16a34a';
                      badge = '✓ Correct Answer';
                    }
                    if (isCadetPick && !isTheKey) {
                      bg = '#fee2e2';
                      border = '2px solid #dc2626';
                      badge = '✗ Your Choice';
                    }
                    if (isCadetPick && isTheKey) {
                      badge = '✓ Your Choice (Correct)';
                    }

                    return (
                      <div
                        key={optIdx}
                        style={{
                          padding: '10px 14px',
                          borderRadius: 6,
                          background: bg,
                          border: border,
                          fontSize: 13,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: 10
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <strong style={{ color: '#475569' }}>{letter}.</strong>
                          <span>{opt}</span>
                        </div>
                        {badge && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: isTheKey ? '#15803d' : '#b91c1c' }}>
                            {badge}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Official Explanation Box */}
                <div style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 6,
                  padding: '12px 16px',
                  fontSize: 12,
                  color: '#334155',
                  lineHeight: 1.5
                }}>
                  <div style={{ color: '#0369a1', fontWeight: 800, marginBottom: 2 }}>
                    📖 OFFICIAL HANDBOOK EXPLANATION:
                  </div>
                  <div>{q.explanation}</div>
                  {q.source_reference && (
                    <div style={{ color: '#64748b', fontSize: 11, marginTop: 4, fontStyle: 'italic' }}>
                      Citation: {q.source_reference}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Back Button */}
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
          <button
            onClick={() => navigate('/ncc-mock-tests')}
            style={{
              padding: '12px 28px',
              background: 'var(--navy-900)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              fontSize: 14,
              cursor: 'pointer'
            }}
          >
            Return to Mock Test Portal ➔
          </button>
        </div>
      </div>
    </div>
  );
}
