// Curated examples for the Notation "Write the Move" lesson. Each shows a board
// with one highlighted move (an arrow); she types the move in notation. The
// examples walk through pieces and every symbol (x / + / # / = / O-O). The
// canonical SAN is derived from fen + from/to at runtime (so it's always right).
export const WRITE_MOVES = [
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    from: 'e2',
    to: 'e4',
    teach: 'Pawns have NO letter — just write the square they move to.',
  },
  {
    fen: 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1',
    from: 'g1',
    to: 'f3',
    teach: 'Pieces start with a letter. Knight = N (K is the King!), then the square.',
  },
  {
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 4 3',
    from: 'f1',
    to: 'c4',
    teach: 'Bishop = B. Letter first, then where it lands.',
  },
  {
    fen: 'rnbqkbnr/ppp1pppp/8/3p4/4P3/8/PPPP1PPP/RNBQKBNR w KQkq d6 0 2',
    from: 'e4',
    to: 'd5',
    teach: 'Capturing? Add an x: the file you came from, then x, then the square — exd5.',
  },
  {
    fen: 'rnbqkbnr/ppp2ppp/3p4/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 3',
    from: 'f1',
    to: 'b5',
    teach: 'Putting the king in check? Add a + on the end — Bb5+.',
  },
  {
    fen: 'r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4',
    from: 'e1',
    to: 'g1',
    teach: 'Castling on the king’s side has its own symbol: O-O.',
  },
  {
    fen: '8/4P3/8/8/8/k7/8/4K3 w - - 0 1',
    from: 'e7',
    to: 'e8',
    promotion: 'q',
    teach: 'Promoting a pawn? Add = and the new piece — e8=Q.',
  },
  {
    fen: 'r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 4 4',
    from: 'h5',
    to: 'f7',
    teach: 'Checkmate uses #. This one captures too, so it’s Qxf7#.',
  },
];
