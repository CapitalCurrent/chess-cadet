import React from 'react';

// Large dragon shield behind the whole app — the "Lair" centerpiece. The art is
// a dark gunmetal Grok shield (dragon + chess-piece border), keyed to a
// transparent PNG. It's dimmed so it emerges from the black rather than sitting
// on top of content, with a soft DIFFUSE theme-colored glow pooling behind it
// (cyan in neon, silver/amber in the others). Sits under content + acrylic
// (-z-10) for Fluent depth.
export default function BackdropEmblem() {
  return (
    <div
      className="fixed inset-0 -z-10 grid place-items-center overflow-hidden pointer-events-none"
      aria-hidden="true"
    >
      {/* Dark metal shield emerging from the black — no glow behind it (that was
          washing the center grey); just a deep grounding shadow. */}
      <img
        src={`${process.env.PUBLIC_URL}/textures/dragon-shield.png`}
        alt=""
        draggable={false}
        style={{
          width: 'min(66vw, 400px)',
          marginTop: '2vh',
          opacity: 0.4,
          filter: 'brightness(0.5) contrast(1.12) drop-shadow(0 16px 40px rgba(0,0,0,0.75))',
        }}
      />
    </div>
  );
}
