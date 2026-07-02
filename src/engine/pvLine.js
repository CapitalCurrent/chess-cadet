// Principal-variation (PV) walking — the DEPTH primitive (coach-design §6b).
//
// SEE answers "who wins the swap-off on THIS square," one ply deep. But a pin,
// a discovered attack, or a combination pays off over a SHORT FORCING SEQUENCE,
// not a single move. The engine already calculates that sequence — `analyze`
// now returns the whole `pv` (principal variation) per candidate — so this
// module reasons over that line: what SAN moves it is (to show the kid), whether
// it ends in mate, and the material it nets at the END (§4b: validate the eval
// at the end of the forcing sequence, never the material delta partway through).
//
// PURE + garbage-tolerant: a bad/short/illegal PV just stops early, never throws.
import { Chess } from 'chess.js';
import { SEE_VAL } from './see';

// Sum of `side`'s material minus the enemy's (centipawns). Kings sit on both
// sides so their value cancels — only real material swings show up.
function materialBalance(game, side) {
  let bal = 0;
  for (const row of game.board()) {
    for (const piece of row) {
      if (!piece) continue;
      const v = SEE_VAL[piece.type] || 0;
      bal += piece.color === side ? v : -v;
    }
  }
  return bal;
}

// Walk a PV (array of UCI moves) from `fen`. Returns the SAN sequence, per-ply
// facts ({ san, from, to, captured, color, check }), the final FEN, and whether
// the line ends in checkmate. Stops at the first illegal/garbage move. PURE.
export function walkLine(fen, ucis) {
  const out = { ok: false, sans: [], plies: [], finalFen: fen, mate: false };
  let game;
  try {
    game = new Chess(fen);
  } catch {
    return out;
  }
  if (Array.isArray(ucis)) {
    for (const uci of ucis) {
      if (!uci || uci.length < 4) break;
      let m;
      try {
        m = game.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
      } catch {
        break;
      }
      if (!m) break;
      out.plies.push({ san: m.san, from: m.from, to: m.to, promotion: m.promotion || null, captured: m.captured || null, color: m.color, check: /[+#]/.test(m.san), fen: game.fen() });
      out.sans.push(m.san);
    }
  }
  out.ok = true;
  out.finalFen = game.fen();
  out.mate = game.isCheckmate();
  return out;
}

// Net material (centipawns) the HERO — the side to move at `fen` — has gained by
// the END of the line. Positive = the forcing sequence wins material for her;
// 0 = it nets an even trade; negative = it loses material. This is the
// depth-aware answer SEE can't give: it survives the opponent's recaptures.
export function heroNetMaterial(fen, ucis) {
  let game;
  try {
    game = new Chess(fen);
  } catch {
    return 0;
  }
  const hero = game.turn();
  const before = materialBalance(game, hero);
  const w = walkLine(fen, ucis);
  let end;
  try {
    end = new Chess(w.finalFen);
  } catch {
    return 0;
  }
  return materialBalance(end, hero) - before;
}

// Step-by-step positions for SHOWING a line on the board: the start position
// (san null) followed by the position after each ply, each with the squares to
// highlight. Truncated to `max` plies. PURE — a missing/illegal PV just yields
// the start position alone.
export function lineSteps(beforeFen, pv, max = 6) {
  const steps = [{ san: null, fen: beforeFen, from: null, to: null }];
  if (Array.isArray(pv) && pv.length) {
    for (const p of walkLine(beforeFen, pv).plies.slice(0, max)) {
      steps.push({ san: p.san, fen: p.fen, from: p.from, to: p.to });
    }
  }
  return steps;
}

// Does the HERO capture an enemy piece standing on `square` somewhere in the
// line? Attributes a material win to that specific piece — e.g. confirming the
// PINNED piece itself actually falls in the engine's best continuation.
export function lineCapturesSquare(fen, ucis, square) {
  let game;
  try {
    game = new Chess(fen);
  } catch {
    return false;
  }
  const hero = game.turn();
  return walkLine(fen, ucis).plies.some((p) => p.color === hero && p.to === square && p.captured);
}
