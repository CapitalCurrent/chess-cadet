// Static Exchange Evaluation — the material-truth primitive. These pin the
// swap-off arithmetic (incl. x-ray reveal and the minor=minor calibration) so
// the coach's "wins material" claims rest on something correct.
import { seeCaptureOn, hangingBy } from './see';

describe('seeCaptureOn — basic captures', () => {
  test('grabbing an UNDEFENDED pawn wins it (+100)', () => {
    // White Qe1 takes black pawn e5; nothing defends e5.
    expect(seeCaptureOn('k7/8/8/4p3/8/8/8/4Q2K w - - 0 1', 'e5', 'w')).toBe(100);
  });

  test('queen taking a pawn DEFENDED by a pawn loses the exchange (-800)', () => {
    // Black pawn e5 defended by d6 pawn. Qxe5?? dxe5 wins the queen.
    expect(seeCaptureOn('k7/8/3p4/4p3/8/8/8/4Q2K w - - 0 1', 'e5', 'w')).toBe(-800);
  });

  test('knight taking a rook defended by a pawn wins the exchange (+200)', () => {
    // Nf4 x Rd5, c6 pawn recaptures: +500 rook − 300 knight.
    expect(seeCaptureOn('k7/8/2p5/3r4/5N2/8/8/7K w - - 0 1', 'd5', 'w')).toBe(200);
  });

  test('minor-for-minor on a defended square is an even trade (0)', () => {
    // Nf4 x Bd5, c6 pawn recaptures: 300 − 300 = 0 (knight=bishop by design).
    expect(seeCaptureOn('k7/8/2p5/3b4/5N2/8/8/7K w - - 0 1', 'd5', 'w')).toBe(0);
  });

  test('empty square / own piece → 0', () => {
    expect(seeCaptureOn('k7/8/8/8/8/8/8/4Q2K w - - 0 1', 'e5', 'w')).toBe(0);
  });

  test('a piece with NO attackers is not capturable → 0', () => {
    // White queen on d1 in the start position — nothing black attacks it.
    expect(seeCaptureOn('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1', 'd1', 'b')).toBe(0);
  });
});

describe('seeCaptureOn — x-ray (battery) reveal', () => {
  test('doubled rooks vs a pawn defended by a rook nets the pawn (+100)', () => {
    // Re2 takes e5 pawn; Re8 recaptures; the e1 rook (x-ray behind e2) recaptures.
    // +100 −500 +500 = +100, and SEE must reveal the e1 rook after e2 moves.
    expect(seeCaptureOn('k3r3/8/8/4p3/8/8/4R3/4R2K w - - 0 1', 'e5', 'w')).toBe(100);
  });
});

describe('hangingBy', () => {
  test('an undefended piece left en prise is hanging', () => {
    // Black bishop d5 attacked by white knight f4, undefended.
    expect(hangingBy('k7/8/8/3b4/5N2/8/8/7K b - - 0 1', 'd5')).toBe(300);
  });

  test('an adequately defended piece is not hanging', () => {
    // Same bishop, now defended by c6 pawn → knight-for-bishop trade, nets 0.
    expect(hangingBy('k7/8/2p5/3b4/5N2/8/8/7K b - - 0 1', 'd5')).toBe(0);
  });
});
