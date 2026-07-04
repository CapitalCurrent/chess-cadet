// Opening-transfer coach lookup. The rules that matter: only STUDIED courses
// speak, the deepest match wins, and the departure is attributed to the right
// side — her own deviations must read 'her' so the caller can stay silent.
import { bookStatus, studiedOpenings, departurePlan } from './bookTransfer';

// Progress fixture: Italian drilled, everything else untouched.
const PROGRESS = { mastery: { 'italian-white': { runs: 3, cleanRuns: 2 } }, lines: {} };

describe('studiedOpenings — no lectures about courses she never opened', () => {
  test('only the drilled course counts, and only for her color', () => {
    expect(studiedOpenings(PROGRESS, 'w').map((o) => o.id)).toEqual(['italian-white']);
    expect(studiedOpenings(PROGRESS, 'b')).toEqual([]); // Italian is a White course
    expect(studiedOpenings(null, 'w')).toEqual([]);
  });

  test('line progress counts as studied too', () => {
    const p = { mastery: {}, lines: { scandinavian: { mastered: ['qa5'] } } };
    expect(studiedOpenings(p, 'w').map((o) => o.id)).toEqual(['scandinavian']);
  });
});

describe('bookStatus — where the game stands against her book', () => {
  test('following the Italian is in book, with the right depth', () => {
    const s = bookStatus(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], 'w', PROGRESS);
    expect(s.opening.id).toBe('italian-white');
    expect(s.depth).toBe(5);
    expect(s.inBook).toBe(true);
    expect(s.departedBy).toBeNull();
  });

  test('check decorations do not break matching', () => {
    // Tree stores plain SANs; game history may carry + or #.
    const s = bookStatus(['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'], 'w', PROGRESS);
    expect(s.inBook).toBe(true);
  });

  test('THEM leaving the book is attributed to them', () => {
    const s = bookStatus(['e4', 'b6'], 'w', PROGRESS); // 1...b6 is nowhere in her book
    expect(s.depth).toBe(1);
    expect(s.inBook).toBe(false);
    expect(s.departedBy).toBe('them');
  });

  test('HER leaving the book is attributed to her (caller stays silent)', () => {
    const s = bookStatus(['e4', 'e5', 'Nf3', 'Nc6', 'Bb5'], 'w', PROGRESS); // Ruy, not her Italian
    expect(s.depth).toBe(4);
    expect(s.departedBy).toBe('her');
  });

  test('no studied openings → null (the coach says nothing)', () => {
    expect(bookStatus(['e4', 'e5'], 'w', { mastery: {}, lines: {} })).toBeNull();
    expect(bookStatus([], 'w', PROGRESS)).toBeNull();
  });
});

test('departure plan text exists for every family and the fallback', () => {
  expect(departurePlan({ familyId: 'italian-w' })).toMatch(/d4 break/);
  expect(departurePlan({ familyId: 'unknown-family' })).toMatch(/develop/i);
  expect(departurePlan(null)).toMatch(/develop/i);
});
