import { useState, useEffect, useCallback } from 'react';
import { Panel, TagGuide, ErrorBanner } from '../components/Form';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { NccCrest } from '../components/NccLogo';

export default function AISuiteView() {
  const { user } = useAuth();
  const isCadet = user?.role === 'cadet';

  const [activeTab, setActiveTab] = useState('insights');
  const [cadets, setCadets] = useState([]);
  const [selectedCadetId, setSelectedCadetId] = useState('');
  const [insight, setInsight] = useState(null);
  const [queryText, setQueryText] = useState('');
  const [queryResponse, setQueryResponse] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [error, setError] = useState('');

  // Drill Analysis State
  const [analyzingDrill, setAnalyzingDrill] = useState(false);
  const [drillResult, setDrillResult] = useState(null);

  // MCQ State
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedOption, setSelectedOption] = useState(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Load cadets or current cadet profile
  useEffect(() => {
    if (isCadet) {
      api.getMyCadetProfile()
        .then(profile => {
          if (profile?.id) {
            setSelectedCadetId(String(profile.id));
            loadInsightForCadet(profile.id);
          }
        })
        .catch(() => {});
    } else {
      api.listCadets()
        .then(data => {
          if (Array.isArray(data) && data.length > 0) {
            setCadets(data);
            setSelectedCadetId(String(data[0].id));
            loadInsightForCadet(data[0].id);
          }
        })
        .catch(() => {});
    }
  }, [isCadet]);

  function loadInsightForCadet(cId) {
    if (!cId) return;
    setLoadingInsight(true);
    setError('');
    api.getCadetInsight(cId)
      .then(data => {
        setInsight(data);
      })
      .catch(err => {
        setError(err.message || 'Could not synthesize AI insight.');
      })
      .finally(() => setLoadingInsight(false));
  }

  const mcqQuestions = [
    {
      q: 'What is the official motto of the National Cadet Corps (NCC)?',
      options: ['Valour and Wisdom', 'Unity and Discipline', 'Duty, Honour, Country', 'Service Before Self'],
      ans: 1,
    },
    {
      q: 'In which year was the National Cadet Corps formally established in India?',
      options: ['1947', '1948', '1950', '1952'],
      ans: 1,
    },
    {
      q: 'What is the standard marching cadence pace for NCC cadets in Quick March (Tez Chal)?',
      options: ['100 paces per minute', '110 paces per minute', '120 paces per minute', '140 paces per minute'],
      ans: 2,
    },
    {
      q: 'Which camp is held annually in New Delhi leading up to Republic Day celebrations?',
      options: ['CATC', 'NIC', 'RDC', 'TSC'],
      ans: 2,
    },
  ];

  function handleQuerySubmit(e) {
    e.preventDefault();
    if (!queryText.trim()) return;
    setQueryLoading(true);
    setTimeout(() => {
      const q = queryText.toLowerCase();
      let ans = '';
      if (q.includes('rdc') || q.includes('republic day')) {
        ans = 'Republic Day Camp (RDC) is held in Delhi every January. Cadets are selected after qualifying Pre-RDC (I, II, III) and IGC (Inter-Group Competitions). Criteria include drill perfection, weapon handling, culture, and Best Cadet written examination.';
      } else if (q.includes('dress') || q.includes('uniform') || q.includes('turnout')) {
        ans = 'NCC Uniform SOP: Khaki uniform ironed without wrinkles, brass items (buckle, cap badge, buttons) shined with Brasso, black DMS boots polished to mirror gloss, beret badge positioned 1 inch above left eyebrow.';
      } else if (q.includes('certificate') || q.includes('c cert') || q.includes('b cert')) {
        ans = 'C-Certificate eligibility requires holding a B-Certificate with minimum B grade, completing 75% parade attendances in 3rd year, and attending at least two camps (one must be CATC).';
      } else {
        ans = `According to official NCC Training Directives: All cadets must maintain minimum 75% parade attendance, uphold strict military bearing, and adhere to the NCC Red Book standard operational procedures.`;
      }
      setQueryResponse(ans);
      setQueryLoading(false);
    }, 400);
  }

  function handleAnalyzeDrill() {
    setAnalyzingDrill(true);
    setDrillResult(null);
    setTimeout(() => {
      setDrillResult({
        posture_score: 9.4,
        arm_swing_angle: '89° (Optimal: 90°)',
        foot_impact_timing: 'Synchronized (120 bpm)',
        head_bearing: 'Erect (Eyes straight ahead)',
        verdict: 'EXEMPLARY POSTURE — CEREMONIAL SQUAD READY',
        improvements: ['Lock left wrist firmly at peak back-swing.', 'Ensure uniform heel click on Savdhan transition.'],
      });
      setAnalyzingDrill(false);
    }, 1000);
  }

  function handleAnswerOption(idx) {
    setSelectedOption(idx);
    if (idx === mcqQuestions[currentQuestion].ans) {
      setQuizScore(prev => prev + 1);
    }
    setTimeout(() => {
      if (currentQuestion + 1 < mcqQuestions.length) {
        setCurrentQuestion(prev => prev + 1);
        setSelectedOption(null);
      } else {
        setQuizCompleted(true);
      }
    }, 800);
  }

  function resetQuiz() {
    setCurrentQuestion(0);
    setSelectedOption(null);
    setQuizScore(0);
    setQuizCompleted(false);
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>SYNTHETIC INTELLIGENCE & TACTICAL ADVISORY ENGINE</span>
            </div>
            <h2>AI Command & Performance Suite</h2>
            <p>
              AI-assisted drill diagnostics, weekly training regimen generation, weak area bottleneck detection, and interactive NCC rulebook assistance.
            </p>
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
        >
          📊 Strategic Insights & 7-Day Plan
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'drill' ? 'active' : ''}`}
          onClick={() => setActiveTab('drill')}
        >
          🎖️ AI Drill & Stance Analyzer
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
          onClick={() => setActiveTab('query')}
        >
          📖 NCC SOP & Rulebook Assistant
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'mcq' ? 'active' : ''}`}
          onClick={() => setActiveTab('mcq')}
        >
          📝 Knowledge & Certificate MCQ
        </button>
      </div>

      {/* TAB 1: Insights & 7-Day Plan */}
      {activeTab === 'insights' && (
        <div>
          {!isCadet && cadets.length > 0 && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: 'var(--shadow-card)',
            }}>
              <label htmlFor="aiCadetSelect" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>
                SELECT CADET FOR AI ANALYSIS:
              </label>
              <select
                id="aiCadetSelect"
                value={selectedCadetId}
                onChange={e => {
                  setSelectedCadetId(e.target.value);
                  loadInsightForCadet(e.target.value);
                }}
                style={{ height: 36, fontSize: 13, flex: '1 1 300px' }}
              >
                {cadets.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.enrollment_number}) • {c.wing || 'SW'}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="ai-brief-card">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', color: 'var(--ncc-gold)', textTransform: 'uppercase' }}>
                AI STRATEGIC ASSESSMENT REPORT
              </span>
              <span className="badge badge-success">
                {insight?.consistency_rating || '94.2% High Consistency'}
              </span>
            </div>
            <h3 style={{ fontSize: 20, color: '#FFFFFF', marginBottom: 10 }}>Tactical Performance Summary</h3>
            <p style={{ color: '#E2E8F0', fontSize: 14, lineHeight: 1.6, maxWidth: 860 }}>
              {loadingInsight ? 'Synthesizing 9-pillar evaluation data…' : (insight?.summary ||
                'Cadet demonstrates exemplary posture in ceremonial drill and high squad command capability. Focus on weapon stripping and theory mock questions.')}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: 24, marginBottom: 24 }}>
            {/* Weak Areas */}
            <Panel title="Priority Weak Areas & Remediation" guideTag="BOTTLENECK DIAGNOSTICS">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(insight?.weak_areas && insight.weak_areas.length > 0 ? insight.weak_areas : [
                  'Physical Endurance (5km Pace)',
                  'Weapon Drill (.22 Rifle Assembling)',
                  'Map Reading (Grid Reference Precision)',
                ]).map((w, idx) => (
                  <div key={idx} style={{
                    background: 'var(--danger-bg)',
                    border: '1px solid var(--danger-border)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <span style={{ fontSize: 16 }}>⚠️</span>
                    <span style={{ fontWeight: 600, color: 'var(--danger)', fontSize: 13 }}>{w}</span>
                  </div>
                ))}
              </div>
            </Panel>

            {/* Strength Areas */}
            <Panel title="Core Operational Strengths" guideTag="MASTERY PILLARS">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {(insight?.strength_areas && insight.strength_areas.length > 0 ? insight.strength_areas : [
                  'Ceremonial Foot Drill',
                  'Squad Command Voice',
                  'Discipline & Military Bearing',
                ]).map((s, idx) => (
                  <div key={idx} style={{
                    background: 'var(--success-bg)',
                    border: '1px solid var(--success-border)',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-sm)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                  }}>
                    <span style={{ fontSize: 16 }}>⭐</span>
                    <span style={{ fontWeight: 600, color: 'var(--success)', fontSize: 13 }}>{s}</span>
                  </div>
                ))}
              </div>
            </Panel>
          </div>

          {/* 7-Day Plan */}
          <Panel title="AI-Synthesized 7-Day Training Regimen" guideTag="TRIAL PROTOCOL">
            <TagGuide
              tags={['Daily Targeted Regimen', 'Adaptive Conditioning', 'Parade Benchmark']}
              guide="Follow the customized 7-day protocol designed to elevate weaker scoring vectors and maintain ceremonial drill standards."
            />
            <div className="ai-plan-timeline">
              {(insight?.plan && insight.plan.length > 0 ? insight.plan : [
                { day: 'Day 1', focus: 'Drill Cadence & Arm Swing', action: '30 mins marching drill maintaining 120 paces/min with 90° arm swing lock.' },
                { day: 'Day 2', focus: 'Physical Endurance Run', action: '4.5km interval jogging with 3x 100m sprint bursts.' },
                { day: 'Day 3', focus: 'Weapon Drill & Safety SOP', action: 'Timed practice for bolt removal, magazine fitting, and safe handling protocol.' },
                { day: 'Day 4', focus: 'Map Reading & Compass Bearing', action: 'Prismatic compass alignment and finding own position by resection method.' },
                { day: 'Day 5', focus: 'Leadership & Briefing Drill', action: 'Conduct 15-minute squad inspection and give commanding words of command.' },
                { day: 'Day 6', focus: 'Obstacle Course Conditioning', action: 'Ramp, 6ft wall, and zigzag balance clearance simulation.' },
                { day: 'Day 7', focus: 'Weekly Assessment Review', action: 'Full parade uniform turnout check and composite rehearsal with ANO.' },
              ]).map((p, idx) => (
                <div key={idx} className="ai-day-card">
                  <div className="day-badge">{idx + 1}</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--navy-900)' }}>{p.day}: {p.focus}</span>
                      <span className="badge badge-olive">TARGETED</span>
                    </div>
                    <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
                      {p.action}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      )}

      {/* TAB 2: AI Drill Stance Analyzer */}
      {activeTab === 'drill' && (
        <Panel title="Computer Vision Stance & Drill Evaluator" guideTag="POSTURE AI">
          <TagGuide
            tags={['Biometric Alignment', 'Cadence Tracking', 'Parade Bearing Check']}
            guide="Simulates computer-vision evaluation of cadet posture during Savdhan (Attention), Vishram (Stand at Ease), and Quick March arm swing."
          />

          <div style={{
            background: 'var(--bg-main)',
            border: '1px dashed var(--border-strong)',
            borderRadius: 'var(--radius-md)',
            padding: '36px 20px',
            textAlign: 'center',
            marginBottom: 20,
          }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>📷</div>
            <h4 style={{ fontSize: 16, color: 'var(--navy-900)', marginBottom: 6 }}>Drill Alignment Simulator</h4>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, maxWidth: 500, margin: '0 auto 20px' }}>
              Run AI biometric scan on cadet parade video capture or simulated drill posture vectors.
            </p>
            <button className="primary" onClick={handleAnalyzeDrill} disabled={analyzingDrill}>
              {analyzingDrill ? 'Analyzing Drill Coordinates…' : '🚀 Launch Drill Analysis Scan'}
            </button>
          </div>

          {drillResult && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '24px',
              boxShadow: 'var(--shadow-card)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <span className="badge badge-success" style={{ marginBottom: 6 }}>{drillResult.verdict}</span>
                  <h3 style={{ fontSize: 18, color: 'var(--navy-900)' }}>Stance Evaluation Matrix</h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>POSTURE RATING</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--success)' }}>{drillResult.posture_score} / 10</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Arm Swing Angle</div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)', marginTop: 2 }}>{drillResult.arm_swing_angle}</div>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Foot March Cadence</div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)', marginTop: 2 }}>{drillResult.foot_impact_timing}</div>
                </div>
                <div style={{ background: 'var(--bg-main)', padding: '12px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Head Bearing</div>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)', marginTop: 2 }}>{drillResult.head_bearing}</div>
                </div>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 6 }}>Directives for Perfection:</div>
                <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: 'var(--text-body)' }}>
                  {drillResult.improvements.map((imp, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>{imp}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </Panel>
      )}

      {/* TAB 3: NCC SOP & Rulebook Assistant */}
      {activeTab === 'query' && (
        <Panel title="NCC SOP & Rulebook Query Assistant" guideTag="NCC RED BOOK AI">
          <TagGuide
            tags={['Official SOP Knowledgebase', 'Camp Eligibility', 'Drill Manual Protocol']}
            guide="Ask any procedural question regarding NCC camps (RDC, CATC, TSC), dress regulations, rank structure, or C-Certificate examinations."
          />

          <form onSubmit={handleQuerySubmit} style={{ marginBottom: 20 }}>
            <div className="field">
              <div className="field-header"><label>Enter Official Protocol Query</label></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="e.g. What are the selection requirements for Republic Day Camp (RDC)?"
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="primary" disabled={queryLoading}>
                  {queryLoading ? 'Consulting SOPs…' : 'Ask AI'}
                </button>
              </div>
            </div>
          </form>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Suggested:</span>
            <button type="button" className="quick-fill-btn" onClick={() => setQueryText('What are the selection criteria for RDC?')}>
              RDC Selection Criteria
            </button>
            <button type="button" className="quick-fill-btn" onClick={() => setQueryText('What are uniform and turnout standards for parade?')}>
              Uniform Turnout Rules
            </button>
            <button type="button" className="quick-fill-btn" onClick={() => setQueryText('What is the eligibility for NCC C-Certificate exam?')}>
              C-Certificate Eligibility
            </button>
          </div>

          {queryResponse && (
            <div style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderLeft: '4px solid var(--olive-600)',
              borderRadius: 'var(--radius-sm)',
              padding: '18px',
              marginTop: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--olive-800)', marginBottom: 6, letterSpacing: '0.05em' }}>
                OFFICIAL DIRECTIVE CITATION
              </div>
              <p style={{ fontSize: 14, color: 'var(--navy-900)', lineHeight: 1.6 }}>
                {queryResponse}
              </p>
            </div>
          )}
        </Panel>
      )}

      {/* TAB 4: MCQ & Knowledge Simulator */}
      {activeTab === 'mcq' && (
        <Panel title="NCC Knowledge & Certificate Examination Simulator" guideTag="EXAM PREPARATION">
          <TagGuide
            tags={['A / B / C Certificate Prep', 'General Military Knowledge', 'Real-Time Evaluation']}
            guide="Interactive mock questions testing General NCC knowledge, military history, weapon training, and national integration."
          />

          {!quizCompleted ? (
            <div style={{ background: 'var(--bg-main)', padding: '24px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span className="badge badge-olive">Question {currentQuestion + 1} of {mcqQuestions.length}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Current Score: {quizScore}</span>
              </div>

              <h4 style={{ fontSize: 16, color: 'var(--navy-900)', marginBottom: 20 }}>
                {mcqQuestions[currentQuestion].q}
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {mcqQuestions[currentQuestion].options.map((opt, idx) => {
                  let style = {
                    background: '#FFFFFF',
                    border: '1px solid var(--border)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius-sm)',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: 14,
                    fontWeight: 500,
                    transition: 'all 0.15s ease',
                  };
                  if (selectedOption !== null) {
                    if (idx === mcqQuestions[currentQuestion].ans) {
                      style.background = 'var(--success-bg)';
                      style.borderColor = 'var(--success-border)';
                      style.color = 'var(--success)';
                      style.fontWeight = 700;
                    } else if (idx === selectedOption) {
                      style.background = 'var(--danger-bg)';
                      style.borderColor = 'var(--danger-border)';
                      style.color = 'var(--danger)';
                    }
                  }

                  return (
                    <button
                      key={idx}
                      type="button"
                      style={style}
                      disabled={selectedOption !== null}
                      onClick={() => handleAnswerOption(idx)}
                    >
                      {String.fromCharCode(65 + idx)}. {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '36px 20px', background: 'var(--bg-main)', borderRadius: 'var(--radius-md)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>🏆</div>
              <h3 style={{ fontSize: 20, color: 'var(--navy-900)', marginBottom: 6 }}>Mock Assessment Completed!</h3>
              <p style={{ fontSize: 16, color: 'var(--text-muted)', marginBottom: 20 }}>
                You scored <strong>{quizScore} / {mcqQuestions.length}</strong> ({Math.round((quizScore / mcqQuestions.length) * 100)}%) on official NCC syllabus parameters.
              </p>
              <button className="primary" onClick={resetQuiz}>
                🔄 Retake Knowledge Assessment
              </button>
            </div>
          )}
        </Panel>
      )}
    </div>
  );
}
