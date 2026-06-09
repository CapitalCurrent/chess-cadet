import React from 'react';

// "Lair" backdrop behind the whole app: the big dark dragon shield centered, with
// the dragon KNIGHT and a dragon PAWN flanking it as faint heraldic supporters
// (desktop only). Everything dark + dimmed so it emerges from the black and never
// competes with content. Theme glow catches the edges. Sits under content +
// acrylic (-z-10) for Fluent depth.
const PUB = process.env.PUBLIC_URL;

export default function BackdropEmblem() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden="true">
      {/* Flanking dragon pieces — supporters (desktop only). */}
      <img
        src={`${PUB}/pieces/dragons/bN.png`}
        alt=""
        draggable={false}
        className="hidden lg:block absolute"
        style={{
          left: '2%',
          top: '50%',
          transform: 'translateY(-50%)',
          height: '52vh',
          opacity: 0.1,
          filter: 'brightness(1.2) drop-shadow(0 0 16px rgb(var(--glow) / 0.25))',
        }}
      />
      <img
        src={`${PUB}/pieces/dragons/bP.png`}
        alt=""
        draggable={false}
        className="hidden lg:block absolute"
        style={{
          right: '2%',
          top: '50%',
          transform: 'translateY(-50%) scaleX(-1)',
          height: '50vh',
          opacity: 0.1,
          filter: 'brightness(1.2) drop-shadow(0 0 16px rgb(var(--glow) / 0.25))',
        }}
      />

      {/* Center shield. */}
      <div className="absolute inset-0 grid place-items-center">
        <img
          src={`${PUB}/textures/dragon-shield.png`}
          alt=""
          draggable={false}
          className="backdrop-shield"
          style={{
            marginTop: '2vh',
            opacity: 0.4,
            filter: 'brightness(0.5) contrast(1.12) drop-shadow(0 16px 40px rgba(0,0,0,0.75))',
          }}
        />
      </div>
    </div>
  );
}
