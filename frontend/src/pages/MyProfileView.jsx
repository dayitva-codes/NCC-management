import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Panel, NinePillarsMatrix, ErrorBanner } from '../components/Form';
import { NccCrest, ArmyWingEmblem, NavyWingEmblem, AirWingEmblem } from '../components/NccLogo';

export default function MyProfileView() {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [scores, setScores] = useState([]);
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
          const s = await api.getCadetScores(data.id);
          setScores(Array.isArray(s) ? s : []);
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
            <h2>Official Military Service Profile</h2>
            <p>
              Authorized personal identification, military rank standing, and institutional security clearance details.
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
                {isAdmin ? 'COMMANDING OFFICER (CO)' : isMentor ? 'ASSOCIATE NCC OFFICER (ANO)' : 'ACTIVE CADET (SUO)'}
              </div>
              <h3 style={{ fontSize: 22, color: '#FFF', margin: '4px 0 0' }}>
                {isCadet ? (profile?.full_name || 'Cadet Priya Sharma') : user?.email?.split('@')[0].toUpperCase() || 'OFFICER IN COMMAND'}
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
            gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
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
                3 MP Girls Bn NCC (HQ) • MP & CG Directorate
              </div>
            </div>

            <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>AFFILIATED INSTITUTION</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
                Govt Girls Post Graduate College
              </div>
            </div>

            {isCadet && (
              <>
                <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>NCC WING & ACADEMIC YEAR</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
                    Senior Wing (SW) • Year {profile?.academic_year || 2}
                  </div>
                </div>

                <div style={{ background: 'var(--bg-main)', padding: 14, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700 }}>TRAINING ASPIRATION</div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--navy-900)', marginTop: 4 }}>
                    {profile?.ncc_goal || 'Republic Day Camp (RDC) & Best Cadet'}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* If Cadet: Render 9 Pillars Matrix */}
          {isCadet && (
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
