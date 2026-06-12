import React, { useState } from 'react';
import ChessBoard from './ChessBoard';
import PlayLayout from './PlayLayout';
import { newGame } from '../engine/chessEngine';
import { analyze } from '../engine/stockfishEngine';
import { puzzleQueue, recordAttempt } from '../state/notebook';
import { recordLessonEvent } from '../state/dailyLesson';
import { IconNotebook, IconStar } from './icons';

// Fix Mistakes — the Coach's Notebook practice mode. Each puzzle is a REAL
// position from her own games where the coach flagged a blunder or a missed
// tactic. She replays the moment and must find the stronger move. The exact
// coach move always solves it; any move the engine rates within ~60cp of best
// also counts (there's often more than one good move). Two clean solves
// (no hints, no wrong tries) retire the position — same bar as line mastery.

const MOTIF_PROMPTS = {
  fork: 'There was a fork waiting here — find it!',
  pin: 'There was a pin waiting here — find it!',
  'discovered attack': 'A discovered attack was hiding here — find it!',
};

function scoreNum(c) {
  if (!c) return 0;
  if (typeof c.mate === 'number') return (c.mate >= 0 ? 1 : -1) * (100000 - Math.abs(c.mate) * 100);
  return typeof c.cp === 'number' ? c.cp : 0;
}

