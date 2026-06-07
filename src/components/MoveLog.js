import React from 'react';

// The move log. `pairs` = [{ n, w, b }] (move number, White SAN, Black SAN).
//  - variant "inline"  : compact flex-wrap — saves vertical space inside the panel.
//  - variant "sidebar" : the standard stacked two-column table (chess.com/lichess
//    style) — uses the third column's vertical room, reads top-to-bottom.
export default function MoveLog({ pairs, empty, variant = 'inline' }) {
  if (!pairs.length) {
    return (
      <div className="cc-card p-2.5 text-sm">
        <span className="text-frost-dim/80">{empty}</span>
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <div className="cc-card p-2 text-sm">
        <div className="text-[10px] uppercase tracking-wide text-gold/50 font-bold px-1 pb-1">Moves</div>
        <div>
          {pairs.map((p) => (
            <div key={p.n} className="flex gap-2 px-1 py-0.5 rounded odd:bg-white/[0.03]">
              <span className="w-7 shrink-0 text-right text-gold/50">{p.n}.</span>
              <span className="flex-1 text-frost/90">{p.w}</span>
              <span className="flex-1 text-frost-dim">{p.b}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="cc-card p-2.5 text-sm max-h-24 overflow-y-auto">
      <div className="flex flex-wrap gap-x-3 gap-y-0.5">
        {pairs.map((p) => (
          <span key={p.n} className="text-frost/90">
            <span className="text-gold/50">{p.n}.</span> {p.w} <span className="text-frost-dim">{p.b}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
