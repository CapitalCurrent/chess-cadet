// Endgame course ship-gates. Every stage must be a legal, live position with
// White to move — and, more importantly, the PRECONDITIONS of its technique
// must hold, so a theoretically-wrong drill (a "square rule" the king can't
// actually win, a "Lucena" that isn't one) can never ship.
import { newGame } from '../engine/chessEngine';
import { ENDGAME_COURSE, getEndgameStage } from './endgameCourse';

const FILES = 'abcdefgh';

function pieces(g, color) {
  const out = [];
  for (const f of FILES) {
    for (let r = 1; r <= 8; r++) {
      const p = g.get(f + r);
      if (p && p.color === color) out.push({ ...p, square: f + r, file: f, rank: r });
    }
  }
  return out;
}
const find = (list, type) => list.filter((p) => p.type === type);

describe('every stage is a legal, live position, White to move', () => {
  for (const st of ENDGAME_COURSE) {
    test(st.id, () => {
      const g = newGame(st.fen);
      expect(g.turn()).toBe('w');
      expect(g.isGameOver()).toBe(false);
      expect(['mate', 'promote', 'draw']).toContain(st.goal);
      expect(st.concept.length).toBeGreaterThan(40); // a real lesson, not a stub
      expect(st.plan.length).toBeGreaterThan(40);
    });
  }
  test('unique ids', () => {
    const ids = ENDGAME_COURSE.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(getEndgameStage('lucena')).toBeTruthy();
  });
});

test('ladder: two white rooks vs a lone king', () => {
  const g = newGame(getEndgameStage('ladder').fen);
  expect(find(pieces(g, 'w'), 'r')).toHaveLength(2);
  expect(pieces(g, 'b')).toHaveLength(1); // just the king
});

test('square rule: the white king is INSIDE the square of the pawn (and the enemy king cannot help in time)', () => {
  const g = newGame(getEndgameStage('square-rule').fen);
  const pawn = find(pieces(g, 'b'), 'p')[0];
  const wk = find(pieces(g, 'w'), 'k')[0];
  const bk = find(pieces(g, 'b'), 'k')[0];
  // Black pawn runs toward rank 1: the square spans ranks [1..pawnRank] and
  // pawnRank-1 files toward the promotion corner. King inside ⇔ Chebyshev
  // distance to the promotion square ≤ pawn's steps to promote (White to move).
  const promoSq = { file: pawn.file, rank: 1 };
  const steps = pawn.rank - 1;
  const cheb = Math.max(Math.abs(FILES.indexOf(wk.file) - FILES.indexOf(promoSq.file)), Math.abs(wk.rank - promoSq.rank));
  expect(cheb).toBeLessThanOrEqual(steps);
  // The black king is too far to defend its pawn before it falls.
  const bkToPawn = Math.max(Math.abs(FILES.indexOf(bk.file) - FILES.indexOf(pawn.file)), Math.abs(bk.rank - pawn.rank));
  expect(bkToPawn).toBeGreaterThan(3);
});

test('escort: white king on the 6th rank, directly in front of its own (non-rook) pawn', () => {
  const g = newGame(getEndgameStage('escort').fen);
  const pawn = find(pieces(g, 'w'), 'p')[0];
  const wk = find(pieces(g, 'w'), 'k')[0];
  expect(wk.rank).toBe(6); // king on the 6th ahead of the pawn = always winning
  expect(wk.file).toBe(pawn.file);
  expect(wk.rank).toBeGreaterThan(pawn.rank);
  expect(['a', 'h']).not.toContain(pawn.file); // rook pawns are the exception
});

test('corner fortress: enemy pawn is a rook-pawn and the white king holds the corner zone', () => {
  const g = newGame(getEndgameStage('corner-draw').fen);
  const pawn = find(pieces(g, 'b'), 'p')[0];
  const wk = find(pieces(g, 'w'), 'k')[0];
  expect(['a', 'h']).toContain(pawn.file);
  const corner = pawn.file === 'h' ? { file: 'h', rank: 1 } : { file: 'a', rank: 1 };
  const cheb = Math.max(Math.abs(FILES.indexOf(wk.file) - FILES.indexOf(corner.file)), Math.abs(wk.rank - corner.rank));
  expect(cheb).toBeLessThanOrEqual(1); // g1/h1/g2/h2 zone — the fortress
});

test('lucena: pawn on the 7th, own king on the promotion square, rook cutting the enemy king off', () => {
  const g = newGame(getEndgameStage('lucena').fen);
  const pawn = find(pieces(g, 'w'), 'p')[0];
  const wk = find(pieces(g, 'w'), 'k')[0];
  const wr = find(pieces(g, 'w'), 'r')[0];
  const bk = find(pieces(g, 'b'), 'k')[0];
  expect(pawn.rank).toBe(7);
  expect(wk.square).toBe(pawn.file + 8); // king sits on the promotion square
  expect(['a', 'h']).not.toContain(pawn.file); // rook-pawn Lucena is a different story
  // The white rook fences the file between the pawn and the enemy king.
  const pf = FILES.indexOf(pawn.file);
  const rf = FILES.indexOf(wr.file);
  const bf = FILES.indexOf(bk.file);
  expect(rf).toBeGreaterThan(pf);
  expect(bf).toBeGreaterThan(rf);
});

test('philidor: defending king in front on rank 1-2 near the pawn file; pawn not yet on the 3rd; rook alive', () => {
  const g = newGame(getEndgameStage('philidor').fen);
  const pawn = find(pieces(g, 'b'), 'p')[0];
  const wk = find(pieces(g, 'w'), 'k')[0];
  expect(find(pieces(g, 'w'), 'r')).toHaveLength(1);
  expect(wk.rank).toBeLessThanOrEqual(2);
  expect(Math.abs(FILES.indexOf(wk.file) - FILES.indexOf(pawn.file))).toBeLessThanOrEqual(1);
  expect(pawn.rank).toBeGreaterThanOrEqual(4); // the wall (rank 3) is still available
});
