import React from 'react';

// Responsive shell for the trainer/game screens.
//  - Phone: single column (board on top, controls below) — unchanged feel.
//  - Desktop (md+): two columns — a big board on the left, a compact control
//    panel on the right, so we stop wasting the wide empty margins.
export default function PlayLayout({ board, panel }) {
  return (
    <div className="w-full px-3 mx-auto max-w-md md:max-w-5xl">
      <div className="md:flex md:items-start md:justify-center md:gap-6">
        <div className="flex justify-center mb-3 md:mb-0 md:shrink-0">{board}</div>
        <div className="md:flex-1 md:min-w-[300px] md:max-w-md">{panel}</div>
      </div>
    </div>
  );
}
