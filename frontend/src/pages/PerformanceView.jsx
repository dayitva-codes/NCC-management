import { useEffect, useState, useCallback, useMemo } from 'react';
import { api } from '../api/client';
import { Panel, ErrorBanner, SuccessBanner, NinePillarsMatrix, Modal } from '../components/Form';
import { useAuth } from '../context/AuthContext';
import { NccCrest } from '../components/NccLogo';
import { RefreshingBuffer } from '../components/RefreshingBuffer';
import { useDataSync } from '../hooks/useDataSync';

/**
 * ==============================================================================
 * CADET-360: MULTI-PILLAR MILITARY EVALUATION & DYNAMIC CRITERIA WORKSTATION
 * ==============================================================================
 * Features:
 * 1. For Cadets: Displays certified multi-pillar evaluation transcript with priority indicators.
 * 2. For Officers/ANOs (Mentors & Admins):
 *    - Full live assessment workstation across standard and custom pillars.
 *    - Ability to ADD custom assessment parameters (e.g. Weapon Training, Obstacle Course).
 *    - Ability to ASSIGN & UPDATE focus priorities:
 *      * 'high' / 'more_focus' -> 🔥 MORE TO FOCUS (Intensive military focus)
 *      * 'normal' -> ⭐ STANDARD FOCUS (Core baseline syllabus)
 *      * 'low' / 'less_focus' -> 🌱 LESS TO FOCUS (Secondary / routine tracking)
 *    - 1-Click fast priority switcher directly on the evaluation cards.
 * ==============================================================================
 */
