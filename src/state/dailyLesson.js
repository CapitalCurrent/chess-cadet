// Today's Lesson — a teacher-style daily session assembled from what SHE needs:
//   1. Fix up to 2 Coach's Notebook positions (her own past mistakes)
//   2. Practice the rustiest unlocked course (oldest lastPracticed)
//   3. Play a full game with Coach on
// Completion is tracked per profile per LOCAL calendar day (local date keys,
// never UTC — the day must roll at her midnight). The plan adapts: no notebook
// step while the notebook is empty.

import { OPENINGS, isUnlocked } from '../data/openings';
import { notebookCount } from './notebook';

const BASE = 'chess-cadet-dailylesson';
const PUZZLE_TARGET = 2;

export function lessonKey(profileId) {
  return profileId ? `${BASE}::${profileId}` : BASE;
}

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function read(profileId) {
  try {
    const data = JSON.parse(localStorage.getItem(lessonKey(profileId)));
    if (data && data.date === todayKey()) return data;
  } catch {
    /* fall through to a fresh day */
  }
  return { date: todayKey(), puzzles: 0, line: false, game: false };
}

function write(profileId, data) {
  try {
    localStorage.setItem(lessonKey(profileId), JSON.stringify(data));
  } catch {
    /* ignore */
  }
}

// Activity hooks call this: kind = 'puzzle' (one notebook solve) | 'line'
// (completed a Learn/Drill run) | 'game' (finished a real engine game).
export function recordLessonEvent(profileId, kind) {
  if (!profileId) return;
  const d = read(profileId);
  if (kind === 'puzzle') d.puzzles += 1;
  else if (kind === 'line') d.line = true;
  else if (kind === 'game') d.game = true;
  else return;
  write(profileId, d);
}

// The course most in need of practice: unlocked, oldest lastPracticed.
// Never-practiced counts as oldest — learning it IS the practice.
function rustyCourse(progress) {
  let best = null;
  let bestT = Infinity;
  for (const o of OPENINGS) {
    if (!isUnlocked(progress, o)) continue;
    const m = progress && progress.mastery && progress.mastery[o.id];
    const t = (m && m.lastPracticed) || 0;
    if (t < bestT) {
      bestT = t;
      best = o;
    }
  }
  return best;
}

// Build today's plan + live completion state for the Home card.
// Returns { steps: [{id, icon, label, done, progress?, courseId?}], complete }.
export function getDailyLesson(profileId, progress) {
  const d = read(profileId);
  const nb = notebookCount(profileId);
  const steps = [];

  if (nb > 0 || d.puzzles > 0) {
    const target = Math.min(PUZZLE_TARGET, Math.max(nb, d.puzzles, 1));
    steps.push({
      id: 'puzzles',
      icon: '📓',
      label: `Fix ${target} notebook position${target > 1 ? 's' : ''}`,
      done: d.puzzles >= target,
      progress: `${Math.min(d.puzzles, target)}/${target}`,
    });
  }

  const course = rustyCourse(progress);
  if (course) {
    steps.push({
      id: 'line',
      icon: course.icon,
      label: `Practice the ${course.name}`,
      done: d.line,
      courseId: course.id,
    });
  }

  steps.push({ id: 'game', icon: '⚔️', label: 'Play a game with Coach on', done: d.game });

  return { steps, complete: steps.length > 0 && steps.every((s) => s.done) };
}
