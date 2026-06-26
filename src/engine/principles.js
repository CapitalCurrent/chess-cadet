// Opening-principles coach — the "broader concepts" layer of move feedback.
//
// SAFETY ARCHITECTURE (the whole point): this module EXPLAINS, it never
// JUDGES. The engine's eval drop (classifyMove) is the only judge of whether
// a move was bad. Principle texts attach in two tiers:
//
//   Tier A — "why" explanations (explainWarn): only decorate a move the
//   engine ALREADY flagged as a warn. A principle can therefore never scold
//   a move the engine likes (e.g. the Scandinavian's early Qxd5, which we
//   literally teach). The hanging-piece explanation is additionally CONFIRMED
//   against the engine's actual best reply — we only say "your queen can be
//   taken" when the engine's reply really is to take it (this also filters
//   pinned attackers, which static counting can't see).
//
//   Tier B — "habit nudges" (samePieceNudge / castleNudge): gentle, fire
//   without an eval flag, but carry hard guards (forced retreats, captures,
//   checks, queens-off endgames all suppress) and the CALLER rate-limits
//   them (once or twice per game) and silences them on engine-best moves.
//
// Rules deliberately NOT included (false-positive rate too high for a coach
// that must never give bad advice): flank-pawn scolding (h3 luft and a6 are
// book moves in her own courses), "develop toward the center", "don't trade
// developed pieces". Add only with the same exception analysis + tests.
import { newGame } from './chessEngine';
import { hangingBy } from './see';

const VAL = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 99 };
const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

const SQUARES = [];
for (const f of 'abcdefgh') for (let r = 1; r <= 8; r++) SQUARES.push(f + r);

function fullmoveOf(fen) {
  return parseInt(fen.split(' ')[5], 10) || 1;
}

function cheapestAttackerValue(g, square, byColor) {
  let min = Infinity;
  for (const sq of g.attackers(square, byColor)) {
    const p = g.get(sq);
    if (p) min = Math.min(min, VAL[p.type]);
  }
  return min;
}

// Her minor/major pieces (no pawns, no king) that LOSE MATERIAL to a capture
// after her move, by Static Exchange Evaluation (./see) — precise about
// defenders, multiple attackers, and x-rays, so "defended once but attacked
// twice" is caught (simple attacker/defender counting misses it). SEE still
// can't see pins, so callers CONFIRM against the engine's actual reply before
// speaking (see confirmedHang). The undefended / attackedByLesser flags are
// kept only to colour the message ("by a smaller piece").
export function hangingPieces(afterFen, herColor) {
  const g = newGame(afterFen);
  const enemy = herColor === 'w' ? 'b' : 'w';
  const out = [];
  for (const sq of SQUARES) {
    const p = g.get(sq);
    if (!p || p.color !== herColor || p.type === 'k' || VAL[p.type] < 3) continue;
    if (hangingBy(afterFen, sq) <= 0) continue; // SEE: not actually losing material here
    const defenders = g.attackers(sq, herColor);
    const cheapest = cheapestAttackerValue(g, sq, enemy);
    out.push({
      square: sq,
      type: p.type,
      value: VAL[p.type],
      undefended: defenders.length === 0,
      attackedByLesser: cheapest < VAL[p.type],
    });
  }
  return out.sort((a, b) => b.value - a.value);
}

// The hang we can SAY out loud: the engine's best reply actually captures on
// a statically-dangerous square. replyUci comes from analyze(afterFen).
export function confirmedHang(afterFen, herColor, replyUci) {
  if (!replyUci || replyUci.length < 4) return null;
  const target = replyUci.slice(2, 4);
  return hangingPieces(afterFen, herColor).find((h) => h.square === target) || null;
}

