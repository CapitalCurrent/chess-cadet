import React from 'react';
import { IconLearn, IconPlay } from './icons';
import CoatOfArms from './CoatOfArms';

// The landing screen / launcher — a welcoming brand hero, then two big choices
// (Learn / Play) with a small "Continue" link to resume the current line.
export default function HomePage({ opening, activeLine, playerName, onContinue, onLearn, onPlay }) {
  const Card = ({ onClick, icon, title, subtitle, delay }) => (
    <button
      onClick={onClick}
      className="cc-card cc-reveal w-full p-4 md:p-5 flex items-center gap-4 text-left animate-float"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className="grid place-items-center shrink-0 rounded-cc-lg text-gold"
        style={{
          width: 56,
          height: 56,
          background: 'rgb(var(--surface-2))',
          border: '1px solid var(--edge-soft)',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
        }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-extrabold text-frost text-lg md:text-xl">{title}</span>
        <span className="block text-sm text-frost-dim truncate">{subtitle}</span>
      </span>
      <span className="text-frost-dim text-2xl shrink-0">›</span>
    </button>
  );

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-8 md:min-h-[72vh] md:flex md:flex-col md:justify-center">
      {/* Brand hero */}
      <div className="relative text-center mb-7">
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-6 w-64 h-64 rounded-full"
          style={{ background: 'radial-gradient(closest-side, rgba(246,197,68,0.16), transparent)' }}
        />
        <div className="relative animate-pop flex justify-center">
          <div className="animate-bob">
            <CoatOfArms charge="knight" tint="onyx" size={84} />
          </div>
        </div>
        {playerName && (
          <div className="relative mt-4 text-base md:text-lg font-bold text-gold">Hi {playerName}!</div>
        )}
        <div className={`relative ${playerName ? 'mt-0.5' : 'mt-4'} text-2xl md:text-4xl font-extrabold text-frost font-round`}>What do you want to do?</div>
        <div className="relative text-sm md:text-base text-frost-dim mt-1.5">Pick a lesson, or play a game.</div>
      </div>

      <div className="space-y-3 md:space-y-4">
        <Card
          onClick={onLearn}
          icon={<IconLearn size={28} />}
          title="Learn"
          subtitle="Openings, notation & more"
          delay={60}
        />
        <Card
          onClick={onPlay}
          icon={<IconPlay size={28} />}
          title="Play a game"
          subtitle="Challenge the computer"
          delay={140}
        />
      </div>

      {opening && (
        <div className="mt-5 flex justify-center animate-float" style={{ animationDelay: '220ms' }}>
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
