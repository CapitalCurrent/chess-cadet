// Endgame School content — the technique ladder from "finish the game" to the
// two rook-endgame positions every improving player must know. Each stage is a
// LESSON (walkthrough + concept + plan) plus a play-it-out DRILL vs the
// full-strength engine.
//
// Stage goals differ — and that's the curriculum: winning technique (mate /
// promote) AND defensive technique (hold the DRAW) are both real skills.
// endgameCourse.test.js ship-gates every position: legal, White to move, and
// the technique's PRECONDITIONS hold — so a theoretically-wrong drill can't
// ship.
//
// WALKTHROUGH RULES (enforced by walkthroughCheck.js in the tests): steps are
// a REAL game — consecutive steps must be the same position (annotation-only)
// or reachable by at most two legal half-moves (the arrowed move + the reply).
// A deliberate cut must carry `newScene: true` and gets a "📷 New position"
// chip in the UI. No teleporting pieces between steps, ever.
//
// Coverage note: these are the K+piece endings with a technique that works
// EVERY time. K+B+N vs K is deliberately excluded (master-level, almost never
// occurs); lone B or N cannot mate at all. K+Q and K+R basic mates live in
// Checkmate School — the menu points there.

export const ENDGAME_COURSE = [
  {
    id: 'ladder',
    icon: '🪜',
    tier: 'Finish the game',
    level: 'Basic',
    name: 'Two-Rook Ladder',
    blurb: 'Walk the king down, rank by rank.',
    goal: 'mate',
    // Rooks on DIFFERENT files (a1+b2) so the ladder never blocks itself, and
    // a central king so the drill actually climbs. The walkthrough below is
    // literally the first moves of this drill.
    fen: '8/8/8/4k3/8/8/1R6/R3K3 w - - 0 1',
    concept:
      'Two rooks mate WITHOUT the king: one rook cuts a rank, the other checks — then they swap jobs, walking the enemy king to the edge like climbing a ladder.',
    plan: 'Check on one rank, cut off the next with the other rook. If the king attacks a rook, slide it far away along the rank — it still does its job from any distance.',
    winText: '🏆 The ladder works every time — rank by rank, no king needed!',
    walkthrough: [
      { fen: '8/8/8/4k3/8/8/1R6/R3K3 w - - 0 1', circles: ['e5'], caption: 'A lone king in the open. Your two rooks will walk him to the edge, rank by rank — like climbing a ladder. Your own king can rest.' },
      { fen: '8/8/8/4k3/8/8/1R6/R3K3 w - - 0 1', arrows: [{ from: 'b2', to: 'b4' }], caption: 'Rb4 builds the FENCE — rank 4 is now a wall the king can never cross.' },
      { fen: '8/8/8/3k4/1R6/8/8/R3K3 w - - 0 1', arrows: [{ from: 'a1', to: 'a5' }], caption: 'The other rook CHECKS on rank 5 — the king must retreat behind the fence, up to rank 6.' },
      { fen: '8/8/3k4/R7/1R6/8/8/4K3 w - - 0 1', arrows: [{ from: 'b4', to: 'b6' }], caption: 'Now they swap jobs: the fence rook becomes the checker. Rb6+ — up another rank he goes.' },
      { fen: '8/3k4/1R6/R7/8/8/8/4K3 w - - 0 1', arrows: [{ from: 'a5', to: 'a7' }], caption: 'Ra7+ drives him to the very last rank. (If he ever attacks a rook, slide it far away along its rank — it fences from any distance.)' },
      { fen: '3k4/R7/1R6/8/8/8/8/4K3 w - - 0 1', arrows: [{ from: 'b6', to: 'b8' }], caption: 'Rb8 — CHECKMATE. Fence, check, swap jobs. That is the whole ladder.' },
    ],
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
    walkthrough: [
      { fen: '1k6/8/8/7p/8/4K3/8/8 w - - 0 1', circles: ['h5', 'h1'], caption: 'The pawn wants to RUN — h4, h3, h2, h1 and it becomes a queen. Can your king catch it in time?' },
      { fen: '1k6/8/8/7p/8/4K3/8/8 w - - 0 1', circles: ['h5', 'd5', 'd1', 'h1'], caption: "Draw the pawn's SQUARE: from the pawn to its promotion square, then the same distance sideways. Those are the four corners." },
      { fen: '1k6/8/8/7p/8/4K3/8/8 w - - 0 1', circles: ['e3'], caption: 'Your king stands INSIDE the square — so he catches the pawn. Every single time. No counting needed.' },
      { fen: '1k6/8/8/7p/8/4K3/8/8 w - - 0 1', arrows: [{ from: 'e3', to: 'f4' }], caption: 'Chase DIAGONALLY — a diagonal step gains ground forward AND sideways at once. Kf4!' },
      { fen: '1k6/8/8/8/5K1p/8/8/8 w - - 0 1', arrows: [{ from: 'f4', to: 'g4' }], caption: 'They ran — you cut the corner. Kg4 touches the pawn; next move it falls, and with it every dream of a queen. Draw!' },
    ],
  },
  {
    id: 'opposition',
    icon: '👀',
    tier: 'Pawn endings',
    level: 'Intermediate',
    name: 'The Opposition',
    blurb: 'Win the staring contest, win the game.',
    goal: 'promote',
    fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1',
    concept:
      'When kings face off with one square between them, whoever must MOVE has to give way — that is the OPPOSITION, the staring contest of pawn endings. Your secret weapon: the pawn has spare steps that pass the turn back to them.',
    plan: "Use a pawn step (e3!) to hand them the move — they must step aside. Then slip your king forward on the OTHER side and take the stare again. Reach the 6th rank in front of the pawn and you've already won (King Leads the Pawn!).",
    winText: '👑 You won the staring contest — and the game. Opposition + spare pawn steps beat the defense every time.',
    walkthrough: [
      { fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1', circles: ['e4', 'e6'], caption: 'The staring contest: kings face to face, one square between. Whoever must MOVE has to give way. Right now it is YOUR move…' },
      { fen: '8/8/4k3/8/4K3/8/4P3/8 w - - 0 1', arrows: [{ from: 'e2', to: 'e3' }], caption: "…so use the secret weapon: the pawn's spare step. e3 changes nothing on the board — except now THEY must move. You stole the stare!" },
      { fen: '8/8/3k4/8/4K3/4P3/8/8 w - - 0 1', arrows: [{ from: 'e4', to: 'f5' }], caption: 'They stepped aside — slip forward on the OTHER side. Kf5 gains a whole rank.' },
      { fen: '8/4k3/8/5K2/8/4P3/8/8 w - - 0 1', arrows: [{ from: 'f5', to: 'e5' }], caption: 'Face them again and win the next stare too. Repeat until your king rules the 6th rank in front of the pawn — and that is the win you already know: King Leads the Pawn.' },
    ],
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
    plan: "Use your king to shoulder their king away from the pawn's path. Only push the pawn when their king can't get in front of it — and after every pawn step, put your king back in front. Careful — don't stalemate!",
    winText: '👑 Promoted! King leads, pawn follows — from here it becomes the Queen Mate you already know.',
    walkthrough: [
      { fen: '4k3/8/4K3/8/4P3/8/8/8 w - - 0 1', circles: ['e6'], caption: 'The king on the 6th, IN FRONT of his own pawn. From this picture the win can never be stopped — the king clears the road, the pawn walks it.' },
      { fen: '4k3/8/4K3/8/4P3/8/8/8 w - - 0 1', arrows: [{ from: 'e6', to: 'd6' }, { from: 'e6', to: 'f6' }], caption: 'The king is the bodyguard: he shoulders the enemy king off the road — left or right, whichever way they lean. Here: Kd6.' },
      { fen: '3k4/8/3K4/8/4P3/8/8/8 w - - 0 1', arrows: [{ from: 'e4', to: 'e5' }], caption: 'Their king pushed aside — NOW the pawn takes one step. King first, pawn second. Always in that order.' },
      { fen: '4k3/8/3K4/4P3/8/8/8/8 w - - 0 1', arrows: [{ from: 'd6', to: 'e6' }], caption: 'The golden habit: the king steps BACK IN FRONT of his pawn. Never let the pawn lead the parade — that is how stalemates happen.' },
      { fen: '3k4/8/4K3/4P3/8/8/8/8 w - - 0 1', arrows: [{ from: 'e6', to: 'f7' }], caption: 'The outflank: Kf7 grabs the promotion square itself. Now e6, e7, e8 — nothing on the board can stop the pawn.' },
    ],
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
    walkthrough: [
      { fen: '8/8/8/8/6kp/8/8/6K1 w - - 0 1', circles: ['g1', 'h1', 'g2', 'h2'], caption: 'Your fortress: these four squares. Reach the corner in front of a ROOK-pawn and no force in chess can dig you out. Start with Kh1.' },
      { fen: '8/8/8/8/6k1/7p/8/7K w - - 0 1', arrows: [{ from: 'h1', to: 'g1' }], caption: 'They push… you shuffle. Kg1, Kh1, Kg1 — you are not running away, you are standing guard. There is no way in.' },
      { fen: '8/8/8/8/8/6kp/8/6K1 w - - 0 1', arrows: [{ from: 'g1', to: 'h1' }], caption: 'Their king arrives, angry and useless. Back to the corner — and now watch what happens if they dare push…' },
      { fen: '8/8/8/8/8/6k1/7p/7K w - - 0 1', circles: ['h1'], caption: 'Pawn to h2 — and YOU have no moves and no check. STALEMATE. Their own pawn ruined everything. Draw held!' },
    ],
  },
  {
    id: 'two-bishops',
    icon: '⛪',
    tier: 'Advanced finishes',
    level: 'Advanced',
    name: 'Two-Bishop Mate',
    blurb: 'A moving wall of diagonals.',
    goal: 'mate',
    fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1',
    concept:
      'Two bishops together own BOTH colors — side by side they sweep two parallel diagonals, a fence with no holes. Shrink the fence, bring your king, and push the enemy king into any corner.',
    plan: "Line the bishops up on neighboring diagonals to build the wall. Your king must help — walk him up to guard the corner door. Shrink the box slowly, and watch for stalemate near the end.",
    winText: '⛪ Corner, sealed, mate! The two bishops — a wall the king can never step through.',
    walkthrough: [
      { fen: '8/8/8/4k3/8/8/8/2B1KB2 w - - 0 1', circles: ['c1', 'f1'], caption: 'Two bishops TOGETHER can mate: one owns the dark squares, one the light. Alone, neither can — as a pair they cover everything.' },
      { fen: '8/8/4k3/8/8/8/1B6/1B2K3 w - - 0 1', newScene: true, arrows: [{ from: 'b2', to: 'f6' }, { from: 'b1', to: 'g6' }], caption: 'Side by side they sweep two PARALLEL diagonals — a fence with no gaps. The king can never step through it, only backwards.' },
      { fen: '6k1/8/2B5/2B5/8/8/8/4K3 w - - 0 1', newScene: true, arrows: [{ from: 'e1', to: 'd2' }], caption: "The bishops alone can't finish — your king must march up to guard the corner door while the fence shrinks, square by square." },
      { fen: '7k/8/4B1K1/4B3/8/8/8/8 b - - 0 1', newScene: true, circles: ['h8'], caption: 'The finish: one bishop fires down the long diagonal, the other seals the escape square, your king guards the rest. Corner = mate.' },
    ],
  },
  {
    id: 'q-vs-pawn',
    icon: '💃',
    tier: 'Advanced finishes',
    level: 'Advanced',
    name: 'Queen vs the 7th-Rank Pawn',
    blurb: 'The zigzag dance that stops promotion.',
    goal: 'mate',
    fen: '7Q/8/K7/8/8/8/3pk3/8 w - - 0 1',
    concept:
      'Their pawn is ONE step from queening and your king is far away — but the queen wins alone with a dance: zigzag closer with checks, and force their king to stand IN FRONT of its own pawn. Each freeze buys your king one step.',
    plan: 'Check and poke until their king must block its own pawn — frozen! That free move brings your king one step closer. Repeat the dance until your king arrives, win the pawn, then mate like always. (Fun fact: against a rook-pawn or bishop-pawn this is a draw — stalemate tricks!)',
    winText: '💃 The zigzag dance! Freeze the king in front of its pawn, sneak your king in, and the pawn falls.',
    walkthrough: [
      { fen: '7Q/8/K7/8/8/8/3pk3/8 w - - 0 1', circles: ['d2', 'd1'], caption: 'Their pawn is one step from a new queen and your king is miles away. The queen must win this alone — with a dance.' },
      { fen: '7Q/8/K7/8/8/8/3pk3/8 w - - 0 1', arrows: [{ from: 'h8', to: 'e5' }], caption: 'Qe5+ — the zigzag begins. Every queen move gives check or covers d1. They never get one free moment to promote.' },
      { fen: '7Q/8/K7/8/8/8/3p4/3k4 w - - 0 1', newScene: true, circles: ['d1'], arrows: [{ from: 'a6', to: 'b5' }], caption: 'Fast-forward a few checks: their king has been herded IN FRONT of its own pawn — frozen! Nothing can move… so YOUR king steps closer. Free of charge.' },
      { fen: '7Q/8/8/1K6/8/8/3pk3/8 w - - 0 1', arrows: [{ from: 'h8', to: 'e5' }], caption: 'They wriggle out — no problem: check again, herd them back to d1, take another king-step. Check, freeze, step — until your king arrives and the pawn falls.' },
    ],
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
      "Your pawn is one step from queening, but your own king is stuck in front of it and their rook waits to check forever. The trick: check their king away, build a BRIDGE on the 4th rank, walk your king out — and block the final check with the rook.",
    plan: 'Rd1+ pushes their king away. Then Rd4 — the bridge. King steps out, walks down through the checks toward the bridge, and the rook blocks the last one. The pawn queens.',
    winText: '🌉 The bridge! Lucena wins every rook endgame like this — pawn on the 7th, king in front, bridge on the 4th.',
    walkthrough: [
      { fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1', circles: ['b8', 'b7'], caption: 'One step from queening — but your own king blocks the promotion square, and their rook waits to check him forever. Time for the most famous trick in rook endgames.' },
      { fen: '1K6/1P1k4/8/8/8/8/r7/2R5 w - - 0 1', arrows: [{ from: 'c1', to: 'd1' }], caption: 'First: Rd1+ pushes their king one more file away from the pawn. Distance now means peace later.' },
      { fen: '1K6/1P2k3/8/8/8/8/r7/3R4 w - - 0 1', arrows: [{ from: 'd1', to: 'd4' }], caption: 'Now the famous move: rook to the FOURTH rank. It looks strange — it is the bridge you will hide behind in four moves.' },
      { fen: '1K6/1P2k3/8/8/3R4/8/8/r7 w - - 0 1', arrows: [{ from: 'b8', to: 'c7' }], caption: 'The king steps out of the doorway. Here come the checks from behind…' },
      { fen: '8/1P2k3/8/1K6/3R4/8/8/1r6 w - - 0 1', newScene: true, arrows: [{ from: 'd4', to: 'b4' }], caption: 'Check — step down. Check — step down. Each check walks your king CLOSER to the bridge. One final check on b1… and now: Rb4!' },
      { fen: '8/1P2k3/8/1K6/1R6/8/8/1r6 b - - 0 1', circles: ['b4'], caption: 'THE BRIDGE: the rook blocks the last check, protected by the king. No more checks — the pawn queens. (If they trade rooks instead? Even easier — you know King Leads the Pawn.)' },
    ],
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
    walkthrough: [
      { fen: '8/8/8/8/3kp3/8/8/R3K3 w - - 0 1', circles: ['a3', 'c3', 'e3', 'g3'], caption: 'Down a pawn — but there is a WALL that saves you. Rank 3 is the line their king must never be allowed to cross.' },
      { fen: '8/8/8/8/3kp3/8/8/R3K3 w - - 0 1', arrows: [{ from: 'a1', to: 'a3' }], caption: 'Rook to the third! While it patrols this rank, their king cannot lead the pawn forward. Now you wait — calmly.' },
      { fen: '8/8/8/8/3k4/R3p3/8/4K3 w - - 0 1', arrows: [{ from: 'a3', to: 'a8' }], caption: 'The moment the pawn steps onto YOUR rank, the wall has done its job — the rook sprints far away, behind their king…' },
      { fen: 'R7/8/8/8/8/3kp3/8/4K3 w - - 0 1', arrows: [{ from: 'a8', to: 'd8' }], caption: '…and checks forever. Rd8+ — step in front of the pawn? Check again. Hide beside it? Still check. Their king has no shelter anywhere. DRAW.' },
    ],
  },
];

export function getEndgameStage(id) {
  return ENDGAME_COURSE.find((s) => s.id === id) || null;
}
