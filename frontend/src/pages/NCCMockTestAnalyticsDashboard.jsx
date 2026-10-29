import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner, StatCard, Panel } from '../components/Form';
import { RefreshingBuffer } from '../components/RefreshingBuffer';
import { NccCrest } from '../components/NccLogo';

export default function NCCMockTestAnalyticsDashboard() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const isOfficer = user && ['admin', 'mentor', 'co', 'co_admin'].includes(user.role);
  const isAdmin = user && ['admin', 'co', 'co_admin'].includes(user.role);

  // Active Tab: 'cadets' | 'sessions' | 'topics' | 'modes'
  const initialTab = searchParams.get('tab') || 'cadets';
  const [activeTab, setActiveTab] = useState(initialTab);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [overview, setOverview] = useState(null);
  const [itemStats, setItemStats] = useState([]);

  // Filter & Search states for Tab 1 (Cadets Leaderboard)
  const [cadetSearch, setCadetSearch] = useState('');
  const [cadetTierFilter, setCadetTierFilter] = useState('all'); // 'all', 'distinction', 'pass', 'remedial'
  const [cadetSortBy, setCadetSortBy] = useState('accuracy'); // 'accuracy', 'exams', 'score'

  // Filter & Search states for Tab 2 (Test Sessions)
  const [sessionSearch, setSessionSearch] = useState(searchParams.get('cadet') || '');
  const [sessionModeFilter, setSessionModeFilter] = useState('all');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('all');
  const [sessionScoreFilter, setSessionScoreFilter] = useState('all');

  // Filter states for Tab 3 (Topic Mastery)
  const [topicSearch, setTopicSearch] = useState('');
  const [topicStatusFilter, setTopicStatusFilter] = useState('all');

  // Modal States
  const [selectedCadetId, setSelectedCadetId] = useState(null);
  const [cadetDiagnostic, setCadetDiagnostic] = useState(null);
  const [loadingCadetDiagnostic, setLoadingCadetDiagnostic] = useState(false);

  const [inspectSessionId, setInspectSessionId] = useState(null);
  const [inspectResults, setInspectResults] = useState(null);
  const [loadingInspectResults, setLoadingInspectResults] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  useEffect(() => {
    const cadetParam = searchParams.get('cadet');
    if (cadetParam) {
      setSessionSearch(cadetParam);
      setActiveTab('sessions');
    }
  }, [searchParams]);

  async function loadDashboardData() {
    setLoading(true);
    setError('');
    try {
      const [overviewData, itemData] = await Promise.all([
        api.getOfficerExamOverview(),
        api.getNCCItemAnalysis().catch(() => []),
      ]);
      setOverview(overviewData);
      setItemStats(itemData || []);
    } catch (err) {
      setError(err.message || 'Failed to load examination analytics data');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  function handleTabChange(tab) {
    setActiveTab(tab);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('tab', tab);
    setSearchParams(newParams, { replace: true });
  }

  // Open Cadet Deep-Dive Diagnostics Modal
  async function openCadetDiagnostics(cadetId) {
    setSelectedCadetId(cadetId);
    setLoadingCadetDiagnostic(true);
    setCadetDiagnostic(null);
    try {
      const data = await api.getCadetAnalyticsById(cadetId);
      setCadetDiagnostic(data);
    } catch (err) {
      console.error('Failed to load cadet diagnostics:', err);
      setError(err.message || 'Could not fetch detailed cadet diagnostic profile');
    } finally {
      setLoadingCadetDiagnostic(false);
    }
  }

  // Open Scorecard Inspection Modal
  async function openScorecardModal(sessionId) {
    setInspectSessionId(sessionId);
    setLoadingInspectResults(true);
    setInspectResults(null);
    try {
      const data = await api.getNCCSessionResults(sessionId);
      setInspectResults(data);
    } catch (err) {
      console.error('Failed to inspect test scorecard:', err);
      setError(err.message || 'Could not load examination session scorecard');
    } finally {
      setLoadingInspectResults(false);
    }
  }

  // Export Results as CSV
  function exportCSV() {
    if (!overview || !overview.recent_sessions || overview.recent_sessions.length === 0) {
      alert('No examination records available to export.');
      return;
    }

    const headers = [
      'Session ID',
      'Cadet Name',
      'Regimental Number',
      'Rank',
      'College / Institution',
      'Exam Title',
      'Exam Mode',
      'Status',
      'Score',
      'Accuracy (%)',
      'Correct',
      'Wrong',
      'Unanswered',
      'Time Spent (sec)',
      'Date & Time',
    ];

    const rows = overview.recent_sessions.map((s) => [
      s.id,
      `"${s.user_name || ''}"`,
      `"${s.cadet_regimental_number || ''}"`,
      s.cadet_rank || 'CDT',
      `"${s.college_name || ''}"`,
      `"${(s.title || '').replace(/"/g, '""')}"`,
      s.mode,
      s.status,
      s.total_score != null ? s.total_score : '',
      s.accuracy_percentage != null ? `${s.accuracy_percentage}%` : '',
      s.total_correct || 0,
      s.total_wrong || 0,
      s.total_unanswered || 0,
      s.time_spent_seconds || 0,
      s.created_at ? new Date(s.created_at).toLocaleString() : '',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `NCC_Cadet_Mock_Exam_Results_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // Filtered Cadets
  const filteredCadets = useMemo(() => {
    if (!overview || !overview.cadet_rankings) return [];
    return overview.cadet_rankings.filter((c) => {
      const matchSearch =
        !cadetSearch ||
        c.full_name.toLowerCase().includes(cadetSearch.toLowerCase()) ||
        c.enrollment_number.toLowerCase().includes(cadetSearch.toLowerCase()) ||
        c.college_name.toLowerCase().includes(cadetSearch.toLowerCase());

      const matchTier =
        cadetTierFilter === 'all' ||
        (cadetTierFilter === 'distinction' && c.avg_accuracy >= 75.0) ||
        (cadetTierFilter === 'pass' && c.avg_accuracy >= 50.0 && c.avg_accuracy < 75.0) ||
        (cadetTierFilter === 'remedial' && c.avg_accuracy < 50.0);

      return matchSearch && matchTier;
    }).sort((a, b) => {
      if (cadetSortBy === 'accuracy') return b.avg_accuracy - a.avg_accuracy;
      if (cadetSortBy === 'exams') return b.exams_taken - a.exams_taken;
      if (cadetSortBy === 'score') return b.max_score - a.max_score;
      return 0;
    });
  }, [overview, cadetSearch, cadetTierFilter, cadetSortBy]);

  // Filtered Sessions
  const filteredSessions = useMemo(() => {
    if (!overview || !overview.recent_sessions) return [];
    return overview.recent_sessions.filter((s) => {
      const term = sessionSearch.toLowerCase();
      const matchSearch =
        !sessionSearch ||
        (s.user_name && s.user_name.toLowerCase().includes(term)) ||
        (s.cadet_regimental_number && s.cadet_regimental_number.toLowerCase().includes(term)) ||
        (s.title && s.title.toLowerCase().includes(term)) ||
        (s.college_name && s.college_name.toLowerCase().includes(term));

      const matchMode = sessionModeFilter === 'all' || s.mode === sessionModeFilter;
      const matchStatus = sessionStatusFilter === 'all' || s.status === sessionStatusFilter;

      const matchScore =
        sessionScoreFilter === 'all' ||
        (sessionScoreFilter === 'distinction' && (s.accuracy_percentage || 0) >= 75.0) ||
        (sessionScoreFilter === 'pass' && (s.accuracy_percentage || 0) >= 50.0 && (s.accuracy_percentage || 0) < 75.0) ||
        (sessionScoreFilter === 'fail' && (s.accuracy_percentage || 0) < 50.0);

      return matchSearch && matchMode && matchStatus && matchScore;
    });
  }, [overview, sessionSearch, sessionModeFilter, sessionStatusFilter, sessionScoreFilter]);

  // Filtered Topics
  const filteredTopics = useMemo(() => {
    if (!overview || !overview.topic_analytics) return [];
    return overview.topic_analytics.filter((t) => {
      const matchSearch =
        !topicSearch ||
        t.topic_name.toLowerCase().includes(topicSearch.toLowerCase()) ||
        t.topic_code.toLowerCase().includes(topicSearch.toLowerCase());

      const matchStatus = topicStatusFilter === 'all' || t.status === topicStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [overview, topicSearch, topicStatusFilter]);

  if (loading && !overview) {
    return (
      <RefreshingBuffer
        label="Auditing Battalion Examination Analytics..."
        subtext="Aggregating student scorecards, syllabus psychometrics, and pass-rate diagnostics"
      />
    );
  }

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 60 }}>
      {/* Executive Command Header */}
      <div style={{
        background: 'linear-gradient(135deg, #091a32 0%, #173255 100%)',
        borderRadius: 12,
        padding: 'clamp(20px, 3.5vw, 32px)',
        color: '#fff',
        marginBottom: 24,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
            <NccCrest size={56} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--ncc-gold, #f59e0b)', textTransform: 'uppercase' }}>
                DIRECTORATE GENERAL NCC • EVALUATION COMMAND & EXAM INTELLIGENCE
              </div>
              <h1 style={{ fontSize: 'clamp(22px, 3.5vw, 28px)', fontWeight: 900, margin: '4px 0 6px 0', letterSpacing: '-0.01em' }}>
                Student Mock Test Results & Performance Analytics
              </h1>
              <p style={{ margin: 0, color: '#cbd5e1', fontSize: 13, maxWidth: 760, lineHeight: 1.5 }}>
                Real-time command center for ANOs and Officers to monitor cadet pass rates, examine syllabus mastery heatmaps, audit individual student scorecards, and assign targeted remedial training.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <button
              type="button"
              className={`secondary ${refreshing ? 'spinning' : ''}`}
              onClick={() => { setRefreshing(true); loadDashboardData(); }}
              disabled={refreshing}
              style={{ height: 38, padding: '0 14px', color: '#fff', borderColor: 'rgba(255,255,255,0.25)', background: 'rgba(255,255,255,0.08)' }}
            >
              <span>🔄</span>
              <span>{refreshing ? 'Refreshing…' : 'Sync Records'}</span>
            </button>

            <button
              type="button"
              onClick={exportCSV}
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: '#166534',
                color: '#fff',
                border: 'none',
                fontWeight: 700,
                fontSize: 12,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                boxShadow: '0 2px 6px rgba(0,0,0,0.2)',
              }}
            >
              <span>📥</span>
              <span>Export Results (CSV)</span>
            </button>

            <Link
              to="/ncc-mock-tests"
              style={{
                height: 38,
                padding: '0 14px',
                borderRadius: 'var(--radius-sm, 6px)',
                background: 'var(--ncc-gold, #f59e0b)',
                color: '#091a32',
                fontWeight: 800,
                fontSize: 12,
                display: 'inline-flex',
                alignItems: 'center',
                textDecoration: 'none',
                gap: 6,
              }}
            >
              <span>🎯</span>
              <span>Exam Arena</span>
            </Link>

            {isAdmin && (
              <Link
                to="/ncc-mock-tests/pipeline"
                style={{
                  height: 38,
                  padding: '0 14px',
                  borderRadius: 'var(--radius-sm, 6px)',
                  background: 'rgba(255,255,255,0.12)',
                  color: '#fff',
                  border: '1px solid rgba(255,255,255,0.2)',
                  fontWeight: 700,
                  fontSize: 12,
                  display: 'inline-flex',
                  alignItems: 'center',
                  textDecoration: 'none',
                  gap: 6,
                }}
              >
                <span>⚙️</span>
                <span>Exam Pipeline</span>
              </Link>
            )}
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Top 5 Executive Metric Cards */}
      <div className="stats-grid" style={{ marginBottom: 24 }}>
        <StatCard
          label="TOTAL EXAMS ATTEMPTED"
          value={overview?.total_sessions || 0}
          trend={`${overview?.completed_count || 0} Completed Submissions`}
          trendPositive={true}
          icon="📋"
          sub="Battalion Exam Volume"
          tone="navy"
        />

        <StatCard
          label="BATTALION PASS RATE"
          value={`${overview?.pass_rate_percentage || 0}%`}
          trend={`${overview?.distinction_count || 0} Distinction • ${overview?.pass_count || 0} Pass`}
          trendPositive={(overview?.pass_rate_percentage || 0) >= 50}
          icon="🎖️"
          sub=">= 50% Standard Threshold"
          tone={(overview?.pass_rate_percentage || 0) >= 50 ? 'success' : 'saffron'}
        />

        <StatCard
          label="AVERAGE ACCURACY"
          value={`${overview?.average_accuracy || 0}%`}
          trend={`Avg Score: ${overview?.average_score || 0} pts`}
          trendPositive={(overview?.average_accuracy || 0) >= 60}
          icon="🎯"
          sub="Cohort Accuracy Metric"
          tone="olive"
        />

        <StatCard
          label="CRITICAL REMEDIAL CADETS"
          value={overview?.fail_count || 0}
          trend="Scored < 50% on Mock Test"
          trendPositive={false}
          icon="⚠️"
          sub="Requires Field Remediation"
          tone="saffron"
        />

        <StatCard
          label="ACTIVE SYLLABUS TOPICS"
          value={overview?.topic_analytics?.length || 19}
          trend={`${overview?.topic_analytics?.filter((t) => t.status === 'strong').length || 0} Topics Mastered`}
          trendPositive={true}
          icon="📖"
          sub="Certificate Blueprint"
          tone="navy"
        />
      </div>

      {/* Main Tab Navigation Bar */}
      <div style={{
        display: 'flex',
        gap: 8,
        borderBottom: '2px solid var(--border, #cbd5e1)',
        marginBottom: 24,
        overflowX: 'auto',
        paddingBottom: 2,
      }}>
        {[
          { key: 'cadets', label: '👥 Student Roster & Leaderboard', count: filteredCadets.length },
          { key: 'sessions', label: '📋 Individual Test Scorecards', count: filteredSessions.length },
          { key: 'topics', label: '🎯 Syllabus Topic Mastery Matrix', count: filteredTopics.length },
          { key: 'modes', label: '📊 Exam Modes & Psychometrics', count: overview?.mode_breakdown?.length || 0 },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => handleTabChange(tab.key)}
            style={{
              padding: '10px 18px',
              border: 'none',
              background: 'none',
              borderBottom: activeTab === tab.key ? '3px solid var(--navy-900, #091a32)' : '3px solid transparent',
              color: activeTab === tab.key ? 'var(--navy-900, #091a32)' : 'var(--text-muted, #64748b)',
              fontWeight: activeTab === tab.key ? 800 : 600,
              fontSize: 13,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            <span>{tab.label}</span>
            <span style={{
              background: activeTab === tab.key ? 'var(--navy-900, #091a32)' : '#e2e8f0',
              color: activeTab === tab.key ? '#fff' : '#475569',
              padding: '1px 8px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 700,
            }}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: CADET ROSTER & PERFORMANCE LEADERBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'cadets' && (
        <div>
          <Panel
            title="Cadet Examination Roster & Merit Standing"
            tag="OFFICER REVIEW"
            action={
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {filteredCadets.length} cadets with test records
              </span>
            }
          >
            {/* Search and Filters Bar */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20,
              alignItems: 'center',
              background: 'var(--bg-main, #f8fafc)',
              padding: 14,
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border, #e2e8f0)',
            }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <input
                  type="text"
                  placeholder="🔍 Search cadet by name, regimental number, or college…"
                  value={cadetSearch}
                  onChange={(e) => setCadetSearch(e.target.value)}
                  style={{ width: '100%', height: 38 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>TIER:</span>
                <select
                  value={cadetTierFilter}
                  onChange={(e) => setCadetTierFilter(e.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="all">All Performance Tiers</option>
                  <option value="distinction">⭐ Distinction (&gt;= 75%)</option>
                  <option value="pass">✓ Passed (&gt;= 50%)</option>
                  <option value="remedial">⚠️ Needs Remedial (&lt; 50%)</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>SORT:</span>
                <select
                  value={cadetSortBy}
                  onChange={(e) => setCadetSortBy(e.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="accuracy">Average Accuracy %</option>
                  <option value="exams">Most Tests Taken</option>
                  <option value="score">Highest Score</option>
                </select>
              </div>

              {(cadetSearch || cadetTierFilter !== 'all') && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => { setCadetSearch(''); setCadetTierFilter('all'); }}
                  style={{ height: 38, padding: '0 12px' }}
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Cadets Leaderboard Table */}
            {filteredCadets.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No cadets match your current filter criteria.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid var(--border, #cbd5e1)' }}>
                      <th style={{ padding: '12px 14px', width: 60, textAlign: 'center' }}>RANK</th>
                      <th style={{ padding: '12px 14px' }}>CADET IDENTITY</th>
                      <th style={{ padding: '12px 14px' }}>INSTITUTION / COLLEGE</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>TESTS TAKEN</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>PASS RATE</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>AVG ACCURACY</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>TOP SCORE</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCadets.map((c, idx) => {
                      const isDistinction = c.avg_accuracy >= 75.0;
                      const isPass = c.avg_accuracy >= 50.0 && c.avg_accuracy < 75.0;
                      const isFail = c.avg_accuracy < 50.0;

                      return (
                        <tr key={c.cadet_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800 }}>
                            {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--navy-900, #091a32)' }}>
                              {c.full_name}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)', display: 'flex', gap: 6, alignItems: 'center', marginTop: 2 }}>
                              <span className="badge badge-navy" style={{ padding: '1px 5px', fontSize: 10 }}>{c.rank}</span>
                              <span>•</span>
                              <span>{c.enrollment_number}</span>
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px', color: '#475569', fontSize: 12 }}>
                            {c.college_name}
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700 }}>
                            <span style={{ background: '#f1f5f9', padding: '4px 10px', borderRadius: 6 }}>
                              {c.exams_taken}
                            </span>
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              fontWeight: 700,
                              color: c.pass_rate >= 75 ? '#166534' : c.pass_rate >= 50 ? '#0284c7' : '#dc2626',
                            }}>
                              {c.pass_rate}%
                            </span>
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                              <span style={{
                                fontWeight: 800,
                                fontSize: 14,
                                color: isDistinction ? '#166534' : isPass ? '#0284c7' : '#dc2626',
                              }}>
                                {c.avg_accuracy}%
                              </span>
                              <span style={{ fontSize: 11 }}>
                                {isDistinction ? '⭐' : isPass ? '✓' : '⚠️'}
                              </span>
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 700, color: '#334155' }}>
                            {c.max_score} pts
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 6 }}>
                              <button
                                type="button"
                                onClick={() => openCadetDiagnostics(c.cadet_id)}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  background: 'var(--navy-900, #091a32)',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                📊 Diagnostics
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSessionSearch(c.full_name);
                                  handleTabChange('sessions');
                                }}
                                style={{
                                  padding: '5px 10px',
                                  fontSize: 11,
                                  fontWeight: 600,
                                  borderRadius: 4,
                                  background: '#f1f5f9',
                                  color: '#334155',
                                  border: '1px solid #cbd5e1',
                                  cursor: 'pointer',
                                }}
                              >
                                📜 Scorecards
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: DETAILED STUDENT TEST ATTEMPTS & SCORECARDS */}
      {/* ========================================================================= */}
      {activeTab === 'sessions' && (
        <div>
          <Panel
            title="Individual Cadet Test Submissions & Scorecards"
            tag="AUDIT TRAIL"
            action={
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Showing {filteredSessions.length} examination scorecards
              </span>
            }
          >
            {/* Filters */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20,
              alignItems: 'center',
              background: 'var(--bg-main, #f8fafc)',
              padding: 14,
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border, #e2e8f0)',
            }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <input
                  type="text"
                  placeholder="🔍 Search by cadet name, enrollment, test title, or college…"
                  value={sessionSearch}
                  onChange={(e) => setSessionSearch(e.target.value)}
                  style={{ width: '100%', height: 38 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>MODE:</span>
                <select
                  value={sessionModeFilter}
                  onChange={(e) => setSessionModeFilter(e.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="all">All Modes</option>
                  <option value="full_mock">Full Mock Exam</option>
                  <option value="certificate_wise">Certificate Specific</option>
                  <option value="topic_wise">Topic-Wise Drill</option>
                  <option value="quick_practice">Quick Practice Sprint</option>
                  <option value="weak_areas">Spaced Weak Areas</option>
                </select>
              </div>

              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>RESULT:</span>
                <select
                  value={sessionScoreFilter}
                  onChange={(e) => setSessionScoreFilter(e.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="all">All Outcomes</option>
                  <option value="distinction">⭐ Distinction (&gt;= 75%)</option>
                  <option value="pass">✓ Passed (&gt;= 50%)</option>
                  <option value="fail">⚠️ Failed / Needs Training (&lt; 50%)</option>
                </select>
              </div>

              {(sessionSearch || sessionModeFilter !== 'all' || sessionScoreFilter !== 'all') && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => { setSessionSearch(''); setSessionModeFilter('all'); setSessionScoreFilter('all'); }}
                  style={{ height: 38, padding: '0 12px' }}
                >
                  Clear Filters
                </button>
              )}
            </div>

            {/* Sessions Table */}
            {filteredSessions.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No examination sessions found matching your filters.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f1f5f9', borderBottom: '2px solid var(--border, #cbd5e1)' }}>
                      <th style={{ padding: '12px 14px' }}>DATE / TIME</th>
                      <th style={{ padding: '12px 14px' }}>STUDENT CADET</th>
                      <th style={{ padding: '12px 14px' }}>EXAM TITLE & MODE</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>SCORE</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>ACCURACY</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>BREAKDOWN</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center' }}>VERDICT</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right' }}>ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredSessions.map((s) => {
                      const isCompleted = s.status === 'completed';
                      const acc = s.accuracy_percentage != null ? s.accuracy_percentage : 0;
                      const isDistinction = acc >= 75.0;
                      const isPass = acc >= 50.0 && acc < 75.0;

                      return (
                        <tr key={s.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '12px 14px', color: '#64748b', fontSize: 12, whiteSpace: 'nowrap' }}>
                            {s.created_at ? new Date(s.created_at).toLocaleDateString() : 'N/A'}
                            <div style={{ fontSize: 10, color: '#94a3b8' }}>
                              {s.created_at ? new Date(s.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                            </div>
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 800, color: 'var(--navy-900, #091a32)' }}>
                              {s.user_name || 'Cadet'}
                            </div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {s.cadet_rank} • {s.cadet_regimental_number || s.user_email}
                            </div>
                            {s.college_name && (
                              <div style={{ fontSize: 10, color: '#64748b', marginTop: 1 }}>
                                {s.college_name}
                              </div>
                            )}
                          </td>

                          <td style={{ padding: '12px 14px' }}>
                            <div style={{ fontWeight: 600, color: '#1e293b' }}>
                              {s.title}
                            </div>
                            <span className="badge badge-navy" style={{ padding: '1px 6px', fontSize: 10, textTransform: 'uppercase' }}>
                              {s.mode.replace('_', ' ')}
                            </span>
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800 }}>
                            {s.total_score != null ? `${s.total_score} pts` : '—'}
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {isCompleted ? (
                              <span style={{
                                fontWeight: 800,
                                fontSize: 13,
                                color: isDistinction ? '#166534' : isPass ? '#0284c7' : '#dc2626',
                              }}>
                                {acc}%
                              </span>
                            ) : (
                              <span style={{ fontSize: 11, color: '#eab308' }}>In Progress</span>
                            )}
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center', fontSize: 11 }}>
                            <span style={{ color: '#166534', fontWeight: 700 }}>✓ {s.total_correct || 0}</span>
                            <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>✗ {s.total_wrong || 0}</span>
                            <span style={{ margin: '0 4px', color: '#cbd5e1' }}>|</span>
                            <span style={{ color: '#64748b' }}>⚪ {s.total_unanswered || 0}</span>
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {isCompleted ? (
                              isDistinction ? (
                                <span className="badge badge-success" style={{ fontSize: 11, padding: '2px 8px' }}>DISTINCTION</span>
                              ) : isPass ? (
                                <span className="badge badge-olive" style={{ fontSize: 11, padding: '2px 8px' }}>PASSED</span>
                              ) : (
                                <span className="badge badge-saffron" style={{ fontSize: 11, padding: '2px 8px' }}>REMEDIAL</span>
                              )
                            ) : (
                              <span className="badge" style={{ fontSize: 11, padding: '2px 8px' }}>ACTIVE</span>
                            )}
                          </td>

                          <td style={{ padding: '12px 14px', textAlign: 'right', whiteSpace: 'nowrap' }}>
                            {isCompleted ? (
                              <button
                                type="button"
                                onClick={() => openScorecardModal(s.id)}
                                style={{
                                  padding: '5px 12px',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  borderRadius: 4,
                                  background: 'var(--navy-900, #091a32)',
                                  color: '#fff',
                                  border: 'none',
                                  cursor: 'pointer',
                                }}
                              >
                                📋 Scorecard
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>Session Live</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SYLLABUS TOPIC MASTERY & DIAGNOSTIC MATRIX */}
      {/* ========================================================================= */}
      {activeTab === 'topics' && (
        <div>
          <Panel
            title="NCC 19-Topic Syllabus Mastery & Question Diagnostic"
            tag="CURRICULUM HEALTH"
            action={
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Identifies weak modules requiring ANO classroom instruction
              </span>
            }
          >
            {/* Filters */}
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 12,
              marginBottom: 20,
              alignItems: 'center',
              background: 'var(--bg-main, #f8fafc)',
              padding: 14,
              borderRadius: 'var(--radius-sm, 6px)',
              border: '1px solid var(--border, #e2e8f0)',
            }}>
              <div style={{ flex: 1, minWidth: 220 }}>
                <input
                  type="text"
                  placeholder="🔍 Search syllabus topic (e.g. Weapon Training, Drill, Map Reading)…"
                  value={topicSearch}
                  onChange={(e) => setTopicSearch(e.target.value)}
                  style={{ width: '100%', height: 38 }}
                />
              </div>

              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-muted)' }}>MASTERY:</span>
                <select
                  value={topicStatusFilter}
                  onChange={(e) => setTopicStatusFilter(e.target.value)}
                  style={{ height: 38 }}
                >
                  <option value="all">All Mastery Levels</option>
                  <option value="strong">🟢 Mastered (&gt;= 75%)</option>
                  <option value="moderate">🟡 Satisfactory (50 - 74%)</option>
                  <option value="weak">🔴 Weak / Critical (&lt; 50%)</option>
                </select>
              </div>

              {(topicSearch || topicStatusFilter !== 'all') && (
                <button
                  type="button"
                  className="secondary"
                  onClick={() => { setTopicSearch(''); setTopicStatusFilter('all'); }}
                  style={{ height: 38, padding: '0 12px' }}
                >
                  Reset
                </button>
              )}
            </div>

            {/* Topic Diagnostics Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
              {filteredTopics.map((t) => {
                const isStrong = t.status === 'strong';
                const isModerate = t.status === 'moderate';
                const color = isStrong ? '#166534' : isModerate ? '#0284c7' : '#dc2626';
                const bg = isStrong ? '#f0fdf4' : isModerate ? '#f0f9ff' : '#fef2f2';

                return (
                  <div
                    key={t.topic_code}
                    style={{
                      background: bg,
                      border: `1px solid ${isStrong ? '#bbf7d0' : isModerate ? '#bae6fd' : '#fecaca'}`,
                      borderRadius: 8,
                      padding: 16,
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                          CODE: {t.topic_code}
                        </div>
                        <span style={{
                          fontSize: 10,
                          fontWeight: 800,
                          padding: '2px 8px',
                          borderRadius: 4,
                          background: color,
                          color: '#fff',
                          textTransform: 'uppercase',
                        }}>
                          {isStrong ? 'MASTERED' : isModerate ? 'SATISFACTORY' : 'CRITICAL ATTENTION'}
                        </span>
                      </div>

                      <h4 style={{ margin: '0 0 10px 0', fontSize: 15, fontWeight: 800, color: '#091a32' }}>
                        {t.topic_name}
                      </h4>

                      <div style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, fontWeight: 700 }}>
                          <span>Cohort Accuracy</span>
                          <span style={{ color }}>{t.accuracy_percentage}%</span>
                        </div>
                        <div style={{ height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.min(100, t.accuracy_percentage)}%`, height: '100%', background: color, transition: 'width 0.4s ease' }} />
                        </div>
                      </div>
                    </div>

                    <div style={{
                      paddingTop: 10,
                      borderTop: '1px solid rgba(0,0,0,0.06)',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontSize: 11,
                      color: '#475569',
                    }}>
                      <span>Attempts: <strong>{t.total_attempts}</strong></span>
                      <span>Correct: <strong style={{ color: '#166534' }}>{t.total_correct}</strong></span>
                      <span>Action: <strong>{!isStrong ? 'Lecture Needed' : 'Good Standard'}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXAM MODES & PSYCHOMETRIC BLUEPRINT */}
      {/* ========================================================================= */}
      {activeTab === 'modes' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24 }}>
          {/* Mode Performance Analysis */}
          <Panel title="Exam Mode Performance Breakdown" tag="BLUEPRINT STATS">
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Comparative breakdown of cadet performance across mock test modalities:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {(overview?.mode_breakdown || []).map((m) => (
                <div
                  key={m.mode}
                  style={{
                    background: 'var(--bg-main, #f8fafc)',
                    border: '1px solid var(--border, #e2e8f0)',
                    padding: 16,
                    borderRadius: 8,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontWeight: 800, fontSize: 14, color: 'var(--navy-900)' }}>
                      {m.mode.replace('_', ' ').toUpperCase()}
                    </div>
                    <span className="badge badge-navy">
                      {m.count} Attempt{m.count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
                    <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#166534' }}>{m.avg_accuracy}%</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>AVG ACCURACY</div>
                    </div>
                    <div style={{ background: '#fff', padding: 10, borderRadius: 6, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--navy-900)' }}>{m.avg_score}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>AVG SCORE (PTS)</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          {/* Question Psychometric Analysis */}
          <Panel title="Psychometric Item Diagnostics" tag="QUESTION QUALITY">
            <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
              Item difficulty indices (P-value) and discrimination ratings calculated from student test answers:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 420, overflowY: 'auto' }}>
              {itemStats.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>
                  Item psychometrics will calibrate automatically as cadets complete test sessions.
                </div>
              ) : (
                itemStats.slice(0, 10).map((item) => (
                  <div
                    key={item.question_id}
                    style={{
                      padding: 12,
                      background: 'var(--bg-main, #f8fafc)',
                      border: '1px solid #e2e8f0',
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-muted)' }}>
                        Q#{item.question_id} • {item.topic_code}
                      </span>
                      <span className={`badge ${item.flag_status === 'ok' ? 'badge-success' : 'badge-saffron'}`}>
                        {item.flag_status.toUpperCase()}
                      </span>
                    </div>

                    <p style={{ margin: '0 0 6px 0', fontSize: 12, fontWeight: 600, color: '#1e293b' }}>
                      {item.statement}
                    </p>

                    <div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#64748b' }}>
                      <span>Attempts: <strong>{item.total_attempts}</strong></span>
                      <span>Difficulty (P): <strong>{item.difficulty_index_p}</strong></span>
                      <span>Discrimination (D): <strong>{item.discrimination_index_d}</strong></span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Panel>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: CADET DEEP-DIVE DIAGNOSTICS MODAL */}
      {/* ========================================================================= */}
      {selectedCadetId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 26, 50, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 800,
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 20 }}>
              <div>
                <span className="badge badge-navy" style={{ marginBottom: 4 }}>INDIVIDUAL CADET DIAGNOSTIC</span>
                <h3 style={{ margin: 0, fontSize: 18, color: 'var(--navy-900)' }}>
                  {cadetDiagnostic?.cadet?.full_name || 'Cadet Performance Profile'}
                </h3>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {cadetDiagnostic?.cadet?.rank} • {cadetDiagnostic?.cadet?.enrollment_number} • {cadetDiagnostic?.cadet?.college_name}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCadetId(null)}
                style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}
              >
                ✕ Close
              </button>
            </div>

            {loadingCadetDiagnostic ? (
              <div style={{ padding: 40, textAlign: 'center' }}>Loading cadet diagnostics…</div>
            ) : cadetDiagnostic ? (
              <div>
                {/* 3 Metric Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20 }}>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: 'var(--navy-900)' }}>{cadetDiagnostic.tests_completed}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>TESTS TAKEN</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: cadetDiagnostic.overall_accuracy >= 50 ? '#166534' : '#dc2626' }}>
                      {cadetDiagnostic.overall_accuracy}%
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>OVERALL ACCURACY</div>
                  </div>
                  <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: '#0284c7' }}>{cadetDiagnostic.total_questions_answered}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>MCQs ANSWERED</div>
                  </div>
                </div>

                {/* Strong vs Weak Areas */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, marginBottom: 20 }}>
                  <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#166534', marginBottom: 8 }}>
                      🟢 TOP PROFICIENCY MODULES (&gt;= 75%)
                    </div>
                    {cadetDiagnostic.strong_topics && cadetDiagnostic.strong_topics.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {cadetDiagnostic.strong_topics.map((t) => (
                          <div key={t.topic_code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ fontWeight: 600 }}>{t.topic_name}</span>
                            <span style={{ fontWeight: 800, color: '#166534' }}>{t.accuracy}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#64748b' }}>No topics have reached 75% accuracy threshold yet.</div>
                    )}
                  </div>

                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#dc2626', marginBottom: 8 }}>
                      🔴 CRITICAL WEAK MODULES (&lt; 50%)
                    </div>
                    {cadetDiagnostic.weak_topics && cadetDiagnostic.weak_topics.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {cadetDiagnostic.weak_topics.map((t) => (
                          <div key={t.topic_code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                            <span style={{ fontWeight: 600 }}>{t.topic_name}</span>
                            <span style={{ fontWeight: 800, color: '#dc2626' }}>{t.accuracy}%</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: '#64748b' }}>Cadet has maintained at least 50% across tested topics.</div>
                    )}
                  </div>
                </div>

                {/* All Topics Breakdown */}
                <h4 style={{ margin: '16px 0 10px 0', fontSize: 14, color: 'var(--navy-900)' }}>Topic-Wise Accuracy Breakdown</h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 220, overflowY: 'auto' }}>
                  {(cadetDiagnostic.radar_data || []).map((r) => (
                    <div key={r.topic_code} style={{ background: '#f8fafc', padding: 8, borderRadius: 6, border: '1px solid #e2e8f0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4, fontWeight: 600 }}>
                        <span>{r.topic_name}</span>
                        <span style={{ color: r.accuracy >= 75 ? '#166534' : r.accuracy >= 50 ? '#0284c7' : '#dc2626' }}>
                          {r.accuracy}% ({r.attempts} Qs)
                        </span>
                      </div>
                      <div style={{ height: 6, background: '#e2e8f0', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{
                          width: `${Math.min(100, r.accuracy)}%`,
                          height: '100%',
                          background: r.accuracy >= 75 ? '#166534' : r.accuracy >= 50 ? '#0284c7' : '#dc2626',
                        }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: DETAILED TEST SCORECARD INSPECTOR */}
      {/* ========================================================================= */}
      {inspectSessionId && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(9, 26, 50, 0.65)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: '#fff',
            borderRadius: 12,
            width: '100%',
            maxWidth: 860,
            maxHeight: '92vh',
            overflowY: 'auto',
            padding: 24,
            boxShadow: '0 20px 40px rgba(0,0,0,0.25)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: 14, marginBottom: 20 }}>
              <div>
                <span className="badge badge-navy">EXAMINATION SCORECARD AUDIT</span>
                <h3 style={{ margin: '4px 0 0 0', fontSize: 18, color: 'var(--navy-900)' }}>
                  {inspectResults?.title || 'Examination Session Review'}
                </h3>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => navigate(`/ncc-mock-tests/results?session=${inspectSessionId}`)}
                  style={{
                    background: 'var(--navy-900, #091a32)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    padding: '6px 12px',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  Open Full Page ↗
                </button>
                <button
                  type="button"
                  onClick={() => setInspectSessionId(null)}
                  style={{ background: '#f1f5f9', border: 'none', borderRadius: 6, padding: '6px 12px', cursor: 'pointer', fontWeight: 700 }}
                >
                  ✕
                </button>
              </div>
            </div>

            {loadingInspectResults ? (
              <div style={{ padding: 40, textAlign: 'center' }}>Loading question-by-question scorecard…</div>
            ) : inspectResults ? (
              <div>
                {/* Score Summary Box */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 12,
                  marginBottom: 20,
                  background: 'var(--bg-main, #f8fafc)',
                  padding: 14,
                  borderRadius: 8,
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                }}>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: 'var(--navy-900)' }}>{inspectResults.total_score}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>SCORE OBTAINED</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: inspectResults.accuracy_percentage >= 50 ? '#166534' : '#dc2626' }}>
                      {inspectResults.accuracy_percentage}%
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>ACCURACY</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#166534' }}>{inspectResults.total_correct}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>CORRECT ANSWERS</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 20, fontWeight: 900, color: '#dc2626' }}>{inspectResults.total_wrong}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>WRONG (NEGATIVE)</div>
                  </div>
                </div>

                {/* Questions Review */}
                <h4 style={{ margin: '0 0 12px 0', fontSize: 14, color: 'var(--navy-900)' }}>
                  Question-by-Question Audit ({inspectResults.questions_review?.length || 0} Questions)
                </h4>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {(inspectResults.questions_review || []).map((q, idx) => {
                    const isCorrect = q.is_correct === true;
                    const isSkipped = q.selected_option == null;

                    return (
                      <div
                        key={idx}
                        style={{
                          padding: 14,
                          background: isCorrect ? '#f0fdf4' : isSkipped ? '#f8fafc' : '#fef2f2',
                          border: `1px solid ${isCorrect ? '#bbf7d0' : isSkipped ? '#e2e8f0' : '#fecaca'}`,
                          borderRadius: 8,
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: '#64748b' }}>
                            QUESTION {idx + 1} • TOPIC: {q.topic_name}
                          </span>
                          <span style={{
                            fontSize: 10,
                            fontWeight: 800,
                            padding: '1px 8px',
                            borderRadius: 4,
                            background: isCorrect ? '#166534' : isSkipped ? '#64748b' : '#dc2626',
                            color: '#fff',
                          }}>
                            {isCorrect ? 'CORRECT (+1)' : isSkipped ? 'UNANSWERED (0)' : 'INCORRECT (-0.25)'}
                          </span>
                        </div>

                        <p style={{ margin: '0 0 10px 0', fontSize: 13, fontWeight: 700, color: '#091a32' }}>
                          {q.statement}
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8, fontSize: 12, marginBottom: 8 }}>
                          {q.options.map((opt, oIdx) => {
                            const isSelected = q.selected_option === oIdx;
                            const isActualCorrect = q.actual_option_index === oIdx;

                            let optStyle = { padding: '6px 10px', borderRadius: 4, background: '#fff', border: '1px solid #cbd5e1' };
                            if (isActualCorrect) {
                              optStyle = { padding: '6px 10px', borderRadius: 4, background: '#dcfce7', border: '1px solid #86efac', fontWeight: 700, color: '#166534' };
                            } else if (isSelected && !isCorrect) {
                              optStyle = { padding: '6px 10px', borderRadius: 4, background: '#fee2e2', border: '1px solid #fca5a5', fontWeight: 700, color: '#991b1b' };
                            }

                            return (
                              <div key={oIdx} style={optStyle}>
                                <span style={{ marginRight: 6 }}>{String.fromCharCode(65 + oIdx)}.</span>
                                <span>{opt}</span>
                                {isActualCorrect && ' ✓ (Correct)'}
                                {isSelected && !isActualCorrect && ' ✗ (Chosen)'}
                              </div>
                            );
                          })}
                        </div>

                        <div style={{ fontSize: 11, color: '#334155', background: 'rgba(0,0,0,0.03)', padding: '6px 10px', borderRadius: 4 }}>
                          📖 <strong>Official Handbook Citation:</strong> {q.explanation}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}

