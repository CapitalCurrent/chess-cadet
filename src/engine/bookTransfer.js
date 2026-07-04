// Opening-transfer coach — the bridge between Learn and Play. During a real
// game we compare the moves on the board against the opening trees she has
// actually STUDIED and speak at exactly two moments:
//   RECOGNITION — several book moves deep: "You're in your Italian!"
//   DEPARTURE   — the OPPONENT leaves her book: one plan reminder, then quiet.
// Her own deviations are never scolded here (the eval coach judges moves on
// merit; book moves are not the only good moves). Caps and once-per-game
// bookkeeping live in the caller — this module is PURE lookup.
import { OPENINGS } from '../data/openings';

// SANs from chess.js carry +/# decorations; authored tree SANs are plain.
const clean = (san) => (san || '').replace(/[+#]/g, '');

// Deepest match of `sans` down a tree of { san, children } nodes.
function matchDepth(tree, sans) {
  let nodes = tree;
  let depth = 0;
  for (const san of sans) {
    const node = (nodes || []).find((n) => clean(n.san) === clean(san));
    if (!node) break;
    depth += 1;
    nodes = node.children;
  }
  return depth;
}

// Courses that count as "studied": she has drilled the course at all, or
// mastered/learned any of its lines. No messages about openings she's never
// opened — the transfer coach reinforces HER work, it doesn't lecture.
export function studiedOpenings(progress, herColor) {
  if (!progress) return [];
  return OPENINGS.filter((o) => {
    if (o.student !== herColor) return false;
    const m = progress.mastery && progress.mastery[o.id];
    const lines = progress.lines && progress.lines[o.id];
    return (m && m.runs > 0) || (lines && ((lines.mastered || []).length > 0 || (lines.learned || []).length > 0));
  });
}

// Where does this game stand against her studied books?
// Returns null when she has no studied openings for this color, else:
//   { opening, depth, inBook, departedBy: 'her'|'them'|null }
// depth = plies matched by the BEST course; departedBy = who played the first
// out-of-book move (null while still in book).
export function bookStatus(sans, herColor, progress) {
  const studied = studiedOpenings(progress, herColor);
  if (!studied.length || !sans.length) return null;
  let best = null;
  for (const o of studied) {
    const depth = matchDepth(o.tree, sans);
    if (!best || depth > best.depth) best = { opening: o, depth };
  }
  const inBook = best.depth === sans.length;
  let departedBy = null;
  if (!inBook) {
    const firstOut = best.depth; // index of the first out-of-book ply
    const mover = firstOut % 2 === 0 ? 'w' : 'b';
    departedBy = mover === herColor ? 'her' : 'them';
  }
  return { opening: best.opening, depth: best.depth, inBook, departedBy };
}

// The plan she should remember when the book runs out — per family, with a
// safe generic fallback. These echo the plan language of the courses.
const FAMILY_PLANS = {
  'italian-w': 'develop your pieces, castle, and look for the d4 break',
  'sicilian': 'play c3 and d4 — build the big center',
  'scandi': 'd4, Nf3, Bc4, then castle — your setup barely changes',
  'white-mix': 'develop toward the center, castle early, and watch what they threaten',
  'black': 'match them in the center, develop, and castle',
};

export function departurePlan(opening) {
  return (opening && FAMILY_PLANS[opening.familyId]) || 'develop toward the center, castle early, and watch what they threaten';
}