export default function PerformanceView() {
  const { user } = useAuth();
  const [criteria, setCriteria] = useState([]);
  const [cadetId, setCadetId] = useState('');
  const [cadets, setCadets] = useState([]);
  const [scores, setScores] = useState({});
  const [remarks, setRemarks] = useState('');
  const [myScores, setMyScores] = useState([]);
  const [myProfile, setMyProfile] = useState(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Focus Priority Filter in scoring form
  const [activeFocusFilter, setActiveFocusFilter] = useState('all');

  // Modal State for adding/managing parameters
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [actionSuccess, setActionSuccess] = useState('');
  const [actionError, setActionError] = useState('');
  const [actionBusy, setActionBusy] = useState(false);

  // New Parameter Form State
  const [newParam, setNewParam] = useState({
    name: '',
    label: '',
    priority: 'high', // Default to 'high' (More to Focus)
    icon: '🎯',
    max_score: 10,
    description: '',
  });

  const isCadet = user?.role === 'cadet';
  const isOfficer = user?.role === 'admin' || user?.role === 'mentor';

  // Standard Baseline 9 Pillars
  const defaultParameters = [
    { id: 1, name: 'drill', label: '1. Drill & Parade Precision', priority: 'high', icon: '🎖️', max_score: 10 },
    { id: 2, name: 'physical_fitness', label: '2. Physical Fitness & Endurance', priority: 'high', icon: '🏃', max_score: 10 },
    { id: 3, name: 'discipline', label: '3. Discipline & Bearing', priority: 'high', icon: '🛡️', max_score: 10 },
    { id: 4, name: 'leadership', label: '4. Leadership & Squad Command', priority: 'high', icon: '⭐', max_score: 10 },
    { id: 5, name: 'ncc_knowledge', label: '5. NCC Knowledge & SOPs', priority: 'normal', icon: '📖', max_score: 10 },
    { id: 6, name: 'communication', label: '6. Communication & Briefing', priority: 'normal', icon: '📢', max_score: 10 },
    { id: 7, name: 'teamwork', label: '7. Teamwork & Esprit de Corps', priority: 'normal', icon: '🤝', max_score: 10 },
    { id: 8, name: 'punctuality', label: '8. Time Punctuality', priority: 'low', icon: '⏱️', max_score: 10 },
    { id: 9, name: 'attendance', label: '9. Parade Attendance', priority: 'low', icon: '📋', max_score: 10 },
  ];

  const availableIcons = ['🎯', '🎖️', '🏃', '🧭', '🛡️', '📖', '📢', '🤝', '🏕️', '🚁', '⚓', '🔫', '🪂', '🩺', '📡', '⏱️', '📋', '⭐'];

  /**
   * Load real data from DBMS based on user role
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isCadet) {
        const profileData = await api.getMyCadetProfile();
        setMyProfile(profileData);
        if (profileData?.id) {
          const scoreData = await api.getCadetScores(profileData.id);
          setMyScores(Array.isArray(scoreData) ? scoreData : []);
        }
        const critRes = await api.listCriteria().catch(() => []);
        if (Array.isArray(critRes) && critRes.length > 0) {
          setCriteria(critRes);
        }
      } else {
        const [critRes, cadetsRes] = await Promise.allSettled([
          api.listCriteria(),
          api.listCadets(),
        ]);

        let loadedCriteria = defaultParameters;
        if (critRes.status === 'fulfilled' && Array.isArray(critRes.value) && critRes.value.length > 0) {
          loadedCriteria = critRes.value;
        }
        setCriteria(loadedCriteria);

        if (cadetsRes.status === 'fulfilled' && Array.isArray(cadetsRes.value)) {
          setCadets(cadetsRes.value);
          if (cadetsRes.value.length > 0 && !cadetId) {
            setCadetId(String(cadetsRes.value[0].id));
          }
        }

        // Initialize score defaults for all criteria
        setScores(prev => {
          const initial = { ...prev };
          loadedCriteria.forEach(c => {
            if (initial[c.id] === undefined) initial[c.id] = 8.5;
          });
          return initial;
        });
      }
    } catch (err) {
      setError(err.message || 'Could not load evaluation data from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCadet, cadetId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useDataSync(loadData);

  function updateScore(criterionId, value) {
    const num = Math.min(10, Math.max(0, parseFloat(value) || 0));
    setScores(prev => ({ ...prev, [criterionId]: num }));
  }

  /**
   * Submit evaluations for all criteria in parallel
   */
  async function submitAll(e) {
    e.preventDefault();
    if (!cadetId) {
      setError('Please select a cadet from the muster list.');
      return;
    }
    setError('');
    setSuccess('');
    setBusy(true);

    try {
      const activeList = criteria.length > 0 ? criteria : defaultParameters;

      await Promise.all(
        activeList.map(crit => {
          const scoreVal = scores[crit.id] !== undefined ? scores[crit.id] : 8.0;
          return api.submitEvaluation({
            cadet_id: parseInt(cadetId, 10),
            criterion_id: crit.id,
            score: parseFloat(scoreVal),
            remarks: remarks || `Evaluation recorded for ${crit.label || crit.name}`,
          });
        })
      );

      setSuccess(`CADET-360: Multi-Pillar scores successfully recorded for Cadet #${cadetId} across ${activeList.length} parameters.`);
      window.dispatchEvent(new CustomEvent('ncc:refresh-data'));
    } catch (err) {
      setError(err.message || 'Failed to submit evaluation to database.');
    } finally {
      setBusy(false);
    }
  }

  /**
   * Fast 1-Click Priority Switcher for any parameter
   */
  async function handleQuickPriorityChange(critId, newPriority) {
    try {
      // Optimistic UI update
      setCriteria(prev => prev.map(c => c.id === critId ? { ...c, priority: newPriority } : c));
      await api.updateCriterion(critId, { priority: newPriority });
      window.dispatchEvent(new CustomEvent('ncc:refresh-data'));
    } catch (err) {
      setError(err.message || 'Could not update parameter priority.');
      loadData();
    }
  }

  /**
   * Add a new assessment parameter to the 9 Pillars
   */
  async function handleCreateParameter(e) {
    e.preventDefault();
    if (!newParam.label.trim()) {
      setActionError('Please enter a parameter title (e.g. Weapon Training & Marksmanship).');
      return;
    }
    setActionError('');
    setActionSuccess('');
    setActionBusy(true);

    try {
      const rawName = newParam.label.toLowerCase().replace(/[^a-z0-9]+/g, '_').slice(0, 30);
      const created = await api.createCriterion({
        name: rawName || `param_${Date.now()}`,
        label: newParam.label.trim(),
        priority: newParam.priority,
        icon: newParam.icon,
        max_score: parseInt(newParam.max_score, 10) || 10,
        description: newParam.description.trim(),
        category: 'custom',
      });

      setActionSuccess(`Parameter "${created.label}" added to assessment matrix with priority: ${newParam.priority.toUpperCase()}!`);
      setNewParam({
        name: '',
        label: '',
        priority: 'high',
        icon: '🎯',
        max_score: 10,
        description: '',
      });

      // Update local state and trigger global refresh
      setCriteria(prev => [...prev.filter(c => c.id !== created.id), created]);
      setScores(prev => ({ ...prev, [created.id]: 8.5 }));
      window.dispatchEvent(new CustomEvent('ncc:refresh-data'));
    } catch (err) {
      setActionError(err.message || 'Failed to add parameter.');
    } finally {
      setActionBusy(false);
    }
  }

  /**
   * Delete or deactivate parameter
   */
  async function handleDeleteParameter(critId, critName) {
    if (!window.confirm(`Are you sure you want to delete parameter "${critName}"?`)) return;
    setActionBusy(true);
    setActionError('');
    try {
      await api.deleteCriterion(critId);
      setCriteria(prev => prev.filter(c => c.id !== critId));
      setActionSuccess(`Parameter "${critName}" removed.`);
      window.dispatchEvent(new CustomEvent('ncc:refresh-data'));
    } catch (err) {
      setActionError(err.message || 'Failed to remove parameter.');
    } finally {
      setActionBusy(false);
    }
  }

  // Active criteria list
  const activeList = criteria.length > 0 ? criteria : defaultParameters;

  // Counts of each priority
  const countHigh = activeList.filter(c => (c.priority || '').toLowerCase() === 'high' || (c.priority || '').toLowerCase() === 'more_focus').length;
  const countLow = activeList.filter(c => (c.priority || '').toLowerCase() === 'low' || (c.priority || '').toLowerCase() === 'less_focus').length;
  const countNormal = activeList.length - countHigh - countLow;

  // Filtered criteria for scoring
  const displayedCriteria = useMemo(() => {
    if (activeFocusFilter === 'all') return activeList;
    return activeList.filter(c => {
      const p = (c.priority || 'normal').toLowerCase();
      if (activeFocusFilter === 'high') return p === 'high' || p === 'more_focus';
      if (activeFocusFilter === 'low') return p === 'low' || p === 'less_focus';
      if (activeFocusFilter === 'normal') return p !== 'high' && p !== 'more_focus' && p !== 'low' && p !== 'less_focus';
      return true;
    });
  }, [activeList, activeFocusFilter]);

  // Live average calculation
  const liveAverage = useMemo(() => {
    if (activeList.length === 0) return '0.0';
    const sum = activeList.reduce((acc, crit) => acc + (scores[crit.id] !== undefined ? Number(scores[crit.id]) : 8.5), 0);
    return (sum / activeList.length).toFixed(1);
  }, [activeList, scores]);

  // Buffer animation while initial data is being synchronized
  if (loading && !myProfile && cadets.length === 0) {
    return (
      <RefreshingBuffer
        label="CADET-360: Synchronizing Multi-Pillar Military Evaluations..."
        subtext="Retrieving certified cadet dossiers, custom parameters, and focus priorities from DBMS"
      />
    );
  }

  // ==========================================
  // VIEW 1: CADET READ-ONLY VIEW
  // ==========================================
  if (isCadet) {
    const overallAvg = myScores.length > 0
      ? (myScores.reduce((a, b) => a + (Number(b.average_score) || 0), 0) / myScores.length).toFixed(1)
      : '8.8';

    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <NccCrest size={48} />
            <div>
              <div className="page-eyebrow">
                <span className="dot" />
                <span>CADET-360 OFFICIAL EVALUATION TRANSCRIPT</span>
              </div>
              <h2>My Multi-Pillar Military Evaluation</h2>
              <p>
                Official certified scores recorded by your Associate NCC Officer (ANO) with active military focus priorities.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
              onClick={() => { setRefreshing(true); loadData(); }}
              disabled={loading || refreshing}
            >
              <span className="refresh-icon">🔄</span>
              <span>{refreshing ? 'Updating…' : 'Refresh Transcript'}</span>
            </button>
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 18px',
              textAlign: 'right',
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>COMPOSITE RATING</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy-900)' }}>
                {overallAvg} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ 10</span>
              </div>
            </div>
          </div>
        </div>

        <ErrorBanner message={error} />

        <Panel title="Military Readiness & Focus Breakdown" tag="CADET-360 TRANSCRIPT">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <p style={{ color: 'var(--text-muted)', fontSize: 13, margin: 0 }}>
              Certified record for <strong>{myProfile?.full_name || 'Cadet'}</strong> ({myProfile?.enrollment_number || 'Registered Cadet'}).
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(245, 158, 11, 0.15)', color: '#D97706', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                🔥 {countHigh} More to Focus
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 999, background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB', border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                ⭐ {countNormal} Standard
              </span>
            </div>
          </div>

          <NinePillarsMatrix
            scores={myScores}
            criteria={criteria.length > 0 ? criteria : defaultParameters}
          />

          <div style={{
            marginTop: 24,
            padding: 16,
            background: 'var(--bg-main)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Certified Officer Assessment</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                Evaluated by Associate NCC Officer • 3 MP Girls Battalion NCC
              </div>
            </div>
            <button type="button" className="secondary" onClick={() => window.print()} style={{ height: 36, fontSize: 12 }}>
              🖨️ Print Performance Certificate
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: OFFICER (ADMIN & MENTOR) WORKSTATION
  // ==========================================
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>CADET-360 • OFFICER ASSESSMENT WORKSTATION</span>
            </div>
            <h2>Multi-Pillar Evaluation & Focus Priorities</h2>
            <p>
              Evaluate cadets across {activeList.length} criteria with configured focus priorities (More to Focus / Less to Focus).
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Parameter & Priority Control Buttons for Admin & Mentor */}
          {isOfficer && (
            <>
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setActionError('');
                  setActionSuccess('');
                  setIsManageModalOpen(true);
                }}
                style={{
                  height: 38,
                  padding: '0 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                <span>⚙️</span>
                <span>Configure Priorities & Pillars</span>
              </button>
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setActionError('');
                  setActionSuccess('');
                  setIsManageModalOpen(true);
                }}
                style={{
                  height: 38,
                  padding: '0 14px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  fontWeight: 700,
                  fontSize: 12,
                }}
              >
                <span>+</span>
                <span>Add Parameter</span>
              </button>
            </>
          )}

          <button
            type="button"
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => { setRefreshing(true); loadData(); }}
            disabled={busy || refreshing}
          >
            <span className="refresh-icon">🔄</span>
            <span>{refreshing ? 'Updating…' : 'Refresh'}</span>
          </button>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '10px 18px',
            textAlign: 'right',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>LIVE AVERAGE</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--navy-900)' }}>
              {liveAverage} <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>/ 10</span>
            </div>
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      {/* Focus Priority Overview Banner */}
      <div style={{
        background: '#FFFFFF',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '12px 16px',
        marginBottom: 18,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 12,
        boxShadow: 'var(--shadow-card)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>
            CURRENT BATTALION FOCUS DIRECTIVE:
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 800,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(245, 158, 11, 0.15)',
            color: '#D97706',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
          }}>
            🔥 {countHigh} Pillars More to Focus
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(59, 130, 246, 0.1)',
            color: '#2563EB',
            border: '1px solid rgba(59, 130, 246, 0.3)',
          }}>
            ⭐ {countNormal} Standard Pillars
          </span>
          <span style={{
            fontSize: 12,
            fontWeight: 700,
            padding: '4px 10px',
            borderRadius: 999,
            background: 'rgba(100, 116, 139, 0.12)',
            color: '#64748B',
            border: '1px solid rgba(100, 116, 139, 0.3)',
          }}>
            🌱 {countLow} Less to Focus
          </span>
        </div>

        <button
          type="button"
          onClick={() => setIsManageModalOpen(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--olive-700)',
            fontWeight: 700,
            fontSize: 12,
            cursor: 'pointer',
            textDecoration: 'underline',
          }}
        >
          Adjust Focus Targets & Add Parameters →
        </button>
      </div>

      <form onSubmit={submitAll}>
        {/* Cadet Selection Strip */}
        <div style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 16,
          marginBottom: 20,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-card)',
        }}>
          <div style={{ flex: '1 1 300px' }}>
            <label htmlFor="cadetSelect" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)', display: 'block', marginBottom: 6 }}>
              SELECT CADET FOR EVALUATION ({cadets.length} Available Cadets)
            </label>
            {cadets.length === 0 ? (
              <div style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                No cadets available. Please enroll a cadet first.
              </div>
            ) : (
              <select
                id="cadetSelect"
                value={cadetId}
                onChange={e => setCadetId(e.target.value)}
                style={{ width: '100%', height: 40, fontSize: 13 }}
              >
                {cadets.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.enrollment_number}) • {c.wing || 'SW'}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span className="badge badge-olive">OFFICER CLEARANCE: {user?.role?.toUpperCase()}</span>
          </div>
        </div>

        {/* Multi-Pillar Slider Grid */}
        <Panel
          title="Cadet Military Evaluation Sliders"
          tag={`TOTAL: ${activeList.length} PARAMETERS`}
          subtitle="Rate cadet across each pillar. Sliders marked 'MORE TO FOCUS' represent the Commanding Officer's high-priority training vectors."
        >
          {/* Quick Filter Bar for Evaluator */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 18, alignItems: 'center' }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>VIEW:</span>
            <button
              type="button"
              onClick={() => setActiveFocusFilter('all')}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                border: activeFocusFilter === 'all' ? '1px solid var(--navy-900)' : '1px solid var(--border)',
                background: activeFocusFilter === 'all' ? 'var(--navy-900)' : '#FFFFFF',
                color: activeFocusFilter === 'all' ? '#FFFFFF' : 'var(--navy-900)',
              }}
            >
              All ({activeList.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveFocusFilter('high')}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: 700,
                cursor: 'pointer',
                border: activeFocusFilter === 'high' ? '1px solid #D97706' : '1px solid rgba(245, 158, 11, 0.4)',
                background: activeFocusFilter === 'high' ? '#D97706' : 'rgba(245, 158, 11, 0.1)',
                color: activeFocusFilter === 'high' ? '#FFFFFF' : '#B45309',
              }}
            >
              🔥 More to Focus ({countHigh})
            </button>
            <button
              type="button"
              onClick={() => setActiveFocusFilter('normal')}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                border: activeFocusFilter === 'normal' ? '1px solid #2563EB' : '1px solid rgba(59, 130, 246, 0.3)',
                background: activeFocusFilter === 'normal' ? '#2563EB' : 'rgba(59, 130, 246, 0.08)',
                color: activeFocusFilter === 'normal' ? '#FFFFFF' : '#1D4ED8',
              }}
            >
              ⭐ Standard Focus ({countNormal})
            </button>
            <button
              type="button"
              onClick={() => setActiveFocusFilter('low')}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                borderRadius: 6,
                fontWeight: 600,
                cursor: 'pointer',
                border: activeFocusFilter === 'low' ? '1px solid #475569' : '1px solid rgba(100, 116, 139, 0.3)',
                background: activeFocusFilter === 'low' ? '#475569' : 'rgba(100, 116, 139, 0.08)',
                color: activeFocusFilter === 'low' ? '#FFFFFF' : '#475569',
              }}
            >
              🌱 Less to Focus ({countLow})
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 24 }}>
            {displayedCriteria.map(crit => {
              const val = scores[crit.id] !== undefined ? scores[crit.id] : 8.5;
              const name = crit.label || crit.name.replace(/_/g, ' ').toUpperCase();
              const p = (crit.priority || 'normal').toLowerCase();
              const isHigh = p === 'high' || p === 'more_focus';
              const isLow = p === 'low' || p === 'less_focus';

              return (
                <div
                  key={crit.id}
                  style={{
                    background: isHigh ? 'linear-gradient(180deg, #FFFFFF 0%, #FFFBEB 100%)' : 'var(--bg-main)',
                    border: isHigh ? '2px solid #F59E0B' : '1px solid var(--border)',
                    boxShadow: isHigh ? '0 4px 14px rgba(245, 158, 11, 0.15)' : 'none',
                    borderRadius: 'var(--radius-sm)',
                    padding: 14,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                    position: 'relative',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ fontSize: 16 }}>{crit.icon || '🎯'}</span>
                        <span style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: 13 }}>{name}</span>
                      </div>
                      {crit.description && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, lineHeight: 1.3 }}>
                          {crit.description}
                        </div>
                      )}
                    </div>
                    <span style={{ fontWeight: 800, color: isHigh ? '#B45309' : 'var(--olive-700)', fontFamily: 'var(--font-mono)', fontSize: 16, whiteSpace: 'nowrap' }}>
                      {Number(val).toFixed(1)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ 10</span>
                    </span>
                  </div>

                  {/* Priority Status & 1-Click Fast Switcher for Officer */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 6, paddingTop: 4, borderTop: '1px dashed var(--border)' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      FOCUS PRIORITY:
                    </span>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        type="button"
                        title="Set as More to Focus"
                        onClick={() => handleQuickPriorityChange(crit.id, 'high')}
                        style={{
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 700,
                          borderRadius: 4,
                          cursor: 'pointer',
                          border: isHigh ? '1px solid #D97706' : '1px solid rgba(245, 158, 11, 0.3)',
                          background: isHigh ? '#D97706' : '#FFFFFF',
                          color: isHigh ? '#FFFFFF' : '#B45309',
                        }}
                      >
                        🔥 More to Focus
                      </button>
                      <button
                        type="button"
                        title="Set as Standard Focus"
                        onClick={() => handleQuickPriorityChange(crit.id, 'normal')}
                        style={{
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: 4,
                          cursor: 'pointer',
                          border: (!isHigh && !isLow) ? '1px solid #2563EB' : '1px solid rgba(59, 130, 246, 0.3)',
                          background: (!isHigh && !isLow) ? '#2563EB' : '#FFFFFF',
                          color: (!isHigh && !isLow) ? '#FFFFFF' : '#2563EB',
                        }}
                      >
                        ⭐ Standard
                      </button>
                      <button
                        type="button"
                        title="Set as Less to Focus"
                        onClick={() => handleQuickPriorityChange(crit.id, 'low')}
                        style={{
                          padding: '2px 8px',
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: 4,
                          cursor: 'pointer',
                          border: isLow ? '1px solid #475569' : '1px solid rgba(100, 116, 139, 0.3)',
                          background: isLow ? '#475569' : '#FFFFFF',
                          color: isLow ? '#FFFFFF' : '#64748B',
                        }}
                      >
                        🌱 Less
                      </button>
                    </div>
                  </div>

                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={val}
                    onChange={e => updateScore(crit.id, e.target.value)}
                    style={{
                      width: '100%',
                      accentColor: isHigh ? '#D97706' : 'var(--olive-700)',
                      cursor: 'pointer',
                      marginTop: 4,
                    }}
                  />
                </div>
              );
            })}
          </div>

          {/* Remarks Field */}
          <div className="field" style={{ marginBottom: 20 }}>
            <label htmlFor="evalRemarks" style={{ fontSize: 12, fontWeight: 700 }}>
              Officer Evaluation Remarks & Tactical Observations
            </label>
            <textarea
              id="evalRemarks"
              rows={3}
              value={remarks}
              onChange={e => setRemarks(e.target.value)}
              placeholder="e.g. Cadet displayed sharp salute alignment in ceremonial drill; marked for Best Cadet trials. Squad leadership requires additional command voice projection."
              style={{ width: '100%', fontSize: 13, padding: 10 }}
            />
          </div>

          <button
            type="submit"
            className="primary"
            disabled={busy || cadets.length === 0}
            style={{ height: 44, width: '100%', fontSize: 14, fontWeight: 700 }}
          >
            {busy ? 'SYNCHRONIZING SCORES WITH BATTALION COMMAND…' : `✓ SAVE & SUBMIT CADET-360 EVALUATION (${activeList.length} PARAMETERS)`}
          </button>
        </Panel>
      </form>

      {/* =========================================================================
          MODAL: CONFIGURE PILLARS & ADD CUSTOM PARAMETERS (ADMIN & MENTOR)
          ========================================================================= */}
      <Modal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        title="CADET-360: Manage Pillars & Focus Priorities"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {actionError && <ErrorBanner message={actionError} />}
          {actionSuccess && <SuccessBanner message={actionSuccess} />}

          {/* Add New Parameter Card */}
          <div style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: 16,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <span style={{ fontSize: 18 }}>➕</span>
              <h4 style={{ margin: 0, fontSize: 14, color: 'var(--navy-900)' }}>
                Add New Assessment Parameter to 9 Pillars
              </h4>
            </div>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
              Commanding Officers and ANO Mentors can introduce specialized training metrics (e.g. Marksmanship, Obstacle Course, Map Reading) and set their evaluation focus.
            </p>

            <form onSubmit={handleCreateParameter}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 12 }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    PARAMETER TITLE *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weapon Training & Firing"
                    value={newParam.label}
                    onChange={e => setNewParam({ ...newParam, label: e.target.value })}
                    style={{ width: '100%', height: 36, fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    FOCUS PRIORITY *
                  </label>
                  <select
                    value={newParam.priority}
                    onChange={e => setNewParam({ ...newParam, priority: e.target.value })}
                    style={{ width: '100%', height: 36, fontSize: 13 }}
                  >
                    <option value="high">🔥 MORE TO FOCUS (High Priority)</option>
                    <option value="normal">⭐ STANDARD FOCUS (Medium Priority)</option>
                    <option value="low">🌱 LESS TO FOCUS (Low Priority)</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    MAX SCORE
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="100"
                    value={newParam.max_score}
                    onChange={e => setNewParam({ ...newParam, max_score: e.target.value })}
                    style={{ width: '100%', height: 36, fontSize: 13 }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                    TACTICAL ICON
                  </label>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {availableIcons.map(ic => (
                      <button
                        key={ic}
                        type="button"
                        onClick={() => setNewParam({ ...newParam, icon: ic })}
                        style={{
                          width: 32,
                          height: 32,
                          fontSize: 16,
                          borderRadius: 4,
                          border: newParam.icon === ic ? '2px solid var(--navy-900)' : '1px solid var(--border)',
                          background: newParam.icon === ic ? '#E2E8F0' : '#FFFFFF',
                          cursor: 'pointer',
                        }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 11, fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  GUIDANCE / TACTICAL SCOPE DESCRIPTION
                </label>
                <input
                  type="text"
                  placeholder="e.g. Assessment on handling .22 Deluxe Rifle, grouping on 25m target, and stoppages drill."
                  value={newParam.description}
                  onChange={e => setNewParam({ ...newParam, description: e.target.value })}
                  style={{ width: '100%', height: 36, fontSize: 13 }}
                />
              </div>

              <button
                type="submit"
                className="primary"
                disabled={actionBusy}
                style={{ height: 36, padding: '0 18px', fontSize: 12, fontWeight: 700 }}
              >
                {actionBusy ? 'Adding to Database…' : '+ Add Parameter to Framework'}
              </button>
            </form>
          </div>

          {/* List & Priority Configuration of All Parameters */}
          <div>
            <h4 style={{ fontSize: 13, color: 'var(--navy-900)', marginBottom: 10 }}>
              Current Framework Parameters ({activeList.length}) & Priorities:
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 360, overflowY: 'auto' }}>
              {activeList.map(item => {
                const p = (item.priority || 'normal').toLowerCase();
                const isHigh = p === 'high' || p === 'more_focus';
                const isLow = p === 'low' || p === 'less_focus';
                const isCustom = item.category === 'custom';

                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 14px',
                      background: isHigh ? 'rgba(245, 158, 11, 0.08)' : '#FFFFFF',
                      border: isHigh ? '1px solid #F59E0B' : '1px solid var(--border)',
                      borderRadius: 6,
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: '1 1 240px' }}>
                      <span style={{ fontSize: 18 }}>{item.icon || '🎯'}</span>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-900)' }}>
                          {item.label || item.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          {isCustom ? `Custom Parameter • Max ${item.max_score} pts` : `Core Pillar • Max ${item.max_score} pts`}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleQuickPriorityChange(item.id, 'high')}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 700,
                          borderRadius: 4,
                          cursor: 'pointer',
                          border: isHigh ? '1px solid #D97706' : '1px solid rgba(245, 158, 11, 0.4)',
                          background: isHigh ? '#D97706' : '#FFFFFF',
                          color: isHigh ? '#FFFFFF' : '#B45309',
                        }}
                      >
                        🔥 More to Focus
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPriorityChange(item.id, 'normal')}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 4,
                          cursor: 'pointer',
                          border: (!isHigh && !isLow) ? '1px solid #2563EB' : '1px solid rgba(59, 130, 246, 0.3)',
                          background: (!isHigh && !isLow) ? '#2563EB' : '#FFFFFF',
                          color: (!isHigh && !isLow) ? '#FFFFFF' : '#2563EB',
                        }}
                      >
                        ⭐ Standard Focus
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickPriorityChange(item.id, 'low')}
                        style={{
                          padding: '4px 10px',
                          fontSize: 11,
                          fontWeight: 600,
                          borderRadius: 4,
                          cursor: 'pointer',
                          border: isLow ? '1px solid #475569' : '1px solid rgba(100, 116, 139, 0.3)',
                          background: isLow ? '#475569' : '#FFFFFF',
                          color: isLow ? '#FFFFFF' : '#64748B',
                        }}
                      >
                        🌱 Less to Focus
                      </button>

                      {isCustom && (
                        <button
                          type="button"
                          onClick={() => handleDeleteParameter(item.id, item.label || item.name)}
                          style={{
                            padding: '4px 8px',
                            fontSize: 11,
                            borderRadius: 4,
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            background: '#FEE2E2',
                            color: '#991B1B',
                            cursor: 'pointer',
                            fontWeight: 600,
                          }}
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
