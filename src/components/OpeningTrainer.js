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

// Pick a node weighted by its `freq` (default 1) so Drill throws the common
// replies more often than the rare ones.
function weightedPick(arr) {
  const total = arr.reduce((s, o) => s + (o.freq || 1), 0);
  let r = Math.random() * total;
  for (const o of arr) {
    r -= o.freq || 1;
    if (r < 0) return o;
  }
  return arr[arr.length - 1];
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

export default function OpeningTrainer({ opening, mode, openingSwitcher, pieceSet, boardTheme, moveStyle, focusBoard, onContinue, progress, rewardMove, breakStreak, finishLine }) {
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
  const branchHasTrap = options.some((o) => o.trap); // a "fall for it vs defend" choice
  const branchIsOpeningFork = options.some((o) => o.opening); // e.g. 1.e4 → …e5 / …d5
  const target = finished ? null : options[0]; // her move, or the single forced reply
  const moveNo = Math.floor(depth / 2) + 1;
  const roleLabel = finished
    ? ''
    : isBranch
    ? `${mover === 'w' ? 'White' : 'Black'}’s choice`
    : myTurn
    ? 'Your move'
    : 'Opponent’s move';
  // When Black's reply just steered us into a named opening (the Mixed 1.e4 fork),
  // announce it on her response card so she learns to recognize it.
  const enteredOpening = path.length ? path[path.length - 1].opening : null;

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
      setFeedback(null);
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
      // Prefer the correct/best replies; only fall for a flagged trap occasionally
      // so she still gets to punish it sometimes (but the bot mostly defends).
      const best = options.filter((o) => !o.trap);
      const traps = options.filter((o) => o.trap);
      const pool =
        traps.length && best.length && Math.random() < 0.3 ? traps : best.length ? best : options;
      const choice = weightedPick(pool);
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

      {/* History strip — the moves so far in notation (the PAST). Shows the blurb
          until the first move so there's no empty box. */}
      <div className="cc-card p-2.5 mb-3 text-sm">
        {path.length === 0 ? (
          <span className="text-frost-dim/90">{opening.icon} {opening.blurb}</span>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {path.map((n, i) =>
              i % 2 === 0 ? (
                <span key={i} className="text-frost/90">
                  <span className="text-gold/50">{i / 2 + 1}.</span> {n.san}{' '}
                  <span className="text-frost-dim">{path[i + 1] ? path[i + 1].san : ''}</span>
                </span>
              ) : null
            )}
          </div>
        )}
      </div>

      {/* The ONE step card — the single focus for the current step. */}
      {finished ? (
        <div className="cc-card p-4 md:p-5 text-center animate-pop">
          <div className="text-lg md:text-3xl font-extrabold text-gold">🎉 You finished {opening.name}!</div>
          <div className="text-sm md:text-lg text-gold/70 mt-1">
            {hasBranches(opening) ? 'Tap ↻ Restart to try the other line!' : 'Tap ↻ Restart to play it again.'}
          </div>
          {onContinue && (
            <button
              onClick={() => onContinue(path.map((n) => n.san), opening.student)}
              className="cc-btn cc-btn-grass mt-4 w-full py-3 text-base md:text-lg"
            >
              ▶ Keep playing vs the computer
            </button>
          )}
        </div>
      ) : (
        <div className="cc-card p-3 md:p-4">
          {enteredOpening && (
            <div className="mb-2 rounded-cc-lg px-3 py-2 text-sm md:text-base font-bold bg-gold/15 text-gold ring-1 ring-gold/40 animate-pop">
              🎯 This is the {enteredOpening}! Now find your plan.
            </div>
          )}
          <div className="text-xs md:text-sm uppercase tracking-wide text-gold/50 mb-1.5">
            Move {moveNo} · {roleLabel}
          </div>

          {mode === 'learn' ? (
            myTurn ? (
              /* Her move — slide the piece along the arrow */
              <>
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
                <p className="text-sm md:text-lg md:leading-snug text-frost/90 mb-2 md:mb-3">
                  {branchIsOpeningFork
                    ? 'Black chooses how to meet your 1.e4 — each move leads to a different opening. Pick one to study!'
                    : branchHasTrap
                    ? 'One move is a trap, the other is the right defense — try each, then Restart for the other!'
                    : 'Black has a few good tries here — pick one to learn, then ↻ Restart to study the others!'}
                </p>
                <div className="flex flex-col gap-2 md:gap-3">
                  {optionMoves.map((o, i) => (
                    <button
                      key={o.node.san}
                      onClick={() => playNode(o.node)}
                      className="w-full py-2.5 md:py-4 rounded-cc-lg font-extrabold text-bg active:translate-y-px text-left px-3 md:px-4 md:text-xl"
                      style={{ backgroundColor: BRANCH_COLORS[i % BRANCH_COLORS.length] }}
                    >
                      {o.node.label ||
                        (o.node.opening
                          ? `${o.node.san} → the ${o.node.opening}`
                          : `${o.node.san} — ${readSan(o.node.san)}`)}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              /* Forced opponent reply */
              <>
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
            )
          ) : myTurn ? (
            <p className="text-sm md:text-lg text-frost/90">
              Type {student === 'w' ? 'White' : 'Black'}’s move on the keypad below. Stuck? Tap “Need a hint?”.
            </p>
          ) : (
            <p className="text-sm md:text-lg text-frost-dim animate-pop">Opponent is thinking…</p>
          )}

          {/* Learn nudge when the wrong piece is dragged */}
          {mode === 'learn' && feedback && feedback.kind !== 'correct' && (
            <div className="mt-3 rounded-cc-lg px-3 py-2 text-sm md:text-base font-bold bg-gold/15 text-gold ring-1 ring-gold/40 animate-pop">
              {feedback.text}
            </div>
          )}
        </div>
      )}
      </div>

      {/* DRILL MODE — move entry pinned to the bottom (aligns with board's lower edge).
          Only on her turn; the "opponent thinking" state lives in the step card above. */}
      {mode === 'drill' && !finished && myTurn && (
        <div className="md:shrink-0 md:pt-3">
          {/* Right/wrong feedback for her typed move */}
          {feedback && (
            <div
              className={`rounded-cc-lg px-3 py-2 mb-2 text-sm md:text-base font-bold animate-pop ${
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
              <button onClick={() => setHint(1)} className="text-frost/70 underline underline-offset-2">
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
        </div>
      )}
    </>
  );

  return <PlayLayout board={board} panel={panel} focus={focusBoard} />;
}
