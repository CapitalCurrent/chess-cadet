// The WHY behind a notebook puzzle's answer — the missing half of the lesson.
// "Play Nf5" teaches nothing by itself; "Nf5 attacks two things at once — they
// can only save one, so you win a rook" is the lesson. Every claim here is
// VALIDATED from the stored engine line before it's spoken (coach-design §4):
// material is only claimed when heroNetMaterial over the line confirms it,
// mate only when the line (or the verdict that saved it) says mate. Motif
// names were already validated at capture time (SEE/PV gates), so the bare
// motif sentence is always safe even without a line.
//
// PURE + garbage-tolerant: a missing/illegal pv just drops the material claim.
import { walkLine, heroNetMaterial } from './pvLine';

// Net centipawns → kid words. Conservative bands: only name a piece when the
// net clearly reaches it (a +320 line says "a knight or bishop", not "a rook").
export function materialPhrase(net) {
  if (net >= 850) return 'a whole queen';
  if (net >= 450) return 'a rook';
  if (net >= 250) return 'a knight or bishop';
  if (net >= 80) return 'a pawn';
  return null;
}

// What the stored line actually delivers: { mate, net, phrase }.
export function linePayoff(fen, pv) {
  if (!fen || !Array.isArray(pv) || !pv.length) return { mate: false, net: 0, phrase: null };
  const mate = walkLine(fen, pv).mate;
  const net = heroNetMaterial(fen, pv);
  return { mate, net, phrase: mate ? null : materialPhrase(net) };
}

// One sentence explaining why the answer works, or null when nothing is
// validated (caller falls back to the captured coach text — never invent).
export function puzzleWhy({ fen, pv, motif = null, mateIn = null } = {}) {
  const payoff = linePayoff(fen, pv);
  if (motif === 'mate' || mateIn || payoff.mate) {
    const n = mateIn || null;
    return `It forces CHECKMATE${n ? ` in ${n}` : ''} — every reply is forced, and the king can't get away.`;
  }
  const tail = payoff.phrase ? `, so you win ${payoff.phrase}` : '';
  if (motif === 'fork') return `It attacks TWO things at once — they can only save one${tail}.`;
  if (motif === 'pin') return `The pinned piece is FROZEN — it can't run away or fight back${tail}.`;
  if (motif === 'skewer') return `The big piece in front has to move — then you take the one hiding behind it${tail}.`;
  if (motif === 'discovered attack') return `One move makes TWO attacks — the piece that moved attacks, and the piece it uncovered attacks too${tail}.`;
  if (payoff.phrase) return `Nothing they try can stop it — by the end of the line you're up ${payoff.phrase}.`;
  return null;
}
