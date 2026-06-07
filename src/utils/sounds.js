// Tiny synthesized piece sounds via the Web Audio API — no audio files, so it
// stays light and works offline. A soft "tock" when a piece lands, a sharper
// "clack" (with a little noise) for a capture.

let ctx = null;
let muted = localStorage.getItem('chess-cadet-sound') === 'off';

// Real recorded piece sounds (lichess "standard" set) for a wooden-board feel.
// They're decoded into AudioBuffers once; if they haven't loaded (or fail), we
// fall back to the synthesized tones below — so it always works, even offline.
const SAMPLE_URLS = {
  move: `${process.env.PUBLIC_URL}/sounds/Move.mp3`,
  capture: `${process.env.PUBLIC_URL}/sounds/Capture.mp3`,
};
const samples = {};
let samplesRequested = false;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function loadSamples() {
  const a = ac();
  if (!a || samplesRequested) return;
  samplesRequested = true;
  Object.entries(SAMPLE_URLS).forEach(([name, url]) => {
    fetch(url)
      .then((r) => r.arrayBuffer())
      .then((buf) => a.decodeAudioData(buf))
      .then((b) => { samples[name] = b; })
      .catch(() => { /* keep the synthesized fallback */ });
  });
}

// Play a decoded sample if available; returns false if it isn't loaded yet.
function playBuffer(name, gain = 0.85) {
  const a = ac();
  if (!a || !samples[name]) return false;
  const src = a.createBufferSource();
  src.buffer = samples[name];
  const g = a.createGain();
  g.gain.value = gain;
  src.connect(g).connect(a.destination);
  src.start(0);
  return true;
}

// Resume/create the context on the first user interaction so later sounds
// (incl. the opponent's, which aren't from a direct gesture) are allowed. We
// also play a 1-sample silent buffer here — that fully "wakes" the audio on
// iOS Safari, which otherwise stays muted until a sound plays during a gesture.
function unlock() {
  const a = ac();
  if (a) {
    try {
      const b = a.createBuffer(1, 1, a.sampleRate);
      const s = a.createBufferSource();
      s.buffer = b;
      s.connect(a.destination);
      s.start(0);
    } catch {
      /* ignore */
    }
    loadSamples(); // now that we have a context, fetch + decode the real samples
  }
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

// A percussive wooden "knock" — a short low thump with a tiny click on top,
// so it reads as a piece tapping the board rather than a tonal beep.
function moveSound() {
  thock({ freq: 150, dur: 0.05, type: 'sine', gain: 0.22, drop: 0.5 });
  noiseClick({ dur: 0.018, gain: 0.07, hp: 2000 });
}
function captureSound() {
  thock({ freq: 110, dur: 0.08, type: 'triangle', gain: 0.24, drop: 0.4 });
  noiseClick({ dur: 0.05, gain: 0.15, hp: 1000 });
}

export function playMove() {
  if (muted) return;
  if (!playBuffer('move')) moveSound();
}

// Reports the AudioContext state for diagnostics: 'no-context' | 'suspended' |
// 'running' | 'closed' | 'unsupported'.
export function audioState() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return 'unsupported';
  if (!ctx) return 'no-context';
  return ctx.state;
}

// Plays a clear test tone IGNORING the mute flag, for the Settings button. We
// RESUME the context first and only play once it's actually running — a short
// tone scheduled while still 'suspended' plays silently.
export function playTest() {
  const a = ac();
  if (!a) return;
  const go = () => {
    loadSamples();
    if (!playBuffer('move')) moveSound();
    setTimeout(() => { if (!playBuffer('capture')) captureSound(); }, 350);
  };
  if (a.state === 'suspended') a.resume().then(go).catch(go);
  else go();
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
  if (!playBuffer('capture')) captureSound();
}
