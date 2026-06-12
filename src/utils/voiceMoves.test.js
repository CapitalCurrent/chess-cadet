// Grammar contract for the voice-move parser. Every supported phrasing,
// homophone, and teaching message is pinned here — run with `npm test`.
import { parseVoiceMove, parseVoiceAlternatives } from './voiceMoves';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
// 1.e4 e5 2.Nf3 Nc6 (Italian about to happen — Bc4 available)
const ITALIAN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';
// 1.e4 d5 — exd5 available
const SCANDI = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2';
// Knights on b1 and f3 — both can reach the empty d2 square
const TWO_KNIGHTS = '4k3/8/8/8/8/5N2/8/1N2K3 w - - 0 1';
// White can castle either side
const BOTH_CASTLES = 'r3k2r/pppq1ppp/2npbn2/2b1p3/2B1P3/2NPBN2/PPPQ1PPP/R3K2R w KQkq - 0 8';
// White pawn on e7, e8 empty — promotion available
const PROMO = '7k/4P3/8/8/8/8/8/4K3 w - - 0 1';
// Lone white queen on a1, open board (tests spoken-square homophones)
const QUEEN_A1 = '7k/8/8/8/8/8/8/Q3K3 w - - 0 1';
// Scholar's mate in hand: Qxf7#
const SCHOLAR = 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR w KQkq - 3 3';

const ok = (text, fen) => {
  const r = parseVoiceMove(text, fen);
  expect(r.status).toBe('ok');
  return r;
};

describe('plain moves', () => {
  test('bare square is a pawn move', () => expect(ok('e4', START).san).toBe('e4'));
  test('pawn stated explicitly', () => expect(ok('pawn to d4', START).san).toBe('d4'));
  test('piece + square', () => expect(ok('knight f3', START).san).toBe('Nf3'));
  test('piece + to + square', () => expect(ok('knight to f3', START).san).toBe('Nf3'));
  test('from-to phrasing', () => expect(ok('e2 to e4', START).san).toBe('e4'));
  test('bare square that pawn AND knight could reach stays a pawn move (SAN rule)', () =>
    expect(ok('f3', START).san).toBe('f3'));
});

describe('homophones and ASR quirks', () => {
  test('night → knight, spoken digits', () => expect(ok('night to f three', START).san).toBe('Nf3'));
  test('see → c file', () => expect(ok('bishop see four', ITALIAN).san).toBe('Bc4'));
  test('ate → 8 via spoken square', () => expect(ok('queen a ate', QUEEN_A1).san).toBe('Qa8+'));
  test('"before" fusion → b4', () => expect(ok('before', START).san).toBe('b4'));
  test('of → f file ("knight of three")', () => expect(ok('knight of three', START).san).toBe('Nf3'));
  test('"bee too" → b2', () => expect(ok('queen bee too', QUEEN_A1).san).toBe('Qb2+'));
  test('"b to e4" keeps to as connector', () => {
    // 'b' alone then a destination — b is an origin-file hint, dest e4
    const r = parseVoiceMove('b to e4', START);
    expect(r.status).toBe('no-match'); // no b-file pawn can reach e4 — but parsed as intended
  });
  test('check/mate words are ignored, canonical SAN keeps the #', () =>
    expect(ok('queen takes f7 checkmate', SCHOLAR).san).toBe('Qxf7#'));
});

describe('captures', () => {
  test('piece takes square', () => expect(ok('knight takes e5', ITALIAN).san).toBe('Nxe5'));
  test('bare takes implies pawn', () => expect(ok('takes d5', SCANDI).san).toBe('exd5'));
  test('origin-file capture ("e takes d5")', () => expect(ok('e takes d5', SCANDI).san).toBe('exd5'));
  test('article a before piece is not an origin file', () =>
    expect(ok('a pawn to e4', START).san).toBe('e4'));
  test('saying takes on a quiet move teaches instead of guessing', () => {
    const r = parseVoiceMove('knight takes f3', START);
    expect(r.status).toBe('no-match');
    expect(r.message).toMatch(/nothing to take/i);
  });
});

