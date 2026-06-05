// Opening curriculum. Each line is a sequence of plies in Standard Algebraic
// Notation. `student` marks which plies SHE must type; the other side auto-plays.
// Notes are written in a 7-year-old's voice — they double as the move's "why".
//
// Move 0 is White's 1st move. Even index = White, odd index = Black.

export const OPENINGS = [
  {
    id: 'italian-white',
    name: 'The Italian Game',
    student: 'w', // she plays White
    icon: '⚔️',
    blurb:
      "White's friendly opening. Pawn to the center, knights and bishops out, then castle. Aim the bishop at f7!",
    plies: [
      { san: 'e4',  note: 'King pawn forward two! It grabs the center and frees your bishop and queen.' },
      { san: 'e5',  note: 'Black copies you and fights for the center too.' },
      { san: 'Nf3', note: 'Knight jumps out and attacks the black e5 pawn.' },
      { san: 'Nc6', note: 'Black develops a knight to defend e5.' },
      { san: 'Bc4', note: 'The Italian bishop! It points right at f7 — the square only the king guards.',
        coach: 'Now watch what Black does. If Black copies with ...Bc5, you go quiet and strong with c3. If Black jumps out ...Nf6 instead, play d3 and keep building. Either way: keep developing, don’t panic.' },
      { san: 'Bc5', note: "Black's bishop mirrors yours, aiming at your f2. This is the Giuoco Piano — the “Quiet Game.”" },
      { san: 'c3',  note: 'A little ramp so you can push d4 and build a big pawn center later.',
        coach: 'c3 is your reply to ...Bc5. It prepares the big pawn push d4. (If Black had played ...Nf6 first, you’d pick d3 instead to stay solid.)' },
      { san: 'Nf6', note: 'Black develops a knight and pokes your e4 pawn. Stay calm — e4 is fine for now.' },
      { san: 'd3',  note: 'Hold up your e4 pawn and open a window for your other bishop. This calm setup is the Giuoco Pianissimo — “Very Quiet Game.”' },
      { san: 'd6',  note: 'Black props up e5 and frees their bishop too.' },
      { san: 'O-O', note: 'Castle! Tuck your king into the corner and wake up your rook.' },
      { san: 'O-O', note: 'Black castles to safety as well. A calm, healthy Italian.' },
    ],
  },
  {
    id: 'italian-black',
    name: "Black's Mirror (1...e5)",
    student: 'b', // she plays Black
    icon: '🛡️',
    blurb:
      'The same Italian ideas — but as Black! Match White in the center, develop, and castle. One opening, both colors.',
    plies: [
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
    ],
  },
];

export function getOpening(id) {
  return OPENINGS.find((o) => o.id === id) || OPENINGS[0];
}

// Whose move is it at this ply index? Even = White.
export function moverAt(index) {
  return index % 2 === 0 ? 'w' : 'b';
}
