// Combination-step building. A stored PV must become hero-move steps with the
// opponent's forced replies attached, degrade cleanly on garbage, and stay
// kid-sized (capped).
import { comboSteps, comboLineText } from './comboSteps';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('comboSteps', () => {
  test('a 3-ply line becomes 2 hero steps with the reply between', () => {
    const steps = comboSteps(START, ['e2e4', 'e7e5', 'g1f3']);
    expect(steps).toHaveLength(2);
    expect(steps[0].expectSan).toBe('e4');
    expect(steps[0].reply.san).toBe('e5');
    expect(steps[1].expectSan).toBe('Nf3');
    expect(steps[1].reply).toBeNull();
    // Step 2 is solved FROM the position after the reply.
    expect(steps[1].fen).toBe(steps[0].reply.fen);
  });

  test('caps at maxHeroMoves so puzzles stay short', () => {
    const steps = comboSteps(START, ['e2e4', 'e7e5', 'g1f3', 'b8c6', 'f1c4', 'f8c5', 'c2c3', 'g8f6'], { maxHeroMoves: 3 });
    expect(steps).toHaveLength(3);
  });

  test('a mate at the end is flagged', () => {
    // Ra8# against the walled-in king.
    const steps = comboSteps('6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', ['a1a8']);
    expect(steps).toHaveLength(1);
    expect(steps[0].mate).toBe(true);
    expect(steps[0].expectSan).toBe('Ra8#');
  });

  test('promotion moves keep the promotion piece in the UCI', () => {
    const steps = comboSteps('8/P6k/8/8/8/8/8/K7 w - - 0 1', ['a7a8q']);
    expect(steps[0].expectUci).toBe('a7a8q');
  });

  test('an illegal tail truncates instead of throwing', () => {
    const steps = comboSteps(START, ['e2e4', 'zz99', 'g1f3']);
    expect(steps).toHaveLength(1); // just the first hero move survives
    expect(steps[0].reply).toBeNull();
  });

  test('garbage input → no steps', () => {
    expect(comboSteps(START, [])).toEqual([]);
    expect(comboSteps(START, undefined)).toEqual([]);
    expect(comboSteps('not a fen', ['e2e4'])).toEqual([]);
  });
});

describe('comboLineText', () => {
  test('reads the remaining line from a step onward', () => {
    const steps = comboSteps(START, ['e2e4', 'e7e5', 'g1f3']);
    expect(comboLineText(steps)).toBe('e4 e5 Nf3');
    expect(comboLineText(steps, 1)).toBe('Nf3');
  });
});
