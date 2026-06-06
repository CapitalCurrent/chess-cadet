// Maia "Human Mode" opponent — wraps the maia3 ONNX model running in a Web
// Worker (public/maia-worker.js) via onnxruntime-web. The worker caches the
// ~44MB model in IndexedDB, so it downloads once (online) and then works even
// offline. If the model isn't available, callers fall back to Stockfish.
import { preprocessMaia3, decodeMaia3 } from './maiaTensor';

const MODEL_URL = `${process.env.PUBLIC_URL}/maia/maia3_simplified.onnx`;
const MODEL_VERSION = 'maia3-v1';

let worker = null;
let status = 'idle'; // idle | loading | no-cache | downloading | ready | error
let progress = 0;
const listeners = new Set();
const pending = new Map(); // inference id -> {resolve,reject}
let reqId = 0;

function emit() {
  listeners.forEach((cb) => cb(status, progress));
}
function setStatus(s) {
  status = s;
  emit();
}
function setProgress(p) {
  progress = p;
  emit();
}

export function onMaiaStatus(cb) {
  listeners.add(cb);
  cb(status, progress); // fire immediately with current state
  return () => listeners.delete(cb);
}
export function getMaiaStatus() {
  return { status, progress };
}

function ensureWorker() {
  if (worker) return;
  try {
    worker = new Worker(`${process.env.PUBLIC_URL}/maia-worker.js`);
  } catch {
    setStatus('error');
    return;
  }
  worker.onmessage = (e) => {
    const msg = e.data;
    switch (msg.type) {
      case 'status':
        setStatus(msg.status);
        break;
      case 'progress':
        setProgress(msg.progress);
        break;
      case 'error':
        if (msg.id !== undefined && pending.has(msg.id)) {
          pending.get(msg.id).reject(new Error(msg.message));
          pending.delete(msg.id);
        } else {
          setStatus('error');
        }
        break;
      case 'inference-result': {
        const p = pending.get(msg.id);
        if (p) {
          p.resolve({
            logitsMove: new Float32Array(msg.logitsMove),
            logitsValue: new Float32Array(msg.logitsValue),
          });
          pending.delete(msg.id);
        }
        break;
      }
      default:
        break;
    }
  };
  worker.onerror = () => setStatus('error');
  worker.postMessage({ type: 'init', modelUrl: MODEL_URL, modelVersion: MODEL_VERSION });
}

// Warm up the worker (loads from IndexedDB cache if present — no network).
export function initMaia() {
  ensureWorker();
}

// Resolve true once the model is ready to run. allowDownload permits the
// one-time ~44MB network fetch (only attempted when online).
export function ensureMaiaReady({ allowDownload } = {}) {
  ensureWorker();
  if (status === 'ready') return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    let off = () => {};
    const finish = (v) => {
      if (settled) return;
      settled = true;
      off();
      resolve(v);
    };
    off = onMaiaStatus((s) => {
      if (s === 'ready') finish(true);
      else if (s === 'error') finish(false);
      else if (s === 'no-cache') {
        if (allowDownload && navigator.onLine && worker) worker.postMessage({ type: 'download' });
        else finish(false);
      }
      // 'loading' / 'downloading' -> keep waiting
    });
  });
}

function runInference(boardTokens, eloSelf, eloOppo) {
  return new Promise((resolve, reject) => {
    if (!worker) return reject(new Error('Maia worker not ready'));
    const id = reqId++;
    pending.set(id, { resolve, reject });
    const eloSelfs = Float32Array.from([eloSelf]);
    const eloOppos = Float32Array.from([eloOppo]);
    worker.postMessage(
      {
        type: 'inference',
        id,
        tokens: boardTokens.buffer,
        eloSelfs: eloSelfs.buffer,
        eloOppos: eloOppos.buffer,
        batchSize: 1,
      },
      [boardTokens.buffer, eloSelfs.buffer, eloOppos.buffer],
    );
  });
}

// Pick a move from Maia's human move-probability distribution. Sampling (not
// always the top move) is what gives the natural, human-like variety.
function sampleFromPolicy(policy) {
  const entries = Object.entries(policy);
  if (!entries.length) return null;
  const r = Math.random();
  let acc = 0;
  for (const [uci, p] of entries) {
    acc += p;
    if (r <= acc) return uci;
  }
  return entries[0][0];
}

// Returns a UCI move string ("e2e4", "e7e8q") for the side to move, or null.
// eloSelf = the engine's playing strength; eloOppo = (roughly) her strength.
export async function maiaMove(fen, eloSelf, eloOppo) {
  const { boardTokens, legalMoves } = preprocessMaia3(fen);
  const { logitsMove, logitsValue } = await runInference(boardTokens, eloSelf, eloOppo);
  const { policy } = decodeMaia3(fen, logitsMove, logitsValue, legalMoves);
  return sampleFromPolicy(policy);
}

// The MOST-LIKELY human move (argmax of the policy) — used for Spar coach hints,
// where we want the single best human-level suggestion, not a sampled one.
export async function maiaBestMove(fen, eloSelf, eloOppo) {
  const { boardTokens, legalMoves } = preprocessMaia3(fen);
  const { logitsMove, logitsValue } = await runInference(boardTokens, eloSelf, eloOppo);
  const { policy } = decodeMaia3(fen, logitsMove, logitsValue, legalMoves);
  let best = null;
  let bestP = -1;
  for (const [uci, p] of Object.entries(policy)) {
    if (p > bestP) {
      bestP = p;
      best = uci;
    }
  }
  return best;
}
