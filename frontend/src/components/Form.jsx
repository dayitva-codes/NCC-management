import { useState, useEffect } from 'react';
import { setApiBase, api } from '../api/client';

export function StatCard({ label, value, icon, trend, trendLabel, tone = 'primary' }) {
  return (
    <div className={`stat-card ${tone}`}>
      <div className="stat-card-top">
        <span className="stat-label">{label}</span>
        {icon && <div className="stat-icon">{icon}</div>}
      </div>
      <div className="stat-value">{value}</div>
      {(trend || trendLabel) && (
        <div className="stat-footer">
          {trend && (
            <span className={`stat-trend ${trend > 0 ? 'positive' : 'neutral'}`}>
              {trend > 0 ? '↑' : ''} {trend}%
            </span>
          )}
          <span>{trendLabel}</span>
        </div>
      )}
    </div>
  );
}

export function PasswordStrengthMeter({ password }) {
  const hasMinLength = (password || '').length >= 8;
  const hasNumber = /\d/.test(password || '');
  const hasUpper = /[A-Z]/.test(password || '');
  const hasLower = /[a-z]/.test(password || '');
  const hasSpecial = /[^A-Za-z0-9]/.test(password || '');

  const score = [hasMinLength, hasNumber, (hasUpper && hasLower), hasSpecial].filter(Boolean).length;

  function getStrengthLabel() {
    if (!password) return { label: 'Min 8 Characters Required', color: 'var(--text-dim)' };
    if (!hasMinLength) return { label: `Need ${8 - password.length} more characters`, color: 'var(--danger)' };
    if (score <= 2) return { label: 'Fair (Add mixed case & numbers)', color: 'var(--warning)' };
    if (score === 3) return { label: 'Strong Standard', color: 'var(--info)' };
    return { label: 'Secure Military Standard', color: 'var(--success)' };
  }

  const { label, color } = getStrengthLabel();

  return (
    <div className="password-meter-container">
      <div className="password-bars">
        {[1, 2, 3, 4].map(idx => (
          <div
            key={idx}
            className="password-bar-segment"
            style={{
              background: idx <= score && hasMinLength ? color : 'var(--border)',
            }}
          />
        ))}
      </div>
      <div className="password-rules-list">
        <span className={`password-rule-item ${hasMinLength ? 'valid' : ''}`}>
          {hasMinLength ? '✓' : '•'} 8+ Chars
        </span>
        <span className={`password-rule-item ${hasNumber ? 'valid' : ''}`}>
          {hasNumber ? '✓' : '•'} Number
        </span>
        <span className={`password-rule-item ${(hasUpper && hasLower) ? 'valid' : ''}`}>
          {(hasUpper && hasLower) ? '✓' : '•'} Mixed Case
        </span>
        <span style={{ marginLeft: 'auto', color: color, fontWeight: 700 }}>
          {label}
        </span>
      </div>
    </div>
  );
}

