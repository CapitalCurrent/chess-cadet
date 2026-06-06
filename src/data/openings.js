// Opening curriculum as a VARIATION TREE. Each node is one ply (half-move) in
// Standard Algebraic Notation, with a kid-voiced `note` (its "why") and an
// optional `coach` tip. `children` are the possible NEXT plies:
//   • 1 child   = a forced line (just keep going)
//   • >1 child  = a real BRANCH. At an OPPONENT ply this is a decision point —
//                 she learns the right answer to EACH reply (e.g. ...Bc5 vs ...Nf6).
//
// Depth = number of plies played. Even depth = White to move, odd = Black.
// `student` marks which side SHE plays; the other side auto-plays (or, at a
// branch, she picks the line to explore in Learn / the engine picks at random
// in Drill).

// Build a forced line from a flat array of plies. `tail` becomes the children
// of the LAST ply — pass branch heads there to fork the tree. Returns an array
// of root nodes (usually length 1) so it can be spliced as `children`.
function chain(plies, tail = []) {
  let children = tail;
  for (let i = plies.length - 1; i >= 0; i--) {
    children = [{ ...plies[i], children }];
  }
  return children;
}

// ── The Italian Game (she plays White) ───────────────────────────────────────
// After 1.e4 e5 2.Nf3 Nc6 3.Bc4, Black chooses. Two lines to learn:
//   A) ...Bc5  → answer c3   (Giuoco Piano)
//   B) ...Nf6  → answer d3   (Two Knights move order, kept calm)

// Shared post-castling development plan. Both branches transpose to the same
// position after 6...O-O, so one continuation teaches the development ideas once.
const develop = chain([
  { san: 'Re1', note: 'Rook lifts to e1, lining up behind your e4 pawn on the e-file.',
    coach: 'After castling, wake up your rooks! A rook loves an open or half-open file.' },
  { san: 'Re8', note: 'Black copies you — rook to e8.' },
  { san: 'Nbd2', note: 'Start the knight’s journey: the sleepy b1-knight goes to d2, heading for f1 then g3.',
    coach: 'The classic Italian plan: re-route the b1-knight d2 → f1 → g3, closer to Black’s king.' },
  { san: 'a6', note: 'Black makes a little room and grabs queenside space.' },
  { san: 'Nf1', note: 'Knight reroutes to f1 — next stop, g3.' },
  { san: 'Ba7', note: 'Black tucks the bishop back to a7 — safe, and still eyeing your king.' },
  { san: 'Ng3', note: 'The knight arrives! Ng3 eyes the f5 and h5 squares near the enemy king.',
    coach: 'Now your knight is an attacker, not a spectator — that’s the payoff of the re-route.' },
  { san: 'Be6', note: 'Black develops the last bishop to e6.' },
  { san: 'Bb3', note: 'Slide your Italian bishop to b3 — out of trades, still aiming at f7.',
    coach: 'Keep your strong bishop! Bb3 dodges the trade and stays pointed at f7.' },
  { san: 'Qd7', note: 'Black connects the rooks and tidies up.' },
  { san: 'h3', note: 'A little fresh air for your king — and it stops any annoying ...Bg4 pin.',
    coach: 'Every piece is out, king safe, rooks connected — a finished, healthy setup. Next idea: the d4 break!' },
]);

const bc5Line = chain([
  { san: 'Bc5', note: "Black's bishop mirrors yours, aiming at your f2. This is the Giuoco Piano — the “Quiet Game.”" },
  { san: 'c3',  note: 'A little ramp so you can push d4 and build a big pawn center later.',
    coach: 'c3 is your reply to ...Bc5 — it prepares the big pawn push d4. (Against ...Nf6 you’d pick d3 instead.)' },
  { san: 'Nf6', note: 'Black develops a knight and pokes your e4 pawn. Stay calm — e4 is fine for now.' },
  { san: 'd3',  note: 'Hold up your e4 pawn and open a window for your other bishop. This calm setup is the Giuoco Pianissimo — “Very Quiet Game.”' },
  { san: 'd6',  note: 'Black props up e5 and frees their bishop too.' },
  { san: 'O-O', note: 'Castle! Tuck your king into the corner and wake up your rook.' },
  { san: 'O-O', note: 'Black castles too. Both kings are safe — now bring out the rest of your army!' },
], develop);

