import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/Form';
import { NccCrest, NccRibbonBar } from '../components/NccLogo';

export default function Login() {
  const { login, googleLogin, googleEnabled } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@ncc.local');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function quickFill(fillEmail, fillPass) {
    setEmail(fillEmail);
    setPassword(fillPass);
    setError('');
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (password.length < 6) {
      setError('Password must be at least 6 characters for station access.');
      return;
    }
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setBusy(true);
    try {
      await googleLogin();
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
      <div className="login-shell">
        <div className="login-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
            <NccCrest size={56} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.08em', color: 'var(--ncc-gold)', textTransform: 'uppercase' }}>
                DIRECTORATE GENERAL NCC • CADET-360
              </div>
              <h2 style={{ fontSize: 20, color: 'var(--navy-900)', fontWeight: 800, letterSpacing: '0.02em' }}>CADET-360 Command Portal</h2>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
                Ministry of Defence • 360° Military Evaluation System
              </div>
            </div>
          </div>

          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 20, lineHeight: 1.5 }}>
            Authenticate with your authorized service credentials to access battalion evaluation, muster rolls, and command stations.
          </p>

          <ErrorBanner message={error} />

          {/* Quick Demo Access Bar */}
          <div className="quick-fill-bar">
            <span style={{ color: 'var(--text-muted)', fontSize: 11, fontWeight: 700 }}>DEMO ROLES:</span>
            <button
              type="button"
              className="quick-fill-btn"
              onClick={() => quickFill('admin@ncc.local', 'admin123')}
            >
              ⭐ Commanding Officer
            </button>
            <button
              type="button"
              className="quick-fill-btn"
              onClick={() => quickFill('mentor1@test.com', 'password123')}
            >
              🎖️ ANO / Evaluator
            </button>
            <button
              type="button"
              className="quick-fill-btn"
              onClick={() => quickFill('cadet1@test.com', 'password123')}
            >
              👤 Active Cadet
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {googleEnabled && (
              <>
                <button
                  type="button"
                  className="secondary"
                  onClick={handleGoogleLogin}
                  style={{ width: '100%', marginBottom: 16, height: 42 }}
                >
                  <span style={{ fontWeight: 700, color: '#DB4437' }}>G</span>
                  Continue with Google Workspace
                </button>
                <div style={{ textAlign: 'center', marginBottom: 16, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  — Or Authenticate with Service ID —
                </div>
              </>
            )}

            <div className="field">
              <div className="field-header">
                <label htmlFor="email">Service / Registered Email</label>
              </div>
              <input
                id="email"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="officer@unit.ncc or cadet@college.edu"
                required
              />
            </div>

            <div className="field">
              <div className="field-header">
                <label htmlFor="password">Security Password</label>
              </div>
              <input
                id="password"
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            <button className="primary" style={{ width: '100%', marginTop: 8, height: 42 }} disabled={busy}>
              {busy ? 'AUTHENTICATING SERVICE CREDENTIALS…' : 'SIGN IN TO COMMAND STATION'}
            </button>
          </form>

          <div style={{
            marginTop: 24,
            paddingTop: 16,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: 12,
          }}>
            <Link to="/register/cadet" style={{ color: 'var(--navy-900)', fontWeight: 600 }}>
              + Cadet Enrollment
            </Link>
            <Link to="/register/mentor" style={{ color: 'var(--olive-700)', fontWeight: 600 }}>
              + ANO / Officer Register
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
