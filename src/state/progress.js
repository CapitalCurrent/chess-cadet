import { useCallback, useState } from 'react';

const KEY = 'chess-cadet-progress-v1';

const DEFAULT = {
  gems: 0,
  streak: 0,
  bestStreak: 0,
  stars: 0, // bonus stars (e.g. spotting a check, no-hint moves)
  completed: {}, // openingId -> times finished
  mastery: {}, // openingId -> { runs, cleanRuns, lastPracticed } (legacy whole-course Drill mastery)
  lines: {}, // openingId -> { mastered: [lineId] } (Progressive Lines per-line mastery)
};

// Per-course mastery stars (0–3): 1★ drilled it, 2★ a clean run (no hints/errors),
// 3★ = mastered (two clean runs). Stars are additive — they NEVER lock or remove
// a course; 3★ just unlocks what's next. (Threshold kept kid-gentle on purpose.)
export function starsFor(progress, openingId) {
  const m = progress && progress.mastery && progress.mastery[openingId];
  if (!m || !m.runs) return 0;
  if (m.cleanRuns >= 2) return 3;
  if (m.cleanRuns >= 1) return 2;
  return 1;
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? { ...DEFAULT, ...JSON.parse(raw) } : { ...DEFAULT };
  } catch {
    return { ...DEFAULT };
  }
}

function save(p) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignore */
  }
}

export function useProgress() {
  const [progress, setProgress] = useState(loadProgress);

  const update = useCallback((fn) => {
    setProgress((prev) => {
      const next = fn(prev);
      save(next);
      return next;
    });
  }, []);

  // A correct move: +1 gem, bump streak. `bonus` stars for clean/sharp play.
  const rewardMove = useCallback(
    (bonus = 0) =>
      update((p) => {
        const streak = p.streak + 1;
        return {
          ...p,
          gems: p.gems + 1 + bonus,
          stars: p.stars + bonus,
          streak,
          bestStreak: Math.max(p.bestStreak, streak),
        };
      }),
    [update]
  );

  const breakStreak = useCallback(
    () => update((p) => ({ ...p, streak: 0 })),
    [update]
  );

  const finishLine = useCallback(
    (openingId) =>
      update((p) => ({
        ...p,
        gems: p.gems + 5, // completion bonus
        completed: {
          ...p.completed,
          [openingId]: (p.completed[openingId] || 0) + 1,
        },
      })),
    [update]
  );

  // Record a completed Drill run of a course; `clean` = no hints and no wrong
  // moves the whole way through (earns toward mastery stars).
  const recordDrillRun = useCallback(
    (openingId, clean) =>
      update((p) => {
        const m = (p.mastery && p.mastery[openingId]) || { runs: 0, cleanRuns: 0 };
        return {
          ...p,
          mastery: {
            ...p.mastery,
            [openingId]: {
              runs: m.runs + 1,
              cleanRuns: m.cleanRuns + (clean ? 1 : 0),
              lastPracticed: Date.now(),
            },
          },
        };
      }),
    [update]
  );

  // Mark one LINE of a course as mastered (a clean Drill run of that line).
  // Idempotent — re-mastering a line is a no-op.
  const masterLine = useCallback(
    (openingId, lineId) =>
      update((p) => {
        const cur = (p.lines && p.lines[openingId] && p.lines[openingId].mastered) || [];
        if (cur.includes(lineId)) return p;
        return {
          ...p,
          lines: { ...p.lines, [openingId]: { mastered: [...cur, lineId] } },
        };
      }),
    [update]
  );

  return { progress, rewardMove, breakStreak, finishLine, recordDrillRun, masterLine };
}
