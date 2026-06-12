// Adversarial suite for the principles coach. Every test here encodes a KNOWN
// way rule-based chess advice goes wrong — these are the bad-advice traps the
// guards exist for. If a rule change breaks one of these, the coach has
// started lying to a 7-year-old; treat failures as ship-blockers.
import { Chess } from 'chess.js';
import { hangingPieces, confirmedHang, earlyQueenIssue, explainWarn, samePieceNudge, castleNudge } from './principles';

function play(sans) {
  const g = new Chess();
  const states = [];
  for (const san of sans) {
    states.push(g.fen());
    g.move(san);
  }
  return {
    history: g.history({ verbose: true }),
    beforeFen: states[states.length - 1], // position before the final move
    afterFen: g.fen(),
    move: g.history({ verbose: true })[sans.length - 1],
  };
}

describe('hanging-piece detection (static + engine-confirmed)', () => {
  // Her queen on d5, black Nf6 attacks it, nothing defends it.
  const Q_HANGS = '4k3/8/5n2/3Q4/8/8/8/4K3 b - - 0 5';

  test('undefended queen attacked by a knight is statically flagged', () => {
    const hangs = hangingPieces(Q_HANGS, 'w');
    expect(hangs.map((h) => h.square)).toContain('d5');
  });

  test('the hang only SPEAKS when the engine reply actually captures it', () => {
    expect(confirmedHang(Q_HANGS, 'w', 'f6d5')).toBeTruthy();
    expect(confirmedHang(Q_HANGS, 'w', 'e8d8')).toBeNull(); // engine went elsewhere → stay silent
  });

  test('TRAP: pinned attacker — static sees danger, confirm gate keeps us honest', () => {
    // Black Nf6 "attacks" the d5 rook but is absolutely pinned by Bh4 to Ke7.
    const PINNED = '8/4k3/5n2/3R4/7B/8/8/4K3 b - - 0 10';
    expect(hangingPieces(PINNED, 'w').map((h) => h.square)).toContain('d5'); // static is fooled…
    expect(confirmedHang(PINNED, 'w', 'e7d6')).toBeNull(); // …the engine reply gate is not
  });

  test('adequately defended piece attacked by an equal piece is NOT flagged', () => {
    // White Be4 defended by d3 pawn, attacked only by Bb7 (equal value).
    const DEFENDED = '4k3/1b6/8/8/4B3/3P4/8/4K3 b - - 0 8';
    expect(hangingPieces(DEFENDED, 'w')).toHaveLength(0);
  });

  test('pawns and kings are never nagged about', () => {
    // White pawn e4 attacked by d5 pawn — normal chess, not a lecture.
    const PAWN = 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2';
    expect(hangingPieces(PAWN, 'w')).toHaveLength(0);
  });
});

describe('early queen — the Scandinavian trap', () => {
  test('TRAP: Qxd5 in the Scandinavian is a CAPTURE — never lectured', () => {
    const { afterFen, move } = play(['e4', 'd5', 'exd5', 'Qxd5']);
    expect(earlyQueenIssue({ afterFen, move, herColor: 'b' })).toBeNull();
  });

  test('TRAP: Qa5 retreat (taught line) — queen not chaseable on a5, silent', () => {
    const { afterFen, move } = play(['e4', 'd5', 'exd5', 'Qxd5', 'Nc3', 'Qa5']);
    expect(earlyQueenIssue({ afterFen, move, herColor: 'b' })).toBeNull();
  });

  test('TRAP: 2.Qh5 (Scholar attempt) — h5 is not attacked, so no lecture', () => {
    const { afterFen, move } = play(['e4', 'e5', 'Qh5']);
    expect(earlyQueenIssue({ afterFen, move, herColor: 'w' })).toBeNull();
  });

  test('queen wandering onto an attacked square early DOES get the concept', () => {
    const { afterFen, move } = play(['e4', 'd5', 'Qg4']); // Bc8 attacks g4
    expect(earlyQueenIssue({ afterFen, move, herColor: 'w' })).toMatch(/queen came out early/i);
  });

  test('same wander late in the game is not an "opening" lecture', () => {
    const { afterFen, move } = play(['e4', 'd5', 'Qg4']);
    const lateFen = afterFen.replace(/ \d+$/, ' 20');
    expect(earlyQueenIssue({ afterFen: lateFen, move, herColor: 'w' })).toBeNull();
  });

  test('explainWarn prefers the verified hang over the queen concept', () => {
    const { afterFen, move } = play(['e4', 'd5', 'Qg4']);
    const why = explainWarn({ afterFen, move, herColor: 'w', replyUci: 'c8g4' });
    expect(why).toMatch(/can be taken/i);
  });
});

