import React from 'react';
import { linesWithStatus } from '../../data/openings';

// The Progressive-Lines picker — the "branch picker" that GROWS as she learns.
// It shows only the lines she's unlocked (mastered ✅ + the current one ▶), hides
// the rest behind a "master to unlock" hint, and reveals a 🔀 Mix recognition
// drill once every line is mastered. It also explains the loop in one line so the
// course flow is obvious. Hidden for single-line courses (nothing to pick).
export default function LinesPicker({ opening, progress, activeLineId, onPick }) {
  const lines = linesWithStatus(progress, opening);
  if (lines.length <= 1) return null;

  const unlocked = lines.filter((l) => l.unlocked);
  const lockedCount = lines.length - unlocked.length;
  const masteredCount = lines.filter((l) => l.mastered).length;
  const allMastered = masteredCount === lines.length;

  return (
    <div className="cc-card p-3.5">
      <div className="flex items-center justify-between mb-1.5">
        <div className="text-xs uppercase tracking-wide text-gold/70 font-bold">Lines in this course</div>
        <div className="text-xs text-frost-dim">{masteredCount}/{lines.length} mastered</div>
      </div>
      <div className="text-sm text-frost-dim mb-3 leading-snug">
        📚 Learn a line, then drill it clean to <b className="text-gold">master</b> it — that unlocks the next one!
      </div>

      <div className="space-y-2">
        {unlocked.map((l) => {
          const active = l.id === activeLineId;
          return (
            <button
              key={l.id}
              onClick={() => onPick(l.id)}
              className={`w-full flex items-center gap-2.5 rounded-cc-lg px-3 py-2.5 text-left text-[15px] transition-colors ${
                active
                  ? 'bg-gold/20 ring-1 ring-gold/60 text-gold'
                  : 'bg-bg-2 ring-1 ring-edge hover:ring-gold/40 text-frost'
              }`}
            >
              <span className="text-lg w-5 text-center">{l.mastered ? '✅' : active ? '▶' : '•'}</span>
              <span className="flex-1 font-bold truncate">{l.name}</span>
              <span className={`text-xs shrink-0 ${l.mastered ? 'text-grass' : 'text-gold/70'}`}>
                {l.mastered ? 'Mastered' : 'Learn me'}
              </span>
            </button>
          );
        })}

        {lockedCount > 0 && (
          <div className="flex items-center gap-2.5 rounded-cc-lg px-3 py-2.5 text-[15px] bg-bg-2/40 ring-1 ring-edge/50 text-frost-dim">
            <span className="text-lg w-5 text-center">🔒</span>
            <span className="flex-1">
              {lockedCount} more line{lockedCount > 1 ? 's' : ''} — master the one{unlocked.some((l) => !l.mastered) ? ' above' : 's above'} to unlock
            </span>
          </div>
        )}

        {allMastered && (
          <button
            onClick={() => onPick(null)}
            className={`w-full flex items-center gap-2.5 rounded-cc-lg px-3 py-2.5 text-left text-[15px] transition-colors ${
              activeLineId == null
                ? 'bg-grass/20 ring-1 ring-grass/60 text-grass'
                : 'bg-bg-2 ring-1 ring-edge hover:ring-grass/40 text-frost'
            }`}
          >
            <span className="text-lg w-5 text-center">🔀</span>
            <span className="flex-1 font-bold">Mix — spot any line</span>
            <span className="text-xs text-frost-dim shrink-0">Drill</span>
          </button>
        )}
      </div>
    </div>
  );
}
