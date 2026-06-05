// Tiny synthesized piece sounds via the Web Audio API — no audio files, so it
// stays light and works offline. A soft "tock" when a piece lands, a sharper
// "clack" (with a little noise) for a capture.

let ctx = null;
let muted = localStorage.getItem('chess-cadet-sound') === 'off';

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// Resume/create the context on the first user interaction so later sounds
// (incl. the opponent's, which aren't from a direct gesture) are allowed.
function unlock() {
  ac();
  window.removeEventListener('pointerdown', unlock);
  window.removeEventListener('keydown', unlock);
}
if (typeof window !== 'undefined') {
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });
}

export function isMuted() {
  return muted;
}
export function setMuted(m) {
  muted = m;
  localStorage.setItem('chess-cadet-sound', m ? 'off' : 'on');
}

function thock({ freq = 190, dur = 0.08, type = 'sine', gain = 0.16, drop = 0.55 }) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(Math.max(40, freq * drop), t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noiseClick({ dur = 0.045, gain = 0.12, hp = 900 } = {}) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime;
  const buffer = a.createBuffer(1, Math.max(1, Math.floor(a.sampleRate * dur)), a.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = a.createBufferSource();
  src.buffer = buffer;
  const g = a.createGain();
  g.gain.value = gain;
  const filter = a.createBiquadFilter();
  filter.type = 'highpass';
  filter.frequency.value = hp;
  src.connect(filter).connect(g).connect(a.destination);
  src.start(t);
}

function tone({ freq, dur = 0.12, type = 'sine', gain = 0.12, when = 0 }) {
  const a = ac();
  if (!a) return;
  const t = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + dur + 0.02);
}

export function playMove() {
  if (muted) return;
  thock({ freq: 210, dur: 0.07, type: 'sine', gain: 0.15, drop: 0.6 });
}

// A bright rising two-note chime when a move gives check.
export function playCheck() {
  if (muted) return;
  tone({ freq: 988, dur: 0.12, gain: 0.12, when: 0 });
  tone({ freq: 1319, dur: 0.14, gain: 0.11, when: 0.09 });
}

// A short, triumphant rising fanfare for checkmate (C–E–G–C arpeggio).
export function playCheckmate() {
  if (muted) return;
  const seq = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  seq.forEach((f, i) =>
    tone({
      freq: f,
      dur: i === seq.length - 1 ? 0.3 : 0.12,
      gain: 0.15,
      type: 'triangle',
      when: i * 0.085,
    }),
  );
}

export function playCapture() {
  if (muted) return;
  thock({ freq: 150, dur: 0.09, type: 'triangle', gain: 0.18, drop: 0.42 });
  noiseClick({ dur: 0.05, gain: 0.13 });
}
