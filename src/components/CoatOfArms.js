import React from 'react';
import { getCharge, getTint } from '../state/profiles';

// A generative heraldic crest: a heater shield in the player's chosen metal/tint
// with a chess (or heraldic) charge, plus a theme-accent rim glow so it reads as
// "lit" in every theme (cyan in neon/obsidian, silver in black-&-silver). Pure
// SVG — crisp at any size, recolors instantly, no raster assets.
const SHIELD = 'M9 7 H91 V53 C91 83 66 99 50 106 C34 99 9 83 9 53 Z';

export default function CoatOfArms({ charge, tint, size = 44, glow = true, className = '', style }) {
  const c = getCharge(charge);
  const t = getTint(tint);
  // Stable-but-unique gradient ids so multiple crests don't collide.
  const uid = `coa-${c.id}-${t.id}`;

  return (
    <svg
      viewBox="0 0 100 112"
      width={size}
      height={size * (112 / 100)}
      className={className}
      style={style}
      role="img"
      aria-label={`${t.name} shield with ${c.label}`}
    >
      <defs>
        <linearGradient id={`${uid}-field`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={t.light} />
          <stop offset="52%" stopColor={t.base} />
          <stop offset="100%" stopColor={t.dark} />
        </linearGradient>
        <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
          <stop offset="42%" stopColor="#ffffff" stopOpacity="0.04" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${uid}-charge`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#fbfcfe" />
          <stop offset="55%" stopColor="#dfe4ec" />
          <stop offset="100%" stopColor="#aab1bd" />
        </linearGradient>
      </defs>

      {/* Theme-accent rim glow (uses CSS var so it follows the active theme). */}
      <path
        d={SHIELD}
        fill="none"
        stroke="rgb(var(--glow))"
        strokeWidth="5"
        style={glow ? { filter: 'blur(2.5px)', opacity: 0.7 } : { opacity: 0 }}
      />

      {/* Field */}
      <path d={SHIELD} fill={`url(#${uid}-field)`} />
      {/* Top sheen */}
      <path d={SHIELD} fill={`url(#${uid}-sheen)`} />
      {/* Inner depth line */}
      <path d={SHIELD} fill="none" stroke="rgba(0,0,0,0.28)" strokeWidth="1.5" />
      {/* Metal bordure (theme accent) */}
      <path d={SHIELD} fill="none" stroke="rgb(var(--gold))" strokeWidth="2.6" />

      {/* Charge */}
      <text
        x="50"
        y="56"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={c.size || 46}
        fontFamily="'Segoe UI Symbol','Apple Symbols','Noto Sans Symbols 2',serif"
        fill={`url(#${uid}-charge)`}
        style={{ filter: 'drop-shadow(0 1px 0 rgba(0,0,0,0.45))' }}
      >
        {c.glyph}
      </text>
    </svg>
  );
}