const nf6Line = chain([
  { san: 'Nf6', note: 'Black skips the bishop and jumps the knight out, poking your e4 pawn. This is the Two Knights move order.' },
  { san: 'd3',  note: 'Answer ...Nf6 with calm d3 — defend e4 and open a window for your bishop. No tricky stuff needed.',
    coach: 'Your rule: ...Bc5 → c3, but ...Nf6 → d3. Different first move from Black, different prep from you!' },
  { san: 'Bc5', note: 'Now Black’s bishop comes out to mirror yours — we slide into the same quiet Italian.' },
  { san: 'c3',  note: 'Add your ramp for a future d4 push, just like the other line.' },
  { san: 'd6',  note: 'Black supports e5 and frees their bishop.' },
  { san: 'O-O', note: 'Castle to safety and wake up your rook.' },
  { san: 'O-O', note: 'Black castles too. Both kings safe — time to develop the rest of your pieces!' },
], develop);

// A third common reply to 3.Bc4: the solid Hungarian (…Be7).
const be7Line = chain([
  { san: 'Be7', note: 'The Hungarian Defense — Black plays it safe, tucking the bishop to e7 instead of the active c5.' },
  { san: 'd3',  note: 'Black isn’t fighting for the center, so just build calmly.',
    coach: 'No ...Bc5 to meet, so you could even grab the full center with d4 — but calm d3, develop, castle is easy and good.' },
  { san: 'Nf6', note: 'Black develops the knight.' },
  { san: 'O-O', note: 'Castle early and safely.' },
  { san: 'O-O', note: 'Black castles too.' },
  { san: 'Nc3', note: 'Bring out the last knight, guarding e4.' },
  { san: 'd6',  note: 'Black makes room and supports e5.' },
  { san: 'Re1', note: 'Rook to e1 behind the e-pawn — a calm, healthy Italian.',
    coach: 'A quiet, solid setup. From here look for the d4 break when you’re ready.' },
]);

// Frequency weights so Drill throws the common replies more often than rare ones.
bc5Line[0].freq = 3;
nf6Line[0].freq = 3;
be7Line[0].freq = 1;

// After 1.e4 e5 2.Nf3 Black usually plays 2…Nc6 (Italian), but 2…d6 (the
// Philidor) is common at club level — meet it by striking the center with 3.d4.
const nc6Main = chain(
  [
    { san: 'Nc6', note: 'Black develops a knight to defend e5.' },
    { san: 'Bc4', note: 'The Italian bishop! It points right at f7 — the square only the king guards.',
      coach: 'Now Black picks a plan. If Black mirrors with ...Bc5 → answer c3. If Black jumps the knight ...Nf6 → answer d3. Watch which one comes!' },
  ],
  [...bc5Line, ...nf6Line, ...be7Line] // Bc4's children = the three common replies
);

const philidor = chain([
  { san: 'd6',  note: 'The Philidor Defense — Black guards e5 with a pawn instead of a knight. A bit passive.' },
  { san: 'd4',  note: 'Strike the center! Challenge e5 right away while Black is cramped.',
    coach: 'Against the Philidor (...d6), the strong reply is d4 — open the center against Black’s passive setup.' },
  { san: 'Nf6', note: 'Black develops the knight and eyes your e4 pawn.' },
  { san: 'Nc3', note: 'Develop and guard your e4 pawn.' },
  { san: 'Nbd7', note: 'Black brings the other knight toward the center (the Hanham setup).' },
  { san: 'Bc4', note: 'Your Italian bishop again — pointed at f7.' },
  { san: 'Be7', note: 'Black tucks the bishop and prepares to castle.' },
  { san: 'O-O', note: 'Castle — you have more space and easier development.',
    coach: 'More space, easy pieces, a safe king — a comfortable edge against the Philidor.' },
  { san: 'O-O', note: 'Black castles too. You’re comfortably better.' },
]);

nc6Main[0].freq = 4; // 2…Nc6 is far more common than the Philidor
philidor[0].freq = 1;

