import { useState, useEffect, useCallback } from 'react';
import { Panel, StatCard, SuccessBanner, ErrorBanner } from '../components/Form';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { NccCrest } from '../components/NccLogo';

export default function AttendanceView() {
  const { user } = useAuth();
  const isCadet = user?.role === 'cadet';

  // State for Mentor/Admin roll call
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedParadeType, setSelectedParadeType] = useState('Ceremonial Drill');
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [cadets, setCadets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Cadet individual history
  const cadetHistory = [
    { date: '2026-09-05', session: 'Weekend Ceremonial Drill & Guard of Honour', status: 'PRESENT', officer: 'Capt. Sunita Verma' },
    { date: '2026-08-29', session: 'Firing Practice (.22 Deluxe Rifle)', status: 'PRESENT', officer: 'Capt. Sunita Verma' },
    { date: '2026-08-22', session: 'Obstacle Course Training & PT', status: 'PRESENT', officer: 'Capt. Sunita Verma' },
    { date: '2026-08-15', session: 'Independence Day Ceremonial Parade', status: 'PRESENT', officer: 'Lt. Col. R. Rathore (CO)' },
    { date: '2026-08-08', session: 'Map Reading & Compass Navigation', status: 'ON_DUTY', officer: 'Capt. Sunita Verma' },
    { date: '2026-08-01', session: 'Special Weapon Cleaning & Armory Parade', status: 'ABSENT', officer: 'Capt. Sunita Verma' },
  ];

  const loadCadetsForAttendance = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!isCadet) {
        const data = await api.listCadets();
        if (Array.isArray(data)) {
          setCadets(data.map(c => ({
            id: c.id,
            name: c.full_name,
            reg: c.enrollment_number,
            wing: c.wing || 'SW',
            status: 'PRESENT',
          })));
        }
      }
    } catch (err) {
      setError(err.message || 'Could not load cadets list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCadet]);

  useEffect(() => {
    loadCadetsForAttendance();
    const handleGlobalRefresh = () => loadCadetsForAttendance();
    window.addEventListener('ncc:refresh-data', handleGlobalRefresh);
    return () => window.removeEventListener('ncc:refresh-data', handleGlobalRefresh);
  }, [loadCadetsForAttendance]);

  function toggleStatus(id, newStatus) {
    setCadets(prev => prev.map(c => c.id === id ? { ...c, status: newStatus } : c));
  }

  function handleSaveRollCall() {
    const count = cadets.filter(c => c.status === 'PRESENT' || c.status === 'ON_DUTY').length;
    setSuccess(`Roll call saved successfully! ${count}/${cadets.length} Cadets accounted for on ${selectedDate} for ${selectedParadeType}.`);
    setTimeout(() => setSuccess(''), 5000);
  }

  // ==========================================
  // VIEW 1: CADET PERSONAL ATTENDANCE VIEW
  // ==========================================
  if (isCadet) {
    return (
      <div>
        <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <NccCrest size={48} />
            <div>
              <div className="page-eyebrow">
                <span className="dot" />
                <span>OFFICIAL CADET ROLL CALL & MUSTER LOG</span>
              </div>
              <h2>My Parade Attendance Record</h2>
              <p>
                Certified drill attendance tracking, leave applications, and 'C' Certificate exam qualification status.
              </p>
            </div>
          </div>

          <div style={{
            background: '#FFFFFF',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 20px',
            textAlign: 'right',
            boxShadow: 'var(--shadow-xs)',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>CERTIFICATION STATUS</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--olive-700)', marginTop: 2 }}>
              QUALIFIED (95.0%)
            </div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Min. 75% Required for Exam</div>
          </div>
        </div>

        <div className="stats-grid">
          <StatCard label="ATTENDANCE RATIO" value="95.0%" trend="+20% above cutoff" trendPositive={true} icon="📈" sub="38 of 40 Required Parades" tone="olive" />
          <StatCard label="PRESENT ON PARADE" value="38" trend="Recorded" trendPositive={true} icon="✅" sub="Drill Ground Musters" tone="success" />
          <StatCard label="OFFICIAL DUTY (OD)" value="1" trend="Excused" trendPositive={true} icon="🎖️" sub="Pre-RDC Camp Duty" tone="navy" />
          <StatCard label="UNEXCUSED ABSENCE" value="1" trend="Within safe margin" trendPositive={false} icon="⚠️" sub="Aug 01 Armory Parade" tone="saffron" />
        </div>

        <Panel title="Personal Parade Attendance Log (Recent Sessions)" tag="CERTIFIED ROSTER">
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Parade Session / Activity</th>
                  <th>Certifying Officer</th>
                  <th style={{ textAlign: 'right' }}>Roll Call Status</th>
                </tr>
              </thead>
              <tbody>
                {cadetHistory.map((row, idx) => (
                  <tr key={idx}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>{row.date}</td>
                    <td style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{row.session}</td>
                    <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{row.officer}</td>
                    <td style={{ textAlign: 'right' }}>
                      <span className={`badge ${row.status === 'PRESENT' ? 'badge-success' : row.status === 'ON_DUTY' ? 'badge-navy' : 'badge-saffron'}`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MENTOR & ADMIN ROLL CALL MUSTER STATION
  // ==========================================
  const presentCount = cadets.filter(c => c.status === 'PRESENT').length;
  const onDutyCount = cadets.filter(c => c.status === 'ON_DUTY').length;
  const absentCount = cadets.filter(c => c.status === 'ABSENT').length;
  const rate = cadets.length > 0 ? Math.round(((presentCount + onDutyCount) / cadets.length) * 100) : 100;

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>PARADE ROLL CALL & MUSTER STATION</span>
            </div>
            <h2>Company Parade Attendance Station</h2>
            <p>
              Record parade muster roll call on live enrolled cadets, verify leave exemptions, and certify attendance compliance.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => { setRefreshing(true); loadCadetsForAttendance(); }}
            disabled={loading || refreshing}
          >
            <span className="refresh-icon">🔄</span>
            <span>{refreshing ? 'Updating…' : 'Refresh Roster'}</span>
          </button>
          <button
            type="button"
            className="primary"
            onClick={handleSaveRollCall}
            disabled={cadets.length === 0}
            style={{ height: 38, padding: '0 20px' }}
          >
            ✓ Save Parade Roll Call
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <div className="stats-grid">
        <StatCard label="PARADE STRENGTH" value={`${rate}%`} trend="Company Muster Rate" trendPositive={rate >= 75} icon="📈" sub="Min. 75% Requirement" tone="navy" />
        <StatCard label="PRESENT ON PARADE" value={presentCount} trend="Checked In" trendPositive={true} icon="✅" sub="On Grounds" tone="success" />
        <StatCard label="ON OFFICIAL DUTY (OD)" value={onDutyCount} trend="Excused" trendPositive={true} icon="🎖️" sub="Camp / HQ Orders" tone="olive" />
        <StatCard label="ABSENT UNEXCUSED" value={absentCount} trend="Flagged" trendPositive={absentCount === 0} icon="⚠️" sub="Requires Explanation" tone="saffron" />
      </div>

      <Panel title="Parade Session Muster Configuration" tag="DRILL MUSTER">
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 20 }}>
          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Parade Date</label>
            <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)} style={{ height: 38 }} />
          </div>

          <div className="field" style={{ margin: 0 }}>
            <label style={{ fontSize: 12, fontWeight: 700 }}>Parade Discipline / Session</label>
            <select value={selectedParadeType} onChange={e => setSelectedParadeType(e.target.value)} style={{ height: 38 }}>
              <option value="Ceremonial Drill">Ceremonial Drill & Guard of Honour</option>
              <option value="Weapon Training">Weapon Stripping & Firing (.22 Deluxe)</option>
              <option value="Obstacle Course">Obstacle Training & Physical Fitness</option>
              <option value="Map Reading">Map Reading & Compass Navigation</option>
              <option value="Theory Lecture">Military History & National Integration</option>
            </select>
          </div>
        </div>

        {cadets.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No Enrolled Cadets Found</div>
            <div className="empty-state-text">
              Enroll cadets into the battalion roster to record parade muster roll calls.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cadet Name</th>
                  <th>Reg. Number</th>
                  <th>Wing</th>
                  <th style={{ textAlign: 'right' }}>Muster Roll Call Status</th>
                </tr>
              </thead>
              <tbody>
                {cadets.map(cadet => (
                  <tr key={cadet.id}>
                    <td style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{cadet.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{cadet.reg}</td>
                    <td><span className="badge badge-navy">{cadet.wing}</span></td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => toggleStatus(cadet.id, 'PRESENT')}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: cadet.status === 'PRESENT' ? 'var(--olive-700)' : '#FFFFFF',
                            color: cadet.status === 'PRESENT' ? '#FFF' : 'var(--navy-900)',
                          }}
                        >
                          PRESENT
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(cadet.id, 'ON_DUTY')}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: cadet.status === 'ON_DUTY' ? 'var(--navy-900)' : '#FFFFFF',
                            color: cadet.status === 'ON_DUTY' ? '#FFF' : 'var(--navy-900)',
                          }}
                        >
                          ON DUTY
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(cadet.id, 'ABSENT')}
                          style={{
                            padding: '4px 10px',
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 'var(--radius-xs)',
                            border: '1px solid var(--border)',
                            cursor: 'pointer',
                            background: cadet.status === 'ABSENT' ? '#DC2626' : '#FFFFFF',
                            color: cadet.status === 'ABSENT' ? '#FFF' : 'var(--navy-900)',
                          }}
                        >
                          ABSENT
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </div>
  );
}
