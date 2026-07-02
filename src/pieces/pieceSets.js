import React from 'react';
import { renderSvgDragon } from './svgDragonSet';
import { getCustomRenderable } from '../utils/customSets';

// Piece sets. Each piece is an <img> from public/pieces/<dir>/<color><TYPE>.<ext>
// (e.g. cburnett/wN.svg). Works with SVG *or* transparent PNG, so Grok-generated
// raster art drops straight in.
//
// A set draws every piece from `dir`/`ext`, with optional per-type `overrides`
// that pull specific pieces from another folder — e.g. a novelty Dragon knight
// over an otherwise-traditional Staunton set (keeps the set looking like chess).

const TYPE = { k: 'K', q: 'Q', r: 'R', b: 'B', n: 'N', p: 'P' };

function srcFor(dir, color, type, ext) {
  return `${process.env.PUBLIC_URL}/pieces/${dir}/${color}${TYPE[type]}.${ext}`;
}

function pieceSrc(set, color, type) {
  const o = set.overrides && set.overrides[type];
  return srcFor(o?.dir || set.dir, color, type, o?.ext || set.ext);
}

function PieceImg({ src, flip }) {
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="w-full h-full select-none"
      style={{ pointerEvents: 'none', transform: flip ? 'scaleX(-1)' : undefined }}
    />
  );
}

const SETS = [
  { id: 'cburnett', name: 'Classic', dir: 'cburnett', ext: 'svg' },
  { id: 'merida', name: 'Merida', dir: 'merida', ext: 'svg' },
  { id: 'chessnut', name: 'Chessnut', dir: 'chessnut', ext: 'svg' },

  // Classic Variation: the cburnett set with hand-edited dragon deltas (flame-trident
  // king, claw-spike queen crown, scale-etched rook, flame bishop finial, horned +
  // spined knight, crested pawn). Authored as SVG in the image studio (svg_sets/
  // dragon-classic) — derivative of cburnett, so GPLv2+ (see CREDITS.md).
  { id: 'dragon-classic', name: 'Dragon Classic', dir: 'dragon-classic', ext: 'svg' },

  // --- Custom / novelty sets ---------------------------------------------
  // Full Grok-generated dragon set (all 6 pieces), sliced from the white row
  // and matched-black derived by inversion. public/pieces/dragons/*.png
  // The dragon set — chunky/bold pieces that fill the square. The pawn is
  // overridden with a distinct front-facing dragon (Grok) so it doesn't read
  // like the side-profile knight. public/pieces/dragon-pawn/*.png
  { id: 'dragons-bold', name: 'Dragons', dir: 'dragons-bold', ext: 'png',
    overrides: { p: { dir: 'dragon-pawn', ext: 'png' } } },

  // --- Clarity experiments (compare on the board, keep the winners) ----------
  // Option 1: code-drawn bold vector set — crisp + maximally differentiated.
  { id: 'dragons-svg', name: 'Dragon Bold', svg: true },
  // Option 3: clean traditional silhouettes + the ornate dragon knight signature.
  { id: 'dragons-clear', name: 'Dragon Clear', dir: 'cburnett', ext: 'svg',
    overrides: { n: { dir: 'dragon-knight-ornate', ext: 'png' } } },
  // Option 4: the ornate dragon set with the flashier Grok dragon-knight swapped in.
  { id: 'dragons-ornate', name: 'Dragon Ornate', dir: 'dragons-bold', ext: 'png',
    overrides: { p: { dir: 'dragon-pawn', ext: 'png' }, n: { dir: 'dragon-knight-ornate', ext: 'png' } } },
];

export const PIECE_SETS = SETS.map((s) => ({
  ...s,
  previewSrc: s.svg ? null : pieceSrc(s, 'w', 'n'), // white knight = the set thumbnail
  render: s.svg
    ? (color, type) => renderSvgDragon(color, type)
    : (color, type) => <PieceImg src={pieceSrc(s, color, type)} flip={s.flipPawns && type === 'p'} />,
}));

export function getPieceSet(id) {
  // custom (imported) sets live in the IndexedDB-backed registry; built-ins in PIECE_SETS
  return getCustomRenderable(id) || PIECE_SETS.find((s) => s.id === id) || PIECE_SETS[0];
}
