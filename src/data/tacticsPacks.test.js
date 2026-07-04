// Tactics School content validation — the ship-gate for every curated
// position. Each one must be a legal position, White to move, with an
// authored solution that the pack's own winnability-gated validator confirms
// (a "fork" that SEE says wins nothing would fail here, same bar as the live
// coach). Skewer positions must not have the skewer BEFORE the move (the move
// must create it), and back-rank positions must actually be mate-in-1.
import { newGame } from '../engine/chessEngine';
import { TACTICS_PACKS, achievesMotif } from './tacticsPacks';
import { allSkewers } from '../engine/skewers';
import { walkthroughProblems } from './walkthroughCheck';

describe('every tactics position is legal, White to move, with a working solution', () => {
  for (const pack of TACTICS_PACKS) {
    describe(`pack: ${pack.name}`, () => {
      for (const pos of pack.positions) {
        test(`${pos.id} — solution ${pos.uci} achieves the ${pack.id} motif`, () => {
          // Legal position, White to move (course convention).
          const g = newGame(pos.fen);
          expect(g.turn()).toBe('w');
          expect(g.isCheckmate()).toBe(false);
          expect(g.isStalemate()).toBe(false);
          // The authored solution is a legal move…
          const m = g.move({ from: pos.uci.slice(0, 2), to: pos.uci.slice(2, 4), promotion: pos.uci[4] || 'q' });
          expect(m).toBeTruthy();
          // …and it genuinely achieves the motif by the validator.
          expect(achievesMotif(pack.id, pos.fen, pos.uci)).toBe(true);
        });
      }
    });
  }
});

describe('skewer positions: the MOVE creates the skewer (none pre-exists)', () => {
  const pack = TACTICS_PACKS.find((p) => p.id === 'skewers');
  for (const pos of pack.positions) {
    test(`${pos.id} has no skewer before the move`, () => {
      expect(allSkewers(pos.fen, 'w')).toHaveLength(0);
    });
  }
});

describe('back-rank positions really are mate-in-1', () => {
  const pack = TACTICS_PACKS.find((p) => p.id === 'backrank');
  for (const pos of pack.positions) {
    test(`${pos.id} — ${pos.uci} is checkmate`, () => {
      const g = newGame(pos.fen);
      g.move({ from: pos.uci.slice(0, 2), to: pos.uci.slice(2, 4) });
      expect(g.isCheckmate()).toBe(true);
    });
  }
});

describe('pack walkthroughs — real move sequences, never teleports', () => {
  for (const pack of TACTICS_PACKS) {
    test(`${pack.id} walkthrough is valid and continuous`, () => {
      expect(walkthroughProblems(pack.walkthrough)).toEqual([]);
    });
  }
});

describe('validator rejects non-solutions', () => {
  test('a quiet king move is never a fork', () => {
    const pos = TACTICS_PACKS[0].positions[0]; // knight royal fork position
    expect(achievesMotif('forks', pos.fen, 'e1e2')).toBe(false);
  });
  test('garbage input is false, never throws', () => {
    expect(achievesMotif('forks', 'not a fen', 'e2e4')).toBe(false);
    expect(achievesMotif('pins', TACTICS_PACKS[0].positions[0].fen, 'zz')).toBe(false);
  });
  test('unique ids across all packs', () => {
    const ids = TACTICS_PACKS.flatMap((p) => p.positions.map((x) => x.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});
