// Tactics School content — curated motif packs. Every position is verified by
// tacticsPacks.test.js using the SAME winnability-gated detectors the live
// coach trusts (a fork here is a REAL fork by SEE, a pin really wins, a
// back-rank mate really mates) — a bad position can't ship.
//
// Solving is VALIDATOR-based, not answer-key-based: any move that achieves the
// pack's motif counts (mirrors Checkmate School accepting any mate). The
// authored `uci` is the hint-ladder answer.
import { newGame } from '../engine/chessEngine';
import { motifsOfMove } from '../engine/tactics';
import { pinnedDefenderWin } from '../engine/pins';
import { allSkewers } from '../engine/skewers';
import { backRankMate } from '../engine/backRank';

export const TACTICS_PACKS = [
  {
    id: 'forks',
    icon: '✦',
    name: 'Forks',
    blurb: 'One move, two targets.',
    concept: 'A fork attacks TWO things at once. They can only save one — you win the other!',
    findPrompt: 'Find the FORK — one move that attacks two targets.',
    wrongHint: 'Does that attack two things at once? Look for a move that hits TWO targets.',
    walkthrough: [
      { fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', circles: ['e8', 'a8'], caption: 'TWO targets — the king and the rook. No single move of theirs can save both… if one move of YOURS attacks both.' },
      { fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', arrows: [{ from: 'b5', to: 'c7' }], caption: 'The knight hop: Nc7+ touches BOTH at once. Check to the king, attack on the rook. That is a fork.' },
      { fen: 'r7/2N2k2/8/8/8/8/8/4K3 w - - 0 1', arrows: [{ from: 'c7', to: 'a8' }], caption: 'A check MUST be answered — the king steps away, and the rook is yours. One move, two targets: they only save one.' },
    ],
    positions: [
      { id: 'fork-knight-royal', fen: 'r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1', uci: 'b5c7', name: 'Knight fork: king & rook', why: 'Check! The king must move — then you take the rook.' },
      { id: 'fork-pawn-knights', fen: '4k3/8/2n1n3/8/3P4/8/8/4K3 w - - 0 1', uci: 'd4d5', name: 'Pawn fork: two knights', why: 'The little pawn attacks BOTH knights — one of them is yours.' },
      { id: 'fork-queen-rook', fen: 'r5k1/8/8/8/8/8/8/3Q2K1 w - - 0 1', uci: 'd1d5', name: 'Queen fork: check & rook', why: 'Qd5+ hits the king AND the loose rook in the corner.' },
      { id: 'fork-knight-f7', fen: '3r3k/8/7N/8/8/8/8/7K w - - 0 1', uci: 'h6f7', name: 'Knight fork on f7', why: 'The famous knight jump — king and rook at once.' },
      { id: 'fork-pawn-pieces', fen: '4k3/8/1r1n4/8/2P5/8/8/4K3 w - - 0 1', uci: 'c4c5', name: 'Pawn fork: rook & knight', why: 'Pawns are the best forkers — they cost the least!' },
      { id: 'fork-knight-queen', fen: '6k1/8/2q5/3N4/8/8/8/4K3 w - - 0 1', uci: 'd5e7', name: 'Royal fork: king & queen', why: 'Ne7+ — the king must step away, and the queen falls.' },
    ],
  },
  {
    id: 'pins',
    icon: '📌',
    name: 'Pins',
    blurb: 'Freeze a piece — then punish it.',
    concept: "A pinned piece can't move (or can't do its job). Take what it was guarding, or pile on!",
    findPrompt: 'Use (or make) a PIN to win material.',
    wrongHint: 'Is one of their pieces frozen in front of the king? What was it guarding?',
    walkthrough: [
      { fen: '4k3/8/2p5/3b4/B7/8/8/3R3K w - - 0 1', arrows: [{ from: 'a4', to: 'e8' }], caption: "Follow the bishop's ray: through the c6 pawn, straight to the king. That pawn is PINNED — if it ever moves, its king is exposed. Frozen solid." },
      { fen: '4k3/8/2p5/3b4/B7/8/8/3R3K w - - 0 1', circles: ['d5', 'c6'], caption: 'The frozen pawn "guards" the bishop on d5 — but a pinned guard is NO guard at all. The bishop is actually free for the taking.' },
      { fen: '4k3/8/2p5/3b4/B7/8/8/3R3K w - - 0 1', arrows: [{ from: 'd1', to: 'd5' }], caption: 'Rxd5! The pawn cannot take back — moving it would expose the king to the bishop, and that is against the rules.' },
      { fen: '4k3/8/2p5/3R4/B7/8/8/7K b - - 0 1', arrows: [{ from: 'c6', to: 'd5' }], circles: ['e8'], caption: 'See it from their side: c6xd5 is simply not allowed. A whole bishop, won because the defender was pinned.' },
    ],
    positions: [
      { id: 'pin-pawn-cant-take', fen: '4k3/8/2p5/3b4/B7/8/8/3R3K w - - 0 1', uci: 'd1d5', name: "The defender can't take back", why: 'The c6 pawn is pinned to the king — so the bishop it "guards" is free!' },
      { id: 'pin-make-win', fen: '4k3/8/8/4n3/8/2B5/8/R4K2 w - - 0 1', uci: 'a1e1', name: 'Pin it to the king', why: 'Re1 freezes the knight — it cannot run, and you attack it twice.' },
      { id: 'pin-guarded-pawn', fen: 'r3k3/8/2n5/1B2p3/8/5N2/8/4K3 w - - 0 1', uci: 'f3e5', name: 'Take what the pinned piece guards', why: 'The c6 knight is pinned — the pawn it guards is actually FREE.' },
      { id: 'pin-queen-to-king', fen: '6k1/8/8/3q4/8/1P6/4B3/4K3 w - - 0 1', uci: 'e2c4', name: 'Pin the queen', why: "Bc4 pins the queen to the king — she can't leave the line, and she falls." },
    ],
  },
  {
    id: 'skewers',
    icon: '🍢',
    name: 'Skewers',
    blurb: 'The big piece moves — take what hides behind.',
    concept: 'A skewer is a pin turned around: the BIG piece is in front and must move — then you take the piece behind it.',
    findPrompt: 'Find the SKEWER — attack through the big piece.',
    wrongHint: 'Give a check in a straight LINE — what is hiding behind the king?',
    walkthrough: [
      { fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1', circles: ['e5', 'e8'], caption: 'King in FRONT, queen hiding BEHIND on the same line. A pin turned around — this is the skewer.' },
      { fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1', arrows: [{ from: 'a1', to: 'e1' }], caption: 'Re1+ — check straight THROUGH the king. He cannot stay to shield her; a king must always answer check.' },
      { fen: '4q3/8/8/3k4/8/8/8/4R1K1 w - - 0 1', arrows: [{ from: 'e1', to: 'e8' }], caption: 'He steps aside — and Rxe8 wins the queen that was hiding behind him. Big piece in front, prize in the back.' },
    ],
    positions: [
      { id: 'skewer-rook-queen', fen: '4q3/8/8/4k3/8/8/8/R5K1 w - - 0 1', uci: 'a1e1', name: 'Skewer the queen', why: 'Re1+ — the king must step aside, and the queen behind him falls.' },
      { id: 'skewer-bishop-queen', fen: 'q7/8/8/3k4/8/8/8/3BK3 w - - 0 1', uci: 'd1f3', name: 'Diagonal skewer', why: 'Bf3+ — check along the long diagonal, straight through to the queen.' },
      { id: 'skewer-rook-rook', fen: '3r4/8/8/3k4/8/8/8/R5K1 w - - 0 1', uci: 'a1d1', name: 'Skewer on the file', why: 'Rd1+ — the king blocks his own rook. He moves, you take it.' },
      { id: 'skewer-queen-rook', fen: '7r/8/5k2/8/8/7Q/8/4K3 w - - 0 1', uci: 'h3c3', name: 'Queen skewer', why: 'Qc3+ lines up king and rook — the rook in the corner is lost.' },
    ],
  },
  {
    id: 'backrank',
    icon: '🚪',
    name: 'Back-Rank Mates',
    blurb: 'The king trapped behind its own pawns.',
    concept: "A king stuck behind its own pawn wall can be mated on the back rank. (And remember — YOUR king needs an escape square too!)",
    findPrompt: 'Deliver the BACK-RANK MATE.',
    wrongHint: 'Checkmate always starts with a check — try every check on their back rank!',
    walkthrough: [
      { fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', circles: ['f7', 'g7', 'h7'], caption: 'Those three pawns protect the king — and imprison him. Behind that wall he has NO escape squares at all.' },
      { fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', arrows: [{ from: 'a1', to: 'a8' }], caption: 'So a single check along the back rank is CHECKMATE. Ra8# — nowhere to run.' },
      { fen: 'R5k1/5ppp/8/8/8/8/8/4K3 b - - 0 1', circles: ['g8'], caption: 'Remember BOTH sides of this pattern: hunt their weak back rank — and give YOUR OWN king a window (a little pawn step like h3) before it happens to you.' },
    ],
    positions: [
      { id: 'br-classic', fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', uci: 'a1a8', name: 'The classic', why: 'The pawns that protect the king become his prison.' },
      { id: 'br-queen', fen: '6k1/5ppp/8/8/8/8/8/3Q2K1 w - - 0 1', uci: 'd1d8', name: 'Queen to the eighth', why: 'The queen does everything a rook does — and more.' },
      { id: 'br-offset-king', fen: '5k2/4ppp1/8/8/8/8/8/2R1K3 w - - 0 1', uci: 'c1c8', name: 'Same trick, new spot', why: 'It works anywhere on the rank — spot the pawn wall.' },
      { id: 'br-capture', fen: 'r5k1/5ppp/8/8/8/8/8/R5K1 w - - 0 1', uci: 'a1a8', name: 'Capture into mate', why: 'Their rook "guards" the rank — but nothing guards the rook!' },
      { id: 'br-single-rook', fen: '6k1/5ppp/8/8/8/8/8/1R4K1 w - - 0 1', uci: 'b1b8', name: 'Any heavy piece will do', why: 'Rook or queen — the pattern is the same.' },
      { id: 'br-queen-side', fen: '5k2/4ppp1/8/8/8/8/8/3Q2K1 w - - 0 1', uci: 'd1d8', name: 'Queen finds the rank', why: 'Look at their back rank EVERY move — is it defended?' },
    ],
  },
];

export function getTacticsPack(id) {
  return TACTICS_PACKS.find((p) => p.id === id) || null;
}

// Did `uci` from `fen` achieve this pack's MOTIF? Validator-based solving —
// any genuine fork/pin/skewer/back-rank mate counts, exactly like Checkmate
// School accepts any mating move. PURE (no engine), so it's fully testable
// and works offline. Returns false for illegal/garbage moves.
export function achievesMotif(packId, fen, uci) {
  let g;
  let m;
  try {
    g = newGame(fen);
    m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || 'q' });
  } catch {
    return false;
  }
  if (!m) return false;
  const afterFen = g.fen();
  if (packId === 'forks') return motifsOfMove(fen, uci).includes('fork');
  if (packId === 'pins') return motifsOfMove(fen, uci).includes('pin') || !!pinnedDefenderWin(fen, uci);
  if (packId === 'skewers') return allSkewers(afterFen, m.color).length > 0;
  if (packId === 'backrank') return backRankMate(afterFen);
  return false;
}
