import React from 'react';
import { IconLearn, IconPlay, IconNotebook } from './icons';

// The landing screen / launcher — a welcoming brand hero, Today's Lesson (a
// teacher-style daily checklist), then the big choices (Learn / Play /
// Coach's Notebook) with a small "Continue" link to resume the current line.
export default function HomePage({ opening, activeLine, playerName, notebookCount = 0, lesson, chessPower, onLessonStep, onContinue, onLearn, onPlay, onFixMistakes }) {
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
        {chessPower && chessPower.games > 0 && (
          <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-3 py-1 bg-white/[0.05] ring-1 ring-[var(--edge-soft)]">
            <span className="text-xs uppercase tracking-wide text-frost-dim font-bold">Chess Power</span>
            <span className="text-sm font-extrabold text-gold">{chessPower.rating}</span>
            {chessPower.provisional && <span className="text-[10px] text-frost-dim font-bold">finding your level…</span>}
          </div>
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

      {/* Today's plan — the teacher's suggested session. Lives BELOW the main
          choices (it's guidance, not a gate); collapses to one line once done.
          Steps tick off wherever she does them; tapping one jumps right in. */}
      {lesson && lesson.steps.length > 0 && (
        <div className="cc-glass p-3.5 mt-4 animate-float" style={{ animationDelay: '280ms' }}>
          {lesson.complete ? (
            <div className="flex items-center gap-2 px-1">
              <span className="text-base">⭐</span>
              <span className="text-sm font-bold text-grass">Today's plan complete — great work!</span>
            </div>
          ) : (
            <>
              <div className="text-xs uppercase tracking-wide text-gold/70 font-bold mb-2 px-1">
                📅 Today's plan <span className="normal-case text-frost-dim font-bold">— the coach suggests:</span>
              </div>
              <div className="space-y-1.5">
                {lesson.steps.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => !s.done && onLessonStep && onLessonStep(s)}
                    disabled={s.done}
                    className={`w-full flex items-center gap-2.5 rounded-cc-lg px-3 py-2 text-left ${
                      s.done ? 'bg-grass/10' : 'bg-white/[0.04] cc-reveal'
                    }`}
                  >
                    <span
                      className={`w-5 h-5 rounded-full grid place-items-center text-[11px] font-bold shrink-0 ${
                        s.done ? 'bg-grass text-bg' : 'ring-1 ring-edge text-frost-dim'
                      }`}
                    >
                      {s.done ? '✓' : ''}
                    </span>
                    <span className="text-base leading-none">{s.icon}</span>
                    <span className={`flex-1 text-sm font-bold ${s.done ? 'text-grass/80 line-through' : 'text-frost'}`}>
                      {s.label}
                    </span>
                    {s.progress && !s.done && <span className="text-xs text-frost-dim font-bold">{s.progress}</span>}
                    {!s.done && <span className="text-frost-dim">›</span>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {opening && (
        <div className="mt-4 flex justify-center animate-float" style={{ animationDelay: '340ms' }}>
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
