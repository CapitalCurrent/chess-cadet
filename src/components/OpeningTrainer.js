import React, { useEffect, useMemo, useState } from 'react';
import ChessBoard from './ChessBoard';
import NotationKeypad from './NotationKeypad';
import PlayLayout from './PlayLayout';
import { newGame, applySan, evaluateInput, coreSan, tryMove } from '../engine/chessEngine';
import { moverAt, hasBranches } from '../data/openings';

const PIECE_WORDS = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };

// Colors for the branch chooser — arrows on the board match the buttons.
const BRANCH_COLORS = ['#ff8a3d', '#4fc3f7', '#a78bfa', '#f472b6'];

// Turn SAN into plain English so the app teaches READING notation out loud.
function readSan(san) {
  if (!san) return '';
  if (san.startsWith('O-O-O')) return 'Castle queenside (big castle)';
  if (san.startsWith('O-O')) return 'Castle kingside';
  const piece = PIECE_WORDS[san[0]] || 'Pawn';
  const takes = san.includes('x') ? 'takes' : 'to';
  const dest = (coreSan(san).match(/[a-h][1-8](?!.*[a-h][1-8])/) || [''])[0];
  let tail = '';
  if (san.includes('#')) tail = ' — checkmate!';
  else if (san.includes('+')) tail = ' — check!';
  return `${piece} ${takes} ${dest}${tail}`;
}

// Replay a path (array of played nodes) -> { fen, lastMove }. Pure & idempotent.
function buildPosition(path) {
  const game = newGame();
  let lastMove = null;
  for (const node of path) {
    const m = applySan(game, node.san);
    if (m) lastMove = { from: m.from, to: m.to };
  }
  return { fen: game.fen(), lastMove };
}

