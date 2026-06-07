import React from 'react';

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

  // --- Custom / novelty sets ---------------------------------------------
  // Full Grok-generated dragon set (all 6 pieces), sliced from the white row
  // and matched-black derived by inversion. public/pieces/dragons/*.png
  { id: 'dragons', name: 'Dragons', dir: 'dragons', ext: 'png', scale: 1.1 },
  // Bold variant: each piece fills the square (chunkier, easiest to see).
  // flipPawns mirrors the pawns so they face opposite the knights (a quick
  // differentiation stopgap until Grok redraws a clearly distinct pawn).
  { id: 'dragons-bold', name: 'Dragons Bold', dir: 'dragons-bold', ext: 'png', flipPawns: true },
];

export const PIECE_SETS = SETS.map((s) => ({
  ...s,
  previewSrc: pieceSrc(s, 'w', 'n'), // white knight = the set thumbnail
  render: (color, type) => <PieceImg src={pieceSrc(s, color, type)} flip={s.flipPawns && type === 'p'} />,
}));

export function getPieceSet(id) {
  return PIECE_SETS.find((s) => s.id === id) || PIECE_SETS[0];
}
