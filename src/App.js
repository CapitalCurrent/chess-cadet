import React, { useEffect, useState } from 'react';
import { OPENINGS, getOpening, unlockedBy, getLines, linesWithStatus } from './data/openings';
import { getPieceSet } from './pieces/pieceSets';
import { getBoardTheme } from './pieces/boardThemes';
import { useProgress } from './state/progress';
import { useProfiles, playGameKey } from './state/profiles';
import { notebookCount } from './state/notebook';
import { getDailyLesson, recordLessonEvent } from './state/dailyLesson';
import { useAppTheme } from './state/theme';
import OpeningTrainer from './components/OpeningTrainer';
import FreePlay from './components/FreePlay';
import FixMistakes from './components/FixMistakes';
import HomePage from './components/HomePage';
import LearnCatalog from './components/LearnCatalog';
import NotationCourse from './components/NotationCourse';
import Settings from './components/Settings';
import NotationGuide from './components/NotationGuide';
import ProfileGate from './components/ProfileGate';
import BackdropEmblem from './components/BackdropEmblem';
import Logo from './components/nav/Logo';
import ProfileMenu from './components/nav/ProfileMenu';
import Segmented from './components/nav/Segmented';
import OpeningPicker from './components/nav/OpeningPicker';
import LinesPicker from './components/nav/LinesPicker';
import BottomTabBar from './components/nav/BottomTabBar';
import {
  IconHome,
  IconLearn,
  IconPlay,
  IconSettings,
  IconGuide,
  IconRestart,
  IconMaximize,
  IconMinimize,
  IconClose,
  IconTrophy,
  IconStar,
  IconLockOpen,
} from './components/icons';
import { VERSION } from './version';

// Top-level destinations. Drill is NOT a destination — it's the second half of
// learning a line, reached from the course flow (left column + lesson cards).
const MODES = [
  { id: 'home', label: 'Home', icon: <IconHome size={22} /> },
  { id: 'learn', label: 'Learn', icon: <IconLearn size={22} /> },
  { id: 'play', label: 'Play', icon: <IconPlay size={22} /> },
];

