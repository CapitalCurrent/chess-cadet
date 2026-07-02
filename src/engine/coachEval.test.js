// Coach verdict logic — now testable WITHOUT a running engine by feeding
// synthetic analysis in. Pins the praise/critique ladder and, crucially, the
// TWO-GATE rule: the engine eval governs whether a move is praised, so a
// material grab the engine rates badly is a mistake, never "nice tactic."
import { evaluateMove, pickSuggestionUci, winningLine, lineFraming } from './coachEval';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// White Nh6 can play Nf7+ forking Kh8 and Rd8.
const FORK_BEFORE = '3r3k/8/7N/8/8/8/8/7K w - - 0 1';
const FORK_AFTER = '3r3k/5N2/8/8/8/8/8/7K b - - 0 1';

describe('praise tier (engine-good moves)', () => {
  test('the engine best, quiet, is "Best move"', () => {
    const v = evaluateMove(START, 'g1f3', START, { cands: [{ move: 'g1f3', cp: 25 }], herCp: 25 });
    expect(v.kind).toBe('best');
    expect(v.label).toBe('Best');
  });

  test('an among-the-best non-top move is "Great"', () => {
    const v = evaluateMove(START, 'b1c3', START, {
      cands: [{ move: 'g1f3', cp: 30 }, { move: 'b1c3', cp: 20 }],
      herCp: 20,
    });
    expect(v.kind).toBe('good'); // among-the-best (not #1) → 'good' kind, 'Great' label
    expect(v.label).toBe('Great');
  });

  test('a winning fork (best + spike + real fork) is praised as a Fork', () => {
    const v = evaluateMove(FORK_BEFORE, 'h6f7', FORK_AFTER, {
      cands: [{ move: 'h6f7', cp: 400 }, { move: 'h1g1', cp: 50 }],
      herCp: 400,
    });
    expect(v.label).toBe('Fork');
    expect(v.text).toMatch(/fork/i);
  });

  test('a winning discovered check is praised as a Discovery', () => {
    // Ne4–c5 unveils Re1 down the e-file, giving check to Ke8 (a discovered
    // check — the validated, forcing case the winnability gate keeps).
    const DISC_BEFORE = '4k3/8/8/8/4N3/8/8/4R1K1 w - - 0 1';
    const DISC_AFTER = '4k3/8/8/2N5/8/8/8/4R1K1 b - - 0 1';
    const v = evaluateMove(DISC_BEFORE, 'e4c5', DISC_AFTER, {
      cands: [{ move: 'e4c5', cp: 500 }, { move: 'e1e2', cp: 30 }],
      herCp: 500,
    });
    expect(v.label).toBe('Discovery');
    expect(v.text).toMatch(/discovered/i);
  });
});

describe('pinned-defender win wiring', () => {
  // White Rd1xd5 wins the bishop — its only defender (c6 pawn) is pinned to Ke8.
  const PIN = '4k3/8/2p5/3b4/B7/8/8/3R3K w - - 0 1';

  test('praised as a "Pin win" when she plays it', () => {
    const v = evaluateMove(PIN, 'd1d5', PIN, {
      cands: [{ move: 'd1d5', cp: 330 }, { move: 'h1g1', cp: 40 }],
      herCp: 330,
    });
    expect(v.label).toBe('Pin win');
    expect(v.text).toMatch(/pinned/i);
  });

  test('flagged as a "Missed pin win" when she plays something else', () => {
    const v = evaluateMove(PIN, 'h1g1', PIN, {
      cands: [{ move: 'd1d5', cp: 330 }, { move: 'h1g1', cp: 40 }],
      herCp: 40,
    });
    expect(v.label).toBe('Missed pin win');
    expect(v.motif).toBe('pin');
    expect(v.text).toMatch(/pinned/i);
  });
});

