import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/Form';
import { RefreshingBuffer } from '../components/RefreshingBuffer';

/**
 * ==============================================================================
 * NCC MOCK TEST HUB: CERTIFICATE EXAM PORTAL
 * ==============================================================================
 * Primary gateway for NCC Cadets preparing for 'A', 'B', and 'C' Certificate Exams:
 * - Full Mock Exam: 50 Questions covering official NCC syllabus with negative marking.
 * - Topic-Wise Practice: Focus on specific areas (Map Reading, Weapon Training, Drill).
 * - Rapid Fire Quiz: Fast 15-question sprint for quick recall.
 * - Displays cadet's past pass rate and score analytics loaded directly from DBMS.
 * ==============================================================================
 */
export default function NCCMockTestHub() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [topics, setTopics] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [launchingMode, setLaunchingMode] = useState('');

  const [selectedCert, setSelectedCert] = useState('B');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [selectedWing, setSelectedWing] = useState('common');

  useEffect(() => {
    loadHubData();
  }, []);

  async function loadHubData() {
    setLoading(true);
    setError('');
    try {
      const [topicsData, analyticsData] = await Promise.all([
        api.getNCCTopics(),
        api.getNCCAnalytics(),
      ]);
      setTopics(topicsData || []);
      setAnalytics(analyticsData);
      if (topicsData && topicsData.length > 0) {
        setSelectedTopic(topicsData[0].code);
      }
    } catch (err) {
      setError(err.message || 'Failed to load NCC test portal');
    } finally {
      setLoading(false);
    }
  }

  async function handleStartTest(mode, customParams = {}) {
    setLaunchingMode(mode);
    setError('');
    try {
      const topicCode = customParams.topic_code
        || (mode === 'topic_wise' ? (selectedTopic || (topics[0] ? topics[0].code : null)) : null);

      const payload = {
        mode,
        certificate_level: customParams.certificate_level || selectedCert || 'B',
        wing: customParams.wing || selectedWing || 'common',
        topic_code: topicCode,
      };
      const session = await api.startNCCSession(payload);
      if (!session || !session.id) {
        throw new Error('Examination session failed to return a valid session ID');
      }
      navigate(`/ncc-mock-tests/arena?session=${session.id}`);
    } catch (err) {
      console.error('Start mock test error:', err);
      setError(err.message || 'Failed to initialize examination session');
    } finally {
      setLaunchingMode('');
    }
  }

  if (loading && topics.length === 0) {
    return (
      <RefreshingBuffer
        label="Connecting to NCC Certificate Exam Engine..."
        subtext="Loading syllabus modules, question bank weightages, and performance analytics"
      />
    );
  }

  return (
    <div style={{ maxWidth: 1200, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Banner with Tricolor Bar */}
      <div style={{
        background: 'linear-gradient(135deg, #091a32 0%, #1e3a5f 100%)',
        borderRadius: 12,
        padding: 'clamp(20px, 4vw, 36px)',
        color: '#fff',
        marginBottom: 28,
        boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
        border: '1px solid rgba(255,255,255,0.1)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 36 }}>🎖️</span>
          <div style={{ flex: 1, minWidth: 240 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: '0.1em', color: '#facc15', textTransform: 'uppercase' }}>
              DIRECTORATE GENERAL NCC • TRAINING & DOCTRINE
            </div>
            <h1 style={{ fontSize: 'clamp(20px, 3vw, 24px)', fontWeight: 900, margin: '4px 0 0 0' }}>
              NCC Certificate Examination & Mock Test Portal
            </h1>
            <p style={{ margin: '6px 0 0 0', color: '#93c5fd', fontSize: 14 }}>
              Official practice tests for Certificate A, B, and C examination papers • Drill, Weapon Training, Map Reading, Field Craft, Military History
            </p>
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Officer & Admin Customization Station Quick Launch Banner */}
      {user && ['admin', 'mentor', 'co', 'co_admin'].includes(user.role) && (
        <div
          style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: 10,
            padding: '16px 20px',
            color: '#fff',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
            border: '1px solid rgba(255,255,255,0.12)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 26 }}>⚙️</span>
            <div>
              <strong style={{ fontSize: 14, color: '#f8fafc' }}>
                Officer & Administrator MCQ Arena Customization HQ
              </strong>
              <p style={{ margin: '3px 0 0 0', fontSize: 12, color: '#94a3b8' }}>
                Customize exam duration timers, question counts, markings (+/-), questions CRUD, syllabus weightages, and cadet session logs.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/ncc-mock-tests/pipeline')}
            style={{
              padding: '8px 18px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              fontWeight: 800,
              fontSize: 12,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            }}
          >
            Open Admin Customization HQ ➔
          </button>
        </div>
      )}

      {/* Cadet Personal Performance Radar & Analytics Snapshot */}
      {analytics && analytics.tests_completed > 0 && (
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          border: '1px solid var(--border-color)',
          marginBottom: 32,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
              YOUR CADET PROFICIENCY DOSSIER
            </h3>
            <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 12px', borderRadius: 999, fontSize: 12, fontWeight: 700 }}>
              {analytics.tests_completed} Tests Completed • {analytics.overall_accuracy}% Overall Accuracy
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 260px), 1fr))', gap: 20 }}>
            {/* Strong Topics */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', marginBottom: 8 }}>
                🎯 STRONG AREAS (&gt;= 75% ACCURACY)
              </div>
              {analytics.strong_topics.length > 0 ? (
                analytics.strong_topics.map((t) => (
                  <div key={t.topic_code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#334155' }}>{t.topic_name}</span>
                    <strong style={{ color: '#16a34a' }}>{t.accuracy}%</strong>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Complete more topic drills to map strong areas.</div>
              )}
            </div>

            {/* Weak Topics */}
            <div style={{ background: '#f8fafc', padding: 16, borderRadius: 8, border: '1px solid #e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                  ⚠️ ATTENTION NEEDED (&lt; 50% ACCURACY)
                </span>
                {analytics.weak_topics.length > 0 && (
                  <button
                    onClick={() => handleStartTest('weak_areas')}
                    style={{
                      background: '#dc2626',
                      color: '#fff',
                      border: 'none',
                      padding: '3px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer'
                    }}
                  >
                    Drill Weak Areas ➔
                  </button>
                )}
              </div>
              {analytics.weak_topics.length > 0 ? (
                analytics.weak_topics.map((t) => (
                  <div key={t.topic_code} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: '#334155' }}>{t.topic_name}</span>
                    <strong style={{ color: '#dc2626' }}>{t.accuracy}%</strong>
                  </div>
                ))
              ) : (
                <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>No weak areas flagged! Outstanding preparation.</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Test Launchers Grid */}
      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', marginBottom: 14, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
        Select Mock Examination Mode
      </h3>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 300px), 1fr))', gap: 20, marginBottom: 36 }}>
        {/* Mode 1: Full Certificate Mock */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>🇮🇳</span>
              <span style={{ background: '#fef3c7', color: '#b45309', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                90 MIN • SYLLABUS BLUEPRINT
              </span>
            </div>
            <h4 style={{ fontSize: 18, margin: '0 0 8px 0', color: 'var(--navy-900)' }}>Full Certificate Mock Exam</h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Simulates official DG NCC written examination paper with weighted questions across all 19 syllabus subjects (+1 correct, -0.25 wrong).
            </p>
          </div>
          <button
            onClick={() => handleStartTest('full_mock')}
            disabled={launchingMode !== ''}
            style={{
              padding: '12px 18px',
              background: 'var(--navy-900)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8
            }}
          >
            {launchingMode === 'full_mock' ? 'Generating Blueprint…' : 'Start Full Mock (90m) ➔'}
          </button>
        </div>

        {/* Mode 2: Certificate Level Exam (A, B, C) */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>🎖️</span>
              <span style={{ background: '#dbeafe', color: '#1e40af', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                45 MIN • CERT LEVEL
              </span>
            </div>
            <h4 style={{ fontSize: 18, margin: '0 0 8px 0', color: 'var(--navy-900)' }}>Certificate Specific Practice</h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Targeted practice questions calibrated specifically for Certificate A (JD/JW), Certificate B, or Certificate C exams.
            </p>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
              {['A', 'B', 'C'].map((cert) => (
                <button
                  key={cert}
                  type="button"
                  onClick={() => setSelectedCert(cert)}
                  style={{
                    flex: 1,
                    padding: '8px',
                    borderRadius: 6,
                    border: selectedCert === cert ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: selectedCert === cert ? '#eff6ff' : '#f8fafc',
                    color: selectedCert === cert ? '#1d4ed8' : '#475569',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  Cert {cert}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={() => handleStartTest('certificate_wise', { certificate_level: selectedCert })}
            disabled={launchingMode !== ''}
            style={{
              padding: '12px 18px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {launchingMode === 'certificate_wise' ? 'Loading Paper…' : `Start Cert '${selectedCert}' Exam ➔`}
          </button>
        </div>

        {/* Mode 3: Topic-Wise Drill */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>📚</span>
              <span style={{ background: '#f3e8ff', color: '#6b21a8', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                30 MIN • TOPIC DRILL
              </span>
            </div>
            <h4 style={{ fontSize: 18, margin: '0 0 8px 0', color: 'var(--navy-900)' }}>Topic-Wise Technical Drill</h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: '0 0 12px 0' }}>
              Deep dive into single subject doctrines: Drill Commands, Weapon Training, Map Reading, or Military History.
            </p>

            <select
              value={selectedTopic}
              onChange={(e) => setSelectedTopic(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 6,
                border: '1px solid #cbd5e1',
                fontSize: 13,
                marginBottom: 16
              }}
            >
              {topics.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.name} ({t.question_count} Qs)
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={() => handleStartTest('topic_wise', { topic_code: selectedTopic })}
            disabled={launchingMode !== ''}
            style={{
              padding: '12px 18px',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {launchingMode === 'topic_wise' ? 'Preparing Drill…' : 'Start Topic Drill ➔'}
          </button>
        </div>

        {/* Mode 4: Quick 20-Min Practice */}
        <div style={{
          background: '#fff',
          borderRadius: 12,
          padding: 24,
          border: '1px solid var(--border-color)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between'
        }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span style={{ fontSize: 28 }}>⚡</span>
              <span style={{ background: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                20 MIN • QUICK SPRINT
              </span>
            </div>
            <h4 style={{ fontSize: 18, margin: '0 0 8px 0', color: 'var(--navy-900)' }}>Quick 20-Question Practice</h4>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, margin: 0 }}>
              Fast-paced rapid fire session. Ideal for daily parade revision and quick knowledge checks.
            </p>
          </div>
          <button
            onClick={() => handleStartTest('quick_practice')}
            disabled={launchingMode !== ''}
            style={{
              marginTop: 20,
              padding: '12px 18px',
              background: '#059669',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            {launchingMode === 'quick_practice' ? 'Launching…' : 'Start 20-Q Sprint ➔'}
          </button>
        </div>
      </div>

      {/* Syllabus Blueprint Breakdown Table */}
      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 24, marginBottom: 32 }}>
        <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: '0 0 6px 0' }}>
          OFFICIAL SYLLABUS TOPICS & BLUEPRINT WEIGHTAGES
        </h3>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '0 0 16px 0' }}>
          All 19 training areas covered in accordance with the Directorate General NCC Cadet Training Doctrine.
        </p>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-muted)' }}>
                <th style={{ padding: '10px 12px' }}>TOPIC NAME</th>
                <th style={{ padding: '10px 12px' }}>CODE</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>BLUEPRINT WEIGHTAGE</th>
                <th style={{ padding: '10px 12px', textAlign: 'center' }}>QUESTIONS IN BANK</th>
                <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTION</th>
              </tr>
            </thead>
            <tbody>
              {topics.map((t) => (
                <tr key={t.code} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 600, color: 'var(--navy-900)' }}>{t.name}</td>
                  <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#64748b' }}>{t.code}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>{t.default_weightage}%</td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                      {t.question_count} Qs
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                    <button
                      onClick={() => handleStartTest('topic_wise', { topic_code: t.code })}
                      style={{
                        padding: '4px 10px',
                        background: '#eff6ff',
                        color: '#1d4ed8',
                        border: '1px solid #bfdbfe',
                        borderRadius: 6,
                        fontWeight: 600,
                        fontSize: 12,
                        cursor: 'pointer'
                      }}
                    >
                      Practice Topic ➔
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
