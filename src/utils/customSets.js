// Custom chess piece sets imported from .chessset.json bundles (made by the CapitalCurrent Image
// Studio chess generator). Stored in IndexedDB; rendered like any built-in set via a per-piece data-URI
// map. Bundle = { format:'chessset.v1', name, theme, createdAt, pieces:{ wK,wQ,wR,wB,wN,wP,bK..bP } }.
import React from 'react';

const DB = 'chess-cadet-sets';
const STORE = 'sets';
const TYPE = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };
const KEYS = ['wK', 'wQ', 'wR', 'wB', 'wN', 'wP', 'bK', 'bQ', 'bR', 'bB', 'bN', 'bP'];

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllSets() {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function putSet(record) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).put(record);
    t.oncomplete = () => resolve(record);
    t.onerror = () => reject(t.error);
  });
}

export async function deleteSet(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const t = db.transaction(STORE, 'readwrite');
    t.objectStore(STORE).delete(id);
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
  });
}

const slug = (s) => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'set';

// Validate + normalize a bundle into a stored record (keeps only the 12 known piece keys).
export function parseBundle(json) {
  const b = typeof json === 'string' ? JSON.parse(json) : json;
  if (!b || typeof b !== 'object' || !b.pieces) throw new Error('That is not a chess set file.');
  const missing = KEYS.filter((k) => !b.pieces[k]);
  if (missing.length) throw new Error('Missing pieces: ' + missing.join(', '));
  const stamp = (b.createdAt || '').replace(/\D/g, '').slice(0, 14) || String(Date.now());
  const pieces = {};
  KEYS.forEach((k) => { pieces[k] = b.pieces[k]; });
  return {
    id: 'custom-' + slug(b.name || b.theme) + '-' + stamp,
    name: b.name || 'Custom Set',
    theme: b.theme || '',
    createdAt: b.createdAt || '',
    pieces,
  };
}

// --- in-memory registry of renderable custom sets (so getPieceSet can resolve a custom id) ----
const renderables = new Map();

export function registerSet(record) {
  const r = {
    id: record.id,
    name: record.name,
    custom: true,
    previewSrc: record.pieces.wN,
    render: (color, type) =>
      React.createElement('img', {
        src: record.pieces[color + TYPE[type]],
        alt: '',
        draggable: false,
        className: 'w-full h-full select-none',
        style: { pointerEvents: 'none' },
      }),
  };
  renderables.set(record.id, r);
  return r;
}

export function unregisterSet(id) { renderables.delete(id); }
export function getCustomRenderable(id) { return renderables.get(id) || null; }
export function customRenderables() { return [...renderables.values()]; }
