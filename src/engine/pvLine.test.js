// Principal-variation walking — the depth primitive. These pin the pure
// line-reasoning the coach will use to validate "this tactic actually pays off
// over the next few moves" against the ENGINE'S best line (not one-ply geometry).
// No engine here: we feed synthetic UCI lines and check the reasoning.
import { walkLine, heroNetMaterial, lineCapturesSquare, lineSteps } from './pvLine';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('walkLine — plays a UCI line on the board, robustly', () => {
  test('returns the SAN sequence for a legal line', () => {
    const w = walkLine(START, ['e2e4', 'e7e5', 'g1f3']);
    expect(w.ok).toBe(true);
    expect(w.sans).toEqual(['e4', 'e5', 'Nf3']);
    expect(w.mate).toBe(false);
  });

  test('stops cleanly at the first illegal move (garbage-tolerant)', () => {
    const w = walkLine(START, ['e2e4', 'e2e4', 'g1f3']); // 2nd move is now illegal
    expect(w.ok).toBe(true);
    expect(w.sans).toEqual(['e4']);
  });

  test('an empty line is a valid no-op', () => {
    const w = walkLine(START, []);
    expect(w.ok).toBe(true);
    expect(w.sans).toEqual([]);
  });

  test('detects checkmate at the end of the line', () => {
    // Back-rank: Ra1–a8 is mate (king boxed by its own f7/g7/h7 pawns).
    const w = walkLine('6k1/5ppp/8/8/8/8/8/R6K w - - 0 1', ['a1a8']);
    expect(w.sans).toEqual(['Ra8#']);
    expect(w.mate).toBe(true);
  });
});

describe('heroNetMaterial — material swing at the END of the forcing line', () => {
  test('a clean capture nets the won piece (+knight)', () => {
    // White Re3xe5 wins an undefended knight.
    const FEN = '4k3/8/8/4n3/8/4R3/8/4K3 w - - 0 1';
    expect(heroNetMaterial(FEN, ['e3e5'])).toBe(300);
  });

  test('a capture that loses the recapture is NET negative (rook for knight)', () => {
    // Re3xe5 but the d6 pawn recaptures: white traded a rook (500) for a knight
    // (300). The depth-aware verdict is −200, even though ply 1 grabbed a piece.
    const FEN = '4k3/8/3p4/4n3/8/4R3/8/4K3 w - - 0 1';
    expect(heroNetMaterial(FEN, ['e3e5', 'd6e5'])).toBe(-200);
  });

  test('an even trade nets 0', () => {
    // White Re3xe5 takes a rook; the a5 rook recaptures along rank 5 — an even
    // rook-for-rook trade, so the line nets nothing.
    const FEN = '4k3/8/8/r3r3/8/4R3/8/4K3 w - - 0 1';
    expect(heroNetMaterial(FEN, ['e3e5', 'a5e5'])).toBe(0);
  });
});

describe('lineSteps — board positions to SHOW the line', () => {
  test('starts at the position before the line, then one step per ply', () => {
    const steps = lineSteps(START, ['e2e4', 'e7e5']);
    expect(steps).toHaveLength(3); // start + 2 plies
    expect(steps[0]).toMatchObject({ san: null, fen: START, from: null, to: null });
    expect(steps[1]).toMatchObject({ san: 'e4', from: 'e2', to: 'e4' });
    expect(steps[2].san).toBe('e5');
    expect(steps[1].fen).toContain(' b '); // black to move after 1.e4
  });

  test('no PV → just the start position', () => {
    expect(lineSteps(START, undefined)).toEqual([{ san: null, fen: START, from: null, to: null }]);
  });

  test('truncates to `max` plies', () => {
    expect(lineSteps(START, ['e2e4', 'e7e5', 'g1f3'], 2)).toHaveLength(3); // start + 2
  });
});

describe('lineCapturesSquare — attributes a win to a specific piece', () => {
  const FEN = '4k3/8/3p4/4n3/8/4R3/8/4K3 w - - 0 1';

  test('true when the hero captures the enemy piece on that square', () => {
    expect(lineCapturesSquare(FEN, ['e3e5', 'd6e5'], 'e5')).toBe(true);
  });

  test('false when the hero never captures there', () => {
    expect(lineCapturesSquare(FEN, ['e1e2'], 'e5')).toBe(false);
  });
});
