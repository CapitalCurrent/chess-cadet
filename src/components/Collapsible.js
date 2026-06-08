import React, { useState } from 'react';

// A lightweight collapsible section — a header row with a ▾ toggle and content
// that shows when open. Used on phone to tuck secondary panels (Lines, move log)
// below the fold without crowding the board + the pertinent info strip.
export default function Collapsible({ title, badge, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between gap-2 px-1 py-1.5 text-[11px] uppercase tracking-wide font-bold text-frost-dim hover:text-frost"
      >
        <span className="flex items-center gap-2">
          {title}
          {badge != null && <span className="text-gold/70 normal-case tracking-normal">{badge}</span>}
        </span>
        <span className="text-[10px]">{open ? '▴ Hide' : '▾ Show'}</span>
      </button>
      {open && <div className="mt-1">{children}</div>}
    </div>
  );
}
