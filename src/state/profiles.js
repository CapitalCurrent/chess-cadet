import { useCallback, useState } from 'react';

// Local multi-profile: each person on the device gets their OWN saved progress
// and saved Play game. Everything lives in localStorage (no backend yet) under a
// single registry; per-player data is namespaced by profile id. Cosmetic/device
// settings (piece set, board theme, coach, etc.) stay shared device-wide on
// purpose — only learning progress + the in-progress game are per player.

const KEY = 'chess-cadet-profiles-v1';

// Keys whose data is owned by a single player. Namespaced as `${base}::${id}`.
const PROGRESS_BASE = 'chess-cadet-progress-v1';
const PLAYGAME_BASE = 'chess-cadet-playgame';

// Kid-friendly identity options for the create screen.
export const AVATARS = ['🐉', '🦄', '🐯', '🦁', '🐲', '🦖', '🐼', '🦊', '🐸', '🦉', '🐺', '🐱'];
export const COLORS = ['#f6c544', '#5bbf6e', '#5aa9e6', '#e06ab0', '#b07ce0', '#e87b4a'];

// localStorage key holding `profileId`'s learning progress. With no id we fall
// back to the original un-namespaced bucket (pre-multi-profile saves).
export function progressKey(profileId) {
  return profileId ? `${PROGRESS_BASE}::${profileId}` : PROGRESS_BASE;
}
// localStorage key holding `profileId`'s saved Play-vs-computer game.
export function playGameKey(profileId) {
  return profileId ? `${PLAYGAME_BASE}::${profileId}` : PLAYGAME_BASE;
}

function read() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { profiles: [], activeId: null };
    const data = JSON.parse(raw);
    return {
      profiles: Array.isArray(data.profiles) ? data.profiles : [],
      activeId: data.activeId || null,
    };
  } catch {
    return { profiles: [], activeId: null };
  }
}

function write(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

function newId() {
  return 'p_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function cleanName(name, fallback = 'Player') {
  const n = (name || '').trim().slice(0, 20);
  return n || fallback;
}

// The very first player inherits any progress/game saved before multi-profile
// existed (so an upgrading user keeps their stars). Idempotent — only copies
// when the destination is empty, then clears the old un-namespaced bucket.
function migrateLegacyData(profileId) {
  try {
    const legacyProgress = localStorage.getItem(PROGRESS_BASE);
    const destProgress = progressKey(profileId);
    if (legacyProgress && destProgress !== PROGRESS_BASE && !localStorage.getItem(destProgress)) {
      localStorage.setItem(destProgress, legacyProgress);
      localStorage.removeItem(PROGRESS_BASE);
    }
    const legacyGame = localStorage.getItem(PLAYGAME_BASE);
    const destGame = playGameKey(profileId);
    if (legacyGame && destGame !== PLAYGAME_BASE && !localStorage.getItem(destGame)) {
      localStorage.setItem(destGame, legacyGame);
      localStorage.removeItem(PLAYGAME_BASE);
    }
  } catch {
    /* ignore */
  }
}

function clearProfileData(profileId) {
  try {
    localStorage.removeItem(progressKey(profileId));
    localStorage.removeItem(playGameKey(profileId));
  } catch {
    /* ignore */
  }
}

export function useProfiles() {
  const [state, setState] = useState(read);

  const persist = useCallback((updater) => {
    setState((prev) => {
      const next = typeof updater === 'function' ? updater(prev) : updater;
      write(next);
      return next;
    });
  }, []);

  const createProfile = useCallback(
    (name, avatar, color) => {
      const profile = {
        id: newId(),
        name: cleanName(name),
        avatar: avatar || AVATARS[0],
        color: color || COLORS[0],
        createdAt: Date.now(),
      };
      persist((prev) => {
        if (prev.profiles.length === 0) migrateLegacyData(profile.id);
        return { profiles: [...prev.profiles, profile], activeId: profile.id };
      });
      return profile;
    },
    [persist]
  );

  const selectProfile = useCallback(
    (id) => persist((prev) => ({ ...prev, activeId: id })),
    [persist]
  );

  const updateProfile = useCallback(
    (id, patch) =>
      persist((prev) => ({
        ...prev,
        profiles: prev.profiles.map((p) =>
          p.id === id ? { ...p, ...patch, name: patch.name != null ? cleanName(patch.name, p.name) : p.name } : p
        ),
      })),
    [persist]
  );

  const deleteProfile = useCallback(
    (id) =>
      persist((prev) => {
        clearProfileData(id);
        const profiles = prev.profiles.filter((p) => p.id !== id);
        const activeId = prev.activeId === id ? (profiles[0] ? profiles[0].id : null) : prev.activeId;
        return { profiles, activeId };
      }),
    [persist]
  );

  const activeProfile = state.profiles.find((p) => p.id === state.activeId) || null;

  return {
    profiles: state.profiles,
    activeId: state.activeId,
    activeProfile,
    createProfile,
    selectProfile,
    updateProfile,
    deleteProfile,
  };
}
