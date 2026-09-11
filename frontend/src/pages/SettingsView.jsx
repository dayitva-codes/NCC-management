import { useState } from 'react';
import { getApiBase, setApiBase } from '../api/client';
import { Field, SelectField, Panel, SuccessBanner, TagGuide } from '../components/Form';
import { useAuth } from '../context/AuthContext';

export default function SettingsView() {
  const { user } = useAuth();
  const [apiEndpoint, setApiEndpoint] = useState(getApiBase());
  const [directorate, setDirectorate] = useState('MP & CG (Madhya Pradesh & Chhattisgarh)');
  const [success, setSuccess] = useState('');

  function handleSaveSettings(e) {
    e.preventDefault();
    setApiBase(apiEndpoint);
    setSuccess('System configuration saved successfully.');
    setTimeout(() => setSuccess(''), 3500);
  }

  return (
    <div>
      <div className="page-header">
        <div className="page-eyebrow">
          <span className="dot" />
          <span>STATION PARAMETERS & PREFERENCES</span>
        </div>
        <h2>System Settings & Configuration</h2>
        <p>
          Configure API endpoints, state directorate affiliations, security credentials, and institutional parameters.
        </p>
      </div>

      <SuccessBanner message={success} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 24 }}>
        <Panel title="Command API Connection" guideTag="BACKEND CONFIG">
          <TagGuide
            tags={['Cloud Gateway', 'Local Development', 'REST v1']}
            guide="Configure the active REST backend endpoint connecting this management station to PostgreSQL."
          />
          <form onSubmit={handleSaveSettings}>
            <Field
              label="Active REST API Base URL"
              value={apiEndpoint}
              onChange={e => setApiEndpoint(e.target.value)}
              placeholder="http://127.0.0.1:8000/api/v1 or /api/v1"
            />

            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
              <button
                type="button"
                className="secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => setApiEndpoint('http://127.0.0.1:8000/api/v1')}
              >
                Use Localhost (8000)
              </button>
              <button
                type="button"
                className="secondary"
                style={{ padding: '6px 12px', fontSize: 12 }}
                onClick={() => setApiEndpoint('/api/v1')}
              >
                Use Cloud Relative (/api/v1)
              </button>
            </div>

            <button className="primary">
              💾 Save Connection Setting
            </button>
          </form>
        </Panel>

        <Panel title="Station Officer Profile" guideTag="AUTHENTICATION">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Authenticated Role</div>
              <div style={{ fontWeight: 700, color: 'var(--navy-900)', fontSize: 15, marginTop: 2 }}>
                {user?.role?.toUpperCase() || 'COMMANDING OFFICER'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Station Email</div>
              <div style={{ fontWeight: 600, color: 'var(--text-body)', marginTop: 2 }}>
                {user?.email || 'officer@ncc.local'}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Assigned Directorate</div>
              <div style={{ fontWeight: 600, color: 'var(--text-body)', marginTop: 2 }}>
                {directorate}
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Security Standard</div>
              <div style={{ fontWeight: 600, color: 'var(--success)', marginTop: 2 }}>
                Level 1 Military Grade Encryption
              </div>
            </div>
          </div>
        </Panel>
      </div>
    </div>
  );
}
