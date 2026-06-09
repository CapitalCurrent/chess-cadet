import React from 'react';

// Large dark engraved-metal shield behind the whole app — the "Lair" centerpiece.
// Dark graphite steel (theme-neutral) with a raised rim, rivets, an embossed
// charge, and soft shadows; the only theme color is a DIFFUSE glow pooling behind
// it (cyan in neon, silver/amber in the others). Sits under content + acrylic
// (-z-10), Fluent depth. PLACEHOLDER for a photoreal Grok dragon-shield PNG —
// when that lands it swaps into this slot (drop an <img> in place of the <svg>).
const OUTER = 'M100 10 L188 10 L188 110 C188 176 150 210 100 228 C50 210 12 176 12 110 L12 10 Z';
const INNER = 'M100 26 L174 26 L174 110 C174 166 143 193 100 209 C57 193 26 166 26 110 L26 26 Z';
// Rivet centers around the rim.
const RIVETS = [
  [30, 22], [70, 16], [130, 16], [170, 22],
  [22, 70], [178, 70], [30, 130], [170, 130], [100, 214],
];

export default function BackdropEmblem() {
  return (
    <div
      className="fixed inset-0 -z-10 grid place-items-center overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 200 240"
        className="animate-aura"
        style={{ width: 'min(80vw, 560px)', opacity: 0.4, marginTop: '3vh' }}
      >
        <defs>
          <radialGradient id="be-glow" cx="50%" cy="46%" r="62%">
            <stop offset="0%" stopColor="rgb(var(--glow))" stopOpacity="0.14" />
            <stop offset="55%" stopColor="rgb(var(--glow))" stopOpacity="0.04" />
            <stop offset="100%" stopColor="rgb(var(--glow))" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="be-field" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#191c21" />
            <stop offset="48%" stopColor="#101216" />
            <stop offset="100%" stopColor="#070809" />
          </linearGradient>
          <linearGradient id="be-rim" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2a2f36" />
            <stop offset="50%" stopColor="#16191e" />
            <stop offset="100%" stopColor="#0a0b0d" />
          </linearGradient>
          <linearGradient id="be-sheen" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.07" />
            <stop offset="38%" stopColor="#ffffff" stopOpacity="0.015" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="be-charge" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#262a30" />
            <stop offset="100%" stopColor="#0c0e11" />
          </linearGradient>
          <radialGradient id="be-rivet" cx="38%" cy="34%" r="70%">
            <stop offset="0%" stopColor="#3a3f46" />
            <stop offset="60%" stopColor="#1a1d22" />
            <stop offset="100%" stopColor="#08090b" />
          </radialGradient>
          <filter id="be-shadow" x="-30%" y="-20%" width="160%" height="150%">
            <feDropShadow dx="0" dy="7" stdDeviation="9" floodColor="#000" floodOpacity="0.6" />
          </filter>
        </defs>

        {/* Diffuse theme glow behind the metal */}
        <ellipse cx="100" cy="116" rx="128" ry="138" fill="url(#be-glow)" />

        {/* Raised rim (with drop shadow) */}
        <path d={OUTER} fill="url(#be-rim)" filter="url(#be-shadow)" />
        {/* Engraved/recessed field */}
        <path d={INNER} fill="url(#be-field)" />
        {/* Inner shadow line where the field meets the rim */}
        <path d={INNER} fill="none" stroke="#000" strokeOpacity="0.5" strokeWidth="2.5" />
        {/* Top sheen on the field */}
        <path d={INNER} fill="url(#be-sheen)" />

        {/* Rivets */}
        {RIVETS.map(([cx, cy], i) => (
          <circle key={i} cx={cx} cy={cy} r="4.2" fill="url(#be-rivet)" stroke="#000" strokeOpacity="0.4" strokeWidth="0.6" />
        ))}

        {/* Embossed charge (placeholder for the dragon) */}
        <text
          x="100"
          y="118"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="92"
          fontFamily="'Segoe UI Symbol','Noto Sans Symbols 2',serif"
          fill="url(#be-charge)"
          style={{ filter: 'drop-shadow(0 2px 1px rgba(255,255,255,0.10)) drop-shadow(0 -1px 1px rgba(0,0,0,0.55))' }}
        >
          ♞
        </text>
      </svg>
    </div>
  );
}
