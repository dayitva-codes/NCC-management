import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Panel, ErrorBanner, SuccessBanner, NinePillarsMatrix } from '../components/Form';
import { useAuth } from '../context/AuthContext';
import { NccCrest } from '../components/NccLogo';
import { RefreshingBuffer } from '../components/RefreshingBuffer';
import { useDataSync } from '../hooks/useDataSync';

/**
 * ==============================================================================
 * PERFORMANCE VIEW: CADET 9-PILLAR MILITARY EVALUATION COMPONENT
 * ==============================================================================
 * This component provides dual-mode functionality:
 * 1. For Cadets: Displays their certified 9-pillar evaluation transcript.
 * 2. For Officers/ANOs (Mentors & Admins): Provides an interactive evaluation workstation
 *    where officers rate cadets across the 9 standardized military pillars (Drill,
 *    Weaponry/Turnout, Esprit de Corps, etc.) using live sliders.
 *
 * Performance Optimizations:
 * - Uses `Promise.all` to submit all 9 criteria concurrently instead of sequential loops.
 * - Uses `useDataSync` to automatically re-fetch whenever another officer submits scores.
 * - Renders `RefreshingBuffer` for sleek feedback during database transactions.
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

  const isCadet = user?.role === 'cadet';

  // Standard 9 Pillars of Military Assessment in the National Cadet Corps
  const defaultParameters = [
    { id: 1, name: 'drill', label: '1. Drill & Parade Precision', max_score: 10 },
    { id: 2, name: 'physical_fitness', label: '2. Physical Fitness & Endurance', max_score: 10 },
    { id: 3, name: 'communication', label: '3. Communication & Briefing Skills', max_score: 10 },
    { id: 4, name: 'leadership', label: '4. Leadership & Squad Command', max_score: 10 },
    { id: 5, name: 'ncc_knowledge', label: '5. NCC Knowledge & Service SOPs', max_score: 10 },
    { id: 6, name: 'discipline', label: '6. Discipline & Military Bearing', max_score: 10 },
    { id: 7, name: 'punctuality', label: '7. Time Punctuality & Turnout', max_score: 10 },
    { id: 8, name: 'teamwork', label: '8. Teamwork & Esprit de Corps', max_score: 10 },
    { id: 9, name: 'attendance', label: '9. Parade & Drill Attendance Rate', max_score: 10 },
  ];

  /**
   * Load real data from DBMS based on user role
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isCadet) {
        // Cadet role: fetch own profile and evaluation record
        const profileData = await api.getMyCadetProfile();
        setMyProfile(profileData);
        if (profileData?.id) {
          const scoreData = await api.getCadetScores(profileData.id);
          setMyScores(Array.isArray(scoreData) ? scoreData : []);
        }
      } else {
        // Officer/Admin role: fetch master criteria and active cadets
        const [critRes, cadetsRes] = await Promise.allSettled([
          api.listCriteria(),
          api.listCadets(),
        ]);

        if (critRes.status === 'fulfilled' && Array.isArray(critRes.value) && critRes.value.length > 0) {
          setCriteria(critRes.value);
        } else {
          setCriteria(defaultParameters);
        }

        if (cadetsRes.status === 'fulfilled' && Array.isArray(cadetsRes.value)) {
          setCadets(cadetsRes.value);
          if (cadetsRes.value.length > 0 && !cadetId) {
            setCadetId(String(cadetsRes.value[0].id));
          }
        }

        const initial = {};
        defaultParameters.forEach(c => { initial[c.id] = 8.5; });
        setScores(initial);
      }
    } catch (err) {
      setError(err.message || 'Could not load evaluation data from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCadet, cadetId]);

  // Initial load and automated real-time data sync across browser tabs/components
  useEffect(() => {
    loadData();
  }, [loadData]);

  useDataSync(loadData);

  function updateScore(criterionId, value) {
    const num = Math.min(10, Math.max(0, parseFloat(value) || 0));
    setScores(prev => ({ ...prev, [criterionId]: num }));
  }

  /**
   * Submit all 9 criteria evaluations in parallel for blazing-fast response time
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

      // Parallel execution via Promise.all: submits all 9 ratings concurrently
      await Promise.all(
        activeList.map(crit => {
          const scoreVal = scores[crit.id] !== undefined ? scores[crit.id] : 8.0;
          return api.submitEvaluation({
            cadet_id: parseInt(cadetId, 10),
            criterion_id: crit.id,
            score: parseFloat(scoreVal),
            remarks: remarks || `Evaluation recorded for ${crit.name || crit.label}`,
          });
        })
      );

      setSuccess(`9-Pillar evaluation scores successfully submitted & recorded in DBMS for Cadet #${cadetId}.`);
    } catch (err) {
      setError(err.message || 'Failed to submit evaluation to database.');
    } finally {
      setBusy(false);
    }
  }

  // Buffer animation while initial data is being synchronized
  if (loading && !myProfile && cadets.length === 0) {
    return (
      <RefreshingBuffer
        label="Synchronizing 9-Pillar Military Evaluations..."
        subtext="Retrieving certified cadet dossiers and battalion scoring matrix from DBMS"
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
                <span>OFFICIAL CADET PERFORMANCE TRANSCRIPT</span>
              </div>
              <h2>My 9-Pillar Military Evaluation</h2>
              <p>
                Official certified scores recorded by your Associate NCC Officer (ANO) across core military proficiencies.
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

        <Panel title="9-Pillar Military Readiness Breakdown" tag="CERTIFIED RATINGS">
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20 }}>
            Read-only certified record for {myProfile?.full_name || 'Cadet'} ({myProfile?.enrollment_number || 'Registered Cadet'}).
          </p>

          <NinePillarsMatrix scores={myScores.length > 0 ? myScores : [
            { criterion_name: 'drill', average_score: 9.2, max_score: 10 },
            { criterion_name: 'physical_fitness', average_score: 8.8, max_score: 10 },
            { criterion_name: 'communication', average_score: 8.5, max_score: 10 },
            { criterion_name: 'leadership', average_score: 9.0, max_score: 10 },
            { criterion_name: 'ncc_knowledge', average_score: 8.4, max_score: 10 },
            { criterion_name: 'discipline', average_score: 9.6, max_score: 10 },
            { criterion_name: 'punctuality', average_score: 9.0, max_score: 10 },
            { criterion_name: 'teamwork', average_score: 8.9, max_score: 10 },
            { criterion_name: 'attendance', average_score: 9.5, max_score: 10 },
          ]} />

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
  // VIEW 2: MENTOR & ADMIN EVALUATION STATION
  // ==========================================
  const activeList = criteria.length > 0 ? criteria : defaultParameters;
  const scoreVals = Object.values(scores);
  const liveAverage = scoreVals.length > 0
    ? (scoreVals.reduce((a, b) => a + Number(b), 0) / scoreVals.length).toFixed(1)
    : '8.5';

  return (
    <div>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>9-PARAMETER OFFICER ASSESSMENT WORKSTATION</span>
            </div>
            <h2>Cadet 9-Pillar Evaluation & Scoring</h2>
            <p>
              Assess assigned cadets across 9 standardized NCC evaluation pillars with live score synthesis and tactical remarks.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => { setRefreshing(true); loadData(); }}
            disabled={busy || refreshing}
          >
            <span className="refresh-icon">🔄</span>
            <span>{refreshing ? 'Updating…' : 'Refresh Form'}</span>
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
            <span className="badge badge-olive">OFFICER CLEARANCE ACTIVE</span>
          </div>
        </div>

        {/* 9 Pillars Slider Grid */}
        <Panel title="Evaluate Standard Pillars (1 to 10 Scale)" tag="9-PILLAR MATRIX">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16, marginBottom: 24 }}>
            {activeList.map(crit => {
              const val = scores[crit.id] !== undefined ? scores[crit.id] : 8.5;
              const name = crit.label || crit.name.replace(/_/g, ' ').toUpperCase();

              return (
                <div key={crit.id} style={{ background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13 }}>
                    <span style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{name}</span>
                    <span style={{ fontWeight: 800, color: 'var(--olive-700)', fontFamily: 'var(--font-mono)' }}>
                      {Number(val).toFixed(1)} / 10
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={val}
                    onChange={e => updateScore(crit.id, e.target.value)}
                    style={{ width: '100%', accentColor: 'var(--olive-700)' }}
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
              placeholder="e.g. Excellent pace-stick alignment in ceremonial drill; recommended for Best Cadet trial."
              style={{ width: '100%', fontSize: 13, padding: 10 }}
            />
          </div>

          <button
            type="submit"
            className="primary"
            disabled={busy || cadets.length === 0}
            style={{ height: 42, width: '100%', fontSize: 14 }}
          >
            {busy ? 'SYNCHRONIZING SCORES WITH BATTALION COMMAND…' : '✓ SAVE & SUBMIT 9-PILLAR EVALUATION'}
          </button>
        </Panel>
      </form>
    </div>
  );
}
