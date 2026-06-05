// Wrapper around the classical Stockfish 10 asm.js build (loaded as a Web Worker
// from public/stockfish/stockfish.js). Single-threaded, no SharedArrayBuffer, so
// it works on GitHub Pages and offline once cached.
//
// Requests are serialized (one search at a time) so overlapping calls can't cross
// their `bestmove` replies.

let worker = null;
let readyPromise = null;
let active = null; // resolver for the in-flight request
let infoMoves = null; // when set, collect MultiPV candidate moves by rank
let queue = Promise.resolve();

function dispatch(line) {
  if (!line) return;
  if (line.indexOf('uciok') === 0 && worker && worker._readyResolve) {
    worker._readyResolve();
    worker._readyResolve = null;
  }
  // While a MultiPV search runs, capture each line's top move by its rank.
  if (infoMoves && line.indexOf('info ') === 0) {
    const m = line.match(/ multipv (\d+) .* pv (\S+)/);
    if (m) infoMoves[parseInt(m[1], 10)] = m[2];
    return;
  }
  if (line.indexOf('bestmove') === 0 && active) {
    const mv = line.split(/\s+/)[1];
    const resolve = active;
    active = null;
    if (infoMoves) {
      const ordered = Object.keys(infoMoves)
        .sort((a, b) => a - b)
        .map((k) => infoMoves[k]);
      infoMoves = null;
      resolve(ordered.length ? ordered : mv && mv !== '(none)' ? [mv] : []);
    } else {
      resolve(mv && mv !== '(none)' ? mv : null);
    }
  }
}

function ensureReady() {
  if (readyPromise) return readyPromise;
  readyPromise = new Promise((resolve, reject) => {
    try {
      worker = new Worker(`${process.env.PUBLIC_URL}/stockfish/stockfish.js`);
      worker._readyResolve = resolve;
      worker.onmessage = (e) => {
        const line = typeof e.data === 'string' ? e.data : (e.data && e.data.data) || '';
        dispatch(line);
      };
      worker.onerror = () => reject(new Error('stockfish worker failed'));
      worker.postMessage('uci');
      // Safety: resolve anyway after a moment if uciok is slow/missed.
      setTimeout(resolve, 1500);
    } catch (err) {
      reject(err);
    }
  });
  return readyPromise;
}

export function initEngine() {
  // Fire-and-forget warm-up so the first move isn't delayed by load.
  ensureReady().catch(() => {});
}

function doBestMove(fen, skill, movetime) {
  return new Promise((resolve) => {
    active = resolve;
    infoMoves = null;
    worker.postMessage('setoption name MultiPV value 1');
    worker.postMessage('setoption name Skill Level value ' + skill);
    worker.postMessage('position fen ' + fen);
    worker.postMessage('go movetime ' + movetime);
  });
}

