// Skewer — the rigorous "win the piece behind." A slider attacks a VALUABLE
// enemy piece (or the king) that has another enemy piece directly behind it on
// the same line. The front piece must move (it's the more valuable one, or it's
// in check), and the piece behind is then won. This is the sound version of
// "win the piece behind it" — a PIN can't do it (the immobile cheap piece in
// front blocks the path), so this is its own motif.
//
// Geometry NAMES the skewer; the engine's principal variation VALIDATES it (the
// back piece is the static target, so a forcing line that captures it for net
// material is a real skewer win). Mirrors the pin recognizers in pins.js.
import { Chess } from 'chess.js';
import { heroNetMaterial, lineCapturesSquare } from './pvLine';

const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const FILES = 'abcdefgh';
const PVAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const sq = (f, r) => FILES[f] + (r + 1);

// Every skewer `byColor` has: a slider hitting an enemy FRONT piece (the king,
// or a piece worth >= the one behind) with an enemy non-king BACK piece directly
// behind it. PURE GEOMETRY. Each = { frontSquare, frontType, backSquare,
// backType, frontIsKing }.
export function allSkewers(fen, byColor) {
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
        let front = null;
        let frontSquare = null;
        while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
          const q = g.get(sq(cf, cr));
          if (q) {
            if (q.color !== enemy) break; // own piece blocks the ray
            if (!front) {
              front = q;
              frontSquare = sq(cf, cr);
            } else {
              // Skewer: valuable (or king) in FRONT, a winnable non-king piece
              // BEHIND. (Front cheaper than back would be a pin, not a skewer.)
              if (q.type !== 'k' && (front.type === 'k' || PVAL[front.type] >= PVAL[q.type])) {
                out.push({ frontSquare, frontType: front.type, backSquare: sq(cf, cr), backType: q.type, frontIsKing: front.type === 'k' });
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

// Does the move that starts `pv` create a skewer whose BACK piece the engine's
// forcing line then wins (net material gain)? `pv[0]` is the move under
// judgement. Returns { frontType, backType, backSquare, frontIsKing } or null.
// PURE; no PV / a non-converting line → null, so it degrades cleanly.
export function skewerWin(beforeFen, pv) {
  if (!Array.isArray(pv) || pv.length < 2) return null;
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
  const skewers = allSkewers(g.fen(), hero);
  if (!skewers.length) return null;
  if (heroNetMaterial(beforeFen, pv) <= 0) return null;
  for (const s of skewers) {
    if (lineCapturesSquare(beforeFen, pv, s.backSquare)) {
      return { frontType: s.frontType, backType: s.backType, backSquare: s.backSquare, frontIsKing: s.frontIsKing };
    }
  }
  return null;
}

// Kid-facing message for a skewer win.
export function skewerText(info, { missed = false } = {}) {
  if (!info) return null;
  const front = info.frontIsKing ? 'king' : NAME[info.frontType] || 'piece';
  const back = info.backType ? NAME[info.backType] : 'piece';
  return missed
    ? `🍢 You missed a skewer! The ${front} has to move, and you win the ${back} lined up behind it.`
    : `🍢 Skewer! Their ${front} has to move out of the way — and you win the ${back} behind it!`;
}
