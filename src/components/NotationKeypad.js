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
      className={`cc-key w-full select-none ${className}`}
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
    <div className={`space-y-1.5 md:space-y-2 ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
      {/* Pieces */}
      <div className="grid grid-cols-5 gap-2">
        {PIECES.map((p) => (
          <Key
            key={p}
            onClick={() => onKey(p)}
            className="cc-key-gold py-2.5 md:py-3 text-xl md:text-2xl"
            title="piece"
          >
            {p}
          </Key>
        ))}
      </div>

      {/* Files a–h */}
      <div className="grid grid-cols-8 gap-1.5">
        {FILES.map((f) => (
          <Key key={f} onClick={() => onKey(f)} className="cc-key-dark text-gold py-2 md:py-2.5 text-base md:text-xl">
            {f}
          </Key>
        ))}
      </div>

      {/* Ranks 1–8 */}
      <div className="grid grid-cols-8 gap-1.5">
        {RANKS.map((r) => (
          <Key key={r} onClick={() => onKey(r)} className="cc-key-dark text-grass py-2 md:py-2.5 text-base md:text-xl">
            {r}
          </Key>
        ))}
      </div>

      {/* Specials */}
      <div className="grid grid-cols-6 gap-1.5">
        {SPECIALS.map((s) => (
          <Key
            key={s.token}
            onClick={() => onKey(s.token)}
            className="cc-key-coral py-1.5 md:py-2 flex flex-col items-center leading-tight"
            title={s.hint}
          >
            <span className="text-base md:text-lg font-extrabold">{s.label}</span>
            <span className="text-[9px] md:text-[10px] font-semibold opacity-80">{s.hint}</span>
          </Key>
        ))}
      </div>

      {/* Controls */}
      <div className="grid grid-cols-4 gap-2 pt-0.5">
        <Key onClick={onBackspace} className="cc-key-edge py-2.5 md:py-3 text-base md:text-xl">
          ⌫
        </Key>
        <Key onClick={onClear} className="cc-key-edge py-2.5 md:py-3 text-sm md:text-base">
          Clear
        </Key>
        <Key
          onClick={onSubmit}
          disabled={!canSubmit}
          className="cc-key-grass col-span-2 py-2.5 md:py-3 text-base md:text-xl"
        >
          ✓ Play move
        </Key>
      </div>
    </div>
  );
}
