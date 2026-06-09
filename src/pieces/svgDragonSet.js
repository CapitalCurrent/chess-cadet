import React from 'react';

// "Dragon Bold" — a code-drawn vector set tuned for CLARITY at small sizes:
// thick outlines, minimal interior detail, large fill, and maximally distinct
// silhouettes (battlemented rook, ball+slit bishop, spiky-crown queen, cross
// king, dragon-head knight, round pawn). Crisp at any size, recolors per side.
// viewBox 0 0 45 45 (Staunton convention).

const COLORS = {
  w: { fill: '#f1e9d6', stroke: '#19212f', accent: '#19212f' },
  b: { fill: '#1b2433', stroke: '#aeb6c4', accent: '#aeb6c4' },
};

// Shared foot + collar so the set reads as one family.
const BASE = 'M11 41 C11 36.5 15 35.5 15 35.5 H30 C30 35.5 34 36.5 34 41 Z';
const COLLAR = 'M14.5 35.5 L16 31.5 H29 L30.5 35.5 Z';

const PIECES = {
  // Pawn — small round head, simplest shape.
  p: {
    circles: [{ cx: 22.5, cy: 18, r: 5 }],
    paths: [BASE, 'M16.5 35.5 L18 25 H27 L28.5 35.5 Z'],
  },
  // Rook — castellated tower (blocky, unmistakable).
  r: {
    paths: [
      BASE,
      COLLAR,
      'M15.5 31.5 V21 H29.5 V31.5 Z',
      'M13.5 21 V15.5 H17 V18 H20.5 V15.5 H24.5 V18 H28 V15.5 H31.5 V21 Z',
    ],
  },
  // Bishop — tall body, ball top + mitre slit.
  b: {
    circles: [{ cx: 22.5, cy: 11, r: 2.2 }],
    paths: [BASE, COLLAR, 'M16 31.5 C14 25 16.5 19 22.5 15 C28.5 19 31 25 29 31.5 Z'],
    lines: [{ x1: 20, y1: 15, x2: 25, y2: 11 }],
  },
  // Knight — proven Staunton knight silhouette (clearest; a hand-drawn dragon
  // head reads as a duck at this size). Dragon flavor lives in the other sets.
  n: {
    paths: [
      'M22 10c10.5 1 16.5 8 16 29H15c0-9 10-6.5 8-21',
      'M24 18c.38 2.91-5.55 7.37-8 9-3 2-2.82 4.34-5 4-1.042-.94 1.41-3.04 0-3-1 0 .19 1.23-1 2-1 0-4.003 1-4-4 0-2 6-12 6-12s1.89-1.9 2-3.5c-.73-.994-.5-2-.5-3 1-1 3 2.5 3 2.5h2s.78-1.992 2.5-3c1 0 1 3 1 3',
    ],
    dots: [
      { cx: 9, cy: 25.3, r: 0.9 },
      { cx: 14.7, cy: 15.7, r: 1.0 },
    ],
  },
  // Queen — spiky 4-point crown with ball tips.
  q: {
    paths: [
      BASE,
      COLLAR,
      'M16 31.5 L14 21 H31 L29 31.5 Z',
      'M14 21 L12.5 13 L17 17.5 L20 12 L22.5 16.5 L25 12 L28 17.5 L32.5 13 L31 21 Z',
    ],
    dots: [
      { cx: 12.5, cy: 13, r: 1.6 },
      { cx: 20, cy: 12, r: 1.6 },
      { cx: 25, cy: 12, r: 1.6 },
      { cx: 32.5, cy: 13, r: 1.6 },
    ],
  },
  // King — tallest, topped with a cross.
  k: {
    paths: [
      BASE,
      COLLAR,
      'M16 31.5 L14.5 22 H30.5 L29 31.5 Z',
      'M15 22 L15.5 17 H29.5 L30 22 Z',
      'M20.8 17 V12 H18.5 V9.5 H20.8 V7 H24.2 V9.5 H26.5 V12 H24.2 V17 Z',
    ],
  },
};

export function renderSvgDragon(color, type) {
  const p = PIECES[type] || PIECES.p;
  const c = COLORS[color] || COLORS.w;
  return (
    <svg viewBox="0 0 45 45" className="w-full h-full" style={{ pointerEvents: 'none' }}>
      <g fill={c.fill} stroke={c.stroke} strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round">
        {(p.paths || []).map((d, i) => (
          <path key={i} d={d} />
        ))}
        {(p.circles || []).map((ci, i) => (
          <circle key={`c${i}`} {...ci} />
        ))}
        {(p.lines || []).map((l, i) => (
          <line key={`l${i}`} {...l} fill="none" />
        ))}
        {(p.dots || []).map((dt, i) => (
          <circle key={`d${i}`} {...dt} fill={c.accent} stroke="none" />
        ))}
      </g>
    </svg>
  );
}
