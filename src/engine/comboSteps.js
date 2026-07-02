// Combination steps — turn a stored engine line (PV) into a MULTI-MOVE puzzle:
// the hero must find every one of their moves in the sequence; the opponent's
// forced replies are auto-played between them. This is how a missed combination
// from her own game becomes a real drill instead of a one-move flashcard —
// "combinations from her own games are gold" (coach-design §6b).
//
// PURE: derives everything from (fen, pv) via walkLine, so a garbage/illegal
// PV degrades to fewer (or zero) steps and never throws. Capped at
// `maxHeroMoves` so puzzles stay kid-sized (matches the 6-ply winningLine cap).
import { walkLine } from './pvLine';

// Each step = one hero move to find:
//   { fen        — position the hero moves FROM (shown on the board)
//     expectUci  — the move to find (includes promotion piece when relevant)
//     expectSan
//     mate       — this move delivers checkmate
//     reply      — the opponent's forced answer { san, from, to, fen } or null
//                  (null = the line ends on the hero's move) }
export function comboSteps(fen, pv, { maxHeroMoves = 3 } = {}) {
  if (!Array.isArray(pv) || !pv.length) return [];
  const w = walkLine(fen, pv);
  const steps = [];
  let beforeFen = fen;
  for (let i = 0; i < w.plies.length && steps.length < maxHeroMoves; i += 2) {
    const hero = w.plies[i];
    const reply = w.plies[i + 1] || null;
    steps.push({
      fen: beforeFen,
      expectUci: hero.from + hero.to + (hero.promotion || ''),
      expectSan: hero.san,
      mate: /#/.test(hero.san),
      reply: reply ? { san: reply.san, from: reply.from, to: reply.to, fen: reply.fen } : null,
    });
    if (!reply) break;
    beforeFen = reply.fen;
  }
  return steps;
}

// The remaining line from step `idx` onward as a display string
// ("Qf3+ Ke6 Nc3") — used when revealing the answer to a combination.
export function comboLineText(steps, idx = 0) {
  return steps
    .slice(idx)
    .map((s) => s.expectSan + (s.reply ? ' ' + s.reply.san : ''))
    .join(' ');
}
