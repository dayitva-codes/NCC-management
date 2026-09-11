import { useState } from 'react';
import { setApiBase } from '../api/client';

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

export function NinePillarsMatrix({ scores = [] }) {
  const defaultCriteria = [
    { name: 'drill', label: 'Drill & Parade Precision', icon: '🎖️' },
    { name: 'physical_fitness', label: 'Physical Fitness & Endurance', icon: '🏃' },
    { name: 'communication', label: 'Communication & Briefing', icon: '📢' },
    { name: 'leadership', label: 'Leadership & Squad Command', icon: '⭐' },
    { name: 'ncc_knowledge', label: 'NCC Knowledge & SOPs', icon: '📖' },
    { name: 'discipline', label: 'Discipline & Bearing', icon: '🛡️' },
    { name: 'time_punctuality', label: 'Time Punctuality', icon: '⏱️' },
    { name: 'teamwork', label: 'Teamwork & Esprit de Corps', icon: '🤝' },
    { name: 'attendance', label: 'Parade Attendance', icon: '📋' },
  ];

  const scoreMap = {};
  scores.forEach(s => {
    scoreMap[s.criterion_name] = s.average_score;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }}>
      {defaultCriteria.map(item => {
        const val = scoreMap[item.name] !== undefined ? scoreMap[item.name] : 8.0;
        const pct = Math.min(100, Math.max(0, (val / 10) * 100));
        const color = val >= 8.5 ? 'var(--success)' : val >= 6.5 ? 'var(--olive-600)' : val >= 5.0 ? 'var(--warning)' : 'var(--danger)';

        return (
          <div key={item.name} style={{
            background: 'var(--bg-main)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            padding: '14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--navy-900)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{item.icon}</span> {item.label}
              </span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 14, color }}>
                {val.toFixed(1)} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>/ 10</span>
              </span>
            </div>
            <div style={{
              width: '100%',
              height: 6,
              background: 'var(--border)',
              borderRadius: 999,
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${pct}%`,
                height: '100%',
                background: color,
                borderRadius: 999,
                transition: 'width 0.4s ease'
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