const italianWhiteTree = chain(
  [
    { san: 'e4',  note: 'King pawn forward two! It grabs the center and frees your bishop and queen.' },
    { san: 'e5',  note: 'Black copies you and fights for the center too.' },
    { san: 'Nf3', note: 'Knight jumps out and attacks the black e5 pawn. Watch Black’s reply.' },
  ],
  [...nc6Main, ...philidor] // Nf3's children = 2…Nc6 (Italian) or 2…d6 (Philidor)
);

// ── Black's Mirror, 1...e5 (she plays Black) — linear for now ─────────────────
const italianBlackTree = chain([
  { san: 'e4',  note: 'White opens with the king pawn.' },
  { san: 'e5',  note: 'Answer in the center — claim your half of the board.' },
  { san: 'Nf3', note: 'White develops a knight and eyes your e5 pawn.' },
  { san: 'Nc6', note: 'Develop your knight to guard the e5 pawn.' },
  { san: 'Bc4', note: 'White aims a bishop at your f7.' },
  { san: 'Bc5', note: 'Your Italian bishop, aiming back at White’s f2 weak spot.' },
  { san: 'c3',  note: 'White builds a ramp for a future d4 push.' },
  { san: 'Nf6', note: 'Develop your knight and pressure White’s e4 pawn.' },
  { san: 'd3',  note: 'White supports e4 and frees a bishop.' },
  { san: 'd6',  note: 'Support your e5 pawn and free your light bishop.' },
  { san: 'O-O', note: 'White castles into the corner.' },
  { san: 'O-O', note: 'Castle your king to safety. Both sides are happy and developed!' },
]);

// ── Fried Liver Attack (she plays White) — a TRAP + model tactical line ───────
// 1.e4 e5 2.Nf3 Nc6 3.Bc4 Nf6 4.Ng5 d5 5.exd5, then Black chooses:
//   • ...Nxd5?? (TRAP) → 6.Nxf7! the Fried Liver sacrifice, raging attack
//   • ...Na5!   (correct defense) → a fair game
// `trap: true` flags the blunder so the trainer labels it in Learn and the
// opponent only falls for it occasionally in Drill.

const friedTrap = chain([
  { san: 'Nxd5', trap: true, label: '…Nxd5?? — grabs the pawn (the trap!)',
    note: 'Black greedily recaptures the pawn — but this walks straight into the Fried Liver!' },
  { san: 'Nxf7', note: 'SACRIFICE! Nxf7 forks the queen and rook and tears open the king.',
    coach: 'The Fried Liver sac: give up the knight to drag the king out into the open where you can hunt it.' },
  { san: 'Kxf7', note: 'Black has to take back — the king is dragged out to f7.' },
  { san: 'Qf3+', note: 'Check! The queen leaps to f3 — hitting the king AND the stranded d5 knight.',
    coach: 'Double duty: check the king and pile onto the d5 knight at the same time.' },
  { san: 'Ke6', note: 'The king must step up to defend the knight — right into the storm.' },
  { san: 'Nc3', note: 'Pile on! Develop with tempo, hitting d5 again. White has a raging attack for the piece.',
    coach: 'Black’s king is stuck in the open and your pieces keep coming. That’s why ...Nxd5 is a mistake!' },
]);

const friedDefense = chain([
  { san: 'Na5', label: '…Na5! — the cool defense',
    note: 'The smart move! Black ignores the pawn, kicks your bishop, and keeps the king safe.' },
  { san: 'Bb5+', note: 'Check — and your bishop slides to safety with tempo.' },
  { san: 'c6', note: 'Black blocks the check and hits your bishop and the d5 pawn.' },
  { san: 'dxc6', note: 'Grab the pawn while you can.' },
  { san: 'bxc6', note: 'Black recaptures, opening the b-file.' },
  { san: 'Be2', note: 'Tuck the bishop back. Black gave a pawn for activity — a fair fight.',
    coach: 'No Fried Liver today — ...Na5 is the antidote. Worth knowing for when YOU are Black, too!' },
]);

