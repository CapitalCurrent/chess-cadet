import React, { useEffect, useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import NotationKeypad from './NotationKeypad';
import PlayLayout from './PlayLayout';
import { newGame } from '../engine/chessEngine';
import { topMoves, shallowMove, levelWeakening, pickWeakened, levelTier, levelEloLabel, initEngine } from '../engine/stockfishEngine';
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
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to }
  const [level, setLevel] = useState(() => {
    const v = parseInt(localStorage.getItem('chess-cadet-level'), 10);
    return v >= 1 && v <= 20 ? v : 3;
  });
  const [opponentType, setOpponentType] = useState(() => {
    const v = localStorage.getItem('chess-cadet-opponent');
    if (v === 'human2') return 'human2'; // pass-and-play (two humans, one device)
    return v === 'maia' || v === 'human' ? 'maia' : 'stockfish'; // 'human' = legacy Maia value
  });
  const [autoFlip, setAutoFlip] = useState(
    () => localStorage.getItem('chess-cadet-autoflip') !== 'off'
  ); // pass-and-play: rotate board to whoever is to move
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
    localStorage.setItem('chess-cadet-autoflip', autoFlip ? 'on' : 'off');
  }, [autoFlip]);
  useEffect(() => {
    initEngine(); // warm up the Stockfish worker
  }, []);
  useEffect(() => onMaiaStatus((status, progress) => setMaia({ status, progress })), []);
  useEffect(() => {
    if (opponentType === 'maia') initMaia(); // warm up (loads from cache if present)
  }, [opponentType]);

  const input = tokens.join('');
  const game = gameRef.current;
  const twoPlayer = opponentType === 'human2'; // pass-and-play: both sides human, no engine
  const toMove = game.turn();
  const activeColor = twoPlayer ? toMove : studentColor; // whose move it is right now
  const myTurn = !over && (twoPlayer || toMove === studentColor);
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

  // Opponent replies on its turn. Stockfish levels weaken by choosing a
  // deliberately suboptimal (but never random) move from its top candidates;
  // if the engine ever fails it falls back to a random legal move.
  useEffect(() => {
    if (twoPlayer || over || game.turn() === studentColor) return; // no engine in pass-and-play
    let cancelled = false;
    const weak = levelWeakening(level);
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
    const useMaia = opponentType === 'maia' && maia.status === 'ready';
    // A little "thinking" pause so moves don't feel rushed — Maia (whose
    // inference is near-instant) gets a slightly longer one; both get jitter.
    const thinkDelay = (useMaia ? 550 : 300) + Math.random() * (useMaia ? 300 : 250);
    const t = setTimeout(() => {
      if (useMaia) {
        maiaMove(fenNow, humanRating, humanRating).then(apply).catch(() => apply(null));
      } else {
        const r = Math.random();
        if (r < weak.hangChance) {
          // Rare outright blunder — depth-1 search can hang a piece outright.
          shallowMove(fenNow, { depth: 1 }).then(apply);
        } else if (r < weak.hangChance + weak.tacticMissChance) {
          // More common: a natural move from a depth-2 search that misses a tactic.
          shallowMove(fenNow, { depth: 2 }).then(apply);
        } else {
          // Otherwise a suboptimal-but-sensible move from the top candidates.
          topMoves(fenNow, weak).then((cands) => apply(pickWeakened(cands, weak.pBest)));
        }
      }
    }, thinkDelay);

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

  // Apply a board move (optionally with a chosen promotion piece).
  function applyBoardMove(from, to, promotion) {
    let move = null;
    try {
      move = gameRef.current.move(promotion ? { from, to, promotion } : { from, to });
    } catch {
      move = null;
    }
    if (!move) return;
    setFeedback({ kind: 'good', text: `${move.san} ✓` });
    setTokens([]);
    pushMove(move);
    rewardMove && rewardMove(0);
    if (gameRef.current.isCheckmate()) rewardMove && rewardMove(10);
  }

  // Move by dragging/tapping (alternative to typing). ChessBoard only calls this
  // with legal from/to. A pawn reaching the last rank opens the promotion chooser.
  function handleBoardMove(from, to) {
    if (!myTurn) return;
    const isPromo = gameRef.current
      .moves({ square: from, verbose: true })
      .some((m) => m.to === to && m.promotion);
    if (isPromo) {
      setPendingPromotion({ from, to });
      return;
    }
    applyBoardMove(from, to);
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
    if (type === 'maia') initMaia();
  }
  function downloadMaia() {
    ensureMaiaReady({ allowDownload: true });
  }

  function takeback() {
    const g = gameRef.current;
    if (!g.history().length) return;
    g.undo(); // undo opponent (or last)
    // vs an engine, step back a second time so it's her turn again; in pass-and-play
    // a single undo correctly hands the move back to the previous player.
    if (!twoPlayer && g.history().length && g.turn() !== studentColor) g.undo();
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

  const baseOrientation = twoPlayer ? 'w' : studentColor;
  const viewOrientation =
    twoPlayer && autoFlip
      ? toMove // follow the player to move so each side sees their pieces at the bottom
      : flipped
      ? baseOrientation === 'w'
        ? 'b'
        : 'w'
      : baseOrientation;

  const board = (
    <ChessBoard
      fen={fen}
      orientation={viewOrientation}
      lastMove={lastMove}
      movableColor={myTurn ? activeColor : null}
      moveStyle={moveStyle}
      onMove={handleBoardMove}
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
          ) : twoPlayer ? (
            <span className="text-grass">
              {toMove === 'w' ? '♔ White' : '♚ Black'} to move{inCheck ? ' — check!' : ''} ✍️
            </span>
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
          {twoPlayer ? (
            <button
              onClick={() => setAutoFlip((a) => !a)}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-edge ${
                autoFlip ? 'bg-gold text-bg' : 'bg-surface text-gold'
              }`}
              title="Rotate the board to whoever is to move"
            >
              ⟳ Auto-flip
            </button>
          ) : (
            <button
              onClick={flipView}
              className={`rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-edge ${
                flipped ? 'bg-gold text-bg' : 'bg-surface text-gold'
              }`}
              title="Flip the board to see the opponent's view"
            >
              ⇄ Flip
            </button>
          )}
          <button onClick={() => startNew(studentColor)} className="rounded-lg px-2.5 py-1 text-xs font-bold bg-surface text-coral ring-1 ring-edge">
            ↺ New
          </button>
        </div>
      </div>

      {/* Side picker — choose which color to play (starts a fresh game). Hidden in
          pass-and-play, where both colors are played on the same device. */}
      {!twoPlayer && (
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
      )}

      {/* Opponent picker */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-[11px] uppercase tracking-wide text-gold/50 font-bold whitespace-nowrap">
          Opponent
        </span>
        {[
          { t: 'stockfish', label: '🤖 Bot' },
          { t: 'maia', label: '🙂 Maia' },
          { t: 'human2', label: '👥 2 Players' },
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
          <div className="w-28 text-right whitespace-nowrap leading-tight">
            <div className="text-xs font-bold text-gold">{level} · {levelTier(level)}</div>
            <div className="text-[10px] text-gold/60">{levelEloLabel(level)} Elo</div>
          </div>
        </div>
      ) : opponentType === 'maia' ? (
        /* Maia rating + model status */
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
              <span className="text-grass font-bold">🙂 Maia is ready — plays like a {humanRating} player.</span>
            ) : maia.status === 'downloading' ? (
              <div>
                <div className="text-frost/70 mb-1">Downloading human opponent… {maia.progress}%</div>
                <div className="h-1.5 rounded-full bg-edge overflow-hidden">
                  <div className="h-full bg-gold transition-all" style={{ width: `${maia.progress}%` }} />
                </div>
              </div>
            ) : maia.status === 'error' ? (
              <span className="text-coral">Couldn’t load Maia — using the practice bot.</span>
            ) : navigator.onLine ? (
              <div>
                <button onClick={downloadMaia} className="rounded-lg px-2.5 py-1 font-bold bg-grass text-bg active:translate-y-px">
                  ⬇ Get Maia (one-time ~44 MB)
                </button>
                <span className="ml-2 text-frost/50">Practice bot plays until she’s ready.</span>
              </div>
            ) : (
              <span className="text-frost/60">
                Connect to the internet once to download Maia. Using the practice bot for now.
              </span>
            )}
          </div>
        </div>
      ) : (
        /* Pass-and-play hint */
        <div className="mb-2 text-xs text-frost/70 bg-surface rounded-xl ring-1 ring-edge px-3 py-2">
          👥 <span className="font-bold text-gold">Pass-and-play</span> — two players share
          this device and take turns typing each move. No engine plays.
          {autoFlip ? ' The board flips to each player automatically.' : ''}
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
              {activeColor === 'w' ? 'White' : 'Black'} types:
            </div>
            <div className="flex-1 bg-bg rounded-xl ring-2 ring-edge px-3 py-2 min-h-[42px] flex items-center text-xl font-extrabold tracking-wider text-gold">
              {input || <span className="text-gold/30">{myTurn ? 'type, or move on the board…' : 'waiting…'}</span>}
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

  return (
    <>
      <PlayLayout board={board} panel={panel} />

      {pendingPromotion && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPendingPromotion(null)}
        >
          <div className="bg-surface rounded-2xl ring-1 ring-edge p-4 animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="text-sm font-bold text-gold mb-3 text-center">Promote your pawn to…</div>
            <div className="flex gap-2">
              {['q', 'r', 'b', 'n'].map((t) => (
                <button
                  key={t}
                  onClick={() => {
                    const p = pendingPromotion;
                    setPendingPromotion(null);
                    applyBoardMove(p.from, p.to, t);
                  }}
                  className="w-16 h-16 rounded-xl bg-bg ring-1 ring-edge hover:ring-gold active:translate-y-px flex items-center justify-center"
                >
                  <div className="w-12 h-12 flex items-center justify-center" style={{ transform: `scale(${pieceSet.scale || 1})` }}>
                    {pieceSet.render(activeColor, t)}
                  </div>
                </button>
              ))}
            </div>
            <div className="mt-2 text-center text-[11px] text-frost/40">Tap a piece (or tap outside to cancel)</div>
          </div>
        </div>
      )}
    </>
  );
}