export function Field({ label, hint, guideTag, badge, limitRule, rightElement, ...props }) {
  return (
    <div className="field">
      <div className="field-header">
        <label>
          {label}
          {props.required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {guideTag && <span className="badge badge-olive">{guideTag}</span>}
          {badge && <span className="badge badge-saffron">{badge}</span>}
          {hint && <span className="field-hint">{hint}</span>}
        </div>
      </div>
      <input {...props} />
      {limitRule && (
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          ⚙️ {limitRule}
        </div>
      )}
      {rightElement}
    </div>
  );
}

export function SelectField({ label, options, hint, guideTag, badge, ...props }) {
  return (
    <div className="field">
      <div className="field-header">
        <label>
          {label}
          {props.required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          {guideTag && <span className="badge badge-olive">{guideTag}</span>}
          {badge && <span className="badge badge-saffron">{badge}</span>}
          {hint && <span className="field-hint">{hint}</span>}
        </div>
      </div>
      <select {...props}>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

export function TextareaField({ label, hint, guideTag, ...props }) {
  return (
    <div className="field">
      <div className="field-header">
        <label>
          {label}
          {props.required && <span style={{ color: 'var(--danger)', marginLeft: 3 }}>*</span>}
        </label>
        {hint && <span className="field-hint">{hint}</span>}
      </div>
      <textarea {...props} />
    </div>
  );
}

export function TagGuide({ tags = [], guide, title = "OPERATIONAL STANDARD" }) {
  return (
    <div className="guide-box">
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: 'var(--navy-900)', fontWeight: 700, letterSpacing: '0.05em' }}>
          {title}:
        </span>
        {tags.map((t, idx) => (
          <span key={idx} className="badge badge-olive">
            {t}
          </span>
        ))}
      </div>
      {guide && (
        <div style={{ fontSize: 13, color: 'var(--text-body)', lineHeight: 1.5 }}>
          {guide}
        </div>
      )}
    </div>
  );
}

export function Panel({ title, guideTag, subtitle, actions, children }) {
  return (
    <div className="panel">
      {(title || guideTag || actions) && (
        <div className="panel-header">
          <div>
            <div className="panel-title">
              {title}
              {guideTag && <span className="badge badge-olive">{guideTag}</span>}
            </div>
            {subtitle && <div className="panel-subtitle">{subtitle}</div>}
          </div>
          {actions && <div>{actions}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function ErrorBanner({ message }) {
  if (!message) return null;
  const isConnError = typeof message === 'string' && message.includes('Could not reach the API');

  const switchEndpoint = (newBase) => {
    setApiBase(newBase);
    window.location.reload();
  };

  return (
    <div className="banner-error">
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, flex: 1 }}>
        <span style={{ fontSize: 16 }}>⚠️</span>
        <span style={{ fontSize: 13, color: 'var(--danger)', lineHeight: 1.4, fontWeight: 600 }}>{message}</span>
      </div>

      {isConnError && (
        <div style={{
          display: 'flex',
          gap: 8,
          flexWrap: 'wrap',
          alignItems: 'center'
        }}>
          <button
            type="button"
            onClick={() => switchEndpoint('/api/v1')}
            className="secondary"
            style={{ padding: '4px 10px', fontSize: 11 }}
          >
            Cloud API (/api/v1)
          </button>
          <button
            type="button"
            onClick={() => switchEndpoint('http://127.0.0.1:8000/api/v1')}
            className="secondary"
            style={{ padding: '4px 10px', fontSize: 11 }}
          >
            Localhost (8000)
          </button>
        </div>
      )}
    </div>
  );
}

export function SuccessBanner({ message }) {
  if (!message) return null;
  return (
    <div className="banner-success">
      <span style={{ fontSize: 16 }}>✅</span>
      <span>{message}</span>
    </div>
  );
}

export function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3 style={{ fontSize: 17, color: 'var(--navy-900)' }}>{title}</h3>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              fontSize: 20,
              cursor: 'pointer',
              color: 'var(--text-muted)'
            }}
          >
            ✕
          </button>
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  );
}

export function NinePillarsMatrix({ scores = [], criteria: propCriteria = null, showFilter = true }) {
  const [dbCriteria, setDbCriteria] = useState([]);
  const [filterPriority, setFilterPriority] = useState('all');

  const defaultCriteria = [
    { name: 'drill', label: '1. Drill & Parade Precision', icon: '🎖️', priority: 'high', max_score: 10 },
    { name: 'physical_fitness', label: '2. Physical Fitness & Endurance', icon: '🏃', priority: 'high', max_score: 10 },
    { name: 'discipline', label: '3. Discipline & Bearing', icon: '🛡️', priority: 'high', max_score: 10 },
    { name: 'leadership', label: '4. Leadership & Squad Command', icon: '⭐', priority: 'high', max_score: 10 },
    { name: 'ncc_knowledge', label: '5. NCC Knowledge & SOPs', icon: '📖', priority: 'normal', max_score: 10 },
    { name: 'communication', label: '6. Communication & Briefing', icon: '📢', priority: 'normal', max_score: 10 },
    { name: 'teamwork', label: '7. Teamwork & Esprit de Corps', icon: '🤝', priority: 'normal', max_score: 10 },
    { name: 'punctuality', label: '8. Time Punctuality', icon: '⏱️', priority: 'low', max_score: 10 },
    { name: 'attendance', label: '9. Parade Attendance', icon: '📋', priority: 'low', max_score: 10 },
  ];

  useEffect(() => {
    let mounted = true;
    if (!propCriteria || propCriteria.length === 0) {
      if (api && api.listCriteria) {
        api.listCriteria()
          .then(list => {
            if (mounted && Array.isArray(list) && list.length > 0) {
              setDbCriteria(list);
            }
          })
          .catch(() => {});
      }
    }
    return () => { mounted = false; };
  }, [propCriteria]);

  const activeCriteriaList = (propCriteria && propCriteria.length > 0)
    ? propCriteria
    : (dbCriteria.length > 0 ? dbCriteria : defaultCriteria);

  const scoreMap = {};
  scores.forEach(s => {
    if (s.criterion_name) scoreMap[s.criterion_name] = s.average_score;
    if (s.criterion_id) scoreMap[s.criterion_id] = s.average_score;
    if (s.name) scoreMap[s.name] = s.average_score !== undefined ? s.average_score : s.score;
  });

  const getPriorityMeta = (p) => {
    const norm = (p || '').toLowerCase();
    if (norm === 'high' || norm === 'more_focus') {
      return {
        badge: '🔥 MORE TO FOCUS',
        badgeClass: 'badge-more-focus',
        style: { background: 'rgba(245, 158, 11, 0.15)', color: '#D97706', border: '1px solid rgba(245, 158, 11, 0.4)' },
        border: '1.5px solid #F59E0B',
        boxShadow: '0 2px 8px rgba(245, 158, 11, 0.12)',
      };
    }
    if (norm === 'low' || norm === 'less_focus') {
      return {
        badge: '🌱 LESS TO FOCUS',
        badgeClass: 'badge-less-focus',
        style: { background: 'rgba(100, 116, 139, 0.12)', color: '#64748B', border: '1px solid rgba(100, 116, 139, 0.3)' },
        border: '1px solid var(--border)',
        boxShadow: 'none',
      };
    }
    return {
      badge: '⭐ STANDARD FOCUS',
      badgeClass: 'badge-standard-focus',
      style: { background: 'rgba(59, 130, 246, 0.1)', color: '#2563EB', border: '1px solid rgba(59, 130, 246, 0.3)' },
      border: '1px solid var(--border)',
      boxShadow: 'none',
    };
  };

  const highCount = activeCriteriaList.filter(c => (c.priority || '').toLowerCase() === 'high' || (c.priority || '').toLowerCase() === 'more_focus').length;
  const lowCount = activeCriteriaList.filter(c => (c.priority || '').toLowerCase() === 'low' || (c.priority || '').toLowerCase() === 'less_focus').length;
  const normalCount = activeCriteriaList.length - highCount - lowCount;

  const filteredCriteria = activeCriteriaList.filter(item => {
    if (filterPriority === 'all') return true;
    const p = (item.priority || 'normal').toLowerCase();
    if (filterPriority === 'high') return p === 'high' || p === 'more_focus';
    if (filterPriority === 'low') return p === 'low' || p === 'less_focus';
    if (filterPriority === 'normal') return p !== 'high' && p !== 'more_focus' && p !== 'low' && p !== 'less_focus';
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {showFilter && activeCriteriaList.length > 4 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
            Filter by Focus:
          </span>
          <button
            type="button"
            onClick={() => setFilterPriority('all')}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              borderRadius: 6,
              border: filterPriority === 'all' ? '1px solid var(--navy-900)' : '1px solid var(--border)',
              background: filterPriority === 'all' ? 'var(--navy-900)' : '#FFFFFF',
              color: filterPriority === 'all' ? '#FFFFFF' : 'var(--navy-900)',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            All Parameters ({activeCriteriaList.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterPriority('high')}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              borderRadius: 6,
              border: filterPriority === 'high' ? '1px solid #D97706' : '1px solid rgba(245, 158, 11, 0.4)',
              background: filterPriority === 'high' ? '#D97706' : 'rgba(245, 158, 11, 0.1)',
              color: filterPriority === 'high' ? '#FFFFFF' : '#B45309',
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            🔥 More to Focus ({highCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterPriority('normal')}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              borderRadius: 6,
              border: filterPriority === 'normal' ? '1px solid #2563EB' : '1px solid rgba(59, 130, 246, 0.3)',
              background: filterPriority === 'normal' ? '#2563EB' : 'rgba(59, 130, 246, 0.08)',
              color: filterPriority === 'normal' ? '#FFFFFF' : '#1D4ED8',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            ⭐ Standard Focus ({normalCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterPriority('low')}
            style={{
              padding: '4px 10px',
              fontSize: 12,
              borderRadius: 6,
              border: filterPriority === 'low' ? '1px solid #475569' : '1px solid rgba(100, 116, 139, 0.3)',
              background: filterPriority === 'low' ? '#475569' : 'rgba(100, 116, 139, 0.08)',
              color: filterPriority === 'low' ? '#FFFFFF' : '#475569',
              cursor: 'pointer',
              fontWeight: 600,
            }}
          >
            🌱 Less to Focus ({lowCount})
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
        {filteredCriteria.map(item => {
          const maxScore = item.max_score || 10;
          let val = 8.0;
          if (scoreMap[item.name] !== undefined) val = scoreMap[item.name];
          else if (scoreMap[item.id] !== undefined) val = scoreMap[item.id];
          else if (item.average_score !== undefined) val = item.average_score;
          else if (item.score !== undefined) val = item.score;

          const pct = Math.min(100, Math.max(0, (val / maxScore) * 100));
          const color = val >= (maxScore * 0.85) ? 'var(--success)' : val >= (maxScore * 0.65) ? 'var(--olive-600)' : val >= (maxScore * 0.5) ? 'var(--warning)' : 'var(--danger)';
          const meta = getPriorityMeta(item.priority);

          return (
            <div
              key={item.id || item.name}
              style={{
                background: 'var(--bg-main)',
                border: meta.border,
                boxShadow: meta.boxShadow,
                borderRadius: 'var(--radius-sm)',
                padding: '14px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                position: 'relative',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                  <span style={{ fontSize: 16 }}>{item.icon || '🎯'}</span>
                  <span>{item.label || item.name.replace(/_/g, ' ').toUpperCase()}</span>
                </span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: 15, color, whiteSpace: 'nowrap' }}>
                  {Number(val).toFixed(1)} <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>/ {maxScore}</span>
                </span>
              </div>

              {/* Focus Priority Pill */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 2 }}>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                    letterSpacing: '0.04em',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                    ...meta.style,
                  }}
                >
                  {meta.badge}
                </span>
                {item.category === 'custom' && (
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Custom Parameter
                  </span>
                )}
              </div>

              <div style={{
                width: '100%',
                height: 6,
                background: 'var(--border)',
                borderRadius: 999,
                overflow: 'hidden',
                marginTop: 4,
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: color,
                  borderRadius: 999,
                  transition: 'width 0.4s ease',
                }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
