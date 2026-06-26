// Skewer — the rigorous "win the piece behind." A slider hits a valuable enemy
// piece (or the king) with a piece behind it on the same line; the front MUST
// move, and the piece behind falls. Distinct from a pin (where the valuable
// piece is BEHIND). Like the pin recognizers, geometry names it and the engine's
// forcing line (PV) validates that the back piece actually falls.
import { allSkewers, skewerWin } from './skewers';

describe('allSkewers — geometric scan', () => {
  test('finds a check-skewer: rook checks the king with the queen behind it', () => {
    // After Re1+, Ke5 is skewered to Qe8 down the e-file.
    const sk = allSkewers('4q3/8/8/4k3/8/8/8/4R1K1 w - - 0 1', 'w');
    expect(sk).toHaveLength(1);
    expect(sk[0]).toMatchObject({ frontSquare: 'e5', backSquare: 'e8', backType: 'q', frontIsKing: true });
  });

  test('a PIN (valuable piece BEHIND) is not a skewer', () => {
    // Re1 lines up Ne3 (front, cheap) with Ke8 (behind) — that's a pin.
    expect(allSkewers('4k3/8/8/8/8/4n3/8/4R1K1 w - - 0 1', 'w')).toHaveLength(0);
  });

  test('the king BEHIND is not a skewer target (you cannot win the king)', () => {
    // Rook hits a queen (front) with the king behind — front>=back by value but
    // back is the king, so there is nothing to "win behind."
    expect(allSkewers('4k3/8/8/8/8/4q3/8/4R1K1 w - - 0 1', 'w')).toHaveLength(0);
  });
});

describe('skewerWin — the back piece falls in the engine forcing line', () => {
  // Ra1–e1+ skewers Ke5 to Qe8; the king must step off the file, then Rxe8.
  const FEN = '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1';
  const PV = ['a1e1', 'e5d5', 'e1e8'];

  test('recognises winning the queen behind the king', () => {
    const info = skewerWin(FEN, PV);
    expect(info).toBeTruthy();
    expect(info.backType).toBe('q');
    expect(info.backSquare).toBe('e8');
    expect(info.frontIsKing).toBe(true);
  });

  test('TRAP: a line that never captures the back piece → null', () => {
    expect(skewerWin(FEN, ['a1e1', 'e5d5', 'g1f1'])).toBeNull();
  });

  test('no PV → null (degrades gracefully)', () => {
    expect(skewerWin(FEN, undefined)).toBeNull();
  });
});
