import { useEffect, useState, useCallback } from 'react';
import { api } from '../api/client';
import { Field, SelectField, Panel, ErrorBanner, SuccessBanner, TagGuide } from '../components/Form';
import { NccCrest } from '../components/NccLogo';

export default function BattalionsView() {
  const [battalions, setBattalions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [activeTab, setActiveTab] = useState('list');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [battForm, setBattForm] = useState({ name: '', code: '' });
  const [collForm, setCollForm] = useState({ battalion_id: '', name: '', academic_year_start: '2026' });

  const refreshData = useCallback(async () => {
    setError('');
    try {
      const [battRes, collRes] = await Promise.allSettled([
        api.listBattalions(),
        api.listColleges(),
      ]);
      if (battRes.status === 'fulfilled' && Array.isArray(battRes.value)) {
        setBattalions(battRes.value);
      }
      if (collRes.status === 'fulfilled' && Array.isArray(collRes.value)) {
        setColleges(collRes.value);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    refreshData();
    const handleGlobalRefresh = () => refreshData();
    window.addEventListener('ncc:refresh-data', handleGlobalRefresh);
    return () => window.removeEventListener('ncc:refresh-data', handleGlobalRefresh);
  }, [refreshData]);

  async function createBattalion(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const cleanCode = battForm.code.trim().toUpperCase();
    if (cleanCode.length < 3 || cleanCode.length > 12) {
      setError('Battalion Code Rule: Code must be between 3 and 12 alphanumeric characters.');
      return;
    }
    setBusy(true);
    try {
      await api.createBattalion({ ...battForm, code: cleanCode });
      setSuccess(`Battalion "${battForm.name}" [${cleanCode}] established successfully.`);
      setBattForm({ name: '', code: '' });
      refreshData();
      setActiveTab('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function createCollege(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    if (!collForm.battalion_id) {
      setError('Please select a parent battalion.');
      return;
    }
    const year = parseInt(collForm.academic_year_start);
    if (isNaN(year) || year < 2000 || year > 2050) {
      setError('Academic Year Rule: Start year must be a valid 4-digit year.');
      return;
    }
    setBusy(true);
    try {
      await api.createCollege({
        ...collForm,
        battalion_id: parseInt(collForm.battalion_id),
        academic_year_start: year,
      });
      setSuccess(`College "${collForm.name}" attached successfully.`);
      setCollForm({ battalion_id: '', name: '', academic_year_start: '2026' });
      refreshData();
      setActiveTab('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <NccCrest size={48} />
          <div>
            <div className="page-eyebrow">
              <span className="dot" />
              <span>UNIT STRUCTURE & ATTACHMENT REGISTRY</span>
            </div>
            <h2>Battalions & Colleges</h2>
            <p>
              Manage organizational units, establish new battalions, and attach collegiate institutions across the state directorate.
            </p>
          </div>
        </div>

        <button
          type="button"
          className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
          onClick={() => { setRefreshing(true); refreshData(); }}
          disabled={busy || refreshing}
        >
          <span className="refresh-icon">🔄</span>
          <span>{refreshing ? 'Updating…' : 'Refresh Directory'}</span>
        </button>
      </div>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      {/* Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          🏛️ Units & Colleges Directory ({battalions.length} Battalions, {colleges.length} Colleges)
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'add-battalion' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-battalion')}
        >
          ➕ Establish New Battalion
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'add-college' ? 'active' : ''}`}
          onClick={() => setActiveTab('add-college')}
        >
          📎 Attach College Unit
        </button>
      </div>

      {activeTab === 'list' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: 24 }}>
          {/* Battalions List */}
          <Panel title={`Established Battalions (${battalions.length})`} guideTag="COMMAND UNITS">
            {battalions.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-title">No Battalions Configured</div>
                <button type="button" className="primary" onClick={() => setActiveTab('add-battalion')} style={{ fontSize: 12, marginTop: 8 }}>
                  + Establish Battalion
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>Unit ID</th>
                      <th>Battalion Title</th>
                      <th>Code</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {battalions.map(b => (
                      <tr key={b.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--navy-900)' }}>
                          #{b.id}
                        </td>
                        <td style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{b.name}</td>
                        <td><span className="badge badge-navy">{b.code}</span></td>
                        <td><span className="badge badge-success">ACTIVE</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>

          {/* Colleges List */}
          <Panel title={`Affiliated Colleges & Institutes (${colleges.length})`} guideTag="CAMPUS UNITS">
            {colleges.length === 0 ? (
              <div className="empty-state-card">
                <div className="empty-state-title">No Colleges Attached</div>
                <button type="button" className="secondary" onClick={() => setActiveTab('add-college')} style={{ fontSize: 12, marginTop: 8 }}>
                  + Attach College Unit
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table>
                  <thead>
                    <tr>
                      <th>College Name</th>
                      <th>Parent Unit</th>
                      <th>Session</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {colleges.map(c => (
                      <tr key={c.id}>
                        <td style={{ fontWeight: 600, color: 'var(--navy-900)' }}>{c.name}</td>
                        <td>
                          <span className="badge badge-olive">Battalion #{c.battalion_id}</span>
                        </td>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.academic_year_start || 2026}</td>
                        <td><span className="badge badge-success">AFFILIATED</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Panel>
        </div>
      )}

      {activeTab === 'add-battalion' && (
        <Panel title="Establish New Battalion Unit" guideTag="HQ ESTABLISHMENT">
          <TagGuide
            tags={['Unique Code Required', '3 to 12 Alphanumeric', 'Directorate Authorization']}
            guide="Battalion code must be uniquely identifiable across all NCC state directorates (e.g. 3MPGBN, 1MPSIG, 4DELHI)."
          />
          <form onSubmit={createBattalion}>
            <div className="field-row">
              <Field
                label="Battalion Title"
                required
                placeholder="e.g. 3 MP Girls Battalion NCC"
                value={battForm.name}
                onChange={e => setBattForm({ ...battForm, name: e.target.value })}
              />
              <Field
                label="Battalion Code"
                required
                hint="3-12 Alphanumeric"
                placeholder="e.g. 3MPGBN"
                value={battForm.code}
                onChange={e => setBattForm({ ...battForm, code: e.target.value.toUpperCase() })}
              />
            </div>
            <button className="primary" disabled={busy}>
              {busy ? 'CREATING UNIT…' : 'ESTABLISH BATTALION'}
            </button>
          </form>
        </Panel>
      )}

      {activeTab === 'add-college' && (
        <Panel title="Attach Collegiate Unit to Battalion" guideTag="COLLEGE ATTACHMENT">
          <TagGuide
            tags={['Affiliation Hierarchy', 'Valid Academic Session', 'Cadet Intake']}
            guide="Cadets enrolled under this college will automatically report to the assigned parent battalion."
          />
          <form onSubmit={createCollege}>
            <div className="field-row">
              <SelectField
                label="Parent Battalion"
                required
                value={collForm.battalion_id}
                onChange={e => setCollForm({ ...collForm, battalion_id: e.target.value })}
                options={[
                  { value: '', label: '— Select Parent Battalion —' },
                  ...battalions.map(b => ({ value: b.id, label: `${b.name} (${b.code})` })),
                ]}
              />
              <Field
                label="College / Institute Name"
                required
                placeholder="e.g. Govt Science Autonomous College"
                value={collForm.name}
                onChange={e => setCollForm({ ...collForm, name: e.target.value })}
              />
              <Field
                label="Academic Year Start"
                type="number"
                required
                limitRule="4-digit year (e.g. 2026)"
                value={collForm.academic_year_start}
                onChange={e => setCollForm({ ...collForm, academic_year_start: e.target.value })}
              />
            </div>
            <button className="primary" disabled={busy}>
              {busy ? 'ATTACHING COLLEGE…' : 'ATTACH COLLEGE TO BATTALION'}
            </button>
          </form>
        </Panel>
      )}
    </div>
  );
}
