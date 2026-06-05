// Thin wrapper around chess.js — the single place that knows the rules.
// Everything notation-related (is this legal? is this the book move?) lives here.
import { Chess } from 'chess.js';

// Unicode glyphs for rendering pieces on the board.
const GLYPHS = {
  w: { k: '♔', q: '♕', r: '♖', b: '♗', n: '♘', p: '♙' },
  b: { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' },
};

export function pieceGlyph(color, type) {
  return GLYPHS[color]?.[type] || '';
}

// Always use the SOLID glyph set and color it via CSS — crisper than mixing
// the outline (white) and filled (black) Unicode sets on a colored board.
export function filledGlyph(type) {
  return GLYPHS.b[type] || '';
}

export function newGame(fen) {
  return fen ? new Chess(fen) : new Chess();
}

// Strip check/checkmate decorations so "Nf3" and "Nf3+" compare equal.
export function coreSan(san) {
  return (san || '').replace(/[+#]/g, '').trim();
}

// Try to play `input` (loose SAN) on the given FEN without disturbing live state.
// Returns the canonical move object (with normalized .san) or null if illegal.
export function tryMove(fen, input) {
  const game = new Chess(fen);
  const raw = (input || '').trim();
  if (!raw) return null;
  try {
    // chess.js is lenient by default (accepts e.g. "ed5" for "exd5").
    const move = game.move(raw);
    return move || null;
  } catch (e) {
    return null;
  }
}

// Classify a typed move against the expected book move for this position.
// -> { status: 'correct' | 'legal' | 'illegal', move, expectedSan, sawCheck }
export function evaluateInput(fen, input, expectedSan) {
  const move = tryMove(fen, input);
  if (!move) return { status: 'illegal', move: null, expectedSan };

  const got = coreSan(move.san);
  const want = coreSan(expectedSan);
  if (got === want) {
    // Did she also notate the check/mate symbol when one was due?
    const sawCheck = /[+#]/.test(input) && /[+#]/.test(move.san);
    return { status: 'correct', move, expectedSan, sawCheck };
  }
  return { status: 'legal', move, expectedSan };
}

// Apply a move to a live game instance; returns the move object or null.
export function applySan(game, san) {
  try {
    return game.move(san) || null;
  } catch (e) {
    return null;
  }
}

// Legal destination squares for the piece on `square` (for tap-to-move dots).
export function legalTargets(fen, square) {
  if (!square) return [];
  try {
    return new Chess(fen).moves({ square, verbose: true }).map((m) => m.to);
  } catch {
    return [];
  }
}

// Attempt a move by coordinates (auto-queen on promotion). Returns move or null.
export function moveFromTo(fen, from, to) {
  try {
    return new Chess(fen).move({ from, to, promotion: 'q' }) || null;
  } catch {
    return null;
  }
}