describe('same-piece-twice nudge', () => {
  test('fires on a real wander: 1.Nf3 d5 2.Ng5 with everyone else asleep', () => {
    const { history, beforeFen } = play(['Nf3', 'd5', 'Ng5']);
    expect(samePieceNudge({ history, beforeFen, herColor: 'w' })).toMatch(/asleep/i);
  });

  test('TRAP: a piece that was ATTACKED had to move — silent', () => {
    // 1.Nc3 d5 2.e3 d4 attacks the knight; 3.Ne4 is a forced retreat.
    const { history, beforeFen } = play(['Nc3', 'd5', 'e3', 'd4', 'Ne4']);
    expect(samePieceNudge({ history, beforeFen, herColor: 'w' })).toBeNull();
  });

  test('TRAP: captures are jobs, not wandering — 2.Nxe5 is silent', () => {
    const { history, beforeFen } = play(['Nf3', 'e5', 'Nxe5']);
    expect(samePieceNudge({ history, beforeFen, herColor: 'w' })).toBeNull();
  });

  test('first move of a piece never fires', () => {
    const { history, beforeFen } = play(['Nf3', 'd5']);
    // last move is black's; evaluate for white's Nf3 by passing white history only
    const w = play(['Nf3']);
    expect(samePieceNudge({ history: w.history, beforeFen: w.beforeFen, herColor: 'w' })).toBeNull();
    expect(history).toBeTruthy(); // (lint appeasement)
  });

  test('past move 8 the opening rules stop applying', () => {
    const sans = ['Nf3', 'a6', 'd4', 'b6', 'e4', 'c6', 'Be2', 'd6', 'c4', 'e6', 'b4', 'f6', 'a4', 'g6', 'Bd2', 'h6', 'Ne5'];
    const { history, beforeFen } = play(sans);
    expect(samePieceNudge({ history, beforeFen, herColor: 'w' })).toBeNull();
  });

  test('with every minor developed there is nothing to nag about', () => {
    const sans = ['d4', 'd5', 'Nf3', 'e6', 'Bf4', 'a6', 'e3', 'b6', 'Bd3', 'c6', 'Nc3', 'h6', 'Ng5'];
    const { history, beforeFen } = play(sans);
    expect(samePieceNudge({ history, beforeFen, herColor: 'w' })).toBeNull();
  });
});

describe('castle nudge', () => {
  const at = (fen) => castleNudge({ fen, herColor: 'w' });

  test('fires at move 10+ with rights intact and the enemy queen aboard', () => {
    expect(at('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 11')).toMatch(/castle/i);
  });

  test('TRAP: queens off — a central king is GOOD in endgames, silent', () => {
    expect(at('rnb1kbnr/pppppppp/8/8/8/8/PPPPPPPP/RNB1KBNR b KQkq - 0 11')).toBeNull();
  });

  test('rights gone (already castled or king moved) — nothing to say', () => {
    expect(at('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b kq - 0 11')).toBeNull();
  });

  test('too early — opening still developing, no nagging at move 5', () => {
    expect(at('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR b KQkq - 0 5')).toBeNull();
  });
});
