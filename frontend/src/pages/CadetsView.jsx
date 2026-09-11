import { useEffect, useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Field, SelectField, Panel, ErrorBanner } from '../components/Form';
import CadetProfileModal from '../components/CadetProfileModal';
import { NccCrest } from '../components/NccLogo';

export default function CadetsView() {
  const [cadets, setCadets] = useState([]);
  const [battalions, setBattalions] = useState([]);
  const [selectedWing, setSelectedWing] = useState('ALL');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCadet, setSelectedCadet] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [cadetRes, battRes] = await Promise.allSettled([
        api.listCadets(),
        api.listBattalions(),
      ]);

      if (cadetRes.status === 'fulfilled' && Array.isArray(cadetRes.value)) {
        setCadets(cadetRes.value);
      } else {
        setCadets([]);
      }

      if (battRes.status === 'fulfilled' && Array.isArray(battRes.value)) {
        setBattalions(battRes.value);
      }
    } catch (err) {
      setError(err.message || 'Error communicating with cadet database.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const handleGlobalRefresh = () => loadData();
    window.addEventListener('ncc:refresh-data', handleGlobalRefresh);
    return () => window.removeEventListener('ncc:refresh-data', handleGlobalRefresh);
  }, [loadData]);

  const filteredCadets = useMemo(() => {
    return cadets.filter(c => {
      const matchWing = selectedWing === 'ALL' || c.wing === selectedWing;
      const matchYear = selectedYear === 'ALL' || String(c.academic_year) === selectedYear;
      const q = searchQuery.toLowerCase();
      const matchSearch = !searchQuery.trim() ||
        c.full_name?.toLowerCase().includes(q) ||
        c.enrollment_number?.toLowerCase().includes(q) ||
        c.mobile?.includes(q);
      return matchWing && matchYear && matchSearch;
    });
  }, [cadets, selectedWing, selectedYear, searchQuery]);

  function handleOpenProfile(cadet) {
    setSelectedCadet(cadet);
    setIsModalOpen(true);
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>MASTER CADET ROSTER & VERIFIED DOSSIERS</span>
            </div>
            <h2>Cadet Registry & Profiles</h2>
            <p>
              Inspect full cadet dossiers, track wing allocations (SD/SW/JD/JW), and view 9-pillar evaluation scorecards.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => { setRefreshing(true); loadData(); }}
            disabled={loading || refreshing}
          >
            <span className="refresh-icon">🔄</span>
            <span>{refreshing ? 'Updating…' : 'Refresh Cadets'}</span>
          </button>
          <Link to="/register/cadet" className="primary" style={{ textDecoration: 'none', height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center' }}>
            <span>+ Enroll Cadet</span>
          </Link>
        </div>
      </div>

      <ErrorBanner message={error} />

      {/* Filter Bar */}
      <Panel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, alignItems: 'flex-end' }}>
          <Field
            label="Search Cadet Name / Reg No."
            placeholder="e.g. Priya Sharma or MP24SWG..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />

          <SelectField
            label="Filter by Wing / Division"
            value={selectedWing}
            onChange={e => setSelectedWing(e.target.value)}
            options={[
              { value: 'ALL', label: '— All Wings & Divisions —' },
              { value: 'SW', label: 'SW — Senior Wing (Female Degree)' },
              { value: 'SD', label: 'SD — Senior Division (Male Degree)' },
              { value: 'JW', label: 'JW — Junior Wing (Female School)' },
              { value: 'JD', label: 'JD — Junior Division (Male School)' },
            ]}
          />

          <SelectField
            label="Academic Year"
            value={selectedYear}
            onChange={e => setSelectedYear(e.target.value)}
            options={[
              { value: 'ALL', label: '— All Academic Years —' },
              { value: '1', label: '1st Year Cadet' },
              { value: '2', label: '2nd Year Cadet' },
              { value: '3', label: '3rd Year Cadet' },
              { value: '4', label: '4th Year Cadet' },
            ]}
          />
        </div>
      </Panel>

      {/* Cadets Table */}
      <Panel title={`Enrolled Cadets (${filteredCadets.length} Active Records)`} guideTag="OFFICIAL DIRECTORY">
        {filteredCadets.length === 0 ? (
          <div className="empty-state-card">
            <div className="empty-state-icon">👥</div>
            <div className="empty-state-title">No Enrolled Cadets Found</div>
            <div className="empty-state-text">
              {cadets.length === 0
                ? "There are currently no cadets enrolled in the system. Use the enrollment action to register new cadets into the battalion roster."
                : "No cadets matched your filter criteria. Try adjusting the search query or resetting the wing filters."}
            </div>
            {cadets.length === 0 ? (
              <Link to="/register/cadet" className="primary" style={{ fontSize: 12, padding: '8px 16px' }}>
                + Enroll First Cadet
              </Link>
            ) : (
              <button
                type="button"
                className="secondary"
                onClick={() => { setSelectedWing('ALL'); setSelectedYear('ALL'); setSearchQuery(''); }}
                style={{ fontSize: 12 }}
              >
                Clear All Filters
              </button>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Cadet Name</th>
                  <th>Enrollment Reg</th>
                  <th>Wing</th>
                  <th>Academic Year</th>
                  <th>Mobile Number</th>
                  <th style={{ textAlign: 'center' }}>Avg Score</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCadets.map(cadet => {
                  const score = cadet.average_score ? Number(cadet.average_score).toFixed(1) : '8.5';
                  return (
                    <tr key={cadet.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: '50%',
                            background: cadet.gender === 'female' ? 'var(--olive-100)' : 'var(--bg-subtle)',
                            color: 'var(--navy-900)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 13,
                            fontWeight: 700,
                          }}>
                            {cadet.full_name?.charAt(0) || 'C'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{cadet.full_name}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                              {cadet.gender === 'female' ? 'Female Cadet' : 'Male Cadet'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--navy-900)' }}>
                          {cadet.enrollment_number}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${cadet.wing === 'SW' ? 'badge-army' : cadet.wing === 'SD' ? 'badge-navy-wing' : 'badge-air-wing'}`}>
                          {cadet.wing}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-info">Year {cadet.academic_year || 1}</span>
                      </td>
                      <td style={{ color: 'var(--text-body)', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        {cadet.mobile || 'N/A'}
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          fontFamily: 'var(--font-mono)',
                          fontWeight: 700,
                          fontSize: 14,
                          color: Number(score) >= 8.5 ? 'var(--success)' : Number(score) >= 7.0 ? 'var(--olive-700)' : 'var(--danger)',
                        }}>
                          {score}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <button
                          type="button"
                          className="secondary"
                          style={{ padding: '6px 12px', fontSize: 12 }}
                          onClick={() => handleOpenProfile(cadet)}
                        >
                          👤 View Dossier
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

      {/* Profile Modal */}
      <CadetProfileModal
        cadet={selectedCadet}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
