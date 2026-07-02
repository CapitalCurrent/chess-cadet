// Endgame School progress — per-profile, localStorage.
// Shape: { stages: { [stageId]: { wins, tries } } }

const BASE = 'chess-cadet-endgamecourse';

export function endgameCourseKey(profileId) {
  return profileId ? `${BASE}::${profileId}` : BASE;
}

function read(profileId) {
  try {
    const data = JSON.parse(localStorage.getItem(endgameCourseKey(profileId)));
    if (data && data.stages) return data;
  } catch {
    /* fresh */
  }
  return { stages: {} };
}

function write(profileId, data) {
  try {
    localStorage.setItem(endgameCourseKey(profileId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

export function getEndgameCourseProgress(profileId) {
  return read(profileId);
}

export function recordEndgameStageRun(profileId, stageId, won) {
  const d = read(profileId);
  const s = d.stages[stageId] || { wins: 0, tries: 0 };
  s.tries += 1;
  if (won) s.wins += 1;
  d.stages[stageId] = s;
  write(profileId, d);
}
