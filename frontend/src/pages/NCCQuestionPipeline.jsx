import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/Form';
import { RefreshingBuffer } from '../components/RefreshingBuffer';

/**
 * ==============================================================================
 * NCC QUESTION PIPELINE: ADMIN MCQ CUSTOMIZATION ENGINE
 * ==============================================================================
 * Complete administrative control center for the NCC Mock Test Arena:
 * 1. Exam Configuration: Adjust durations, question counts, negative marks, passing score.
 * 2. Question Bank: Add, edit, archive, and filter questions across certificate levels & wings.
 * 3. Syllabus Weightages: Rebalance topic question percentages and module enablement.
 * 4. Cadet Attempts: Inspect live session logs, answers chosen, and auto-submit status.
 * 5. Psychometric Matrix: Real-time item difficulty (p-value) and discrimination indices.
 * ==============================================================================
 */
export default function NCCQuestionPipeline() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user && ['admin', 'co', 'co_admin'].includes(user.role);

  // Active Tab: 'config' | 'questions' | 'topics' | 'sessions' | 'psychometrics'
  const [activeTab, setActiveTab] = useState('config');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // -------------------------------------------------------------
  // TAB 1: EXAM CONFIGURATION STATE
  // -------------------------------------------------------------
  const [config, setConfig] = useState({
    full_mock_duration_minutes: 90,
    full_mock_question_count: 100,
    cert_exam_duration_minutes: 45,
    cert_exam_question_count: 50,
    quick_practice_duration_minutes: 20,
    quick_practice_question_count: 25,
    marks_per_correct: 1.0,
    marks_per_wrong: -0.25,
    shuffle_options: true,
    pass_percentage: 50.0,
  });
  const [savingConfig, setSavingConfig] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: QUESTION BANK STATE & MODALS
  // -------------------------------------------------------------
  const [questions, setQuestions] = useState([]);
  const [questionsTotal, setQuestionsTotal] = useState(0);
  const [qSearch, setQSearch] = useState('');
  const [qTopicFilter, setQTopicFilter] = useState('');
  const [qDifficultyFilter, setQDifficultyFilter] = useState('');
  const [qCertFilter, setQCertFilter] = useState('');
  const [qPage, setQPage] = useState(0);

  // Add / Edit Question Modal
  const [editingQuestion, setEditingQuestion] = useState(null); // null = add new, or question object
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [qFormData, setQFormData] = useState({
    statement: '',
    options: ['', '', '', ''],
    correct_option: 0,
    explanation: '',
    topic_code: 'ncc_organisation_history',
    sub_topic: '',
    certificate_level: 'common',
    wing: 'common',
    difficulty: 'medium',
    source_reference: '',
  });

  // CSV Import State
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [showCsvBox, setShowCsvBox] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: TOPICS STATE
  // -------------------------------------------------------------
  const [topics, setTopics] = useState([]);
  const [showNewTopicModal, setShowNewTopicModal] = useState(false);
  const [newTopicData, setNewTopicData] = useState({
    code: '',
    name: '',
    default_weightage: 5.0,
    is_active: true,
  });

  // -------------------------------------------------------------
  // TAB 4: CADET SESSIONS AUDIT
  // -------------------------------------------------------------
  const [sessions, setSessions] = useState([]);
  const [sessionsTotal, setSessionsTotal] = useState(0);
  const [sessionModeFilter, setSessionModeFilter] = useState('');
  const [sessionStatusFilter, setSessionStatusFilter] = useState('');
  const [sessionSearch, setSessionSearch] = useState('');

  // -------------------------------------------------------------
  // TAB 5: PSYCHOMETRICS
  // -------------------------------------------------------------
  const [stats, setStats] = useState([]);
  const [filterFlag, setFilterFlag] = useState('all');

  // Initial Load
  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    setLoading(true);
    setError('');
    try {
      const [cfgData, topicsData] = await Promise.all([
        api.getNCCTestConfig().catch(() => null),
        api.getNCCTopics().catch(() => []),
      ]);
      if (cfgData) setConfig(cfgData);
      if (topicsData) setTopics(topicsData);

      await Promise.all([
        loadQuestions(),
        loadSessions(),
        loadItemAnalysis(),
      ]);
    } catch (err) {
      setError(err.message || 'Failed to load MCQ management console');
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------------
  // API CALLS: CONFIG
  // -------------------------------------------------------------
  async function handleSaveConfig(e) {
    e.preventDefault();
    if (!isAdmin) {
      setError('Only Commanding Officers and Administrators can modify exam rules');
      return;
    }
    setSavingConfig(true);
    setError('');
    setSuccessMsg('');
    try {
      const updated = await api.updateNCCTestConfig({
        full_mock_duration_minutes: Number(config.full_mock_duration_minutes),
        full_mock_question_count: Number(config.full_mock_question_count),
        cert_exam_duration_minutes: Number(config.cert_exam_duration_minutes),
        cert_exam_question_count: Number(config.cert_exam_question_count),
        quick_practice_duration_minutes: Number(config.quick_practice_duration_minutes),
        quick_practice_question_count: Number(config.quick_practice_question_count),
        marks_per_correct: parseFloat(config.marks_per_correct),
        marks_per_wrong: parseFloat(config.marks_per_wrong),
        shuffle_options: Boolean(config.shuffle_options),
        pass_percentage: parseFloat(config.pass_percentage),
      });
      setConfig(updated);
      setSuccessMsg('Exam configuration saved successfully! All newly launched cadet tests will use these rules.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      setError(err.message || 'Failed to save test configuration');
    } finally {
      setSavingConfig(false);
    }
  }

  // -------------------------------------------------------------
  // API CALLS: QUESTIONS
  // -------------------------------------------------------------
  async function loadQuestions() {
    try {
      const params = {
        skip: qPage * 50,
        limit: 50,
      };
      if (qSearch) params.search = qSearch;
      if (qTopicFilter) params.topic_code = qTopicFilter;
      if (qDifficultyFilter) params.difficulty = qDifficultyFilter;
      if (qCertFilter) params.cert_level = qCertFilter;

      const res = await api.listAdminQuestions(params);
      setQuestions(res.items || []);
      setQuestionsTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadQuestions();
  }, [qSearch, qTopicFilter, qDifficultyFilter, qCertFilter, qPage]);

  function openCreateQuestionModal() {
    setEditingQuestion(null);
    setQFormData({
      statement: '',
      options: ['', '', '', ''],
      correct_option: 0,
      explanation: '',
      topic_code: topics.length > 0 ? topics[0].code : 'ncc_organisation_history',
      sub_topic: '',
      certificate_level: 'common',
      wing: 'common',
      difficulty: 'medium',
      source_reference: '',
    });
    setShowQuestionModal(true);
  }

  function openEditQuestionModal(q) {
    setEditingQuestion(q);
    setQFormData({
      statement: q.statement,
      options: [...q.options],
      correct_option: q.correct_option,
      explanation: q.explanation || '',
      topic_code: q.topic_code,
      sub_topic: q.sub_topic || '',
      certificate_level: q.certificate_level,
      wing: q.wing,
      difficulty: q.difficulty,
      source_reference: q.source_reference || '',
    });
    setShowQuestionModal(true);
  }

  async function handleSaveQuestion(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingQuestion) {
        await api.updateAdminQuestion(editingQuestion.id, qFormData);
        setSuccessMsg(`Question #${editingQuestion.id} updated successfully!`);
      } else {
        await api.createAdminQuestion(qFormData);
        setSuccessMsg('New MCQ question registered into the official question bank!');
      }
      setShowQuestionModal(false);
      loadQuestions();
      loadItemAnalysis();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to save question');
    }
  }

  async function handleDeleteQuestion(id) {
    if (!isAdmin) {
      alert('Only Admins can delete questions.');
      return;
    }
    if (!window.confirm(`Are you sure you want to permanently delete question #${id}?`)) return;
    try {
      await api.deleteAdminQuestion(id);
      setSuccessMsg(`Question #${id} deleted.`);
      loadQuestions();
      loadItemAnalysis();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete question');
    }
  }

  // -------------------------------------------------------------
  // API CALLS: CSV IMPORT
  // -------------------------------------------------------------
  async function handleCSVUpload(e) {
    e.preventDefault();
    if (!file) return;

    setUploading(true);
    setError('');
    setImportResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const resData = await api.importNCCQuestionsCSV(formData);
      setImportResult(resData);
      setFile(null);
      loadQuestions();
      loadItemAnalysis();
      setSuccessMsg(`Import complete: ${resData.imported_count} questions imported.`);
    } catch (err) {
      setError(err.message || 'CSV upload failed');
    } finally {
      setUploading(false);
    }
  }

  function downloadSampleCSV() {
    const csvContent =
      'statement,option_a,option_b,option_c,option_d,correct_option,explanation,topic_code,sub_topic,source_reference\n' +
      '"In which year was the NCC established in India?","1947","1948","1950","1952","B","NCC was established on 15 July 1948 under NCC Act XXXI.","ncc_organisation_history","History","Cadet Handbook Ch 1"\n' +
      '"What is the calibre of the .22 Deluxe Rifle?","0.22 mm","0.22 inches","7.62 mm","5.56 mm","B","The calibre is .22 inches.","weapon_training","Rifles","Weapon Training Vol 1"\n';
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'ncc_questions_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // -------------------------------------------------------------
  // API CALLS: TOPICS
  // -------------------------------------------------------------
  async function handleUpdateTopicWeightage(topic, newWeightage) {
    if (!isAdmin) {
      alert('Only Admins can modify syllabus weightage.');
      return;
    }
    const val = parseFloat(newWeightage);
    if (isNaN(val) || val < 0) return;
    try {
      await api.updateAdminTopic(topic.code, { default_weightage: val });
      setTopics((prev) =>
        prev.map((t) => (t.code === topic.code ? { ...t, default_weightage: val } : t))
      );
      setSuccessMsg(`Weightage for '${topic.name}' updated to ${val}%.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update topic weightage');
    }
  }

  async function handleToggleTopicActive(topic) {
    if (!isAdmin) {
      alert('Only Admins can toggle syllabus topics.');
      return;
    }
    try {
      const updated = await api.updateAdminTopic(topic.code, { is_active: !topic.is_active });
      setTopics((prev) =>
        prev.map((t) => (t.code === topic.code ? { ...t, is_active: updated.is_active } : t))
      );
      setSuccessMsg(`Topic '${topic.name}' is now ${updated.is_active ? 'ACTIVE' : 'INACTIVE'}.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to toggle topic');
    }
  }

  async function handleCreateTopic(e) {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await api.createAdminTopic(newTopicData);
      setShowNewTopicModal(false);
      setNewTopicData({ code: '', name: '', default_weightage: 5.0, is_active: true });
      const refreshed = await api.getNCCTopics();
      setTopics(refreshed);
      setSuccessMsg(`Custom syllabus topic '${newTopicData.name}' created!`);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to create topic');
    }
  }

  async function handleDeleteTopic(code) {
    if (!isAdmin) return;
    if (!window.confirm(`Are you sure you want to deactivate/delete topic '${code}'?`)) return;
    try {
      await api.deleteAdminTopic(code);
      const refreshed = await api.getNCCTopics();
      setTopics(refreshed);
      setSuccessMsg(`Topic '${code}' deactivated.`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to delete topic');
    }
  }

  // -------------------------------------------------------------
  // API CALLS: CADET SESSIONS AUDIT
  // -------------------------------------------------------------
  async function loadSessions() {
    try {
      const params = { limit: 50 };
      if (sessionModeFilter) params.mode = sessionModeFilter;
      if (sessionStatusFilter) params.status_filter = sessionStatusFilter;
      if (sessionSearch.trim()) params.search = sessionSearch.trim();
      const res = await api.listAdminSessions(params);
      setSessions(res.items || []);
      setSessionsTotal(res.total || 0);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadSessions();
  }, [sessionModeFilter, sessionStatusFilter]);

  async function handleResetSession(sessionId) {
    if (!isAdmin) {
      alert('Only Admins can reset cadet test attempts.');
      return;
    }
    if (!window.confirm(`Reset/delete test attempt #${sessionId}? Cadet will be able to retake the test.`)) return;
    try {
      await api.deleteAdminSession(sessionId);
      setSuccessMsg(`Session #${sessionId} reset successfully.`);
      loadSessions();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message || 'Failed to reset test session');
    }
  }

  // -------------------------------------------------------------
  // API CALLS: PSYCHOMETRICS
  // -------------------------------------------------------------
  async function loadItemAnalysis() {
    try {
      const data = await api.getNCCItemAnalysis();
      setStats(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  const filteredStats = stats.filter((s) => {
    if (filterFlag === 'all') return true;
    if (filterFlag === 'flagged') return s.flag_status !== 'ok';
    return s.flag_status === filterFlag;
  });

  const totalWeightage = topics.reduce((acc, t) => acc + (t.is_active !== false ? (t.default_weightage || 0) : 0), 0);

  return (
    <div style={{ maxWidth: 1280, margin: '0 auto', paddingBottom: 60 }}>
      {/* Top Directorate Command Header */}
      <div
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 14,
          padding: 'clamp(20px, 4vw, 32px)',
          color: '#fff',
          marginBottom: 24,
          boxShadow: '0 10px 28px rgba(0,0,0,0.15)',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ fontSize: 38 }}>⚙️</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: '#f59e0b', textTransform: 'uppercase' }}>
                DIRECTORATE GENERAL NCC • EXAMINATION COMMAND HQ
              </div>
              <h1 style={{ fontSize: 'clamp(20px, 3vw, 26px)', fontWeight: 900, margin: '4px 0 0 0' }}>
                MCQ Arena Admin Customization HQ
              </h1>
              <p style={{ margin: '6px 0 0 0', color: '#94a3b8', fontSize: 13 }}>
                Complete administrative control over exam duration timers, question counts, marking schemes (+/-), questions CRUD, syllabus blueprint weightages, and cadet session resets.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <span
              style={{
                background: isAdmin ? '#059669' : '#d97706',
                color: '#fff',
                padding: '6px 12px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
              }}
            >
              <span>{isAdmin ? '⭐ Full Admin Clearance' : '🎖️ Officer / Reviewer Clearance'}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Notifications */}
      {error && <ErrorBanner message={error} />}
      {successMsg && (
        <div
          style={{
            background: '#ecfdf5',
            color: '#065f46',
            border: '1px solid #a7f3d0',
            borderRadius: 8,
            padding: '12px 16px',
            marginBottom: 20,
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <span>✅</span>
          <span>{successMsg}</span>
        </div>
      )}

      {/* Navigation Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 8,
          borderBottom: '2px solid #e2e8f0',
          marginBottom: 24,
          overflowX: 'auto',
          paddingBottom: 4,
        }}
      >
        {[
          { id: 'config', label: '⚙️ Exam Rules & Timers', badge: null },
          { id: 'questions', label: '📝 Question Bank Manager', badge: questionsTotal },
          { id: 'topics', label: '📚 Syllabus & Weightages', badge: topics.length },
          { id: 'sessions', label: '👥 Cadet Attempts Audit', badge: sessionsTotal },
          { id: 'psychometrics', label: '🔬 Psychometric Item Matrix', badge: stats.length },
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                setError('');
              }}
              style={{
                padding: '10px 18px',
                borderRadius: '8px 8px 0 0',
                border: 'none',
                background: isActive ? '#1e3a5f' : '#f8fafc',
                color: isActive ? '#fff' : '#475569',
                fontWeight: 800,
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease',
                whiteSpace: 'nowrap',
              }}
            >
              <span>{tab.label}</span>
              {tab.badge !== null && (
                <span
                  style={{
                    background: isActive ? '#3b82f6' : '#e2e8f0',
                    color: isActive ? '#fff' : '#1e293b',
                    padding: '2px 7px',
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: EXAM RULES & TIMERS                                                */}
      {/* ========================================================================= */}
      {activeTab === 'config' && (
        <div>
          <form onSubmit={handleSaveConfig}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20, marginBottom: 24 }}>
              {/* Full Mock Test Parameters */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 22 }}>🏆</span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
                    Full Mock Examination
                  </h3>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Standard comprehensive Directorate mock test covering all 19 syllabus subjects.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={config.full_mock_duration_minutes}
                      onChange={(e) => setConfig({ ...config, full_mock_duration_minutes: e.target.value })}
                      disabled={!isAdmin}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Total Questions in Exam
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="200"
                      value={config.full_mock_question_count}
                      onChange={(e) => setConfig({ ...config, full_mock_question_count: e.target.value })}
                      disabled={!isAdmin}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600 }}
                    />
                  </div>
                </div>
              </div>

              {/* Certificate-Wise Exam Parameters */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 22 }}>📜</span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
                    Certificate Exam Practice (A / B / C)
                  </h3>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Focused paper matching official Certificate A, B, or C syllabus standards.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="180"
                      value={config.cert_exam_duration_minutes}
                      onChange={(e) => setConfig({ ...config, cert_exam_duration_minutes: e.target.value })}
                      disabled={!isAdmin}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Total Questions in Exam
                    </label>
                    <input
                      type="number"
                      min="10"
                      max="100"
                      value={config.cert_exam_question_count}
                      onChange={(e) => setConfig({ ...config, cert_exam_question_count: e.target.value })}
                      disabled={!isAdmin}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600 }}
                    />
                  </div>
                </div>
              </div>

              {/* Quick Practice Sprint Parameters */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 22 }}>⚡</span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
                    Quick Practice Sprint
                  </h3>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  High-velocity daily drill sprint for cadets between training classes.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Duration (Minutes)
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="60"
                      value={config.quick_practice_duration_minutes}
                      onChange={(e) => setConfig({ ...config, quick_practice_duration_minutes: e.target.value })}
                      disabled={!isAdmin}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600 }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Total Questions
                    </label>
                    <input
                      type="number"
                      min="5"
                      max="50"
                      value={config.quick_practice_question_count}
                      onChange={(e) => setConfig({ ...config, quick_practice_question_count: e.target.value })}
                      disabled={!isAdmin}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600 }}
                    />
                  </div>
                </div>
              </div>

              {/* Marking Scheme & Randomization */}
              <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 22 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                  <span style={{ fontSize: 22 }}>🎯</span>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
                    Scoring & Security Rules
                  </h3>
                </div>
                <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 16 }}>
                  Server-authoritative scoring calculations and anti-cheating controls.
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', display: 'block', marginBottom: 4 }}>
                        + Correct Mark
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0.5"
                        max="10"
                        value={config.marks_per_correct}
                        onChange={(e) => setConfig({ ...config, marks_per_correct: e.target.value })}
                        disabled={!isAdmin}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, color: '#16a34a' }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', display: 'block', marginBottom: 4 }}>
                        - Negative Penalty
                      </label>
                      <input
                        type="number"
                        step="0.05"
                        max="0"
                        min="-5"
                        value={config.marks_per_wrong}
                        onChange={(e) => setConfig({ ...config, marks_per_wrong: e.target.value })}
                        disabled={!isAdmin}
                        style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 700, color: '#dc2626' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Pass Percentage Threshold (%)
                    </label>
                    <input
                      type="number"
                      step="1"
                      min="20"
                      max="90"
                      value={config.pass_percentage}
                      onChange={(e) => setConfig({ ...config, pass_percentage: e.target.value })}
                      disabled={!isAdmin}
                      style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 14, fontWeight: 600 }}
                    />
                  </div>

                  <div style={{ marginTop: 6 }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: isAdmin ? 'pointer' : 'not-allowed' }}>
                      <input
                        type="checkbox"
                        checked={config.shuffle_options}
                        onChange={(e) => setConfig({ ...config, shuffle_options: e.target.checked })}
                        disabled={!isAdmin}
                        style={{ width: 18, height: 18, accentColor: '#1d4ed8' }}
                      />
                      <div>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-900)' }}>Randomize Option Order (A/B/C/D)</span>
                        <p style={{ margin: '2px 0 0 0', fontSize: 11, color: 'var(--text-muted)' }}>
                          Per-session cryptographic permutation preventing adjacent cadet cheating.
                        </p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            {isAdmin && (
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: 10,
                  padding: 18,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: 12,
                }}
              >
                <div>
                  <span style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: 14 }}>
                    Live Rule Enforcement:
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 13, marginLeft: 8 }}>
                    Full Mock: {config.full_mock_question_count} Qs / {config.full_mock_duration_minutes}m • Score: +{config.marks_per_correct} / {config.marks_per_wrong}
                  </span>
                </div>
                <button
                  type="submit"
                  disabled={savingConfig}
                  style={{
                    padding: '10px 24px',
                    background: '#1d4ed8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: savingConfig ? 'not-allowed' : 'pointer',
                    boxShadow: '0 4px 12px rgba(29,78,216,0.25)',
                  }}
                >
                  {savingConfig ? 'Applying Parameters…' : 'Save & Publish Exam Rules ➔'}
                </button>
              </div>
            )}
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: QUESTION BANK MANAGER                                              */}
      {/* ========================================================================= */}
      {activeTab === 'questions' && (
        <div>
          {/* Controls Bar */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              border: '1px solid var(--border-color)',
              padding: 20,
              marginBottom: 20,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 16 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
                  NCC MCQ QUESTION BANK ({questionsTotal} QUESTIONS)
                </h3>
                <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                  Create, edit, or purge questions. All questions include 4 options, exact answer key, and handbook explanation.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={() => setShowCsvBox(!showCsvBox)}
                  style={{
                    padding: '8px 14px',
                    background: '#f1f5f9',
                    color: '#334155',
                    border: '1px solid #cbd5e1',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  {showCsvBox ? 'Hide CSV Importer' : '📥 Bulk CSV Import'}
                </button>

                <button
                  onClick={openCreateQuestionModal}
                  style={{
                    padding: '8px 18px',
                    background: '#16a34a',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>➕ Add New MCQ Question</span>
                </button>
              </div>
            </div>

            {/* CSV Box (Expandable) */}
            {showCsvBox && (
              <div
                style={{
                  background: '#f8fafc',
                  borderRadius: 8,
                  border: '1px dashed #94a3b8',
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <strong style={{ fontSize: 13, color: 'var(--navy-900)' }}>BULK CSV QUESTION UPLOADER</strong>
                  <button
                    onClick={downloadSampleCSV}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#2563eb',
                      textDecoration: 'underline',
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    ⬇️ Download Sample CSV Template
                  </button>
                </div>
                <form onSubmit={handleCSVUpload} style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => setFile(e.target.files[0])}
                    style={{ fontSize: 13 }}
                  />
                  <button
                    type="submit"
                    disabled={!file || uploading}
                    style={{
                      padding: '6px 16px',
                      background: '#2563eb',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 6,
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: (!file || uploading) ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {uploading ? 'Validating…' : 'Upload & Validate'}
                  </button>
                </form>

                {importResult && (
                  <div style={{ marginTop: 12, padding: 10, borderRadius: 6, background: '#fff', border: '1px solid #e2e8f0', fontSize: 12 }}>
                    <strong>Import Result:</strong> {importResult.imported_count} imported, {importResult.skipped_count} skipped.
                  </div>
                )}
              </div>
            )}

            {/* Search and Filters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              <input
                type="text"
                placeholder="🔍 Search statement or explanation…"
                value={qSearch}
                onChange={(e) => {
                  setQSearch(e.target.value);
                  setQPage(0);
                }}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              />

              <select
                value={qTopicFilter}
                onChange={(e) => {
                  setQTopicFilter(e.target.value);
                  setQPage(0);
                }}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">All Syllabus Topics</option>
                {topics.map((t) => (
                  <option key={t.code} value={t.code}>
                    {t.name}
                  </option>
                ))}
              </select>

              <select
                value={qDifficultyFilter}
                onChange={(e) => {
                  setQDifficultyFilter(e.target.value);
                  setQPage(0);
                }}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">All Difficulties</option>
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>

              <select
                value={qCertFilter}
                onChange={(e) => {
                  setQCertFilter(e.target.value);
                  setQPage(0);
                }}
                style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">All Certificate Levels</option>
                <option value="common">Common (All Cadets)</option>
                <option value="A">Certificate A</option>
                <option value="B">Certificate B</option>
                <option value="C">Certificate C</option>
              </select>
            </div>
          </div>

          {/* Questions List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {questions.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                No questions found matching the selected filters.
              </div>
            ) : (
              questions.map((q) => {
                const topicObj = topics.find((t) => t.code === q.topic_code);
                return (
                  <div
                    key={q.id}
                    style={{
                      background: '#fff',
                      borderRadius: 10,
                      border: '1px solid var(--border-color)',
                      padding: 18,
                      boxShadow: '0 2px 6px rgba(0,0,0,0.02)',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, color: 'var(--navy-900)', fontSize: 13 }}>#{q.id}</span>
                        <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700 }}>
                          {topicObj ? topicObj.name : q.topic_code}
                        </span>
                        <span style={{ background: '#f1f5f9', color: '#475569', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                          Diff: {q.difficulty.toUpperCase()}
                        </span>
                        <span style={{ background: '#fef3c7', color: '#92400e', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                          Cert: {q.certificate_level}
                        </span>
                        {q.sub_topic && (
                          <span style={{ fontSize: 11, color: '#64748b' }}>• {q.sub_topic}</span>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => openEditQuestionModal(q)}
                          style={{
                            padding: '4px 10px',
                            background: '#eff6ff',
                            color: '#1d4ed8',
                            border: '1px solid #bfdbfe',
                            borderRadius: 4,
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: 'pointer',
                          }}
                        >
                          ✏️ Edit
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDeleteQuestion(q.id)}
                            style={{
                              padding: '4px 10px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: 4,
                              fontSize: 12,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Question Statement */}
                    <p style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', margin: '0 0 12px 0' }}>
                      {q.statement}
                    </p>

                    {/* Options Grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 8, marginBottom: 12 }}>
                      {q.options.map((opt, idx) => {
                        const isCorrect = idx === q.correct_option;
                        return (
                          <div
                            key={idx}
                            style={{
                              padding: '8px 12px',
                              borderRadius: 6,
                              background: isCorrect ? '#ecfdf5' : '#f8fafc',
                              border: `1px solid ${isCorrect ? '#86efac' : '#e2e8f0'}`,
                              color: isCorrect ? '#065f46' : '#334155',
                              fontSize: 13,
                              fontWeight: isCorrect ? 700 : 500,
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <span
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: '50%',
                                background: isCorrect ? '#16a34a' : '#cbd5e1',
                                color: '#fff',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: 11,
                                fontWeight: 800,
                              }}
                            >
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span style={{ flex: 1 }}>{opt}</span>
                            {isCorrect && <span style={{ fontSize: 11, fontWeight: 800, color: '#16a34a' }}>✓ KEY</span>}
                          </div>
                        );
                      })}
                    </div>

                    {/* Explanation */}
                    {q.explanation && (
                      <div style={{ background: '#f8fafc', borderLeft: '3px solid #3b82f6', padding: '6px 12px', fontSize: 12, color: '#475569' }}>
                        <strong>Handbook Explanation:</strong> {q.explanation}
                        {q.source_reference && <span style={{ fontStyle: 'italic', marginLeft: 8 }}>(Ref: {q.source_reference})</span>}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Pagination Controls */}
          {questionsTotal > 50 && (
            <div style={{ display: 'flex', justifyContent: 'center', gap: 10, marginTop: 24 }}>
              <button
                disabled={qPage === 0}
                onClick={() => setQPage((p) => Math.max(0, p - 1))}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: qPage === 0 ? 'not-allowed' : 'pointer' }}
              >
                ◀ Previous Page
              </button>
              <span style={{ padding: '8px 16px', fontWeight: 700, color: 'var(--navy-900)' }}>
                Page {qPage + 1} of {Math.ceil(questionsTotal / 50)}
              </span>
              <button
                disabled={(qPage + 1) * 50 >= questionsTotal}
                onClick={() => setQPage((p) => p + 1)}
                style={{ padding: '8px 16px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: (qPage + 1) * 50 >= questionsTotal ? 'not-allowed' : 'pointer' }}
              >
                Next Page ▶
              </button>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: SYLLABUS TOPICS & BLUEPRINT WEIGHTAGE                               */}
      {/* ========================================================================= */}
      {activeTab === 'topics' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
                OFFICIAL NCC SYLLABUS TOPICS & BLUEPRINT WEIGHTAGE
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Adjust exam question weightage percentages or toggle topics on/off. Exam generator dynamically allocates questions using active weightages.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              {/* Total Weightage Indicator */}
              <div
                style={{
                  background: Math.abs(totalWeightage - 100) < 1 ? '#ecfdf5' : '#fffbeb',
                  border: `1px solid ${Math.abs(totalWeightage - 100) < 1 ? '#86efac' : '#fde68a'}`,
                  borderRadius: 8,
                  padding: '6px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Active Weightage Sum:</span>
                <strong style={{ fontSize: 14, color: Math.abs(totalWeightage - 100) < 1 ? '#15803d' : '#b45309' }}>
                  {totalWeightage.toFixed(1)}%
                </strong>
              </div>

              {isAdmin && (
                <button
                  onClick={() => setShowNewTopicModal(true)}
                  style={{
                    padding: '8px 16px',
                    background: '#1d4ed8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 6,
                    fontWeight: 700,
                    fontSize: 12,
                    cursor: 'pointer',
                  }}
                >
                  ➕ Add Custom Topic
                </button>
              )}
            </div>
          </div>

          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>TOPIC NAME</th>
                  <th style={{ padding: '10px 12px' }}>CODE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>QUESTIONS IN BANK</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>BLUEPRINT WEIGHTAGE (%)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>STATUS</th>
                  {isAdmin && <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTIONS</th>}
                </tr>
              </thead>
              <tbody>
                {topics.map((t) => (
                  <tr key={t.code} style={{ borderBottom: '1px solid #f1f5f9', opacity: t.is_active === false ? 0.6 : 1 }}>
                    <td style={{ padding: '10px 12px', fontWeight: 700, color: 'var(--navy-900)' }}>{t.name}</td>
                    <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#64748b' }}>{t.code}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span style={{ background: '#f1f5f9', padding: '2px 8px', borderRadius: 4, fontWeight: 700 }}>
                        {t.question_count || 0} Qs
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      {isAdmin ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="100"
                            defaultValue={t.default_weightage}
                            onBlur={(e) => handleUpdateTopicWeightage(t, e.target.value)}
                            style={{
                              width: 70,
                              padding: '4px 6px',
                              textAlign: 'center',
                              borderRadius: 4,
                              border: '1px solid #cbd5e1',
                              fontWeight: 700,
                            }}
                          />
                          <span>%</span>
                        </div>
                      ) : (
                        <span>{t.default_weightage}%</span>
                      )}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                      <span
                        style={{
                          background: t.is_active !== false ? '#dcfce7' : '#fee2e2',
                          color: t.is_active !== false ? '#15803d' : '#b91c1c',
                          padding: '2px 8px',
                          borderRadius: 4,
                          fontSize: 11,
                          fontWeight: 700,
                        }}
                      >
                        {t.is_active !== false ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    {isAdmin && (
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            onClick={() => handleToggleTopicActive(t)}
                            style={{
                              padding: '3px 8px',
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            {t.is_active !== false ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteTopic(t.code)}
                            style={{
                              padding: '3px 8px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              border: '1px solid #fecaca',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: CADET ATTEMPTS AUDIT                                               */}
      {/* ========================================================================= */}
      {activeTab === 'sessions' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 14, marginBottom: 20 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
                CADET TEST SESSIONS & ATTEMPTS AUDIT ({sessionsTotal} TOTAL)
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Inspect cadet examination scorecards, verify answers, and audit mock tests across battalions.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                type="text"
                placeholder="Search cadet or regimental #..."
                value={sessionSearch}
                onChange={(e) => setSessionSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') loadSessions(); }}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13, minWidth: 200 }}
              />
              <button
                type="button"
                onClick={loadSessions}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  background: 'var(--navy-900)',
                  color: '#fff',
                  border: 'none',
                  fontSize: 13,
                  cursor: 'pointer',
                  fontWeight: 700,
                }}
              >
                Search
              </button>
              <select
                value={sessionStatusFilter}
                onChange={(e) => setSessionStatusFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">All Statuses</option>
                <option value="completed">Completed</option>
                <option value="in_progress">In Progress</option>
              </select>
              <select
                value={sessionModeFilter}
                onChange={(e) => setSessionModeFilter(e.target.value)}
                style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
              >
                <option value="">All Test Modes</option>
                <option value="full_mock">Full Mock Exam</option>
                <option value="certificate_wise">Certificate Exam</option>
                <option value="topic_wise">Topic Drill</option>
                <option value="quick_practice">Quick Practice Sprint</option>
              </select>
            </div>
          </div>

          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>SESSION ID</th>
                  <th style={{ padding: '10px 12px' }}>CADET</th>
                  <th style={{ padding: '10px 12px' }}>REGIMENTAL #</th>
                  <th style={{ padding: '10px 12px' }}>MODE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>STATUS</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>SCORE</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>ACCURACY</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>TIME SPENT</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>DATE & TIME</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {sessions.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 32, textAlign: 'center', color: '#64748b' }}>
                      No examination sessions matching query found.
                    </td>
                  </tr>
                ) : (
                  sessions.map((s) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>#{s.id}</td>
                      <td style={{ padding: '10px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span
                            style={{
                              background: '#e0e7ff',
                              color: '#3730a3',
                              padding: '1px 6px',
                              borderRadius: 4,
                              fontSize: 10,
                              fontWeight: 800,
                            }}
                          >
                            {s.cadet_rank || 'CDT'}
                          </span>
                          <span style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
                            {s.user_name || s.user_email || `User #${s.user_id}`}
                          </span>
                        </div>
                        {s.college_name && (
                          <div style={{ fontSize: 10, color: '#64748b', marginTop: 2 }}>
                            {s.college_name}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '10px 12px', fontFamily: 'monospace', color: '#64748b' }}>
                        {s.cadet_regimental_number || 'N/A'}
                      </td>
                      <td style={{ padding: '10px 12px' }}>
                        <span style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 600 }}>
                          {s.mode.replace('_', ' ').toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                        <span
                          style={{
                            background: s.status === 'completed' ? '#dcfce7' : '#fef3c7',
                            color: s.status === 'completed' ? '#15803d' : '#b45309',
                            padding: '2px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {s.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 800, color: '#1d4ed8' }}>
                        {s.total_score !== null ? s.total_score.toFixed(1) : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>
                        {s.accuracy_percentage !== null ? `${s.accuracy_percentage.toFixed(1)}%` : '-'}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', color: '#64748b' }}>
                        {Math.floor((s.time_spent_seconds || 0) / 60)}m {(s.time_spent_seconds || 0) % 60}s
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right', color: '#64748b' }}>
                        {new Date(s.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: 6, justifyContent: 'flex-end' }}>
                          <button
                            onClick={() => navigate(`/ncc-mock-tests/results?session=${s.id}`)}
                            style={{
                              padding: '4px 9px',
                              background: '#eff6ff',
                              color: '#1d4ed8',
                              border: '1px solid #bfdbfe',
                              borderRadius: 4,
                              fontSize: 11,
                              fontWeight: 700,
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                            title="Inspect official post-exam scorecard and answers"
                          >
                            <span>📄</span> Scorecard
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => handleResetSession(s.id)}
                              style={{
                                padding: '4px 8px',
                                background: '#fee2e2',
                                color: '#dc2626',
                                border: '1px solid #fecaca',
                                borderRadius: 4,
                                fontSize: 11,
                                fontWeight: 700,
                                cursor: 'pointer',
                              }}
                              title="Reset attempt so cadet can retake"
                            >
                              Reset
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: PSYCHOMETRICS & ITEM ANALYSIS                                      */}
      {/* ========================================================================= */}
      {activeTab === 'psychometrics' && (
        <div style={{ background: '#fff', borderRadius: 12, border: '1px solid var(--border-color)', padding: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--navy-900)', margin: 0 }}>
                PSYCHOMETRIC ITEM ANALYSIS MATRIX
              </h3>
              <p style={{ margin: '4px 0 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
                Classical Test Theory (CTT): Difficulty Index (P), Discrimination Index (D), distractor choices, and alerts.
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={() => setFilterFlag('all')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: filterFlag === 'all' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                  background: filterFlag === 'all' ? '#eff6ff' : '#fff',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                All ({stats.length})
              </button>
              <button
                onClick={() => setFilterFlag('flagged')}
                style={{
                  padding: '6px 12px',
                  borderRadius: 6,
                  border: filterFlag === 'flagged' ? '2px solid #dc2626' : '1px solid #cbd5e1',
                  background: filterFlag === 'flagged' ? '#fee2e2' : '#fff',
                  color: '#dc2626',
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                Alerts & Flags
              </button>
            </div>
          </div>

          <div className="table-responsive">
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e2e8f0', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '10px 12px' }}>ID</th>
                  <th style={{ padding: '10px 12px' }}>QUESTION STATEMENT</th>
                  <th style={{ padding: '10px 12px' }}>TOPIC</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>ATTEMPTS</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>DIFFICULTY (P)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>DISCRIMINATION (D)</th>
                  <th style={{ padding: '10px 12px', textAlign: 'center' }}>DISTRACTOR CHOICES</th>
                  <th style={{ padding: '10px 12px', textAlign: 'right' }}>PSYCHOMETRIC FLAG</th>
                </tr>
              </thead>
              <tbody>
                {filteredStats.map((item) => {
                  let flagBadge = { bg: '#dcfce7', text: '#15803d', label: 'OPTIMAL' };
                  if (item.flag_status === 'too_hard') flagBadge = { bg: '#fee2e2', text: '#b91c1c', label: 'TOO HARD (P < 0.20)' };
                  if (item.flag_status === 'too_easy') flagBadge = { bg: '#fef3c7', text: '#b45309', label: 'TOO EASY (P > 0.85)' };
                  if (item.flag_status === 'negative_discrimination') flagBadge = { bg: '#f3e8ff', text: '#6b21a8', label: 'NEG DISCRIMINATION (D < 0)' };
                  if (item.flag_status === 'ambiguous_key') flagBadge = { bg: '#fed7aa', text: '#c2410c', label: 'AMBIGUOUS KEY' };

                  return (
                    <tr key={item.question_id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 12px', fontWeight: 700 }}>#{item.question_id}</td>
                      <td style={{ padding: '10px 12px', maxWidth: 300, color: 'var(--navy-900)', fontWeight: 600 }}>
                        {item.statement.length > 70 ? item.statement.slice(0, 70) + '…' : item.statement}
                      </td>
                      <td style={{ padding: '10px 12px', color: '#64748b' }}>{item.topic_code}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center' }}>{item.total_attempts}</td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>
                        {item.difficulty_index_p}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontWeight: 700 }}>
                        {item.discrimination_index_d}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'center', fontFamily: 'monospace' }}>
                        A:{item.distractor_counts['0']} B:{item.distractor_counts['1']} C:{item.distractor_counts['2']} D:{item.distractor_counts['3']}
                      </td>
                      <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                        <span
                          style={{
                            background: flagBadge.bg,
                            color: flagBadge.text,
                            padding: '3px 8px',
                            borderRadius: 4,
                            fontSize: 10,
                            fontWeight: 800,
                          }}
                        >
                          {flagBadge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD / EDIT QUESTION                                                */}
      {/* ========================================================================= */}
      {showQuestionModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 700,
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--navy-900)', margin: 0 }}>
                {editingQuestion ? `Edit Question #${editingQuestion.id}` : 'Create New MCQ Question'}
              </h2>
              <button
                onClick={() => setShowQuestionModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveQuestion}>
              {/* Statement */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Question Statement *
                </label>
                <textarea
                  required
                  rows={3}
                  value={qFormData.statement}
                  onChange={(e) => setQFormData({ ...qFormData, statement: e.target.value })}
                  placeholder="Enter the full question statement..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              {/* 4 Options & Correct Key */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                  Options & Answer Key (Select the correct option) *
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {['A', 'B', 'C', 'D'].map((letter, idx) => (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="correct_option"
                          checked={qFormData.correct_option === idx}
                          onChange={() => setQFormData({ ...qFormData, correct_option: idx })}
                          style={{ width: 18, height: 18, accentColor: '#16a34a' }}
                        />
                        <span
                          style={{
                            fontWeight: 800,
                            color: qFormData.correct_option === idx ? '#16a34a' : '#64748b',
                            fontSize: 13,
                          }}
                        >
                          Option {letter}:
                        </span>
                      </label>
                      <input
                        type="text"
                        required
                        value={qFormData.options[idx]}
                        onChange={(e) => {
                          const newOpts = [...qFormData.options];
                          newOpts[idx] = e.target.value;
                          setQFormData({ ...qFormData, options: newOpts });
                        }}
                        placeholder={`Option ${letter} text`}
                        style={{
                          flex: 1,
                          padding: '7px 12px',
                          borderRadius: 6,
                          border: qFormData.correct_option === idx ? '2px solid #16a34a' : '1px solid #cbd5e1',
                          fontSize: 13,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Metadata Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Syllabus Topic *
                  </label>
                  <select
                    value={qFormData.topic_code}
                    onChange={(e) => setQFormData({ ...qFormData, topic_code: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    {topics.map((t) => (
                      <option key={t.code} value={t.code}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Difficulty
                  </label>
                  <select
                    value={qFormData.difficulty}
                    onChange={(e) => setQFormData({ ...qFormData, difficulty: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Certificate Level
                  </label>
                  <select
                    value={qFormData.certificate_level}
                    onChange={(e) => setQFormData({ ...qFormData, certificate_level: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="common">Common (All Cadets)</option>
                    <option value="A">Certificate A</option>
                    <option value="B">Certificate B</option>
                    <option value="C">Certificate C</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Service Wing
                  </label>
                  <select
                    value={qFormData.wing}
                    onChange={(e) => setQFormData({ ...qFormData, wing: e.target.value })}
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  >
                    <option value="common">Common</option>
                    <option value="army">Army Wing</option>
                    <option value="navy">Naval Wing</option>
                    <option value="air">Air Wing</option>
                  </select>
                </div>
              </div>

              {/* Sub-Topic & Source Reference */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Sub-Topic
                  </label>
                  <input
                    type="text"
                    value={qFormData.sub_topic}
                    onChange={(e) => setQFormData({ ...qFormData, sub_topic: e.target.value })}
                    placeholder="e.g. Words of Command, Sight Alignment"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Handbook Source Reference
                  </label>
                  <input
                    type="text"
                    value={qFormData.source_reference}
                    onChange={(e) => setQFormData({ ...qFormData, source_reference: e.target.value })}
                    placeholder="e.g. NCC Cadet Handbook Ch 3, p. 45"
                    style={{ width: '100%', padding: '7px 10px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                  />
                </div>
              </div>

              {/* Explanation */}
              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Handbook Explanation (Shown to cadets after submission) *
                </label>
                <textarea
                  required
                  rows={2}
                  value={qFormData.explanation}
                  onChange={(e) => setQFormData({ ...qFormData, explanation: e.target.value })}
                  placeholder="Official reference or rationale for the correct answer..."
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowQuestionModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#16a34a',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  {editingQuestion ? 'Save Changes' : 'Create Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADD CUSTOM TOPIC                                                   */}
      {/* ========================================================================= */}
      {showNewTopicModal && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(3px)',
            zIndex: 999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              maxWidth: 480,
              width: '100%',
              padding: 24,
              boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 900, color: 'var(--navy-900)', margin: 0 }}>
                Add Custom Syllabus Topic
              </h2>
              <button
                onClick={() => setShowNewTopicModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b' }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTopic}>
              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Topic Code (snake_case, unique) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. cyber_security, drone_ops"
                  value={newTopicData.code}
                  onChange={(e) => setNewTopicData({ ...newTopicData, code: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Display Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cyber Defence & Electronic Warfare"
                  value={newTopicData.name}
                  onChange={(e) => setNewTopicData({ ...newTopicData, name: e.target.value })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                  Default Blueprint Weightage (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  max="100"
                  value={newTopicData.default_weightage}
                  onChange={(e) => setNewTopicData({ ...newTopicData, default_weightage: parseFloat(e.target.value) || 0 })}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', fontSize: 13 }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowNewTopicModal(false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #cbd5e1',
                    background: '#f8fafc',
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '8px 20px',
                    borderRadius: 6,
                    border: 'none',
                    background: '#1d4ed8',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Add Topic
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
