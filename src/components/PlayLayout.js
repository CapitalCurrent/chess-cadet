import React from 'react';

// Responsive shell for the trainer/game screens — an LMS-style frame.
//  - Phone: single column (rail content is shown inline by each screen, then
//    board, then controls) — clean and unchanged in spirit.
//  - Desktop (lg+): a left RAIL (course outline / game setup) · big board +
//    scrubber · controls panel · move-log column. The rail makes the app's
//    structure always visible and uses the wide screen instead of wasting it.
//  - Maximize (focus): the rail and move-log hide so the board can grow, while
//    the controls panel stays so play/drilling is still functional.
export default function PlayLayout({ rail, board, panel, history, boardFooter, focus = false }) {
  return (
    <div
      className={`w-full px-3 mx-auto max-w-md md:max-w-6xl ${
        focus ? 'xl:max-w-[1760px]' : 'xl:max-w-[1760px]'
      }`}
    >
      <div className="md:flex md:items-stretch md:justify-center md:gap-5 lg:gap-6">
        {/* Left rail — desktop only; on phone each screen renders it inline. */}
        {rail && !focus && (
          <aside className="hidden lg:block lg:w-60 xl:w-64 md:shrink-0 self-start">{rail}</aside>
        )}

        {/* Board + scrubber */}
        <div className="flex flex-col items-center mb-3 md:mb-0 md:shrink-0">
          {board}
          {boardFooter && <div className="mt-2 w-full">{boardFooter}</div>}
        </div>

        {/* Active step / controls / keypad (stays tall so the keypad pins to the board's lower edge) */}
        <div className={`md:flex md:flex-col md:flex-1 md:min-w-[300px] ${focus ? 'md:max-w-sm' : 'md:max-w-md'}`}>{panel}</div>

        {/* Move log column */}
        {history && !focus && (
          <aside className="cc-log-sidebar md:shrink-0 md:w-56 lg:w-64 self-start">{history}</aside>
        )}
      </div>
    </div>
  );
}
