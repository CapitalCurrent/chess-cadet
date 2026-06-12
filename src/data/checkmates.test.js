// Content validation for Checkmate School — a bad FEN can't ship.
import { Chess } from 'chess.js';
import { MATE_PACKS, ENDGAME_STAGES } from './checkmates';

function matingMoves(fen) {
  const g = new Chess(fen);
  return g.moves({ verbose: true }).filter((m) => {
    g.move(m.san);
    const mate = g.isCheckmate();
    g.undo();
    return mate;
  });
}

describe('mate-in-1 packs', () => {
  for (const pack of MATE_PACKS) {
    describe(pack.name, () => {
      for (const pos of pack.positions) {
        test(`${pos.id} is legal, White to move, with a mate in 1`, () => {
          const g = new Chess(pos.fen); // throws if illegal
          expect(g.turn()).toBe('w');
          expect(g.isGameOver()).toBe(false);
          expect(g.inCheck()).toBe(false); // puzzles start calm, not mid-check
          expect(matingMoves(pos.fen).length).toBeGreaterThan(0);
        });
      }
    });
  }

  test('position ids are unique across packs', () => {
    const ids = MATE_PACKS.flatMap((p) => p.positions.map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe('endgame stages', () => {
  for (const stage of ENDGAME_STAGES) {
    test(`${stage.id} starting position is legal and not over`, () => {
      const g = new Chess(stage.fen);
      expect(g.turn()).toBe('w');
      expect(g.isGameOver()).toBe(false);
      // and NOT already a mate-in-1 — it should take real technique
      expect(matingMoves(stage.fen).length).toBe(0);
    });
  }
});
