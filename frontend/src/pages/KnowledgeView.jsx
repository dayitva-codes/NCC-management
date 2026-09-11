import { useState } from 'react';
import { Panel } from '../components/Form';
import { NccCrest, ArmyWingEmblem, NavyWingEmblem, AirWingEmblem } from '../components/NccLogo';

const NCC_SUBJECTS = [
  { id: 'drill', name: 'Drill & Ceremonial Parades', icon: '🎖️', count: '14 Topics' },
  { id: 'wt', name: 'Weapon Training (.22 Rifle & 7.62mm)', icon: '🎯', count: '10 Topics' },
  { id: 'mr', name: 'Map Reading & Navigation', icon: '🗺️', count: '8 Topics' },
  { id: 'ni', name: 'National Integration & History', icon: '🇮🇳', count: '12 Topics' },
  { id: 'dm', name: 'Disaster Management & First Aid', icon: '🏥', count: '9 Topics' },
  { id: 'lead', name: 'Leadership & Military Ethics', icon: '⭐', count: '11 Topics' },
];

const SAMPLE_MCQS = [
  {
    id: 1,
    question: "What is the standard angle of feet in the 'Savdhan' (Attention) position in NCC drill?",
    options: ['30 degrees', '45 degrees', '60 degrees', '90 degrees'],
    correct: 0,
    explanation: 'In the Savdhan position, heels are together and toes point outward at an angle of 30 degrees.',
  },
  {
    id: 2,
    question: "What is the official motto of the National Cadet Corps (NCC)?",
    options: ['Service Before Self', 'Unity and Discipline', 'Valour and Faith', 'Duty, Honour, Country'],
    correct: 1,
    explanation: "The motto of NCC is 'Unity and Discipline' (एकता और अनुशासन), adopted on 23 Dec 1957.",
  },
  {
    id: 3,
    question: 'What is the caliber of the standard Point 22 Deluxe Rifle used in NCC marksmanship?',
    options: ['0.22 inches (5.56 mm)', '0.303 inches', '7.62 mm', '9 mm'],
    correct: 0,
    explanation: 'The Point 22 Deluxe Rifle has a bore/caliber of .22 inches (5.56 mm) with a magazine capacity of 5 rounds.',
  },
  {
    id: 4,
    question: 'How many inches is the standard pace length in Quick March (Tez Chal)?',
    options: ['24 inches', '30 inches', '33 inches', '40 inches'],
    correct: 1,
    explanation: 'The standard pace in Quick March is 30 inches, taken at a cadence of 120 paces per minute (110 for SW).',
  },
];

const DRILL_COMMANDS = [
  { cmd: 'Savdhan (सावधान)', action: 'Attention position. Heels together, toes 30° apart, thumbs aligned with trouser seams.' },
  { cmd: 'Vishram (विश्राम)', action: 'Stand at ease. Left foot moved 12 inches to the left. Hands clasped behind back, left hand over right.' },
  { cmd: 'Dahine Mur (दाहिने मुड़)', action: 'Turn 90 degrees to the right on the right heel and left toe.' },
  { cmd: 'Baayein Mur (बायें मुड़)', action: 'Turn 90 degrees to the left on the left heel and right toe.' },
  { cmd: 'Peeche Mur (पीछे मुड़)', action: 'About turn 180 degrees via the right side. Maintain balance without body sway.' },
  { cmd: 'Khuli Line Chal (खुली लाइन चल)', action: 'Front rank takes 2 paces forward, rear rank takes 2 paces backward for inspection.' },
];

