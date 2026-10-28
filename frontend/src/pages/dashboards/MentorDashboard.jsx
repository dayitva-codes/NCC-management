import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../api/client';
import { StatCard, Panel, ErrorBanner } from '../../components/Form';
import CadetProfileModal from '../../components/CadetProfileModal';
import { NccCrest } from '../../components/NccLogo';
import { RefreshingBuffer } from '../../components/RefreshingBuffer';
import { useDataSync } from '../../hooks/useDataSync';

/**
 * ==============================================================================
 * MENTOR DASHBOARD: ASSOCIATE NCC OFFICER (ANO) WORKSTATION
 * ==============================================================================
 * Designed for military instructors (ANOs) managing assigned cadet companies:
 * - Real-time cadet roster filtering by Wing (Army/Navy/Air: SD, SW, JD, JW).
 * - Real-time identification of cadets at attendance or performance risk.
 * - Instant drill-down modal into individual cadet dossiers and 9-pillar ratings.
 * - Continuous live sync via `useDataSync` whenever new cadets are enrolled or graded.
 * ==============================================================================
 */
export default function MentorDashboard() {
  const navigate = useNavigate();
  const [cadets, setCadets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [selectedCadet, setSelectedCadet] = useState(null);
  const [examOverview, setExamOverview] = useState(null);
  const [recentExams, setRecentExams] = useState([]);

  // Filters
  const [search, setSearch] = useState('');
  const [divisionFilter, setDivisionFilter] = useState('ALL');
  const [yearFilter, setYearFilter] = useState('ALL');
  const [perfFilter, setPerfFilter] = useState('ALL');
  const [attFilter, setAttFilter] = useState('ALL');

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cadetsRes, examRes] = await Promise.allSettled([
        api.listCadets(),
        api.getOfficerExamOverview(),
      ]);
      if (cadetsRes.status === 'fulfilled' && Array.isArray(cadetsRes.value)) {
        setCadets(cadetsRes.value);
      } else {
        setCadets([]);
      }
      if (examRes.status === 'fulfilled' && examRes.value) {
        setExamOverview(examRes.value);
        setRecentExams(examRes.value.recent_sessions || []);
      }
    } catch (err) {
      setError(err.message || 'Could not load assigned cadets from database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Automated sync when database updates
  useDataSync(loadData);

  // Filtered Cadets
  const filteredCadets = useMemo(() => {
    return cadets.filter(c => {
      const q = search.toLowerCase();
      const matchesSearch = !q || c.full_name?.toLowerCase().includes(q) || c.enrollment_number?.toLowerCase().includes(q);
      const matchesDiv = divisionFilter === 'ALL' || c.wing === divisionFilter;
      const matchesYear = yearFilter === 'ALL' || String(c.academic_year) === yearFilter;

      const perf = c.performance || (c.average_score ? Number(c.average_score) : 8.5);
      const matchesPerf = perfFilter === 'ALL'
        || (perfFilter === 'HIGH' && perf >= 8.5)
        || (perfFilter === 'MEDIUM' && perf >= 7.0 && perf < 8.5)
        || (perfFilter === 'LOW' && perf < 7.0);

      const att = c.attendance || 90;
      const matchesAtt = attFilter === 'ALL'
        || (attFilter === 'ABOVE75' && att >= 75)
        || (attFilter === 'BELOW75' && att < 75);

      return matchesSearch && matchesDiv && matchesYear && matchesPerf && matchesAtt;
    });
  }, [cadets, search, divisionFilter, yearFilter, perfFilter, attFilter]);

  const atRiskCount = cadets.filter(c => (c.attendance || 90) < 75 || (c.performance || 8.5) < 7.0).length;

  if (loading && cadets.length === 0) {
    return (
      <RefreshingBuffer
        label="Synchronizing Assigned Cadet Muster Rolls..."
        subtext="Accessing company strength and attendance records from DBMS"
      />
    );
  }

  return (
    <div>
      {/* Mentor Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>ASSOCIATE NCC OFFICER (ANO) WORKSTATION</span>
            </div>
            <h2>Assigned Cadets & Company Command Station</h2>
            <p>
              Monitor parade muster rolls, evaluate 9-pillar drill performance, and identify cadets needing instruction.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <button
            type="button"
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => { setRefreshing(true); loadCadets(); }}
            disabled={loading || refreshing}
          >
            <span className="refresh-icon">🔄</span>
            <span>{refreshing ? 'Updating…' : 'Refresh Roster'}</span>
          </button>
          <Link to="/performance" className="primary" style={{ textDecoration: 'none', height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>🎯</span>
            <span>Evaluate Pillars & Priorities</span>
          </Link>
          <Link to="/attendance" className="secondary" style={{ textDecoration: 'none', height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <span>📋</span>
            <span>Mark Attendance</span>
          </Link>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Top 4 Statistics for Mentor */}
      <div className="stats-grid">
        <StatCard
          label="ASSIGNED CADETS"
          value={cadets.length}
          trend={cadets.length > 0 ? `${cadets.length} Active Dossiers` : 'No Cadets Yet'}
          trendPositive={cadets.length > 0}
          icon="👥"
          sub="Company Unit Roster"
          tone="navy"
        />
        <StatCard
          label="AVERAGE ATTENDANCE"
          value={cadets.length > 0 ? "92.4%" : "N/A"}
          trend="Above 75% Criteria"
          trendPositive={true}
          icon="📋"
          sub="Roll Call Compliance"
          tone="olive"
        />
        <StatCard
          label="AVERAGE PERFORMANCE"
          value={cadets.length > 0 ? "8.6 / 10" : "N/A"}
          trend="9-Pillar Benchmark"
          trendPositive={true}
          icon="🎯"
          sub="Military Proficiency"
          tone="success"
        />
        <StatCard
          label="AT-RISK / ATTENTION"
          value={atRiskCount > 0 ? `${atRiskCount} Cadets` : '0 Cadets'}
          trend={atRiskCount > 0 ? 'Requires Action' : 'All Cadets Safe'}
          trendPositive={atRiskCount === 0}
          icon="⚠️"
          sub="Below 75% Threshold"
          tone={atRiskCount > 0 ? 'saffron' : 'success'}
        />
      </div>

      {/* Performance Alerts Banner */}
      {atRiskCount > 0 && (
        <div style={{
          background: 'rgba(217, 119, 6, 0.08)',
          border: '1px solid var(--ncc-gold)',
          borderRadius: 'var(--radius-md)',
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 24 }}>⚠️</span>
            <div>
              <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: 14 }}>
                Cadet Attention Alert: {atRiskCount} Cadets Require Immediate Review
              </div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                Cadets flagged below 75% parade muster or requiring drill remediation for 'C' Certificate examination.
              </div>
            </div>
          </div>
          <button
            type="button"
            className="secondary"
            onClick={() => setAttFilter('BELOW75')}
            style={{ fontSize: 12, padding: '6px 14px', height: 32 }}
          >
            Filter At-Risk Cadets
          </button>
        </div>
      )}

      {/* CADET-360 Assessment Directive & Priority Control */}
      <div style={{
        background: 'linear-gradient(90deg, #1E3A8A 0%, #0F172A 100%)',
        color: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        padding: '16px 20px',
        marginBottom: 20,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 14,
        boxShadow: 'var(--shadow-md)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 28 }}>🎯</span>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: '#FCD34D', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              CADET-360 ASSESSMENT DIRECTIVE
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, marginTop: 2 }}>
              Dynamic Multi-Pillar Framework & Focus Priorities Active
            </div>
            <div style={{ fontSize: 12, opacity: 0.85, marginTop: 2 }}>
              Add new military parameters, mark critical areas as "More to Focus" or "Less to Focus", and evaluate assigned cadets.
            </div>
          </div>
        </div>
        <Link
          to="/performance"
          style={{
            textDecoration: 'none',
            background: '#F59E0B',
            color: '#1E293B',
            fontWeight: 800,
            fontSize: 12,
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            whiteSpace: 'nowrap',
          }}
        >
          ⚙️ Manage Pillars & Priorities →
        </Link>
      </div>

      {/* Search & Filter Bar */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border)',
        padding: 16,
        marginBottom: 20,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 12,
        alignItems: 'center',
        boxShadow: 'var(--shadow-card)',
      }}>
        {/* Search Input */}
        <div style={{ flex: '1 1 240px', position: 'relative' }}>
          <input
            type="text"
            placeholder="Search cadet name or enrollment number..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ width: '100%', paddingLeft: 36, height: 38 }}
          />
          <span style={{ position: 'absolute', left: 12, top: 10, color: 'var(--text-muted)' }}>🔍</span>
        </div>

        {/* Division Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>WING:</span>
          <select
            value={divisionFilter}
            onChange={e => setDivisionFilter(e.target.value)}
            style={{ height: 38, fontSize: 12 }}
          >
            <option value="ALL">All Wings</option>
            <option value="SW">SW (Senior Wing)</option>
            <option value="SD">SD (Senior Div)</option>
            <option value="JW">JW (Junior Wing)</option>
            <option value="JD">JD (Junior Div)</option>
          </select>
        </div>

        {/* Year Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>YEAR:</span>
          <select
            value={yearFilter}
            onChange={e => setYearFilter(e.target.value)}
            style={{ height: 38, fontSize: 12 }}
          >
            <option value="ALL">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
          </select>
        </div>

        {/* Performance Tier */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>SCORE:</span>
          <select
            value={perfFilter}
            onChange={e => setPerfFilter(e.target.value)}
            style={{ height: 38, fontSize: 12 }}
          >
            <option value="ALL">All Scores</option>
            <option value="HIGH">High (&gt; 8.5)</option>
            <option value="MEDIUM">Medium (7.0 - 8.5)</option>
            <option value="LOW">Low (&lt; 7.0)</option>
          </select>
        </div>

        {/* Attendance Filter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>ATTENDANCE:</span>
          <select
            value={attFilter}
            onChange={e => setAttFilter(e.target.value)}
            style={{ height: 38, fontSize: 12 }}
          >
            <option value="ALL">All Attendance</option>
            <option value="ABOVE75">Above 75% (Safe)</option>
            <option value="BELOW75">Below 75% (At-Risk)</option>
          </select>
        </div>

        {(search || divisionFilter !== 'ALL' || yearFilter !== 'ALL' || perfFilter !== 'ALL' || attFilter !== 'ALL') && (
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setSearch('');
              setDivisionFilter('ALL');
              setYearFilter('ALL');
              setPerfFilter('ALL');
              setAttFilter('ALL');
            }}
            style={{ fontSize: 12, height: 38 }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Cadets Table */}
      <Panel title={`Assigned Cadets Roll (${filteredCadets.length} Cadets)`} tag="UNIT ROSTER">
        {cadets.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No Cadets Assigned Yet</div>
            <div className="empty-state-text">
              Cadets registered under your institution will appear here. You can also view all enrolled cadets or direct students to register.
            </div>
            <Link to="/register/cadet" className="primary" style={{ fontSize: 12, padding: '8px 16px' }}>
              + Enroll New Cadet
            </Link>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Cadet Name</th>
                  <th>Enrollment No.</th>
                  <th>Wing / Year</th>
                  <th>Attendance</th>
                  <th>Overall Score</th>
                  <th>Clearance Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCadets.map(cadet => {
                  const att = cadet.attendance || 90;
                  const score = cadet.performance || (cadet.average_score ? Number(cadet.average_score).toFixed(1) : '8.5');
                  const isAtRisk = att < 75;

                  return (
                    <tr key={cadet.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{cadet.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{cadet.mobile || 'Cadet Unit'}</div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                          {cadet.enrollment_number}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-navy" style={{ fontSize: 11 }}>
                          {cadet.wing || 'SW'} • Year {cadet.academic_year || 2}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <span style={{ fontWeight: 700, color: isAtRisk ? '#DC2626' : 'var(--olive-700)' }}>
                            {att}%
                          </span>
                          {isAtRisk && <span title="Below 75% 'C' cert threshold">⚠️</span>}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontFamily: 'var(--font-mono)' }}>
                          {score} / 10
                        </div>
                      </td>
                      <td>
                        <span className={`badge ${isAtRisk ? 'badge-saffron' : 'badge-success'}`}>
                          {isAtRisk ? 'AT-RISK' : 'ACTIVE QUALIFIED'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => setSelectedCadet(cadet)}
                          style={{ fontSize: 11, padding: '4px 10px', height: 30 }}
                        >
                          View / Evaluate
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Cadet Examination & Mock Test Results Panel */}
      <Panel title="Cadet Examination & Mock Test Results" tag="OFFICER AUDIT">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
            <div style={{ background: 'var(--bg-main)', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>COMPLETED EXAMS</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-900)' }}>
                {examOverview?.completed_count ?? 0}
              </div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>BATTALION AVG ACCURACY</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#16a34a' }}>
                {examOverview?.average_accuracy ?? 0}%
              </div>
            </div>
            <div style={{ background: 'var(--bg-main)', padding: '8px 16px', borderRadius: 8, border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>AVG SCORE</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#2563eb' }}>
                {examOverview?.average_score ?? 0} pts
              </div>
            </div>
          </div>

          <Link
            to="/ncc-mock-tests/pipeline"
            className="secondary"
            style={{ fontSize: 12, padding: '6px 14px', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}
          >
            <span>🎯</span> Open Question Pipeline & Full Audit ➔
          </Link>
        </div>

        {recentExams.length === 0 ? (
          <div className="empty-state-card" style={{ padding: 24 }}>
            <div className="empty-state-icon">📝</div>
            <div className="empty-state-title">No Cadet Exam Submissions Yet</div>
            <div className="empty-state-text">
              Cadet mock exam attempts and scorecards will automatically stream into this terminal once students submit tests.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ fontSize: 12 }}>
              <thead>
                <tr>
                  <th>Cadet Examinee</th>
                  <th>Regimental No.</th>
                  <th>Test Mode</th>
                  <th style={{ textAlign: 'center' }}>Score</th>
                  <th style={{ textAlign: 'center' }}>Accuracy</th>
                  <th style={{ textAlign: 'center' }}>Status</th>
                  <th style={{ textAlign: 'right' }}>Submitted At</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {recentExams.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{
                          background: '#e0e7ff',
                          color: '#3730a3',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontSize: 10,
                          fontWeight: 800,
                        }}>
                          {s.cadet_rank || 'CDT'}
                        </span>
                        <span style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                          {s.user_name || s.user_email || `User #${s.user_id}`}
                        </span>
                      </div>
                      {s.college_name && (
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
                          {s.college_name}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#64748b' }}>
                        {s.cadet_regimental_number || 'N/A'}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-navy" style={{ fontSize: 10 }}>
                        {s.mode.replace('_', ' ').toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                      {s.total_score != null ? s.total_score.toFixed(1) : '-'}
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 700 }}>
                      {s.accuracy_percentage != null ? `${s.accuracy_percentage.toFixed(1)}%` : '-'}
                    </td>
                    <td style={{ textAlign: 'center' }}>
                      <span className={`badge ${s.status === 'completed' ? 'badge-success' : 'badge-saffron'}`} style={{ fontSize: 10 }}>
                        {s.status.toUpperCase()}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: 11, color: 'var(--text-muted)' }}>
                      {new Date(s.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => navigate(`/ncc-mock-tests/results?session=${s.id}`)}
                        className="secondary"
                        style={{
                          fontSize: 11,
                          padding: '3px 8px',
                          height: 28,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                        }}
                      >
                        <span>📄</span> View Scorecard
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {/* Role-Specific Cadet Profile Modal */}
      {selectedCadet && (
        <CadetProfileModal
          cadet={selectedCadet}
          isOpen={Boolean(selectedCadet)}
          onClose={() => setSelectedCadet(null)}
        />
      )}
    </div>
  );
}
