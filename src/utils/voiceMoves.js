// Voice → move parser. Turns a spoken phrase ("knight takes d6", "castle
// queenside", "e4") into a legal chess move for a given position.
//
// Design: chess is a TINY constrained vocabulary, so we don't trust the speech
// recognizer to be precise — we normalize homophones (night→knight, see→c,
// ate→8), extract a loose intent (piece? capture? origin? destination?), and
// then match it against the LEGAL moves of the position. Validation against
// legality is what makes kid-speech reliable.
//
// Pure module — no browser APIs — so the whole grammar is unit-testable
// (src/utils/voiceMoves.test.js). The mic lives in utils/speech.js.
import { Chess } from 'chess.js';

const PIECE_WORDS = {
  knight: 'n', night: 'n', nite: 'n', horse: 'n', pony: 'n',
  bishop: 'b',
  rook: 'r', brook: 'r', rock: 'r', ruck: 'r', tower: 'r',
  queen: 'q',
  king: 'k',
  pawn: 'p', pon: 'p', pond: 'p', paun: 'p',
};

const FILE_WORDS = {
  a: 'a', ay: 'a', alpha: 'a',
  b: 'b', be: 'b', bee: 'b', bea: 'b', bravo: 'b',
  c: 'c', see: 'c', sea: 'c', si: 'c', charlie: 'c',
  d: 'd', de: 'd', dee: 'd', delta: 'd',
  e: 'e', ee: 'e', echo: 'e',
  f: 'f', ef: 'f', eff: 'f', of: 'f', foxtrot: 'f',
  g: 'g', gee: 'g', ge: 'g', jee: 'g', golf: 'g',
  h: 'h', aitch: 'h', ach: 'h', age: 'h', each: 'h', hotel: 'h',
};

const RANK_WORDS = {
  1: '1', one: '1', won: '1',
  2: '2', two: '2',
  3: '3', three: '3', tree: '3', free: '3',
  4: '4', four: '4', for: '4', fore: '4',
  5: '5', five: '5',
  6: '6', six: '6', sicks: '6',
  7: '7', seven: '7',
  8: '8', eight: '8', ate: '8',
};

const CAPTURE_WORDS = new Set(['takes', 'take', 'taking', 'took', 'captures', 'capture', 'x', 'times', 'eats']);

const PROMO_MARKERS = new Set(['promote', 'promotes', 'promoting', 'promotion', 'equals', 'equal', 'becomes', 'become', 'make', 'makes']);

// Tokens that carry no meaning for us (note: 'a' is a FILE, never filler; 'to'
// is handled contextually because "bee too" can mean b2).
const FILLER = new Set([
  'the', 'my', 'please', 'um', 'uh', 'then', 'and', 'piece', 'move', 'moves',
  'moving', 'go', 'goes', 'going', 'play', 'plays', 'it', 'that', 'onto', 'at',
  'square', 'on', 'in', 'with', 'check', 'checkmate', 'mate', 'plus', 'hash',
]);

const PIECE_NAMES = { p: 'pawn', n: 'knight', b: 'bishop', r: 'rook', q: 'queen', k: 'king' };

