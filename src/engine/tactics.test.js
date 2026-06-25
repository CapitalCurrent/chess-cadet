// Fork detection — the bad-advice trap. A "fork" must be a move that actually
// WINS material; an alignment where neither attacked piece can be profitably
// taken is NOT a fork. These pin the rule so the coach can't tell a learner
// they "missed a fork" when there's nothing to win.
import { detectMotifs } from './tactics';

// detectMotifs reads the board AFTER the move; fromSquare only matters for the
// discovered-attack check, so '' is fine for fork cases.
const forks = (fen, to) => detectMotifs(fen, '', to).includes('fork');

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
