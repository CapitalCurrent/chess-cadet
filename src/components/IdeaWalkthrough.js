import React from 'react';

// The click-through IDEA lesson panel — progress dots, caption, ◀/Next, and a
// closing call-to-action. The PARENT owns the board and renders
// steps[idx].fen / .arrows / .circles into its own ChessBoard (each school has
// its own board wiring). Steps marked `newScene` get a "📷 New position" chip
// so a deliberate cut never reads as a glitch — everything else is a real
// move-by-move line (enforced by data/walkthroughCheck.js in the tests).
export default function IdeaWalkthrough({ steps, idx, onIdx, onDone, doneLabel = 'Got it — let me try! ▶' }) {
  const step = steps[idx];
  if (!step) return null;
  return (
    <>
      <div className="cc-card p-3 md:p-4">
        <div className="flex items-center gap-1.5 mb-2">
          {steps.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${i === idx ? 'w-6 bg-gold' : 'w-1.5 bg-frost/25'}`}
            />
          ))}
          <span className="ml-auto text-[11px] font-bold text-frost-dim">
            {idx + 1} / {steps.length}
          </span>
        </div>
        {step.newScene && (
          <div className="mb-1.5">
            <span className="text-[10px] uppercase tracking-wide font-bold text-frost-dim bg-white/[0.06] ring-1 ring-edge rounded-full px-2 py-0.5">
              📷 New position
            </span>
          </div>
        )}
        <p className="text-sm md:text-lg leading-snug text-frost/95 animate-pop" key={idx}>
          {step.caption}
        </p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onIdx(Math.max(0, idx - 1))}
          disabled={idx === 0}
          className="cc-btn cc-btn-secondary px-4 py-2.5 text-sm disabled:opacity-40"
        >
          ◀
        </button>
        {idx < steps.length - 1 ? (
          <button onClick={() => onIdx(idx + 1)} className="cc-btn cc-btn-primary flex-1 py-2.5 text-sm md:text-base">
            Next ▶
          </button>
        ) : (
          <button onClick={onDone} className="cc-btn cc-btn-grass flex-1 py-2.5 text-sm md:text-base">
            {doneLabel}
          </button>
        )}
        <button onClick={onDone} className="cc-btn cc-btn-secondary px-3 py-2.5 text-sm">
          Skip
        </button>
      </div>
    </>
  );
}