export default function App() {
  const [appTheme, setAppTheme] = useAppTheme();
  // Local multi-profile: each player keeps their own progress + saved game.
  const { profiles, activeId, activeProfile, createProfile, selectProfile, updateProfile, deleteProfile } = useProfiles();
  // rewardMove/breakStreak/finishLine still drive progress silently (the gems
  // reward bar was removed from the chrome; reinstate intentionally later).
  const { progress, rewardMove, breakStreak, finishLine, recordDrillRun, learnLine, masterLine } = useProgress(activeId);
  const [openingId, setOpeningId] = useState(OPENINGS[0].id);
  const [mode, setMode] = useState('home'); // open on the Home landing (choices), not straight into a lesson
  const [learnSubject, setLearnSubject] = useState(null); // within Learn: null = catalog | 'openings' | 'notation'
  const [restart, setRestart] = useState(0);
  const [activeLineId, setActiveLineId] = useState(null); // current Progressive Line (null = Mix)
  const [playSeed, setPlaySeed] = useState(null); // { moves, color } for Continue vs Computer
  const [masteredModal, setMasteredModal] = useState(null); // { id, unlocked: [opening] }
  const [lineModal, setLineModal] = useState(null); // { openingId, lineName, nextLineId, nextLineName, courseComplete, unlocked }
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
  const [logPlacement, setLogPlacement] = useState(
    () => localStorage.getItem('chess-cadet-logplacement') || 'auto'
  ); // move log: auto | sidebar | panel

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
  useEffect(() => {
    localStorage.setItem('chess-cadet-logplacement', logPlacement);
  }, [logPlacement]);

  const opening = getOpening(openingId);
  const pieceSet = getPieceSet(pieceSetId);
  const boardTheme = getBoardTheme(boardThemeId);

  // Progressive Lines: the active line for the current course = the first
  // unlocked-but-unmastered line (or Mix = null when all are mastered). Reset to
  // that sensible default whenever the course changes; explicit picks override it.
  const defaultLineId = (op) => {
    const ls = linesWithStatus(progress, op);
    if (ls.length <= 1) return ls[0] ? ls[0].id : null;
    const current = ls.find((l) => l.unlocked && !l.mastered);
    return current ? current.id : null; // all mastered → Mix
  };
  useEffect(() => {
    setActiveLineId(defaultLineId(getOpening(openingId)));
  }, [openingId]); // eslint-disable-line react-hooks/exhaustive-deps
  const activeLine = getLines(opening).find((l) => l.id === activeLineId) || null;
  // Top nav: Home / Learn / Play; drilling a line is part of the Learn area and
  // Fix Mistakes (Coach's Notebook) is launched from Home.
  const navValue = mode === 'home' || mode === 'fix' ? 'home' : mode === 'play' ? 'play' : 'learn';

  // Tapping the Play tab directly = a normal game from the start (clear any seed).
  const pickMode = (id) => {
    if (id === 'play') setPlaySeed(null);
    if (id === 'learn') setLearnSubject(null); // the Learn tab lands on the subject catalog
    setMode(id);
    setRestart((r) => r + 1);
  };
  // Pick a subject from the Learn catalog.
  const pickSubject = (id) => { setLearnSubject(id); setMode('learn'); setRestart((r) => r + 1); };
  const pickOpening = (id) => { setOpeningId(id); setRestart((r) => r + 1); };
  // Hand the current opening position over to Play vs the computer (Coach on).
  const continueVsComputer = (moves, color) => {
    setPlaySeed({ moves, color });
    setMode('play');
    setRestart((r) => r + 1);
  };
  // Pick a line from the LinesPicker: a line id → study it in Learn; null → Mix drill.
  const pickLine = (id) => { setActiveLineId(id); setMode(id == null ? 'drill' : 'learn'); setRestart((r) => r + 1); };
  // Jump straight to drilling a specific line (the step that masters it).
  const drillLine = (id) => { setActiveLineId(id); setMode('drill'); setRestart((r) => r + 1); };
  // "▶ Drill this line" after learning it.
  const drillActiveLine = () => { setMode('drill'); setRestart((r) => r + 1); };
  // Switch the active line into Learn (used by the drill gate's "Learn it first").
  const learnActiveLine = () => { setMode('learn'); setRestart((r) => r + 1); };
  // Completing a Learn run marks the line learned (which unlocks drilling it).
  const handleLineLearned = (oid, lineId) => learnLine(oid, lineId);

  // A LINE was mastered (a clean Drill run). Persist it, then celebrate: reveal
  // the next line — or, if that was the LAST line, the course-mastery unlock.
  const handleLineMastered = (oid, lineId) => {
    masterLine(oid, lineId);
    const op = getOpening(oid);
    const cur = (progress.lines && progress.lines[oid] && progress.lines[oid].mastered) || [];
    const projected = {
      ...progress,
      lines: { ...progress.lines, [oid]: { mastered: Array.from(new Set([...cur, lineId])) } },
    };
    const ls = linesWithStatus(projected, op);
    const masteredLine = ls.find((l) => l.id === lineId);
    const idx = masteredLine ? masteredLine.index : -1;
    const next = idx >= 0 ? ls[idx + 1] : null;
    const courseComplete = ls.every((l) => l.mastered);
    if (courseComplete) {
      setMasteredModal({ id: oid, unlocked: unlockedBy(oid, projected) });
    } else {
      setLineModal({
        openingId: oid,
        lineName: masteredLine ? masteredLine.name : 'line',
        nextLineId: next ? next.id : null,
        nextLineName: next ? next.name : null,
      });
    }
  };
  // Tap "Learn the next line" in the line-mastered modal.
  const learnNextLine = (id) => { setLineModal(null); setActiveLineId(id); setMode('learn'); setRestart((r) => r + 1); };

  const jumpToCourse = (id) => {
    setMasteredModal(null);
    setLineModal(null);
    setOpeningId(id);
    setMode('learn'); // introduce the newly unlocked course in Learn
    setRestart((r) => r + 1);
  };

  // No active player yet → first-run create / pick screen (blocks the app shell).
  if (!activeProfile) {
    return <ProfileGate profiles={profiles} onCreate={createProfile} onSelect={selectProfile} />;
  }

  // Board screens (Play / Drill / opening + notation lessons) hide the center
  // shield so it doesn't peek awkwardly around the board — the board is the focus.
  const onBoardView =
    mode === 'play' ||
    mode === 'drill' ||
    mode === 'fix' ||
    (mode === 'learn' && (learnSubject === 'openings' || learnSubject === 'notation'));

  // Coach's Notebook badge + Today's Lesson plan for Home (cheap reads).
  const nbCount = mode === 'home' ? notebookCount(activeId) : 0;
  const lesson = mode === 'home' ? getDailyLesson(activeId, progress) : null;

  // Tap a lesson step → jump straight into that activity.
  const startLessonStep = (step) => {
    if (step.id === 'puzzles') {
      setMode('fix');
    } else if (step.id === 'line') {
      if (step.courseId) setOpeningId(step.courseId);
      setLearnSubject('openings');
      setMode('learn');
    } else if (step.id === 'game') {
      setPlaySeed(null);
      setMode('play');
    }
    setRestart((r) => r + 1);
  };

  // Completing any Learn/Drill run marks the lesson's practice step. finishLine
  // fires exactly once per completed run (both modes), so it's the one hook.
  const finishLineWithLesson = (oid) => {
    finishLine(oid);
    recordLessonEvent(activeId, 'line');
  };

  return (
    <div className={`min-h-screen text-frost pb-24 md:pb-10 log-${logPlacement}`}>
      <BackdropEmblem shield={!onBoardView} />
      {/* Header — acrylic top bar */}
      <header
        className="sticky top-0 z-20"
        style={{
          background: 'rgb(var(--surface) / 0.55)',
          backdropFilter: 'blur(24px) saturate(140%)',
          WebkitBackdropFilter: 'blur(24px) saturate(140%)',
          borderBottom: '1px solid var(--edge-soft)',
        }}
      >
        <div className="max-w-md md:max-w-6xl mx-auto px-3 py-2">
          {/* Row 1: brand · (desktop modes) · tools */}
          <div className="flex items-center gap-3">
            <Logo version={VERSION} />

            {/* Modes — desktop only (mobile uses the bottom tab bar). Hidden on
                Home, which is a launcher: its cards ARE the navigation. */}
            <div className="hidden md:block flex-1 max-w-md mx-auto">
              {mode !== 'home' && <Segmented options={MODES} value={navValue} onChange={pickMode} />}
            </div>

            {/* Spacer keeps tools right-aligned on mobile */}
            <div className="flex-1 md:hidden" />

            {/* Tools */}
            <div className="flex items-center gap-1 shrink-0">
              {mode !== 'home' && (
                <button
                  className="cc-icon-btn hidden md:inline-flex"
                  title={focusBoard ? 'Exit big board' : 'Maximize board'}
                  onClick={() => setFocusBoard((f) => !f)}
                >
                  {focusBoard ? <IconMinimize /> : <IconMaximize />}
                </button>
              )}
              {mode !== 'home' && (
                <button className="cc-icon-btn" title="Restart this line" onClick={() => setRestart((r) => r + 1)}>
                  <IconRestart />
                </button>
              )}
              {mode !== 'home' && (
                <button className="cc-icon-btn" title="Notation cheat sheet" onClick={() => setGuideOpen(true)}>
                  <IconGuide />
                </button>
              )}
              <button className="cc-icon-btn" title="Settings" onClick={() => setSettingsOpen(true)}>
                <IconSettings />
              </button>
              <ProfileMenu
                profiles={profiles}
                activeProfile={activeProfile}
                onSelect={selectProfile}
                onCreate={createProfile}
                onUpdate={updateProfile}
                onDelete={deleteProfile}
              />
            </div>
          </div>

        </div>
      </header>

      {/* Trainer / game (key forces a clean remount on restart / mode change) */}
      <main className="pt-4">
        {mode === 'home' ? (
          <HomePage
            opening={opening}
            activeLine={activeLine}
            playerName={activeProfile.name}
            notebookCount={nbCount}
            lesson={lesson}
            onLessonStep={startLessonStep}
            onContinue={() => { setLearnSubject('openings'); setMode('learn'); setRestart((r) => r + 1); }}
            onLearn={() => pickMode('learn')}
            onPlay={() => pickMode('play')}
            onFixMistakes={() => { setMode('fix'); setRestart((r) => r + 1); }}
          />
        ) : mode === 'fix' ? (
          <FixMistakes
            key={`fix-${activeId}-${restart}`}
            profileId={activeId}
            pieceSet={pieceSet}
            boardTheme={boardTheme}
            moveStyle={moveStyle}
            focusBoard={focusBoard}
            rewardMove={rewardMove}
            onPlay={() => pickMode('play')}
          />
        ) : mode === 'play' ? (
          <FreePlay
            key={`play-${activeId}-${restart}`}
            pieceSet={pieceSet}
            boardTheme={boardTheme}
            moveStyle={moveStyle}
            focusBoard={focusBoard}
            seed={playSeed}
            rewardMove={rewardMove}
            saveKey={playGameKey(activeId)}
            profileId={activeId}
          />
        ) : learnSubject === 'notation' ? (
          <NotationCourse
            key={`notation-${restart}`}
            pieceSet={pieceSet}
            boardTheme={boardTheme}
            moveStyle={moveStyle}
            focusBoard={focusBoard}
            onBack={() => setLearnSubject(null)}
          />
        ) : learnSubject === 'openings' ? (
          <OpeningTrainer
            key={`${openingId}-${mode}-${activeLineId}-${restart}`}
            opening={opening}
            mode={mode}
            activeLine={activeLine}
            focusBoard={focusBoard}
            onContinue={continueVsComputer}
            onDrillLine={drillActiveLine}
            onLearnLine={learnActiveLine}
            onLineMastered={handleLineMastered}
            onLineLearned={handleLineLearned}
            openingSwitcher={<OpeningPicker value={openingId} onChange={pickOpening} progress={progress} />}
            linesPicker={<LinesPicker opening={opening} progress={progress} activeLineId={activeLineId} mode={mode} onPick={pickLine} onDrill={drillLine} />}
            pieceSet={pieceSet}
            boardTheme={boardTheme}
            moveStyle={moveStyle}
            progress={progress}
            rewardMove={rewardMove}
            breakStreak={breakStreak}
            finishLine={finishLineWithLesson}
            recordDrillRun={recordDrillRun}
          />
        ) : (
          <LearnCatalog onPick={pickSubject} />
        )}
      </main>

      {/* Mobile primary navigation */}
      {mode !== 'home' && <BottomTabBar tabs={MODES} value={navValue} onChange={pickMode} />}

      <Settings
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        pieceSetId={pieceSetId}
        setPieceSetId={setPieceSetId}
        boardThemeId={boardThemeId}
        setBoardThemeId={setBoardThemeId}
        moveStyle={moveStyle}
        setMoveStyle={setMoveStyle}
        logPlacement={logPlacement}
        setLogPlacement={setLogPlacement}
        appTheme={appTheme}
        setAppTheme={setAppTheme}
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
            <IconTrophy size={40} className="mx-auto text-gold" />
            <div className="text-xl md:text-2xl font-extrabold text-gold mt-2">
              You mastered {getOpening(masteredModal.id).name}!
            </div>
            <div className="flex justify-center gap-1.5 text-gold my-2">
              <IconStar size={22} /><IconStar size={22} /><IconStar size={22} />
            </div>

            {masteredModal.unlocked.length ? (
              <>
                <div className="text-sm text-frost-dim mb-2 flex items-center justify-center gap-1.5">
                  <IconLockOpen size={15} /> You unlocked:
                </div>
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

      {lineModal && (
        <div className="cc-scrim items-center p-3" onClick={() => setLineModal(null)}>
          <div className="cc-sheet p-5 text-center animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-end -mt-2 -mr-2 mb-1">
              <button onClick={() => setLineModal(null)} className="cc-icon-btn" aria-label="Close">
                <IconClose size={18} />
              </button>
            </div>
            <IconStar size={36} className="mx-auto text-gold" />
            <div className="text-xl md:text-2xl font-extrabold text-gold mt-2">
              You mastered the {lineModal.lineName}!
            </div>
            {lineModal.nextLineId ? (
              <>
                <div className="text-sm text-frost-dim mt-2 mb-3 flex items-center justify-center gap-1.5">
                  <IconLockOpen size={15} /> New line unlocked — added to your course:
                </div>
                <button
                  onClick={() => learnNextLine(lineModal.nextLineId)}
                  className="cc-btn cc-btn-grass w-full py-3 text-base"
                >
                  ▶ Learn the {lineModal.nextLineName}
                </button>
                <div className="text-[11px] text-frost-dim mt-3">…or keep practicing this one anytime.</div>
              </>
            ) : (
              <div className="text-sm text-frost-dim mt-2">Nice clean run! ⭐</div>
            )}
            <button
              onClick={() => setLineModal(null)}
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
