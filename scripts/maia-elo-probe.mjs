// Maia Elo-conditioning probe — verifies the rating slider actually changes
// the model's behavior. Runs the real ONNX model (same file the app ships) on
// fixed positions at different Elo inputs and compares the move distributions.
//
//   node scripts/maia-elo-probe.mjs
//
// PASS = distributions differ meaningfully across Elo (the slider works).
// FAIL = near-identical outputs (Elo input is being ignored).
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Chess } from 'chess.js';
import * as ort from 'onnxruntime-web';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const allMoves = JSON.parse(fs.readFileSync(path.join(root, 'src/engine/data/all_moves_maia3.json'), 'utf8'));
const allMovesRev = JSON.parse(fs.readFileSync(path.join(root, 'src/engine/data/all_moves_maia3_reversed.json'), 'utf8'));

// ── Board encoding (mirrors src/engine/maiaTensor.js exactly) ────────────────
function mirrorSquare(sq) {
  return sq[0] + (9 - parseInt(sq[1], 10));
}
function mirrorMove(uci) {
  const promo = uci.length > 4 ? uci.slice(4) : '';
  return mirrorSquare(uci.slice(0, 2)) + mirrorSquare(uci.slice(2, 4)) + promo;
}
function swapColorsInRank(rank) {
  let out = '';
  for (const ch of rank) {
    if (/[A-Z]/.test(ch)) out += ch.toLowerCase();
    else if (/[a-z]/.test(ch)) out += ch.toUpperCase();
    else out += ch;
  }
  return out;
}
function swapCastlingRights(c) {
  if (c === '-') return '-';
  const r = new Set(c.split(''));
  const s = new Set();
  if (r.has('K')) s.add('k');
  if (r.has('Q')) s.add('q');
  if (r.has('k')) s.add('K');
  if (r.has('q')) s.add('Q');
  let out = '';
  for (const ch of ['K', 'Q', 'k', 'q']) if (s.has(ch)) out += ch;
  return out || '-';
}
function mirrorFEN(fen) {
  const [pos, active, castling, ep, half, full] = fen.split(' ');
  return [
    pos.split('/').slice().reverse().map(swapColorsInRank).join('/'),
    active === 'w' ? 'b' : 'w',
    swapCastlingRights(castling),
    ep !== '-' ? mirrorSquare(ep) : '-',
    half,
    full,
  ].join(' ');
}
function boardToTokens(fen) {
  const types = ['P', 'N', 'B', 'R', 'Q', 'K', 'p', 'n', 'b', 'r', 'q', 'k'];
  const t = new Float32Array(64 * 12);
  const rows = fen.split(' ')[0].split('/');
  for (let rank = 0; rank < 8; rank++) {
    const row = 7 - rank;
    let file = 0;
    for (const ch of rows[rank]) {
      if (isNaN(parseInt(ch, 10))) {
        const i = types.indexOf(ch);
        if (i >= 0) t[(row * 8 + file) * 12 + i] = 1.0;
        file += 1;
      } else file += parseInt(ch, 10);
    }
  }
  return t;
}
function preprocess(fen) {
  let board = new Chess(fen);
  if (fen.split(' ')[1] === 'b') board = new Chess(mirrorFEN(board.fen()));
  const tokens = boardToTokens(board.fen());
  const legal = new Float32Array(Object.keys(allMoves).length);
  for (const m of board.moves({ verbose: true })) {
    const idx = allMoves[m.from + m.to + (m.promotion || '')];
    if (idx !== undefined) legal[idx] = 1.0;
  }
  return { tokens, legal };
}
function decode(fen, logitsMove, logitsValue, legal) {
  const black = fen.split(' ')[1] === 'b';
  const maxW = Math.max(logitsValue[0], logitsValue[1], logitsValue[2]);
  const e = [0, 1, 2].map((i) => Math.exp(logitsValue[i] - maxW));
  const sumE = e[0] + e[1] + e[2];
  let winProb = (e[2] + 0.5 * e[1]) / sumE;
  if (black) winProb = 1 - winProb;

  const idxs = [];
  for (let i = 0; i < legal.length; i++) if (legal[i] > 0) idxs.push(i);
  const logits = idxs.map((i) => logitsMove[i]);
  const maxL = Math.max(...logits);
  const exps = logits.map((l) => Math.exp(l - maxL));
  const sum = exps.reduce((a, b) => a + b, 0);
  const policy = {};
  idxs.forEach((idx, i) => {
    let m = allMovesRev[idx];
    if (black) m = mirrorMove(m);
    policy[m] = exps[i] / sum;
  });
  return { policy, winProb };
}

