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
import { heroNetMaterial, lineCapturesSquare } from './pvLine';

const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const FILES = 'abcdefgh';
const PVAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const sq = (f, r) => FILES[f] + (r + 1);

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

// Every enemy piece pinned by `byColor`'s sliders — PURE GEOMETRY (the front
// piece lines up with a strictly-more-valuable piece, or the king, directly
// behind it). NOT winnability-gated; callers validate exploitation separately
// (e.g. against the engine's forcing line). Each = { pinnedSquare, pinnedType,
// rearType, rearIsKing }.
export function allPins(fen, byColor) {
  let g;
  try {
    g = new Chess(fen);
  } catch {
    return [];
  }
  const enemy = byColor === 'w' ? 'b' : 'w';
  const out = [];
  for (let f = 0; f < 8; f++) {
    for (let r = 0; r < 8; r++) {
      const p = g.get(sq(f, r));
      if (!p || p.color !== byColor) continue;
      const dirs = [];
      if (p.type === 'b' || p.type === 'q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
      if (p.type === 'r' || p.type === 'q') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      for (const [df, dr] of dirs) {
        let cf = f + df;
        let cr = r + dr;
        let first = null;
        let firstSquare = null;
        while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
          const q = g.get(sq(cf, cr));
          if (q) {
            if (q.color !== enemy) break; // own piece blocks the ray
            if (!first) {
              first = q;
              firstSquare = sq(cf, cr);
            } else {
              if (q.type === 'k' || PVAL[q.type] > PVAL[first.type]) {
                out.push({ pinnedSquare: firstSquare, pinnedType: first.type, rearType: q.type, rearIsKing: q.type === 'k' });
              }
              break;
            }
          }
          cf += df;
          cr += dr;
        }
      }
    }
  }
  return out;
}

// "Working the pin" — the most fundamental pin exploitation (every source: a
// pinned piece can't flee, so attack it AGAIN and win it). A single SEE can't
// see this: the win takes a short forcing sequence (often a pawn added a move
// later). So we validate against the ENGINE'S principal variation: a piece that
// is pinned after the first move of `pv`, and that the forcing line then
// CAPTURES for a net material gain, is a genuine working-the-pin win.
//
// `pv` is the engine's best line from before the move that's being judged
// (pv[0] is that move). Returns { pinnedType, pinnedSquare, rearIsKing } or
// null. PURE; no PV (or a non-converting line) → null, so it degrades cleanly.
export function workingPinWin(beforeFen, pv) {
  if (!Array.isArray(pv) || pv.length < 2) return null;
  // Position after the first PV move (the move under judgement).
  let g;
  try {
    g = new Chess(beforeFen);
  } catch {
    return null;
  }
  const hero = g.turn();
  let m;
  try {
    m = g.move({ from: pv[0].slice(0, 2), to: pv[0].slice(2, 4), promotion: pv[0][4] || 'q' });
  } catch {
    return null;
  }
  if (!m) return null;
  const pins = allPins(g.fen(), hero);
  if (!pins.length) return null;
  // The whole forcing line must net material for the hero (guards against the
  // "win" being a bad trade or a deeper refutation) AND actually capture one of
  // the pinned pieces (attributes the win to the pin, not something unrelated).
  if (heroNetMaterial(beforeFen, pv) <= 0) return null;
  for (const pin of pins) {
    if (lineCapturesSquare(beforeFen, pv, pin.pinnedSquare)) {
      return { pinnedType: pin.pinnedType, pinnedSquare: pin.pinnedSquare, rearIsKing: pin.rearIsKing };
    }
  }
  return null;
}

// Kid-facing message for a working-the-pin win.
export function workingPinText(info, { missed = false } = {}) {
  if (!info) return null;
  const piece = info.pinnedType ? NAME[info.pinnedType] : 'piece';
  const anchor = info.rearIsKing ? 'against the king' : 'in place';
  return missed
    ? `📌 You had a pin! Their ${piece} is stuck ${anchor} and can't run — pile on and win it!`
    : `📌 Great pin! Their ${piece} is frozen ${anchor} — gang up on it and it falls!`;
}
