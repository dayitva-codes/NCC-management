import React from 'react';

/**
 * Official National Cadet Corps (NCC) Emblem & Crest
 * Features:
 * - 17 Golden Lotuses surrounding the shield (representing 17 State Directorates)
 * - Tri-color shield with Red (Army), Deep Navy Blue (Navy), and Light Sky Blue (Air Force)
 * - Golden Ashoka Lion Capital at the crest
 * - Bold NCC letters & National Motto: 'एकता और अनुशासन' / 'UNITY AND DISCIPLINE'
 */
export function NccCrest({ size = 48, className = '', showMotto = false, style = {} }) {
  const [imgError, setImgError] = React.useState(false);

  return (
    <div
      className={`ncc-crest-wrapper ${className}`}
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        ...style,
      }}
    >
      {!imgError ? (
        <img
          src="/ncc-logo.png"
          alt="CADET-360 Official NCC Crest"
          width={size}
          height={Math.round(size * 1.08)}
          style={{
            width: size,
            height: 'auto',
            maxHeight: Math.round(size * 1.2),
            objectFit: 'contain',
            filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.2))',
            display: 'block',
          }}
          onError={() => setImgError(true)}
        />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 120 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.15))' }}
        >
        <defs>
          <linearGradient id="nccGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FDE047" />
            <stop offset="50%" stopColor="#EAB308" />
            <stop offset="100%" stopColor="#CA8A04" />
          </linearGradient>
          <linearGradient id="nccDarkGold" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#D97706" />
            <stop offset="100%" stopColor="#92400E" />
          </linearGradient>
          <linearGradient id="nccArmyRed" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#DC2626" />
            <stop offset="100%" stopColor="#991B1B" />
          </linearGradient>
          <linearGradient id="nccNavyBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1E3A8A" />
            <stop offset="100%" stopColor="#0B192C" />
          </linearGradient>
          <linearGradient id="nccAirBlue" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>
        </defs>

        {/* Outer Circular Laurel Wreath Ring representing 17 Directorates */}
        <circle cx="60" cy="62" r="54" stroke="url(#nccGoldGrad)" strokeWidth="2.5" strokeDasharray="6 3" opacity="0.9" />

        {/* 17 Directorate Golden Lotus Petals / Stars around periphery */}
        {[...Array(17)].map((_, i) => {
          const angle = (i * (360 / 17) - 90) * (Math.PI / 180);
          const x = 60 + 52 * Math.cos(angle);
          const y = 62 + 52 * Math.sin(angle);
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="2.8"
              fill="url(#nccGoldGrad)"
              stroke="#78350F"
              strokeWidth="0.5"
            />
          );
        })}

        {/* Ashoka Lion Capitol Header at Top */}
        <g transform="translate(48, 8)">
          <rect x="2" y="10" width="20" height="3" rx="1.5" fill="url(#nccGoldGrad)" />
          <path
            d="M5 10 C5 4, 19 4, 19 10 Z"
            fill="url(#nccGoldGrad)"
            stroke="#92400E"
            strokeWidth="0.5"
          />
          <circle cx="12" cy="5" r="2.5" fill="url(#nccDarkGold)" />
        </g>

        {/* The Central Tri-Color Shield */}
        <g transform="translate(30, 26)">
          {/* Shield Border / Outer Gold Rim */}
          <path
            d="M3 4 C3 4, 57 4, 57 4 C57 28, 52 56, 30 68 C8 56, 3 28, 3 4 Z"
            fill="#FFFFFF"
            stroke="url(#nccGoldGrad)"
            strokeWidth="3.5"
          />

          {/* Tri-Color Inner Stripes: Red (Army), Deep Navy (Navy), Sky Blue (Air Force) */}
          <clipPath id="shieldClip">
            <path d="M4 5 C4 5, 56 5, 56 5 C56 27, 51 54, 30 66 C9 54, 4 27, 4 5 Z" />
          </clipPath>

          <g clipPath="url(#shieldClip)">
            {/* 1. Army Wing Stripe (Red) */}
            <rect x="4" y="5" width="17" height="62" fill="url(#nccArmyRed)" />

            {/* 2. Navy Wing Stripe (Deep Navy Blue) */}
            <rect x="21" y="5" width="18" height="62" fill="url(#nccNavyBlue)" />

            {/* 3. Air Wing Stripe (Sky Blue) */}
            <rect x="39" y="5" width="17" height="62" fill="url(#nccAirBlue)" />

            {/* Subtle gloss overlay on shield */}
            <path
              d="M4 5 L56 5 L4 35 Z"
              fill="white"
              fillOpacity="0.12"
            />

            {/* Bold Golden NCC Text across Shield Center */}
            <text
              x="30"
              y="38"
              fill="#FFFFFF"
              stroke="#070D18"
              strokeWidth="0.8"
              fontSize="16"
              fontWeight="900"
              fontFamily="system-ui, sans-serif"
              textAnchor="middle"
              letterSpacing="1.5"
              style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.8))' }}
            >
              NCC
            </text>
          </g>
        </g>

        {/* Lower Banner Ribbon: 'UNITY & DISCIPLINE' */}
        <g transform="translate(14, 95)">
          {/* Ribbon Tail Left */}
          <path d="M0 12 L12 0 L12 18 Z" fill="#B45309" />
          {/* Ribbon Tail Right */}
          <path d="M92 12 L80 0 L80 18 Z" fill="#B45309" />

          {/* Main Gold Scroll */}
          <rect
            x="8"
            y="0"
            width="76"
            height="18"
            rx="3"
            fill="url(#nccGoldGrad)"
            stroke="#92400E"
            strokeWidth="1"
          />
          <text
            x="46"
            y="12"
            fill="#451A03"
            fontSize="7"
            fontWeight="800"
            fontFamily="system-ui, sans-serif"
            textAnchor="middle"
            letterSpacing="0.6"
          >
            UNITY & DISCIPLINE
          </text>
        </g>
      </svg>
      )}

      {showMotto && (
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--ncc-gold, #D97706)',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            marginTop: 4,
          }}
        >
          एकता और अनुशासन
        </span>
      )}
    </div>
  );
}

