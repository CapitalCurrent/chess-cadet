import React from 'react';

// Responsive shell for the trainer/game screens — an LMS-style frame.
//  - Phone: single column (each screen renders its rail content inline, then
//    board, then controls) — clean and unchanged in spirit.
//  - Desktop (lg+): three balanced columns — a left RAIL (course outline + moves
//    / game setup + moves), the big board + scrubber, and a controls panel that
//    is vertically centered beside the board so a tall board doesn't leave a
//    void. The rail keeps the app's structure visible and uses the wide screen.
//  - Maximize (focus): the rail hides so the board can grow; the controls panel
//    stays so play/drilling is still functional.
export default function PlayLayout({ rail, board, panel, boardFooter, focus = false }) {
  return (
    <div
      className={`w-full px-3 mx-auto max-w-md md:max-w-5xl ${focus ? 'xl:max-w-[1760px]' : 'xl:max-w-[1660px]'}`}
    >
      {/* 1fr · auto · 1fr — the board is the centered anchor; the move-log rail
          and controls panel balance around it so the board sits dead-center. */}
      <div className="md:grid md:grid-cols-[1fr_auto_1fr] md:items-stretch md:gap-5 lg:gap-6">
        {/* Left rail — desktop only; justified toward the board. */}
        <aside className="hidden xl:flex xl:justify-end self-start">{!focus ? rail : null}</aside>

        {/* Board + scrubber (center) */}
        <div className="flex flex-col items-center mb-3 md:mb-0">
          {board}
          {boardFooter && <div className="mt-2 w-full">{boardFooter}</div>}
        </div>

        {/* Controls panel — vertically centered beside the board. */}
        <div className={`md:flex md:flex-col md:justify-center md:min-w-[300px] ${focus ? 'md:max-w-sm' : 'md:max-w-md'}`}>{panel}</div>
      </div>
    </div>
  );
}
