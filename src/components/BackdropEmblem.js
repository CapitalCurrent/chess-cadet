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
      <div className="relative grid place-items-center" style={{ marginTop: '2vh' }}>
        {/* Diffuse theme glow behind the metal (breathes slowly). */}
        <div
          className="absolute rounded-full animate-aura"
          style={{
            width: 'min(86vw, 600px)',
            height: 'min(86vw, 600px)',
            background: 'radial-gradient(closest-side, rgb(var(--glow) / 0.16), transparent 70%)',
            filter: 'blur(26px)',
          }}
        />
        <img
          src={`${process.env.PUBLIC_URL}/textures/dragon-shield.png`}
          alt=""
          draggable={false}
          className="relative"
          style={{
            width: 'min(72vw, 440px)',
            opacity: 0.5,
            filter: 'brightness(0.68) contrast(1.05) drop-shadow(0 18px 40px rgba(0,0,0,0.7))',
          }}
        />
      </div>
    </div>
  );
}
