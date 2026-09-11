import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Panel, StatCard, ErrorBanner } from '../components/Form';
import { NccCrest, ArmyWingEmblem, NavyWingEmblem, AirWingEmblem } from '../components/NccLogo';

export default function DivisionsView() {
  const [cadets, setCadets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadCadets = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.listCadets();
      if (Array.isArray(data)) {
        setCadets(data);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadCadets();
    const handleGlobalRefresh = () => loadCadets();
    window.addEventListener('ncc:refresh-data', handleGlobalRefresh);
    return () => window.removeEventListener('ncc:refresh-data', handleGlobalRefresh);
  }, [loadCadets]);

  const counts = {
    SW: cadets.filter(c => c.wing === 'SW').length,
    SD: cadets.filter(c => c.wing === 'SD').length,
    JW: cadets.filter(c => c.wing === 'JW').length,
    JD: cadets.filter(c => c.wing === 'JD').length,
  };

  const divisions = [
    {
      code: 'SW',
      title: 'Senior Wing',
      target: 'Female College & Degree Students',
      age: '18 - 26 Years',
      training: '3 Years (B & C Certificates)',
      cadets: counts.SW,
      readiness: counts.SW > 0 ? '94%' : 'N/A',
      camps: ['RDC (Republic Day Camp)', 'CATC', 'NIC (National Integration)', 'EBSB (Ek Bharat Shreshtha Bharat)'],
      badge: 'badge-army',
      icon: <ArmyWingEmblem size={28} />,
    },
    {
      code: 'SD',
      title: 'Senior Division',
      target: 'Male College & Degree Students',
      age: '18 - 26 Years',
      training: '3 Years (B & C Certificates)',
      cadets: counts.SD,
      readiness: counts.SD > 0 ? '92%' : 'N/A',
      camps: ['TSC (Thal Sainik Camp)', 'RDC', 'CATC', 'Army Attachment Camp'],
      badge: 'badge-navy-wing',
      icon: <NavyWingEmblem size={28} />,
    },
    {
      code: 'JW',
      title: 'Junior Wing',
      target: 'Female High School Students (Class 8-10)',
      age: '13 - 18.5 Years',
      training: '2 Years (A Certificate)',
      cadets: counts.JW,
      readiness: counts.JW > 0 ? '90%' : 'N/A',
      camps: ['CATC', 'Mini-NIC', 'Trekking Camp'],
      badge: 'badge-air-wing',
      icon: <AirWingEmblem size={28} />,
    },
    {
      code: 'JD',
      title: 'Junior Division',
      target: 'Male High School Students (Class 8-10)',
      age: '13 - 18.5 Years',
      training: '2 Years (A Certificate)',
      cadets: counts.JD,
      readiness: counts.JD > 0 ? '89%' : 'N/A',
      camps: ['CATC', 'Mini-NIC', 'Obstacle Course Training'],
      badge: 'badge-gold',
      icon: <span style={{ fontSize: 22 }}>🎖️</span>,
    },
  ];

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>ORGANIZATIONAL WINGS & CADRE DIVISION</span>
            </div>
            <h2>Divisions & Wings Structure</h2>
            <p>
              Official categorization matrix for Senior Division (SD), Senior Wing (SW), Junior Division (JD), and Junior Wing (JW) cadettes.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={() => { setRefreshing(true); loadCadets(); }}
          disabled={loading || refreshing}
        >
          <span className="refresh-icon">🔄</span>
          <span>{refreshing ? 'Updating…' : 'Refresh Strength'}</span>
        </button>
      </div>

      <ErrorBanner message={error} />

      <div className="stat-grid">
        <StatCard label="Senior Wing (SW) Strength" value={`${counts.SW} Cadets`} icon="👩" tone="navy" sub="Female Degree Cadets" />
        <StatCard label="Senior Division (SD) Strength" value={`${counts.SD} Cadets`} icon="👨" tone="olive" sub="Male Degree Cadets" />
        <StatCard label="Junior Wing (JW) Strength" value={`${counts.JW} Cadets`} icon="👧" tone="saffron" sub="Female School Cadets" />
        <StatCard label="Junior Division (JD) Strength" value={`${counts.JD} Cadets`} icon="👦" tone="info" sub="Male School Cadets" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 20 }}>
        {divisions.map(div => (
          <Panel key={div.code} title={`${div.code} — ${div.title}`} guideTag={div.code}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {div.icon}
                  <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Target Demographic</span>
                </div>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-900)' }}>{div.target}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Age Bracket</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-900)' }}>{div.age}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Curriculum Duration</span>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--navy-900)' }}>{div.training}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Enrolled Strength</span>
                <span className={`badge ${div.badge}`}>{div.cadets} Cadets</span>
              </div>

              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>
                  ELIGIBLE CAMPS & ACTIVITIES
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {div.camps.map(c => (
                    <span key={c} className="badge badge-olive">{c}</span>
                  ))}
                </div>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
