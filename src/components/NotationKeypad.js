import React from 'react';

// The constrained "notation alphabet". Only these tokens exist, so wrong
// characters are literally impossible to press — she learns the categories.
const PIECES = ['K', 'Q', 'R', 'B', 'N'];
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];
const SPECIALS = [
  { token: 'x', label: 'x', hint: 'capture' },
  { token: '+', label: '+', hint: 'check' },
  { token: '#', label: '#', hint: 'mate' },
  { token: '=', label: '=', hint: 'promote' },
  { token: 'O-O', label: 'O-O', hint: 'castle' },
  { token: 'O-O-O', label: 'O-O-O', hint: 'big castle' },
];

function Key({ children, onClick, disabled, className = '', title }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-xl font-bold shadow-md active:translate-y-px disabled:opacity-40
        disabled:active:translate-y-0 transition select-none ${className}`}
    >
      {children}
    </button>
  );
}

export default function NotationKeypad({
  onKey,
  onBackspace,
  onClear,
  onSubmit,
  disabled = false,
  canSubmit = true,
}) {
  return (
    <div className={`space-y-2 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {/* Pieces */}
      <div className="grid grid-cols-5 gap-2 md:gap-3">
        {PIECES.map((p) => (
          <Key
            key={p}
            onClick={() => onKey(p)}
            className="py-3 md:py-5 text-xl md:text-3xl bg-gold text-bg"
            title="piece"
          >
            {p}
          </Key>
        ))}
      </div>

      {/* Files a–h */}
      <div className="grid grid-cols-8 gap-1.5 md:gap-2">
        {FILES.map((f) => (
          <Key key={f} onClick={() => onKey(f)} className="py-3 md:py-4 text-lg md:text-2xl bg-surface text-gold ring-1 ring-edge">
            {f}
          </Key>
        ))}
      </div>

      {/* Ranks 1–8 */}
      <div className="grid grid-cols-8 gap-1.5 md:gap-2">
        {RANKS.map((r) => (
          <Key key={r} onClick={() => onKey(r)} className="py-3 md:py-4 text-lg md:text-2xl bg-surface text-grass ring-1 ring-edge">
            {r}
          </Key>
        ))}
      </div>

      {/* Specials */}
      <div className="grid grid-cols-6 gap-1.5 md:gap-2">
        {SPECIALS.map((s) => (
          <Key
            key={s.token}
            onClick={() => onKey(s.token)}
            className="py-2.5 md:py-3.5 bg-coral/90 text-white flex flex-col items-center leading-tight"
            title={s.hint}
          >
            <span className="text-base md:text-2xl font-extrabold">{s.label}</span>
            <span className="text-[9px] md:text-xs font-semibold opacity-80">{s.hint}</span>
          </Key>
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-4 gap-2 md:gap-3 pt-1">
        <Key onClick={onBackspace} className="py-3 md:py-4 text-base md:text-2xl bg-edge text-white">
          ⌫
        </Key>
        <Key onClick={onClear} className="py-3 md:py-4 text-sm md:text-lg bg-edge text-white">
          Clear
        </Key>
        <Key
          onClick={onSubmit}
          disabled={!canSubmit}
          className="col-span-2 py-3 md:py-4 text-lg md:text-2xl bg-grass text-bg"
        >
          ✓ Play move
        </Key>
      </div>
    </div>
  );
}