const friedLiverTree = chain(
  [
    { san: 'e4',  note: 'King pawn out — grab the center and free your pieces.' },
    { san: 'e5',  note: 'Black answers in the center.' },
    { san: 'Nf3', note: 'Attack the black e5 pawn.' },
    { san: 'Nc6', note: 'Black defends e5.' },
    { san: 'Bc4', note: 'Aim the bishop at f7 — the square only the king guards.' },
    { san: 'Nf6', note: 'Black develops the knight and pokes your e4 pawn — this lets you attack!' },
    { san: 'Ng5', note: 'Pounce! The knight jumps to g5 so your knight AND bishop both hit f7.',
      coach: 'Ng5 is the aggressive try — two attackers on f7. Black has to defend very carefully.' },
    { san: 'd5',  note: 'Black blocks the bishop and strikes back in the center — the right idea.' },
    { san: 'exd5', note: 'Take the pawn. Now Black faces a big choice…',
      coach: 'Black can greedily grab back with the knight (the famous mistake!) or play the calm ...Na5. Watch which comes.' },
  ],
  [...friedTrap, ...friedDefense]
);

// ── Scandinavian Defense (she plays White) — when Black answers 1.e4 with 1…d5 ──
// The same friendly development as the Italian (Bc4, Nf3, Nc3), but you grab the
// pawn and chase the early queen for free tempo.
// After 3.Nc3 the queen must move. Three common retreats — same White plan each
// time (d4, Nf3, Bc4, castle), so she learns one setup against all of them.
const scQa5 = chain([
  { san: 'Qa5', note: 'The queen slides to a5 — the most popular square, but still a little exposed.' },
  { san: 'd4',  note: 'Build a big pawn center while you’re ahead in development.',
    coach: 'You’re developing faster, so grab the center with d4 and keep rolling.' },
  { san: 'Nf6', note: 'Black develops a knight toward the center.' },
  { san: 'Nf3', note: 'Another piece out, eyeing the center.' },
  { san: 'c6',  note: 'Black makes a safe house for the queen and props up the centre.' },
  { san: 'Bc4', note: 'Your Italian bishop again — aim it at f7!',
    coach: 'Notice your setup looks just like the Italian — Bc4, Nf3, Nc3. Same friendly pieces!' },
  { san: 'Bf5', note: 'Black develops the bishop before shutting it in with …e6.' },
  { san: 'Bd2', note: 'Develop your last minor piece and tidy up behind the knight.' },
  { san: 'e6',  note: 'Black tucks in the pawn and prepares to finish developing.' },
  { san: 'O-O', note: 'Castle to safety. You’re ahead with a big center — a great Scandinavian!',
    coach: 'Pawn won early, faster development, king safe — that’s why taking on d5 is so strong.' },
]);

const scQd6 = chain([
  { san: 'Qd6', note: 'The modern retreat — the queen sits on d6, flexible and harder to chase than a5.' },
  { san: 'd4',  note: 'Grab the big center while you lead in development.' },
  { san: 'Nf6', note: 'Black develops a knight.' },
  { san: 'Nf3', note: 'Develop and eye the center.' },
  { san: 'a6',  note: 'Black makes luft and stops your pieces from jumping to b5.' },
  { san: 'Bc4', note: 'The Italian bishop again — pointed at f7.',
    coach: 'Same plan as always: d4, Nf3, Bc4, then castle. Your setup barely changes!' },
  { san: 'e6',  note: 'Black opens a path to develop the dark bishop.' },
  { san: 'O-O', note: 'Castle. A healthy, easy Scandinavian — you’re ahead in development.' },
]);

const scQd8 = chain([
  { san: 'Qd8', note: 'The queen retreats all the way home — safe, but very passive. You’re way ahead now!' },
  { san: 'd4',  note: 'Seize the full center — Black has wasted time.',
    coach: 'When Black plays the passive ...Qd8, punish it by grabbing space and developing fast.' },
  { san: 'Nf6', note: 'Black tries to catch up in development.' },
  { san: 'Nf3', note: 'Another piece out.' },
  { san: 'Bf5', note: 'Black develops the bishop.' },
  { san: 'Bc4', note: 'Aim at f7 — your usual strong bishop.' },
  { san: 'e6',  note: 'Black prepares to finish developing.' },
  { san: 'O-O', note: 'Castle. Big center, faster development — a great position for White.' },
]);

scQa5[0].freq = 3;
scQd6[0].freq = 3;
scQd8[0].freq = 1;

