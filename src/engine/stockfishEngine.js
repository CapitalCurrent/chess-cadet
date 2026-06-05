// Wrapper around the classical Stockfish 10 asm.js build (loaded as a Web Worker
// from public/stockfish/stockfish.js). Single-threaded, no SharedArrayBuffer, so
// it works on GitHub Pages and offline once cached.
//
// Requests are serialized (one search at a time) so overlapping calls can't cross
// their `bestmove` replies.

let worker = null;
let readyPromise = null;
let active = null; // resolver for the in-flight bestMove
let queue = Promise.resolve();

function dispatch(line) {
  if (!line) return;
  if (line.indexOf('uciok') === 0 && worker && worker._readyResolve) {
    worker._readyResolve();
    worker._readyResolve = null;
  }
  if (line.indexOf('bestmove') === 0 && active) {
    const mv = line.split(/\s+/)[1];
    const resolve = active;
    active = null;
    resolve(mv && mv !== '(none)' ? mv : null);
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
