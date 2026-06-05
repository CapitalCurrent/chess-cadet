// Maia3 board encoding + policy decoding, ported from the official
// CSSLab/maia-platform-frontend (GPL-3.0) and adapted to chess.js.
//
// maia3 tokenizes the board as (64, 12) one-hot piece channels, ALWAYS from
// white's perspective (the board is mirrored when it's black to move). The
// model also takes the side-to-move and opponent Elo as scalar inputs. Its
// policy head is a 4352-dim move space; we softmax over the legal subset.
import { Chess } from 'chess.js';
import allMovesMaia3 from './data/all_moves_maia3.json';
import allMovesMaia3Reversed from './data/all_moves_maia3_reversed.json';

export const allPossibleMovesMaia3Reversed = allMovesMaia3Reversed;

function mirrorSquare(square) {
  const file = square.charAt(0);
  const rank = (9 - parseInt(square.charAt(1), 10)).toString();
  return file + rank;
}

// Mirror a UCI move vertically (the board flip used for black-to-move).
export function mirrorMove(moveUci) {
  const isPromotion = moveUci.length > 4;
  const start = moveUci.substring(0, 2);
  const end = moveUci.substring(2, 4);
  const promo = isPromotion ? moveUci.substring(4) : '';
  return mirrorSquare(start) + mirrorSquare(end) + promo;
}

function swapColorsInRank(rank) {
  let out = '';
  for (const ch of rank) {
    if (/[A-Z]/.test(ch)) out += ch.toLowerCase();
    else if (/[a-z]/.test(ch)) out += ch.toUpperCase();
    else out += ch; // digit (empty squares)
  }
  return out;
}

function swapCastlingRights(castling) {
  if (castling === '-') return '-';
  const rights = new Set(castling.split(''));
  const swapped = new Set();
  if (rights.has('K')) swapped.add('k');
  if (rights.has('Q')) swapped.add('q');
  if (rights.has('k')) swapped.add('K');
  if (rights.has('q')) swapped.add('Q');
  let out = '';
  if (swapped.has('K')) out += 'K';
  if (swapped.has('Q')) out += 'Q';
  if (swapped.has('k')) out += 'k';
  if (swapped.has('q')) out += 'q';
  return out === '' ? '-' : out;
}

// Flip a FEN top-to-bottom and swap piece colors (so black-to-move positions
// can be encoded as if white were moving).
function mirrorFEN(fen) {
  const [position, activeColor, castling, enPassant, halfmove, fullmove] = fen.split(' ');
  const mirroredPosition = position.split('/').slice().reverse().map(swapColorsInRank).join('/');
  const mirroredActiveColor = activeColor === 'w' ? 'b' : 'w';
  const mirroredCastling = swapCastlingRights(castling);
  const mirroredEnPassant = enPassant !== '-' ? mirrorSquare(enPassant) : '-';
  return `${mirroredPosition} ${mirroredActiveColor} ${mirroredCastling} ${mirroredEnPassant} ${halfmove} ${fullmove}`;
}

function boardToMaia3Tokens(fen) {
  const piecePlacement = fen.split(' ')[0];
  const pieceTypes = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k'];
  const tensor = new Float32Array(64 * 12);
  const rows = piecePlacement.split('/');
  for (let rank = 0; rank < 8; rank++) {
    const row = 7 - rank;
    let file = 0;
    for (const ch of rows[rank]) {
      if (isNaN(parseInt(ch, 10))) {
        const pieceIdx = pieceTypes.indexOf(ch);
        if (pieceIdx >= 0) tensor[(row * 8 + file) * 12 + pieceIdx] = 1.0;
        file += 1;
      } else {
        file += parseInt(ch, 10);
      }
    }
  }
  return tensor;
}

// FEN -> { boardTokens: Float32Array(64*12), legalMoves: Float32Array(4352) }.
export function preprocessMaia3(fen) {
  let board = new Chess(fen);
  if (fen.split(' ')[1] === 'b') {
    board = new Chess(mirrorFEN(board.fen()));
  } else if (fen.split(' ')[1] !== 'w') {
    throw new Error(`Invalid FEN: ${fen}`);
  }
  const boardTokens = boardToMaia3Tokens(board.fen());
  const legalMoves = new Float32Array(Object.keys(allMovesMaia3).length);
  for (const move of board.moves({ verbose: true })) {
    const promo = move.promotion ? move.promotion : '';
    const moveIndex = allMovesMaia3[move.from + move.to + promo];
    if (moveIndex !== undefined) legalMoves[moveIndex] = 1.0;
  }
  return { boardTokens, legalMoves };
}

// Decode model outputs -> { policy: { uci: prob }, value: winProbForSideToMove }.
export function decodeMaia3(fen, logitsMove, logitsValue, legalMoves) {
  const wdl = logitsValue; // [loss, draw, win] for side-to-move (white frame)
  const maxWdl = Math.max(wdl[0], wdl[1], wdl[2]);
  const expL = Math.exp(wdl[0] - maxWdl);
  const expD = Math.exp(wdl[1] - maxWdl);
  const expW = Math.exp(wdl[2] - maxWdl);
  const sumExp = expL + expD + expW;
  let winProb = (expW + 0.5 * expD) / sumExp;

  let blackFlag = false;
  if (fen.split(' ')[1] === 'b') {
    blackFlag = true;
    winProb = 1 - winProb;
  }
  winProb = Math.round(winProb * 10000) / 10000;

  const legalIdx = [];
  for (let i = 0; i < legalMoves.length; i++) if (legalMoves[i] > 0) legalIdx.push(i);
  if (!legalIdx.length) return { policy: {}, value: winProb };

  const movesMirrored = legalIdx.map((idx) => {
    let m = allMovesMaia3Reversed[idx];
    if (blackFlag) m = mirrorMove(m);
    return m;
  });

  const legalLogits = legalIdx.map((idx) => logitsMove[idx]);
  const maxLogit = Math.max(...legalLogits);
  const expLogits = legalLogits.map((l) => Math.exp(l - maxLogit));
  const sumExpMoves = expLogits.reduce((a, b) => a + b, 0);
  const probs = expLogits.map((e) => e / sumExpMoves);

  const policy = {};
  for (let i = 0; i < legalIdx.length; i++) policy[movesMirrored[i]] = probs[i];
  return { policy, value: winProb };
}
