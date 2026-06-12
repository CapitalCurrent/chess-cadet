import React from 'react';
import { IconLearn, IconPlay, IconNotebook } from './icons';

// The landing screen / launcher — a welcoming brand hero, then two big choices
// (Learn / Play) with a small "Continue" link to resume the current line. When
// the coach has collected mistakes to fix, a Notebook card appears between them.
export default function HomePage({ opening, activeLine, playerName, notebookCount = 0, onContinue, onLearn, onPlay, onFixMistakes }) {
  const Card = ({ onClick, icon, title, subtitle, delay }) => (
    <button
      onClick={onClick}
      className="cc-glass cc-reveal w-full p-4 md:p-5 flex items-center gap-4 text-left animate-float"
      style={{ animationDelay: `${delay}ms` }}
    >
      <span
        className="grid place-items-center shrink-0 rounded-cc-lg text-gold"
        style={{
          width: 54,
          height: 54,
          background: 'rgb(var(--surface) / 0.4)',
          border: '1px solid var(--edge-soft)',
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
      {/* Hero — the big backdrop shield IS the emblem, so no floating crest here. */}
      <div className="relative text-center mb-7 pt-2">
        {playerName && (
          <div className="text-base md:text-lg font-bold text-gold">Hi {playerName}!</div>
        )}
        <div className="mt-1 text-3xl md:text-5xl font-extrabold text-frost font-round">What do you want to do?</div>
        <div className="text-sm md:text-base text-frost-dim mt-2">Pick a lesson, or play a game.</div>
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
        {onFixMistakes && (
          <Card
            onClick={onFixMistakes}
            icon={<IconNotebook size={28} />}
            title="Coach's Notebook"
            subtitle={
              notebookCount > 0
                ? `${notebookCount} position${notebookCount === 1 ? '' : 's'} from your games to fix`
                : 'Play with Coach on — mistakes you can fix land here'
            }
            delay={220}
          />
        )}
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
