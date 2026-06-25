// Lightweight tactic-motif recognition for the coach + (later) Game Review.
// We only NAME the pattern — soundness is already confirmed by the engine
// (we only call this for moves the engine rates as winning). v1: fork + pin.
import { newGame } from './chessEngine';

const FILES = 'abcdefgh';
const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };

function fileRank(square) {
  return [FILES.indexOf(square[0]), parseInt(square[1], 10) - 1];
}
function sq(f, r) {
  return FILES[f] + (r + 1);
}

// Squares the piece on (f,r) attacks, accounting for blockers (sliders stop at
// the first piece, which they attack).
function attackedSquares(get, f, r, piece) {
  const res = [];
  const inB = (ff, rr) => ff >= 0 && ff < 8 && rr >= 0 && rr < 8;
  const add = (ff, rr) => inB(ff, rr) && res.push([ff, rr]);
  const ray = (df, dr) => {
    let ff = f + df;
    let rr = r + dr;
    while (inB(ff, rr)) {
      res.push([ff, rr]);
      if (get(sq(ff, rr))) break; // stop at (and include) the first blocker
      ff += df;
      rr += dr;
    }
  };
  const t = piece.type;
  if (t === 'n') {
    [[1, 2], [2, 1], [2, -1], [1, -2], [-1, -2], [-2, -1], [-2, 1], [-1, 2]].forEach(([df, dr]) => add(f + df, r + dr));
  } else if (t === 'k') {
    for (let df = -1; df <= 1; df++) for (let dr = -1; dr <= 1; dr++) if (df || dr) add(f + df, r + dr);
  } else if (t === 'p') {
    const dir = piece.color === 'w' ? 1 : -1;
    add(f - 1, r + dir);
    add(f + 1, r + dir);
  } else {
    if (t === 'b' || t === 'q') { ray(1, 1); ray(1, -1); ray(-1, 1); ray(-1, -1); }
    if (t === 'r' || t === 'q') { ray(1, 0); ray(-1, 0); ray(0, 1); ray(0, -1); }
  }
  return res;
}

// First piece encountered walking from (f,r) in direction (df,dr), or null.
function firstAlong(get, f, r, df, dr) {
  let cf = f + df;
  let cr = r + dr;
  while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
    const p = get(sq(cf, cr));
    if (p) return p;
    cf += df;
    cr += dr;
  }
  return null;
}

// Discovered attack: the moved piece vacated `fromSquare`, revealing a friendly
// slider that now hits an enemy king/valuable piece straight through it.
function isDiscovered(get, fromSquare, mover) {
  const enemy = mover === 'w' ? 'b' : 'w';
  const [f, r] = fileRank(fromSquare);
  const axes = [
    { type: 'diag', a: [1, 1], b: [-1, -1] },
    { type: 'diag', a: [1, -1], b: [-1, 1] },
    { type: 'orth', a: [1, 0], b: [-1, 0] },
    { type: 'orth', a: [0, 1], b: [0, -1] },
  ];
  const slides = (p, type) => p.type === 'q' || (type === 'diag' ? p.type === 'b' : p.type === 'r');
  const isTarget = (p) => p.type === 'k' || VAL[p.type] >= 3;
  for (const { type, a, b } of axes) {
    const pa = firstAlong(get, f, r, a[0], a[1]);
    const pb = firstAlong(get, f, r, b[0], b[1]);
    if (!pa || !pb) continue;
    if (pa.color === mover && slides(pa, type) && pb.color === enemy && isTarget(pb)) return true;
    if (pb.color === mover && slides(pb, type) && pa.color === enemy && isTarget(pa)) return true;
  }
  return false;
}

// Detect motifs created by playing from `fromSquare` to `toSquare` in `fenAfter`.
// Returns a subset of ['fork','pin','discovered'].
export function detectMotifs(fenAfter, fromSquare, toSquare) {
  try {
    const g = newGame(fenAfter);
    const piece = g.get(toSquare);
    if (!piece) return [];
    const get = (s) => g.get(s);
    const enemy = piece.color === 'w' ? 'b' : 'w';
    const [f, r] = fileRank(toSquare);
    const motifs = [];

    // FORK: the moved piece attacks 2+ enemy targets it could actually WIN.
    // A target only counts if it's the king (a forced response — then take the
    // other), worth MORE than the forker (win the exchange even if defended),
    // or UNDEFENDED (a free grab). A defended piece that isn't worth more than
    // the forker can't be taken profitably — e.g. a queen "forking" two
    // defended bishops wins nothing — so it does NOT count. Without this guard
    // we'd call a harmless alignment a fork and feed a learner bad advice.
    const winnable = attackedSquares(get, f, r, piece).filter(([af, ar]) => {
      const p = get(sq(af, ar));
      if (!p || p.color !== enemy) return false;
      if (p.type === 'k') return true;
      if (VAL[p.type] > VAL[piece.type]) return true;
      return g.attackers(sq(af, ar), enemy).length === 0; // undefended → free
    });
    if (winnable.length >= 2) motifs.push('fork');

    // PIN: a slider lines up an enemy piece with a more valuable piece (or the
    // king) directly behind it.
    if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
      const dirs = [];
      if (piece.type === 'b' || piece.type === 'q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
      if (piece.type === 'r' || piece.type === 'q') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      for (const [df, dr] of dirs) {
        let cf = f + df;
        let cr = r + dr;
        let first = null;
        while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
          const p = get(sq(cf, cr));
          if (p) {
            if (p.color !== enemy) break; // own piece blocks the ray
            if (!first) first = p; // the (possibly) pinned piece
            else {
              if (p.type === 'k' || VAL[p.type] > VAL[first.type]) motifs.push('pin');
              break;
            }
          }
          cf += df;
          cr += dr;
        }
      }
    }

    // DISCOVERED ATTACK: moving away from `fromSquare` unveiled a friendly slider.
    if (fromSquare && isDiscovered(get, fromSquare, piece.color)) motifs.push('discovered');

    return [...new Set(motifs)];
  } catch {
    return [];
  }
}

// The motif created by playing `uci` from `beforeFen` (used to name the best
// move in a "missed tactic" message).
export function motifsOfMove(beforeFen, uci) {
  try {
    const g = newGame(beforeFen);
    g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    return detectMotifs(g.fen(), uci.slice(0, 2), uci.slice(2, 4));
  } catch {
    return [];
  }
}
