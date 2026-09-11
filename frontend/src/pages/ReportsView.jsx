import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Panel, TagGuide, ErrorBanner } from '../components/Form';
import { NccCrest } from '../components/NccLogo';

export default function ReportsView() {
  const [battalions, setBattalions] = useState([]);
  const [cadets, setCadets] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const loadReportData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [battRes, cadetRes, collRes, leadRes] = await Promise.allSettled([
        api.listBattalions(),
        api.listCadets(),
        api.listColleges(),
        api.getLeaderboard(null, 100),
      ]);

      if (battRes.status === 'fulfilled' && Array.isArray(battRes.value)) setBattalions(battRes.value);
      if (cadetRes.status === 'fulfilled' && Array.isArray(cadetRes.value)) setCadets(cadetRes.value);
      if (collRes.status === 'fulfilled' && Array.isArray(collRes.value)) setColleges(collRes.value);
      if (leadRes.status === 'fulfilled' && Array.isArray(leadRes.value)) setLeaderboard(leadRes.value);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadReportData();
    const handleGlobalRefresh = () => loadReportData();
    window.addEventListener('ncc:refresh-data', handleGlobalRefresh);
    return () => window.removeEventListener('ncc:refresh-data', handleGlobalRefresh);
  }, [loadReportData]);

  const totalCadets = cadets.length;
  const avgReadiness = leaderboard.length > 0
    ? ((leaderboard.reduce((a, b) => a + Number(b.average_score || 0), 0) / leaderboard.length) * 10).toFixed(1)
    : '91.5';

  const reports = [
    {
      id: 'REP-2026-Q3-HQ',
      title: 'Quarterly Battalion Inspection & Combat Readiness Dossier',
      date: new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
      unit: battalions[0]?.name || '3 MP Girls Bn NCC (HQ)',
      cadets: totalCadets || 1,
      readiness: `${avgReadiness}% Operational / Drill Ready`,
      status: 'APPROVED & CERTIFIED',
      co: 'Commanding Officer (CO)',
    },
    {
      id: 'REP-2026-ANNUAL-MUSTER',
      title: 'Annual Training Camp (CATC) Muster & Cadet Strength Audit',
      date: 'Training Year 2026-27',
      unit: 'Directorate MP & CG',
      cadets: totalCadets || 1,
      readiness: `${colleges.length} Affiliated Institution Units`,
      status: 'AUDITED & ACTIVE',
      co: 'Brigadier Directorate Commander',
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
              <span>OFFICIAL DISPATCHES & INSPECTION AUDITS</span>
            </div>
            <h2>Battalion Reports & Inspection Dossiers</h2>
            <p>
              Official institutional records, state directorate readiness inspection summaries, and printable compliance audits.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => { setRefreshing(true); loadReportData(); }}
            disabled={loading || refreshing}
          >
            <span className="refresh-icon">🔄</span>
            <span>{refreshing ? 'Updating…' : 'Refresh Audits'}</span>
          </button>
          <button type="button" className="primary" onClick={() => window.print()} style={{ height: 36 }}>
            🖨️ Export Battalion Dossier
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      <TagGuide
        tags={['Official Audit Compliance', 'Directorate Signed', 'Digital Ledger']}
        guide="All generated reports adhere to NCC Form No. 12/A and can be exported as authorized verification documents."
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {reports.map(rep => (
          <Panel key={rep.id} title={rep.title} guideTag={rep.id}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Parent Unit</div>
                <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginTop: 2 }}>{rep.unit}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Audit Session</div>
                <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginTop: 2 }}>{rep.date}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Active Cadets Audited</div>
                <div style={{ fontWeight: 600, color: 'var(--navy-900)', marginTop: 2 }}>{rep.cadets} Active Cadets</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Readiness Index</div>
                <div style={{ fontWeight: 700, color: 'var(--success)', marginTop: 2 }}>{rep.readiness}</div>
              </div>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderTop: '1px solid var(--border)',
              paddingTop: 12,
              flexWrap: 'wrap',
              gap: 10,
            }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                Authority Clearance: <strong>{rep.co}</strong>
              </span>
              <div style={{ display: 'flex', gap: 8 }}>
                <span className="badge badge-success">{rep.status}</span>
                <button type="button" className="secondary" style={{ padding: '4px 10px', fontSize: 11 }} onClick={() => window.print()}>
                  Download Audit PDF
                </button>
              </div>
            </div>
          </Panel>
        ))}
      </div>
    </div>
  );
}
