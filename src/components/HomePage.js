import React from 'react';
import { IconLearn, IconPlay } from './icons';

// The landing screen / launcher. Two big choices — Learn (the subject catalog)
// and Play — with a small, quiet "Continue" link to resume the current line
// without competing with the two main cards.
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
        <div className="text-sm md:text-base text-frost-dim mt-1.5">Pick a lesson, or play a game.</div>
      </div>

      <div className="space-y-3 md:space-y-4">
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
          bg="linear-gradient(180deg,#f6c544 0%,#e0a92e 100%)"
          title="Play a game"
          subtitle="Challenge the computer"
        />
      </div>

      {opening && (
        <div className="mt-5 flex justify-center">
          <button
            onClick={onContinue}
            className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm text-frost-dim hover:text-frost hover:bg-white/5 transition-colors"
          >
            <span className="text-gold text-base leading-none">▶</span>
            <span>Continue</span>
            <span className="font-bold text-frost truncate max-w-[60vw]">
              {opening.icon} {opening.name}{activeLine ? ` · ${activeLine.name}` : ''}
            </span>
          </button>
        </div>
      )}
    </div>
  );
}
