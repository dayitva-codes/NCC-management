import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api/client';
import { Field, SelectField, Panel, ErrorBanner, SuccessBanner, TagGuide, PasswordStrengthMeter } from '../components/Form';
import { NccCrest, NccRibbonBar } from '../components/NccLogo';

const WINGS_BY_GENDER = {
  female: [
    { value: 'JW', label: 'JW — Junior Wing (School / Class 8-10)' },
    { value: 'SW', label: 'SW — Senior Wing (College / Degree)' },
  ],
  male: [
    { value: 'JD', label: 'JD — Junior Division (School / Class 8-10)' },
    { value: 'SD', label: 'SD — Senior Division (College / Degree)' },
  ],
};

export default function RegisterCadet() {
  const navigate = useNavigate();
  const [battalions, setBattalions] = useState([]);
  const [colleges, setColleges] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    email: '', password: '', battalion_id: '', college_id: '',
    full_name: '', enrollment_number: '', mobile: '', academic_year: '2',
    address: '', gender: 'female', wing: 'SW', ncc_goal: '',
  });

  useEffect(() => {
    api.listBattalions().then(setBattalions).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.battalion_id) {
      api.listColleges(form.battalion_id).then(setColleges).catch(() => {});
    } else {
      setColleges([]);
    }
  }, [form.battalion_id]);

  function update(key, value) {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'gender') {
        next.wing = WINGS_BY_GENDER[value][1]?.value || WINGS_BY_GENDER[value][0].value;
      }
      return next;
    });
  }

  function autoFillSample() {
    const randomId = Math.floor(1000 + Math.random() * 9000);
    setForm({
      email: `cadet_${randomId}@ncc.local`,
      password: 'CadetPassword123!',
      battalion_id: battalions[0]?.id ? String(battalions[0].id) : '1',
      college_id: colleges[0]?.id ? String(colleges[0].id) : '1',
      full_name: 'Priya Sharma',
      enrollment_number: `MP24SWG${randomId}`,
      mobile: '9876543210',
      academic_year: '2',
      address: 'Hostel Block B, Govt Girls Campus',
      gender: 'female',
      wing: 'SW',
      ncc_goal: 'Aiming for Republic Day Camp (RDC) & Best Cadet Trophy',
    });
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password.length < 8) {
      setError('Security Rule Violation: Password must be at least 8 characters long.');
      return;
    }

    const cleanMobile = form.mobile.replace(/\D/g, '');
    if (cleanMobile.length !== 10) {
      setError('Mobile Rule Violation: Mobile number must be exactly 10 numeric digits.');
      return;
    }

    if (!form.battalion_id) {
      setError('Please select a Battalion.');
      return;
    }

    if (!form.college_id) {
      setError('Please select a College under the selected Battalion.');
      return;
    }

    setBusy(true);
    try {
      await api.registerCadet({
        ...form,
        mobile: cleanMobile,
        battalion_id: parseInt(form.battalion_id),
        college_id: parseInt(form.college_id),
        academic_year: parseInt(form.academic_year),
      });
      setSuccess('Cadet enrollment submitted successfully! Redirecting to login…');
      setTimeout(() => navigate('/login'), 1800);
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
      <div style={{ maxWidth: 760, margin: '36px auto', padding: '0 20px' }}>
        <div className="page-header" style={{ textAlign: 'center' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <NccCrest size={60} showMotto={true} />
          </div>
          <div className="page-eyebrow" style={{ justifyContent: 'center' }}>
            <span className="dot" />
            <span>OFFICIAL CADET ENROLLMENT STATION</span>
          </div>
          <h2>Cadet Registration & Dossier Form</h2>
          <p style={{ margin: '0 auto' }}>
            Register as an active cadet to receive ANO performance evaluations, track attendance, and compete for leaderboard rankings.
          </p>
        </div>

        <div className="quick-fill-bar" style={{ justifyContent: 'center' }}>
          <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>DEMO FILL:</span>
          <button type="button" className="quick-fill-btn" onClick={autoFillSample}>
            ⚡ Auto-fill Sample Cadet Data
          </button>
        </div>

        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        <form onSubmit={handleSubmit}>
          <Panel title="1. Account Credentials & Security" guideTag="SECURITY">
            <div className="field-row">
              <Field
                label="Cadet Email Address"
                type="email"
                required
                placeholder="cadet@college.edu"
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

          <Panel title="2. Battalion Placement & Wing Structure" guideTag="NCC RULES">
            <TagGuide
              tags={['Female Cadets: JW / SW', 'Male Cadets: JD / SD', 'Strict Compliance']}
              guide="Cadet wing allocation is automatically strictly validated based on gender and institution category."
            />
            <div className="field-row">
              <SelectField
                label="Parent Battalion"
                required
                value={form.battalion_id}
                onChange={e => update('battalion_id', e.target.value)}
                options={[
                  { value: '', label: '— Select Battalion —' },
                  ...battalions.map(b => ({ value: b.id, label: `${b.name} (${b.code})` })),
                ]}
              />
              <SelectField
                label="Affiliated College"
                required
                value={form.college_id}
                onChange={e => update('college_id', e.target.value)}
                options={[
                  { value: '', label: form.battalion_id ? '— Select College —' : '— Choose Battalion First —' },
                  ...colleges.map(c => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>

            <div className="field-row">
              <SelectField
                label="Cadet Gender"
                required
                value={form.gender}
                onChange={e => update('gender', e.target.value)}
                options={[
                  { value: 'female', label: 'Female Cadet (JW / SW)' },
                  { value: 'male', label: 'Male Cadet (JD / SD)' },
                ]}
              />
              <SelectField
                label="Wing / Division Category"
                required
                value={form.wing}
                onChange={e => update('wing', e.target.value)}
                options={WINGS_BY_GENDER[form.gender]}
              />
            </div>
          </Panel>

          <Panel title="3. Cadet Dossier Information" guideTag="CADET DOSSIER">
            <div className="field-row">
              <Field
                label="Full Cadet Name"
                required
                placeholder="e.g. Priya Sharma"
                value={form.full_name}
                onChange={e => update('full_name', e.target.value)}
              />
              <Field
                label="Enrollment Registration Number"
                required
                hint="e.g. MP24SWG0001"
                placeholder="State + Year + Wing + Number"
                value={form.enrollment_number}
                onChange={e => update('enrollment_number', e.target.value.toUpperCase())}
              />
            </div>

            <div className="field-row">
              <Field
                label="Mobile Contact"
                required
                limitRule="10 numeric digits"
                placeholder="10-digit phone"
                value={form.mobile}
                onChange={e => update('mobile', e.target.value)}
              />
              <Field
                label="Academic Year"
                type="number"
                min="1"
                max="4"
                required
                limitRule="1 to 4"
                value={form.academic_year}
                onChange={e => update('academic_year', e.target.value)}
              />
            </div>

            <Field
              label="Campus Address / Base"
              placeholder="Hostel, Street or Base Location"
              value={form.address}
              onChange={e => update('address', e.target.value)}
            />

            <Field
              label="Primary NCC Target / Goal"
              placeholder="e.g. Republic Day Camp (RDC) selection, Best Cadet Trophy, SSB Entry"
              value={form.ncc_goal}
              onChange={e => update('ncc_goal', e.target.value)}
            />
          </Panel>

          <button className="primary" style={{ width: '100%', height: 44, marginBottom: 20 }} disabled={busy}>
            {busy ? 'SUBMITTING ENROLLMENT RECORD…' : 'COMPLETE CADET REGISTRATION'}
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
