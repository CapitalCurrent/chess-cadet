// Pin exploitation — "their defender is pinned, so the piece it was guarding is
// actually free." A beginner's most-missed source of material.
//
// The exact test is MOVE LEGALITY, not pin geometry: after she captures, ask
// chess.js whether the opponent can *legally* recapture. An absolutely-pinned
// piece simply won't produce a legal recapture — and this handles every
// subtlety for free (a rook pinned along a file can still recapture ON that
// file; x-ray defenders revealed by the capture are included).
//
// Scope v1: ABSOLUTE pins (to the king) on a CAPTURE. Relative pins (a pawn
// pinned to a queen — the recapture is LEGAL but loses the queen) produce a
// legal recapture, so they don't fire here; they're a careful follow-up.
import { Chess } from 'chess.js';

const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

// Does capturing via `uci` win material because the captured piece's defenders
// are pinned and cannot legally recapture? Returns
// { wonType, wonSquare, pinnedType, pinnedSquare } or null. PURE.
export function pinnedDefenderWin(beforeFen, uci) {
  if (!uci || uci.length < 4) return null;
  let g;
  try {
    g = new Chess(beforeFen);
  } catch {
    return null;
  }
  const from = uci.slice(0, 2);
  const to = uci.slice(2, 4);
  const target = g.get(to);
  const mover = g.get(from);
  if (!target || !mover || target.color === mover.color) return null; // must capture an enemy piece
  const enemy = target.color;

  // Play the capture (must be legal). Now it's the enemy's turn.
  let move;
  try {
    move = g.move({ from, to, promotion: uci[4] || 'q' });
  } catch {
    return null;
  }
  if (!move) return null;

  // Would-be defenders = enemy pieces geometrically attacking the square, EXCEPT
  // the king (a king that can't recapture is blocked by defense, not a pin).
  const defenders = g.attackers(to, enemy).filter((sq) => {
    const p = g.get(sq);
    return p && p.type !== 'k';
  });
  if (!defenders.length) return null; // undefended (or only the king) → not a pin story

  // Can ANYTHING legally recapture on the square (king included)? If so it's a
  // normal exchange, not a free win.
  const legalRecapture = g.moves({ verbose: true }).some((m) => m.to === to);
  if (legalRecapture) return null;

  // Non-king defenders exist but none can legally recapture → they're pinned.
  const pinnedSquare = defenders[0];
  const pinned = g.get(pinnedSquare);
  return {
    wonType: target.type,
    wonSquare: to,
    pinnedType: pinned ? pinned.type : null,
    pinnedSquare,
  };
}

// Kid-facing message for a pinned-defender win (praise when she found it, a
// nudge when she missed it).
export function pinnedDefenderText(info, { missed = false } = {}) {
  if (!info) return null;
  const won = NAME[info.wonType] || 'piece';
  const pinned = info.pinnedType ? NAME[info.pinnedType] : 'piece';
  return missed
    ? `📌 Look — their ${pinned} is pinned and can't take back, so you could win the ${won}!`
    : `📌 Sharp — their ${pinned} was pinned and couldn't take back, so you win the ${won}!`;
}
