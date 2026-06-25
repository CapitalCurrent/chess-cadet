// Coach verdict logic — now testable WITHOUT a running engine by feeding
// synthetic analysis in. Pins the praise/critique ladder and, crucially, the
// TWO-GATE rule: the engine eval governs whether a move is praised, so a
// material grab the engine rates badly is a mistake, never "nice tactic."
import { evaluateMove } from './coachEval';

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
