import React, { useEffect, useState } from 'react';
import { OPENINGS, getOpening, unlockedBy } from './data/openings';
import { getPieceSet } from './pieces/pieceSets';
import { getBoardTheme } from './pieces/boardThemes';
import { useProgress } from './state/progress';
import OpeningTrainer from './components/OpeningTrainer';
import FreePlay from './components/FreePlay';
import Settings from './components/Settings';
import NotationGuide from './components/NotationGuide';
import Logo from './components/nav/Logo';
import Segmented from './components/nav/Segmented';
import OpeningPicker from './components/nav/OpeningPicker';
import BottomTabBar from './components/nav/BottomTabBar';
import {
  IconLearn,
  IconDrill,
  IconPlay,
  IconSettings,
  IconGuide,
  IconRestart,
  IconMaximize,
  IconMinimize,
  IconClose,
} from './components/icons';
import { VERSION } from './version';

// Primary modes — used by both the desktop segmented bar and the mobile tabs.
const MODES = [
  { id: 'learn', label: 'Learn', icon: <IconLearn size={22} /> },
  { id: 'drill', label: 'Drill', icon: <IconDrill size={22} /> },
  { id: 'play', label: 'Play', icon: <IconPlay size={22} /> },
];

export default function App() {
  // rewardMove/breakStreak/finishLine still drive progress silently (the gems
  // reward bar was removed from the chrome; reinstate intentionally later).
  const { progress, rewardMove, breakStreak, finishLine, recordDrillRun } = useProgress();
  const [openingId, setOpeningId] = useState(OPENINGS[0].id);
  const [mode, setMode] = useState('learn'); // learn first, then drill
  const [restart, setRestart] = useState(0);
  const [playSeed, setPlaySeed] = useState(null); // { moves, color } for Continue vs Computer
  const [masteredModal, setMasteredModal] = useState(null); // { id, unlocked: [opening] }
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [guideOpen, setGuideOpen] = useState(false);
  const [pieceSetId, setPieceSetId] = useState(
    () => localStorage.getItem('chess-cadet-pieceset') || 'cburnett'
  );
  const [boardThemeId, setBoardThemeId] = useState(
    () => localStorage.getItem('chess-cadet-boardtheme') || 'wood'
  );
  const [moveStyle, setMoveStyle] = useState(
    () => localStorage.getItem('chess-cadet-movestyle') || 'both'
  );
  const [focusBoard, setFocusBoard] = useState(
    () => localStorage.getItem('chess-cadet-focusboard') === 'on'
  );

  useEffect(() => {
    localStorage.setItem('chess-cadet-pieceset', pieceSetId);
  }, [pieceSetId]);
  useEffect(() => {
    localStorage.setItem('chess-cadet-boardtheme', boardThemeId);
  }, [boardThemeId]);
  useEffect(() => {
    localStorage.setItem('chess-cadet-movestyle', moveStyle);
  }, [moveStyle]);
  useEffect(() => {
    localStorage.setItem('chess-cadet-focusboard', focusBoard ? 'on' : 'off');
  }, [focusBoard]);

  const opening = getOpening(openingId);
  const pieceSet = getPieceSet(pieceSetId);
  const boardTheme = getBoardTheme(boardThemeId);

  // Tapping the Play tab directly = a normal game from the start (clear any seed).
  const pickMode = (id) => { if (id === 'play') setPlaySeed(null); setMode(id); setRestart((r) => r + 1); };
  const pickOpening = (id) => { setOpeningId(id); setRestart((r) => r + 1); };
  // Hand the current opening position over to Play vs the computer (Coach on).
  const continueVsComputer = (moves, color) => {
    setPlaySeed({ moves, color });
    setMode('play');
    setRestart((r) => r + 1);
  };
  // A course hit 3★ — celebrate and reveal what it unlocked.
  const handleMastered = (id) => setMasteredModal({ id, unlocked: unlockedBy(id, progress) });
  const jumpToCourse = (id) => {
    setMasteredModal(null);
    setOpeningId(id);
    setMode('learn'); // introduce the newly unlocked course in Learn
    setRestart((r) => r + 1);
  };

  return (
    <div className="min-h-screen text-frost pb-24 md:pb-10">
      {/* Header — acrylic top bar */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: 'rgba(14,23,38,0.82)',
          backdropFilter: 'blur(22px) saturate(140%)',
          WebkitBackdropFilter: 'blur(22px) saturate(140%)',
          borderBottom: '1px solid var(--edge-soft)',
        }}
      >
        <div className="max-w-md md:max-w-6xl mx-auto px-3 py-2">
          {/* Row 1: brand · (desktop modes) · tools */}
          <div className="flex items-center gap-3">
            <Logo version={VERSION} />

            {/* Modes — desktop only (mobile uses the bottom tab bar) */}
            <div className="hidden md:block flex-1 max-w-md mx-auto">
              <Segmented options={MODES} value={mode} onChange={pickMode} />
            </div>

            {/* Spacer keeps tools right-aligned on mobile */}
            <div className="flex-1 md:hidden" />

            {/* Tools */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                className="cc-icon-btn hidden md:inline-flex"
                title={focusBoard ? 'Exit big board' : 'Maximize board'}
                onClick={() => setFocusBoard((f) => !f)}
              >
                {focusBoard ? <IconMinimize /> : <IconMaximize />}
              </button>
              <button className="cc-icon-btn" title="Restart this line" onClick={() => setRestart((r) => r + 1)}>
                <IconRestart />
              </button>
              <button className="cc-icon-btn" title="Notation cheat sheet" onClick={() => setGuideOpen(true)}>
                <IconGuide />
              </button>
              <button className="cc-icon-btn" title="Settings" onClick={() => setSettingsOpen(true)}>
                <IconSettings />
              </button>
            </div>
          </div>

        </div>
      </header>

      {/* Trainer / game (key forces a clean remount on restart / mode change) */}
      <main className="pt-4">
        {mode === 'play' ? (
          <FreePlay
            key={`play-${restart}`}
            pieceSet={pieceSet}
            boardTheme={boardTheme}
            moveStyle={moveStyle}
            focusBoard={focusBoard}
            seed={playSeed}
            rewardMove={rewardMove}
          />
        ) : (
          <OpeningTrainer
            key={`${openingId}-${mode}-${restart}`}
            opening={opening}
            mode={mode}
            focusBoard={focusBoard}
            onContinue={continueVsComputer}
            openingSwitcher={<OpeningPicker value={openingId} onChange={pickOpening} progress={progress} />}
            pieceSet={pieceSet}
            boardTheme={boardTheme}
            moveStyle={moveStyle}
            progress={progress}
            rewardMove={rewardMove}
            breakStreak={breakStreak}
            finishLine={finishLine}
            recordDrillRun={recordDrillRun}
            onMastered={handleMastered}
          />
        )}
      </main>

      {/* Mobile primary navigation */}
      <BottomTabBar tabs={MODES} value={mode} onChange={pickMode} />

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        pieceSetId={pieceSetId}
        setPieceSetId={setPieceSetId}
        boardThemeId={boardThemeId}
        setBoardThemeId={setBoardThemeId}
        moveStyle={moveStyle}
        setMoveStyle={setMoveStyle}
      />

      <NotationGuide open={guideOpen} onClose={() => setGuideOpen(false)} />

      {masteredModal && (
        <div className="cc-scrim items-center p-3" onClick={() => setMasteredModal(null)}>
          <div className="cc-sheet p-5 text-center animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end -mt-2 -mr-2 mb-1">
              <button onClick={() => setMasteredModal(null)} className="cc-icon-btn" aria-label="Close">
                <IconClose size={18} />
              </button>
            </div>
            <div className="text-4xl">🏆</div>
            <div className="text-xl md:text-2xl font-extrabold text-gold mt-1">
              You mastered {getOpening(masteredModal.id).name}!
            </div>
            <div className="text-2xl tracking-[0.3em] text-gold my-2">★★★</div>

            {masteredModal.unlocked.length ? (
              <>
                <div className="text-sm text-frost-dim mb-2">🔓 You unlocked:</div>
                <div className="space-y-2 text-left">
                  {masteredModal.unlocked.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => jumpToCourse(o.id)}
                      className="cc-card cc-reveal w-full p-3 flex items-start gap-3"
                    >
                      <span className="text-2xl leading-none">{o.icon}</span>
                      <span className="min-w-0">
                        <span className="block font-bold text-frost">{o.name}</span>
                        <span className="block text-xs text-frost-dim">{o.when}</span>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-frost-dim mt-3">
                  Tap one to learn it — or keep practicing what you know.
                </div>
              </>
            ) : (
              <div className="text-sm text-frost-dim">Awesome! Keep drilling to stay sharp. ⭐</div>
            )}

            <button
              onClick={() => setMasteredModal(null)}
              className="cc-btn cc-btn-secondary w-full py-2.5 mt-4 text-sm"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