const scandinavianTree = chain(
  [
    { san: 'e4',  note: 'King pawn out — grab the center.' },
    { san: 'd5',  note: 'Black tries the Scandinavian — striking at your e4 pawn right away.' },
    { san: 'exd5', note: 'Just take it! Win the pawn and open lines.',
      coach: 'When Black plays 1…d5, the simplest strong answer is to capture: 2.exd5.' },
    { san: 'Qxd5', note: 'Black grabs the pawn back with the queen — but now the queen is out far too early.' },
    { san: 'Nc3', note: 'Develop AND attack the queen — a free move (tempo)! Now watch where the queen runs.',
      coach: 'The point of 3.Nc3: develop while kicking the queen. She’ll go to a5, d6, or all the way home to d8 — your plan stays the same: d4, Nf3, Bc4, castle.' },
  ],
  [...scQa5, ...scQd6, ...scQd8]
);

// ── Sicilian Defense (she plays White) — when Black answers 1.e4 with 1…c5 ─────
// The Alapin (2.c3): low-theory and sound, and it echoes the Scandinavian —
// take on d5, the queen comes out early, and you build a big center with d4.
const sicilianTree = chain([
  { san: 'e4',  note: 'King pawn out — grab the center.' },
  { san: 'c5',  note: 'The Sicilian Defense — Black fights for the center from the side instead of copying you.' },
  { san: 'c3',  note: 'A new plan! Prepare d4 to build a big center against the Sicilian.',
    coach: 'The Sicilian needs a different idea than the Italian. The simple, strong Alapin: 2.c3, getting ready to play d4.' },
  { san: 'd5',  note: 'Black hits back in the center right away.' },
  { san: 'exd5', note: 'Take the pawn.' },
  { san: 'Qxd5', note: 'Black recaptures with the queen — out early, just like the Scandinavian!' },
  { san: 'd4',  note: 'Build your big pawn center.',
    coach: 'Same idea as the Scandinavian: you took the pawn, the queen came out, now grab the center with d4.' },
  { san: 'Nc6', note: 'Black develops, eyeing your d4 pawn.' },
  { san: 'Nf3', note: 'Develop and defend d4.' },
  { san: 'Bg4', note: 'Black pins your knight to the queen.' },
  { san: 'Be2', note: 'Quietly break the pin — your bishop slips behind the knight.',
    coach: 'Be2 un-pins your knight and gets you ready to castle.' },
  { san: 'e6',  note: 'Black opens a path for the dark bishop.' },
  { san: 'O-O', note: 'Castle — a healthy big-center game against the Sicilian, no scary theory needed!',
    coach: 'Big center, pieces out, king safe — and you didn’t have to memorize deep Sicilian lines.' },
]);

// Unified White 1.e4 repertoire: after 1.e4, BLACK chooses the defense and she
// must respond correctly WITHOUT being told which opening it is. Reuses the
// individual opening subtrees (shared, read-only nodes). In Drill the opponent
// randomly throws …e5 or …d5 and she figures out the right plan; in Learn she
// picks which defense to study. The canonical calm Italian is used for …e5 (the
// aggressive Fried Liver stays its own course).
const whiteE4Tree = [
  {
    san: 'e4',
    note: 'Your one-and-only first move as White! Now watch Black — their reply decides which opening you’re in.',
    coach: 'You ALWAYS start 1.e4. If Black plays …e5 → Italian setup. If …d5 → take the pawn and play the Scandinavian. Read Black’s move and choose!',
    children: [
      // Spread so we can tag which opening each reply leads into, without
      // mutating the shared subtrees (their deeper children are reused as-is).
      { ...italianWhiteTree[0].children[0], opening: 'Italian Game', freq: 4 }, // 1…e5 (most common)
      { ...scandinavianTree[0].children[0], opening: 'Scandinavian', freq: 2 }, // 1…d5
      { ...sicilianTree[0].children[0], opening: 'Sicilian', freq: 3 }, // 1…c5
    ],
  },
];

