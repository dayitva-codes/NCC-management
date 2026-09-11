import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Field, SelectField, Panel, ErrorBanner, SuccessBanner, TagGuide, PasswordStrengthMeter } from '../components/Form';
import { NccCrest, NccRibbonBar } from '../components/NccLogo';

export default function RegisterMentor() {
  const navigate = useNavigate();
  const [battalions, setBattalions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    email: '', password: '', enrollment_number: '',
    scope_level: 'institute', college_id: '', battalion_id: '',
  });

  useEffect(() => {
    api.listBattalions().then(setBattalions).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.battalion_id) {
      api.listColleges(form.battalion_id).then(setColleges).catch(() => {});
    }
  }, [form.battalion_id]);

  function update(key, value) {
    setForm(prev => ({ ...prev, [key]: value }));
  }

  function autoFillSample() {
    const randomId = Math.floor(100 + Math.random() * 900);
    setForm({
      email: `ano_${randomId}@ncc.local`,
      password: 'MentorPassword123!',
      enrollment_number: `ANO-MP-${randomId}`,
      scope_level: 'institute',
      battalion_id: battalions[0]?.id ? String(battalions[0].id) : '1',
      college_id: colleges[0]?.id ? String(colleges[0].id) : '1',
    });
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(''); setSuccess('');

    if (form.password.length < 8) {
      setError('Security Rule Violation: Password must be at least 8 characters long.');
      return;
    }

    if (form.scope_level === 'institute' && !form.college_id) {
      setError('Scope Rule Violation: Institute-level mentors must select an attached college.');
      return;
    }

    if (form.scope_level === 'multi_college' && !form.battalion_id) {
      setError('Scope Rule Violation: Multi-college mentors must select an attached battalion.');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        email: form.email,
        password: form.password,
        enrollment_number: form.enrollment_number,
        scope_level: form.scope_level,
      };
      if (form.scope_level === 'institute') payload.college_id = parseInt(form.college_id);
      else payload.battalion_id = parseInt(form.battalion_id);

      const res = await api.registerMentor(payload);
      setSuccess(`Officer registered with User ID #${res.user_id || res.id}. Awaiting Commanding Officer verification before score submissions are enabled.`);
      setTimeout(() => navigate('/login'), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="gov-top-bar">
        <div className="gov-top-left">
          <span className="gov-emblem-icon">🇮🇳</span>
          <span className="gov-text-hi">भारत सरकार</span>
          <span className="gov-separator">|</span>
          <span className="gov-text-en">GOVERNMENT OF INDIA</span>
          <span className="gov-separator">•</span>
          <span className="gov-text-dept">रक्षा मंत्रालय / MINISTRY OF DEFENCE</span>
        </div>
        <div className="gov-top-right">
          <span className="ncc-portal-motto">
            <span className="motto-hi">एकता और अनुशासन</span>
            <span className="motto-sep">•</span>
            <span className="motto-en">UNITY AND DISCIPLINE</span>
          </span>
        </div>
      </div>
      <div className="tricolor-ribbon" />
      <NccRibbonBar height={3} />
      <div style={{ maxWidth: 660, margin: '36px auto', padding: '0 20px' }}>
        <div className="page-header" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <NccCrest size={60} showMotto={true} />
          </div>
          <div className="page-eyebrow" style={{ justifyContent: 'center' }}>
            <span className="dot" />
            <span>OFFICER & EVALUATION CADRE REGISTRATION</span>
          </div>
          <h2>ANO & Officer Enrollment</h2>
          <p style={{ margin: '0 auto' }}>
            Register as an Associate NCC Officer (ANO) or PI Staff evaluator to record parade scores, evaluate drill vectors, and oversee collegiate units.
          </p>
        </div>

        <div className="quick-fill-bar" style={{ justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>DEMO FILL:</span>
          <button type="button" className="quick-fill-btn" onClick={autoFillSample}>
            ⚡ Auto-fill Sample Officer Data
          </button>
        </div>

        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        <TagGuide
          tags={['Command Clearance Policy', 'Admin Verification Needed', 'Evaluator Scope']}
          guide="Newly registered ANOs start in an Unverified status. The Commanding Officer must verify your User ID from the Administration station before evaluations are permitted."
        />

        <form onSubmit={handleSubmit}>
          <Panel title="1. Account Credentials" guideTag="SECURITY">
            <div className="field-row">
              <Field
                label="Officer Email Address"
                type="email"
                required
                placeholder="officer@unit.ncc"
                value={form.email}
                onChange={e => update('email', e.target.value)}
              />
              <Field
                label="Password"
                type="password"
                required
                placeholder="Min 8 characters"
                value={form.password}
                onChange={e => update('password', e.target.value)}
              />
            </div>
            <PasswordStrengthMeter password={form.password} />
          </Panel>

          <Panel title="2. Service Scope & Placement" guideTag="AUTHORIZATION">
            <Field
              label="Service / Commission ID"
              required
              placeholder="e.g. ANO-MP-2026-09"
              value={form.enrollment_number}
              onChange={e => update('enrollment_number', e.target.value.toUpperCase())}
            />

            <SelectField
              label="Evaluation Scope Level"
              required
              value={form.scope_level}
              onChange={e => update('scope_level', e.target.value)}
              options={[
                { value: 'institute', label: 'Institute-Level (Evaluates Cadets in 1 Specific College)' },
                { value: 'multi_college', label: 'Multi-College / Battalion Level (Evaluates All Cadets in Unit)' },
              ]}
            />

            {form.scope_level === 'institute' ? (
              <div className="field-row">
                <SelectField
                  label="Parent Battalion"
                  required
                  value={form.battalion_id}
                  onChange={e => update('battalion_id', e.target.value)}
                  options={[
                    { value: '', label: '— Select Battalion —' },
                    ...battalions.map(b => ({ value: b.id, label: b.name })),
                  ]}
                />
                <SelectField
                  label="Assigned College"
                  required
                  value={form.college_id}
                  onChange={e => update('college_id', e.target.value)}
                  options={[
                    { value: '', label: form.battalion_id ? '— Select College —' : '— Choose Battalion First —' },
                    ...colleges.map(c => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>
            ) : (
              <SelectField
                label="Assigned Battalion"
                required
                value={form.battalion_id}
                onChange={e => update('battalion_id', e.target.value)}
                options={[
                  { value: '', label: '— Select Battalion —' },
                  ...battalions.map(b => ({ value: b.id, label: b.name })),
                ]}
              />
            )}
          </Panel>

          <button className="primary" style={{ width: '100%', height: 44, marginBottom: 20 }} disabled={busy}>
            {busy ? 'ENROLLING OFFICER CADRE…' : 'SUBMIT OFFICER REGISTRATION'}
          </button>

          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <Link to="/login" style={{ fontSize: 13, color: 'var(--navy-900)', fontWeight: 600 }}>
              Already registered? Sign in to Command Station →
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
