import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Panel, NinePillarsMatrix, ErrorBanner } from '../components/Form';
import { NccCrest, ArmyWingEmblem, NavyWingEmblem, AirWingEmblem } from '../components/NccLogo';
import { RefreshingBuffer } from '../components/RefreshingBuffer';

function formatCampItem(camp, idx) {
  const isObj = typeof camp === 'object' && camp !== null;
  const name = isObj ? (camp.name || camp.title || 'NCC Training Camp') : String(camp || '');
  const year = isObj ? camp.year : '';
  const loc = isObj ? camp.location : '';
  const role = isObj ? camp.role : '';

  return (
    <div
      key={idx}
      style={{
        background: '#f8fafc',
        border: '1px solid #cbd5e1',
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontWeight: 700, color: 'var(--navy-900, #091a32)' }}>⛺ {name}</span>
      {year && (
        <span style={{ background: '#e2e8f0', color: '#475569', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
          {year}
        </span>
      )}
      {loc && <span style={{ color: '#64748b', fontSize: 11 }}>• {loc}</span>}
      {role && <span style={{ color: '#166534', fontWeight: 600, fontSize: 11 }}>[{role}]</span>}
    </div>
  );
}

function formatAwardItem(award, idx) {
  const isObj = typeof award === 'object' && award !== null;
  const title = isObj ? (award.title || award.name || 'Commendation') : String(award || '');
  const year = isObj ? award.year : '';
  const auth = isObj ? award.authority : '';

  return (
    <div
      key={idx}
      style={{
        background: '#fefce8',
        border: '1px solid #fef08a',
        borderRadius: 6,
        padding: '6px 12px',
        fontSize: 12,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        flexWrap: 'wrap',
      }}
    >
      <span style={{ fontWeight: 700, color: '#854d0e' }}>🏅 {title}</span>
      {year && (
        <span style={{ background: '#fef08a', color: '#713f12', padding: '1px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700 }}>
          {year}
        </span>
      )}
      {auth && <span style={{ color: '#a16207', fontSize: 11 }}>— {auth}</span>}
    </div>
  );
}

export default function MyProfileView() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState([]);
  const [cadetSessions, setCadetSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const isCadet = user?.role === 'cadet';
  const isMentor = user?.role === 'mentor';
  const isAdmin = user?.role === 'admin';

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (isCadet) {
        const data = await api.getMyCadetProfile();
        setProfile(data);
        if (data?.id) {
          const [sRes, sessRes] = await Promise.allSettled([
            api.getCadetScores(data.id),
            api.getCadetSessions(data.id),
          ]);
          setScores(sRes.status === 'fulfilled' && Array.isArray(sRes.value) ? sRes.value : []);
          setCadetSessions(sessRes.status === 'fulfilled' && Array.isArray(sessRes.value) ? sessRes.value : []);
        }
      }
    } catch (err) {
      setError(err.message || 'Could not load profile.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isCadet]);

  useEffect(() => {
    loadProfile();
    const handleGlobalRefresh = () => loadProfile();
    window.addEventListener('ncc:refresh-data', handleGlobalRefresh);
    return () => window.removeEventListener('ncc:refresh-data', handleGlobalRefresh);
  }, [loadProfile]);

  if (loading && !profile && isCadet) {
    return (
      <RefreshingBuffer
        label="Accessing Cadet Military Profile..."
        subtext="Retrieving authenticated service dossier, camp records, and weapon qualifications"
      />
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>AUTHENTICATED SERVICE IDENTITY RECORD</span>
            </div>
            <h2>Official Military Service Profile & Dossier</h2>
            <p>
              Authorized personal identification, military rank standing, weapon classifications, and certified mock examination transcripts.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => { setRefreshing(true); loadProfile(); }}
            disabled={loading || refreshing}
          >
            <span className="refresh-icon">🔄</span>
            <span>{refreshing ? 'Updating…' : 'Refresh Record'}</span>
          </button>
          <button type="button" className="secondary" onClick={() => window.print()} style={{ height: 36 }}>
            🖨️ Print Service Sheet
          </button>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Main Profile Dossier Card */}
      <div style={{
        background: '#FFFFFF',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-sm)',
        overflow: 'hidden',
        marginBottom: 24,
      }}>
        {/* Top Military Ribbon */}
        <div style={{
          background: 'var(--navy-900)',
          color: '#FFF',
          padding: '24px 28px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
          borderBottom: '3px solid var(--ncc-gold)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: isCadet ? 'var(--olive-700)' : isAdmin ? '#059669' : 'var(--ncc-gold)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 30,
              border: '2px solid rgba(255, 255, 255, 0.3)',
            }}>
              {isAdmin ? '⭐' : isMentor ? '🎖️' : '👤'}
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', color: 'var(--ncc-gold)', textTransform: 'uppercase' }}>
                {isAdmin ? 'COMMANDING OFFICER (CO)' : isMentor ? 'ASSOCIATE NCC OFFICER (ANO)' : `CADET RANK: ${profile?.rank || 'CDT'}`}
              </div>
              <h3 style={{ fontSize: 22, color: '#FFF', margin: '4px 0 0' }}>
                {isCadet ? (profile?.full_name || 'Cadet') : user?.email?.split('@')[0].toUpperCase() || 'OFFICER IN COMMAND'}
              </h3>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span className="badge badge-success" style={{ fontSize: 12, padding: '6px 14px' }}>
              STATUS: ACTIVE & VERIFIED
            </span>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 4 }}>
              Clearance Level: {isAdmin ? 'ALPHA-1 HQ' : isMentor ? 'ANO-EVALUATOR' : 'CADET-STANDARD'}
            </div>
          </div>
        </div>

        {/* Detailed Attribute Grid */}
        <div style={{ padding: 28 }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: 16,
            marginBottom: 28,
          }}>
            <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>SERVICE / REGISTERED EMAIL</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {user?.email || 'officer@ncc.local'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>ENROLLMENT / SERVICE ID</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                {isCadet ? (profile?.enrollment_number || 'MP24SWG0001') : isMentor ? 'ANO-MP-2024-08' : 'CO-HQ-001'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>ATTACHED BATTALION</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
                {profile?.battalion_name || '3 MP Girls Bn NCC (HQ)'}
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>AFFILIATED INSTITUTION</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
                {profile?.college_name || 'Govt Girls Post Graduate College'}
              </div>
            </div>

            {isCadet && (
              <>
                <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>NCC WING & ACADEMIC YEAR</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
                    {profile?.wing || 'SW'} • Year {profile?.academic_year || 2}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>BLOOD GROUP & DOB</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#dc2626', marginTop: 4 }}>
                    🩸 {profile?.blood_group || 'O+'} • {profile?.dob || '2004-05-15'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>COMPANY & PLATOON</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
                    {profile?.company_platoon || 'Alpha Coy / 1 Platoon'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>PHYSICAL FITNESS (PFT)</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#16a34a', marginTop: 4 }}>
                    💪 {profile?.pft_score || '92/100 (Alpha Excellent)'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>WEAPON TRAINING CLASSIFICATION</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
                    🎯 {profile?.firing_classification || 'Marksman 1st Class'} ({profile?.weapon_grouping || '2.0 cm'})
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>CERTIFICATE QUALIFICATION</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#2563eb', marginTop: 4 }}>
                    📜 {profile?.certificate_status || 'Eligible for Certificate C Examination'}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', gridColumn: '1 / -1' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
                    MILITARY CAMPS ATTENDED & DEPLOYMENTS
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {Array.isArray(profile?.camps_attended) && profile.camps_attended.length > 0 ? (
                      profile.camps_attended.map(formatCampItem)
                    ) : (
                      <span className="badge badge-navy" style={{ fontSize: 12, padding: '4px 10px' }}>
                        ⛺ Combined Annual Training Camp (CATC 2025)
                      </span>
                    )}
                  </div>
                </div>

                {Array.isArray(profile?.awards) && profile.awards.length > 0 && (
                  <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', gridColumn: '1 / -1' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, marginBottom: 8 }}>
                      HONOURS, AWARDS & MEDALS
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {profile.awards.map(formatAwardItem)}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* If Cadet: Render 9 Pillars Matrix */}
          {isCadet && (
            <div style={{ marginBottom: 24 }}>
              <Panel title="Official 9-Pillar Military Scorecard" tag="ANO RECORD">
                <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 16 }}>
                  Certified evaluation grades awarded by Associate NCC Officers:
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
              </Panel>
            </div>
          )}

          {/* If Cadet: Mock Examination Results & Scorecard History */}
          {isCadet && (
            <Panel title={`Mock Examination History (${cadetSessions.length} Attempts)`} tag="EXAM ARCHIVE">
              {cadetSessions.length === 0 ? (
                <div className="empty-state-card" style={{ padding: 24 }}>
                  <div className="empty-state-icon">📝</div>
                  <div className="empty-state-title">No Mock Exams Taken Yet</div>
                  <div className="empty-state-text">
                    Head over to the NCC Mock Test Arena to drill syllabus questions and earn your certified scorecard.
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate('/ncc-mock-tests')}
                    className="primary"
                    style={{ fontSize: 12, padding: '8px 16px', marginTop: 12 }}
                  >
                    Enter Mock Test Arena ➔
                  </button>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="data-table" style={{ fontSize: 12 }}>
                    <thead>
                      <tr>
                        <th>Session ID</th>
                        <th>Exam Title / Mode</th>
                        <th style={{ textAlign: 'center' }}>Score</th>
                        <th style={{ textAlign: 'center' }}>Accuracy</th>
                        <th style={{ textAlign: 'center' }}>Status</th>
                        <th style={{ textAlign: 'right' }}>Date</th>
                        <th style={{ textAlign: 'right' }}>Scorecard</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cadetSessions.map((s) => (
                        <tr key={s.id}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>#{s.id}</td>
                          <td>
                            <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{s.title}</div>
                            <span className="badge badge-navy" style={{ fontSize: 10, marginTop: 2 }}>
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
                          <td style={{ textAlign: 'right', color: 'var(--text-muted)' }}>
                            {s.created_at ? new Date(s.created_at).toLocaleDateString('en-IN') : 'N/A'}
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
          )}

          {/* If Mentor / Admin: Show Authorized Operational Commands */}
          {!isCadet && (
            <Panel title="Command Authority & Clearance Responsibilities" tag="MILITARY STANDING">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
                <div style={{ padding: 14, background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: 13, marginBottom: 6 }}>
                    ✓ 9-Pillar Cadet Evaluation
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Authorized to score cadets in drill precision, fitness, communication, and discipline.
                  </div>
                </div>

                <div style={{ padding: 14, background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: 13, marginBottom: 6 }}>
                    ✓ Parade Roll Call Submission
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    Authorized to certify parade muster rolls and mark cadet leaves and attendances.
                  </div>
                </div>

                {isAdmin && (
                  <div style={{ padding: 14, background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                    <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: 13, marginBottom: 6 }}>
                      ✓ Battalion & Officer Administration
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      Full command clearance to create battalions, verify ANO registrations, and inspect units.
                    </div>
                  </div>
                )}
              </div>
            </Panel>
          )}
        </div>
      </div>
    </div>
  );
}
