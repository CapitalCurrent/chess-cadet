import React from 'react';

// The move log. `pairs` = [{ n, w, b }] (move number, White SAN, Black SAN).
//  - variant "inline"  : compact flex-wrap — saves vertical space inside the panel.
//  - variant "sidebar" : the standard stacked two-column table (chess.com/lichess
//    style) — uses the third column's vertical room, reads top-to-bottom.
//
// When `onSelect(ply)` is given, each move becomes clickable and the board can
// jump to that point in the game. `ply` is the 1-based half-move count (White of
// move n = 2n-1, Black = 2n); `selectedPly` highlights the move currently shown.
export default function MoveLog({ pairs, empty, variant = 'inline', onSelect, selectedPly }) {
  if (!pairs.length) {
    return (
      <div className="cc-card p-2.5 text-sm">
        <span className="text-frost-dim/80">{empty}</span>
      </div>
    );
  }

  const clickable = typeof onSelect === 'function';

  // Render one SAN as a clickable button (or plain text when not interactive).
  const cell = (ply, san, baseClass) => {
    if (!san) return <span className={baseClass} />;
    if (!clickable) return <span className={baseClass}>{san}</span>;
    const active = ply === selectedPly;
    return (
      <button
        type="button"
        onClick={() => onSelect(ply)}
        title="See the board after this move"
        className={`${baseClass} rounded px-1 -mx-0.5 hover:bg-gold/15 transition-colors ${
          active ? 'bg-gold/25 text-gold ring-1 ring-gold/50' : ''
        }`}
      >
        {san}
      </button>
    );
  };

  if (variant === 'sidebar') {
    return (
      <div className="cc-card p-2 text-sm">
        <div className="text-[10px] uppercase tracking-wide text-gold/50 font-bold px-1 pb-1">Moves</div>
        <div>
          {pairs.map((p) => (
            <div key={p.n} className="flex gap-2 px-1 py-0.5 rounded odd:bg-white/[0.03]">
              <span className="w-7 shrink-0 text-right text-gold/50">{p.n}.</span>
              {cell(p.n * 2 - 1, p.w, 'flex-1 text-left text-frost/90')}
              {cell(p.n * 2, p.b, 'flex-1 text-left text-frost-dim')}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cc-card p-2.5 text-sm max-h-24 overflow-y-auto">
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 items-center">
        {pairs.map((p) => (
          <span key={p.n} className="text-frost/90 inline-flex items-center gap-1">
            <span className="text-gold/50">{p.n}.</span>
            {cell(p.n * 2 - 1, p.w, 'text-frost/90')}
            {cell(p.n * 2, p.b, 'text-frost-dim')}
          </span>
        ))}
      </div>
    </div>
  );
}
