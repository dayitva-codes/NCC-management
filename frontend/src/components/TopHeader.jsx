import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { NccRibbonBar } from './NccLogo';

export function TopHeader({ activeBattalion = '3 MP Girls Bn', onSearch, onRefresh, onToggleMobileNav }) {
  const { user } = useAuth();
  const [showNotifications, setShowNotifications] = useState(false);
  const [battalions, setBattalions] = useState([]);
  const [selectedUnit, setSelectedUnit] = useState(activeBattalion);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState(new Date());

  function loadBattalions() {
    api.listBattalions()
      .then(data => {
        if (data && data.length > 0) {
          setBattalions(data);
          setSelectedUnit(data[0].name);
        }
      })
      .catch(() => {});
  }

  useEffect(() => {
    loadBattalions();
  }, []);

  function handleTriggerRefresh() {
    setIsRefreshing(true);
    // Dispatch global refresh event for any listening page
    window.dispatchEvent(new CustomEvent('ncc:refresh-data'));
    if (onRefresh) onRefresh();
    loadBattalions();
    setTimeout(() => {
      setIsRefreshing(false);
      setLastSyncTime(new Date());
    }, 600);
  }

  const notifications = [
    { id: 1, title: 'Annual Training Schedule Active', desc: 'CATC camp muster rolls open for verified cadets.', time: '10m ago', unread: true },
    { id: 2, title: 'Parade Evaluation Active', desc: '9-pillar scoring open for authorized ANO officers.', time: '1h ago', unread: true },
    { id: 3, title: 'Republic Day Camp (RDC) Trials', desc: 'State Directorate trial dates published.', time: '1d ago', unread: false },
  ];

  const timeString = lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <>
      {/* Official Government of India Institutional Header Bar */}
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
          <span className="gov-directorate-badge">17 DIRECTORATES</span>
        </div>
      </div>
      <div className="tricolor-ribbon" />
      <NccRibbonBar height={3} />
      <header className="top-header">
        <div className="header-left">
          {onToggleMobileNav && (
            <button
              type="button"
              className="mobile-nav-toggle-btn"
              onClick={onToggleMobileNav}
              aria-label="Toggle navigation drawer"
              title="Open Navigation Menu"
            >
              ☰
            </button>
          )}
          <div className="unit-badge-pill">
            <span className="unit-indicator-dot" />
            <span style={{ color: 'var(--text-muted)', fontSize: 11, textTransform: 'uppercase' }}>UNIT:</span>
            <span style={{ fontWeight: 700, color: 'var(--navy-900)' }}>
              {battalions.length > 0 ? (
                <select
                  value={selectedUnit}
                  onChange={e => setSelectedUnit(e.target.value)}
                  style={{
                    border: 'none',
                    background: 'transparent',
                    fontWeight: 700,
                    color: 'var(--navy-900)',
                    cursor: 'pointer',
                    fontSize: 12,
                    outline: 'none',
                  }}
                >
                  {battalions.map(b => (
                    <option key={b.id} value={b.name}>{b.name} ({b.code})</option>
                  ))}
                </select>
              ) : (
                selectedUnit
              )}
            </span>
          </div>

          <div className="header-search">
            <span className="header-search-icon">🔍</span>
            <input
              type="text"
              placeholder="Search cadets, ANOs, battalions (Press /)"
              onChange={e => onSearch && onSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="header-right">
          {/* Live Sync Indicator & Refresh Button */}
          <div className="live-sync-indicator" title={`Last synced with backend database at ${timeString}`}>
            <span className="live-dot" />
            <span style={{ fontSize: 11 }}>SYNCED: {timeString}</span>
          </div>

          <button
            type="button"
            className={`refresh-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleTriggerRefresh}
            disabled={isRefreshing}
            title="Fetch latest updates from database"
          >
            <span className="refresh-icon">🔄</span>
            <span>{isRefreshing ? 'Syncing…' : 'Refresh Data'}</span>
          </button>

          <div className="header-stat-pill">
            <span>🇮🇳</span>
            <span>DTE: MP & CG</span>
          </div>

          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className="header-icon-btn"
              title="Notifications"
              onClick={() => setShowNotifications(!showNotifications)}
            >
              🔔
              <span className="notification-badge" />
            </button>

            {showNotifications && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: 44,
                width: 320,
                background: '#FFFFFF',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)',
                padding: '16px',
                zIndex: 100,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 700, fontSize: 13, color: 'var(--navy-900)' }}>BATTALION DISPATCHES</span>
                  <span className="badge badge-olive">Live Orders</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {notifications.map(n => (
                    <div key={n.id} style={{
                      padding: '8px 10px',
                      background: n.unread ? 'var(--bg-main)' : 'transparent',
                      borderRadius: 'var(--radius-xs)',
                      borderLeft: n.unread ? '3px solid var(--olive-600)' : '3px solid transparent',
                    }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--navy-900)' }}>{n.title}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{n.desc}</div>
                      <div style={{ fontSize: 10, color: 'var(--text-dim)', marginTop: 4 }}>{n.time}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

export default TopHeader;
