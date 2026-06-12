// Coach's Notebook — a persistent, per-player bank of HER OWN mistakes.
// The live coach (Spar) and Game Review deposit positions where she blundered
// or missed a tactic; the Fix Mistakes mode replays them as puzzles. A position
// retires after RETIRE_SOLVES clean solves (no hints, no wrong tries) — the
// same "prove it twice" bar as line mastery.
//
// Entry shape:
//   { id, createdAt, fen, played: {san,uci}, best: {san,uci}, label, motif,
//     lossCp, text, source: 'coach'|'review',
//     solves, attempts, lastSeen, retired }

const BASE = 'chess-cadet-notebook';
const MAX_ENTRIES = 120; // cap storage; oldest retired entries are dropped first
const RETIRE_SOLVES = 2;

export function notebookKey(profileId) {
  return profileId ? `${BASE}::${profileId}` : BASE;
}

function read(profileId) {
  try {
    const data = JSON.parse(localStorage.getItem(notebookKey(profileId)));
    return data && Array.isArray(data.mistakes) ? data : { mistakes: [] };
  } catch {
    return { mistakes: [] };
  }
}

function write(profileId, data) {
  try {
    localStorage.setItem(notebookKey(profileId), JSON.stringify(data));
  } catch {
    /* ignore (storage full / private mode) */
  }
}

function newId() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Add one mistake. Deduped on (position, her move) so the live coach and a
// later Game Review of the same game can't double-deposit. Returns true if added.
export function addMistake(profileId, entry) {
  if (!entry || !entry.fen || !entry.played || !entry.best) return false;
  const data = read(profileId);
  const key = entry.fen + '|' + entry.played.uci;
  if (data.mistakes.some((m) => m.fen + '|' + m.played.uci === key)) return false;
  data.mistakes.push({
    id: newId(),
    createdAt: Date.now(),
    solves: 0,
    attempts: 0,
    lastSeen: null,
    retired: false,
    ...entry,
  });
  if (data.mistakes.length > MAX_ENTRIES) {
    // Drop retired first (already mastered), then the very oldest.
    const retired = data.mistakes.filter((m) => m.retired).sort((a, b) => a.createdAt - b.createdAt);
    const victim = retired[0] || data.mistakes.slice().sort((a, b) => a.createdAt - b.createdAt)[0];
    data.mistakes = data.mistakes.filter((m) => m.id !== victim.id);
  }
  write(profileId, data);
  return true;
}

export function activeMistakes(profileId) {
  return read(profileId).mistakes.filter((m) => !m.retired);
}

export function notebookCount(profileId) {
  return activeMistakes(profileId).length;
}

// The practice queue: never-seen positions first (oldest deposit first), then
// least-recently practiced — a light spaced-repetition order.
export function puzzleQueue(profileId) {
  return activeMistakes(profileId)
    .slice()
    .sort((a, b) => (a.lastSeen || 0) - (b.lastSeen || 0) || a.createdAt - b.createdAt);
}

// Record a practice attempt. Only a CLEAN solve (right move, no hints, no wrong
// tries) counts toward retiring the position.
export function recordAttempt(profileId, id, { solved, clean } = {}) {
  const data = read(profileId);
  const m = data.mistakes.find((x) => x.id === id);
  if (!m) return;
  m.attempts += 1;
  m.lastSeen = Date.now();
  if (solved && clean) {
    m.solves += 1;
    if (m.solves >= RETIRE_SOLVES) m.retired = true;
  }
  write(profileId, data);
}

export function clearNotebook(profileId) {
  try {
    localStorage.removeItem(notebookKey(profileId));
  } catch {
    /* ignore */
  }
}
