import { useEffect, useState } from 'react';

// App chrome themes (distinct from board/piece sets). Each is a token swap in
// index.css under html[data-theme="id"]. Swatch = [bg, metal/accent, glow].
export const APP_THEMES = [
  { id: 'neon', name: 'Neon Grid', blurb: 'Tron × dragon', swatch: ['#0b0c10', '#00dcff', '#00dcff'] },
  { id: 'silver', name: 'Black & Silver', blurb: 'Torchlit metal', swatch: ['#0a0b0d', '#d8dde6', '#e7a74f'] },
  { id: 'obsidian', name: 'Obsidian', blurb: 'Silver + cyan', swatch: ['#0a0b0d', '#d8dde6', '#00dcff'] },
];

const KEY = 'chess-cadet-apptheme';
const DEFAULT = 'neon';

export function getStoredTheme() {
  try {
    const t = localStorage.getItem(KEY);
    return APP_THEMES.some((x) => x.id === t) ? t : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

// Applies the theme to <html data-theme> and persists it. A matching inline
// script in index.html sets the attribute pre-render to avoid a flash.
export function useAppTheme() {
  const [theme, setTheme] = useState(getStoredTheme);
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);
  return [theme, setTheme];
}
