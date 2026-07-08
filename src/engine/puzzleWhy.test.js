// The puzzle "why" must be TRUE before it's spoken: material claims only when
// the stored line nets it, mate only when the line (or verdict) says mate,
// and silence (null) when nothing is validated — never an invented lesson.
import { puzzleWhy, linePayoff, materialPhrase } from './puzzleWhy';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// White Nh6 → Nf7+ forks Kh8 and Rd8; after Kg7, Nxd8 wins the rook.
const FORK = '3r3k/8/7N/8/8/8/8/7K w - - 0 1';
const FORK_PV = ['h6f7', 'h8g7', 'f7d8'];
// Back-rank: Ra8 is checkmate.
const MATE = '6k1/5ppp/8/8/8/8/8/R6K w - - 0 1';

describe('materialPhrase bands (conservative — never overstate)', () => {
  test.each([
    [900, 'a whole queen'],
    [500, 'a rook'],
    [300, 'a knight or bishop'],
    [100, 'a pawn'],
    [50, null],
    [0, null],
    [-200, null],
  ])('%i cp → %s', (net, phrase) => {
    expect(materialPhrase(net)).toBe(phrase);
  });
});

describe('linePayoff reads the stored line', () => {
  test('the fork line nets a rook', () => {
    const p = linePayoff(FORK, FORK_PV);
    expect(p.mate).toBe(false);
    expect(p.net).toBe(500);
    expect(p.phrase).toBe('a rook');
  });

  test('a mating line reports mate, no material phrase', () => {
    const p = linePayoff(MATE, ['a1a8']);
    expect(p.mate).toBe(true);
    expect(p.phrase).toBe(null);
  });

  test('missing/garbage pv degrades to no claim, never throws', () => {
    expect(linePayoff(FORK, null)).toEqual({ mate: false, net: 0, phrase: null });
    expect(linePayoff(FORK, ['zz99']).phrase).toBe(null);
  });
});

describe('puzzleWhy — the lesson sentence', () => {
  test('fork with a validated rook payoff names both the idea and the prize', () => {
    const why = puzzleWhy({ fen: FORK, pv: FORK_PV, motif: 'fork' });
    expect(why).toMatch(/TWO things at once/);
    expect(why).toMatch(/win a rook/);
  });

  test('fork WITHOUT a line keeps the idea but claims no material', () => {
    const why = puzzleWhy({ fen: FORK, pv: null, motif: 'fork' });
    expect(why).toMatch(/TWO things at once/);
    expect(why).not.toMatch(/win a/);
  });

  test('mate motif speaks checkmate with the count', () => {
    const why = puzzleWhy({ fen: MATE, pv: ['a1a8'], motif: 'mate', mateIn: 1 });
    expect(why).toMatch(/CHECKMATE in 1/);
  });

  test('a line that ends in mate speaks checkmate even without the motif', () => {
    const why = puzzleWhy({ fen: MATE, pv: ['a1a8'], motif: null });
    expect(why).toMatch(/CHECKMATE/);
  });

  test('no motif + winning line explains the material payoff', () => {
    const why = puzzleWhy({ fen: FORK, pv: FORK_PV, motif: null });
    expect(why).toMatch(/up a rook/);
  });

  test('nothing validated → null (caller falls back, never invents)', () => {
    expect(puzzleWhy({ fen: START, pv: ['g1f3'], motif: null })).toBe(null);
    expect(puzzleWhy({})).toBe(null);
  });

  test('pin and skewer sentences carry their frozen/behind ideas', () => {
    expect(puzzleWhy({ fen: FORK, pv: null, motif: 'pin' })).toMatch(/FROZEN/);
    expect(puzzleWhy({ fen: FORK, pv: null, motif: 'skewer' })).toMatch(/hiding behind/);
  });
});
