import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getNavigationForRole } from '../config/navigationConfig';
import { subscribeBufferLoading } from '../api/client';
import { TopBufferBar } from './RefreshingBuffer';
import TopHeader from './TopHeader';
import { NccCrest, NccRibbonBar } from './NccLogo';

export default function AppShell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);

  useEffect(() => {
    return subscribeBufferLoading(setIsBuffering);
  }, []);

  const roleMeta = {
    admin: {
      name: 'COMMANDING OFFICER (CO)',
      badge: 'badge-success',
      roleColor: '#059669',
      title: 'Battalion Commander',
      icon: '⭐',
      unitScope: 'HQ Battalion Command • All Units',
    },
    mentor: {
      name: 'ASSOCIATE NCC OFFICER (ANO)',
      badge: 'badge-saffron',
      roleColor: '#D97706',
      title: 'Company Commander / Evaluator',
      icon: '🎖️',
      unitScope: 'Assigned Company • Cadet Evaluator',
    },
    cadet: {
      name: 'ACTIVE CADET',
      badge: 'badge-olive',
      roleColor: '#3A5A40',
      title: 'Rank: Senior Under Officer',
      icon: '👤',
      unitScope: 'Govt Girls PG College • 3 MP Bn',
    },
  }[user?.role] || {
    name: 'GUEST OBSERVER',
    badge: 'badge-navy',
    roleColor: '#475569',
    title: 'Guest',
    icon: '👤',
    unitScope: 'Observer Clearance',
  };

  const navGroups = getNavigationForRole(user?.role);

  return (
    <div className="app-shell">
      {/* Real-time Network Buffer Sweep Bar */}
      <TopBufferBar active={isBuffering} />

      {/* Mobile Backdrop */}
      {mobileNavOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(11, 29, 58, 0.5)',
            zIndex: 99,
          }}
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${mobileNavOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-brand" style={{ gap: 14 }}>
            <NccCrest size={44} />
            <div className="brand-title">
              <h1 style={{ letterSpacing: '0.08em', fontWeight: 900 }}>CADET-360</h1>
              <span style={{ color: 'var(--text-sidebar)', fontWeight: 600 }}>NCC 360° Command & Readiness</span>
            </div>
          </div>
          <div className="motto-bar" style={{ marginTop: 12 }}>
            <span>एकता और अनुशासन</span>
            <span>UNITY & DISCIPLINE</span>
          </div>
        </div>

        {/* Dynamic Role & Clearance Badge */}
        <div className="user-clearance-card">
          <div className="clearance-avatar" style={{ border: `2px solid ${roleMeta.roleColor}` }}>
            {roleMeta.icon}
          </div>
          <div className="clearance-details">
            <div className={`clearance-role-badge ${roleMeta.badge}`}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: roleMeta.roleColor }} />
              <span>{roleMeta.name}</span>
            </div>
            <div className="clearance-email" title={user?.email}>{user?.email || 'officer@ncc.local'}</div>
            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>
              {roleMeta.unitScope}
            </div>
          </div>
        </div>

        {/* Dynamic Role-Filtered Navigation Groups */}
        <nav className="sidebar-nav">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx}>
              <div className="nav-group-label">
                <span>{group.group}</span>
                {group.badge && <span className="nav-tag">{group.badge}</span>}
              </div>
              <div className="nav-links-list">
                {group.items.map((item, iIdx) => (
                  <NavLink
                    key={iIdx}
                    to={item.path}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar Footer */}
        <div className="sidebar-footer">
          <button type="button" className="logout-btn" onClick={logout}>
            <span>🚪</span>
            <span>Sign Out from Station</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="main-wrapper">
        <TopHeader
          onSearch={setSearchQuery}
          onToggleMobileNav={() => setMobileNavOpen(!mobileNavOpen)}
        />
        <main className="main-content">
          <Outlet context={{ searchQuery }} />
        </main>
      </div>
    </div>
  );
}
