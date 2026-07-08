// The notebook must only SERVE puzzle-worthy entries: a named motif (one
// concrete idea to find) or a stored uniqueness gap (deposited through the
// v0.43.0 capture gate). Legacy multi-answer "find a stronger move" deposits
// stay in storage but never reach the queue.
import { addMistake, activeMistakes, puzzleQueue, clearNotebook } from './notebook';

const PROFILE = 'test-profile';

function entry(overrides = {}) {
  return {
    fen: '3r3k/8/7N/8/8/8/8/7K w - - 0 1',
    played: { san: 'Kg1', uci: 'h1g1' },
    best: { san: 'Nf7+', uci: 'h6f7' },
    label: 'Missed fork',
    ...overrides,
  };
}

beforeEach(() => clearNotebook(PROFILE));
afterEach(() => clearNotebook(PROFILE));

test('a motif entry is served (legacy or new)', () => {
  addMistake(PROFILE, entry({ motif: 'fork' }));
  expect(activeMistakes(PROFILE)).toHaveLength(1);
});

test('a gated entry (stored gap) is served even without a motif', () => {
  addMistake(PROFILE, entry({ motif: null, gap: 260, label: 'Missed tactic' }));
  expect(puzzleQueue(PROFILE)).toHaveLength(1);
});

test('a legacy no-motif no-gap entry is NOT served', () => {
  addMistake(PROFILE, entry({ motif: null, label: 'Mistake' }));
  expect(activeMistakes(PROFILE)).toHaveLength(0);
  expect(puzzleQueue(PROFILE)).toHaveLength(0);
});

test('dedup on (fen, played move) still applies', () => {
  expect(addMistake(PROFILE, entry({ motif: 'fork' }))).toBe(true);
  expect(addMistake(PROFILE, entry({ motif: 'fork' }))).toBe(false);
  expect(activeMistakes(PROFILE)).toHaveLength(1);
});