describe('working-the-pin (multi-move pile-on) via the engine forcing line', () => {
  // Re1 pins Ne7 to Ke8; the f8 bishop guards e7 so an immediate Rxe7 loses the
  // rook. f5–f6 attacks the frozen knight again and the PV wins it: f6, Bh6, fxe7.
  const FEN = '4kb2/4n3/8/5P2/8/8/8/4R1K1 w - - 0 1';
  const AFTER = '4kb2/4n3/5P2/8/8/8/8/4R1K1 b - - 0 1';
  const PV = ['f5f6', 'f8h6', 'f6e7'];

  test('praised as a "Pin win" — the frozen knight falls in the line', () => {
    const v = evaluateMove(FEN, 'f5f6', AFTER, {
      cands: [{ move: 'f5f6', cp: 300, pv: PV }, { move: 'g1f1', cp: 40 }],
      herCp: 300,
    });
    expect(v.label).toBe('Pin win');
    expect(v.text).toMatch(/pin|stuck|frozen/i);
  });

  test('flagged as a "Missed pin win" when she plays a quiet move instead', () => {
    const v = evaluateMove(FEN, 'g1f1', FEN, {
      cands: [{ move: 'f5f6', cp: 300, pv: PV }, { move: 'g1f1', cp: 40 }],
      herCp: 40,
    });
    expect(v.label).toBe('Missed pin win');
    expect(v.motif).toBe('pin');
  });
});

describe('skewer — win the piece behind (validated by the forcing line)', () => {
  // Ra1–e1+ skewers Ke5 to Qe8; king steps aside, Rxe8 wins the queen.
  const FEN = '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1';
  const PV = ['a1e1', 'e5d5', 'e1e8'];

  test('praised as a "Skewer" when she plays it', () => {
    const v = evaluateMove(FEN, 'a1e1', FEN, {
      cands: [{ move: 'a1e1', cp: 850, pv: PV }, { move: 'g1f1', cp: 20 }],
      herCp: 850,
    });
    expect(v.label).toBe('Skewer');
    expect(v.text).toMatch(/skewer/i);
  });

  test('flagged as a "Missed skewer" when she plays something else', () => {
    const v = evaluateMove(FEN, 'g1f1', FEN, {
      cands: [{ move: 'a1e1', cp: 850, pv: PV }, { move: 'g1f1', cp: 20 }],
      herCp: 20,
    });
    expect(v.label).toBe('Missed skewer');
    expect(v.motif).toBe('skewer');
  });
});

describe('mate awareness — deliver it, or learn you missed it', () => {
  // White Qh5xf7 is Scholar's mate.
  const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1';
  // White Ra1–a8+ (just a check here) but the engine sees a forced mate behind it.
  const ROOK = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';

  test('delivering mate is "Checkmate" (Tier A — board truth)', () => {
    const v = evaluateMove(SCHOLAR, 'h5f7', SCHOLAR, { cands: [{ move: 'h5f7', mate: 1 }], herCp: 99900 });
    expect(v.label).toBe('Checkmate');
    expect(v.text).toMatch(/checkmate/i);
  });

  test('a best move that FORCES mate-in-N is praised as "Mate in N"', () => {
    const v = evaluateMove(ROOK, 'a1a8', ROOK, {
      cands: [{ move: 'a1a8', mate: 2 }, { move: 'e1e2', cp: 30 }],
      herCp: 99800,
    });
    expect(v.label).toBe('Mate in 2');
    expect(v.text).toMatch(/mate in 2/i);
    expect(v.mateIn).toBe(2);
  });

  test('missing a forced mate is flagged as "Missed mate in N"', () => {
    const v = evaluateMove(ROOK, 'e1e2', ROOK, {
      cands: [{ move: 'a1a8', mate: 3 }, { move: 'e1e2', cp: 30 }],
      herCp: 30,
    });
    expect(v.kind).toBe('warn');
    expect(v.label).toBe('Missed mate in 3');
    expect(v.text).toMatch(/mate in 3/i);
    expect(v.motif).toBe('mate');
    expect(v.best.uci).toBe('a1a8');
  });

  test('getting mated (negative mate score) is NOT praised as mate', () => {
    // She is to move; the engine best avoids loss but a mate score for the
    // OPPONENT (negative) must never read as "you have mate".
    const v = evaluateMove(ROOK, 'e1e2', ROOK, {
      cands: [{ move: 'a1a8', cp: 20 }],
      herCp: 15,
    });
    expect(v.label).not.toMatch(/mate/i);
  });
});

