import { useCallback, useState } from 'react';

const KEY = 'chess-cadet-progress-v1';

const DEFAULT = {
  gems: 0,
  streak: 0,
  bestStreak: 0,
  stars: 0, // bonus stars (e.g. spotting a check, no-hint moves)
  completed: {}, // openingId -> times finished
};

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

  return { progress, rewardMove, breakStreak, finishLine };
}
