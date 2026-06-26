// Lightweight tactic-motif recognition for the coach + (later) Game Review.
// We only NAME the pattern — soundness is already confirmed by the engine
// (we only call this for moves the engine rates as winning). v1: fork + pin.
import { newGame } from './chessEngine';
import { seeCaptureOn } from './see';

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

// First piece encountered walking from (f,r) in direction (df,dr) as
// { piece, square }, or null.
function firstAlong(get, f, r, df, dr) {
  let cf = f + df;
  let cr = r + dr;
  while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
    const square = sq(cf, cr);
    const p = get(square);
    if (p) return { piece: p, square };
    cf += df;
    cr += dr;
  }
  return null;
}

// Discovered attack: the moved piece vacated `fromSquare`, revealing a friendly
// slider that now hits an enemy king/valuable piece straight through it. Returns
// the unveiled enemy target { type, square } (so the caller can SEE-validate
// that the discovery actually WINS material), or null when no line is revealed.
function discoveredTarget(get, fromSquare, mover) {
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
    if (pa.piece.color === mover && slides(pa.piece, type) && pb.piece.color === enemy && isTarget(pb.piece)) return { type: pb.piece.type, square: pb.square };
    if (pb.piece.color === mover && slides(pb.piece, type) && pa.piece.color === enemy && isTarget(pa.piece)) return { type: pa.piece.type, square: pa.square };
  }
  return null;
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
    // "Winnable" = the king (a forced response — then take the other), or a
    // capture that comes out materially ahead by Static Exchange Evaluation
    // (see ./see). SEE handles defenders, multiple attackers, x-rays, and the
    // forker outvaluing its target precisely — so a queen "forking" two defended
    // bishops (SEE negative on both) is correctly NOT a fork, while a knight
    // forking two rooks (SEE positive) is. Without this we'd call a harmless
    // alignment a fork and feed a learner bad advice.
    const winnable = attackedSquares(get, f, r, piece).filter(([af, ar]) => {
      const p = get(sq(af, ar));
      if (!p || p.color !== enemy) return false;
      if (p.type === 'k') return true;
      return seeCaptureOn(fenAfter, sq(af, ar), piece.color) > 0;
    });
    if (winnable.length >= 2) motifs.push('fork');

    // PIN: a slider lines up an enemy piece with a more valuable piece (or the
    // king) directly behind it — AND the pinned piece is actually winnable.
    // Winnability is the same gate forks use: capturing the pinned (front) piece
    // must be SEE-positive. A defended/immobilization-only pin (Ruy-Lopez Bb5)
    // wins no material, so it stays unnamed and the coach degrades to generic
    // praise rather than crowing about a "pin" that won nothing.
    if (piece.type === 'b' || piece.type === 'r' || piece.type === 'q') {
      const dirs = [];
      if (piece.type === 'b' || piece.type === 'q') dirs.push([1, 1], [1, -1], [-1, 1], [-1, -1]);
      if (piece.type === 'r' || piece.type === 'q') dirs.push([1, 0], [-1, 0], [0, 1], [0, -1]);
      for (const [df, dr] of dirs) {
        let cf = f + df;
        let cr = r + dr;
        let first = null;
        let firstSquare = null;
        while (cf >= 0 && cf < 8 && cr >= 0 && cr < 8) {
          const square = sq(cf, cr);
          const p = get(square);
          if (p) {
            if (p.color !== enemy) break; // own piece blocks the ray
            if (!first) { first = p; firstSquare = square; } // the (possibly) pinned piece
            else {
              if ((p.type === 'k' || VAL[p.type] > VAL[first.type]) && seeCaptureOn(fenAfter, firstSquare, piece.color) > 0) motifs.push('pin');
              break;
            }
          }
          cf += df;
          cr += dr;
        }
      }
    }

    // DISCOVERED ATTACK: moving away from `fromSquare` unveiled a friendly slider.
    // Validate that the unveiled line WINS material — a discovered check (king
    // target, forcing) or a SEE-positive capture of the revealed target. A
    // discovery onto a defended piece wins nothing and is not named.
    if (fromSquare) {
      const disc = discoveredTarget(get, fromSquare, piece.color);
      if (disc && (disc.type === 'k' || seeCaptureOn(fenAfter, disc.square, piece.color) > 0)) motifs.push('discovered');
    }

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