describe('encouragement riding on the verdict (Phase 3)', () => {
  test('a best developing move carries develop praise alongside the verdict', () => {
    const v = evaluateMove(START, 'g1f3', START, { cands: [{ move: 'g1f3', cp: 25 }], herCp: 25 });
    expect(v.label).toBe('Best'); // verdict unchanged — praise rides alongside
    expect(v.praise).toBeTruthy();
    expect(v.praise.type).toBe('develop');
  });

  test('castling in the Good band carries castle praise', () => {
    const READY = 'rnbqk2r/pppp1ppp/5n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4';
    const v = evaluateMove(READY, 'e1g1', READY, {
      cands: [{ move: 'd2d4', cp: 90 }, { move: 'e1g1', cp: 20 }],
      herCp: 20, // loss 70 → Good band
    });
    expect(v.label).toBe('Good');
    expect(v.praise.type).toBe('castle');
  });

  test('warn verdicts never carry praise', () => {
    const v = evaluateMove(START, 'g1f3', START, {
      cands: [{ move: 'e2e4', cp: 40 }],
      herCp: -400,
    });
    expect(v.kind).toBe('warn');
    expect(v.praise).toBeUndefined();
  });
});

describe('choosing your OWN mate is still winning, never scolded', () => {
  const ROOK = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';

  test('a different move that also forces mate in N is celebrated', () => {
    const v = evaluateMove(ROOK, 'a1a8', ROOK, {
      cands: [{ move: 'a1b1', mate: 2 }, { move: 'a1a8', mate: 2 }],
      herCp: 99800,
    });
    expect(v.kind).toBe('good');
    expect(v.text).toMatch(/still forcing mate in 2/i);
    expect(v.mateIn).toBe(2);
  });

  test('a SLOWER forced mate reads "still winning", not "loose"', () => {
    const v = evaluateMove(ROOK, 'a1a8', ROOK, {
      cands: [{ move: 'a1b1', mate: 2 }, { move: 'a1a8', mate: 3 }],
      herCp: 99700, // loss 100 → Good band
    });
    expect(v.kind).toBe('good');
    expect(v.text).toMatch(/still winning/i);
    expect(v.text).not.toMatch(/loose|careful/i);
  });
});

describe('TWO-GATE rule — material won locally but engine says bad', () => {
  test('a capture the engine rates losing is a Mistake, never praised', () => {
    // She "wins" something but the engine eval of her move is bad (herCp = -400)
    // while best is +50. Even though it could be a capture, it's flagged.
    const v = evaluateMove(START, 'd1d7', START, {
      cands: [{ move: 'g1f3', cp: 50 }],
      herCp: -400,
    });
    expect(v.kind).toBe('warn');
    expect(v.label).toBe('Mistake');
    expect(v.text).not.toMatch(/nice|great|sharp|wins material/i);
  });
});

describe('critique tier', () => {
  test('missing a winning fork is flagged as "Missed fork"', () => {
    // She played a quiet king move; the engine best (Nf7) is a winning fork.
    const v = evaluateMove(FORK_BEFORE, 'h1g1', FORK_BEFORE, {
      cands: [{ move: 'h6f7', cp: 400 }, { move: 'h1g1', cp: 60 }],
      herCp: 60,
    });
    expect(v.kind).toBe('warn');
    expect(v.label).toBe('Missed fork');
    expect(v.motif).toBe('fork');
    expect(v.best.uci).toBe('h6f7');
  });

  test('a loose move uses the human suggestion when provided', () => {
    const v = evaluateMove(START, 'a2a3', START, {
      cands: [{ move: 'e2e4', cp: 40 }],
      herCp: -120, // loss 160 → inaccuracy band, not a missed tactic (best is quiet)
      humanSuggestSan: 'Nf3',
    });
    expect(v.kind).toBe('warn');
    expect(v.label).toBe('Inaccuracy');
    expect(v.text).toMatch(/Nf3/);
  });

  test('falls back to the engine best move when no human suggestion', () => {
    const v = evaluateMove(START, 'a2a3', START, {
      cands: [{ move: 'e2e4', cp: 40 }],
      herCp: -120,
    });
    expect(v.text).toMatch(/e4/);
  });
});