// Early queen adventure — only meaningful as a "why" on an engine-flagged
// move, and only when the queen is genuinely chaseable (attacked by a cheaper
// piece on its new square). Captures/recaptures never fire (Scandinavian
// Qxd5 is the canonical false positive this guard exists for).
export function earlyQueenIssue({ afterFen, move, herColor }) {
  if (!move || move.piece !== 'q' || move.captured) return null;
  if (fullmoveOf(afterFen) > 7) return null;
  const g = newGame(afterFen);
  const enemy = herColor === 'w' ? 'b' : 'w';
  const cheapest = cheapestAttackerValue(g, move.to, enemy);
  if (cheapest >= 9) return null; // not actually chaseable
  return 'Your queen came out early and the little pieces can chase her — knights and bishops first; the queen joins the battle later!';
}

// Compose the Tier-A explanation for an engine-flagged generic warn.
// Priority: confirmed hang (specific, verified) > early queen (conceptual).
export function explainWarn({ afterFen, move, herColor, replyUci }) {
  const hang = confirmedHang(afterFen, herColor, replyUci);
  if (hang) {
    return `Your ${NAME[hang.type]} on ${hang.square} can be taken${
      hang.attackedByLesser && !hang.undefended ? ' by a smaller piece' : ''
    } — count the attackers and defenders before you leave a piece somewhere!`;
  }
  return earlyQueenIssue({ afterFen, move, herColor });
}

const HOME_MINORS = {
  w: ['b1', 'g1', 'c1', 'f1'],
  b: ['b8', 'g8', 'c8', 'f8'],
};

// Tier-B nudge: a minor piece moving again in the opening while other minors
// sleep at home. Suppressed when the move was a capture or check, when the
// piece was ATTACKED on its old square (a retreat is correct, not a habit
// problem), past move 8, or when nothing is left undeveloped. The caller must
// also skip it when the engine rated the move 'best' and rate-limit per game.
// `history` = verbose history INCLUDING the move just played (last element).
export function samePieceNudge({ history, beforeFen, herColor }) {
  if (!history || !history.length) return null;
  const move = history[history.length - 1];
  if (move.color !== herColor) return null;
  if (move.piece !== 'n' && move.piece !== 'b') return null;
  if (move.captured || /[+#]/.test(move.san)) return null;
  if (fullmoveOf(beforeFen) > 8) return null;

  // How many times had THIS piece already moved? Follow her from→to chains.
  const counts = {};
  for (let i = 0; i < history.length - 1; i++) {
    const m = history[i];
    if (m.color === herColor) {
      const c = (counts[m.from] || 0) + 1;
      delete counts[m.from];
      counts[m.to] = c;
    } else if (m.captured && counts[m.to] !== undefined) {
      delete counts[m.to]; // her tracked piece got captured
    }
  }
  if (!(counts[move.from] >= 1)) return null;

  // A piece under attack HAD to move — that's not a habit to correct.
  const before = newGame(beforeFen);
  const enemy = herColor === 'w' ? 'b' : 'w';
  if (before.attackers(move.from, enemy).length) return null;

  const asleep = HOME_MINORS[herColor].find((sq) => {
    const p = before.get(sq);
    return p && p.color === herColor && (p.type === 'n' || p.type === 'b');
  });
  if (!asleep) return null;

  const sleeper = before.get(asleep);
  return `That ${NAME[move.piece]} keeps moving while your ${NAME[sleeper.type]} is still asleep on ${asleep} — in the opening, try to give every piece one job first!`;
}

// Tier-B nudge: king still in the middle at move 10+ with castling rights
// intact and the enemy queen still on the board. Queens-off positions are
// SUPPRESSED — with queens traded, an active central king is often correct,
// and "castle soon!" would be bad advice. Caller fires this once per game.
export function castleNudge({ fen, herColor }) {
  if (fullmoveOf(fen) < 10) return null;
  const rights = fen.split(' ')[2] || '-';
  const mine = herColor === 'w' ? /[KQ]/ : /[kq]/;
  if (!mine.test(rights)) return null; // already castled or rights gone
  const g = newGame(fen);
  const enemy = herColor === 'w' ? 'b' : 'w';
  const enemyQueen = SQUARES.some((sq) => {
    const p = g.get(sq);
    return p && p.color === enemy && p.type === 'q';
  });
  if (!enemyQueen) return null;
  return 'Psst — your king is still in the middle! You can still castle: tuck him safe soon. 🏰';
}
