// Coach verdict logic — the PURE decision core, extracted from FreePlay's
// classifyMove so it can be unit-tested without a running engine (Stockfish is
// a web worker; the sandbox can't run it). The caller does the async engine
// analysis and feeds the results in; this module turns them into a verdict.
//
// Two-gate rule (memory/coach-design.md §4b): the ENGINE EVAL is the gate on
// move quality — praise lives only in the loss<=50 band, missed-tactics only
// when bestCp>=150 — so a material grab the engine rates badly is never praised.
// Motif CLAIMS (fork/pin/discovered) are validated separately in
// tactics.detectMotifs (SEE-based). This module never calls the engine.
import { newGame } from './chessEngine';
import { detectMotifs, motifsOfMove } from './tactics';
import { pinnedDefenderWin, pinnedDefenderText, workingPinWin, workingPinText } from './pins';

// Normalize an eval to a single number (centipawns); mate -> a big value.
export function scoreNum(c) {
  if (!c) return 0;
  if (typeof c.mate === 'number') return (c.mate >= 0 ? 1 : -1) * (100000 - Math.abs(c.mate) * 100);
  return typeof c.cp === 'number' ? c.cp : 0;
}

// The number of moves to a mate the SIDE TO MOVE delivers (positive mate score),
// or null. A negative mate (she's getting mated) returns null — never spoken as
// "you have mate".
export function mateIn(c) {
  return c && typeof c.mate === 'number' && c.mate > 0 ? c.mate : null;
}