/**
 * Indian Army Wing Emblem (Red Badge with Crossed Swords)
 */
export function ArmyWingEmblem({ size = 36, className = '' }) {
  return (
    <div className={`wing-emblem army ${className}`} title="Indian Army Wing">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#991B1B" stroke="#FBBF24" strokeWidth="2" />
        {/* Crossed Swords */}
        <path d="M12 36 L36 12 M36 12 L32 12 M36 12 L36 16" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M36 36 L12 12 M12 12 L16 12 M12 12 L12 16" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="24" cy="24" r="4" fill="#FEF08A" />
      </svg>
    </div>
  );
}

/**
 * Indian Navy Wing Emblem (Navy Blue Badge with Golden Anchor)
 */
export function NavyWingEmblem({ size = 36, className = '' }) {
  return (
    <div className={`wing-emblem navy ${className}`} title="Indian Navy Wing">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#0B192C" stroke="#FBBF24" strokeWidth="2" />
        {/* Naval Anchor */}
        <circle cx="24" cy="14" r="3.5" stroke="#FEF08A" strokeWidth="2" fill="none" />
        <path d="M24 17.5 L24 35" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M17 21 L31 21" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M13 28 C13 36, 35 36, 35 28" stroke="#FEF08A" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      </svg>
    </div>
  );
}

/**
 * Indian Air Wing Emblem (Sky Blue Badge with Eagle Wings)
 */
export function AirWingEmblem({ size = 36, className = '' }) {
  return (
    <div className={`wing-emblem air ${className}`} title="Indian Air Wing">
      <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="22" fill="#0284C7" stroke="#FBBF24" strokeWidth="2" />
        {/* Eagle Wings & Chakra */}
        <path
          d="M8 22 C14 18, 20 20, 24 24 C28 20, 34 18, 40 22 C34 26, 28 27, 24 25 C20 27, 14 26, 8 22 Z"
          fill="#FEF08A"
          stroke="#B45309"
          strokeWidth="0.8"
        />
        <circle cx="24" cy="24" r="3.5" fill="#0B192C" stroke="#FEF08A" strokeWidth="1.5" />
      </svg>
    </div>
  );
}

/**
 * Official NCC Tri-Service Ribbon Bar (Red, Deep Blue, Light Blue)
 */
export function NccRibbonBar({ height = 4, width = '100%', style = {} }) {
  return (
    <div
      className="ncc-tri-service-ribbon"
      style={{
        height,
        width,
        background: 'linear-gradient(90deg, #DC2626 0%, #DC2626 33.33%, #0B192C 33.33%, #0B192C 66.66%, #0284C7 66.66%, #0284C7 100%)',
        ...style,
      }}
    />
  );
}

export default NccCrest;

