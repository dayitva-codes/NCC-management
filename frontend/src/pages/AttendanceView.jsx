import { useState, useEffect, useCallback } from 'react';
import { Panel, StatCard, SuccessBanner, ErrorBanner } from '../components/Form';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { NccCrest } from '../components/NccLogo';
import RefreshingBuffer from '../components/RefreshingBuffer';
import { useDataSync } from '../hooks/useDataSync';

/**
 * AttendanceView Component
 * 
 * Manages authentic parade roll call records and C-Certificate qualification tracking.
 * 1. Cadets: Inspect personalized certified parade muster, percentage attendance, and exam qualification status (>= 75%).
 * 2. ANOs & Admins: Mark and commit live parade roll call into the database across all cadets.
 */
export default function AttendanceView() {
  const { user } = useAuth();
  const isCadet = user?.role === 'cadet';

  // Parade Selection State
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedParadeType, setSelectedParadeType] = useState('Ceremonial Drill');
  const [cadets, setCadets] = useState([]);
  const [cadetStats, setCadetStats] = useState(null);

  // Status & Buffering States
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  /**
   * Load live records from the database
   */
  const loadAttendanceData = useCallback(async () => {
    setError('');
    try {
      if (isCadet) {
        const stats = await api.getMyAttendanceStats();
        setCadetStats(stats);
      } else {
        const [cadetsList, attendanceRecords] = await Promise.all([
          api.listCadets(),
          api.getAttendance({ date: selectedDate }).catch(() => []),
        ]);

        const recordMap = {};
        if (Array.isArray(attendanceRecords)) {
          attendanceRecords.forEach((r) => {
            recordMap[r.cadet_id] = r.status;
          });
        }

        if (Array.isArray(cadetsList)) {
          setCadets(
            cadetsList.map((c) => ({
              id: c.id,
              name: c.full_name,
              reg: c.enrollment_number,
              wing: c.wing || 'SW',
              status: recordMap[c.id] || 'PRESENT',
            }))
          );
        }
      }
    } catch (err) {
      setError(err.message || 'Could not synchronize attendance records with the server.');
    } finally {
      setLoading(false);
    }
  }, [isCadet, selectedDate]);

  useEffect(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  // Real-time synchronization when attendance changes elsewhere
  useDataSync(() => {
    loadAttendanceData();
  }, [loadAttendanceData]);

  /**
   * Toggle status for a cadet in the roll call table (PRESENT, ABSENT, ON_DUTY, MEDICAL)
   */
  function toggleStatus(id, newStatus) {
    setCadets((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
  }

  /**
   * Commit roll call muster to DBMS via API
   */
  async function handleSaveRollCall() {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        date: selectedDate,
        parade_type: selectedParadeType,
        records: cadets.map((c) => ({
          cadet_id: c.id,
          status: c.status,
        })),
      };
      await api.saveBulkAttendance(payload);
      const count = cadets.filter((c) => c.status === 'PRESENT' || c.status === 'ON_DUTY').length;
      setSuccess(`Roll call saved successfully! ${count}/${cadets.length} Cadets accounted for on ${selectedDate} for ${selectedParadeType}.`);
      setTimeout(() => setSuccess(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to save attendance roll call to database.');
    } finally {
      setSaving(false);
    }
  }

  // ==========================================
  // VIEW 1: CADET PERSONAL ATTENDANCE VIEW
  // ==========================================
  if (isCadet) {
    if (loading) {
      return <RefreshingBuffer message="Loading Certified Parade Attendance Records…" minHeight={320} />;
    }

    const rate = cadetStats?.attendance_rate ?? 100.0;
    const isQualified = cadetStats?.is_exam_qualified ?? rate >= 75.0;

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
                Certified drill attendance tracking, leave records, and 'C' Certificate exam qualification status from DBMS.
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
            <div style={{
              fontSize: 14,
              fontWeight: 800,
              color: isQualified ? 'var(--success)' : 'var(--danger)',
              marginTop: 2,
            }}>
              {isQualified ? '✓ EXAM QUALIFIED (>=75%)' : '⚠️ ATTENDANCE SHORTAGE (<75%)'}
            </div>
          </div>
        </div>

        <div className="stat-grid">
          <StatCard
            label="Certified Attendance Rate"
            value={`${rate}%`}
            icon="📊"
            tone={isQualified ? 'success' : 'danger'}
          />
          <StatCard
            label="Total Parades Held"
            value={`${cadetStats?.total_parades || 0} Parades`}
            icon="📅"
            tone="primary"
          />
          <StatCard
            label="Parades Attended"
            value={`${cadetStats?.attended_parades || 0} Attended`}
            icon="🎖️"
            tone="olive"
          />
          <StatCard
            label="Excused / On Duty"
            value={`${(cadetStats?.history || []).filter(h => h.status === 'ON_DUTY').length} Sessions`}
            icon="🛡️"
            tone="saffron"
          />
        </div>

        <Panel title="Official Parade Muster History" guideTag="AUTHENTIC DBMS RECORDS">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>DATE</th>
                  <th>PARADE / TRAINING DRILL</th>
                  <th>STATUS</th>
                  <th>RECORD TIMESTAMP</th>
                </tr>
              </thead>
              <tbody>
                {(cadetStats?.history || []).length === 0 ? (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: 24, color: 'var(--text-muted)' }}>
                      No parade attendance records found in the database yet.
                    </td>
                  </tr>
                ) : (
                  (cadetStats?.history || []).map((h) => (
                    <tr key={h.id}>
                      <td style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{h.date}</td>
                      <td>{h.parade_type}</td>
                      <td>
                        <span
                          className={`badge ${
                            h.status === 'PRESENT'
                              ? 'badge-success'
                              : h.status === 'ON_DUTY'
                              ? 'badge-navy'
                              : h.status === 'MEDICAL'
                              ? 'badge-saffron'
                              : 'badge-danger'
                          }`}
                        >
                          {h.status}
                        </span>
                      </td>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                        {new Date(h.created_at).toLocaleDateString('en-IN')}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    );
  }

  // ==========================================
  // VIEW 2: MENTOR / ADMIN MUSTER ROLL CALL
  // ==========================================
  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>COMPANY MUSTER & ATTENDANCE MANAGEMENT</span>
            </div>
            <h2>Parade Attendance & Roll Call</h2>
            <p>
              Record real-time roll call for training parades, weapon handling sessions, and ceremonial drills. Data is committed directly to the DBMS.
            </p>
          </div>
        </div>
      </div>

      {error && <ErrorBanner message={error} />}
      {success && <SuccessBanner message={success} />}

      {/* Date & Session Selector Bar */}
      <div
        style={{
          background: '#FFFFFF',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-md)',
          padding: 18,
          marginBottom: 20,
          display: 'flex',
          gap: 16,
          alignItems: 'center',
          flexWrap: 'wrap',
          boxShadow: 'var(--shadow-xs)',
        }}
      >
        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)', display: 'block', marginBottom: 4 }}>
            PARADE DATE
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 13 }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)', display: 'block', marginBottom: 4 }}>
            PARADE / DRILL TYPE
          </label>
          <select
            value={selectedParadeType}
            onChange={(e) => setSelectedParadeType(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', fontSize: 13, minWidth: 240 }}
          >
            <option value="Ceremonial Foot Drill">Ceremonial Foot Drill & Word of Command</option>
            <option value="Weapon Training">Weapon Training (.22 Deluxe Rifle & Safety)</option>
            <option value="Map Reading">Map Reading & Prismatic Compass Bearings</option>
            <option value="Physical Training">Physical Training (PT) & Obstacle Course</option>
            <option value="Field Craft">Field Craft & Battle Craft (FC & BC)</option>
            <option value="Special Camp Parade">Special Camp Parade & Flag Hoisting</option>
          </select>
        </div>

        <div style={{ marginLeft: 'auto', alignSelf: 'flex-end' }}>
          <button
            className="primary"
            onClick={handleSaveRollCall}
            disabled={saving || loading || cadets.length === 0}
            style={{ padding: '9px 20px', fontWeight: 800, fontSize: 13 }}
          >
            {saving ? 'Saving to Database…' : '💾 Commit Roll Call to DBMS'}
          </button>
        </div>
      </div>

      {loading ? (
        <RefreshingBuffer message="Loading Company Cadet Roster for Roll Call…" minHeight={300} />
      ) : (
        <Panel title={`Muster Roll Call (${cadets.length} Cadets in Unit)`} guideTag="ROLL CALL">
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>REGIMENTAL / ENROLLMENT #</th>
                  <th>CADET NAME</th>
                  <th>WING</th>
                  <th style={{ textAlign: 'center' }}>ATTENDANCE STATUS</th>
                </tr>
              </thead>
              <tbody>
                {cadets.map((c) => (
                  <tr key={c.id}>
                    <td style={{ fontFamily: 'monospace', fontWeight: 700 }}>{c.reg}</td>
                    <td style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{c.name}</td>
                    <td>
                      <span className="badge badge-navy">{c.wing}</span>
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <div style={{ display: 'inline-flex', gap: 6 }}>
                        {['PRESENT', 'ABSENT', 'ON_DUTY', 'MEDICAL'].map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => toggleStatus(c.id, st)}
                            style={{
                              padding: '5px 12px',
                              borderRadius: 4,
                              border: '1px solid',
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              background:
                                c.status === st
                                  ? st === 'PRESENT'
                                    ? '#dcfce7'
                                    : st === 'ABSENT'
                                    ? '#fee2e2'
                                    : st === 'ON_DUTY'
                                    ? '#eff6ff'
                                    : '#fef3c7'
                                  : '#FFFFFF',
                              color:
                                c.status === st
                                  ? st === 'PRESENT'
                                    ? '#15803d'
                                    : st === 'ABSENT'
                                    ? '#b91c1c'
                                    : st === 'ON_DUTY'
                                    ? '#1d4ed8'
                                    : '#b45309'
                                  : '#64748b',
                              borderColor: c.status === st ? 'currentColor' : '#cbd5e1',
                            }}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      )}
    </div>
  );
}
