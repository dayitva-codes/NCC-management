import React from 'react';

/**
 * Global React Error Boundary
 * Prevents runtime rendering errors in any subcomponent from causing
 * a total application unmount or permanent blank screen.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught rendering error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: 36,
          maxWidth: 600,
          margin: '48px auto',
          background: '#FFFFFF',
          borderRadius: 12,
          border: '1px solid #fee2e2',
          boxShadow: '0 12px 30px rgba(0,0,0,0.08)',
          textAlign: 'center',
          fontFamily: 'inherit',
        }}>
          <div style={{ fontSize: 44, marginBottom: 12 }}>🛡️</div>
          <h3 style={{ fontSize: 18, fontWeight: 800, color: '#991b1b', margin: '0 0 8px 0' }}>
            Workstation Display Safeguard Activated
          </h3>
          <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, margin: '0 0 24px 0' }}>
            A temporary display exception was intercepted while loading this military record. Your authenticated credentials and database records remain safe.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              style={{
                padding: '9px 20px',
                background: 'var(--navy-900, #091a32)',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              🔄 Retry Display
            </button>
            <button
              onClick={this.handleReset}
              style={{
                padding: '9px 20px',
                background: '#f1f5f9',
                color: '#334155',
                border: '1px solid #cbd5e1',
                borderRadius: 6,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              ← Return to Dashboard
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
