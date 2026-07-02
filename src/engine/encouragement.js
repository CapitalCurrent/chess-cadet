// Positive-habit praise — Phase 3 of the coach design (the "encouragement
// gap", memory/coach-design.md §6). A coach that only catches mistakes teaches
// half the lesson: the habits we want REPEATED — castling, developing, saving
// an attacked piece, level-headed recaptures — need reinforcing when they
// happen, not just their absence scolding.
//
// Same safety architecture as every other claim: the ENGINE eval has already
// gated the move as good before any of these speak (evaluateMove consults this
// module only inside its praise bands), and each claim is validated by board
// truth (castling, promotion) or SEE (safety of the landing square) before
// it's made. The CALLER rate-limits per game so praise stays meaningful.
import { newGame } from './chessEngine';
import { hangingBy } from './see';

const NAME = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };
const HOME = {
  w: { n: ['b1', 'g1'], b: ['c1', 'f1'] },
  b: { n: ['b8', 'g8'], b: ['c8', 'f8'] },
};

// The positive habit shown by playing `uci` from `beforeFen`, or null.
// `lastOppMove` = { to, captured } of the opponent's previous move (enables
// recapture recognition; omit and that check simply degrades away). PURE.
// Returns { type: 'castle'|'promotion'|'save'|'recapture'|'develop', text }.
export function detectPraise(beforeFen, uci, { lastOppMove = null } = {}) {
  if (!uci || uci.length < 4) return null;
  let g;
  let m;
  try {
    g = newGame(beforeFen);
    m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
  } catch {
    return null;
  }
  if (!m) return null;
  const afterFen = g.fen();
  const fullmove = parseInt(beforeFen.split(' ')[5], 10) || 1;

  // Tier A — board truths, never wrong.
  if (/^O-O-O/.test(m.san)) return { type: 'castle', text: '🏰 Castled long — your king is tucked away and the rook joins the game in one move.' };
  if (/^O-O/.test(m.san)) return { type: 'castle', text: '🏰 Castled — king safe in the corner, rook ready to work. One of the best habits in chess.' };
  if (m.promotion) return { type: 'promotion', text: `👑 Promotion! Your pawn crossed the whole board and became a ${NAME[m.promotion] || 'queen'}.` };

  // Saved an attacked piece: it was losing material where it stood (SEE) and is
  // safe where it landed. Quiet escapes only — a capture tells its own story.
  if (!m.captured && 'nbrq'.includes(m.piece) && hangingBy(beforeFen, m.from) > 0 && hangingBy(afterFen, m.to) <= 0) {
    return { type: 'save', text: `🛟 Good save — your ${NAME[m.piece]} was under attack and you moved it to safety. Always check what's being attacked!` };
  }

  // Level-headed recapture: they just captured there, she took back, and the
  // recapturing piece is safe — the material balance held.
  if (m.captured && lastOppMove && lastOppMove.captured && lastOppMove.to === m.to && hangingBy(afterFen, m.to) <= 0) {
    return { type: 'recapture', text: '⚖️ Good recapture — you took back and kept the material balance. Well counted.' };
  }

  // Development: a knight/bishop leaves its home square for a SAFE square in
  // the opening — a new piece joins the game.
  if (!m.captured && (m.piece === 'n' || m.piece === 'b') && fullmove <= 10 && HOME[m.color][m.piece].includes(m.from) && hangingBy(afterFen, m.to) <= 0) {
    return { type: 'develop', text: `🌱 ${m.san} — a new piece joins the game. Develop them all before you attack.` };
  }

  return null;
}
