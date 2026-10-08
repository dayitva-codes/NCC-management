import React from 'react';

/**
 * RefreshingBuffer Component
 * 
 * A high-performance, military-themed buffer & refresh animation component.
 * Displays a rotating tactical radar sweep with glowing concentric rings,
 * an animated tricolor shimmer bar, and dynamic synchronization status text.
 * 
 * Can be used as:
 * - A full-page overlay during initial sync or route loading
 * - An inline card buffer during data fetching and background re-syncing
 * 
 * @param {string} message - Primary headline text (e.g., "Synchronizing with Command Database...")
 * @param {string} subMessage - Secondary contextual guidance
 * @param {boolean} fullScreen - If true, covers entire screen; otherwise fits parent container
 * @param {number} minHeight - Minimum height for inline container (default: 260px)
 */
export function RefreshingBuffer({
  message,
  label,
  subMessage,
  subtext,
  fullScreen = false,
  minHeight = 240,
}) {
  const displayMsg = message || label || 'Synchronizing with Command Database…';
  const displaySub = subMessage || subtext || 'Fetching authentic ledger records in real time';

  const containerStyle = fullScreen
    ? {
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 25, 44, 0.75)',
        backdropFilter: 'blur(6px)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }
    : {
        width: '100%',
        minHeight,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '36px 20px',
        background: 'rgba(248, 250, 252, 0.7)',
        borderRadius: 12,
        border: '1px dashed var(--border, #cbd5e1)',
      };

  return (
    <div style={containerStyle} className="refreshing-buffer-wrap" role="status" aria-live="polite">
      {/* Tactical Concentric Radar & Rotating Sweep Beam */}
      <div
        style={{
          position: 'relative',
          width: 80,
          height: 80,
          marginBottom: 18,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {/* Outer Pulsing Wave */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            border: '2px solid rgba(37, 99, 235, 0.35)',
            animation: 'bufferRadarPulse 2s cubic-bezier(0.2, 0.8, 0.2, 1) infinite',
          }}
        />

        {/* Middle Fixed Ring */}
        <div
          style={{
            position: 'absolute',
            inset: 10,
            borderRadius: '50%',
            border: '1.5px dashed rgba(217, 119, 6, 0.45)',
          }}
        />

        {/* Inner Ring */}
        <div
          style={{
            position: 'absolute',
            inset: 22,
            borderRadius: '50%',
            border: '1px solid rgba(21, 128, 61, 0.5)',
          }}
        />

        {/* 360-Degree Rotating Radar Scanner Beam */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '50%',
            background: 'conic-gradient(from 0deg, transparent 0deg, transparent 270deg, rgba(37, 99, 235, 0.6) 360deg)',
            animation: 'bufferRadarSweep 1.6s linear infinite',
          }}
        />

        {/* Center Golden Command Dot */}
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            boxShadow: '0 0 10px #f59e0b',
            zIndex: 2,
          }}
        />
      </div>

      {/* Primary Status Headline */}
      <div
        style={{
          fontWeight: 800,
          fontSize: 14,
          color: fullScreen ? '#FFFFFF' : 'var(--navy-900, #0b1d3a)',
          letterSpacing: '0.04em',
          textAlign: 'center',
          marginBottom: 6,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>{displayMsg}</span>
        <span className="buffer-pulsing-dots" />
      </div>

      {/* Subtext Guidance */}
      {displaySub && (
        <div
          style={{
            fontSize: 12,
            color: fullScreen ? '#94a3b8' : 'var(--text-muted, #64748b)',
            textAlign: 'center',
            maxWidth: 360,
            lineHeight: 1.4,
            marginBottom: 14,
          }}
        >
          {displaySub}
        </div>
      )}

      {/* Shimmering Tricolor Activity Bar */}
      <div
        style={{
          width: 160,
          height: 3,
          borderRadius: 2,
          background: 'linear-gradient(90deg, #d97706, #1d4ed8, #15803d, #d97706)',
          backgroundSize: '200% 100%',
          animation: 'bufferShimmer 1.8s ease-in-out infinite',
        }}
      />
    </div>
  );
}

export default RefreshingBuffer;

/**
 * TopBufferBar Component
 * 
 * Fixed micro-progress bar at top of viewport.
 * Shows active syncing whenever API requests or page navigations are running.
 */
export function TopBufferBar({ active = false }) {
  if (!active) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 99999,
        background: 'linear-gradient(90deg, #d97706 0%, #1d4ed8 50%, #15803d 100%)',
        backgroundSize: '200% 100%',
        animation: 'bufferShimmer 1.2s linear infinite',
        boxShadow: '0 0 8px rgba(37, 99, 235, 0.6)',
      }}
    />
  );
}
