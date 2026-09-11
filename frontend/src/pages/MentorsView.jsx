import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { Field, Panel, ErrorBanner, SuccessBanner, TagGuide } from '../components/Form';
import { NccCrest } from '../components/NccLogo';

export default function MentorsView() {
  const [mentors, setMentors] = useState([]);
  const [verifyUserId, setVerifyUserId] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadMentors = useCallback(async () => {
    setError('');
    try {
      const data = await api.listMentors();
      if (Array.isArray(data)) {
        setMentors(data);
      } else {
        setMentors([]);
      }
    } catch (err) {
      setError(err.message || 'Could not load mentors list.');
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadMentors();
    const handleGlobalRefresh = () => loadMentors();
    window.addEventListener('ncc:refresh-data', handleGlobalRefresh);
    return () => window.removeEventListener('ncc:refresh-data', handleGlobalRefresh);
  }, [loadMentors]);

  async function verifyMentor(e) {
    e.preventDefault();
    setError(''); setSuccess('');
    const uid = parseInt(verifyUserId);
    if (isNaN(uid) || uid <= 0) {
      setError('User ID must be a positive integer.');
      return;
    }
    setBusy(true);
    try {
      await api.verifyMentor(uid);
      setSuccess(`Officer (User ID #${uid}) successfully verified and authorized for cadet evaluation.`);
      setVerifyUserId('');
      loadMentors();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleQuickVerify(userId) {
    setError(''); setSuccess('');
    setBusy(true);
    try {
      await api.verifyMentor(userId);
      setSuccess(`Officer (User ID #${userId}) verified and granted 9-pillar evaluation rights.`);
      loadMentors();
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
              <span>ASSOCIATE NCC OFFICERS & EVALUATION CADRE</span>
            </div>
            <h2>Mentors & Officer Registry</h2>
            <p>
              Inspect authorized Associate NCC Officers (ANOs), manage institutional evaluation scopes, and clear new officers for cadet assessment.
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`refresh-btn ${refreshing ? 'spinning' : ''}`}
            onClick={() => { setRefreshing(true); loadMentors(); }}
            disabled={busy || refreshing}
          >
            <span className="refresh-icon">🔄</span>
            <span>{refreshing ? 'Updating…' : 'Refresh Officers'}</span>
          </button>
          <Link to="/register/mentor" className="primary" style={{ textDecoration: 'none', height: 36, padding: '0 14px', display: 'inline-flex', alignItems: 'center' }}>
            <span>+ Register ANO</span>
          </Link>
        </div>
      </div>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(380px, 1fr))', gap: 24 }}>
        {/* Verification Card */}
        <Panel title="Authorize & Verify Mentor Account" guideTag="COMMAND CLEARANCE">
          <TagGuide
            tags={['Security Clearance', 'ANO Verification', 'Scoring Rights']}
            guide="Enter the registered User ID of the ANO / Mentor to grant official clearance to evaluate cadet drill vectors."
          />
          <form onSubmit={verifyMentor}>
            <Field
              label="Registered Mentor User ID"
              type="number"
              placeholder="e.g. 2"
              required
              hint="Enter the user ID of the registered mentor account"
              value={verifyUserId}
              onChange={e => setVerifyUserId(e.target.value)}
            />
            <button className="primary" disabled={busy} style={{ height: 40, width: '100%' }}>
              {busy ? 'GRANTING CLEARANCE…' : '✓ AUTHORIZE OFFICER CLEARANCE'}
            </button>
          </form>
        </Panel>

        {/* Mentors Directory */}
        <Panel title={`Active Evaluators (${mentors.length} Officers)`} guideTag="OFFICER CADRE">
          {mentors.length === 0 ? (
            <div className="empty-state-card" style={{ padding: '32px 16px' }}>
              <div className="empty-state-icon">🎖️</div>
              <div className="empty-state-title">No Mentors Registered Yet</div>
              <div className="empty-state-text">
                Associate NCC Officers who register will be listed here for verification and scoring assignment.
              </div>
              <Link to="/register/mentor" className="primary" style={{ fontSize: 12 }}>
                + Register First Mentor
              </Link>
            </div>
          ) : (
            <div className="table-responsive">
              <table>
                <thead>
                  <tr>
                    <th>Officer Details</th>
                    <th>Service ID</th>
                    <th>Assigned Scope</th>
                    <th>Clearance</th>
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {mentors.map(m => (
                    <tr key={m.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: 'var(--navy-900)' }}>
                          {m.full_name || `Associate NCC Officer (User #${m.user_id})`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                          Battalion ID: #{m.battalion_id || 'HQ'}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600 }}>
                          {m.enrollment_number}
                        </span>
                      </td>
                      <td>
                        <span className="badge badge-olive">
                          {m.scope_level === 'multi_college' ? 'Multi-College' : 'Institute Unit'}
                        </span>
                      </td>
                      <td>
                        <span className={`badge ${m.is_verified ? 'badge-success' : 'badge-warning'}`}>
                          {m.is_verified ? '✓ VERIFIED' : 'PENDING'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        {!m.is_verified ? (
                          <button
                            type="button"
                            className="primary"
                            onClick={() => handleQuickVerify(m.user_id)}
                            disabled={busy}
                            style={{ fontSize: 11, padding: '4px 10px', height: 28 }}
                          >
                            Authorize
                          </button>
                        ) : (
                          <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 700 }}>
                            Authorized
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