function cap(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function normalize(text) {
  let t = (text || '').toLowerCase().replace(/[-_.,!?'’]/g, ' ');
  // Notorious ASR fusions of file+rank.
  t = t.replace(/\bbefore\b/g, 'b 4').replace(/\bbefour\b/g, 'b 4');
  return t.trim();
}

const SQ_RE = /^[a-h][1-8]$/;

// Tokenize into typed items: {t:'sq'|'piece'|'file'|'cap'|'promo'|'to', v}.
function extractItems(text) {
  const tokens = text.split(/\s+/).filter(Boolean);
  const items = [];
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    if (SQ_RE.test(tok)) {
      items.push({ t: 'sq', v: tok });
    } else if (PIECE_WORDS[tok]) {
      items.push({ t: 'piece', v: PIECE_WORDS[tok] });
    } else if (CAPTURE_WORDS.has(tok)) {
      items.push({ t: 'cap' });
    } else if (FILE_WORDS[tok] !== undefined) {
      const file = FILE_WORDS[tok];
      const next = tokens[i + 1];
      if (next !== undefined && RANK_WORDS[next] !== undefined && next !== 'to' && next !== 'too') {
        items.push({ t: 'sq', v: file + RANK_WORDS[next] });
        i += 1;
      } else if (next === 'to' || next === 'too') {
        // "bee too" = b2 — but only when 'to' isn't the connector before a
        // destination ("b to e4"). Peek past it: if what follows could start a
        // square/piece, 'to' was the connector.
        const after = tokens[i + 2];
        const afterStartsThing =
          after !== undefined && (SQ_RE.test(after) || PIECE_WORDS[after] || FILE_WORDS[after] !== undefined);
        if (!afterStartsThing) {
          items.push({ t: 'sq', v: file + '2' });
          i += 1;
        } else {
          items.push({ t: 'file', v: file });
        }
      } else {
        items.push({ t: 'file', v: file });
      }
    } else if (PROMO_MARKERS.has(tok)) {
      items.push({ t: 'promo' });
    } else if (tok === 'to' || tok === 'too') {
      items.push({ t: 'to' });
    } else if (FILLER.has(tok) || RANK_WORDS[tok] !== undefined) {
      // lone rank words and filler carry nothing by themselves
    }
    // anything else: ignore (ASR noise)
  }
  return items;
}

function describeCastles(legal) {
  return {
    short: legal.find((m) => m.san === 'O-O' || m.san === 'O-O+' || m.san === 'O-O#') || null,
    long: legal.find((m) => m.san.startsWith('O-O-O')) || null,
  };
}

// Main entry. Returns one of:
//   { status:'ok', san, uci, move }                      — play it
//   { status:'ambiguous', candidates:[move], message }   — ask which one
//   { status:'no-match', message }                       — teach + retry
export function parseVoiceMove(transcript, fen) {
  const text = normalize(transcript);
  if (!text) return { status: 'no-match', message: "I didn't catch that — try again!" };

  let game;
  try {
    game = new Chess(fen);
  } catch {
    return { status: 'no-match', message: 'Bad position.' };
  }
  const legal = game.moves({ verbose: true });

  // ── Castling ──────────────────────────────────────────────────────────────
  if (/\b(castle|castles|castling|casel|cassel)\b/.test(text)) {
    const { short, long } = describeCastles(legal);
    const wantsLong = /\b(queen\s*side|queenside|long)\b/.test(text);
    const wantsShort = /\b(king\s*side|kingside|short)\b/.test(text);
    if (wantsLong) {
      return long
        ? { status: 'ok', san: long.san, uci: long.from + long.to, move: long }
        : { status: 'no-match', message: "You can't castle queenside right now." };
    }
    if (wantsShort) {
      return short
        ? { status: 'ok', san: short.san, uci: short.from + short.to, move: short }
        : { status: 'no-match', message: "You can't castle kingside right now." };
    }
    if (short && long) {
      return {
        status: 'ambiguous',
        candidates: [short, long],
        message: 'Which way? Say "castle kingside" or "castle queenside".',
      };
    }
    const only = short || long;
    return only
      ? { status: 'ok', san: only.san, uci: only.from + only.to, move: only }
      : { status: 'no-match', message: "You can't castle right now." };
  }

  // ── Regular moves ─────────────────────────────────────────────────────────
  const items = extractItems(text);
  const firstSq = items.findIndex((it) => it.t === 'sq');
  if (firstSq === -1) {
    return { status: 'no-match', message: 'Say the square too — like "knight to f3".' };
  }

  const squares = items.filter((it) => it.t === 'sq').map((it) => it.v);
  const dest = squares[squares.length - 1];
  const origin = squares.length >= 2 ? squares[0] : null;
  const wantsCapture = items.some((it) => it.t === 'cap');

  // Moving piece = first piece word BEFORE the first square. A piece word
  // AFTER the destination is a promotion choice ("e8 queen").
  let piece = null;
  let originFile = null;
  for (let i = 0; i < firstSq; i++) {
    const it = items[i];
    if (it.t === 'piece' && piece === null) piece = it.v;
    // A bare file before the destination is an origin hint ("e takes d5") —
    // unless it's the article 'a' right before a piece word ("a pawn to e4"),
    // which extractItems already kept as a file; guard it here.
    if (it.t === 'file' && originFile === null) {
      const nxt = items[i + 1];
      if (!(it.v === 'a' && nxt && nxt.t === 'piece')) originFile = it.v;
    }
  }
  let promoPiece = null;
  for (let i = firstSq + 1; i < items.length; i++) {
    const it = items[i];
    if (it.t === 'piece' && 'nbrq'.includes(it.v)) promoPiece = it.v;
  }

  const wantPiece = piece || 'p'; // bare square = pawn move, true to notation
  const pieceName = PIECE_NAMES[wantPiece];

  let cands = legal.filter(
    (m) =>
      m.to === dest &&
      m.piece === wantPiece &&
      (origin ? m.from === origin : true) &&
      (originFile && !origin ? m.from[0] === originFile : true)
  );

  // Promotion: chess.js enumerates each promotion piece as its own move.
  if (cands.some((m) => m.promotion)) {
    const promo = promoPiece || 'q';
    cands = cands.filter((m) => !m.promotion || m.promotion === promo);
  }

  if (wantsCapture) {
    const caps = cands.filter((m) => m.captured || /[ce]/.test(m.flags));
    if (caps.length) {
      cands = caps;
    } else if (cands.length) {
      // She said "takes" but the matching move is quiet — teach, don't guess.
      return {
        status: 'no-match',
        message: `There's nothing to take on ${dest} — say "${pieceName} to ${dest}".`,
      };
    }
  }

  if (cands.length === 1) {
    const m = cands[0];
    return { status: 'ok', san: m.san, uci: m.from + m.to + (m.promotion || ''), move: m };
  }

  if (cands.length > 1) {
    return {
      status: 'ambiguous',
      candidates: cands,
      message: `${cap(pieceName)}s on ${cands.map((m) => m.from).join(' and ')} can both ${
        wantsCapture ? 'take' : 'go to'
      } ${dest} — say "${pieceName} on ${cands[0].from}".`,
    };
  }

  // Nothing matched — say WHY, as a teacher would.
  if (!piece) {
    const other = legal.find((m) => m.to === dest);
    return other
      ? {
          status: 'no-match',
          message: `No pawn can go to ${dest} — name the piece, like "${PIECE_NAMES[other.piece]} to ${dest}".`,
        }
      : { status: 'no-match', message: `${dest}? Nothing can go there right now.` };
  }
  return { status: 'no-match', message: `Your ${pieceName} can't ${wantsCapture ? 'take on' : 'go to'} ${dest} right now.` };
}

// The recognizer returns several alternative transcripts — try them all and
// take the first that yields a playable move (then the most teachable failure).
export function parseVoiceAlternatives(alternatives, fen) {
  const alts = (alternatives || []).filter(Boolean);
  if (!alts.length) return { status: 'no-match', message: "I didn't catch that — try again!" };
  let firstAmbiguous = null;
  let firstMiss = null;
  for (const alt of alts) {
    const res = parseVoiceMove(alt, fen);
    if (res.status === 'ok') return res;
    if (res.status === 'ambiguous' && !firstAmbiguous) firstAmbiguous = res;
    if (res.status === 'no-match' && !firstMiss) firstMiss = res;
  }
  return firstAmbiguous || firstMiss;
}
