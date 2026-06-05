import React, { useEffect, useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import NotationKeypad from './NotationKeypad';
import PlayLayout from './PlayLayout';
import { newGame } from '../engine/chessEngine';
import { bestMove, levelConfig, levelTier, initEngine } from '../engine/stockfishEngine';
import { initMaia, ensureMaiaReady, maiaMove, onMaiaStatus, getMaiaStatus } from '../engine/maiaEngine';

// Notation-only game. The board is DISPLAY ONLY — every move must be typed on
// the keypad. A simple random-mover opponent replies (very beatable; a real
// engine can replace it later). The move list reinforces reading notation.
export default function FreePlay({ pieceSet, boardTheme, moveStyle, rewardMove }) {
  const gameRef = useRef(newGame());
  const [fen, setFen] = useState(gameRef.current.fen());
  const [history, setHistory] = useState([]); // SAN strings
  const [tokens, setTokens] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [over, setOver] = useState(null); // { text }
  const [lastMove, setLastMove] = useState(null);
  const [studentColor, setStudentColor] = useState('w');
  const [flipped, setFlipped] = useState(false); // view-only board flip
  const [level, setLevel] = useState(() => {
    const v = parseInt(localStorage.getItem('chess-cadet-level'), 10);
    return v >= 1 && v <= 20 ? v : 3;
  });
  const [opponentType, setOpponentType] = useState(
    () => localStorage.getItem('chess-cadet-opponent') || 'stockfish'
  );
  const [humanRating, setHumanRating] = useState(() => {
    const v = parseInt(localStorage.getItem('chess-cadet-humanrating'), 10);
    return v >= 1100 && v <= 1900 ? v : 1100;
  });
  const [maia, setMaia] = useState(getMaiaStatus); // { status, progress }

  useEffect(() => {
    localStorage.setItem('chess-cadet-level', String(level));
  }, [level]);
  useEffect(() => {
    localStorage.setItem('chess-cadet-opponent', opponentType);
  }, [opponentType]);
  useEffect(() => {
    localStorage.setItem('chess-cadet-humanrating', String(humanRating));
  }, [humanRating]);
  useEffect(() => {
    initEngine(); // warm up the Stockfish worker
  }, []);
  useEffect(() => onMaiaStatus((status, progress) => setMaia({ status, progress })), []);
  useEffect(() => {
    if (opponentType === 'human') initMaia(); // warm up (loads from cache if present)
  }, [opponentType]);

  const input = tokens.join('');
  const game = gameRef.current;
  const myTurn = !over && game.turn() === studentColor;
  const inCheck = !over && game.inCheck();

  function checkEnd() {
    const g = gameRef.current;
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'Black' : 'White';
      setOver({ text: `Checkmate — ${winner} wins! 🏆`, winner });
    } else if (g.isStalemate()) {
      setOver({ text: 'Stalemate — it’s a draw. 🤝' });
    } else if (g.isInsufficientMaterial() || g.isThreefoldRepetition() || g.isDraw()) {
      setOver({ text: 'Draw. 🤝' });
    }
  }

  function pushMove(move) {
    setFen(gameRef.current.fen());
    setHistory(gameRef.current.history());
    setLastMove({ from: move.from, to: move.to });
    checkEnd();
  }

  // Opponent (Stockfish) replies on its turn. Low levels mix in deliberate
  // blunders; if the engine ever fails it falls back to a random legal move.
  useEffect(() => {
    if (over || game.turn() === studentColor) return;
    let cancelled = false;
    const cfg = levelConfig(level);
    const g = gameRef.current;
    const fenNow = g.fen();

    const apply = (uci) => {
      if (cancelled) return;
      let move = null;
      if (uci && uci.length >= 4) {
        try {
          move = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
        } catch {
          move = null;
        }
      }
      if (!move) {
        const ms = g.moves({ verbose: true });
        if (!ms.length) return checkEnd();
        move = g.move(ms[Math.floor(Math.random() * ms.length)].san); // fallback
      }
      if (move) pushMove(move);
    };

    // Human (Maia) opponent when selected AND the model is ready; otherwise the
    // Stockfish practice bot fills in (incl. while Maia is still downloading or
    // when offline without a cached model).
    const useMaia = opponentType === 'human' && maia.status === 'ready';
    const t = setTimeout(() => {
      if (useMaia) {
        maiaMove(fenNow, humanRating, humanRating).then(apply).catch(() => apply(null));
      } else if (Math.random() < cfg.blunder) {
        const ms = g.moves({ verbose: true });
        const m = ms.length ? ms[Math.floor(Math.random() * ms.length)] : null;
        apply(m ? m.from + m.to + (m.promotion || '') : null);
      } else {
        bestMove(fenNow, { skill: cfg.skill, movetime: cfg.movetime }).then(apply);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fen, over, studentColor, level, opponentType, humanRating, maia.status]); // eslint-disable-line react-hooks/exhaustive-deps

  function submit() {
    if (!myTurn || !input) return;
    let move = null;
    try {
      move = gameRef.current.move(input);
    } catch {
      move = null;
    }
    if (!move) {
      setFeedback({ kind: 'bad', text: "That isn't a legal move here — check your notation!" });
      setTokens([]);
      return;
    }
    setFeedback({ kind: 'good', text: `${move.san} ✓` });
    setTokens([]);
    pushMove(move);
    rewardMove && rewardMove(0);
    if (gameRef.current.isCheckmate()) rewardMove && rewardMove(10); // she delivered mate!
  }

  function startNew(color) {
    gameRef.current = newGame();
    setStudentColor(color);
    setFlipped(false);
    setFen(gameRef.current.fen());
    setHistory([]);
    setTokens([]);
    setFeedback(null);
    setOver(null);
    setLastMove(null);
  }

  // Flip the board view only — a temporary peek from the opponent's side.
  // She still controls the same color; the engine is untouched.
  function flipView() {
    setFlipped((f) => !f);
  }

  function selectOpponent(type) {
    setOpponentType(type);
    if (type === 'human') initMaia();
  }
  function downloadMaia() {
    ensureMaiaReady({ allowDownload: true });
  }

  function takeback() {
    const g = gameRef.current;
    if (!g.history().length) return;
    g.undo(); // undo opponent (or last)
    if (g.history().length && g.turn() !== studentColor) g.undo(); // back to her turn
    setOver(null);
    setFeedback(null);
    setFen(g.fen());
    setHistory(g.history());
    const h = g.history({ verbose: true });
    const last = h[h.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
  }

  // numbered move-list rows
  const rows = [];
  for (let i = 0; i < history.length; i += 2) {
    rows.push({ n: i / 2 + 1, w: history[i], b: history[i + 1] });
  }

  const viewOrientation = flipped ? (studentColor === 'w' ? 'b' : 'w') : studentColor;

  const board = (
    <ChessBoard
      fen={fen}
      orientation={viewOrientation}
      lastMove={lastMove}
      pieceSet={pieceSet}
      boardTheme={boardTheme}
    />
  );

  const panel = (
    <>
      {/* Status + controls */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="text-sm font-bold">
          {over ? (
            <span className="text-gold animate-pop">{over.text}</span>
          ) : myTurn ? (
            <span className="text-grass">
              Your move{inCheck ? ' — you’re in check!' : ''} ✍️
            </span>
          ) : (
            <span className="text-frost/60">Opponent thinking…</span>
          )}
        </div>
        <div className="flex gap-1.5">
          <button onClick={takeback} className="rounded-lg px-2.5 py-1 text-xs font-bold bg-surface text-frost ring-1 ring-edge">
            ⤺ Undo
          </button>
          <button
            onClick={flipView}
            className={`rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-edge ${
              flipped ? 'bg-gold text-bg' : 'bg-surface text-gold'
            }`}
            title="Flip the board to see the opponent's view"
          >
            ⇄ Flip
          </button>
          <button onClick={() => startNew(studentColor)} className="rounded-lg px-2.5 py-1 text-xs font-bold bg-surface text-coral ring-1 ring-edge">
            ↺ New
          </button>
        </div>
      </div>

      {/* Side picker — choose which color to play (starts a fresh game) */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-wide text-gold/50 font-bold whitespace-nowrap">
          Play as
        </span>
        {[
          { c: 'w', label: '♔ White' },
          { c: 'b', label: '♚ Black' },
        ].map((s) => (
          <button
            key={s.c}
            onClick={() => { if (s.c !== studentColor) startNew(s.c); }}
            className={`flex-1 rounded-lg px-2 py-1 text-xs font-bold ring-1 ring-edge transition ${
              studentColor === s.c ? 'bg-gold text-bg' : 'bg-surface text-gold/80'
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Opponent picker */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-wide text-gold/50 font-bold whitespace-nowrap">
          Opponent
        </span>
        {[
          { t: 'stockfish', label: '🤖 Practice Bot' },
          { t: 'human', label: '🧒 Human' },
        ].map((o) => (
          <button
            key={o.t}
            onClick={() => selectOpponent(o.t)}
            className={`flex-1 rounded-lg px-2 py-1 text-xs font-bold ring-1 ring-edge transition ${
              opponentType === o.t ? 'bg-gold text-bg' : 'bg-surface text-gold/80'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {opponentType === 'stockfish' ? (
        /* Stockfish difficulty */
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] uppercase tracking-wide text-gold/50 font-bold whitespace-nowrap">
            Level
          </span>
          <input
            type="range"
            min="1"
            max="20"
            value={level}
            onChange={(e) => setLevel(Number(e.target.value))}
            className="flex-1 accent-gold"
          />
          <span className="text-xs font-bold text-gold whitespace-nowrap w-28 text-right">
            {level} · {levelTier(level)}
          </span>
        </div>
      ) : (
        /* Human (Maia) rating + model status */
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] uppercase tracking-wide text-gold/50 font-bold whitespace-nowrap">
              Rating
            </span>
            <input
              type="range"
              min="1100"
              max="1900"
              step="100"
              value={humanRating}
              onChange={(e) => setHumanRating(Number(e.target.value))}
              className="flex-1 accent-gold"
            />
            <span className="text-xs font-bold text-gold whitespace-nowrap w-20 text-right">{humanRating}</span>
          </div>
          <div className="mt-1.5 text-xs">
            {maia.status === 'ready' ? (
              <span className="text-grass font-bold">🧒 Human opponent ready — plays like a {humanRating} player.</span>
            ) : maia.status === 'downloading' ? (
              <div>
                <div className="text-frost/70 mb-1">Downloading human opponent… {maia.progress}%</div>
                <div className="h-1.5 rounded-full bg-edge overflow-hidden">
                  <div className="h-full bg-gold transition-all" style={{ width: `${maia.progress}%` }} />
                </div>
              </div>
            ) : maia.status === 'error' ? (
              <span className="text-coral">Couldn’t load the human opponent — using the practice bot.</span>
            ) : navigator.onLine ? (
              <div>
                <button onClick={downloadMaia} className="rounded-lg px-2.5 py-1 font-bold bg-grass text-bg active:translate-y-px">
                  ⬇ Get human opponent (one-time ~44 MB)
                </button>
                <span className="ml-2 text-frost/50">Practice bot plays until it’s ready.</span>
              </div>
            ) : (
              <span className="text-frost/60">
                Connect to the internet once to download the human opponent. Using the practice bot for now.
              </span>
            )}
          </div>
        </div>
      )}

      {/* Move list */}
      <div className="bg-surface rounded-xl ring-1 ring-edge p-2 mb-3 max-h-24 overflow-y-auto text-sm">
        {rows.length === 0 ? (
          <span className="text-frost/40">Moves will appear here in notation…</span>
        ) : (
          <div className="flex flex-wrap gap-x-3 gap-y-0.5">
            {rows.map((r) => (
              <span key={r.n} className="text-frost/90">
                <span className="text-gold/50">{r.n}.</span> {r.w} <span className="text-frost/60">{r.b || ''}</span>
              </span>
            ))}
          </div>
        )}
      </div>

      {feedback && (
        <div
          className={`rounded-xl px-3 py-2 mb-3 text-sm font-bold animate-pop ${
            feedback.kind === 'good'
              ? 'bg-grass/20 text-grass ring-1 ring-grass/40'
              : 'bg-coral/15 text-coral ring-1 ring-coral/40'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Input + keypad (the only way to move) */}
      {!over && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs text-gold/60 font-bold whitespace-nowrap">
              {studentColor === 'w' ? 'White' : 'Black'} types:
            </div>
            <div className="flex-1 bg-bg rounded-xl ring-2 ring-edge px-3 py-2 min-h-[42px] flex items-center text-xl font-extrabold tracking-wider text-gold">
              {input || <span className="text-gold/30">{myTurn ? 'type your move…' : 'waiting…'}</span>}
            </div>
          </div>
          <NotationKeypad
            onKey={(tok) => { setTokens((t) => [...t, tok]); setFeedback(null); }}
            onBackspace={() => setTokens((t) => t.slice(0, -1))}
            onClear={() => setTokens([])}
            onSubmit={submit}
            disabled={!myTurn}
            canSubmit={!!input && myTurn}
          />
        </>
      )}

      {over && (
        <button
          onClick={() => startNew(studentColor)}
          className="w-full py-3 rounded-xl bg-grass text-bg font-extrabold text-lg active:translate-y-px"
        >
          ↺ Play again
        </button>
      )}
    </>
  );

  return <PlayLayout board={board} panel={panel} />;
}
