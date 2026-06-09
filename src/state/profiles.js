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

// Heraldic identity: a charge (the shield emblem) + a tint (the shield metal).
// Charges are chess/heraldic Unicode glyphs (filled silhouettes) so the crest
// renderer can metal-fill them. Tints carry their own 3-stop gradient so each
// shield looks like brushed metal, not a flat color.
export const CHARGES = [
  { id: 'knight', glyph: '♞', label: 'knight' },
  { id: 'king', glyph: '♚', label: 'king' },
  { id: 'queen', glyph: '♛', label: 'queen' },
  { id: 'rook', glyph: '♜', label: 'rook' },
  { id: 'bishop', glyph: '♝', label: 'bishop' },
  { id: 'pawn', glyph: '♟', label: 'pawn' },
  { id: 'star', glyph: '★', label: 'star', size: 40 },
  { id: 'fleur', glyph: '⚜︎', label: 'fleur-de-lis', size: 40 },
];

export const TINTS = [
  { id: 'steel', name: 'Steel', light: '#7fa8d0', base: '#4f7ba6', dark: '#2f4d6e' },
  { id: 'silver', name: 'Silver', light: '#eef1f5', base: '#c7ccd4', dark: '#8b919b' },
  { id: 'crimson', name: 'Crimson', light: '#d36b6b', base: '#a23b3b', dark: '#6e2424' },
  { id: 'emerald', name: 'Emerald', light: '#6fc79a', base: '#3f8d63', dark: '#245a3d' },
  { id: 'amethyst', name: 'Amethyst', light: '#a98fd0', base: '#6b4f9e', dark: '#43306b' },
  { id: 'amber', name: 'Amber', light: '#e8c06a', base: '#c8882f', dark: '#8c5a1c' },
  { id: 'cyan', name: 'Cyan', light: '#6fe6ff', base: '#00aecb', dark: '#066b80' },
  { id: 'onyx', name: 'Onyx', light: '#4a4f57', base: '#25282e', dark: '#121317' },
];

const DEFAULT_CHARGE = 'knight';
const DEFAULT_TINT = 'steel';

// Resolve a charge by id; tolerate a raw glyph/emoji (legacy avatar field).
export function getCharge(idOrGlyph) {
  const found = CHARGES.find((c) => c.id === idOrGlyph);
  if (found) return found;
  if (typeof idOrGlyph === 'string' && idOrGlyph) return { id: 'custom', glyph: idOrGlyph, label: 'crest', size: 40 };
  return CHARGES[0];
}
// Resolve a tint by id; tolerate a raw hex (legacy color field) as a flat tint.
export function getTint(idOrHex) {
  const found = TINTS.find((t) => t.id === idOrHex);
  if (found) return found;
  if (typeof idOrHex === 'string' && idOrHex.startsWith('#')) {
    return { id: 'custom', name: 'Custom', light: idOrHex, base: idOrHex, dark: idOrHex };
  }
  return TINTS[0];
}

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
    (name, charge, tint) => {
      const profile = {
        id: newId(),
        name: cleanName(name),
        charge: charge || DEFAULT_CHARGE,
        tint: tint || DEFAULT_TINT,
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
