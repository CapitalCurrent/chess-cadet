import React from 'react';

// Large faint heraldic emblem behind the whole app — the "Lair" watermark. Sits
// under the content + acrylic (negative z-index) so surfaces float over it
// (Fluent depth). Theme-tinted via --glow so it morphs cyan/silver. Breathes
// slowly. PLACEHOLDER: this stylized shield stands in for a Grok dragon-shield;
// when that art lands (grayscale/transparent PNG) it drops into this same slot.
const SHIELD = 'M50 4 L96 4 L96 56 C96 92 70 110 50 118 C30 110 4 92 4 56 L4 4 Z';

export default function BackdropEmblem() {
  return (
    <div
      className="fixed inset-0 -z-10 grid place-items-center overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 100 122"
        className="animate-aura"
        style={{ width: 'min(86vw, 620px)', opacity: 0.07, marginTop: '4vh' }}
      >
        {/* Field wash */}
        <path d={SHIELD} fill="rgb(var(--glow))" opacity="0.12" />
        {/* Bordure */}
        <path d={SHIELD} fill="none" stroke="rgb(var(--glow))" strokeWidth="1.1" />
        <path d={SHIELD} fill="none" stroke="rgb(var(--glow))" strokeWidth="0.4" transform="translate(50 61) scale(0.9) translate(-50 -61)" />
        {/* Charge (knight placeholder for the dragon emblem) */}
        <text
          x="50"
          y="58"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="52"
          fontFamily="'Segoe UI Symbol','Noto Sans Symbols 2',serif"
          fill="rgb(var(--glow))"
        >
          ♞
        </text>
      </svg>
    </div>
  );
}
