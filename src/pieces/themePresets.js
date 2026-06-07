// One-tap matched themes: each bundles a piece set + a board color chosen to
// look good together. Customizing pieces/board independently still works (and
// just means no preset is "active").

export const THEME_PRESETS = [
  { id: 'dragon-wood', name: 'Dragon Wood', piece: 'dragons-bold', board: 'wood' },
  { id: 'dragon-slate', name: 'Dragon Slate', piece: 'dragons-bold', board: 'slate' },
  { id: 'dragon-night', name: 'Dragon Night', piece: 'dragons-bold', board: 'night' },
  { id: 'classic-wood', name: 'Classic Wood', piece: 'cburnett', board: 'wood' },
  { id: 'forest', name: 'Forest', piece: 'merida', board: 'forest' },
  { id: 'ocean', name: 'Ocean', piece: 'chessnut', board: 'ocean' },
];

export function activePresetId(pieceId, boardId) {
  const p = THEME_PRESETS.find((t) => t.piece === pieceId && t.board === boardId);
  return p ? p.id : null;
}
