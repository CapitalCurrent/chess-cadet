import React, { useEffect, useMemo, useState } from 'react';
import ChessBoard from './ChessBoard';
import NotationKeypad from './NotationKeypad';
import PlayLayout from './PlayLayout';
import { newGame, applySan, evaluateInput, coreSan, tryMove } from '../engine/chessEngine';
import { moverAt } from '../data/openings';

const PIECE_WORDS = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight' };

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

// Replay the line up to `ply` half-moves -> { fen, lastMove }. Pure & idempotent.
function buildPosition(plies, ply) {
  const game = newGame();
  let lastMove = null;
  for (let i = 0; i < ply; i++) {
    const m = applySan(game, plies[i].san);
    if (m) lastMove = { from: m.from, to: m.to };
  }
  return { fen: game.fen(), lastMove };
}

export default function OpeningTrainer({ opening, mode, pieceSet, boardTheme, moveStyle, progress, rewardMove, breakStreak, finishLine }) {
  const plies = opening.plies;
  const student = opening.student;
  const [ply, setPly] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [feedback, setFeedback] = useState(null); // {kind, text}
  const [hint, setHint] = useState(0); // 0 none, 1 piece, 2 answer
  const [wrong, setWrong] = useState(0);
  const [doneRewarded, setDoneRewarded] = useState(false);

  // Reset everything when the opening or mode changes.
  useEffect(() => {
    setPly(0);
    setTokens([]);
    setFeedback(null);
    setHint(0);
    setWrong(0);
    setDoneRewarded(false);
  }, [opening.id, mode]);

  const { fen, lastMove } = useMemo(() => buildPosition(plies, ply), [plies, ply]);
  const finished = ply >= plies.length;
  const myTurn = !finished && moverAt(ply) === student;
  const target = !finished ? plies[ply] : null;
  const justPlayed = ply > 0 ? plies[ply - 1] : null;

  // Resolve the suggested move to from/to squares (for arrows & tap-to-move).
  const targetMove = useMemo(
    () => (target ? tryMove(fen, target.san) : null),
    [fen, target]
  );

  // Learn mode: she slides the piece herself. Accept only the suggested move.
  function handleLearnMove(from, to) {
    if (!targetMove) return;
    if (from === targetMove.from && to === targetMove.to) {
      // Land the move on the SAME render as the drop — no snap-back flash.
      setFeedback({ kind: 'correct', text: `Nice! ${target.san} — ${readSan(target.san)}` });
      advance();
    } else {
      setFeedback({
        kind: 'legal',
        text: `Almost — follow the orange arrow: move the ${PIECE_WORDS[target.san[0]] || 'pawn'} to ${targetMove.to}.`,
      });
    }
  }

  // In DRILL mode, the opponent's moves play themselves after a short beat.
  useEffect(() => {
    if (mode !== 'drill' || finished) return;
    if (moverAt(ply) === student) return; // her turn — wait for input
    const t = setTimeout(() => setPly((p) => p + 1), 750);
    return () => clearTimeout(t);
  }, [mode, ply, student, finished]);

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

  function advance() {
    // NB: does not clear feedback — the celebration toast should linger after
    // the board has already moved on (prevents the drag "snap-back" flash).
    setPly((p) => p + 1);
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
      setTimeout(advance, 650);
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

  // Decide what the board shows: arrows, highlighted squares, and whether she
  // can drag a piece this step.
  let boardArrows = [];
  let boardHighlights = [];
  let boardMovable = null;
  if (!finished && targetMove) {
    if (mode === 'learn') {
      boardArrows = [{ from: targetMove.from, to: targetMove.to, color: myTurn ? '#ff8a3d' : '#4fc3f7' }];
      boardHighlights = [targetMove.from, targetMove.to];
      if (myTurn) boardMovable = student;
    } else if (mode === 'drill' && myTurn) {
      if (hint >= 1) boardHighlights = [targetMove.from];
      if (hint >= 2) boardArrows = [{ from: targetMove.from, to: targetMove.to }];
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
    />
  );

  const panel = (
    <>
      {/* Coach caption */}
      <div className="bg-surface rounded-2xl p-3 ring-1 ring-edge mb-3 min-h-[64px]">
        {finished ? (
          <div className="text-center animate-pop">
            <div className="text-lg font-extrabold text-gold">🎉 You finished {opening.name}!</div>
            <div className="text-sm text-gold/70">+5 bonus gems. Tap Restart to play it again.</div>
          </div>
        ) : justPlayed ? (
          <div className="animate-float">
            <div className="text-xs uppercase tracking-wide text-gold/50">
              Last move: <span className="text-gold font-bold">{justPlayed.san}</span> · {readSan(justPlayed.san)}
            </div>
            <div className="text-sm text-frost mt-0.5">{justPlayed.note}</div>
            {justPlayed.coach && (
              <div className="mt-1.5 text-sm text-grass flex gap-1">
                <span>🧭</span>
                <span>{justPlayed.coach}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-frost">
            {opening.icon} {opening.blurb}
          </div>
        )}
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className={`rounded-xl px-3 py-2 mb-3 text-sm font-bold animate-pop ${
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

      {/* LEARN MODE — guided: slide your piece along the arrow */}
      {mode === 'learn' && !finished && (
        <div className="bg-surface rounded-2xl p-3 ring-1 ring-edge">
          <div className="text-xs uppercase tracking-wide text-gold/50 mb-1">
            {myTurn ? 'Your move' : "Opponent's move"}
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-extrabold text-gold">{target.san}</span>
            <span className="text-sm text-frost">{readSan(target.san)}</span>
          </div>
          <p className="text-sm text-frost/90 mt-1">{target.note}</p>

          {myTurn ? (
            <>
              <div className="mt-2 text-sm text-grass font-bold">
                👉 Slide the {PIECE_WORDS[target.san[0]] || 'pawn'} along the orange arrow
                {targetMove ? ` to ${targetMove.to}` : ''}.
              </div>
              <button
                onClick={advance}
                className="mt-3 w-full py-2.5 rounded-xl bg-edge text-frost font-bold active:translate-y-px"
              >
                Show me ▶
              </button>
            </>
          ) : (
            <button
              onClick={advance}
              className="mt-3 w-full py-3 rounded-xl bg-grass text-bg font-extrabold text-lg active:translate-y-px"
            >
              Opponent plays ▶
            </button>
          )}
        </div>
      )}

      {/* DRILL MODE — she types her moves */}
      {mode === 'drill' && !finished && (
        <div>
          {myTurn ? (
            <>
              {/* Input line */}
              <div className="flex items-center gap-2 mb-2">
                <div className="text-xs text-gold/60 font-bold whitespace-nowrap">
                  {student === 'w' ? 'White' : 'Black'} to play:
                </div>
                <div className="flex-1 bg-bg rounded-xl ring-2 ring-edge px-3 py-2 min-h-[42px] flex items-center text-xl font-extrabold tracking-wider text-gold">
                  {input || <span className="text-gold/30">type your move…</span>}
                </div>
              </div>

              {/* Hint ladder */}
              <div className="mb-2 min-h-[20px] text-sm">
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
            <div className="text-center text-frost/60 text-sm py-6 animate-pop">
              Opponent is thinking…
            </div>
          )}
        </div>
      )}
    </>
  );

  return <PlayLayout board={board} panel={panel} />;
}
