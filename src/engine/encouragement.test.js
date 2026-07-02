// Positive-habit praise (Phase 3). Same bar as every coach claim: each praise
// must be TRUE (validated by board truth or SEE), and the adversarial traps —
// "saves" that aren't safe, developing onto an attacked square — must stay
// silent. A false compliment teaches a bad habit as surely as a false scold.
import { detectPraise } from './encouragement';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('castling praise (Tier A — board truth)', () => {
  // Italian-style position, White ready to castle short.
  const READY = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';

  test('O-O is praised as a castle', () => {
    const p = detectPraise(READY, 'e1g1');
    expect(p).not.toBeNull();
    expect(p.type).toBe('castle');
    expect(p.text).toMatch(/castled/i);
  });

  test('a quiet non-castling move is not called a castle', () => {
    const p = detectPraise(READY, 'd2d3');
    expect(p ? p.type : null).not.toBe('castle');
  });
});

describe('promotion praise (Tier A)', () => {
  test('pushing to the last rank and promoting is celebrated', () => {
    const p = detectPraise('8/P7/8/8/8/8/k7/4K3 w - - 0 40', 'a7a8q');
    expect(p).not.toBeNull();
    expect(p.type).toBe('promotion');
    expect(p.text).toMatch(/queen/i);
  });
});

describe('saved-piece praise (SEE-validated both ends)', () => {
  // White Ne4 is attacked by the d5 pawn and undefended — genuinely hanging.
  const HANGING = '4k3/8/8/3p4/4N3/8/8/4K3 w - - 0 10';

  test('moving the attacked knight to a safe square is a save', () => {
    const p = detectPraise(HANGING, 'e4c3');
    expect(p).not.toBeNull();
    expect(p.type).toBe('save');
    expect(p.text).toMatch(/knight/i);
  });

  test('TRAP: "escaping" onto another attacked square is NOT a save', () => {
    // Same position plus a black bishop on a1 covering c3.
    const STILL_BAD = '4k3/8/8/3p4/4N3/8/8/b3K3 w - - 0 10';
    expect(detectPraise(STILL_BAD, 'e4c3')).toBeNull();
  });

  test('TRAP: moving a piece that was never in danger is not a "save"', () => {
    // Knight on g1 at the start is attacked by nothing (it earns develop praise
    // instead — the claim must match reality).
    const p = detectPraise(START, 'g1f3');
    expect(p ? p.type : null).not.toBe('save');
  });
});

describe('recapture praise (needs the opponent context)', () => {
  // Black queen just captured on d5; White exd5 takes back safely.
  const QD5 = '4k3/8/8/3q4/4P3/8/8/4K3 w - - 0 12';

  test('taking back on the same square, safely, is praised', () => {
    const p = detectPraise(QD5, 'e4d5', { lastOppMove: { to: 'd5', captured: true } });
    expect(p).not.toBeNull();
    expect(p.type).toBe('recapture');
  });

  test('TRAP: without opponent context the recapture claim is never guessed', () => {
    expect(detectPraise(QD5, 'e4d5')).toBeNull();
  });

  test('TRAP: a recapture that hangs the recapturing piece is not praised', () => {
    // Black rook on d8 wins the pawn right back — "kept the balance" untrue.
    const ROOK_BEHIND = '3rk3/8/8/3q4/4P3/8/8/4K3 w - - 0 12';
    expect(detectPraise(ROOK_BEHIND, 'e4d5', { lastOppMove: { to: 'd5', captured: true } })).toBeNull();
  });
});

describe('development praise (opening, safe squares only)', () => {
  test('a knight leaving home for a safe square is development', () => {
    const p = detectPraise(START, 'g1f3');
    expect(p).not.toBeNull();
    expect(p.type).toBe('develop');
    expect(p.text).toMatch(/Nf3/);
  });

  test('TRAP: developing onto an attacked square is not praised', () => {
    // Black pawn on e4 covers f3; Nf3 would lose material by SEE.
    const PAWN_E4 = 'rnbqkbnr/pppp1ppp/8/8/4p3/8/PPPPPPPP/RNBQKBNR w KQkq - 0 3';
    expect(detectPraise(PAWN_E4, 'g1f3')).toBeNull();
  });

  test('TRAP: past the opening, moving a home-square piece is not "development"', () => {
    const LATE = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 15';
    expect(detectPraise(LATE, 'g1f3')).toBeNull();
  });

  test('an illegal or garbage move never produces praise', () => {
    expect(detectPraise(START, 'e1g1')).toBeNull(); // can't castle at move 1
    expect(detectPraise(START, 'zz')).toBeNull();
    expect(detectPraise('not a fen', 'e2e4')).toBeNull();
  });
});
