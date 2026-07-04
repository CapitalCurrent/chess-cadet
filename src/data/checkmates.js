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

// Central enemy king so the drill exercises the WHOLE technique (drive to the
// edge, not just the finish). Walkthroughs follow the real-move continuity
// rules enforced by walkthroughCheck.js.
export const ENDGAME_STAGES = [
  {
    id: 'kq',
    icon: '👑',
    name: 'Queen Mate',
    blurb: 'King + Queen vs King — drive the king to the edge and finish.',
    fen: '8/8/8/3k4/8/8/8/Q3K3 w - - 0 1',
    plan: 'Use the queen to shrink the king’s box (stay a knight’s-move away so there’s no stalemate), walk YOUR king up to help, then mate on the edge.',
    walkthrough: [
      { fen: '8/8/8/3k4/8/8/8/Q3K3 w - - 0 1', circles: ['d5'], caption: 'King + queen vs king: the win is certain — IF you dodge one trap: stalemate. The plan: shrink his box, bring your king, mate on the edge.' },
      { fen: '8/8/8/3k4/8/8/8/Q3K3 w - - 0 1', arrows: [{ from: 'a1', to: 'a5' }], caption: 'Start with a check to push him: Qa5+. He must give ground.' },
      { fen: '8/8/8/Q7/4k3/8/8/4K3 w - - 0 1', arrows: [{ from: 'a5', to: 'c3' }], caption: "Now the magic trick: park the queen a KNIGHT'S move away from their king — Qc3. Not a check, but his box is suddenly tiny, and from knight-distance stalemate is impossible." },
      { fen: '8/8/8/8/5k2/2Q5/8/4K3 w - - 0 1', arrows: [{ from: 'c3', to: 'd3' }], caption: "He steps — you follow, always a knight's move away. The box shrinks all by itself. Never closer (stalemate!), never further." },
      { fen: '1Q4k1/8/6K1/8/8/8/8/8 b - - 0 1', newScene: true, circles: ['g8'], caption: 'Once he is stuck on the edge, march your king up — and finish just like your mate-in-1 pack: the king guards the escapes, the queen delivers. Qb8#.' },
    ],
  },
  {
    id: 'kr',
    icon: '🏰',
    name: 'Rook Mate',
    blurb: 'King + Rook vs King — the box method.',
    fen: '8/8/8/3k4/8/8/8/R3K3 w - - 0 1',
    plan: 'The rook fences the king into a shrinking box. Bring your king face-to-face with theirs, then check on the edge — that’s mate.',
    walkthrough: [
      { fen: '8/8/8/3k4/8/8/8/R3K3 w - - 0 1', circles: ['d5'], caption: 'The BOX method: the rook draws a box around their king, your king walks up, and together they shrink it to the edge.' },
      { fen: '8/8/8/3k4/8/8/8/R3K3 w - - 0 1', arrows: [{ from: 'a1', to: 'a4' }], caption: 'Ra4 — the rook draws the FLOOR. Their king now lives upstairs and can never come back down across rank 4.' },
      { fen: '8/8/8/4k3/R7/8/8/4K3 w - - 0 1', arrows: [{ from: 'e1', to: 'e2' }], caption: "The rook can't shrink the box alone — your KING must help. March him up: Ke2, Kd3… this mate is teamwork." },
      { fen: '8/8/8/3k4/R7/3K4/8/8 w - - 0 1', newScene: true, arrows: [{ from: 'a4', to: 'a5' }], caption: 'The king has arrived. When the kings stand face to face, the rook strikes: Ra5+ — their king must step UP, and the floor rises behind him.' },
      { fen: '4k3/8/4K3/8/8/8/8/R7 w - - 0 1', newScene: true, arrows: [{ from: 'a1', to: 'a8' }], caption: 'Repeat — face off, check, floor up — until the edge: his own position blocks every escape, and Ra8 is MATE. Same finish as your Rook Mate pack.' },
    ],
  },
];

export function getPack(id) {
  return MATE_PACKS.find((p) => p.id === id) || null;
}

export function getEndgame(id) {
  return ENDGAME_STAGES.find((s) => s.id === id) || null;
}
