import React from 'react';

// Responsive shell for the trainer/game screens.
//  - Phone: single column (board on top, controls below) — unchanged feel.
//  - Desktop (md+): two columns — a big board on the left, a compact control
//    panel on the right, so we stop wasting the wide empty margins.
export default function PlayLayout({ board, panel, history, focus = false }) {
  return (
    <div
      className={`w-full px-3 mx-auto max-w-md md:max-w-6xl ${
        focus ? 'xl:max-w-[1700px]' : 'xl:max-w-[1640px]'
      }`}
    >
      <div className="md:flex md:items-stretch md:justify-center md:gap-6 lg:gap-8">
        <div className="flex justify-center mb-3 md:mb-0 md:shrink-0">{board}</div>
        <div className={`md:flex md:flex-col md:flex-1 md:min-w-[320px] ${focus ? 'md:max-w-sm' : 'md:max-w-lg'}`}>{panel}</div>
        {history && (
          <aside className="cc-log-sidebar md:shrink-0 md:w-64 lg:w-72">{history}</aside>
        )}
      </div>
    </div>
  );
}