test('no candidates → null verdict', () => {
  expect(evaluateMove(START, 'e2e4', START, { cands: [], herCp: 0 })).toBeNull();
});

describe('lineFraming — whose line is it, and is the mate forced?', () => {
  test('a positive mate score = SHE can force mate', () => {
    expect(lineFraming({ mate: 3 })).toEqual({ kind: 'you-mate', mateN: 3 });
  });
  test('a negative mate score = the OPPONENT can force mate (not "winning")', () => {
    expect(lineFraming({ mate: -6 })).toEqual({ kind: 'they-mate', mateN: 6 });
  });
  test('a big cp advantage = a winning line for her', () => {
    expect(lineFraming({ cp: 300 })).toEqual({ kind: 'win', mateN: null });
  });
  test('a small/neutral cp = only "a better line", never claimed as winning', () => {
    expect(lineFraming({ cp: 20 })).toEqual({ kind: 'better', mateN: null });
  });
});

describe('winningLine — the SAN sequence to SHOW (teach the missed line)', () => {
  const ROOK = '4k3/8/8/8/8/8/8/R3K3 w - - 0 1';

  test('reads the engine PV out as SAN moves', () => {
    expect(winningLine(ROOK, ['a1a8', 'e8d7', 'a8a7'])).toEqual(['Ra8+', 'Kd7', 'Ra7+']);
  });

  test('truncates to `max` plies (kid-sized)', () => {
    expect(winningLine(ROOK, ['a1a8', 'e8d7', 'a8a7'], 2)).toEqual(['Ra8+', 'Kd7']);
  });

  test('no PV → empty (nothing to show, degrades cleanly)', () => {
    expect(winningLine(ROOK, undefined)).toEqual([]);
    expect(winningLine(ROOK, [])).toEqual([]);
  });
});

describe('pickSuggestionUci — suggestions must be SOUND, not just human', () => {
  // Engine candidates best-first; b1c3 is in the list but clearly weak.
  const cands = [
    { move: 'e2e4', cp: 40 },
    { move: 'd2d4', cp: 30 },
    { move: 'g1f3', cp: 10 },
    { move: 'b1c3', cp: -120 },
  ];

  test('uses Maia move when it is the best', () => {
    expect(pickSuggestionUci('e2e4', cands)).toBe('e2e4');
  });

  test('uses Maia move when sound (within threshold of best)', () => {
    expect(pickSuggestionUci('d2d4', cands)).toBe('d2d4'); // 40−30 = 10 ≤ 60
  });

  test('REJECTS a weak Maia move (in the list but far below best) → engine best', () => {
    expect(pickSuggestionUci('b1c3', cands)).toBe('e2e4'); // 40−(−120) = 160 > 60
  });

  test('REJECTS a Maia move not among the candidates → engine best', () => {
    expect(pickSuggestionUci('a2a3', cands)).toBe('e2e4');
  });

  test('no Maia move → engine best', () => {
    expect(pickSuggestionUci(null, cands)).toBe('e2e4');
  });

  test('no engine analysis → falls back to the Maia move', () => {
    expect(pickSuggestionUci('e2e4', [])).toBe('e2e4');
  });

  test('nothing to suggest → null', () => {
    expect(pickSuggestionUci(null, [])).toBeNull();
  });
});
