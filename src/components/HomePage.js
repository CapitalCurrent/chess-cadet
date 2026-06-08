import React from 'react';
import { IconLearn, IconPlay } from './icons';

// The landing screen / launcher — greets with CHOICES instead of dropping into a
// lesson. Continue resumes the current opening line; Learn opens the subject
// catalog (openings, notation, …); Play starts a game.
export default function HomePage({ opening, activeLine, onContinue, onLearn, onPlay }) {
  const Card = ({ onClick, icon, bg, title, subtitle }) => (
    <button onClick={onClick} className="cc-card cc-reveal w-full p-4 md:p-5 flex items-center gap-4 text-left">
      <span
        className="grid place-items-center shrink-0 rounded-cc-lg"
        style={{ width: 56, height: 56, background: bg, color: '#0e1726' }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-frost text-lg md:text-xl">{title}</span>
        <span className="block text-sm text-frost-dim truncate">{subtitle}</span>
      </span>
      <span className="text-gold text-2xl shrink-0">▶</span>
    </button>
  );

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-8 md:min-h-[68vh] md:flex md:flex-col md:justify-center">
      <div className="text-center mb-7">
        <div className="text-2xl md:text-4xl font-extrabold text-frost font-round">What do you want to do?</div>
        <div className="text-sm md:text-base text-frost-dim mt-1.5">Pick up where you left off, learn, or play.</div>
      </div>

      <div className="space-y-3 md:space-y-4">
        {opening && (
          <Card
            onClick={onContinue}
            icon={<span className="text-2xl font-black leading-none">▶</span>}
            bg="linear-gradient(180deg,#f6c544 0%,#e0a92e 100%)"
            title="Keep learning"
            subtitle={`${opening.icon} ${opening.name}${activeLine ? ` · ${activeLine.name}` : ''}`}
          />
        )}
        <Card
          onClick={onLearn}
          icon={<IconLearn size={28} />}
          bg="linear-gradient(180deg,#8fdb9b 0%,#5bbf6e 100%)"
          title="Learn"
          subtitle="Openings, notation & more"
        />
        <Card
          onClick={onPlay}
          icon={<IconPlay size={28} />}
          bg="linear-gradient(180deg,#ef8a6e 0%,#e76f51 100%)"
          title="Play a game"
          subtitle="Challenge the computer"
        />
      </div>
    </div>
  );
}