// Returns a UCI move string ("e2e4", "g1f3", "e7e8q") or null. Never throws.
export function bestMove(fen, { skill = 20, movetime = 1000 } = {}) {
  const run = () =>
    ensureReady()
      .then(() => doBestMove(fen, skill, movetime))
      .catch(() => null);
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

function doTopMoves(fen, multipv, movetime, skill) {
  return new Promise((resolve) => {
    active = resolve;
    infoMoves = {};
    worker.postMessage('setoption name MultiPV value ' + multipv);
    worker.postMessage('setoption name Skill Level value ' + skill);
    worker.postMessage('position fen ' + fen);
    worker.postMessage('go movetime ' + movetime);
  });
}

// Returns the engine's best candidate moves, best-first (UCI strings). Used to
// weaken play by deliberately choosing a worse-but-sensible move (never random).
export function topMoves(fen, { multipv = 4, movetime = 500, skill = 20 } = {}) {
  const run = () =>
    ensureReady()
      .then(() => doTopMoves(fen, multipv, movetime, skill))
      .catch(() => []);
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

function doShallow(fen, depth, skill) {
  return new Promise((resolve) => {
    active = resolve;
    infoMoves = null;
    worker.postMessage('setoption name MultiPV value 1');
    worker.postMessage('setoption name Skill Level value ' + skill);
    worker.postMessage('position fen ' + fen);
    worker.postMessage('go depth ' + depth);
  });
}

// Best move from a deliberately SHALLOW search (depth 1-2). It plays a natural,
// locally-reasonable move but can't see 2-3 move tactics — so it blunders the
// way a beginner does (hangs a piece, walks into a fork) rather than randomly.
export function shallowMove(fen, { depth = 2, skill = 20 } = {}) {
  const run = () =>
    ensureReady()
      .then(() => doShallow(fen, depth, skill))
      .catch(() => null);
  const p = queue.then(run, run);
  queue = p.catch(() => {});
  return p;
}

// ----- 20-level difficulty ladder ------------------------------------------
// Skill Level 0..20 + a movetime cap (keeps every move responsive, <=1.5s) +
// a deliberate blunder chance on the lowest levels so they feel beginner-y.
const BLUNDER = [0.55, 0.42, 0.3, 0.18, 0.08]; // levels 1..5

export function levelConfig(level) {
  const n = Math.max(1, Math.min(20, level));
  const skill = Math.round(((n - 1) / 19) * 20); // 0..20
  const movetime = Math.round(50 + ((n - 1) / 19) * 1450); // 50ms..1500ms
  const blunder = n <= 5 ? BLUNDER[n - 1] : 0;
  return { skill, movetime, blunder };
}

export function levelTier(level) {
  if (level <= 3) return 'Beginner';
  if (level <= 7) return 'Easy';
  if (level <= 11) return 'Medium';
  if (level <= 15) return 'Hard';
  if (level <= 19) return 'Expert';
  return 'Max';
}

// Approximate EFFECTIVE Elo per level — i.e. how strong it actually plays here,
// factoring in the short movetime caps and the deliberate blunders at the bottom
// (NOT nominal Stockfish "Skill Level" Elo, which would read much higher). These
// are rough, kid-oriented buckets; treat them as ballpark, not exact ratings.
const LEVEL_ELO = [
  [250, 400], [400, 550], [550, 700], // 1-3 Beginner (blunder-heavy)
  [700, 850], [850, 1000], [1000, 1150], [1150, 1300], // 4-7 Easy
  [1300, 1450], [1450, 1600], [1600, 1750], [1750, 1900], // 8-11 Medium
  [1900, 2050], [2050, 2200], [2200, 2350], [2350, 2500], // 12-15 Hard
  [2500, 2650], [2650, 2800], [2800, 2950], [2950, 3100], // 16-19 Expert
  [3000, 3300], // 20 Max
];

export function levelElo(level) {
  const n = Math.max(1, Math.min(20, level));
  return LEVEL_ELO[n - 1];
}

// "~550–700" (or "~3000+" at the top).
export function levelEloLabel(level) {
  const [lo, hi] = levelElo(level);
  return level >= 20 ? `~${lo}+` : `~${lo}–${hi}`;
}

// ----- Weakening by suboptimal (NOT random) move selection ------------------
// Ranking is always done at full skill so the candidate ORDER is accurate; the
// weakness comes from how far down that ordered list we choose. Weaker levels
// ask for more candidates and are more likely to take a worse (but still real,
// engine-found) move — so low levels play passively/inaccurately, never nonsense.
export function levelWeakening(level) {
  const n = Math.max(1, Math.min(20, level));
  const w = (20 - n) / 19; // 1 at level 1 -> 0 at level 20
  const multipv = Math.max(1, Math.round(1 + w * 11)); // 12 candidates .. 1
  const movetime = Math.max(150, Math.round(50 + ((n - 1) / 19) * 1450));
  const pBest = 0.15 + 0.85 * ((n - 1) / 19); // 0.15 (often picks worse) .. 1.0 (always best)
  // Two kinds of realistic mistake, via a shallow search that genuinely can't
  // see the consequence (NOT random moves):
  //  - missing a tactic (depth 2): subtle, common-beginner -> moderate chance.
  //  - an outright hang (depth 1): jarring -> kept rare even at the bottom.
  const tacticMissChance = n <= 12 ? 0.2 * ((13 - n) / 12) : 0; // ~20% @L1 -> 0 by L13
  const hangChance = n <= 6 ? 0.06 * ((7 - n) / 6) : 0; //          ~6% @L1 -> 0 by L7
  return { multipv, movetime, pBest, skill: 20, tacticMissChance, hangChance };
}

// Walk the best-first candidate list, stopping at each rank with probability
// pBest. High pBest -> almost always the best move; low pBest -> drifts toward
// the weaker candidates. Returns a UCI move (or null if the list is empty).
export function pickWeakened(candidates, pBest) {
  if (!candidates || !candidates.length) return null;
  let rank = 0;
  while (rank < candidates.length - 1 && Math.random() > pBest) rank++;
  return candidates[rank];
}
