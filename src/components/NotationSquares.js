import React, { useState } from 'react';
import { getBoardTheme } from '../pieces/boardThemes';

// "Find the Square" — the foundational coordinate game. The board shows file
// (a–h) and rank (1–8) labels; she taps the called-out square. Teaches how to
// read coordinates before writing whole moves.
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = [8, 7, 6, 5, 4, 3, 2, 1];
const TOTAL = 10;

function randomSquare() {
  return FILES[Math.floor(Math.random() * 8)] + (1 + Math.floor(Math.random() * 8));
}

export default function NotationSquares({ boardTheme, onBack }) {
  const theme = boardTheme || getBoardTheme('wood');
  const [target, setTarget] = useState(randomSquare);
  const [done, setDone] = useState(0);
  const [feedback, setFeedback] = useState(null);
  const [finished, setFinished] = useState(false);

  function tap(sq) {
    if (finished) return;
    if (sq === target) {
      const n = done + 1;
      setDone(n);
      if (n >= TOTAL) {
        setFinished(true);
        setFeedback({ ok: true, text: `✓ ${sq} — that’s all ${TOTAL}! 🎉` });
        return;
      }
      setFeedback({ ok: true, text: `✓ Yes — that’s ${sq}!` });
      setTimeout(() => {
        setTarget(randomSquare());
        setFeedback(null);
      }, 500);
    } else {
      setFeedback({ ok: false, text: `That’s ${sq}. Find ${target} — files go a→h across, ranks 1→8 up.` });
    }
  }

  function restart() {
    setDone(0);
    setFinished(false);
    setFeedback(null);
    setTarget(randomSquare());
  }

  return (
    <div className="w-full max-w-md md:max-w-xl mx-auto px-3 py-4">
      <button onClick={onBack} className="cc-btn cc-btn-ghost px-2 py-1 text-sm mb-2">← Notation</button>

      <div className="cc-card p-3 mb-3 text-center">
        {finished ? (
          <div className="text-lg md:text-xl font-extrabold text-grass">🎉 Great job — you found all {TOTAL}!</div>
        ) : (
          <>
            <div className="text-xs uppercase tracking-wide text-gold/60 font-bold">Find the square ({done}/{TOTAL})</div>
            <div className="text-3xl md:text-4xl font-extrabold text-gold mt-0.5">Tap {target}</div>
          </>
        )}
        {feedback && (
          <div className={`mt-2 text-sm font-bold ${feedback.ok ? 'text-grass' : 'text-coral'}`}>{feedback.text}</div>
        )}
        {finished && (
          <button onClick={restart} className="cc-btn cc-btn-grass w-full py-2.5 mt-3 text-sm">↺ Play again</button>
        )}
      </div>

      {/* Coordinate board */}
      <div className="flex justify-center">
        <div className="flex">
          <div className="flex flex-col justify-around pr-1 text-gold/80 font-bold text-sm">
            {RANKS.map((r) => (
              <div key={r} className="h-[12.5%] flex items-center">{r}</div>
            ))}
          </div>
          <div>
            <div
              className="grid grid-cols-8 rounded-lg overflow-hidden shadow-2xl ring-2 ring-edge w-[min(86vw,56vh,440px)]"
              style={{ aspectRatio: '1 / 1' }}
            >
              {RANKS.map((r) =>
                FILES.map((f, col) => {
                  const light = (col + r) % 2 === 0;
                  const sq = f + r;
                  return (
                    <button
                      key={sq}
                      onClick={() => tap(sq)}
                      className="aspect-square active:brightness-110"
                      style={{ backgroundColor: light ? theme.light : theme.dark }}
                      aria-label={sq}
                    />
                  );
                })
              )}
            </div>
            <div className="grid grid-cols-8 pt-1 text-gold/80 font-bold text-sm">
              {FILES.map((f) => (
                <div key={f} className="text-center">{f}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
