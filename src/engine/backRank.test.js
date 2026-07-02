// Back-rank mate recognition. The traps matter more than the hits: a mate that
// merely happens on the eighth rank must NOT be called "back-rank" unless the
// king was genuinely walled in by its own pieces and checked along the rank.
import { backRankMate, mateLineBackRank } from './backRank';

describe('backRankMate — the classic shape', () => {
  test('rook mate behind an intact pawn wall IS back-rank', () => {
    // Black king g8 walled by f7/g7/h7 pawns, white rook a8#.
    expect(backRankMate('R5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1')).toBe(true);
  });

  test('queen delivering the rank mate counts too', () => {
    expect(backRankMate('Q5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1')).toBe(true);
  });

  test('works for WHITE getting mated (rank 1, wall on rank 2)', () => {
    expect(backRankMate('4k3/8/8/8/8/8/5PPP/r5K1 w - - 0 1')).toBe(true);
  });

  test('TRAP: not checkmate at all → false', () => {
    // Same shape minus the mate (rook only gives check, king has h7... blocked
    // — use a position where a defender can capture the rook).
    expect(backRankMate('R5k1/5ppp/8/8/8/8/8/4K3 w - - 0 1')).toBe(false); // white to move, no mate
  });

  test('TRAP: an escape square in front (no wall) is not back-rank', () => {
    // g7 empty — if this were mate it would be for other reasons; here it is
    // not even mate (Kg7 escapes), so the claim must be false.
    expect(backRankMate('R5k1/5p1p/8/8/8/8/8/4K3 b - - 0 1')).toBe(false);
  });

  test('TRAP: smothered mate (knight, king in the corner) is NOT back-rank', () => {
    // Classic smothered: Nf7# against Kh8 walled by g8 rook + g7/h7 pawns.
    expect(backRankMate('6rk/5Npp/8/8/8/8/8/4K3 b - - 0 1')).toBe(false);
  });

  test('TRAP: a rank mate where the wall is ENEMY pieces is not the pattern', () => {
    // King g8 blocked in front by white pawns (f7/g7/h7 are enemy, covering
    // escape squares) — mate, but not "trapped behind its OWN pawns".
    expect(backRankMate('R5k1/5PPP/5K2/8/8/8/8/8 b - - 0 1')).toBe(false);
  });

  test('garbage input → false, never throws', () => {
    expect(backRankMate('not a fen')).toBe(false);
  });
});

describe('mateLineBackRank — the motif validated on the engine line', () => {
  // White Re1–e8 is mate next move? Build a 2-ply line: Re8+ is immediately mate.
  const FEN = '6k1/5ppp/8/8/8/8/8/4R1K1 w - - 0 1';

  test('a PV ending in a back-rank mate is recognized', () => {
    expect(mateLineBackRank(FEN, ['e1e8'])).toBe(true);
  });

  test('a PV that does not end in mate → false', () => {
    expect(mateLineBackRank(FEN, ['e1e2'])).toBe(false);
  });

  test('no PV → false (degrades cleanly)', () => {
    expect(mateLineBackRank(FEN, [])).toBe(false);
    expect(mateLineBackRank(FEN, undefined)).toBe(false);
  });
});
