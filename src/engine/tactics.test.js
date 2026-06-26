// Fork detection — the bad-advice trap. A "fork" must be a move that actually
// WINS material; an alignment where neither attacked piece can be profitably
// taken is NOT a fork. These pin the rule so the coach can't tell a learner
// they "missed a fork" when there's nothing to win.
import { detectMotifs } from './tactics';

// detectMotifs reads the board AFTER the move; fromSquare only matters for the
// discovered-attack check, so '' is fine for fork cases.
const forks = (fen, to) => detectMotifs(fen, '', to).includes('fork');
const pins = (fen, to) => detectMotifs(fen, '', to).includes('pin');
const discovers = (fen, from, to) => detectMotifs(fen, from, to).includes('discovered');

describe('fork detection requires a winnable target', () => {
  test('TRAP: queen attacking two DEFENDED bishops is NOT a fork', () => {
    // Wc7 queen eyes Bc8 (defended by Ra8) and Be7 (defended by Ke8). The queen
    // outvalues a bishop, so neither can be taken — no material to win.
    expect(forks('r1b1k3/2Q1b3/8/8/8/8/8/4K3 b - - 0 1', 'c7')).toBe(false);
  });

  test('queen forking two UNDEFENDED bishops IS a fork', () => {
    // Same queen, but no Ra8 and the king is far on h8 — both bishops hang.
    expect(forks('2b4k/2Q1b3/8/8/8/8/8/4K3 b - - 0 1', 'c7')).toBe(true);
  });

  test('knight forking king + rook IS a fork (rook worth more than knight)', () => {
    // Nf7 hits Kh8 and Rd8.
    expect(forks('3r3k/5N2/8/8/8/8/8/4K3 b - - 0 1', 'f7')).toBe(true);
  });

  test('knight forking two DEFENDED equal minors is NOT a winning fork', () => {
    // Ne5 hits Bc6 (defended by b7 pawn) and Bg6 (defended by f7 pawn). Knight
    // for bishop is a trade, not a win → no fork.
    expect(forks('4k3/1p3p2/2b3b1/4N3/8/8/8/4K3 b - - 0 1', 'e5')).toBe(false);
  });

  test('knight forking two UNDEFENDED minors IS a fork (free grab)', () => {
    expect(forks('4k3/8/2b3b1/4N3/8/8/8/4K3 b - - 0 1', 'e5')).toBe(true);
  });

  test('a single attacked piece is never a fork', () => {
    expect(forks('2b1k3/2Q5/8/8/8/8/8/4K3 b - - 0 1', 'c7')).toBe(false);
  });
});

describe('pin detection requires a winnable pinned piece', () => {
  test('TRAP: a positional pin of a DEFENDED knight wins nothing → not a pin', () => {
    // Bb5 pins Nc6 to Ke8 (a4–e8 diagonal). The knight is defended by the b7
    // pawn, so taking it is only an even bishop-for-knight trade (SEE 0) — a
    // Ruy-Lopez-style positional pin that wins no material. Must NOT be named.
    expect(pins('4k3/1p6/2n5/1B6/8/8/8/4K3 b - - 0 1', 'b5')).toBe(false);
  });

  test('a pin of a LOOSE (undefended) piece IS a pin — it wins it', () => {
    // Same pin, but the b7 pawn is gone: Nc6 is pinned to the king AND
    // undefended, so the bishop wins it outright (SEE +300).
    expect(pins('4k3/8/2n5/1B6/8/8/8/4K3 b - - 0 1', 'b5')).toBe(true);
  });

  test('a pin against an EQUAL piece (no bigger piece behind) is not a pin', () => {
    // Bb5 lines Nc6 up with a knight on d7 (equal value, not the king) — no
    // pin geometry at all. Guards the detector's "bigger behind" requirement.
    expect(pins('4k3/3n4/2n5/1B6/8/8/8/4K3 b - - 0 1', 'b5')).toBe(false);
  });
});

describe('discovered-attack detection requires winnable material', () => {
  test('discovered CHECK (revealed rook hits the king) IS a discovery', () => {
    // The knight on c5 just came from e4, unveiling Re1 down the e-file onto
    // Ke8. A discovered check is forcing — the essence of the motif.
    expect(discovers('4k3/8/8/2N5/8/8/8/4R1K1 b - - 0 1', 'e4', 'c5')).toBe(true);
  });

  test('TRAP: revealed bishop hits a DEFENDED knight (wins nothing) → no discovery', () => {
    // Nf3 came from d4, unveiling Bb2 down the long diagonal onto Nf6 — but f6
    // is defended by the e7 and g7 pawns (SEE 0), so the discovery wins no
    // material. Geometry alone must not name it.
    expect(discovers('6k1/4p1p1/5n2/8/8/5N2/1B6/6K1 b - - 0 1', 'd4', 'f3')).toBe(false);
  });

  test('revealed bishop wins a LOOSE rook IS a discovery', () => {
    // Same shape, but the unveiled Bb2 hits an undefended rook on f6 (SEE +500).
    expect(discovers('6k1/8/5r2/8/8/5N2/1B6/6K1 b - - 0 1', 'd4', 'f3')).toBe(true);
  });
});