export default function KnowledgeView() {
  const [activeSection, setActiveSection] = useState('mcq');
  const [quizAnswers, setQuizAnswers] = useState({});
  const [submittedQuiz, setSubmittedQuiz] = useState(false);

  function handleSelectOption(qId, optIdx) {
    if (submittedQuiz) return;
    setQuizAnswers(prev => ({ ...prev, [qId]: optIdx }));
  }

  const score = Object.keys(quizAnswers).reduce((acc, qId) => {
    const q = SAMPLE_MCQS.find(item => item.id === Number(qId));
    return acc + (q && q.correct === quizAnswers[qId] ? 1 : 0);
  }, 0);

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>TRAINING REPOSITORY & EXAM PREPARATION</span>
            </div>
            <h2>NCC Knowledge Bank & MCQ Academy</h2>
            <p>
              Official syllabus coverage, ceremonial drill handbooks, and interactive mock tests for 'A', 'B', and 'C' Certificate exams.
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className={activeSection === 'mcq' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('mcq')}
            style={{ height: 36, fontSize: 13 }}
          >
            📝 Interactive Mock MCQ
          </button>
          <button
            type="button"
            className={activeSection === 'handbook' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('handbook')}
            style={{ height: 36, fontSize: 13 }}
          >
            📖 Drill Handbook
          </button>
          <button
            type="button"
            className={activeSection === 'ranks' ? 'primary' : 'secondary'}
            onClick={() => setActiveSection('ranks')}
            style={{ height: 36, fontSize: 13 }}
          >
            🎖️ Ranks & Insignias
          </button>
        </div>
      </div>

      {/* Subject Pillars Banner */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
        gap: 12,
        marginBottom: 24,
      }}>
        {NCC_SUBJECTS.map(subj => (
          <div
            key={subj.id}
            style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <span style={{ fontSize: 22 }}>{subj.icon}</span>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>{subj.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subj.count}</div>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 1: INTERACTIVE MCQ */}
      {activeSection === 'mcq' && (
        <Panel title="Cadet Mock Examination — Common Subjects ('B' & 'C' Cert)" tag="EXAM ENGINE">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {SAMPLE_MCQS.map((q, qIndex) => {
              const selectedOpt = quizAnswers[q.id];
              const isCorrect = selectedOpt === q.correct;

              return (
                <div
                  key={q.id}
                  style={{
                    padding: 16,
                    borderRadius: 'var(--radius-sm)',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-main)',
                  }}
                >
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 12 }}>
                    <span className="badge badge-navy" style={{ flexShrink: 0 }}>Q{qIndex + 1}</span>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)' }}>{q.question}</div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedOpt === optIdx;
                      let bg = '#FFFFFF';
                      let border = 'var(--border)';

                      if (submittedQuiz) {
                        if (optIdx === q.correct) {
                          bg = 'rgba(5, 150, 105, 0.15)';
                          border = 'var(--success)';
                        } else if (isSelected && !isCorrect) {
                          bg = 'rgba(220, 38, 38, 0.15)';
                          border = '#DC2626';
                        }
                      } else if (isSelected) {
                        bg = 'rgba(11, 29, 58, 0.1)';
                        border = 'var(--navy-900)';
                      }

                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectOption(q.id, optIdx)}
                          style={{
                            padding: '10px 14px',
                            borderRadius: 'var(--radius-sm)',
                            border: `1px solid ${border}`,
                            background: bg,
                            textAlign: 'left',
                            fontSize: 13,
                            color: 'var(--navy-900)',
                            fontWeight: isSelected ? 700 : 500,
                            cursor: submittedQuiz ? 'default' : 'pointer',
                          }}
                        >
                          <span style={{ marginRight: 8, color: 'var(--text-muted)' }}>{String.fromCharCode(65 + optIdx)}.</span>
                          {opt}
                        </button>
                      );
                    })}
                  </div>

                  {submittedQuiz && (
                    <div style={{
                      marginTop: 12,
                      padding: 10,
                      background: '#FFFFFF',
                      borderRadius: 'var(--radius-sm)',
                      fontSize: 12,
                      color: isCorrect ? 'var(--olive-700)' : '#DC2626',
                      borderLeft: `3px solid ${isCorrect ? 'var(--olive-700)' : '#DC2626'}`,
                    }}>
                      <span style={{ fontWeight: 700 }}>{isCorrect ? '✓ Correct! ' : '✗ Incorrect. '}</span>
                      {q.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            {submittedQuiz ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)' }}>
                  Final Score: {score} / {SAMPLE_MCQS.length} ({Math.round((score / SAMPLE_MCQS.length) * 100)}%)
                </span>
                <span className={`badge ${score === SAMPLE_MCQS.length ? 'badge-success' : 'badge-saffron'}`}>
                  {score >= 3 ? 'PASSED QUALIFICATION' : 'RETRY REQUIRED'}
                </span>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => {
                    setSubmittedQuiz(false);
                    setQuizAnswers({});
                  }}
                  style={{ height: 36, fontSize: 12 }}
                >
                  Restart Quiz
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                <button
                  type="button"
                  className="primary"
                  onClick={() => setSubmittedQuiz(true)}
                  disabled={Object.keys(quizAnswers).length === 0}
                  style={{ height: 40, padding: '0 24px' }}
                >
                  Submit Answers & Evaluate Score
                </button>
              </div>
            )}
          </div>
        </Panel>
      )}

      {/* SECTION 2: DRILL HANDBOOK */}
      {activeSection === 'handbook' && (
        <Panel title="Official National Cadet Corps Drill Manual" tag="CEREMONIAL STANDARDS">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Command executions recognized by the Directorate General NCC for parade discipline and Republic Day Contingents:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {DRILL_COMMANDS.map((drill, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 16px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: '#FFFFFF',
                  display: 'flex',
                  gap: 16,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{
                  padding: '6px 10px',
                  borderRadius: 'var(--radius-xs)',
                  background: 'var(--navy-900)',
                  color: '#FFF',
                  fontWeight: 700,
                  fontSize: 12,
                  flexShrink: 0,
                }}>
                  {drill.cmd}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5, paddingTop: 4 }}>
                  {drill.action}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      {/* SECTION 3: RANKS & INSIGNIAS */}
      {activeSection === 'ranks' && (
        <Panel title="NCC Cadet Rank Structure & Hierarchy" tag="SENIORITY LADDER">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <ArmyWingEmblem size={24} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ncc-red)' }}>
                  SENIOR WING / DIVISION (COLLEGE LEVEL)
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--navy-900)', lineHeight: 1.8 }}>
                <li><strong>Senior Under Officer (SUO)</strong> — Highest Cadet Rank</li>
                <li><strong>Under Officer (UO)</strong> — Company Second-in-Command</li>
                <li><strong>Company Sergeant Major (CSM)</strong></li>
                <li><strong>Company Quartermaster Sergeant (CQMS)</strong></li>
                <li><strong>Sergeant (SGT)</strong></li>
                <li><strong>Corporal (CPL)</strong></li>
                <li><strong>Lance Corporal (L/CPL)</strong></li>
                <li><strong>Cadet (CDT)</strong> — Entry Level</li>
              </ul>
            </div>

            <div style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', padding: 16, borderRadius: 'var(--radius-sm)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <AirWingEmblem size={24} />
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ncc-navy)' }}>
                  JUNIOR WING / DIVISION (SCHOOL LEVEL)
                </div>
              </div>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--navy-900)', lineHeight: 1.8 }}>
                <li><strong>Troop Sergeant Major (TSM)</strong></li>
                <li><strong>Troop Quartermaster Sergeant (TQMS)</strong></li>
                <li><strong>Sergeant</strong></li>
                <li><strong>Corporal</strong></li>
                <li><strong>Lance Corporal</strong></li>
                <li><strong>Junior Cadet</strong></li>
              </ul>
            </div>
          </div>
        </Panel>
      )}
    </div>
  );
}
