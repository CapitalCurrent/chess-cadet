// Static Exchange Evaluation (SEE) — "if pieces get traded on this square, who
// comes out ahead?" The foundational primitive for validating material claims
// (memory/coach-design.md §5). Pure: given a position and a square, it plays
// out the capture sequence using least-valuable-attacker order, revealing
// x-ray attackers as front pieces leave, and minimaxes the swap-off.
//
// ⚠️ SEE is NECESSARY BUT NOT SUFFICIENT (coach-design §4b): it measures LOCAL
// material only — it is blind to mate, counterplay, and king safety. It answers
// "is the material claim true here," never "is the move good." The engine eval
// stays the judge of the move.
//
// Kid-coach calibration: knight = bishop = 300, so a minor-for-minor capture
// nets 0 ("not winning material") — the right lesson; we don't crow about a
// 10-centipawn edge. Values are centipawns.
import { Chess } from 'chess.js';

export const SEE_VAL = { p: 100, n: 300, b: 300, r: 500, q: 900, k: 20000 };

function leastValuableAttacker(board, square, side) {
  let best = null;
  for (const sq of board.attackers(square, side)) {
    const p = board.get(sq);
    if (p && (!best || SEE_VAL[p.type] < SEE_VAL[best.type])) best = { square: sq, type: p.type };
  }
  return best;
}

// Net centipawns for `attacker` if they initiate captures on `square` (which
// must currently hold an enemy piece). Positive = attacker wins material, 0 =
// even trade, negative = losing capture. Never throws.
export function seeCaptureOn(fen, square, attacker) {
  let board;
  try {
    board = new Chess(fen);
  } catch {
    return 0;
  }
  const occupant = board.get(square);
  if (!occupant || occupant.color === attacker) return 0; // nothing enemy to capture

  const gain = [];
  let side = attacker;
  let d = 0;
  gain[0] = SEE_VAL[occupant.type]; // value initially sitting on the square

  // Each pass: the side to move grabs the square with its least-valuable
  // attacker. gain[d] = value of the CAPTURING piece minus the running balance
  // (that capturer now sits on the square and is what the opponent can win
  // next). We mutate the board — remove the captured piece, move the attacker
  // onto the square — so the next attackers() call reveals x-ray sliders behind
  // the piece that just left.
  let lva = leastValuableAttacker(board, square, side);
  while (lva) {
    d++;
    gain[d] = SEE_VAL[lva.type] - gain[d - 1];
    board.remove(square);
    board.remove(lva.square);
    board.put({ type: lva.type, color: side }, square);
    side = side === 'w' ? 'b' : 'w';
    lva = leastValuableAttacker(board, square, side);
  }
  // Minimax back down the swap-off: at each ply the side to move only captures
  // if it doesn't worsen their result (else they "stand pat").
  while (d > 1) {
    d--;
    gain[d - 1] = -Math.max(-gain[d - 1], gain[d]);
  }
  return gain[0] || 0; // normalize -0 → 0
}

// Convenience: is the piece on `square` losing material to a capture — i.e.
// "hanging"? (The opponent of the piece's owner initiates.) Returns the net the
// opponent would win; >0 means it's hanging. Empty square → 0.
export function hangingBy(fen, square) {
  let board;
  try {
    board = new Chess(fen);
  } catch {
    return 0;
  }
  const p = board.get(square);
  if (!p) return 0;
  return seeCaptureOn(fen, square, p.color === 'w' ? 'b' : 'w');
}
