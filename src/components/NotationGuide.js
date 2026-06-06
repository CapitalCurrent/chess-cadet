import React from 'react';
import { IconGuide, IconClose } from './icons';

// A kid-friendly cheat sheet for the RULES of writing chess notation. Colors
// mirror the keypad (pieces = gold, ranks = green, specials = coral) so the
// symbols she presses match what she reads here.

const PIECES = [
  ['K', 'King'],
  ['Q', 'Queen'],
  ['R', 'Rook'],
  ['B', 'Bishop'],
  ['N', 'Knight — N, because K is already King!'],
];

const SPECIALS = [
  ['x', 'capture — take a piece'],
  ['+', 'check — you attack the king'],
  ['#', 'checkmate — you win! 🏆'],
  ['=', 'promote — a pawn becomes a new piece'],
  ['O-O', 'castle kingside (short castle)'],
  ['O-O-O', 'castle queenside (long castle)'],
];

const EXAMPLES = [
  ['e4', 'Pawn moves to e4 (pawns have no letter)'],
  ['Nf3', 'Knight moves to f3'],
  ['Bxc6', 'Bishop captures on c6'],
  ['exd5', 'The e-pawn captures on d5'],
  ['O-O', 'Castle kingside'],
  ['Qh5+', 'Queen to h5 — check!'],
  ['e8=Q', 'Pawn reaches the end and becomes a Queen'],
  ['Qf7#', 'Queen to f7 — checkmate!'],
  ['Rad1', 'The rook on the a-file goes to d1'],
];

function Section({ title, children }) {
  return (
    <div className="mb-3">
      <div className="text-xs uppercase tracking-wide text-gold/50 font-bold mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function Chip({ children, className = '' }) {
  return (
    <span className={`inline-flex items-center justify-center min-w-[2.2rem] h-7 px-2 rounded-lg font-bold text-sm ${className}`}>
      {children}
    </span>
  );
}

export default function NotationGuide({ open, onClose }) {
  if (!open) return null;
  return (
    <div
      className="cc-scrim items-end sm:items-center p-3"
      onClick={onClose}
    >
      <div className="cc-sheet p-4 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-extrabold text-gold flex items-center gap-2">
            <IconGuide size={20} /> Notation Cheat Sheet
          </h2>
          <button onClick={onClose} className="cc-icon-btn" aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        <p className="text-sm text-frost/90 mb-3">
          Every move is <b className="text-gold">piece</b> + <b className="text-grass">square</b>. A square is a{' '}
          <b>file</b> letter (a–h) and a <b>rank</b> number (1–8), like{' '}
          <span className="font-extrabold"><span className="text-gold">e</span><span className="text-grass">4</span></span>.
        </p>

        <Section title="Pieces (the letters)">
          <div className="flex flex-col gap-1">
            {PIECES.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <Chip className="bg-gold text-bg">{k}</Chip>
                <span className="text-sm text-frost/90">{v}</span>
              </div>
            ))}
            <div className="flex items-center gap-2">
              <Chip className="bg-surface text-gold ring-1 ring-edge">—</Chip>
              <span className="text-sm text-frost/90">A pawn has <b>no letter</b> — just write the square it goes to.</span>
            </div>
          </div>
        </Section>

        <Section title="The squares">
          <p className="text-sm text-frost/90">
            <b className="text-gold">Files</b> are letters <b>a–h</b> (left → right).{' '}
            <b className="text-grass">Ranks</b> are numbers <b>1–8</b> (bottom → top). Put them together to name any
            square.
          </p>
        </Section>

        <Section title="How to write a move">
          <ol className="text-sm text-frost/90 list-decimal list-inside space-y-0.5">
            <li>Write the <b className="text-gold">piece letter</b> (skip it for a pawn).</li>
            <li>Add <Chip className="bg-coral/90 text-white">x</Chip> if it <b>captures</b>.</li>
            <li>Write the <b className="text-grass">square</b> it lands on.</li>
            <li>Add <Chip className="bg-coral/90 text-white">+</Chip> for check or <Chip className="bg-coral/90 text-white">#</Chip> for checkmate.</li>
          </ol>
          <p className="text-xs text-frost/60 mt-1.5">
            Pawn captures use the pawn’s starting file: <span className="font-bold text-gold">exd5</span> = the e-pawn
            takes on d5.
          </p>
        </Section>

        <Section title="Special symbols">
          <div className="flex flex-col gap-1">
            {SPECIALS.map(([k, v]) => (
              <div key={k} className="flex items-center gap-2">
                <Chip className="bg-coral/90 text-white">{k}</Chip>
                <span className="text-sm text-frost/90">{v}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Two pieces can reach the same square?">
          <p className="text-sm text-frost/90">
            Add the starting <b>file</b> or <b>rank</b> to show which one moves.{' '}
            <span className="font-bold text-gold">Rad1</span> = the rook on the <b>a</b>-file goes to d1.
          </p>
        </Section>

        <Section title="Examples">
          <div className="flex flex-col gap-1.5">
            {EXAMPLES.map(([m, v]) => (
              <div key={m} className="flex items-center gap-2">
                <span className="font-extrabold text-gold w-16 shrink-0">{m}</span>
                <span className="text-sm text-frost/90">{v}</span>
              </div>
            ))}
          </div>
        </Section>

        <div className="mt-1 text-[11px] text-frost/50">
          Read left to right: piece → (x if it takes) → where it lands → + for check or # for checkmate.
        </div>
      </div>
    </div>
  );
}
