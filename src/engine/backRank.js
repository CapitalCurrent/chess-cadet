// Back-rank mate recognition — the most common mating pattern at club level,
// and the source of a durable lesson (give your king an escape square, "luft").
//
// Conservative by design (a wrong motif name is worse than a missing one): we
// call a mate "back-rank" only in the classic shape — the mated king sits on
// its OWN back rank, a heavy piece (rook/queen) checks it ALONG that rank, and
// every square directly in front of the king is blocked by the king's OWN
// pieces (the pawn wall that makes the pattern). Mates that merely happen on
// the eighth rank for other reasons stay unnamed. PURE, never throws.
import { Chess } from 'chess.js';
import { walkLine } from './pvLine';

const FILES = 'abcdefgh';

// Is `fen` a checkmate in the classic back-rank shape? (The side to move is
// the mated side — chess.js convention for a mated position.)
export function backRankMate(fen) {
  let g;
  try {
    g = new Chess(fen);
  } catch {
    return false;
  }
  if (!g.isCheckmate()) return false;
  const mated = g.turn();
  const enemy = mated === 'w' ? 'b' : 'w';
  const backRank = mated === 'w' ? '1' : '8';
  const forwardRank = mated === 'w' ? '2' : '7';

  // Find the mated king — it must be on its own back rank.
  let kingSq = null;
  for (const f of FILES) {
    const p = g.get(f + backRank);
    if (p && p.type === 'k' && p.color === mated) {
      kingSq = f + backRank;
      break;
    }
  }
  if (!kingSq) return false;

  // A checking rook/queen must attack ALONG the back rank.
  const rankChecker = g.attackers(kingSq, enemy).some((sq) => {
    const p = g.get(sq);
    return p && (p.type === 'r' || p.type === 'q') && sq[1] === backRank;
  });
  if (!rankChecker) return false;

  // Every square directly in front of the king is blocked by its OWN piece —
  // the wall that turns a rank check into mate.
  const kf = FILES.indexOf(kingSq[0]);
  for (const df of [-1, 0, 1]) {
    const f = kf + df;
    if (f < 0 || f > 7) continue;
    const p = g.get(FILES[f] + forwardRank);
    if (!p || p.color !== mated) return false;
  }
  return true;
}

// Does this forcing line END in a back-rank mate? Validates the motif on the
// ENGINE'S line (same pattern as workingPinWin/skewerWin): the geometry names
// it, the PV proves it. No PV / no mate at the end → false.
export function mateLineBackRank(beforeFen, pv) {
  if (!Array.isArray(pv) || !pv.length) return false;
  const w = walkLine(beforeFen, pv);
  return w.mate && backRankMate(w.finalFen);
}
