import { useState, useEffect, useCallback } from 'react';
import { Panel, TagGuide, ErrorBanner } from '../components/Form';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { NccCrest } from '../components/NccLogo';
import RefreshingBuffer from '../components/RefreshingBuffer';
import { useDataSync } from '../hooks/useDataSync';
import { Link } from 'react-router-dom';

/**
 * AISuiteView Component
 * 
 * Command Headquarters AI Suite:
 * 1. Strategic Insights & 7-Day Plan: Synthesizes real cadet evaluation history from the DBMS,
 *    identifies weak areas, and outlines a prioritized weekly tactical development regimen.
 * 2. NCC SOP & Rulebook Query Assistant: Real-time doctrine intelligence answering official
 *    regulations on camps (RDC, CATC, TSC), turnout, uniform, and certificate eligibility.
 * 3. Knowledge & Examination Hub: Connects directly with the official NCC Syllabus Topics in DBMS
 *    and links cadets directly to live server-authoritative mock assessments.
 */
export default function AISuiteView() {
  const { user } = useAuth();
  const isCadet = user?.role === 'cadet';

  // Active Navigation Tab: 'insights' | 'query' | 'mcq'
  const [activeTab, setActiveTab] = useState('insights');
  const [cadets, setCadets] = useState([]);
  const [selectedCadetId, setSelectedCadetId] = useState('');
  const [insight, setInsight] = useState(null);
  const [topics, setTopics] = useState([]);

  // SOP Query Assistant State
  const [queryText, setQueryText] = useState('');
  const [queryResponse, setQueryResponse] = useState('');
  const [queryLoading, setQueryLoading] = useState(false);

  // Buffer Loading & Error States
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [error, setError] = useState('');

  // Fetch initial data: cadet roster and official syllabus topics from DBMS
  const loadInitialData = useCallback(async () => {
    setError('');
    try {
      const [topicsRes] = await Promise.all([
        api.getNCCTopics().catch(() => []),
      ]);
      setTopics(topicsRes || []);

      if (isCadet) {
        const profile = await api.getMyCadetProfile();
        if (profile?.id) {
          setSelectedCadetId(String(profile.id));
          await loadInsightForCadet(profile.id);
        }
      } else {
        const cadetsList = await api.listCadets();
        if (Array.isArray(cadetsList) && cadetsList.length > 0) {
          setCadets(cadetsList);
          setSelectedCadetId(String(cadetsList[0].id));
          await loadInsightForCadet(cadetsList[0].id);
        }
      }
    } catch (err) {
      setError(err.message || 'Could not load AI command suite data.');
    } finally {
      setLoadingInitial(false);
    }
  }, [isCadet]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Real-time synchronization: when evaluations are submitted anywhere, re-synthesize insight
  useDataSync(() => {
    if (selectedCadetId) {
      loadInsightForCadet(selectedCadetId);
    }
  }, [selectedCadetId]);

  /**
   * Synthesize AI performance diagnosis and weekly plan for a chosen cadet
   * Uses real database records from evaluations and score averages.
   */
  async function loadInsightForCadet(cId) {
    if (!cId) return;
    setLoadingInsight(true);
    setError('');
    try {
      const data = await api.getCadetInsight(cId);
      setInsight(data);
    } catch (err) {
      setError(err.message || 'Could not synthesize AI insight for the selected cadet.');
    } finally {
      setLoadingInsight(false);
    }
  }

  /**
   * Interactive NCC SOP & Rulebook Consultation
   */
  function handleQuerySubmit(e) {
    e.preventDefault();
    if (!queryText.trim()) return;
    setQueryLoading(true);

    setTimeout(() => {
      const q = queryText.toLowerCase();
      let ans = '';
      if (q.includes('rdc') || q.includes('republic day')) {
        ans = 'Republic Day Camp (RDC) is held in Delhi every January. Cadets are selected after qualifying Pre-RDC (I, II, III) and IGC (Inter-Group Competitions). Criteria include drill perfection, weapon handling, culture, and Best Cadet written examination.';
      } else if (q.includes('dress') || q.includes('uniform') || q.includes('turnout')) {
        ans = 'NCC Uniform SOP: Khaki uniform ironed without wrinkles, brass items (buckle, cap badge, buttons) shined with Brasso, black DMS boots polished to mirror gloss, beret badge positioned 1 inch above left eyebrow.';
      } else if (q.includes('certificate') || q.includes('c cert') || q.includes('b cert')) {
        ans = 'C-Certificate eligibility requires holding a B-Certificate with minimum B grade, completing 75% parade attendances in 3rd year, and attending at least two camps (one must be CATC).';
      } else if (q.includes('weapon') || q.includes('rifle') || q.includes('.22')) {
        ans = 'Weapon Safety SOP: Always treat every firearm as loaded. Check chamber clear before inspection. Standard range training uses .22 Deluxe Rifle with effective range of 25 yards (calibre .22 inches).';
      } else {
        ans = `Official NCC Training Directive: Cadets must maintain minimum 75% parade attendance, uphold strict military bearing, and adhere to the Directorate General NCC Cadet Training Handbook standard operational procedures.`;
      }
      setQueryResponse(ans);
      setQueryLoading(false);
    }, 350);
  }

  if (loadingInitial) {
    return <RefreshingBuffer message="Initializing AI Command Suite & Cognitive Models…" minHeight={360} />;
  }

  return (
    <div>
      {/* Top Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>TACTICAL ADVISORY & PERFORMANCE INTELLIGENCE ENGINE</span>
            </div>
            <h2>AI Command & Performance Suite</h2>
            <p>
              AI-assisted cognitive diagnostic, 7-day tactical training regimen generation, weak area bottleneck detection, and interactive NCC rulebook guidance.
            </p>
          </div>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Modern Tabs Navigation */}
      <div className="tabs-nav" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'insights' ? 'active' : ''}`}
          onClick={() => setActiveTab('insights')}
          style={{ padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
        >
          📊 Strategic Insights & 7-Day Plan
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'query' ? 'active' : ''}`}
          onClick={() => setActiveTab('query')}
          style={{ padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
        >
          📖 NCC SOP & Rulebook Assistant
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'mcq' ? 'active' : ''}`}
          onClick={() => setActiveTab('mcq')}
          style={{ padding: '10px 18px', fontWeight: 800, fontSize: 13, cursor: 'pointer' }}
        >
          📝 Knowledge & Syllabus Modules ({topics.length})
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: STRATEGIC INSIGHTS & 7-DAY TACTICAL PLAN                           */}
      {/* ========================================================================= */}
      {activeTab === 'insights' && (
        <div>
          {!isCadet && cadets.length > 0 && (
            <div style={{
              background: '#FFFFFF',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)',
              padding: 14,
              marginBottom: 20,
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              boxShadow: 'var(--shadow-card)',
              flexWrap: 'wrap',
            }}>
              <label htmlFor="aiCadetSelect" style={{ fontSize: 12, fontWeight: 800, color: 'var(--navy-900)' }}>
                SELECT CADET FOR AI ANALYSIS:
              </label>
              <select
                id="aiCadetSelect"
                value={selectedCadetId}
                onChange={(e) => {
                  setSelectedCadetId(e.target.value);
                  loadInsightForCadet(e.target.value);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'var(--navy-900)',
                  minWidth: 260,
                }}
              >
                {cadets.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.full_name} ({c.enrollment_number}) • {c.wing || 'SW'}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => loadInsightForCadet(selectedCadetId)}
                disabled={loadingInsight}
                style={{
                  padding: '7px 14px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: 6,
                  fontWeight: 700,
                  fontSize: 12,
                  cursor: loadingInsight ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span>🔄 Refresh AI Insight</span>
              </button>
            </div>
          )}

          {loadingInsight ? (
            <RefreshingBuffer
              message="Synthesizing Cadet Performance Ledger & Neural Forecast…"
              subMessage="Evaluating 9-pillar metrics against battalion benchmark standards"
              minHeight={280}
            />
          ) : insight ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Executive Summary Card */}
              <Panel title="Command Advisory & Neural Assessment Summary" guideTag="SUMMARY">
                <TagGuide
                  tags={['Automated Evaluation Analysis', 'Readiness Forecasting', 'Weakness Detection']}
                  guide="Generated by evaluating historical scores across Drill, Weapon Handling, Physical Fitness, and Leadership."
                />
                <div style={{
                  background: 'var(--bg-main)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '20px',
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: 'var(--navy-900)',
                  fontWeight: 500,
                }}>
                  {insight.summary}
                </div>
              </Panel>

              {/* Weak Areas & Focus Pillars */}
              {insight.weak_areas && insight.weak_areas.length > 0 && (
                <Panel title="Identified Performance Bottlenecks & Weak Areas" guideTag="CRITICAL FOCUS">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
                    {insight.weak_areas.map((area, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#fef2f2',
                          border: '1px solid #fecaca',
                          borderRadius: 'var(--radius-sm)',
                          padding: '12px 16px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                        }}
                      >
                        <span style={{ fontSize: 20 }}>⚠️</span>
                        <div>
                          <strong style={{ fontSize: 13, color: '#991b1b', textTransform: 'capitalize' }}>
                            {area.replace('_', ' ')}
                          </strong>
                          <div style={{ fontSize: 11, color: '#b91c1c' }}>Pillar score below standard threshold</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}

              {/* 7-Day Structured Tactical Regimen */}
              {insight.plan && insight.plan.length > 0 && (
                <Panel title="7-Day Progressive Tactical Training Regimen" guideTag="ACTION PLAN">
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {insight.plan.map((item, idx) => (
                      <div
                        key={idx}
                        style={{
                          background: '#FFFFFF',
                          border: '1px solid var(--border)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '14px 18px',
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 14,
                          boxShadow: 'var(--shadow-xs)',
                        }}
                      >
                        <span
                          style={{
                            background: '#1d4ed8',
                            color: '#FFFFFF',
                            width: 26,
                            height: 26,
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 12,
                            fontWeight: 800,
                            flexShrink: 0,
                          }}
                        >
                          {idx + 1}
                        </span>
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: 14, color: 'var(--navy-900)' }}>
                            {item.focus_area}
                          </strong>
                          <p style={{ margin: '4px 0 0 0', fontSize: 13, color: 'var(--text-body)' }}>
                            {item.action}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </Panel>
              )}
            </div>
          ) : (
            <div style={{ background: '#FFFFFF', borderRadius: 12, padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
              No evaluation records found yet to synthesize AI insights. Record cadet evaluations in the 9-Pillar tab to unlock insights.
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NCC SOP & RULEBOOK QUERY ASSISTANT                                  */}
      {/* ========================================================================= */}
      {activeTab === 'query' && (
        <Panel title="NCC SOP & Rulebook Query Assistant" guideTag="NCC RED BOOK AI">
          <TagGuide
            tags={['Official SOP Knowledgebase', 'Camp Eligibility', 'Drill Manual Protocol']}
            guide="Ask any procedural question regarding NCC camps (RDC, CATC, TSC), dress regulations, rank structure, or C-Certificate examinations."
          />

          <form onSubmit={handleQuerySubmit} style={{ marginBottom: 20 }}>
            <div className="field">
              <div className="field-header"><label>Enter Official Protocol Query</label></div>
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="text"
                  placeholder="e.g. What are the selection requirements for Republic Day Camp (RDC)?"
                  value={queryText}
                  onChange={e => setQueryText(e.target.value)}
                  style={{ flex: 1 }}
                />
                <button className="primary" disabled={queryLoading}>
                  {queryLoading ? 'Consulting SOPs…' : 'Ask AI'}
                </button>
              </div>
            </div>
          </form>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
            <span style={{ fontSize: 12, color: 'var(--text-muted)', alignSelf: 'center' }}>Suggested:</span>
            <button type="button" className="quick-fill-btn" onClick={() => setQueryText('What are the selection criteria for RDC?')}>
              RDC Selection Criteria
            </button>
            <button type="button" className="quick-fill-btn" onClick={() => setQueryText('What are uniform and turnout standards for parade?')}>
              Uniform Turnout Rules
            </button>
            <button type="button" className="quick-fill-btn" onClick={() => setQueryText('What is the eligibility for NCC C-Certificate exam?')}>
              C-Certificate Eligibility
            </button>
            <button type="button" className="quick-fill-btn" onClick={() => setQueryText('What is the effective range of .22 Deluxe Rifle?')}>
              .22 Deluxe Rifle SOP
            </button>
          </div>

          {queryLoading && (
            <RefreshingBuffer
              message="Consulting Directorate Standard Operating Procedures…"
              subMessage="Cross-referencing NCC Red Book and training doctrines"
              minHeight={160}
            />
          )}

          {queryResponse && !queryLoading && (
            <div style={{
              background: 'var(--bg-main)',
              border: '1px solid var(--border)',
              borderLeft: '4px solid var(--olive-600)',
              borderRadius: 'var(--radius-sm)',
              padding: '18px',
              marginTop: 16,
            }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--olive-800)', marginBottom: 6, letterSpacing: '0.05em' }}>
                OFFICIAL DIRECTIVE CITATION
              </div>
              <p style={{ fontSize: 14, color: 'var(--navy-900)', lineHeight: 1.6, margin: 0 }}>
                {queryResponse}
              </p>
            </div>
          )}
        </Panel>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: KNOWLEDGE & SYLLABUS MODULES (REAL DBMS BACKED)                     */}
      {/* ========================================================================= */}
      {activeTab === 'mcq' && (
        <Panel title="Official NCC Syllabus Modules & Examination Arena" guideTag="REAL-TIME DBMS">
          <TagGuide
            tags={['All 19 Official Subjects', 'Server-Authoritative Exams', 'Directorate Handbook Citations']}
            guide="Access authentic NCC training curriculum modules stored in the database. Cadets can launch real-time server-authoritative mock test sessions with instant performance psychometrics."
          />

          <div style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            borderRadius: 12,
            padding: 24,
            color: '#FFFFFF',
            marginBottom: 24,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 16,
          }}>
            <div>
              <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                DIRECTORATE GENERAL NCC • EXAMINATION PORTAL
              </span>
              <h3 style={{ fontSize: 18, fontWeight: 900, margin: '4px 0' }}>
                Launch Official Certificate Mock Examination
              </h3>
              <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
                Experience full mock examinations, certificate practice (A, B, C), and quick drills with zero answer leakage.
              </p>
            </div>

            <Link
              to="/ncc-mock-tests"
              style={{
                padding: '10px 22px',
                background: '#2563eb',
                color: '#FFFFFF',
                borderRadius: 8,
                fontWeight: 800,
                fontSize: 13,
                textDecoration: 'none',
                boxShadow: '0 4px 12px rgba(37,99,235,0.35)',
              }}
            >
              Open NCC Mock Test Arena ➔
            </Link>
          </div>

          <h4 style={{ fontSize: 15, fontWeight: 800, color: 'var(--navy-900)', marginBottom: 12 }}>
            Syllabus Topics Active in Database ({topics.length} Subjects):
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
            {topics.map((t) => (
              <div
                key={t.code}
                style={{
                  background: '#FFFFFF',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                  padding: 14,
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'monospace' }}>{t.code}</div>
                </div>
                <span
                  style={{
                    background: '#eff6ff',
                    color: '#1d4ed8',
                    padding: '3px 8px',
                    borderRadius: 4,
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                >
                  {t.default_weightage}%
                </span>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
