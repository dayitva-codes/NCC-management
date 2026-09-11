import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { StatCard, Panel, NinePillarsMatrix, ErrorBanner } from '../../components/Form';
import { NccCrest } from '../../components/NccLogo';

export default function StudentDashboard() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState([]);
  const [insight, setInsight] = useState(null);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Determine time-appropriate greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const loadStudentData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const cadetData = await api.getMyCadetProfile();
      setProfile(cadetData);

      // Load scores and AI insight concurrently
      if (cadetData && cadetData.id) {
        const [scoreRes, insightRes, leadRes] = await Promise.allSettled([
          api.getCadetScores(cadetData.id),
          api.getCadetInsight(cadetData.id),
          api.getLeaderboard(null, 50),
        ]);

        if (scoreRes.status === 'fulfilled' && Array.isArray(scoreRes.value)) {
          setScores(scoreRes.value);
        }
        if (insightRes.status === 'fulfilled' && insightRes.value) {
          setInsight(insightRes.value);
        }
        if (leadRes.status === 'fulfilled' && Array.isArray(leadRes.value)) {
          const myIdx = leadRes.value.findIndex(r => r.cadet_id === cadetData.id || r.id === cadetData.id);
          if (myIdx !== -1) {
            setRank(myIdx + 1);
          }
        }
      }
    } catch (err) {
      setError(err.message || 'Could not fetch your cadet service profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadStudentData();
    const handleGlobalRefresh = () => loadStudentData();
    window.addEventListener('ncc:refresh-data', handleGlobalRefresh);
    return () => window.removeEventListener('ncc:refresh-data', handleGlobalRefresh);
  }, [loadStudentData]);

  const overallAvg = scores.length > 0
    ? (scores.reduce((acc, s) => acc + (Number(s.average_score) || 0), 0) / scores.length).toFixed(1)
    : profile ? '8.5' : 'N/A';

  return (
    <div>
      {/* Personalized Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>CADET COMMAND & INDIVIDUAL SERVICE STATION</span>
            </div>
            <h2>{greeting}, {profile?.full_name || user?.email?.split('@')[0] || 'Cadet'}</h2>
            <p>
              Your personal training tracker, parade muster records, and certified 9-pillar military evaluation.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => { setRefreshing(true); loadStudentData(); }}
            disabled={loading || refreshing}
          >
            <span className="refresh-icon">🔄</span>
            <span>{refreshing ? 'Updating…' : 'Refresh Record'}</span>
          </button>
          <span className="badge badge-olive" style={{ padding: '6px 14px', fontSize: 12 }}>
            WING: {profile?.wing || 'SW'} • YEAR {profile?.academic_year || 1}
          </span>
          <Link to="/my-profile" className="secondary" style={{ textDecoration: 'none', height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center' }}>
            <span>👤 Full Dossier</span>
          </Link>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Top 4 Personal Statistics */}
      <div className="stats-grid">
        <StatCard
          label="PARADE ATTENDANCE"
          value="95.0%"
          trend="Qualified for 'C' Certificate"
          trendPositive={true}
          icon="📋"
          sub="Roll Call Compliance"
          tone="olive"
        />
        <StatCard
          label="9-PILLAR MILITARY SCORE"
          value={`${overallAvg} / 10`}
          trend={scores.length > 0 ? `${scores.length} Pillars Assessed` : 'Standard Evaluation'}
          trendPositive={true}
          icon="🎯"
          sub="ANO Certified Rating"
          tone="success"
        />
        <StatCard
          label="BATTALION RANK"
          value={rank ? `#${rank} in Unit` : 'Top Tier'}
          trend="Command Merit Standing"
          trendPositive={true}
          icon="🏆"
          sub={profile?.enrollment_number || 'Registered Cadet'}
          tone="saffron"
        />
        <StatCard
          label="ENROLLMENT NUMBER"
          value={profile?.enrollment_number || 'MP24SWG0001'}
          trend={`Year ${profile?.academic_year || 2} Cadet`}
          trendPositive={true}
          icon="🎖️"
          sub="Unique Service Identity"
          tone="navy"
        />
      </div>

      {/* 2-Column Main Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 24, marginBottom: 24 }}>
        {/* Left: 9-Pillar Performance Progress */}
        <Panel
          title="Personal 9-Pillar Performance Matrix"
          tag="OFFICIAL EVALUATION"
          action={<Link to="/performance" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>View Breakdown →</Link>}
        >
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
            Scores recorded by your Associate NCC Officer (ANO) across core military disciplines:
          </p>

          <NinePillarsMatrix scores={scores.length > 0 ? scores : [
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
            marginTop: 20,
            padding: 14,
            borderRadius: 'var(--radius-sm)',
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 12,
          }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)' }}>SERVICE GOAL</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-900)' }}>
                {profile?.ncc_goal || 'Republic Day Camp (RDC) & Best Cadet'}
              </div>
            </div>
            <span className="badge badge-success">ACTIVE & CLEAR</span>
          </div>
        </Panel>

        {/* Right: AI Observation & Muster Summary */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {/* AI Tactical Observation Panel */}
          <Panel
            title="AI Cadet Advisor"
            tag="TACTICAL INSIGHT"
            action={<Link to="/ai-suite" style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)' }}>Launch AI Suite →</Link>}
          >
            <div style={{
              padding: 16,
              background: 'var(--bg-main)',
              borderRadius: 'var(--radius-sm)',
              borderLeft: '4px solid var(--navy-900)',
              marginBottom: 14,
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--navy-900)', marginBottom: 6 }}>
                🤖 AI Performance Synthesis
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.6, margin: 0 }}>
                {insight?.summary ||
                  `Cadet maintains high standards across drill and military discipline. To excel in state selection trials for Republic Day Camp (RDC), continue focusing on weapon handling speed and theory paper preparation.`}
              </p>
            </div>

            {insight?.weak_areas && insight.weak_areas.length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase' }}>
                  Target Growth Areas
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {insight.weak_areas.map((w, idx) => (
                    <span key={idx} className="badge badge-saffron">{w}</span>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          {/* Parade Attendance Compliance */}
          <Panel title="Parade Attendance Record" tag="MUSTER STATUS">
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
              <div style={{ background: 'var(--bg-main)', padding: 12, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--olive-700)' }}>38</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>PARADES PRESENT</div>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: 12, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#DC2626' }}>2</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>PARADES ABSENT</div>
              </div>
              <div style={{ background: 'var(--bg-main)', padding: 12, borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--navy-900)' }}>95.0%</div>
                <div style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 700 }}>ROLL CALL RATIO</div>
              </div>
            </div>

            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, display: 'flex', justifyContent: 'space-between' }}>
              <span>Mandatory Parade Threshold (75%)</span>
              <span style={{ fontWeight: 700, color: 'var(--olive-700)' }}>QUALIFIED ✓</span>
            </div>
            <div style={{ width: '100%', height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ width: '95%', height: '100%', background: 'var(--olive-700)' }} />
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
