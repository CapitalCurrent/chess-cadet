// Tactics School progress — per-profile, localStorage.
// Shape: { solved: [positionId] }  (mirrors checkmateProgress)

const BASE = 'chess-cadet-tactics';

export function tacticsKey(profileId) {
  return profileId ? `${BASE}::${profileId}` : BASE;
}

function read(profileId) {
  try {
    const data = JSON.parse(localStorage.getItem(tacticsKey(profileId)));
    if (data && Array.isArray(data.solved)) return data;
  } catch {
    /* fresh */
  }
  return { solved: [] };
}

function write(profileId, data) {
  try {
    localStorage.setItem(tacticsKey(profileId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getTacticsProgress(profileId) {
  return read(profileId);
}

export function recordTacticSolve(profileId, positionId) {
  const d = read(profileId);
  if (!d.solved.includes(positionId)) {
    d.solved.push(positionId);
    write(profileId, d);
  }
}
