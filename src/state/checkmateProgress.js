// Checkmate School progress — per-profile, localStorage.
// Shape: { solved: [positionId], endgames: { kq: {mates, tries}, kr: {...} } }

const BASE = 'chess-cadet-checkmates';

export function checkmatesKey(profileId) {
  return profileId ? `${BASE}::${profileId}` : BASE;
}

function read(profileId) {
  try {
    const data = JSON.parse(localStorage.getItem(checkmatesKey(profileId)));
    if (data && Array.isArray(data.solved)) return { endgames: {}, ...data };
  } catch {
    /* fresh */
  }
  return { solved: [], endgames: {} };
}

function write(profileId, data) {
  try {
    localStorage.setItem(checkmatesKey(profileId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getCheckmateProgress(profileId) {
  return read(profileId);
}

export function recordMateSolve(profileId, positionId) {
  const d = read(profileId);
  if (!d.solved.includes(positionId)) {
    d.solved.push(positionId);
    write(profileId, d);
  }
}

// won = she delivered mate; otherwise it still counts as a try.
export function recordEndgameRun(profileId, stageId, won) {
  const d = read(profileId);
  const s = d.endgames[stageId] || { mates: 0, tries: 0 };
  s.tries += 1;
  if (won) s.mates += 1;
  d.endgames[stageId] = s;
  write(profileId, d);
}
