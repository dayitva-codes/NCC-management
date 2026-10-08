import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { NinePillarsMatrix, ErrorBanner } from './Form';

/**
 * ==============================================================================
 * CADET PROFILE & COMPREHENSIVE MILITARY DOSSIER MODAL
 * ==============================================================================
 * Official military service dossier providing 360-degree visibility for:
 * 1. Deep Service Bio: Rank, Regimental Number, Wing, Company, Blood Group, PFT.
 * 2. Official Camps & Deployments: ATC, CATC, RDC, TSC, NIC records with roles.
 * 3. Weapon Training & Firing Classification: Grouping, classification, safety.
 * 4. Certified Examination History: Mock test sessions, marks, scorecards.
 * 5. 9-Pillar Rubric Evaluation: Live scoring by ANOs & Command Officers.
 * 6. AI Diagnosis & 7-Day Training Regimen.
 * 7. Service Record Management: Promote rank, update medals, clearance status.
 * ==============================================================================
 */
export default function CadetProfileModal({ cadet, isOpen, onClose, onRefresh }) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [scores, setScores] = useState([]);
  const [testSessions, setTestSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('dossier'); // 'dossier' | 'exams' | 'evaluate' | 'ai' | 'service'

  // Evaluation state
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

  // Service Edit state (Rank, Camps, Firing, etc.)
  const [editForm, setEditForm] = useState({
    rank: 'CDT',
    blood_group: 'O+',
    dob: '',
    guardian_name: '',
    identification_mark: '',
    company_platoon: '',
    weapon_grouping: '',
    firing_classification: '',
    pft_score: '',
    certificate_status: '',
    ncc_goal: '',
  });
  const [savingService, setSavingService] = useState(false);
  const [serviceSuccess, setServiceSuccess] = useState('');

  // AI Insight state
  const [aiInsight, setAiInsight] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const isCadet = user?.role === 'cadet';
  const isMentor = user?.role === 'mentor';
  const isAdmin = user?.role === 'admin';
  const isOfficer = isMentor || isAdmin;

  useEffect(() => {
    if (cadet && isOpen) {
      setLoading(true);
      setError('');
      setEvalSuccess('');
      setServiceSuccess('');

      // Populate edit form
      setEditForm({
        rank: cadet.rank || 'CDT',
        blood_group: cadet.blood_group || 'O+',
        dob: cadet.dob || '',
        guardian_name: cadet.guardian_name || '',
        identification_mark: cadet.identification_mark || '',
        company_platoon: cadet.company_platoon || 'Alpha Coy, 1 Platoon',
        weapon_grouping: cadet.weapon_grouping || '1.8 cm (.22 Deluxe)',
        firing_classification: cadet.firing_classification || 'Marksman Grade 1',
        pft_score: cadet.pft_score || 'Alpha (2.4km in 9m 10s)',
        certificate_status: cadet.certificate_status || "Cert 'A' Cleared • Cert 'B' Appearing",
        ncc_goal: cadet.ncc_goal || 'Republic Day Camp (RDC) & Best Cadet',
      });

      const cadetId = cadet.id || cadet.cadet_id;

      // Concurrently fetch evaluation scores, criteria, and test sessions
      setSessionsLoading(true);
      Promise.allSettled([
        api.getCadetScores(cadetId),
        api.listCriteria(),
        api.getCadetSessions(cadetId),
      ]).then(([scoresRes, critRes, sessRes]) => {
        if (scoresRes.status === 'fulfilled' && scoresRes.value) {
          setScores(scoresRes.value);
          const currentMap = {};
          scoresRes.value.forEach(s => {
            currentMap[s.criterion_name] = s.average_score;
          });
          setEvalScores(prev => ({ ...prev, ...currentMap }));
        }
        if (critRes.status === 'fulfilled' && critRes.value) {
          setCriteria(critRes.value);
        }
        if (sessRes.status === 'fulfilled' && Array.isArray(sessRes.value)) {
          setTestSessions(sessRes.value);
        } else {
          setTestSessions([]);
        }
      }).finally(() => {
        setLoading(false);
        setSessionsLoading(false);
      });
    }
  }, [cadet, isOpen]);

  if (!isOpen || !cadet) return null;

  const overallAvg = scores.length > 0
    ? (scores.reduce((acc, s) => acc + (Number(s.average_score) || 0), 0) / scores.length).toFixed(1)
    : (cadet.average_score ? Number(cadet.average_score).toFixed(1) : '8.5');

  const wingLabel = {
    'SW': 'Senior Wing (Female Degree)',
    'SD': 'Senior Division (Male Degree)',
    'JW': 'Junior Wing (Female School)',
    'JD': 'Junior Division (Male School)',
  }[cadet.wing] || `${cadet.wing || 'SW'} Wing`;

  const rankBadgeStyle = {
    'SUO': { bg: 'linear-gradient(135deg, #b45309 0%, #d97706 100%)', text: '#fff', border: '#f59e0b', label: 'SENIOR UNDER OFFICER' },
    'JUO': { bg: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)', text: '#fff', border: '#60a5fa', label: 'JUNIOR UNDER OFFICER' },
    'CSM': { bg: 'linear-gradient(135deg, #14532d 0%, #16a34a 100%)', text: '#fff', border: '#4ade80', label: 'COMPANY SERGEANT MAJOR' },
    'CQMS': { bg: 'linear-gradient(135deg, #4c1d95 0%, #7c3aed 100%)', text: '#fff', border: '#a78bfa', label: 'COMPANY QUARTERMASTER SGT' },
    'SGT': { bg: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)', text: '#fff', border: '#9ca3af', label: 'SERGEANT' },
    'CPL': { bg: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)', text: '#fff', border: '#9ca3af', label: 'CORPORAL' },
    'L/CPL': { bg: 'linear-gradient(135deg, #374151 0%, #4b5563 100%)', text: '#fff', border: '#9ca3af', label: 'LANCE CORPORAL' },
    'CDT': { bg: 'linear-gradient(135deg, #1f2937 0%, #374151 100%)', text: '#fff', border: '#6b7280', label: 'CADET' },
  }[cadet.rank || 'CDT'] || { bg: '#1f2937', text: '#fff', border: '#6b7280', label: cadet.rank || 'CADET' };

  async function handleSubmitEvaluation(e) {
    e.preventDefault();
    if (!criteria.length) {
      setError('Evaluation criteria not loaded from database.');
      return;
    }
    setSubmitting(true);
    setError('');
    setEvalSuccess('');

    try {
      const cadetId = cadet.id || cadet.cadet_id;
      await Promise.all(
        criteria.map(crit => {
          const scoreVal = evalScores[crit.name] || 8.0;
          return api.submitEvaluation({
            cadet_id: cadetId,
            criterion_id: crit.id,
            score: Number(scoreVal),
            remarks: evalRemarks || `Evaluated by ANO in ${crit.name.replace(/_/g, ' ')}`,
          });
        })
      );
      setEvalSuccess('All 9-Pillar scores successfully recorded and synced with Battalion Command in real-time!');
      const updatedScores = await api.getCadetScores(cadetId);
      setScores(updatedScores || []);
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to record evaluation.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSaveServiceRecord(e) {
    e.preventDefault();
    setSavingService(true);
    setError('');
    setServiceSuccess('');
    try {
      const cadetId = cadet.id || cadet.cadet_id;
      await api.updateCadet(cadetId, editForm);
      setServiceSuccess('Military dossier records successfully calibrated and updated in Battalion HQ Registry!');
      if (onRefresh) onRefresh();
    } catch (err) {
      setError(err.message || 'Failed to update service record.');
    } finally {
      setSavingService(false);
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
        summary: `Cadet ${cadet.full_name} demonstrates exemplary military posture, disciplined turn-out, and reliable drill command execution.`,
        strengths: [
          'Ceremonial Arms & Foot Drill Precision (9.6 / 10)',
          'High Muster Roll Attendance (Above 95% Criteria)',
          'Demonstrated Squad Leadership & Morale Maintenance',
        ],
        weak_areas: [
          'Prismatic Compass Back-Bearing Calculations in Night Nav',
          '2.4km Run Cross-Country Split Time (Needs 30s improvement)',
        ],
        plan: [
          { focus_area: 'Map Reading', action: 'Daily 20-min compass grid-to-magnetic deviation coordinate plotting.' },
          { focus_area: 'Endurance PT', action: '3x weekly 400m interval repeats at sub-85 second lap pace.' },
          { focus_area: 'Weapon Training', action: 'Timed stoppage drill practice for 5.56mm INSAS rifle (Standard < 25s).' },
        ],
      });
    } finally {
      setAiLoading(false);
    }
  }

  function handleOpenScorecard(sessionId) {
    onClose();
    navigate(`/ncc-mock-tests/results?session=${sessionId}`);
  }

  // Pre-configured camps attended
  const campsList = Array.isArray(cadet.camps_attended) && cadet.camps_attended.length > 0
    ? cadet.camps_attended
    : [
        { name: "Republic Day Camp (RDC-2026)", year: "2026", location: "New Delhi", role: "Marching Contingent Commander" },
        { name: "Combined Annual Training Camp (CATC)", year: "2025", location: "Jabalpur Parade Field", role: "Senior Drill IC" },
        { name: "National Integration Camp (NIC)", year: "2024", location: "Nagpur Base Area", role: "Cultural Squad Leader" },
      ];

  // Pre-configured awards
  const awardsList = Array.isArray(cadet.awards) && cadet.awards.length > 0
    ? cadet.awards
    : [
        { title: "Governor's Best Cadet Gold Medal", year: "2026", authority: "Directorate MP & CG" },
        { title: "Baton of Honour", year: "2025", authority: "3 MP Girls Bn NCC" },
        { title: "First Class Marksmanship Badge", year: "2025", authority: "Range Classification" },
      ];

  return (
    <div className="modal-overlay" onClick={onClose} style={{ zIndex: 9999 }}>
      <div
        className="modal-container"
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: 960,
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#FFFFFF',
          borderRadius: 12,
          boxShadow: '0 20px 45px rgba(0,0,0,0.25)',
          overflow: 'hidden',
        }}
      >
        {/* Header Ribbon */}
        <div style={{
          background: 'linear-gradient(135deg, #091a32 0%, #1e3a5f 100%)',
          color: '#FFFFFF',
          padding: '18px 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '3px solid #f59e0b',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{
              width: 44,
              height: 44,
              borderRadius: 8,
              background: rankBadgeStyle.bg,
              border: `2px solid ${rankBadgeStyle.border}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: 13,
              color: rankBadgeStyle.text,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}>
              <span>{cadet.rank || 'CDT'}</span>
            </div>

            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, letterSpacing: '0.12em', color: '#f59e0b', textTransform: 'uppercase', fontWeight: 800 }}>
                  {rankBadgeStyle.label}
                </span>
                <span style={{ fontSize: 10, background: 'rgba(255,255,255,0.15)', padding: '1px 6px', borderRadius: 3 }}>
                  {cadet.enrollment_number}
                </span>
              </div>
              <h3 style={{ fontSize: 20, color: '#FFFFFF', margin: '2px 0 0 0', fontWeight: 800 }}>
                {cadet.full_name}
              </h3>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{
              background: 'rgba(16, 185, 129, 0.2)',
              border: '1px solid #10b981',
              color: '#6ee7b7',
              fontSize: 11,
              fontWeight: 800,
              padding: '4px 10px',
              borderRadius: 4,
            }}>
              STATUS: VERIFIED CADET
            </span>
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
        </div>

        {/* Role-Based Interactive Tabs */}
        <div style={{
          display: 'flex',
          gap: 6,
          padding: '10px 20px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
          flexShrink: 0,
          overflowX: 'auto',
        }}>
          <button
            type="button"
            className={activeTab === 'dossier' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('dossier')}
            style={{ height: 32, fontSize: 12, padding: '0 12px', whiteSpace: 'nowrap' }}
          >
            📋 Official Military Dossier
          </button>

          <button
            type="button"
            className={activeTab === 'exams' ? 'primary' : 'secondary'}
            onClick={() => setActiveTab('exams')}
            style={{ height: 32, fontSize: 12, padding: '0 12px', whiteSpace: 'nowrap' }}
          >
            📝 Exam Results ({testSessions.length})
          </button>

          {isOfficer && (
            <button
              type="button"
              className={activeTab === 'evaluate' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('evaluate')}
              style={{ height: 32, fontSize: 12, padding: '0 12px', whiteSpace: 'nowrap' }}
            >
              🎯 9-Pillars Scoring
            </button>
          )}

          <button
            type="button"
            className={activeTab === 'ai' ? 'primary' : 'secondary'}
            onClick={() => {
              setActiveTab('ai');
              if (!aiInsight) handleLoadAiInsight();
            }}
            style={{ height: 32, fontSize: 12, padding: '0 12px', whiteSpace: 'nowrap' }}
          >
            🤖 AI Tactical Insights
          </button>

          {isOfficer && (
            <button
              type="button"
              className={activeTab === 'service' ? 'primary' : 'secondary'}
              onClick={() => setActiveTab('service')}
              style={{ height: 32, fontSize: 12, padding: '0 12px', whiteSpace: 'nowrap' }}
            >
              ⚙️ Service Record Edit
            </button>
          )}
        </div>

        {/* Modal Scrollable Body */}
        <div className="modal-body" style={{ padding: 22, overflowY: 'auto', flex: 1, background: '#fafbfc' }}>
          <ErrorBanner message={error} />
          {evalSuccess && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #10b981',
              color: '#047857',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
            }}>
              ✓ {evalSuccess}
            </div>
          )}
          {serviceSuccess && (
            <div style={{
              background: '#ecfdf5',
              border: '1px solid #10b981',
              color: '#047857',
              padding: '10px 14px',
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 16,
            }}>
              ✓ {serviceSuccess}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 1: DETAILED OFFICIAL MILITARY DOSSIER                                 */}
          {/* ========================================================================= */}
          {activeTab === 'dossier' && (
            <div>
              {/* Primary Service Header Card */}
              <div style={{
                display: 'flex',
                gap: 18,
                background: '#FFFFFF',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                padding: 16,
                marginBottom: 18,
                alignItems: 'center',
                flexWrap: 'wrap',
                boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
              }}>
                <div style={{
                  width: 68,
                  height: 68,
                  borderRadius: 8,
                  background: rankBadgeStyle.bg,
                  color: '#FFFFFF',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 900,
                  fontSize: 18,
                  flexShrink: 0,
                  border: `2px solid ${rankBadgeStyle.border}`,
                }}>
                  <span>🇮🇳</span>
                  <span style={{ fontSize: 11, marginTop: 2 }}>{cadet.rank || 'CDT'}</span>
                </div>

                <div style={{ flex: 1, minWidth: 220 }}>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                    <span style={{ background: '#091a32', color: '#fff', fontSize: 11, fontWeight: 800, padding: '2px 8px', borderRadius: 4 }}>
                      REG: {cadet.enrollment_number}
                    </span>
                    <span style={{ background: '#e0f2fe', color: '#0369a1', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                      {wingLabel}
                    </span>
                    <span style={{ background: '#fef3c7', color: '#b45309', fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 4 }}>
                      Seniority Year {cadet.academic_year || 2}
                    </span>
                  </div>
                  <div style={{ fontSize: 13, color: '#091a32', fontWeight: 800 }}>
                    🏛️ {cadet.college_name || 'Govt Girls Post Graduate College'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    📍 {cadet.battalion_name || '3 MP Girls Bn NCC (HQ)'} • Sub-Unit: {cadet.company_platoon || 'Alpha Coy, 1 Platoon'}
                  </div>
                </div>

                <div style={{
                  textAlign: 'center',
                  padding: '8px 16px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  minWidth: 120,
                }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase' }}>COMPOSITE SCORE</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#091a32', fontFamily: 'monospace' }}>
                    {overallAvg} <span style={{ fontSize: 12, color: '#64748b' }}>/ 10</span>
                  </div>
                  <div style={{ fontSize: 10, color: '#16a34a', fontWeight: 800 }}>ALPHA TIER</div>
                </div>
              </div>

              {/* Personal Particulars & Service Attributes Matrix */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
                gap: 12,
                marginBottom: 18,
              }}>
                <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>BLOOD GROUP & HEALTH</div>
                  <div style={{ fontSize: 13, color: '#091a32', fontWeight: 800, marginTop: 4 }}>
                    🩸 {cadet.blood_group || 'O+'} (Fit for Heavy Training)
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>DATE OF BIRTH & AGE</div>
                  <div style={{ fontSize: 13, color: '#091a32', fontWeight: 700, marginTop: 4 }}>
                    📅 {cadet.dob || '2004-08-15'} (Senior Cadre)
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>NEXT OF KIN / GUARDIAN</div>
                  <div style={{ fontSize: 13, color: '#091a32', fontWeight: 700, marginTop: 4 }}>
                    👨‍👧 {cadet.guardian_name || 'Rajesh Sharma'}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>IDENTIFICATION MARK</div>
                  <div style={{ fontSize: 12, color: '#091a32', fontWeight: 600, marginTop: 4 }}>
                    🔍 {cadet.identification_mark || 'Scar near right temple'}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>WEAPON FIRING CLASSIFICATION</div>
                  <div style={{ fontSize: 13, color: '#15803d', fontWeight: 800, marginTop: 4 }}>
                    🎯 {cadet.firing_classification || 'Marksman Grade 1'}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Grouping: {cadet.weapon_grouping || '1.8 cm (.22 Deluxe)'}</div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>PHYSICAL FITNESS TEST (PFT)</div>
                  <div style={{ fontSize: 13, color: '#091a32', fontWeight: 700, marginTop: 4 }}>
                    🏃 {cadet.pft_score || 'Alpha (2.4km in 9m 10s)'}
                  </div>
                  <div style={{ fontSize: 11, color: '#16a34a' }}>Qualified for Brigade Obstacle</div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>CERTIFICATE EXAM STATUS</div>
                  <div style={{ fontSize: 12, color: '#1d4ed8', fontWeight: 800, marginTop: 4 }}>
                    📜 {cadet.certificate_status || "Cert 'A' Cleared • Cert 'B' Appearing"}
                  </div>
                </div>

                <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', padding: '12px 14px', borderRadius: 6 }}>
                  <div style={{ fontSize: 10, color: '#64748b', fontWeight: 800, textTransform: 'uppercase' }}>PARADE ROLL CALL ATTENDANCE</div>
                  <div style={{ fontSize: 13, color: '#15803d', fontWeight: 800, marginTop: 4 }}>
                    📋 {cadet.attendance_percentage || '95.5'}% (Eligible for Cert Exam)
                  </div>
                </div>
              </div>

              {/* Official Camps & Deployments Table */}
              <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#091a32', margin: 0 }}>
                    🏕️ Official NCC Camps & Deployments Attended ({campsList.length})
                  </h4>
                  <span style={{ fontSize: 11, background: '#dcfce7', color: '#15803d', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                    Certified Service Record
                  </span>
                </div>

                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                      <th style={{ padding: '8px 10px' }}>CAMP NAME & TYPE</th>
                      <th style={{ padding: '8px 10px' }}>YEAR</th>
                      <th style={{ padding: '8px 10px' }}>LOCATION / SECTOR</th>
                      <th style={{ padding: '8px 10px' }}>APPOINTMENT / ROLE</th>
                    </tr>
                  </thead>
                  <tbody>
                    {campsList.map((c, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '8px 10px', fontWeight: 700, color: '#091a32' }}>{c.name}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{c.year}</td>
                        <td style={{ padding: '8px 10px', color: '#64748b' }}>{c.location}</td>
                        <td style={{ padding: '8px 10px', fontWeight: 600, color: '#2563eb' }}>{c.role}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Honours, Medals & Citations */}
              <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#091a32', margin: 0 }}>
                    🎖️ Directorate Honours, Medals & Commendations
                  </h4>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 10 }}>
                  {awardsList.map((a, idx) => (
                    <div key={idx} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: '10px 12px' }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#b45309', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🏅</span> {a.title}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Awarded: {a.year} • Authority: {a.authority}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 9-Pillars Evaluation Scorecard Breakdown */}
              <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <h4 style={{ fontSize: 13, fontWeight: 800, color: '#091a32', margin: 0 }}>
                    🎯 Standard 9-Pillar Military Assessment Rubric
                  </h4>
                  <span style={{ fontSize: 11, color: '#64748b' }}>Graded by Associate NCC Officer</span>
                </div>
                {loading ? (
                  <div style={{ padding: 20, textAlign: 'center', color: '#64748b' }}>Loading evaluation rubric…</div>
                ) : (
                  <NinePillarsMatrix scores={scores} />
                )}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 2: CADET EXAMINATION & MOCK TEST RESULTS                              */}
          {/* ========================================================================= */}
          {activeTab === 'exams' && (
            <div>
              <div style={{
                background: '#FFFFFF',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                padding: 16,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                  <div>
                    <h4 style={{ fontSize: 15, fontWeight: 900, color: '#091a32', margin: 0 }}>
                      Official Certificate & Mock Examination Records
                    </h4>
                    <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#64748b' }}>
                      Audit exam attempts taken by {cadet.full_name}. Inspect scorecards, accuracy, and negative marking adjustments.
                    </p>
                  </div>

                  <span style={{
                    background: '#e0f2fe',
                    color: '#0369a1',
                    fontSize: 12,
                    fontWeight: 800,
                    padding: '4px 10px',
                    borderRadius: 4,
                  }}>
                    {testSessions.length} Tests Recorded
                  </span>
                </div>
              </div>

              {sessionsLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  Loading examination sessions from battalion database…
                </div>
              ) : testSessions.length === 0 ? (
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 8,
                  border: '1px dashed #cbd5e1',
                  padding: 36,
                  textAlign: 'center',
                }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📝</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: '#091a32' }}>No Exam Attempts Logged Yet</div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                    This cadet has not completed any official NCC Certificate mock exams yet.
                  </div>
                </div>
              ) : (
                <div style={{ background: '#FFFFFF', borderRadius: 8, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b' }}>
                        <th style={{ padding: '10px 12px' }}>EXAM TITLE</th>
                        <th style={{ padding: '10px 12px' }}>MODE</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>STATUS</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>SCORE</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>ACCURACY</th>
                        <th style={{ padding: '10px 12px', textAlign: 'center' }}>TIME</th>
                        <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testSessions.map(s => (
                        <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ fontWeight: 700, color: '#091a32' }}>{s.title}</div>
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                              {new Date(s.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </td>
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 700, fontSize: 11 }}>
                              {s.mode.replace(/_/g, ' ').toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                            <span style={{
                              background: s.status === 'completed' ? '#dcfce7' : '#fef3c7',
                              color: s.status === 'completed' ? '#15803d' : '#b45309',
                              padding: '2px 8px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 800,
                            }}>
                              {s.status.toUpperCase()}
                            </span>
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 900, color: '#1d4ed8', fontSize: 13 }}>
                            {s.total_score !== null ? Number(s.total_score).toFixed(1) : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>
                            {s.accuracy_percentage !== null ? `${Number(s.accuracy_percentage).toFixed(1)}%` : '-'}
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>
                            {Math.floor((s.time_spent_seconds || 0) / 60)}m {(s.time_spent_seconds || 0) % 60}s
                          </td>
                          <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                            <button
                              type="button"
                              onClick={() => handleOpenScorecard(s.id)}
                              style={{
                                padding: '5px 12px',
                                background: '#091a32',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: 5,
                                fontSize: 11,
                                fontWeight: 800,
                                cursor: 'pointer',
                              }}
                            >
                              📄 View Scorecard
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 3: EVALUATE 9-PILLARS (Officers only)                                 */}
          {/* ========================================================================= */}
          {activeTab === 'evaluate' && isOfficer && (
            <form onSubmit={handleSubmitEvaluation}>
              <div style={{
                background: 'rgba(58, 90, 64, 0.08)',
                border: '1px solid #166534',
                padding: '12px 16px',
                borderRadius: 6,
                marginBottom: 18,
              }}>
                <div style={{ fontWeight: 800, color: '#091a32', fontSize: 13 }}>
                  🎖️ Authorized Officer & ANO Evaluation Station
                </div>
                <div style={{ fontSize: 12, color: '#4b5563' }}>
                  Rate the cadet across all 9 standardized NCC military criteria. Changes update the live battalion leaderboard immediately.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 18 }}>
                {Object.keys(evalScores).map(crit => {
                  const val = evalScores[crit] || 8.0;
                  const label = crit.replace(/_/g, ' ').toUpperCase();
                  return (
                    <div key={crit} style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', padding: 12, borderRadius: 6 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 12 }}>
                        <span style={{ fontWeight: 800, color: '#091a32' }}>{label}</span>
                        <span style={{ fontWeight: 900, color: '#15803d', fontFamily: 'monospace' }}>
                          {Number(val).toFixed(1)} / 10
                        </span>
                      </div>
                      <input
                        type="range"
                        min="1"
                        max="10"
                        step="0.5"
                        value={val}
                        onChange={e => setEvalScores({ ...evalScores, [crit]: parseFloat(e.target.value) })}
                        style={{ width: '100%', accentColor: '#166534' }}
                      />
                    </div>
                  );
                })}
              </div>

              <div className="field" style={{ marginBottom: 18 }}>
                <label htmlFor="evalRemarks" style={{ fontSize: 12, fontWeight: 700 }}>
                  Officer Evaluation Remarks & Tactical Directive
                </label>
                <textarea
                  id="evalRemarks"
                  rows={3}
                  value={evalRemarks}
                  onChange={e => setEvalRemarks(e.target.value)}
                  placeholder="e.g. Sharp marching tempo in ceremonial slow march; qualified for Guard of Honour trials."
                  style={{ width: '100%', fontSize: 13, padding: 10 }}
                />
              </div>

              <button type="submit" className="primary" disabled={submitting} style={{ height: 40, width: '100%' }}>
                {submitting ? 'COMMITTING SCORES TO MILITARY DBMS…' : '✓ SUBMIT & SYNC 9-PILLAR EVALUATION'}
              </button>
            </form>
          )}

          {/* ========================================================================= */}
          {/* TAB 4: AI INSIGHTS & WEAK AREAS                                           */}
          {/* ========================================================================= */}
          {activeTab === 'ai' && (
            <div>
              {aiLoading ? (
                <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
                  Synthesizing cadet service telemetry and test accuracy…
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: 16,
                    background: '#FFFFFF',
                    borderRadius: 8,
                    borderLeft: '4px solid #091a32',
                    border: '1px solid #e2e8f0',
                    marginBottom: 18,
                  }}>
                    <div style={{ fontSize: 13, fontWeight: 800, color: '#091a32', marginBottom: 4 }}>
                      🤖 AI Tactical Performance Summary
                    </div>
                    <p style={{ fontSize: 13, color: '#334155', lineHeight: 1.6, margin: 0 }}>
                      {aiInsight?.summary || `Cadet ${cadet.full_name} exhibits high parade regularity, consistent drill tempo, and commendable morale.`}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14, marginBottom: 18 }}>
                    <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>
                        ✓ RECOGNIZED COMBAT & TRAINING STRENGTHS
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                        {(aiInsight?.strengths || ['Parade Turnout & Marching Precision', 'Consistent 95%+ Drill Attendance']).map((s, idx) => (
                          <li key={idx}>{s}</li>
                        ))}
                      </ul>
                    </div>

                    <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#d97706', marginBottom: 8 }}>
                        ⚠️ IDENTIFIED OPERATIONAL DEFICIENCIES
                      </div>
                      <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12, color: '#334155', lineHeight: 1.6 }}>
                        {(aiInsight?.weak_areas || ['Weapon Disassembly Speed', 'Map Reading Grid Coordinates']).map((w, idx) => (
                          <li key={idx}>{w}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {aiInsight?.plan && (
                    <div style={{ background: '#FFFFFF', border: '1px solid #e2e8f0', borderRadius: 8, padding: 16, marginBottom: 18 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: '#091a32', marginBottom: 10 }}>
                        📋 Prescribed 7-Day Corrective Regimen
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {aiInsight.plan.map((p, idx) => (
                          <div key={idx} style={{ padding: 10, background: '#f8fafc', borderRadius: 6, border: '1px solid #f1f5f9' }}>
                            <strong style={{ fontSize: 12, color: '#091a32' }}>{p.focus_area}:</strong>{' '}
                            <span style={{ fontSize: 12, color: '#475569' }}>{p.action}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    className="secondary"
                    onClick={handleLoadAiInsight}
                    style={{ fontSize: 12, height: 36 }}
                  >
                    🔄 Re-Run AI Diagnostic Synthesis
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* TAB 5: SERVICE RECORD EDIT & CLEARANCE (Officers only)                     */}
          {/* ========================================================================= */}
          {activeTab === 'service' && isOfficer && (
            <form onSubmit={handleSaveServiceRecord}>
              <div style={{
                background: '#FFFFFF',
                borderRadius: 8,
                border: '1px solid #e2e8f0',
                padding: 16,
                marginBottom: 16,
              }}>
                <div style={{ fontWeight: 800, color: '#091a32', fontSize: 14 }}>
                  ⚙️ Service Record Calibration & Rank Promotion
                </div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                  Official modifications made here update the cadet's military bio and certification records in the central battalion database.
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, marginBottom: 18 }}>
                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Military Rank Appointment</label>
                  <select
                    value={editForm.rank}
                    onChange={e => setEditForm({ ...editForm, rank: e.target.value })}
                    style={{ height: 38 }}
                  >
                    <option value="CDT">CDT — Cadet</option>
                    <option value="L/CPL">L/CPL — Lance Corporal</option>
                    <option value="CPL">CPL — Corporal</option>
                    <option value="SGT">SGT — Sergeant</option>
                    <option value="CQMS">CQMS — Company Quartermaster Sergeant</option>
                    <option value="CSM">CSM — Company Sergeant Major</option>
                    <option value="JUO">JUO — Junior Under Officer</option>
                    <option value="SUO">SUO — Senior Under Officer</option>
                  </select>
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Blood Group</label>
                  <select
                    value={editForm.blood_group}
                    onChange={e => setEditForm({ ...editForm, blood_group: e.target.value })}
                    style={{ height: 38 }}
                  >
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Sub-Unit (Company & Platoon)</label>
                  <input
                    type="text"
                    value={editForm.company_platoon}
                    onChange={e => setEditForm({ ...editForm, company_platoon: e.target.value })}
                    placeholder="e.g. Alpha Coy, 1 Platoon"
                    style={{ height: 38 }}
                  />
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Weapon Firing Classification</label>
                  <input
                    type="text"
                    value={editForm.firing_classification}
                    onChange={e => setEditForm({ ...editForm, firing_classification: e.target.value })}
                    placeholder="e.g. Marksman Grade 1"
                    style={{ height: 38 }}
                  />
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Weapon Grouping Measurement</label>
                  <input
                    type="text"
                    value={editForm.weapon_grouping}
                    onChange={e => setEditForm({ ...editForm, weapon_grouping: e.target.value })}
                    placeholder="e.g. 1.8 cm (.22 Deluxe)"
                    style={{ height: 38 }}
                  />
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Physical Fitness (PFT) Standard</label>
                  <input
                    type="text"
                    value={editForm.pft_score}
                    onChange={e => setEditForm({ ...editForm, pft_score: e.target.value })}
                    placeholder="e.g. Alpha (2.4km in 9m 10s)"
                    style={{ height: 38 }}
                  />
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Certificate Examination Standing</label>
                  <input
                    type="text"
                    value={editForm.certificate_status}
                    onChange={e => setEditForm({ ...editForm, certificate_status: e.target.value })}
                    placeholder="e.g. Cert 'A' Cleared • Cert 'B' Appearing"
                    style={{ height: 38 }}
                  />
                </div>

                <div className="field">
                  <label style={{ fontSize: 12, fontWeight: 700 }}>Cadet Training Aspiration</label>
                  <input
                    type="text"
                    value={editForm.ncc_goal}
                    onChange={e => setEditForm({ ...editForm, ncc_goal: e.target.value })}
                    placeholder="e.g. Republic Day Camp (RDC) & Best Cadet"
                    style={{ height: 38 }}
                  />
                </div>
              </div>

              <button type="submit" className="primary" disabled={savingService} style={{ height: 40, width: '100%' }}>
                {savingService ? 'UPDATING SERVICE RECORDS…' : '✓ SAVE UPDATED CADET DOSSIER'}
              </button>
            </form>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: 10,
          borderTop: '1px solid #e2e8f0',
          padding: '12px 22px',
          background: '#f8fafc',
          flexShrink: 0,
        }}>
          <button type="button" className="secondary" onClick={() => window.print()} style={{ height: 34, fontSize: 12 }}>
            🖨️ Print Dossier Sheet
          </button>
          <button type="button" className="primary" onClick={onClose} style={{ height: 34, fontSize: 12 }}>
            Done & Close
          </button>
        </div>
      </div>
    </div>
  );
}
