// Pinned-defender win — the exact-via-legality recognizer. These pin the rule
// AND the two false-positive traps found while checking the logic: the enemy
// king isn't a "pinned defender," and a relative pin (legal recapture) doesn't
// fire. Capturing a piece whose only real defender is absolutely pinned wins it.
import { pinnedDefenderWin, allPins, workingPinWin } from './pins';

describe('allPins — geometric scan of pinned enemy pieces', () => {
  test('finds a knight pinned to its king by a rook', () => {
    // White Re1 pins Ne3 to Ke8 down the e-file.
    const pins = allPins('4k3/8/8/8/8/4n3/8/4R1K1 w - - 0 1', 'w');
    expect(pins).toHaveLength(1);
    expect(pins[0]).toMatchObject({ pinnedSquare: 'e3', pinnedType: 'n', rearIsKing: true });
  });

  test('an alignment against an EQUAL piece (no bigger behind) is not a pin', () => {
    // Re1 lines up Ne3 with another knight on e6 — equal, not the king.
    expect(allPins('4k3/8/4n3/8/8/4n3/8/4R1K1 w - - 0 1', 'w')).toHaveLength(0);
  });
});

describe('workingPinWin — the pinned piece falls in the engine forcing line', () => {
  // White Re1 pins Ne7 to Ke8; the f8 bishop defends e7 so Rxe7 now loses the
  // rook (SEE-negative → v0.24.0 stays silent). But f5–f6 attacks the FROZEN
  // knight a second time and the forcing line wins it: f6, Bh6, fxe7 (the king
  // can't recapture — Re1 covers e7).
  const FEN = '4kb2/4n3/8/5P2/8/8/8/4R1K1 w - - 0 1';
  const PV = ['f5f6', 'f8h6', 'f6e7'];

  test('recognises the pile-on win on the pinned knight', () => {
    const info = workingPinWin(FEN, PV);
    expect(info).toBeTruthy();
    expect(info.pinnedType).toBe('n');
    expect(info.pinnedSquare).toBe('e7');
  });

  test('TRAP: a pin the line never converts → null', () => {
    // Same pin, but the line just shuffles the king instead of winning the knight.
    expect(workingPinWin(FEN, ['f5f6', 'f8h6', 'g1f1'])).toBeNull();
  });

  test('no PV → null (degrades gracefully)', () => {
    expect(workingPinWin(FEN, undefined)).toBeNull();
  });
});

describe('pinnedDefenderWin — absolute pin (v1)', () => {
  test('wins a bishop guarded only by a pawn pinned to the king', () => {
    // White Rd1 takes Bd5; Black c6 pawn would recapture but is pinned to Ke8
    // by Ba4 (a4–b5–c6–d7–e8), so cxd5 is illegal → Black can't take back.
    const FEN = '4k3/8/2p5/3b4/B7/8/8/3R3K w - - 0 1';
    const info = pinnedDefenderWin(FEN, 'd1d5');
    expect(info).toBeTruthy();
    expect(info.wonType).toBe('b');
    expect(info.pinnedType).toBe('p');
    expect(info.pinnedSquare).toBe('c6');
  });
});

describe('pinnedDefenderWin — must NOT false-positive', () => {
  test('TRAP: the enemy KING blocked by defense is not a "pinned defender"', () => {
    // White Nf4 takes the e6 pawn; the e6 square is defended by Re1, so the
    // Black king on e7 can't recapture — but that's defense, not a pin.
    const FEN = '8/4k3/4p3/8/5N2/8/8/4R2K w - - 0 1';
    expect(pinnedDefenderWin(FEN, 'f4e6')).toBeNull();
  });

  test('TRAP: a RELATIVE pin (pawn to the queen) has a legal recapture → silent', () => {
    // Same shape, but c6 is pinned to the QUEEN on e8, not the king. cxd5 is
    // legal (just loses the queen), so this is the harder case — not v1.
    const FEN = 'k3q3/8/2p5/3b4/B7/8/8/3R3K w - - 0 1';
    expect(pinnedDefenderWin(FEN, 'd1d5')).toBeNull();
  });

  test('a piece defended by a NON-pinned pawn is a normal exchange → silent', () => {
    const FEN = '4k3/8/2p5/3b4/8/8/8/3R3K w - - 0 1';
    expect(pinnedDefenderWin(FEN, 'd1d5')).toBeNull();
  });

  test('an undefended capture is just a free piece, not a pin story → silent', () => {
    const FEN = '4k3/8/8/3b4/8/8/8/3R3K w - - 0 1';
    expect(pinnedDefenderWin(FEN, 'd1d5')).toBeNull();
  });

  test('a non-capture move → null', () => {
    expect(pinnedDefenderWin('4k3/8/8/3b4/8/8/8/3R3K w - - 0 1', 'd1d2')).toBeNull();
  });
});
