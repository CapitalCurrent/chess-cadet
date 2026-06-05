// Board color schemes (light square / dark square).
export const BOARD_THEMES = [
  { id: 'wood',  name: 'Wood',   light: '#eecfa0', dark: '#a9743f' },
  { id: 'forest',name: 'Forest', light: '#eeeed2', dark: '#769656' },
  { id: 'ocean', name: 'Ocean',  light: '#dbe7f0', dark: '#4b7399' },
  { id: 'slate', name: 'Slate',  light: '#cdd5de', dark: '#5b6b7d' },
  { id: 'candy', name: 'Candy',  light: '#ffe3f1', dark: '#e06aa0' },
  { id: 'night', name: 'Night',  light: '#7886a8', dark: '#333f5c' },
];

export function getBoardTheme(id) {
  return BOARD_THEMES.find((t) => t.id === id) || BOARD_THEMES[0];
}
