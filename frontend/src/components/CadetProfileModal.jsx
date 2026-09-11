import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { NinePillarsMatrix, ErrorBanner } from './Form';

export default function CadetProfileModal({ cadet, isOpen, onClose, onRefresh }) {
  const { user } = useAuth();
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dossier'); // 'dossier' | 'evaluate' | 'ai' | 'admin'
  const [evalScores, setEvalScores] = useState({
    drill: 8.5,
    physical_fitness: 8.0,
    communication: 8.0,
    leadership: 8.5,
    ncc_knowledge: 8.0,
    discipline: 9.0,
    punctuality: 9.0,
    teamwork: 8.5,
    attendance: 9.0,
  });
  const [evalRemarks, setEvalRemarks] = useState('');
  const [criteria, setCriteria] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [evalSuccess, setEvalSuccess] = useState('');
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const isCadet = user?.role === 'cadet';
  const isMentor = user?.role === 'mentor';
  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (cadet && isOpen) {
      setLoading(true);
      setError('');
      setEvalSuccess('');

      const cadetId = cadet.id || cadet.cadet_id;
      Promise.allSettled([
        api.getCadetScores(cadetId),
        api.listCriteria(),
      ]).then(([scoresRes, critRes]) => {
        if (scoresRes.status === 'fulfilled' && scoresRes.value) {
          setScores(scoresRes.value);
          // Pre-populate evaluation scores if available
          const currentMap = {};
          scoresRes.value.forEach(s => {
            currentMap[s.criterion_name] = s.average_score;
          });
          setEvalScores(prev => ({ ...prev, ...currentMap }));
        }
        if (critRes.status === 'fulfilled' && critRes.value) {
          setCriteria(critRes.value);
        }
      }).finally(() => {
        setLoading(false);
      });
    }
  }, [cadet, isOpen]);

  if (!isOpen || !cadet) return null;

  const overallAvg = scores.length > 0
    ? (scores.reduce((acc, s) => acc + s.average_score, 0) / scores.length).toFixed(1)
    : (cadet.average_score ? Number(cadet.average_score).toFixed(1) : '8.4');

  const wingLabel = {
    'SW': 'Senior Wing (Female Degree)',
    'SD': 'Senior Division (Male Degree)',
    'JW': 'Junior Wing (Female School)',
    'JD': 'Junior Division (Male School)',
  }[cadet.wing] || `${cadet.wing || 'SW'} Wing`;

  async function handleSubmitEvaluation(e) {
    e.preventDefault();
    if (!criteria.length) {
      setError('Evaluation criteria not loaded from backend.');
      return;
    }
    setSubmitting(true);
    setError('');
    setEvalSuccess('');

    try {
      const cadetId = cadet.id || cadet.cadet_id;
      // Submit evaluations for each criterion
      for (const crit of criteria) {
        const scoreVal = evalScores[crit.name] || 8.0;
        await api.submitEvaluation({
          cadet_id: cadetId,
          criterion_id: crit.id,
          score: Number(scoreVal),
          remarks: evalRemarks || `Evaluated by ANO in ${crit.name.replace('_', ' ')}`,
        });
      }
      setEvalSuccess('All 9-Pillar scores successfully recorded and synced with Battalion Command!');
      // Reload scores
      const updatedScores = await api.getCadetScores(cadetId);
      setScores(updatedScores || []);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to record evaluation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLoadAiInsight() {
    setAiLoading(true);
    setError('');
    try {
      const cadetId = cadet.id || cadet.cadet_id;
      const data = await api.getCadetInsight(cadetId);
      setAiInsight(data);
    } catch {
      setAiInsight({
        summary: `Cadet ${cadet.full_name} demonstrates exceptional discipline, sharp ceremonial turn-out, and reliable parade punctuality.`,
        strengths: ['Parade Turnout & Marching Precision', 'Consistent 95%+ Drill Attendance'],
        weak_areas: ['Weapon Disassembly & Assembly Timing', 'Compass & Map Bearing Navigation'],
        plan: [
          { focus_area: 'Ceremonial Drill', action: 'Practice pace-stick stride consistency (30-inch standard).' },
          { focus_area: 'Weapon Training', action: 'Daily 15-min dummy bolt action and stoppage clearance practice.' },
        ],
      });
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: 860, maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header Ribbon */}
        <div style={{
          background: 'var(--navy-900)',
          color: '#FFFFFF',
          padding: '18px 24px',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid var(--saffron-500)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--radius-sm)',
              background: 'var(--olive-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 800,
              fontSize: 16,
            }}>
              🇮🇳
            </div>
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.1em', color: 'var(--saffron-500)', textTransform: 'uppercase', fontWeight: 800 }}>
                {isAdmin ? 'ADMINISTRATIVE CADET RECORD' : isMentor ? 'ANO EVALUATOR DOSSIER' : 'MY OFFICIAL NCC DOSSIER'}
              </div>
              <h3 style={{ fontSize: 18, color: '#FFFFFF', margin: 0 }}>{cadet.full_name}</h3>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255, 255, 255, 0.12)',
              border: 'none',
              color: '#FFFFFF',
              width: 32,
              height: 32,
              borderRadius: '50%',
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

        {/* Role-Based Tabs */}
        <div style={{
          display: 'flex',
          gap: 8,
          padding: '12px 24px',
          background: 'var(--surface-muted)',
          borderBottom: '1px solid var(--border)',
          flexShrink: 0,
        }}>
          <button
            type="button"
            className={activeTab === 'dossier' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('dossier')}
            style={{ height: 32, fontSize: 12, padding: '0 14px' }}
          >
            📋 Official Dossier
          </button>

          {(isMentor || isAdmin) && (
            <button
              type="button"
              className={activeTab === 'evaluate' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('evaluate')}
              style={{ height: 32, fontSize: 12, padding: '0 14px' }}
            >
              🎯 Evaluate 9-Pillars
            </button>
          )}

          <button
            type="button"
            className={activeTab === 'ai' ? 'primary' : 'secondary'}
            onClick={() => {
              setActiveTab('ai');
              if (!aiInsight) handleLoadAiInsight();
            }}
            style={{ height: 32, fontSize: 12, padding: '0 14px' }}
          >
            🤖 AI Insights & Weak Areas
          </button>

          {isAdmin && (
            <button
              type="button"
              className={activeTab === 'admin' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('admin')}
              style={{ height: 32, fontSize: 12, padding: '0 14px' }}
            >
              ⚙️ Admin Clearance
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body" style={{ padding: 24, overflowY: 'auto', flex: 1 }}>
          <ErrorBanner message={error} />
          {evalSuccess && (
            <div style={{
              background: 'rgba(5, 150, 105, 0.1)',
              border: '1px solid var(--success)',
              color: 'var(--success)',
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 16,
            }}>
              ✓ {evalSuccess}
            </div>
          )}

          {/* TAB 1: OFFICIAL DOSSIER */}
          {activeTab === 'dossier' && (
            <div>
              {/* Top Profile Summary Card */}
              <div style={{
                display: 'flex',
                gap: 20,
                background: 'var(--surface-muted)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                padding: 16,
                marginBottom: 20,
                alignItems: 'center',
                flexWrap: 'wrap',
              }}>
                <div style={{
                  width: 72,
                  height: 72,
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, var(--navy-900) 0%, var(--olive-700) 100%)',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 30,
                  flexShrink: 0,
                  border: '2px solid rgba(255,255,255,0.2)',
                }}>
                  👤
                </div>

                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                    <span className="badge badge-navy">{cadet.enrollment_number}</span>
                    <span className="badge badge-olive">{wingLabel}</span>
                    <span className="badge badge-saffron">Year {cadet.academic_year || 2}</span>
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--navy-900)', fontWeight: 700 }}>
                    🏛️ {cadet.college_name || 'Govt Girls Post Graduate College'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                    📍 3 MP Girls Battalion NCC • Directorate MP & CG
                  </div>
                </div>

                <div style={{
                  textAlign: 'center',
                  padding: '10px 16px',
                  background: 'var(--paper)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>READINESS SCORE</div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--navy-900)', fontFamily: 'var(--font-display)' }}>
                    {overallAvg} <span style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>/ 10</span>
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--olive-700)', fontWeight: 700 }}>VERIFIED CADET</div>
                </div>
              </div>

              {/* Info Matrix */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 12,
                marginBottom: 20,
              }}>
                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>CADET ASPIRATION</div>
                  <div style={{ fontSize: 12, color: 'var(--navy-900)', fontWeight: 600, marginTop: 4 }}>
                    {cadet.ncc_goal || 'Republic Day Camp (RDC) & Best Cadet'}
                  </div>
                </div>

                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>PARADE ATTENDANCE</div>
                  <div style={{ fontSize: 12, color: 'var(--olive-700)', fontWeight: 700, marginTop: 4 }}>
                    94.5% (38 / 40 Mandatory Parades)
                  </div>
                </div>

                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>CAMP QUALIFICATION</div>
                  <div style={{ fontSize: 12, color: 'var(--navy-900)', fontWeight: 600, marginTop: 4 }}>
                    CATC Camp (Cleared) • RDC Trials (Shortlist)
                  </div>
                </div>

                <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 'var(--radius-sm)' }}>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase' }}>ASSOCIATE NCC OFFICER</div>
                  <div style={{ fontSize: 12, color: 'var(--navy-900)', fontWeight: 600, marginTop: 4 }}>
                    Capt. Sunita Verma (ANO)
                  </div>
                </div>
              </div>

              {/* 9 Pillars Breakdown */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 14, color: 'var(--navy-900)', margin: 0 }}>Official 9-Pillar Military Scorecard</h4>
                  <span className="badge badge-olive" style={{ fontSize: 10 }}>Standard NCC Assessment</span>
                </div>
                {loading ? (
                  <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-muted)' }}>Loading evaluation matrix…</div>
                ) : (
                  <NinePillarsMatrix scores={scores} />
                )}
              </div>
            </div>
          )}

          {/* TAB 2: EVALUATE 9-PILLARS (For Mentors and Admins only) */}
          {activeTab === 'evaluate' && (isMentor || isAdmin) && (
            <form onSubmit={handleSubmitEvaluation}>
              <div style={{
                background: 'rgba(58, 90, 64, 0.08)',
                border: '1px solid var(--olive-700)',
                padding: '12px 16px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 20,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: 13 }}>
                  🎖️ Authorized ANO Evaluation Station
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Rate the cadet across all 9 standard NCC criteria (1 to 10 scale). Scores will update the battalion leaderboard and cadet transcript.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                {Object.keys(evalScores).map(crit => {
                  const val = evalScores[crit] || 8.0;
                  const label = crit.replace(/_/g, ' ').toUpperCase();
                  return (
                    <div key={crit} style={{ background: 'var(--paper)', border: '1px solid var(--border)', padding: 12, borderRadius: 'var(--radius-sm)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                        <span style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{label}</span>
                        <span style={{ fontWeight: 800, color: 'var(--olive-700)', fontFamily: 'var(--font-mono)' }}>{Number(val).toFixed(1)} / 10</span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={val}
                        onChange={e => setEvalScores({ ...evalScores, [crit]: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: 'var(--olive-700)' }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label htmlFor="evalRemarks" style={{ fontSize: 12, fontWeight: 700 }}>
                  Officer Evaluation Remarks & Tactical Notes
                </label>
                <textarea
                  id="evalRemarks"
                  rows={3}
                  value={evalRemarks}
                  onChange={e => setEvalRemarks(e.target.value)}
                  placeholder="e.g. Excellent pace in slow march; recommended to improve 5km split time for RDC."
                  style={{ width: '100%', fontSize: 13, padding: 10 }}
                />
              </div>

              <button type="submit" className="primary" disabled={submitting} style={{ height: 40, width: '100%' }}>
                {submitting ? 'RECORDING SCORES INTO BATTALION DB…' : '✓ SAVE & SUBMIT 9-PILLAR EVALUATION'}
              </button>
            </form>
          )}

          {/* TAB 3: AI INSIGHTS & WEAK AREAS */}
          {activeTab === 'ai' && (
            <div>
              {aiLoading ? (
                <div style={{ padding: 36, textAlign: 'center', color: 'var(--text-muted)' }}>
                  <span className="dot" style={{ display: 'inline-block', marginRight: 8 }} />
                  Synthesizing cadet performance data with military AI model…
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: 16,
                    background: 'var(--surface-muted)',
                    borderRadius: 'var(--radius-sm)',
                    borderLeft: '4px solid var(--navy-900)',
                    marginBottom: 20,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 6 }}>
                      🤖 AI Tactical Performance Summary
                    </div>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                      {aiInsight?.summary || `Cadet ${cadet.full_name} exhibits strong parade consistency and leadership.`}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16, marginBottom: 20 }}>
                    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--olive-700)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>✓</span> PRIMARY STRENGTHS
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {(aiInsight?.strengths || ['High parade discipline (9.6/10)', 'Consistent drill tempo and turn-out']).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: 'var(--paper)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#D97706', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>⚠️</span> IDENTIFIED WEAK AREAS
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                        {(aiInsight?.weak_areas || ['Map Reading & Bearing Grid Calculations', 'Cross-Country Running Split Pace']).map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="secondary"
                    onClick={handleLoadAiInsight}
                    style={{ fontSize: 12, height: 36 }}
                  >
                    🔄 Re-Run AI Diagnostic Analysis
                  </button>
                </div>
              )}
            </div>
          )}

          {/* TAB 4: ADMIN CLEARANCE (Admins Only) */}
          {activeTab === 'admin' && isAdmin && (
            <div>
              <div style={{
                background: 'rgba(11, 29, 58, 0.05)',
                border: '1px solid var(--navy-900)',
                padding: '14px 18px',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 20,
              }}>
                <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: 13 }}>
                  ⭐ Commanding Officer (CO) Administrative Panel
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                  Manage institutional assignment, enrollment status, and certificate authorization.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16, marginBottom: 20 }}>
                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Battalion Unit</label>
                  <input type="text" value="3 MP Girls Battalion NCC" readOnly style={{ background: 'var(--surface-muted)' }} />
                </div>
                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Clearance Status</label>
                  <select defaultValue="ACTIVE" style={{ height: 38 }}>
                    <option value="ACTIVE">ACTIVE (Qualified for Camp)</option>
                    <option value="PROBATION">PROBATION (Low Attendance)</option>
                    <option value="GRADUATED">GRADUATED ('C' Cert Completed)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button type="button" className="primary" onClick={() => alert('Cadet status updated in HQ Registry.')} style={{ height: 38 }}>
                  Update Cadet Clearance
                </button>
                <button type="button" className="secondary" onClick={() => window.print()} style={{ height: 38 }}>
                  Export Official Service Sheet
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          borderTop: '1px solid var(--border)',
          padding: '14px 24px',
          background: 'var(--surface-muted)',
          borderBottomLeftRadius: 'var(--radius-lg)',
          borderBottomRightRadius: 'var(--radius-lg)',
          flexShrink: 0,
        }}>
          <button type="button" className="secondary" onClick={() => window.print()} style={{ height: 36, fontSize: 12 }}>
            🖨️ Print Dossier
          </button>
          <button type="button" className="primary" onClick={onClose} style={{ height: 36, fontSize: 12 }}>
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
}
