import React, { useEffect, useState } from 'react';
import { OPENINGS, getOpening } from './data/openings';
import { getPieceSet } from './pieces/pieceSets';
import { getBoardTheme } from './pieces/boardThemes';
import { useProgress } from './state/progress';
import OpeningTrainer from './components/OpeningTrainer';
import FreePlay from './components/FreePlay';
import RewardBar from './components/RewardBar';
import Settings from './components/Settings';
import NotationGuide from './components/NotationGuide';

export default function App() {
  const { progress, rewardMove, breakStreak, finishLine } = useProgress();
  const [openingId, setOpeningId] = useState(OPENINGS[0].id);
  const [mode, setMode] = useState('learn'); // learn first, then drill
  const [restart, setRestart] = useState(0);
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

  useEffect(() => {
    localStorage.setItem('chess-cadet-pieceset', pieceSetId);
  }, [pieceSetId]);
  useEffect(() => {
    localStorage.setItem('chess-cadet-boardtheme', boardThemeId);
  }, [boardThemeId]);
  useEffect(() => {
    localStorage.setItem('chess-cadet-movestyle', moveStyle);
  }, [moveStyle]);

  const opening = getOpening(openingId);
  const pieceSet = getPieceSet(pieceSetId);
  const boardTheme = getBoardTheme(boardThemeId);

  return (
    <div className="min-h-screen bg-bg text-frost pb-10">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-bg/95 backdrop-blur border-b border-edge px-3 py-2">
        <div className="max-w-md md:max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-lg font-extrabold text-gold">♟️ Chess Cadet</h1>
            <RewardBar progress={progress} />
          </div>

          {/* Opening picker (hidden in free-play) */}
          <div className={`flex gap-2 mb-2 ${mode === 'play' ? 'hidden' : ''}`}>
            {OPENINGS.map((o) => (
              <button
                key={o.id}
                onClick={() => { setOpeningId(o.id); setRestart((r) => r + 1); }}
                className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-bold ring-1 transition ${
                  o.id === openingId
                    ? 'bg-gold text-bg ring-gold'
                    : 'bg-surface text-gold/80 ring-edge'
                }`}
              >
                {o.icon} {o.name}
              </button>
            ))}
          </div>

          {/* Mode toggle + restart + settings */}
          <div className="flex gap-2">
            {[
              { id: 'learn', label: '📖 Learn' },
              { id: 'drill', label: '✍️ Drill' },
              { id: 'play', label: '🎮 Play' },
            ].map((m) => (
              <button
                key={m.id}
                onClick={() => { setMode(m.id); setRestart((r) => r + 1); }}
                className={`flex-1 rounded-xl px-2 py-1.5 text-sm font-bold ring-1 transition ${
                  m.id === mode ? 'bg-frost text-bg ring-frost' : 'bg-surface text-frost/80 ring-edge'
                }`}
              >
                {m.label}
              </button>
            ))}
            <button
              onClick={() => setRestart((r) => r + 1)}
              className="rounded-xl px-3 py-1.5 text-sm font-bold bg-surface text-coral ring-1 ring-edge"
              title="Restart this line"
            >
              ↻
            </button>
            <button
              onClick={() => setGuideOpen(true)}
              className="rounded-xl px-3 py-1.5 text-sm font-bold bg-surface text-grass ring-1 ring-edge"
              title="Notation cheat sheet"
            >
              📝
            </button>
            <button
              onClick={() => setSettingsOpen(true)}
              className="rounded-xl px-3 py-1.5 text-sm font-bold bg-surface text-gold ring-1 ring-edge"
              title="Settings"
            >
              ⚙️
            </button>
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
            rewardMove={rewardMove}
          />
        ) : (
          <OpeningTrainer
            key={`${openingId}-${mode}-${restart}`}
            opening={opening}
            mode={mode}
            pieceSet={pieceSet}
            boardTheme={boardTheme}
            moveStyle={moveStyle}
            progress={progress}
            rewardMove={rewardMove}
            breakStreak={breakStreak}
            finishLine={finishLine}
          />
        )}
      </main>

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
    </div>
  );
}
