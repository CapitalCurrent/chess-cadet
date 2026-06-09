import React from 'react';
import CoatOfArms from '../CoatOfArms';

// Brand mark — a knight crest that follows the active theme (the rim glows cyan
// in neon, silver in black-&-silver, etc.). No baked-in color, so it never
// clashes with a theme. A Grok dragon mascot can replace the crest later.
export default function Logo({ compact = false, version }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <CoatOfArms charge="knight" tint="onyx" size={34} />
      {!compact && (
        <div className="leading-tight min-w-0">
          <div className="font-round font-extrabold text-frost text-lg md:text-xl truncate">
            Chess Lair
          </div>
          {version && (
            <div className="text-[10px] font-bold text-frost-dim/70 -mt-0.5">v{version}</div>
          )}
        </div>
      )}
    </div>
  );
}
