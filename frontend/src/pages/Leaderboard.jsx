import { useEffect, useState, useMemo, useCallback } from 'react';
import { api } from '../api/client';
import { Field, SelectField, Panel, ErrorBanner } from '../components/Form';
import CadetProfileModal from '../components/CadetProfileModal';
import { NccCrest } from '../components/NccLogo';
import { RefreshingBuffer } from '../components/RefreshingBuffer';
import { useDataSync } from '../hooks/useDataSync';

/**
 * ==============================================================================
 * LEADERBOARD: BATTALION COMMAND MERIT STANDINGS
 * ==============================================================================
 * Ranks all enrolled cadets across battalions by their composite 9-pillar military score:
 * - Dynamically filters by Battalion and searches by cadet name or regimental number.
 * - Displays gold/silver/bronze podium for top 3 cadet performers.
 * - Integrates `useDataSync` to immediately reflect newly entered evaluations in rankings.
 * ==============================================================================
 */
export default function Leaderboard() {
  const [battalionId, setBattalionId] = useState('');
  const [battalions, setBattalions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [rows, setRows] = useState([]);
  const [selectedCadet, setSelectedCadet] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadLeaderboard = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getLeaderboard(battalionId || null, 50);
      if (Array.isArray(data)) {
        setRows(data);
      } else {
        setRows([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [battalionId]);

  useEffect(() => {
    loadLeaderboard();
    api.listBattalions().then(setBattalions).catch(() => {});
  }, [loadLeaderboard]);

  // Automated sync when evaluations or cadets are updated
  useDataSync(loadLeaderboard);

  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase();
    return rows.filter(r =>
      r.full_name?.toLowerCase().includes(q) ||
      r.enrollment_number?.toLowerCase().includes(q)
    );
  }, [rows, searchQuery]);

  const topThree = filteredRows.slice(0, 3);

  function handleInspectCadet(row) {
    setSelectedCadet({
      id: row.cadet_id || row.id,
      full_name: row.full_name,
      enrollment_number: row.enrollment_number,
      wing: row.wing || 'SW',
      average_score: row.average_score,
    });
    setIsModalOpen(true);
  }

  if (loading && rows.length === 0) {
    return (
      <RefreshingBuffer
        label="Compiling Directorate Merit Roster..."
        subtext="Synthesizing multi-wing 9-pillar ratings from database"
      />
    );
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>BATTALION MERIT STANDINGS & COMPOSITE RANKS</span>
            </div>
            <h2>Command Merit Leaderboard</h2>
            <p>
              Real-time cadet merit rankings computed from verified ANO evaluations across drill, physical fitness, discipline, and leadership.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={() => { setRefreshing(true); loadLeaderboard(); }}
          disabled={loading || refreshing}
        >
          <span className="refresh-icon">🔄</span>
          <span>{refreshing ? 'Updating…' : 'Refresh Standings'}</span>
        </button>
      </div>

      <ErrorBanner message={error} />

      {/* Filter Bar */}
      <Panel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
          <Field
            label="Instant Search Cadet"
            placeholder="Search cadet name, reg. no..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          <SelectField
            label="Filter by Battalion"
            value={battalionId}
            onChange={e => setBattalionId(e.target.value)}
            options={[
              { value: '', label: '— All Battalions (Directorate Wide) —' },
              ...battalions.map(b => ({ value: b.id, label: `${b.name} (${b.code})` })),
            ]}
          />

          <div style={{ display: 'flex', gap: 8 }}>
            <button className="primary" type="button" onClick={loadLeaderboard} disabled={loading} style={{ flex: 1, height: 38 }}>
              {loading ? 'Refreshing…' : 'Query Rankings'}
            </button>
            {battalionId && (
              <button className="secondary" type="button" onClick={() => setBattalionId('')} style={{ height: 38 }}>
                Clear
              </button>
            )}
          </div>
        </div>
      </Panel>

      {/* Top 3 Podium Cards */}
      {topThree.length >= 1 && (
        <div className="podium-grid">
          {/* Silver Rank 2 */}
          {topThree[1] && (
            <div className="podium-card silver">
              <div className="podium-medal">🥈</div>
              <span className="badge badge-navy">2ND POSITION</span>
              <div className="podium-name">{topThree[1].full_name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                {topThree[1].enrollment_number}
              </div>
              <div className="podium-score">
                {Number(topThree[1].average_score).toFixed(2)}
              </div>
              <button
                type="button"
                className="secondary"
                style={{ padding: '4px 12px', fontSize: 11, marginTop: 6 }}
                onClick={() => handleInspectCadet(topThree[1])}
              >
                Inspect Dossier
              </button>
            </div>
          )}

          {/* Gold Rank 1 */}
          {topThree[0] && (
            <div className="podium-card gold">
              <div className="podium-medal">🏆</div>
              <span className="badge badge-gold">1ST POSITION — BEST CADET</span>
              <div className="podium-name" style={{ fontSize: 18 }}>{topThree[0].full_name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                {topThree[0].enrollment_number}
              </div>
              <div className="podium-score" style={{ fontSize: 32, color: 'var(--ncc-gold)' }}>
                {Number(topThree[0].average_score).toFixed(2)}
              </div>
              <button
                type="button"
                className="primary"
                style={{ padding: '6px 14px', fontSize: 12, marginTop: 6 }}
                onClick={() => handleInspectCadet(topThree[0])}
              >
                🎖️ Inspect Best Cadet Dossier
              </button>
            </div>
          )}

          {/* Bronze Rank 3 */}
          {topThree[2] && (
            <div className="podium-card bronze">
              <div className="podium-medal">🥉</div>
              <span className="badge badge-saffron">3RD POSITION</span>
              <div className="podium-name">{topThree[2].full_name}</div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                {topThree[2].enrollment_number}
              </div>
              <div className="podium-score">
                {Number(topThree[2].average_score).toFixed(2)}
              </div>
              <button
                type="button"
                className="secondary"
                style={{ padding: '4px 12px', fontSize: 11, marginTop: 6 }}
                onClick={() => handleInspectCadet(topThree[2])}
              >
                Inspect Dossier
              </button>
            </div>
          )}
        </div>
      )}

      {/* Standings Table */}
      <Panel title={`Full Merit Standings (${filteredRows.length} Cadets Evaluated)`} guideTag="DIRECTORATE ROLL">
        {filteredRows.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon">🏆</div>
            <div className="empty-state-title">No Merit Rankings Yet</div>
            <div className="empty-state-text">
              Rankings are calculated automatically once Associate NCC Officers record 9-pillar evaluation scores for cadets.
            </div>
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Rank</th>
                  <th>Cadet Name</th>
                  <th>Enrollment Reg</th>
                  <th>Wing</th>
                  <th style={{ textAlign: 'right' }}>Composite Score</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredRows.map((r, idx) => {
                  const rank = idx + 1;
                  const score = Number(r.average_score).toFixed(2);
                  return (
                    <tr key={r.cadet_id || r.id || idx}>
                      <td>
                        <span className={`badge ${rank === 1 ? 'badge-gold' : rank === 2 ? 'badge-navy' : rank === 3 ? 'badge-olive' : 'badge-info'}`}>
                          #{rank}
                        </span>
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                        {r.full_name}
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>
                        {r.enrollment_number}
                      </td>
                      <td>
                        <span className="badge badge-navy">{r.wing || 'SW'}</span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color: Number(score) >= 8.5 ? 'var(--success)' : 'var(--olive-700)' }}>
                        {score} / 10
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: '4px 10px', fontSize: 11 }}
                          onClick={() => handleInspectCadet(r)}
                        >
                          Dossier
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

      <CadetProfileModal
        cadet={selectedCadet}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
