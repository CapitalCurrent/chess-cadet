import React, { useEffect, useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import NotationKeypad from './NotationKeypad';
import PlayLayout from './PlayLayout';
import Segmented from './nav/Segmented';
import MoveLog from './MoveLog';
import { IconUndo, IconFlip, IconRestart, IconClose } from './icons';
import { detectMotifs, motifsOfMove } from '../engine/tactics';
import { newGame } from '../engine/chessEngine';
import { topMoves, shallowMove, levelWeakening, pickWeakened, levelTier, levelEloLabel, initEngine, analyze } from '../engine/stockfishEngine';
import { initMaia, ensureMaiaReady, maiaMove, maiaBestMove, onMaiaStatus, getMaiaStatus } from '../engine/maiaEngine';

// Notation-only game. The board is DISPLAY ONLY — every move must be typed on
// the keypad. A simple random-mover opponent replies (very beatable; a real
// engine can replace it later). The move list reinforces reading notation.
// Build a game, optionally replaying a seed line (the opening she just drilled)
// so "Continue vs Computer" picks up from that exact position.
function seededGame(seed) {
  const g = newGame();
  if (seed && Array.isArray(seed.moves)) {
    for (const san of seed.moves) {
      try {
        g.move(san);
      } catch {
        /* skip anything unexpected */
      }
    }
  }
  return g;
}

export default function FreePlay({ pieceSet, boardTheme, moveStyle, focusBoard, seed, rewardMove }) {
  const gameRef = useRef();
  if (!gameRef.current) gameRef.current = seededGame(seed);
  const [fen, setFen] = useState(() => gameRef.current.fen());
  const [history, setHistory] = useState(() => gameRef.current.history()); // SAN strings
  const [tokens, setTokens] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [over, setOver] = useState(null); // { text }
  const [lastMove, setLastMove] = useState(() => {
    const h = gameRef.current.history({ verbose: true });
    const last = h[h.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  });
  const [studentColor, setStudentColor] = useState(() => (seed && seed.color) || 'w');
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
  const [coach, setCoach] = useState(
    () => localStorage.getItem('chess-cadet-coach') === 'on'
  ); // Spar: grade her moves + offer hints when playing the engine
  const [coachNote, setCoachNote] = useState(null); // { kind, text }
  const [review, setReview] = useState(null); // null | { running, done, total, rows, summary }
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
    localStorage.setItem('chess-cadet-coach', coach ? 'on' : 'off');
  }, [coach]);
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
    const beforeFen = gameRef.current.fen();
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
    if (coachActive) gradeMove(beforeFen, move);
    rewardMove && rewardMove(0);
    if (gameRef.current.isCheckmate()) rewardMove && rewardMove(10); // she delivered mate!
  }

  // Apply a board move (optionally with a chosen promotion piece).
  function applyBoardMove(from, to, promotion) {
    const beforeFen = gameRef.current.fen();
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
    if (coachActive) gradeMove(beforeFen, move);
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
    gameRef.current = seededGame(seed); // a seeded game restarts from the opening
    setStudentColor(color);
    setFlipped(false);
    setFen(gameRef.current.fen());
    setHistory(gameRef.current.history());
    setTokens([]);
    setFeedback(null);
    setCoachNote(null);
    setOver(null);
    const h = gameRef.current.history({ verbose: true });
    const last = h[h.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
  }

  // Flip the board view only — a temporary peek from the opponent's side.
  // She still controls the same color; the engine is untouched.
  function flipView() {
    setFlipped((f) => !f);
  }

  // ── Coach (Spar) — grade her move by how it ranks among the engine's best ──
  const coachActive = coach && !twoPlayer; // only meaningful vs an engine

  function uciToSan(fen, uci) {
    if (!uci) return '';
    try {
      const g = newGame(fen);
      const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
      return m ? m.san : uci;
    } catch {
      return uci;
    }
  }

  // SAN + whether the move is forcing (a capture or a check) — used to spot a
  // missed tactic ("always look at captures and checks first").
  function moveInfo(fen, uci) {
    try {
      const g = newGame(fen);
      const m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
      if (!m) return { san: uci, capture: false, check: false };
      return {
        san: m.san,
        capture: /x/.test(m.san) || (m.flags && /[ce]/.test(m.flags)),
        check: /[+#]/.test(m.san),
      };
    } catch {
      return { san: uci, capture: false, check: false };
    }
  }

  // Normalize an eval to a single number (centipawns); mate -> a big value.
  function scoreNum(c) {
    if (!c) return 0;
    if (typeof c.mate === 'number') return (c.mate >= 0 ? 1 : -1) * (100000 - Math.abs(c.mate) * 100);
    return typeof c.cp === 'number' ? c.cp : 0;
  }

  // A human-level move suggestion: Maia at her rating (learnable) if loaded,
  // otherwise Stockfish's best as a fallback. Returns SAN or null.
  async function humanSuggestion(fen) {
    if (maia.status === 'ready') {
      try {
        const mv = await maiaBestMove(fen, humanRating, humanRating);
        if (mv) return uciToSan(fen, mv);
      } catch {
        /* fall through */
      }
    }
    try {
      const cands = (await analyze(fen, { multipv: 1, movetime: 400 })) || [];
      if (cands.length) return uciToSan(fen, cands[0].move);
    } catch {
      /* ignore */
    }
    return null;
  }

  // Classify a move by EVAL DROP (a real-blunder check, not "did it match the
  // engine's exact best") and recognize/name tactics. Returns
  // { kind, icon, label, text } or null. Shared by the live coach AND Game
  // Review. useHumanHint -> Maia-level suggestion for inaccuracies (live play);
  // off -> the engine's move (faster, used for batch review).
  async function classifyMove(beforeFen, uci, afterFen, { movetime = 600, useHumanHint = false } = {}) {
    let cands = [];
    try {
      cands = (await analyze(beforeFen, { multipv: 5, movetime })) || [];
    } catch {
      cands = [];
    }
    if (!cands.length) return null;
    const bestCp = scoreNum(cands[0]);
    const found = cands.find((c) => c.move === uci);
    let herCp;
    if (found) {
      herCp = scoreNum(found);
    } else {
      let after = [];
      try {
        after = (await analyze(afterFen, { multipv: 1, movetime: Math.max(250, movetime - 200) })) || [];
      } catch {
        after = [];
      }
      herCp = after.length ? -scoreNum(after[0]) : bestCp - 400;
    }
    const loss = bestCp - herCp; // centipawns given up vs the best move
    const her = moveInfo(beforeFen, uci);
    if (loss <= 50) {
      const isBest = uci === cands[0].move;
      const spike = cands.length >= 2 ? scoreNum(cands[0]) - scoreNum(cands[1]) : 999;
      const winning = bestCp >= 150;
      if (isBest && /#/.test(her.san)) return { kind: 'best', icon: '🏆', label: 'Checkmate', text: '🏆 Checkmate! Brilliant finish!' };
      if (isBest && winning && spike >= 150) {
        const motifs = detectMotifs(afterFen, uci.slice(0, 2), uci.slice(2, 4));
        if (motifs.includes('fork')) return { kind: 'best', icon: '✦', label: 'Fork', text: `✦ Nice fork! ${her.san} attacks two pieces at once.` };
        if (motifs.includes('discovered')) return { kind: 'best', icon: '✦', label: 'Discovery', text: `✦ Discovered attack! ${her.san} unleashes a piece from behind.` };
        if (motifs.includes('pin')) return { kind: 'best', icon: '✦', label: 'Pin', text: `✦ Nice pin! ${her.san} freezes a piece against a bigger one.` };
        if (her.capture) return { kind: 'best', icon: '💥', label: 'Tactic', text: `💥 Nice tactic! ${her.san} wins material — well spotted!` };
        if (her.check) return { kind: 'best', icon: '💥', label: 'Tactic', text: `💥 Strong — ${her.san} is a winning check!` };
        return { kind: 'best', icon: '💥', label: 'Tactic', text: `💥 Sharp! ${her.san} is the winning move here.` };
      }
      if (isBest && her.check) return { kind: 'best', icon: '👍', label: 'Strong', text: `👍 Strong check — ${her.san}!` };
      if (isBest) return { kind: 'best', icon: '⭐', label: 'Best', text: '⭐ Best move! Right on the money.' };
      return { kind: 'good', icon: '👍', label: 'Great', text: '👍 Great move — among the best here.' };
    }
    if (loss <= 150) return { kind: 'good', icon: '🙂', label: 'Good', text: '🙂 Good — a solid, safe move.' };
    const best = moveInfo(beforeFen, cands[0].move);
    const bestMotifs = motifsOfMove(beforeFen, cands[0].move);
    const missedName = bestMotifs.includes('fork')
      ? 'fork'
      : bestMotifs.includes('discovered')
      ? 'discovered attack'
      : bestMotifs.includes('pin')
      ? 'pin'
      : null;
    const missedTactic = bestCp >= 150 && loss >= 200 && (best.capture || best.check || bestMotifs.length);
    if (missedTactic && missedName) return { kind: 'warn', icon: '💥', label: `Missed ${missedName}`, text: `💥 You missed a ${missedName}! ${best.san} was winning.` };
    if (missedTactic && herCp > -50) return { kind: 'warn', icon: '💥', label: 'Missed tactic', text: `💥 You missed a tactic! ${best.san} wins material. Tip: check captures & checks first.` };
    if (missedTactic) return { kind: 'warn', icon: '💥', label: 'Missed tactic', text: `💥 Ouch — ${best.san} won material there. Look for captures & checks!` };
    const sug = useHumanHint ? (await humanSuggestion(beforeFen)) || best.san : best.san;
    if (loss <= 350) return { kind: 'warn', icon: '🤔', label: 'Inaccuracy', text: `🤔 A little loose — ${sug} keeps you better.` };
    return { kind: 'warn', icon: '⚠️', label: 'Mistake', text: `⚠️ Careful — that gives a lot away. Safer was ${sug}.` };
  }

  async function gradeMove(beforeFen, move) {
    const uci = move.from + move.to + (move.promotion || '');
    const afterFen = gameRef.current.fen();
    setCoachNote({ kind: 'pending', text: '🎓 Coach is looking…' });
    const v = await classifyMove(beforeFen, uci, afterFen, { movetime: 600, useHumanHint: true });
    setCoachNote(v ? { kind: v.kind, text: v.text } : null);
  }

  // Game Review: re-walk the game and classify each of HER moves, then summarize.
  async function reviewGame() {
    const verbose = gameRef.current.history({ verbose: true });
    const total = verbose.filter((m) => m.color === studentColor).length;
    if (!total) return;
    setReview({ running: true, done: 0, total, rows: [] });
    const g = newGame();
    const rows = [];
    for (const m of verbose) {
      const beforeFen = g.fen();
      g.move(m.san);
      if (m.color === studentColor) {
        const uci = m.from + m.to + (m.promotion || '');
        const v =
          (await classifyMove(beforeFen, uci, g.fen(), { movetime: 300, useHumanHint: false })) || {
            kind: 'good',
            icon: '·',
            label: 'Move',
            text: '',
          };
        rows.push({ num: Math.ceil(g.history().length / 2), san: m.san, v });
        setReview({ running: true, done: rows.length, total, rows: [...rows] });
      }
    }
    const summary = {};
    rows.forEach((r) => { summary[r.v.label] = (summary[r.v.label] || 0) + 1; });
    setReview({ running: false, total, rows, summary });
  }

  async function showHint() {
    const f = gameRef.current.fen();
    setCoachNote({ kind: 'pending', text: '🎓 Thinking of a hint…' });
    const sug = await humanSuggestion(f);
    setCoachNote(sug ? { kind: 'hint', text: `💡 A move like ${sug} looks good.` } : null);
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
      big={focusBoard}
    />
  );

  const opponentOptions = [
    { id: 'stockfish', label: 'StockBot', icon: <span className="text-base leading-none">🤖</span> },
    { id: 'maia', label: 'MaiaBot', icon: <span className="text-base leading-none">🙂</span> },
    { id: 'human2', label: '2 Players', icon: <span className="text-base leading-none">👥</span> },
  ];

  const logEmpty = 'Moves will appear here in notation…';

  const panel = (
    <>
      {/* Top region — setup, status, move list, feedback scroll here on desktop so
          the move-entry block stays pinned to the board's bottom edge. */}
      <div className="md:flex-1 md:min-h-0 md:overflow-y-auto md:-mr-1 md:pr-1">
      {/* Match setup — opponent, side, and difficulty grouped in one card */}
      <div className="cc-card p-3 mb-3 space-y-3">
        {seed && (
          <div className="text-sm font-bold text-grass">▶ Continuing from your opening — play it out!</div>
        )}
        <Segmented options={opponentOptions} value={opponentType} onChange={selectOpponent} size="sm" />

        {/* Play-as side (engine modes only; hidden in pass-and-play and when
            continuing a seeded opening, where her color is fixed) */}
        {!twoPlayer && !seed && (
          <Segmented
            options={[
              { id: 'w', label: '♔ White' },
              { id: 'b', label: '♚ Black' },
            ]}
            value={studentColor}
            onChange={(c) => { if (c !== studentColor) startNew(c); }}
            size="sm"
          />
        )}

        {opponentType === 'stockfish' ? (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-wide text-frost-dim font-bold">Level</span>
              <input type="range" min="1" max="20" value={level} onChange={(e) => setLevel(Number(e.target.value))} className="flex-1 accent-gold" />
              <div className="w-28 text-right whitespace-nowrap leading-tight">
                <div className="text-xs font-bold text-gold">{level} · {levelTier(level)}</div>
                <div className="text-[10px] text-frost-dim">{levelEloLabel(level)} Elo</div>
              </div>
            </div>
            <div className="mt-2 text-xs text-frost-dim">🤖 A chess computer — slide to set how strong it plays.</div>
          </div>
        ) : opponentType === 'maia' ? (
          <div>
            <div className="flex items-center gap-3">
              <span className="text-[11px] uppercase tracking-wide text-frost-dim font-bold">Rating</span>
              <input type="range" min="1100" max="1900" step="100" value={humanRating} onChange={(e) => setHumanRating(Number(e.target.value))} className="flex-1 accent-gold" />
              <span className="text-xs font-bold text-gold whitespace-nowrap w-16 text-right">{humanRating}</span>
            </div>
            <div className="mt-2 text-xs">
              {maia.status === 'ready' ? (
                <span className="text-grass font-bold">🙂 MaiaBot is ready — plays like a real {humanRating} player.</span>
              ) : maia.status === 'downloading' ? (
                <div>
                  <div className="text-frost-dim mb-1">Downloading MaiaBot… {maia.progress}%</div>
                  <div className="h-1.5 rounded-full bg-edge overflow-hidden">
                    <div className="h-full bg-gold transition-all" style={{ width: `${maia.progress}%` }} />
                  </div>
                </div>
              ) : maia.status === 'error' ? (
                <span className="text-coral">Couldn’t load MaiaBot — using StockBot instead.</span>
              ) : navigator.onLine ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={downloadMaia} className="cc-btn cc-btn-grass px-3 py-1.5 text-xs">⬇ Get MaiaBot (~44 MB)</button>
                  <span className="text-frost-dim">🙂 Plays like a human. StockBot fills in until ready.</span>
                </div>
              ) : (
                <span className="text-frost-dim">Connect to the internet once to download MaiaBot. Using StockBot for now.</span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-xs text-frost-dim leading-snug">
            <span className="font-bold text-gold">Pass-and-play</span> — two players share this device and take turns typing each move. No engine plays.{autoFlip ? ' The board flips to each player automatically.' : ''}
          </div>
        )}

        {/* Coach (Spar) — grade her moves + hints. Only vs an engine. */}
        {!twoPlayer && (
          <div className="flex items-center justify-between gap-2 pt-1">
            <span className="text-sm font-bold text-frost">
              🎓 Coach me <span className="font-normal text-frost-dim">— rate my moves &amp; give hints</span>
            </span>
            <button
              onClick={() => setCoach((c) => !c)}
              className={`cc-btn px-3 py-1 text-xs ${coach ? 'cc-btn-primary' : 'cc-btn-secondary'}`}
            >
              {coach ? 'ON' : 'OFF'}
            </button>
          </div>
        )}
      </div>

      {/* Status + controls */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="font-bold md:text-lg min-w-0 truncate">
          {over ? (
            <span className="text-gold animate-pop">{over.text}</span>
          ) : twoPlayer ? (
            <span className="text-grass">{toMove === 'w' ? '♔ White' : '♚ Black'} to move{inCheck ? ' — check!' : ''}</span>
          ) : myTurn ? (
            <span className="text-grass">Your move{inCheck ? ' — check!' : ''}</span>
          ) : (
            <span className="text-frost-dim">Opponent thinking…</span>
          )}
        </div>
        <div className="flex gap-1.5 shrink-0">
          <button onClick={takeback} className="cc-btn cc-btn-secondary px-2.5 py-1.5 text-xs" title="Take back">
            <IconUndo size={15} /> Undo
          </button>
          {twoPlayer ? (
            <button
              onClick={() => setAutoFlip((a) => !a)}
              className={`cc-btn px-2.5 py-1.5 text-xs ${autoFlip ? 'cc-btn-primary' : 'cc-btn-secondary'}`}
              title="Rotate the board to whoever is to move"
            >
              <IconFlip size={15} /> Auto-flip
            </button>
          ) : (
            <button
              onClick={flipView}
              className={`cc-btn px-2.5 py-1.5 text-xs ${flipped ? 'cc-btn-primary' : 'cc-btn-secondary'}`}
              title="Flip the board to see the opponent's view"
            >
              <IconFlip size={15} /> Flip
            </button>
          )}
          <button onClick={() => startNew(studentColor)} className="cc-btn cc-btn-secondary px-2.5 py-1.5 text-xs" title="New game">
            <IconRestart size={15} /> New
          </button>
        </div>
      </div>

      {/* Move log (inline) — hidden when it's showing in the sidebar column. */}
      <div className="cc-log-inline mb-3">
        <MoveLog pairs={rows} empty={logEmpty} variant="inline" />
      </div>

      {!twoPlayer && history.length >= 2 && (
        <button onClick={reviewGame} className="cc-btn cc-btn-secondary w-full py-2 text-sm mb-3">
          📋 Review game
        </button>
      )}

      {feedback && (
        <div
          className={`rounded-cc-lg px-3 py-2 mb-3 text-sm md:text-base font-bold animate-pop ${
            feedback.kind === 'good'
              ? 'bg-grass/20 text-grass ring-1 ring-grass/40'
              : 'bg-coral/15 text-coral ring-1 ring-coral/40'
          }`}
        >
          {feedback.text}
        </div>
      )}

      </div>

      {/* Move entry pinned to the bottom (aligns with the board's lower edge) */}
      <div className="md:shrink-0 md:pt-3">
      {!over && (
        <>
          {coachActive && (
            <div className="flex items-center gap-2 mb-2">
              {coachNote ? (
                <div
                  className={`flex-1 rounded-cc-lg px-3 py-2 text-sm md:text-base font-bold animate-pop ${
                    coachNote.kind === 'best' || coachNote.kind === 'good'
                      ? 'bg-grass/20 text-grass ring-1 ring-grass/40'
                      : coachNote.kind === 'warn'
                      ? 'bg-gold/15 text-gold ring-1 ring-gold/40'
                      : 'bg-surface text-frost-dim ring-1 ring-edge'
                  }`}
                >
                  {coachNote.text}
                </div>
              ) : (
                <div className="flex-1 text-xs md:text-sm text-frost-dim">🎓 Coach is on — play a move and I’ll rate it.</div>
              )}
              {myTurn && (
                <button onClick={showHint} className="cc-btn cc-btn-secondary px-3 py-2 text-xs shrink-0">
                  💡 Hint
                </button>
              )}
            </div>
          )}
          <div className="flex items-center gap-2 mb-2">
            <div className="text-xs md:text-sm text-frost-dim font-bold whitespace-nowrap">
              {activeColor === 'w' ? 'White' : 'Black'} types:
            </div>
            <div className="flex-1 bg-bg-2 rounded-cc-lg ring-1 ring-edge px-3 py-2 min-h-[44px] flex items-center text-xl md:text-2xl font-extrabold tracking-wider text-gold">
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
        <button onClick={() => startNew(studentColor)} className="cc-btn cc-btn-grass w-full py-3 text-lg">
          ↺ Play again
        </button>
      )}
      </div>
    </>
  );

  return (
    <>
      <PlayLayout board={board} panel={panel} history={<MoveLog pairs={rows} empty={logEmpty} variant="sidebar" />} focus={focusBoard} />

      {pendingPromotion && (
        <div
          className="cc-scrim items-center p-4"
          onClick={() => setPendingPromotion(null)}
        >
          <div className="cc-card p-4 m-auto animate-pop" onClick={(e) => e.stopPropagation()}>
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
                  className="w-16 h-16 rounded-cc bg-bg-2 ring-1 ring-edge hover:ring-gold active:translate-y-px flex items-center justify-center cc-reveal"
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

      {review && (
        <div className="cc-scrim items-end sm:items-center p-3" onClick={() => setReview(null)}>
          <div className="cc-sheet p-4 animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-extrabold text-gold flex items-center gap-2">📋 Game Review</h2>
              <button onClick={() => setReview(null)} className="cc-icon-btn" aria-label="Close">
                <IconClose size={20} />
              </button>
            </div>

            {review.running ? (
              <div>
                <div className="text-sm text-frost-dim mb-2">Reviewing your moves… {review.done}/{review.total}</div>
                <div className="h-1.5 rounded-full bg-edge overflow-hidden">
                  <div
                    className="h-full bg-gold transition-all"
                    style={{ width: `${Math.round((review.done / Math.max(1, review.total)) * 100)}%` }}
                  />
                </div>
              </div>
            ) : (
              <>
                {review.summary && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {Object.entries(review.summary).map(([k, n]) => (
                      <span key={k} className="cc-chip text-xs">
                        {k}: {n}
                      </span>
                    ))}
                  </div>
                )}
                <div className="space-y-1 max-h-[55vh] overflow-y-auto md:-mr-1 md:pr-1">
                  {review.rows.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 rounded-cc px-2.5 py-1.5 ${
                        r.v.kind === 'best' ? 'bg-grass/10' : r.v.kind === 'warn' ? 'bg-gold/10' : 'bg-surface'
                      }`}
                    >
                      <span className="text-base w-6 text-center">{r.v.icon}</span>
                      <span className="font-bold text-frost w-16 shrink-0">{r.num}. {r.san}</span>
                      <span
                        className={`text-sm ${
                          r.v.kind === 'best' ? 'text-grass' : r.v.kind === 'warn' ? 'text-gold' : 'text-frost-dim'
                        }`}
                      >
                        {r.v.label}
                      </span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