export default function FixMistakes({ profileId, pieceSet, boardTheme, moveStyle, focusBoard, rewardMove, onPlay }) {
  const [queue] = useState(() => puzzleQueue(profileId));
  const [idx, setIdx] = useState(0);
  const [phase, setPhase] = useState('solve'); // solve | checking | solved | revealed
  const [shownFen, setShownFen] = useState(() => (queue[0] ? queue[0].fen : null));
  const [lastMove, setLastMove] = useState(null);
  const [hint, setHint] = useState(0); // 0 none · 1 highlight the piece · 2 arrow
  const [triedWrong, setTriedWrong] = useState(false);
  const [note, setNote] = useState(null); // { kind: good|warn|pending, text }

  const cur = queue[idx] || null;
  const done = !cur;
  const stm = cur ? cur.fen.split(' ')[1] : 'w';
  const sideName = stm === 'w' ? 'White' : 'Black';
  const solving = phase === 'solve';

  function resetTo(i) {
    const m = queue[i];
    setIdx(i);
    setPhase('solve');
    setShownFen(m ? m.fen : null);
    setLastMove(null);
    setHint(0);
    setTriedWrong(false);
    setNote(null);
  }

  function finishSolved(exact, altSan) {
    const clean = !triedWrong && hint === 0;
    recordAttempt(profileId, cur.id, { solved: true, clean });
    recordLessonEvent(profileId, 'puzzle');
    rewardMove && rewardMove(clean ? 2 : 1);
    setPhase('solved');
    setNote({
      kind: 'good',
      text: exact
        ? `⭐ That's it! ${cur.best.san} — the move you missed in your game.${clean ? ' Clean solve!' : ''}`
        : `👍 ${altSan} works too! The coach's move was ${cur.best.san}.`,
    });
  }

  function markWrong(san) {
    setTriedWrong(true);
    setNote({
      kind: 'warn',
      text: `${san} isn't it — that's close to what happened in your game (you played ${cur.played.san}). Try again!`,
    });
    // Let the try land for a beat, then snap back to the puzzle position.
    setTimeout(() => {
      setShownFen(cur.fen);
      setLastMove(null);
      setPhase('solve');
    }, 900);
  }

  async function handleMove(from, to) {
    if (!solving || !cur) return;
    const g = newGame(cur.fen);
    let m = null;
    try {
      m = g.move({ from, to, promotion: 'q' });
    } catch {
      m = null;
    }
    if (!m) return;
    const uci = from + to + (m.promotion || '');
    setShownFen(g.fen());
    setLastMove({ from, to });
    if (uci === cur.best.uci) return finishSolved(true);
    // Not the coach's move — ask the engine whether her idea is also good.
    setPhase('checking');
    setNote({ kind: 'pending', text: '🎓 Checking your idea…' });
    let cands = [];
    try {
      cands = (await analyze(cur.fen, { multipv: 5, movetime: 500 })) || [];
    } catch {
      cands = [];
    }
    const found = cands.find((c) => c.move === uci);
    if (found && cands.length && scoreNum(cands[0]) - scoreNum(found) <= 60) {
      finishSolved(false, m.san);
    } else {
      markWrong(m.san);
    }
  }

  function showAnswer() {
    if (!cur) return;
    recordAttempt(profileId, cur.id, { solved: false });
    const g = newGame(cur.fen);
    try {
      g.move({ from: cur.best.uci.slice(0, 2), to: cur.best.uci.slice(2, 4), promotion: cur.best.uci[4] });
    } catch {
      /* ignore */
    }
    setShownFen(g.fen());
    setLastMove({ from: cur.best.uci.slice(0, 2), to: cur.best.uci.slice(2, 4) });
    setPhase('revealed');
    setNote({ kind: 'warn', text: `The move was ${cur.best.san}. ${cur.text || ''} It'll come back later — you'll get it!` });
  }

  const boardHighlights = cur && hint >= 1 && solving ? [cur.best.uci.slice(0, 2)] : [];
  const boardArrows =
    cur && hint >= 2 && solving ? [{ from: cur.best.uci.slice(0, 2), to: cur.best.uci.slice(2, 4) }] : [];

  const board = (
    <ChessBoard
      fen={shownFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
      orientation={stm}
      lastMove={lastMove}
      highlights={boardHighlights}
      arrows={boardArrows}
      movableColor={solving && cur ? stm : null}
      moveStyle={moveStyle}
      onMove={handleMove}
      pieceSet={pieceSet}
      boardTheme={boardTheme}
      big={focusBoard}
    />
  );

  const header = (
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-base md:text-lg font-extrabold text-gold flex items-center gap-2">
        <IconNotebook size={20} /> Coach's Notebook
      </h2>
      {!done && (
        <span className="text-xs font-bold text-frost-dim whitespace-nowrap">
          Puzzle {idx + 1} of {queue.length}
        </span>
      )}
    </div>
  );

  const panel = (
    <div className="cc-glass p-3 md:p-4 space-y-3">
      {header}

      {done ? (
        <div className="cc-card p-4 md:p-5 text-center animate-pop">
          {queue.length ? (
            <>
              <IconStar size={36} className="mx-auto text-gold" />
              <div className="text-lg md:text-2xl font-extrabold text-gold mt-2">Notebook done for today!</div>
              <p className="text-sm text-frost-dim mt-1.5">
                You worked through every position. Play more games with <b className="text-frost">Coach on</b> and
                I'll collect new ones to practice.
              </p>
            </>
          ) : (
            <>
              <IconNotebook size={36} className="mx-auto text-gold" />
              <div className="text-lg md:text-2xl font-extrabold text-gold mt-2">Nothing to fix yet!</div>
              <p className="text-sm text-frost-dim mt-1.5">
                Play games with <b className="text-frost">🎓 Coach on</b> — when you miss a tactic, I'll save the
                position here so you can come back and master it.
              </p>
            </>
          )}
          {onPlay && (
            <button onClick={onPlay} className="cc-btn cc-btn-grass w-full py-3 mt-3 text-base md:text-lg">
              ⚔ Play a game
            </button>
          )}
        </div>
      ) : (
        <>
          {/* The story card — this is HER moment, not a random puzzle. */}
          <div className="cc-card p-3 md:p-4">
            <div className="text-xs md:text-sm uppercase tracking-wide text-gold/50 mb-1.5">
              From your game · {new Date(cur.createdAt).toLocaleDateString()}
            </div>
            <p className="text-sm md:text-lg leading-snug text-frost/90">
              You played <b className="text-coral">{cur.played.san}</b> here
              {cur.label && cur.label !== 'Mistake' ? (
                <span> — {cur.label.toLowerCase()}!</span>
              ) : (
                <span> and it gave a lot away.</span>
              )}
            </p>
            <div className="mt-2 text-sm md:text-lg text-grass font-bold">
              👉 {(cur.motif && MOTIF_PROMPTS[cur.motif]) || `Find the stronger move for ${sideName}.`}
            </div>
          </div>

          {note && (
            <div
              className={`rounded-cc-lg px-3 py-2 text-sm md:text-base font-bold animate-pop ${
                note.kind === 'good'
                  ? 'bg-grass/20 text-grass ring-1 ring-grass/40'
                  : note.kind === 'warn'
                  ? 'bg-gold/15 text-gold ring-1 ring-gold/40'
                  : 'bg-surface text-frost-dim ring-1 ring-edge'
              }`}
            >
              {note.text}
            </div>
          )}

          {phase === 'solved' || phase === 'revealed' ? (
            <button
              onClick={() => resetTo(idx + 1)}
              className="cc-btn cc-btn-grass w-full py-3 text-base md:text-lg"
            >
              {idx + 1 < queue.length ? 'Next puzzle ▶' : 'Finish ▶'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {hint < 2 ? (
                <button
                  onClick={() => setHint((h) => h + 1)}
                  disabled={!solving}
                  className="cc-btn cc-btn-secondary flex-1 py-2.5 text-sm disabled:opacity-40"
                >
                  💡 {hint === 0 ? 'Hint' : 'Bigger hint'}
                </button>
              ) : (
                <div className="flex-1 text-center text-xs text-frost-dim">Follow the arrow!</div>
              )}
              <button
                onClick={showAnswer}
                disabled={!solving}
                className="cc-btn cc-btn-secondary flex-1 py-2.5 text-sm disabled:opacity-40"
              >
                Show answer
              </button>
            </div>
          )}

          <div className="text-[11px] text-frost-dim text-center">
            Solve it cleanly twice (no hints) and this position graduates out of the notebook. ⭐
          </div>
        </>
      )}
    </div>
  );

  return <PlayLayout board={board} panel={panel} focus={focusBoard} />;
}
