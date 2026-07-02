// Endgame School content — the technique ladder from "finish the game" to the
// two rook-endgame positions every improving player must know. Each stage is a
// LESSON (concept + plan) plus a play-it-out DRILL vs the full-strength engine.
//
// Stage goals differ — and that's the curriculum: winning technique (mate /
// promote) AND defensive technique (hold the DRAW) are both real skills.
// endgameCourse.test.js ship-gates every position: legal, White to move, and
// the technique's PRECONDITIONS hold (the square-rule king really is inside
// the square; the Lucena pawn really is on the 7th with its king on the
// promotion square) — so a theoretically-wrong drill can't ship.
//
// K+Q and K+R basic mates live in Checkmate School — the menu points there.

export const ENDGAME_COURSE = [
  {
    id: 'ladder',
    icon: '🪜',
    tier: 'Finish the game',
    level: 'Basic',
    name: 'Two-Rook Ladder',
    blurb: 'Walk the king down, rank by rank.',
    goal: 'mate',
    fen: '4k3/8/8/8/8/8/R7/R3K3 w - - 0 1',
    concept:
      'Two rooks mate WITHOUT the king: one rook cuts a rank, the other checks — then they swap jobs, walking the enemy king to the edge like climbing a ladder.',
    plan: 'Check on one rank, cut off the next with the other rook. If the king attacks a rook, slide it far away along the rank — it still does its job from any distance.',
    winText: '🏆 The ladder works every time — rank by rank, no king needed!',
  },
  {
    id: 'square-rule',
    icon: '📐',
    tier: 'Pawn endings',
    level: 'Basic',
    name: 'The Square Rule',
    blurb: 'Can your king catch the runaway pawn?',
    goal: 'draw',
    fen: '1k6/8/8/7p/8/4K3/8/8 w - - 0 1',
    concept:
      "Draw a square from the pawn to its promotion corner. If your king can step INSIDE that square, it catches the pawn — no counting needed. Here the enemy king is too far away to help; your king does it alone.",
    plan: 'Chase diagonally — a diagonal king move gains ground sideways AND forward at once. Catch the pawn and the game is a draw.',
    winText: '🛡️ Caught it! The square rule: if the king is in the square, the pawn never escapes.',
  },
  {
    id: 'escort',
    icon: '🤝',
    tier: 'Pawn endings',
    level: 'Intermediate',
    name: 'King Leads the Pawn',
    blurb: 'The king clears the road; the pawn walks it.',
    goal: 'promote',
    fen: '4k3/8/4K3/8/4P3/8/8/8 w - - 0 1',
    concept:
      'One pawn can win the whole game — if the KING leads the way. With your king on the 6th rank IN FRONT of the pawn, promotion cannot be stopped. King first, pawn second.',
    plan: "Use your king to shoulder their king away from the pawn's path. Only push the pawn when their king can't get in front of it. Careful — don't stalemate!",
    winText: '👑 Promoted! King leads, pawn follows — from here it becomes the Queen Mate you already know.',
  },
  {
    id: 'corner-draw',
    icon: '🏰',
    tier: 'Pawn endings',
    level: 'Intermediate',
    name: 'The Corner Fortress',
    blurb: 'The rook-pawn cannot break the corner.',
    goal: 'draw',
    fen: '8/8/8/8/6kp/8/8/6K1 w - - 0 1',
    concept:
      "A rook-pawn (a- or h-file) has a secret weakness: if the defending king reaches the corner in front of it, there is NO way to force it out. The attacker's own pawn causes stalemate!",
    plan: 'Stay glued to g1, g2, h1, h2 and never leave. If they push the pawn to h2 while your king sits on h1 — stalemate, draw. Do nothing, brilliantly.',
    winText: '🏰 Fortress held! Down a pawn, but the corner cannot be broken. Every player must know this draw.',
  },
  {
    id: 'lucena',
    icon: '🌉',
    tier: 'Rook endings',
    level: 'Advanced',
    name: 'Lucena — Build the Bridge',
    blurb: 'The most famous winning position in chess.',
    goal: 'promote',
    fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1',
    concept:
      "Your pawn is one step from queening, but your own king is stuck in front of it and their rook waits to check forever. The trick: build a BRIDGE — put your rook on the 4th rank, walk the king out, and when the checks come, block them with the rook.",
    plan: 'Rook to c4 first (the bridge!). Then bring the king out toward the rook checks — when the checks run out, the rook steps in the way and the pawn queens.',
    winText: '🌉 The bridge! Lucena wins every rook endgame like this — pawn on the 7th, king in front, bridge on the 4th.',
  },
  {
    id: 'philidor',
    icon: '🧱',
    tier: 'Rook endings',
    level: 'Advanced',
    name: 'Philidor — The Drawing Wall',
    blurb: 'Hold the draw a pawn down. Calmly.',
    goal: 'draw',
    fen: '8/8/8/8/3kp3/8/8/R3K3 w - - 0 1',
    concept:
      "Down a pawn in a rook endgame — but it's a DRAW if you know the wall: park your rook on your 3rd rank so their king can never cross. The moment the pawn steps onto that rank, swing your rook far behind them and check forever.",
    plan: 'Rook to a3 and wait — the wall. When the pawn advances to e3, your rook runs to a8 and checks from behind, forever. Their king has no shelter.',
    winText: '🧱 The wall held! Philidor\'s draw — rook on the 3rd until the pawn advances, then endless checks from behind.',
  },
];

export function getEndgameStage(id) {
  return ENDGAME_COURSE.find((s) => s.id === id) || null;
}
