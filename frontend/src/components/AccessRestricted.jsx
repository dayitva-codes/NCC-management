import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function AccessRestricted({ requiredRoles = [], attemptedPath = '' }) {
  const { user } = useAuth();

  const roleLabel = {
    cadet: 'Active Cadet (Rank: SUO / Cadet)',
    mentor: 'Associate NCC Officer (ANO / Evaluator)',
    admin: 'Commanding Officer (CO / Admin)',
  }[user?.role] || 'Unassigned Cadet';

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '70vh',
      padding: 24,
    }}>
      <div style={{
        maxWidth: 560,
        width: '100%',
        background: 'var(--paper)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-strong)',
        boxShadow: 'var(--shadow-md)',
        overflow: 'hidden',
        textAlign: 'center',
      }}>
        {/* Warning Header */}
        <div style={{
          background: 'var(--navy-900)',
          color: '#FFFFFF',
          padding: '24px 20px',
          borderBottom: '3px solid var(--saffron-500)',
        }}>
          <div style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            color: 'var(--saffron-500)',
            marginBottom: 8,
          }}>
            SECURITY PROTOCOL 403 // CLEARANCE RESTRICTION
          </div>
          <div style={{ fontSize: 42, marginBottom: 8 }}>🛡️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Access Prohibited by Military Protocol</h2>
        </div>

        {/* Diagnostic Body */}
        <div style={{ padding: '28px 24px' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 14, lineHeight: 1.6, margin: '0 0 20px' }}>
            Your authenticated service clearance profile does not hold authorization to access this battalion module.
          </p>

          <div style={{
            background: 'var(--surface-muted)',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border)',
            padding: 16,
            textAlign: 'left',
            fontSize: 13,
            marginBottom: 24,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>AUTHENTICATED ROLE:</span>
              <span style={{ fontWeight: 700, color: 'var(--navy-900)' }}>{roleLabel}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>SERVICE ID / EMAIL:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{user?.email || 'N/A'}</span>
            </div>
            {requiredRoles.length > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>REQUIRED CLEARANCE:</span>
                <span style={{ fontWeight: 700, color: '#DC2626', textTransform: 'uppercase' }}>
                  {requiredRoles.join(' / ')}
                </span>
              </div>
            )}
            {attemptedPath && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>RESTRICTED SECTOR:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)' }}>
                  {attemptedPath}
                </span>
              </div>
            )}
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 12 }}>
            <Link to="/dashboard" className="primary" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8, height: 40, padding: '0 20px' }}>
              <span>⬅</span>
              <span>Return to Permitted Station</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