export default function OpeningTrainer({ opening, mode, openingSwitcher, pieceSet, boardTheme, moveStyle, focusBoard, progress, rewardMove, breakStreak, finishLine }) {
  const student = opening.student;
  const [path, setPath] = useState([]); // nodes played so far (the chosen line)
  const [tokens, setTokens] = useState([]);
  const [feedback, setFeedback] = useState(null); // {kind, text}
  const [hint, setHint] = useState(0); // 0 none, 1 piece, 2 answer
  const [wrong, setWrong] = useState(0);
  const [doneRewarded, setDoneRewarded] = useState(false);

  // Reset everything when the opening or mode changes.
  useEffect(() => {
    setPath([]);
    setTokens([]);
    setFeedback(null);
    setHint(0);
    setWrong(0);
    setDoneRewarded(false);
  }, [opening.id, mode]);

  // The available next plies: children of the last played node, or the tree root.
  const options = path.length ? path[path.length - 1].children : opening.tree;
  const depth = path.length;
  const finished = options.length === 0;
  const mover = finished ? null : moverAt(depth);
  const myTurn = !finished && mover === student;
  const isBranch = options.length > 1;
  const target = finished ? null : options[0]; // her move, or the single forced reply
  const justPlayed = path.length ? path[path.length - 1] : null;

  const { fen, lastMove } = useMemo(() => buildPosition(path), [path]);

  // Resolve each option to from/to squares (for arrows, tap-to-move, hints).
  const optionMoves = useMemo(
    () => options.map((o) => ({ node: o, mv: tryMove(fen, o.san) })),
    [fen, options]
  );
  const targetMove = optionMoves[0]?.mv || null;

  // Commit a node (her move, the forced reply, or a chosen/random branch).
  function playNode(node) {
    setPath((p) => [...p, node]);
    setTokens([]);
    setHint(0);
    setWrong(0);
  }

  // Learn mode: she slides the piece herself. Accept only the suggested move.
  function handleLearnMove(from, to) {
    if (!myTurn || !targetMove) return;
    if (from === targetMove.from && to === targetMove.to) {
      // Land the move on the SAME render as the drop — no snap-back flash.
      setFeedback({ kind: 'correct', text: `Nice! ${target.san} — ${readSan(target.san)}` });
      playNode(target);
    } else {
      setFeedback({
        kind: 'legal',
        text: `Almost — follow the orange arrow: move the ${PIECE_WORDS[target.san[0]] || 'pawn'} to ${targetMove.to}.`,
      });
    }
  }

  // In DRILL mode the opponent's moves play themselves after a short beat. At a
  // branch the opponent picks one reply AT RANDOM, so over repetitions she
  // drills the right answer to every line.
  useEffect(() => {
    if (mode !== 'drill' || finished) return;
    if (mover === student) return; // her turn — wait for input
    const t = setTimeout(() => {
      const choice = options[Math.floor(Math.random() * options.length)];
      setPath((p) => [...p, choice]);
    }, 750);
    return () => clearTimeout(t);
  }, [mode, depth, finished, mover, student]); // eslint-disable-line react-hooks/exhaustive-deps

  // Completion reward (once).
  useEffect(() => {
    if (finished && !doneRewarded) {
      finishLine(opening.id);
      setDoneRewarded(true);
    }
  }, [finished, doneRewarded, finishLine, opening.id]);

  const input = tokens.join('');

  function resetMoveInput() {
    setTokens([]);
    setHint(0);
    setWrong(0);
  }

  function submit() {
    if (!myTurn || !input) return;
    const res = evaluateInput(fen, input, target.san);
    if (res.status === 'correct') {
      const bonus = (hint === 0 ? 1 : 0) + (res.sawCheck ? 1 : 0);
      rewardMove(bonus);
      setFeedback({
        kind: 'correct',
        text:
          (hint === 0 ? 'Perfect! ' : 'Got it! ') +
          readSan(res.move.san) +
          (res.sawCheck ? ' ⭐ You spotted the check!' : ''),
      });
      // brief pause to celebrate, then move on
      setTimeout(() => playNode(target), 650);
    } else if (res.status === 'legal') {
      breakStreak();
      setFeedback({
        kind: 'legal',
        text: `${readSan(res.move.san)} is a real move — but the Italian plays ${target.san} here. Try that one!`,
      });
      setTokens([]);
      setWrong((w) => w + 1);
      if (wrong + 1 >= 1) setHint((h) => Math.max(h, 1));
    } else {
      setFeedback({
        kind: 'illegal',
        text: "Hmm — that isn't a legal move here. Check your notation and try again!",
      });
      setTokens([]);
      setWrong((w) => w + 1);
      if (wrong + 1 >= 2) setHint((h) => Math.max(h, 1));
    }
  }

  const orientation = student;

  // Board decorations: arrows, highlights, and whether she can drag this step.
  let boardArrows = [];
  let boardHighlights = [];
  let boardMovable = null;
  if (!finished) {
    if (mode === 'learn') {
      if (myTurn && targetMove) {
        boardArrows = [{ from: targetMove.from, to: targetMove.to, color: '#ff8a3d' }];
        boardHighlights = [targetMove.from, targetMove.to];
        boardMovable = student;
      } else if (!myTurn && isBranch) {
        // Preview every branch reply with its own color (matches the buttons).
        boardArrows = optionMoves
          .filter((o) => o.mv)
          .map((o, i) => ({ from: o.mv.from, to: o.mv.to, color: BRANCH_COLORS[i % BRANCH_COLORS.length] }));
      } else if (!myTurn && targetMove) {
        boardArrows = [{ from: targetMove.from, to: targetMove.to, color: '#4fc3f7' }];
        boardHighlights = [targetMove.from, targetMove.to];
      }
    } else if (mode === 'drill' && myTurn) {
      if (hint >= 1 && targetMove) boardHighlights = [targetMove.from];
      if (hint >= 2 && targetMove) boardArrows = [{ from: targetMove.from, to: targetMove.to }];
    }
  }

  const board = (
    <ChessBoard
      fen={fen}
      orientation={orientation}
      lastMove={lastMove}
      arrows={boardArrows}
      highlights={boardHighlights}
      movableColor={boardMovable}
      moveStyle={moveStyle}
      onMove={handleLearnMove}
      pieceSet={pieceSet}
      boardTheme={boardTheme}
      big={focusBoard}
    />
  );

  const panel = (
    <>
      {/* Top region — variable content (caption, feedback, lesson) scrolls here on
          desktop so the move-entry block below stays pinned to the board's bottom. */}
      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:-mr-1 md:pr-1">
      {/* Opening switcher (lives here, not the global header, so the header height
          stays constant across modes and the board never shifts). */}
      {openingSwitcher && <div className="mb-3">{openingSwitcher}</div>}

      {/* Coach caption */}
      <div className="cc-card p-3 md:p-4 mb-3 min-h-[64px] md:min-h-[96px]">
        {finished ? (
          <div className="text-center animate-pop">
            <div className="text-lg md:text-3xl font-extrabold text-gold">🎉 You finished {opening.name}!</div>
            <div className="text-sm md:text-lg text-gold/70">
              +5 bonus gems.{' '}
              {hasBranches(opening)
                ? 'Tap Restart to try the other line!'
                : 'Tap Restart to play it again.'}
            </div>
          </div>
        ) : justPlayed ? (
          <div className="animate-float">
            <div className="text-xs md:text-sm uppercase tracking-wide text-gold/50">
              Last move: <span className="text-gold font-bold">{justPlayed.san}</span> · {readSan(justPlayed.san)}
            </div>
            <div className="text-sm md:text-xl md:leading-snug text-frost mt-0.5 md:mt-1.5">{justPlayed.note}</div>
            {justPlayed.coach && (
              <div className="mt-1.5 md:mt-2.5 text-sm md:text-lg md:leading-snug text-grass flex gap-1.5">
                <span>🧭</span>
                <span>{justPlayed.coach}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm md:text-xl md:leading-snug text-frost">
            {opening.icon} {opening.blurb}
          </div>
        )}
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`rounded-xl px-3 py-2 md:px-4 md:py-3 mb-3 text-sm md:text-lg font-bold animate-pop ${
            feedback.kind === 'correct'
              ? 'bg-grass/20 text-grass ring-1 ring-grass/40'
              : feedback.kind === 'legal'
              ? 'bg-gold/15 text-gold ring-1 ring-gold/40'
              : 'bg-coral/15 text-coral ring-1 ring-coral/40'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* LEARN MODE */}
      {mode === 'learn' && !finished && (
        <div className="cc-card p-3">
          {myTurn ? (
            /* Her move — slide the piece along the arrow */
            <>
              <div className="text-xs md:text-sm uppercase tracking-wide text-gold/50 mb-1">Your move</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-4xl font-extrabold text-gold">{target.san}</span>
                <span className="text-sm md:text-xl text-frost">{readSan(target.san)}</span>
              </div>
              <p className="text-sm md:text-xl md:leading-snug text-frost/90 mt-1 md:mt-2">{target.note}</p>
              <div className="mt-2 text-sm md:text-lg text-grass font-bold">
                👉 Slide the {PIECE_WORDS[target.san[0]] || 'pawn'} along the orange arrow
                {targetMove ? ` to ${targetMove.to}` : ''}.
              </div>
              <button
                onClick={() => playNode(target)}
                className="cc-btn cc-btn-secondary mt-3 w-full py-2.5 md:py-3.5 md:text-lg"
              >
                Show me ▶
              </button>
            </>
          ) : isBranch ? (
            /* Opponent decision point — she picks which reply to explore */
            <>
              <div className="text-xs md:text-sm uppercase tracking-wide text-gold/50 mb-1">
                {mover === 'w' ? 'White' : 'Black'} has a choice
              </div>
              <p className="text-sm md:text-lg md:leading-snug text-frost/90 mb-2 md:mb-3">
                Two good moves here — pick one to learn, then Restart to try the other!
              </p>
              <div className="flex flex-col gap-2 md:gap-3">
                {optionMoves.map((o, i) => (
                  <button
                    key={o.node.san}
                    onClick={() => playNode(o.node)}
                    className="w-full py-2.5 md:py-4 rounded-xl font-extrabold text-bg active:translate-y-px text-left px-3 md:px-4 md:text-xl"
                    style={{ backgroundColor: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
                  >
                    {o.node.san} — {readSan(o.node.san)}
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* Forced opponent reply */
            <>
              <div className="text-xs md:text-sm uppercase tracking-wide text-gold/50 mb-1">Opponent's move</div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl md:text-4xl font-extrabold text-gold">{target.san}</span>
                <span className="text-sm md:text-xl text-frost">{readSan(target.san)}</span>
              </div>
              <p className="text-sm md:text-xl md:leading-snug text-frost/90 mt-1 md:mt-2">{target.note}</p>
              <button
                onClick={() => playNode(target)}
                className="cc-btn cc-btn-grass mt-3 w-full py-3 md:py-4 text-lg md:text-2xl"
              >
                Opponent plays ▶
              </button>
            </>
          )}
        </div>
      )}
      </div>

      {/* DRILL MODE — move entry pinned to the bottom (aligns with board's lower edge) */}
      {mode === 'drill' && !finished && (
        <div className="md:shrink-0 md:pt-3">
          {myTurn ? (
            <>
              {/* Input line */}
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs md:text-base text-gold/60 font-bold whitespace-nowrap">
                  {student === 'w' ? 'White' : 'Black'} to play:
                </div>
                <div className="flex-1 bg-bg-2 rounded-cc-lg ring-1 ring-edge px-3 py-2 md:py-3 min-h-[42px] md:min-h-[52px] flex items-center text-xl md:text-2xl font-extrabold tracking-wider text-gold">
                  {input || <span className="text-gold/30">type your move…</span>}
                </div>
              </div>

              {/* Hint ladder */}
              <div className="mb-2 min-h-[20px] text-sm md:text-base">
                {hint >= 2 ? (
                  <span className="text-gold">The move is <b>{target.san}</b> — {readSan(target.san)}</span>
                ) : hint >= 1 ? (
                  <span className="text-gold/80">
                    Hint: move your <b>{PIECE_WORDS[target.san[0]] || 'Pawn'}</b>. {target.note}
                  </span>
                ) : (
                  <button
                    onClick={() => setHint(1)}
                    className="text-frost/70 underline underline-offset-2"
                  >
                    Need a hint?
                  </button>
                )}
                {hint === 1 && (
                  <button onClick={() => setHint(2)} className="ml-2 text-frost/60 underline underline-offset-2">
                    show answer
                  </button>
                )}
              </div>

              <NotationKeypad
                onKey={(tok) => { setTokens((t) => [...t, tok]); setFeedback(null); }}
                onBackspace={() => setTokens((t) => t.slice(0, -1))}
                onClear={resetMoveInput}
                onSubmit={submit}
                canSubmit={!!input}
              />
            </>
          ) : (
            <div className="text-center text-frost/60 text-sm md:text-lg py-6 md:py-10 animate-pop">
              Opponent is thinking…
            </div>
          )}
        </div>
      )}
    </>
  );

  return <PlayLayout board={board} panel={panel} focus={focusBoard} />;
}