// Openings are grouped by SIDE (♔ White / ♚ Black), then FAMILY (the opening,
// e.g. Italian / Scandinavian / Mixed), then VARIATION (e.g. Main line / Fried
// Liver). The menu is Side → Opening → Variation.
export const OPENINGS = [
  {
    id: 'italian-white',
    familyId: 'italian-w',
    family: 'Italian',
    variation: 'Main line',
    name: 'The Italian Game',
    student: 'w', // she plays White
    icon: '⚔️',
    blurb:
      "White's friendly opening. Pawn to the center, knights and bishops out, then castle. Aim the bishop at f7!",
    tree: italianWhiteTree,
  },
  {
    id: 'fried-liver',
    familyId: 'italian-w',
    family: 'Italian',
    variation: 'Fried Liver',
    name: 'Fried Liver Attack',
    student: 'w', // she plays White
    icon: '🍳',
    blurb:
      'The spicy Italian! Set a trap on f7 — if Black grabs the pawn, sacrifice your knight and hunt the king. Learn the attack AND the correct defense.',
    tree: friedLiverTree,
  },
  {
    id: 'scandinavian',
    familyId: 'scandi',
    family: 'Scandinavian',
    variation: 'Main line',
    name: 'Scandinavian Defense',
    student: 'w', // she plays White
    icon: '❄️',
    blurb:
      'Black answered 1.e4 with 1…d5? Take the pawn, chase the queen with your knight for a free move, build a big center, and castle — easy and strong.',
    tree: scandinavianTree,
  },
  {
    id: 'sicilian-alapin',
    familyId: 'sicilian',
    family: 'Sicilian',
    variation: 'Alapin',
    name: 'Sicilian Defense (Alapin)',
    student: 'w', // she plays White
    icon: '🌋',
    blurb:
      'Black plays 1…c5 (the Sicilian)? Don’t panic — play c3, then take and build a big center with d4. Same idea as the Scandinavian, and no scary theory.',
    tree: sicilianTree,
  },
  {
    id: 'white-e4',
    familyId: 'white-mix',
    family: 'Mixed',
    variation: 'All defenses',
    name: 'White (1.e4) — Mixed',
    student: 'w', // she plays White
    icon: '🎲',
    blurb:
      'You always play 1.e4 — but Black decides the rest! They might answer …e5 (Italian) or …d5 (Scandinavian). Figure out the right plan from what Black plays. Best in Drill!',
    tree: whiteE4Tree,
  },
  {
    id: 'italian-black',
    familyId: 'black',
    family: 'Black',
    variation: '1…e5 Mirror',
    name: "Black's Mirror (1...e5)",
    student: 'b', // she plays Black
    icon: '🛡️',
    blurb:
      'The same Italian ideas — but as Black! Match White in the center, develop, and castle. One opening, both colors.',
    tree: italianBlackTree,
  },
];

// Families in first-seen order, for the menu's family row.
export function getFamilies() {
  const fams = [];
  for (const o of OPENINGS) {
    if (!fams.some((f) => f.id === o.familyId)) fams.push({ id: o.familyId, label: o.family, icon: o.icon });
  }
  return fams;
}

// Variations belonging to a family (the third menu row), in array order.
export function variationsOf(familyId) {
  return OPENINGS.filter((o) => o.familyId === familyId);
}

// Sides she can practice (the first menu row), in first-seen order.
export function getSides() {
  const ids = [];
  for (const o of OPENINGS) if (!ids.includes(o.student)) ids.push(o.student);
  return ids.map((id) =>
    id === 'w'
      ? { id: 'w', label: 'White (1.e4)', icon: '♔' }
      : { id: 'b', label: 'Black (1…e5)', icon: '♚' }
  );
}

// Families (openings) belonging to a side (the second menu row), in array order.
export function familiesOf(side) {
  const fams = [];
  for (const o of OPENINGS) {
    if (o.student !== side) continue;
    if (!fams.some((f) => f.id === o.familyId)) fams.push({ id: o.familyId, label: o.family, icon: o.icon });
  }
  return fams;
}

export function getOpening(id) {
  return OPENINGS.find((o) => o.id === id) || OPENINGS[0];
}

// Whose move is it at this ply depth? Even = White.
export function moverAt(depth) {
  return depth % 2 === 0 ? 'w' : 'b';
}

// Does this opening contain any branch (decision point)? Drives "try the other
// line" copy on completion.
export function hasBranches(opening) {
  const walk = (nodes) =>
    nodes.some((n) => (n.children.length > 1 ? true : walk(n.children)));
  return walk(opening.tree);
}