// SAN + whether the move is forcing (a capture or a check) — used to spot a
// missed tactic ("always look at captures and checks first").
export function moveInfo(fen, uci) {
  try {
    const g = newGame(fen);
    const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
    if (!m) return { san: uci, capture: false, check: false };
    return {
      san: m.san,
      capture: /x/.test(m.san) || (m.flags && /[ce]/.test(m.flags)),
      check: /[+#]/.test(m.san),
    };
  } catch {
    return { san: uci, capture: false, check: false };
  }
}

// Turn engine analysis into a coach verdict. PURE.
//   cands           = scored candidates best-first from analyze(beforeFen)
//   herCp           = eval of HER move (side-to-move POV)
//   humanSuggestSan = a human-level (Maia) suggestion for the inaccuracy/mistake
//                     branch; falls back to the engine's best move when null.
// Returns { kind, icon, label, text, best?, motif?, loss? } or null.
export function evaluateMove(beforeFen, uci, afterFen, { cands, herCp, humanSuggestSan = null } = {}) {
  if (!cands || !cands.length) return null;
  const bestCp = scoreNum(cands[0]);
  const loss = bestCp - herCp; // centipawns given up vs the best move
  const her = moveInfo(beforeFen, uci);
  // Checkmate is Tier A — board truth, never wrong, said regardless of eval band
  // (even a non-"engine-best" mate is still mate). Highest-priority verdict.
  if (/#/.test(her.san)) return { kind: 'best', icon: '🏆', label: 'Checkmate', text: '🏆 Checkmate! Brilliant finish!' };
  if (loss <= 50) {
    const isBest = uci === cands[0].move;
    const spike = cands.length >= 2 ? scoreNum(cands[0]) - scoreNum(cands[1]) : 999;
    const winning = bestCp >= 150;
    // She played the move that FORCES mate (not delivered this move, or it would
    // be the Tier-A checkmate above). The single most exciting thing to spot.
    const mateN = isBest ? mateIn(cands[0]) : null;
    if (mateN) return { kind: 'best', icon: '♟️', label: `Mate in ${mateN}`, text: `♟️ Mate in ${mateN}! ${her.san} forces checkmate — finish it!`, mateIn: mateN };
    if (isBest && winning && spike >= 150) {
      const pinWin = pinnedDefenderWin(beforeFen, uci);
      if (pinWin) return { kind: 'best', icon: '📌', label: 'Pin win', text: pinnedDefenderText(pinWin) };
      // Working the pin: the pinned piece can't flee, so the engine's forcing
      // line piles on and wins it (the #1 fundamental pin use; needs the PV, not
      // one-ply SEE). cands[0].pv === her line here since she played the best move.
      const workPin = workingPinWin(beforeFen, cands[0].pv);
      if (workPin) return { kind: 'best', icon: '📌', label: 'Pin win', text: workingPinText(workPin) };
      const motifs = detectMotifs(afterFen, uci.slice(0, 2), uci.slice(2, 4));
      if (motifs.includes('fork')) return { kind: 'best', icon: '✦', label: 'Fork', text: `✦ Nice fork! ${her.san} attacks two pieces at once.` };
      if (motifs.includes('discovered')) return { kind: 'best', icon: '✦', label: 'Discovery', text: `✦ Discovered attack! ${her.san} unleashes a piece from behind.` };
      if (motifs.includes('pin')) return { kind: 'best', icon: '✦', label: 'Pin', text: `✦ Nice pin! ${her.san} freezes a piece against a bigger one.` };
      if (her.capture) return { kind: 'best', icon: '💥', label: 'Tactic', text: `💥 Nice tactic! ${her.san} wins material — well spotted!` };
      if (her.check) return { kind: 'best', icon: '💥', label: 'Tactic', text: `💥 Strong — ${her.san} is a winning check!` };
      return { kind: 'best', icon: '💥', label: 'Tactic', text: `💥 Sharp! ${her.san} is the winning move here.` };
    }
    if (isBest && her.check) return { kind: 'best', icon: '👍', label: 'Strong', text: `👍 Strong check — ${her.san}!` };
    if (isBest) return { kind: 'best', icon: '⭐', label: 'Best', text: '⭐ Best move! Right on the money.' };
    return { kind: 'good', icon: '👍', label: 'Great', text: '👍 Great move — among the best here.' };
  }
  if (loss <= 150) return { kind: 'good', icon: '🙂', label: 'Good', text: '🙂 Good — a solid, safe move.' };
  const best = moveInfo(beforeFen, cands[0].move);
  const bestMotifs = motifsOfMove(beforeFen, cands[0].move);
  const missedName = bestMotifs.includes('fork')
    ? 'fork'
    : bestMotifs.includes('discovered')
    ? 'discovered attack'
    : bestMotifs.includes('pin')
    ? 'pin'
    : null;
  const missedTactic = bestCp >= 150 && loss >= 200 && (best.capture || best.check || bestMotifs.length);
  // Carried on warn verdicts so the Coach's Notebook can save the position.
  const bestRef = { san: best.san, uci: cands[0].move };
  // A missed FORCED MATE is the most important miss of all — flag it first.
  const bestMateN = mateIn(cands[0]);
  if (bestMateN) return { kind: 'warn', icon: '♟️', label: `Missed mate in ${bestMateN}`, text: `♟️ You had mate in ${bestMateN}! ${best.san} forces checkmate.`, best: bestRef, motif: 'mate', loss, mateIn: bestMateN };
  // A pin win is the most specific, most teachable miss — check both kinds first.
  // Gate on a clearly-winning miss (a quiet pile-on best move isn't a capture or
  // check, so it can't ride on `missedTactic`, which requires one).
  const winningMiss = bestCp >= 150 && loss >= 200;
  const pinWin = winningMiss ? pinnedDefenderWin(beforeFen, cands[0].move) : null;
  if (pinWin) return { kind: 'warn', icon: '📌', label: 'Missed pin win', text: pinnedDefenderText(pinWin, { missed: true }), best: bestRef, motif: 'pin', loss };
  const workPin = winningMiss ? workingPinWin(beforeFen, cands[0].pv) : null;
  if (workPin) return { kind: 'warn', icon: '📌', label: 'Missed pin win', text: workingPinText(workPin, { missed: true }), best: bestRef, motif: 'pin', loss };
  if (missedTactic && missedName) return { kind: 'warn', icon: '💥', label: `Missed ${missedName}`, text: `💥 You missed a ${missedName}! ${best.san} was winning.`, best: bestRef, motif: missedName, loss };
  if (missedTactic && herCp > -50) return { kind: 'warn', icon: '💥', label: 'Missed tactic', text: `💥 You missed a tactic! ${best.san} wins material. Tip: check captures & checks first.`, best: bestRef, motif: null, loss };
  if (missedTactic) return { kind: 'warn', icon: '💥', label: 'Missed tactic', text: `💥 Ouch — ${best.san} won material there. Look for captures & checks!`, best: bestRef, motif: null, loss };
  const sug = humanSuggestSan || best.san;
  if (loss <= 350) return { kind: 'warn', icon: '🤔', label: 'Inaccuracy', text: `🤔 A little loose — ${sug} keeps you better.`, best: bestRef, motif: null, loss };
  return { kind: 'warn', icon: '⚠️', label: 'Mistake', text: `⚠️ Careful — that gives a lot away. Safer was ${sug}.`, best: bestRef, motif: null, loss };
}

// Pure: choose the UCI of a SOUND, human-natural suggestion. Prefer Maia's move
// (maiaUci) ONLY when it's among the engine's candidates and within `threshold`
// centipawns of the best — so we never recommend a move the engine rates as
// weak just because it's "human" (Maia at a low rating mimics weak play).
// Otherwise the engine's best move. Returns a UCI string or null. Suggestions
// get the same two-gate treatment as praise — see coach-design.md §4c.
export function pickSuggestionUci(maiaUci, cands, { threshold = 60 } = {}) {
  const best = cands && cands.length ? cands[0] : null;
  if (maiaUci && best) {
    const found = cands.find((c) => c.move === maiaUci);
    if (found && scoreNum(best) - scoreNum(found) <= threshold) return maiaUci;
  }
  if (best) return best.move;
  return maiaUci || null; // no engine analysis available → fall back to Maia's move
}
