import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ErrorBanner } from '../components/Form';
import { NccCrest, NccRibbonBar } from '../components/NccLogo';

export default function Login() {
  const { login, googleLogin, googleEnabled, user } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Auto-redirect if already authenticated (e.g. after Google OAuth callback)
  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

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
      setError(err.message || 'Authentication failed. Please verify credentials.');
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
      setError(err.message || 'Google authentication failed.');
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
            Authenticate with your authorized service credentials or Google Workspace to access battalion evaluation, muster rolls, and command stations.
          </p>

          <ErrorBanner message={error} />

          {/* Google OAuth Sign-in Button */}
          {googleEnabled && (
            <div style={{ marginBottom: 16 }}>
              <button
                type="button"
                onClick={handleGoogleLogin}
                disabled={busy}
                style={{
                  width: '100%',
                  height: 44,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 600,
                  backgroundColor: '#ffffff',
                  color: '#3c4043',
                  border: '1px solid #dadce0',
                  borderRadius: 'var(--radius-sm)',
                  cursor: busy ? 'not-allowed' : 'pointer',
                  boxShadow: '0 1px 3px rgba(60,64,67,0.12)',
                  transition: 'background-color 0.15s, box-shadow 0.15s',
                }}
              >
                <svg width="18" height="18" viewBox="0 0 18 18" style={{ marginRight: 10, flexShrink: 0 }}>
                  <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.616z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z" />
                  <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707s.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.347 2.825.957 4.039l3.007-2.332z" />
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z" />
                </svg>
                <span>{busy ? 'Authenticating with Google…' : 'Continue with Google Workspace'}</span>
              </button>
              <div style={{ textAlign: 'center', marginTop: 14, color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                — Or Sign In with Service Credentials —
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit}>
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
                autoComplete="email"
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
                autoComplete="current-password"
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
