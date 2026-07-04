// Walkthrough continuity checking — the ship-gate behind "each step should be
// a real move". A click-through lesson must never teleport pieces between
// steps: consecutive steps must be IDENTICAL positions (annotation-only
// change), reachable by a short legal sequence (her move ± the reply), or
// explicitly marked `newScene: true` (a deliberate cut, labelled in the UI).
import { newGame } from '../engine/chessEngine';

const placement = (fen) => fen.split(' ')[0];

// Is `toFen`'s piece placement reachable from `fromFen` within `maxPlies`
// legal half-moves? Small breadth-first walk — endgame/tactic positions have
// few moves, so depth 2 stays tiny.
export function reachableWithin(fromFen, toFen, maxPlies = 2) {
  const target = placement(toFen);
  if (placement(fromFen) === target) return true;
  let frontier = [fromFen];
  for (let d = 0; d < maxPlies; d++) {
    const next = [];
    for (const fen of frontier) {
      let g;
      try {
        g = newGame(fen);
      } catch {
        continue;
      }
      for (const m of g.moves({ verbose: true })) {
        g.move(m.san);
        const f = g.fen();
        if (placement(f) === target) return true;
        next.push(f);
        g.undo();
      }
    }
    frontier = next;
  }
  return false;
}

// Assert-helper used by the data test suites: returns a list of problems
// (empty = walkthrough is valid). Checks FEN parse, marker squares, caption
// substance, and step-to-step continuity.
export function walkthroughProblems(steps) {
  const SQ = /^[a-h][1-8]$/;
  const problems = [];
  if (!Array.isArray(steps) || steps.length < 2) return ['walkthrough missing or too short'];
  steps.forEach((step, i) => {
    try {
      newGame(step.fen);
    } catch {
      problems.push(`step ${i + 1}: invalid fen ${step.fen}`);
      return;
    }
    if (!step.caption || step.caption.length < 30) problems.push(`step ${i + 1}: caption too thin`);
    for (const a of step.arrows || []) {
      if (!SQ.test(a.from) || !SQ.test(a.to)) problems.push(`step ${i + 1}: bad arrow ${a.from}->${a.to}`);
    }
    for (const c of step.circles || []) {
      if (!SQ.test(c)) problems.push(`step ${i + 1}: bad circle ${c}`);
    }
    if (i > 0 && !step.newScene) {
      const prev = steps[i - 1];
      if (!reachableWithin(prev.fen, step.fen, 2)) {
        problems.push(`step ${i} -> ${i + 1}: position jump (not reachable in 2 plies; mark newScene or fix the line)`);
      }
    }
  });
  return problems;
}