// ── Probe ────────────────────────────────────────────────────────────────────
// `expectDiff` marks positions where Elo SHOULD change the policy. The forced
// capture is a control: every rating takes a free queen, so a near-identical
// policy there is correct behavior, not a dead slider.
const POSITIONS = [
  {
    name: 'Quiet opening (Italian, Black to move after 3.Bc4)',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3',
    expectDiff: true,
  },
  {
    name: 'Scholar-mate threat (Black must defend f7)',
    fen: 'r1bqkbnr/pppp1ppp/2n5/4p3/2B1P3/5Q2/PPPP1PPP/RNB1K1NR b KQkq - 3 3',
    expectDiff: true,
  },
  {
    name: 'Free queen on offer (control — forced move, Elo should NOT matter)',
    fen: 'rnb1kbnr/ppp1pppp/8/3q4/8/2N5/PPPP1PPP/R1BQKBNR w KQkq - 0 3',
    expectDiff: false,
  },
];
const ELOS = [1100, 1900];

function topK(policy, k = 5) {
  return Object.entries(policy).sort((a, b) => b[1] - a[1]).slice(0, k);
}
function tvd(p, q) {
  const keys = new Set([...Object.keys(p), ...Object.keys(q)]);
  let d = 0;
  for (const k of keys) d += Math.abs((p[k] || 0) - (q[k] || 0));
  return d / 2;
}
function sanify(fen, uci) {
  try {
    const m = new Chess(fen).move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] });
    return m ? m.san : uci;
  } catch {
    return uci;
  }
}

const modelBuf = fs.readFileSync(path.join(root, 'public/maia/maia3_simplified.onnx'));
const session = await ort.InferenceSession.create(new Uint8Array(modelBuf));
console.log(`Model loaded (${(modelBuf.length / 1e6).toFixed(1)} MB). Inputs: ${session.inputNames.join(', ')}\n`);

let allPass = true;
for (const pos of POSITIONS) {
  const { tokens, legal } = preprocess(pos.fen);
  const results = {};
  for (const elo of ELOS) {
    const feeds = {
      tokens: new ort.Tensor('float32', tokens, [1, 64, 12]),
      elo_self: new ort.Tensor('float32', Float32Array.from([elo]), [1]),
      elo_oppo: new ort.Tensor('float32', Float32Array.from([elo]), [1]),
    };
    const out = await session.run(feeds);
    results[elo] = decode(pos.fen, out.logits_move.data, out.logits_value.data, legal);
  }
  const dist = tvd(results[ELOS[0]].policy, results[ELOS[1]].policy);
  const pass = pos.expectDiff ? dist > 0.05 : dist < 0.1;
  allPass = allPass && pass;
  console.log(`── ${pos.name}`);
  for (const elo of ELOS) {
    const r = results[elo];
    const top = topK(r.policy)
      .map(([uci, p]) => `${sanify(pos.fen, uci)} ${(p * 100).toFixed(1)}%`)
      .join('  ·  ');
    console.log(`   Elo ${elo}:  win ${(r.winProb * 100).toFixed(1)}%  →  ${top}`);
  }
  const verdict = pos.expectDiff
    ? pass ? '✓ Elo input changes behavior' : '✗ NEAR-IDENTICAL — slider may be dead'
    : pass ? '✓ stable on a forced move (as it should be)' : '✗ unstable on a forced move — encoding suspect';
  console.log(`   Policy difference (TVD): ${(dist * 100).toFixed(1)}%  ${verdict}\n`);
}
console.log(allPass ? 'RESULT: PASS — the rating slider meaningfully conditions Maia.' : 'RESULT: FAIL — see ✗ lines above.');
