// Checkmate School content. Mate-in-1 packs are curated FENs (White to move,
// at least one mating move — verified by checkmates.test.js, so a bad position
// can't ship). Endgame stages are play-it-out drills vs the engine from a set
// position; the win condition is delivering mate yourself.

export const MATE_PACKS = [
  {
    id: 'ladders',
    icon: '♕',
    name: 'Queen & Rook Mates',
    blurb: 'The bread-and-butter mates every player must know.',
    positions: [
      { id: 'backrank-rook', fen: '6k1/5ppp/8/8/8/8/8/R3K3 w - - 0 1', name: 'Back-rank mate' },
      { id: 'two-rook-ladder', fen: '7k/R7/1R6/8/8/8/8/4K3 w - - 0 1', name: 'Two-rook ladder' },
      { id: 'rook-king', fen: '4k3/R7/4K3/8/8/8/8/8 w - - 0 1', name: 'Rook + king mate' },
      { id: 'queen-king', fen: '4k3/8/4K3/8/8/8/8/7Q w - - 0 1', name: 'Queen + king mate' },
      { id: 'queen-corner', fen: '5k2/8/5K2/8/8/8/8/7Q w - - 0 1', name: 'Queen edge mate' },
      { id: 'pawn-mate', fen: 'k7/p1K5/1P6/8/8/8/8/8 w - - 0 1', name: 'Pawn mate!' },
    ],
  },
  {
    id: 'tricky',
    icon: '🤺',
    name: 'Tricky Mates',
    blurb: 'Sneaky patterns — smothered, Arabian & friends.',
    positions: [
      { id: 'queen-kiss', fen: '7k/8/5K2/8/8/8/8/6Q1 w - - 0 1', name: 'The queen kiss' },
      { id: 'smothered', fen: '6rk/6pp/8/6N1/8/8/8/4K3 w - - 0 1', name: 'Smothered mate' },
      { id: 'arabian', fen: '7k/R5p1/5N2/8/8/8/8/K7 w - - 0 1', name: 'Arabian mate' },
      { id: 'battery', fen: '6k1/5p1p/8/8/8/8/1B6/4K1Q1 w - - 0 1', name: 'Bishop battery' },
      { id: 'epaulette', fen: '3rkr2/8/8/8/8/8/4Q3/4K3 w - - 0 1', name: 'Epaulette mate' },
      { id: 'corner-kiss', fen: '7k/5K2/8/8/8/8/1Q6/8 w - - 0 1', name: 'Corner kiss' },
    ],
  },
];

export const ENDGAME_STAGES = [
  {
    id: 'kq',
    icon: '👑',
    name: 'Queen Mate',
    blurb: 'King + Queen vs King — drive the king to the edge and finish.',
    fen: '4k3/8/8/8/8/8/8/Q3K3 w - - 0 1',
    plan: 'Use the queen to shrink the king’s box (stay a knight’s-move away so there’s no stalemate), walk YOUR king up to help, then mate on the edge.',
  },
  {
    id: 'kr',
    icon: '🏰',
    name: 'Rook Mate',
    blurb: 'King + Rook vs King — the box method.',
    fen: '4k3/8/8/8/8/8/8/R3K3 w - - 0 1',
    plan: 'The rook fences the king into a shrinking box. Bring your king face-to-face with theirs, then check on the edge — that’s mate.',
  },
];

export function getPack(id) {
  return MATE_PACKS.find((p) => p.id === id) || null;
}

export function getEndgame(id) {
  return ENDGAME_STAGES.find((s) => s.id === id) || null;
}
