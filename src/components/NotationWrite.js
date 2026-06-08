import React, { useMemo, useState } from 'react';
import ChessBoard from './ChessBoard';
import NotationKeypad from './NotationKeypad';
import { newGame, evaluateInput, notationHint } from '../engine/chessEngine';
import { WRITE_MOVES } from '../data/notation';

// "Write the Move" — the board shows one move (an orange arrow); she types it in
// notation. Reuses the engine's strict checking, so a missing x/+/#/= prompts the
// same teaching reminder used in Drill/Play.
export default function NotationWrite({ pieceSet, boardTheme, moveStyle, focusBoard, onBack }) {
  const [i, setI] = useState(0);
  const [tokens, setTokens] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(false);
  const ex = WRITE_MOVES[i];
  const input = tokens.join('');

  // Canonical SAN + the arrow squares, derived from the position + from/to.
  const { san, mv } = useMemo(() => {
    const g = newGame(ex.fen);
    let m = null;
    try {
      m = g.move({ from: ex.from, to: ex.to, promotion: ex.promotion || 'q' });
    } catch {
      m = null;
    }
    return { san: m ? m.san : '', mv: m ? { from: m.from, to: m.to } : null };
  }, [ex]);

  function submit() {
    if (!input || finished) return;
    const res = evaluateInput(ex.fen, input, san);
    if (res.status === 'correct') {
      setFeedback({ kind: 'correct', text: `${san} ✓ Nice writing!` });
      setTokens([]);
      setTimeout(() => {
        if (i + 1 >= WRITE_MOVES.length) {
          setFinished(true);
        } else {
          setI(i + 1);
          setFeedback(null);
        }
      }, 800);
    } else if (res.status === 'notation') {
      setFeedback({ kind: 'warn', text: `So close — ${notationHint(res.missing)}. Try again.` });
      setTokens([]);
    } else if (res.status === 'legal') {
      setFeedback({ kind: 'warn', text: `That’s a real move — but write THIS one: follow the orange arrow (${ex.from} → ${ex.to}).` });
      setTokens([]);
    } else {
      setFeedback({ kind: 'bad', text: 'Hmm — check your notation and try again.' });
      setTokens([]);
    }
  }

  const board = (
    <ChessBoard
      fen={ex.fen}
      orientation="w"
      arrows={mv ? [{ from: mv.from, to: mv.to, color: '#ff8a3d' }] : []}
      highlights={mv ? [mv.from, mv.to] : []}
      movableColor={null}
      pieceSet={pieceSet}
      boardTheme={boardTheme}
      big={focusBoard}
      silent
    />
  );

  return (
    <div className="w-full max-w-md md:max-w-4xl mx-auto px-3 py-4 md:flex md:gap-6 md:items-start md:justify-center">
      <div className="flex flex-col items-center mb-3 md:mb-0 md:shrink-0">{board}</div>

      <div className="md:flex-1 md:max-w-md space-y-3">
        <button onClick={onBack} className="cc-btn cc-btn-ghost px-2 py-1 text-sm">← Notation</button>

        {finished ? (
          <div className="cc-card p-4 md:p-5 text-center animate-pop">
            <div className="text-lg md:text-2xl font-extrabold text-grass">🎉 You wrote every move!</div>
            <p className="text-sm text-frost-dim mt-1.5">You’ve practiced pieces, captures, checks, castling, promotion and mate.</p>
            <button
              onClick={() => { setI(0); setFinished(false); setFeedback(null); setTokens([]); }}
              className="cc-btn cc-btn-grass w-full py-2.5 mt-3 text-sm"
            >
              ↺ Practice again
            </button>
          </div>
        ) : (
          <>
            <div className="cc-card p-3">
              <div className="text-xs uppercase tracking-wide text-gold/60 font-bold mb-1">
                Write the move ({i + 1}/{WRITE_MOVES.length})
              </div>
              <p className="text-sm md:text-base text-frost/90 leading-snug">{ex.teach}</p>
              <p className="text-sm text-grass font-bold mt-1.5">👉 Type the move shown by the orange arrow.</p>
            </div>

            {feedback && (
              <div
                className={`rounded-cc-lg px-3 py-2 text-sm md:text-base font-bold animate-pop ${
                  feedback.kind === 'correct'
                    ? 'bg-grass/20 text-grass ring-1 ring-grass/40'
                    : feedback.kind === 'warn'
                    ? 'bg-gold/15 text-gold ring-1 ring-gold/40'
                    : 'bg-coral/15 text-coral ring-1 ring-coral/40'
                }`}
              >
                {feedback.text}
              </div>
            )}

            <div className="flex items-center gap-2">
              <div className="text-xs text-gold/60 font-bold whitespace-nowrap">Write:</div>
              <div className="flex-1 bg-bg-2 rounded-cc-lg ring-1 ring-edge px-3 py-2 min-h-[40px] flex items-center text-lg md:text-xl font-extrabold tracking-wider text-gold">
                {input || <span className="text-gold/30 text-sm font-bold">type the move…</span>}
              </div>
            </div>

            <NotationKeypad
              onKey={(tok) => { setTokens((t) => [...t, tok]); setFeedback(null); }}
              onBackspace={() => setTokens((t) => t.slice(0, -1))}
              onClear={() => setTokens([])}
              onSubmit={submit}
              canSubmit={!!input}
            />
          </>
        )}
      </div>
    </div>
  );
}