describe('disambiguation', () => {
  test('two knights both reach d2 → ambiguous with both origins', () => {
    const r = parseVoiceMove('knight to d2', TWO_KNIGHTS);
    expect(r.status).toBe('ambiguous');
    expect(r.candidates.map((c) => c.from).sort()).toEqual(['b1', 'f3']);
    expect(r.message).toMatch(/knight on/i);
  });
  test('origin square resolves it', () =>
    expect(ok('knight on b1 to d2', TWO_KNIGHTS).san).toBe('Nbd2'));
  test('origin square without filler also works', () =>
    expect(ok('knight b1 d2', TWO_KNIGHTS).san).toBe('Nbd2'));
});

describe('castling', () => {
  test('kingside', () => expect(ok('castle kingside', BOTH_CASTLES).san).toBe('O-O'));
  test('queenside', () => expect(ok('castle queenside', BOTH_CASTLES).san).toBe('O-O-O'));
  test('queen side as two words', () => expect(ok('castle queen side', BOTH_CASTLES).san).toBe('O-O-O'));
  test('long castle', () => expect(ok('long castle', BOTH_CASTLES).san).toBe('O-O-O'));
  test('bare castle with both legal asks which', () => {
    const r = parseVoiceMove('castle', BOTH_CASTLES);
    expect(r.status).toBe('ambiguous');
    expect(r.message).toMatch(/kingside.*queenside/i);
  });
  test('bare castle with none legal teaches', () => {
    const r = parseVoiceMove('castle', START);
    expect(r.status).toBe('no-match');
    expect(r.message).toMatch(/can't castle/i);
  });
});

describe('promotion', () => {
  test('default is queen', () => expect(ok('e8', PROMO).san).toBe('e8=Q+'));
  test('named piece after square', () => expect(ok('e8 knight', PROMO).san).toBe('e8=N'));
  test('promote-to phrasing', () => expect(ok('e8 promote to rook', PROMO).san).toBe('e8=R+'));
});

describe('teaching failures', () => {
  test('no square at all', () => {
    const r = parseVoiceMove('knight', START);
    expect(r.status).toBe('no-match');
    expect(r.message).toMatch(/square/i);
  });
  test('bare square only a piece could reach names the piece', () => {
    // h3 is a legal pawn move; use a3? also pawn. From ITALIAN, d5 is reachable
    // by nothing of White's as a pawn move but Nf3 doesn't reach it either…
    // use START "e3"? pawn legal. Pick ITALIAN 'g5': bishop c1 can't (blocked)…
    // From ITALIAN, 'e2' is reachable only by pieces (Be2/Ne2/Qe2/Ke2) — not a pawn.
    const r = parseVoiceMove('e2', ITALIAN);
    expect(r.status).toBe('no-match');
    expect(r.message).toMatch(/name the piece/i);
  });
  test('unreachable square says so', () => {
    const r = parseVoiceMove('f6', START);
    expect(r.status).toBe('no-match');
  });
  test('piece cannot reach', () => {
    const r = parseVoiceMove('bishop to b5', START);
    expect(r.status).toBe('no-match');
    expect(r.message).toMatch(/bishop can't/i);
  });
  test('empty input', () => {
    expect(parseVoiceMove('', START).status).toBe('no-match');
  });
});

describe('alternatives (recognizer n-best list)', () => {
  test('first parseable alternative wins', () => {
    const r = parseVoiceAlternatives(['night of tree', 'knight to f3'], START);
    expect(r.status).toBe('ok');
    expect(r.san).toBe('Nf3');
  });
  test('garbage in every slot fails gracefully', () => {
    const r = parseVoiceAlternatives(['banana', 'sandwich time'], START);
    expect(r.status).toBe('no-match');
  });
  test('empty list fails gracefully', () => {
    expect(parseVoiceAlternatives([], START).status).toBe('no-match');
  });
});
