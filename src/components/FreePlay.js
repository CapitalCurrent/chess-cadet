import React, { useEffect, useMemo, useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import NotationKeypad from './NotationKeypad';
import VoiceButton from './VoiceButton';
import PlayLayout from './PlayLayout';
import Segmented from './nav/Segmented';
import MoveLog from './MoveLog';
import Collapsible from './Collapsible';
import { IconUndo, IconFlip, IconRestart, IconClose } from './icons';
import { detectMotifs, motifsOfMove } from '../engine/tactics';
import { explainWarn, samePieceNudge, castleNudge } from '../engine/principles';
import { newGame, tryMove, notationGaps, notationHint } from '../engine/chessEngine';
import { topMoves, shallowMove, levelWeakening, pickWeakened, levelTier, levelEloLabel, levelElo, initEngine, analyze } from '../engine/stockfishEngine';
import { initMaia, ensureMaiaReady, maiaMove, maiaBestMove, onMaiaStatus, getMaiaStatus } from '../engine/maiaEngine';
import { addMistake } from '../state/notebook';
import { recordLessonEvent } from '../state/dailyLesson';
import { recordRatedGame } from '../state/rating';

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

// The in-progress Play game is persisted so leaving the Play tab and coming back
// doesn't wipe it. A `seed` (Continue-vs-Computer from a drilled opening) takes
// priority over the saved game on mount.
function loadSavedGame(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key));
    return data && Array.isArray(data.moves) && data.moves.length ? data : null;
  } catch {
    return null;
  }
}

export default function FreePlay({ pieceSet, boardTheme, moveStyle, focusBoard, seed, rewardMove, saveKey, profileId }) {
  const savedRef = useRef(seed ? null : loadSavedGame(saveKey));
  const gameRef = useRef();
  if (!gameRef.current) gameRef.current = seed ? seededGame(seed) : savedRef.current ? seededGame(savedRef.current) : newGame();
  const [fen, setFen] = useState(() => gameRef.current.fen());
  const [history, setHistory] = useState(() => gameRef.current.history()); // SAN strings
  const [tokens, setTokens] = useState([]);
  const [feedback, setFeedback] = useState(null);
  const [over, setOver] = useState(null); // { text }
  const [ratingResult, setRatingResult] = useState(null); // { rating, delta, suggestLevel?, suggestRating? } after a rated game
  const [lastMove, setLastMove] = useState(() => {
    const h = gameRef.current.history({ verbose: true });
    const last = h[h.length - 1];
    return last ? { from: last.from, to: last.to } : null;
  });
  const [studentColor, setStudentColor] = useState(
    () => (seed && seed.color) || (savedRef.current && savedRef.current.color) || 'w'
  );
  const [sidePref, setSidePref] = useState(() => {
    if (seed && seed.color) return seed.color;
    const v = localStorage.getItem('chess-cadet-sidepref');
    return v === 'b' || v === 'random' ? v : 'w';
  }); // 'w' | 'b' | 'random' — Random re-rolls the color on each new game
  const [flipped, setFlipped] = useState(false); // view-only board flip
  const [viewPly, setViewPly] = useState(null); // null = live; else # of half-moves to show (review/scrub)
  const [keypadOpen, setKeypadOpen] = useState(
    () => localStorage.getItem('chess-cadet-playkeypad') === 'open'
  ); // board-first: the typing keypad is minimized by default in Play
  const [setupOpen, setSetupOpen] = useState(false); // game-setup popover (opponent/side/level/coach)
  const [pendingPromotion, setPendingPromotion] = useState(null); // { from, to }
  const [level, setLevel] = useState(() => {
    const v = parseInt(localStorage.getItem('chess-cadet-level'), 10);
    return v >= 1 && v <= 20 ? v : 3;
  });
  const [opponentType, setOpponentType] = useState(() => {
    const v = localStorage.getItem('chess-cadet-opponent');
    if (v === 'human2') return 'human2'; // pass-and-play (two humans, one device)
    if (v === 'stockfish') return 'stockfish'; // respect an explicit practice-bot choice
    // Default (new players, or legacy 'human'/'maia') → MaiaBot, the human-like
    // opponent. Not downloaded yet? We auto-prompt below; StockBot fills in /
    // takes over if they decline or the download fails.
    return 'maia';
  });
  const [autoFlip, setAutoFlip] = useState(
    () => localStorage.getItem('chess-cadet-autoflip') !== 'off'
  ); // pass-and-play: rotate board to whoever is to move
  const [coach, setCoach] = useState(
    () => localStorage.getItem('chess-cadet-coach') === 'on'
  ); // Spar: grade her moves + offer hints when playing the engine
  const [coachNote, setCoachNote] = useState(null); // { kind, text }
  const [review, setReview] = useState(null); // null | { running, done, total, rows, summary }
  // Maia's conditioning range is 600–2600 (matches upstream MAIA_RATINGS;
  // verified empirically by scripts/maia-elo-probe.mjs). The 600 floor matters
  // most here — it plays like the kids she'd actually face at a club.
  const [humanRating, setHumanRating] = useState(() => {
    const v = parseInt(localStorage.getItem('chess-cadet-humanrating'), 10);
    return v >= 600 && v <= 2600 ? v : 1100;
  });
  const [maia, setMaia] = useState(getMaiaStatus); // { status, progress }
  const [maiaPrompt, setMaiaPrompt] = useState(false); // first-run "download MaiaBot?" offer

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
    localStorage.setItem('chess-cadet-playkeypad', keypadOpen ? 'open' : 'closed');
  }, [keypadOpen]);
  useEffect(() => {
    localStorage.setItem('chess-cadet-sidepref', sidePref);
  }, [sidePref]);
  // Persist the in-progress game so leaving/returning to the Play tab keeps it.
  useEffect(() => {
    try {
      localStorage.setItem(saveKey, JSON.stringify({ moves: gameRef.current.history(), color: studentColor }));
    } catch {
      /* ignore */
    }
  }, [fen, studentColor, saveKey]);
  // If a restored game was already finished, show the end banner on mount
  // (live=false: don't credit yesterday's game to today's lesson).
  useEffect(() => { checkEnd(false); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    initEngine(); // warm up the Stockfish worker
  }, []);
  useEffect(() => onMaiaStatus((status, progress) => setMaia({ status, progress })), []);
  useEffect(() => {
    if (opponentType === 'maia') initMaia(); // warm up (loads from cache if present)
  }, [opponentType]);
  // MaiaBot is the default opponent. If its model isn't cached yet (and we're
  // online), offer the one-time download up front instead of making them hunt
  // for the button. StockBot fills in for play while they decide / download.
  useEffect(() => {
    if (opponentType === 'maia' && maia.status === 'no-cache' && navigator.onLine) {
      setMaiaPrompt(true);
    } else {
      setMaiaPrompt(false);
    }
  }, [opponentType, maia.status]);
  // If the download fails, fall back to StockBot for real (not just for play) so
  // we don't keep retrying a broken fetch — they can re-pick Maia in Setup later.
  useEffect(() => {
    if (opponentType === 'maia' && maia.status === 'error') {
      setOpponentType('stockfish');
      setFeedback({ kind: 'voice', text: '🤖 Couldn’t load MaiaBot — playing the practice bot instead.' });
    }
  }, [opponentType, maia.status]);

  const acceptMaiaDownload = () => {
    setMaiaPrompt(false);
    ensureMaiaReady({ allowDownload: true }); // StockBot covers play until it’s ready
  };
  const declineMaiaDownload = () => {
    setMaiaPrompt(false);
    setOpponentType('stockfish'); // persisted → defaults to StockBot from now on
  };

  const input = tokens.join('');
  const game = gameRef.current;
  const twoPlayer = opponentType === 'human2'; // pass-and-play: both sides human, no engine
  const toMove = game.turn();
  const activeColor = twoPlayer ? toMove : studentColor; // whose move it is right now
  const myTurn = !over && (twoPlayer || toMove === studentColor);
  const inCheck = !over && game.inCheck();

  function checkEnd(live = true) {
    const g = gameRef.current;
    let result = null;
    if (g.isCheckmate()) {
      const winner = g.turn() === 'w' ? 'Black' : 'White';
      result = { text: `Checkmate — ${winner} wins! 🏆`, winner };
    } else if (g.isStalemate()) {
      result = { text: 'Stalemate — it’s a draw. 🤝' };
    } else if (g.isInsufficientMaterial() || g.isThreefoldRepetition() || g.isDraw()) {
      result = { text: 'Draw. 🤝' };
    }
    if (!result) return;
    setOver(result);
    // A real engine game finishing counts toward Today's Lesson + Chess Power —
    // not the mount-time re-check of an already-finished saved game, not
    // pass-and-play, not a 2-move accident.
    if (live && !twoPlayer && profileId && g.history().length >= 6) {
      recordLessonEvent(profileId, 'game');
      updateRating(result.winner);
    }
  }

  // Opponent's effective Elo for the rating math (StockBot level midpoint, or
  // MaiaBot's set rating).
  function opponentElo() {
    if (opponentType === 'maia') return humanRating;
    const [lo, hi] = levelElo(level);
    return Math.round((lo + hi) / 2);
  }
  // The StockBot level whose Elo midpoint best matches a target rating — used to
  // suggest a "better match" so games stay ~even (she wins ~half).
  function bestLevelFor(rating) {
    let best = 1;
    let bestDiff = Infinity;
    for (let lvl = 1; lvl <= 20; lvl++) {
      const [lo, hi] = levelElo(lvl);
      const diff = Math.abs((lo + hi) / 2 - rating);
      if (diff < bestDiff) {
        bestDiff = diff;
        best = lvl;
      }
    }
    return best;
  }

  // Apply the Elo update and decide whether to suggest an easier/harder match.
  function updateRating(winner) {
    const myResult = winner ? (winner === (studentColor === 'w' ? 'White' : 'Black') ? 1 : 0) : 0.5;
    const oppElo = opponentElo();
    const { rating, delta } = recordRatedGame(profileId, oppElo, myResult);
    const res = { rating, delta };
    // Suggest a better match when she's clearly outgrown / overmatched by this
    // opponent (≈150 Elo gap). StockBot retunes by level; MaiaBot by rating.
    const gap = Math.abs(rating - oppElo);
    if (opponentType === 'stockfish') {
      const target = bestLevelFor(rating);
      if (gap >= 150 && target !== level) res.suggestLevel = target;
    } else if (opponentType === 'maia') {
      const rounded = Math.max(600, Math.min(2600, Math.round(rating / 100) * 100));
      if (gap >= 150 && rounded !== humanRating) res.suggestRating = rounded;
    }
    setRatingResult(res);
  }

  function applyMatchSuggestion() {
    if (!ratingResult) return;
    if (ratingResult.suggestLevel != null) setLevel(ratingResult.suggestLevel);
    if (ratingResult.suggestRating != null) setHumanRating(ratingResult.suggestRating);
    setRatingResult((r) => (r ? { ...r, suggestLevel: undefined, suggestRating: undefined, applied: true } : r));
  }

  function pushMove(move) {
    setViewPly(null); // any new move snaps the board back to the live position
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
    // Preview without mutating, so we can teach notation before committing.
    const preview = tryMove(beforeFen, input);
    if (!preview) {
      setFeedback({ kind: 'bad', text: "That isn't a legal move here — check your notation!" });
      setTokens([]);
      return;
    }
    const gaps = notationGaps(preview, input);
    if (gaps.length) {
      setFeedback({ kind: 'bad', text: `So close — ${notationHint(gaps)}. Try again.` });
      setTokens([]);
      return;
    }
    const move = gameRef.current.move(input);
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
    // "New" / "Play again" is always a fresh standard game. The seed is a
    // one-time handoff from a drilled opening (Continue vs Computer) and only
    // applies on the initial mount — pressing New here should NOT replay it.
    gameRef.current = newGame();
    setStudentColor(color);
    setFlipped(false);
    setViewPly(null);
    setFen(gameRef.current.fen());
    setHistory(gameRef.current.history());
    setTokens([]);
    setFeedback(null);
    setCoachNote(null);
    setReview(null);
    setOver(null);
    setRatingResult(null);
    castleNudgedRef.current = false;
    samePieceNudgesRef.current = 0;
    const h = gameRef.current.history({ verbose: true });
    const last = h[h.length - 1];
    setLastMove(last ? { from: last.from, to: last.to } : null);
  }

  // Resolve a side preference to an actual color ('random' = coin flip).
  function resolveSide(pref) {
    return pref === 'random' ? (Math.random() < 0.5 ? 'w' : 'b') : pref;
  }
  // Start a fresh game honoring the side preference. Random re-rolls each time,
  // so New / Play again act as the trigger that spins the randomizer.
  function startNewWithPref(pref) {
    const color = resolveSide(pref);
    startNew(color);
    if (pref === 'random') {
      setFeedback({ kind: 'good', text: `You’re playing ${color === 'w' ? 'White' : 'Black'}!` });
    }
  }
  // Side picker: White / Black / Random. Picking starts a fresh game (Random rolls).
  function pickSide(pref) {
    if (pref === sidePref && pref !== 'random') return; // tapping the current fixed side = no-op
    setSidePref(pref);
    startNewWithPref(pref);
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
    // Carried on warn verdicts so the Coach's Notebook can save the position.
    const bestRef = { san: best.san, uci: cands[0].move };
    if (missedTactic && missedName) return { kind: 'warn', icon: '💥', label: `Missed ${missedName}`, text: `💥 You missed a ${missedName}! ${best.san} was winning.`, best: bestRef, motif: missedName, loss };
    if (missedTactic && herCp > -50) return { kind: 'warn', icon: '💥', label: 'Missed tactic', text: `💥 You missed a tactic! ${best.san} wins material. Tip: check captures & checks first.`, best: bestRef, motif: null, loss };
    if (missedTactic) return { kind: 'warn', icon: '💥', label: 'Missed tactic', text: `💥 Ouch — ${best.san} won material there. Look for captures & checks!`, best: bestRef, motif: null, loss };
    const sug = useHumanHint ? (await humanSuggestion(beforeFen)) || best.san : best.san;
    if (loss <= 350) return { kind: 'warn', icon: '🤔', label: 'Inaccuracy', text: `🤔 A little loose — ${sug} keeps you better.`, best: bestRef, motif: null, loss };
    return { kind: 'warn', icon: '⚠️', label: 'Mistake', text: `⚠️ Careful — that gives a lot away. Safer was ${sug}.`, best: bestRef, motif: null, loss };
  }

  // "Mind the reply": after her move, peek at the opponent's BEST reply (engine's
  // #1 only — keeps it reliable) and, if it's a named tactic, flag it so she
  // learns to anticipate it. We only name fork/pin/discovered (geometric, on the
  // engine's chosen move), never guess.
  // Also returns the reply uci itself — used to CONFIRM hanging-piece
  // explanations before the principles coach says them out loud.
  async function opponentReply(afterFen) {
    try {
      const cands = (await analyze(afterFen, { multipv: 1, movetime: 700 })) || [];
      if (!cands.length) return { replyUci: null, threat: null };
      const replyUci = cands[0].move;
      const motifs = motifsOfMove(afterFen, replyUci);
      const name = motifs.includes('fork')
        ? 'a fork'
        : motifs.includes('discovered')
        ? 'a discovered attack'
        : motifs.includes('pin')
        ? 'a pin'
        : null;
      return { replyUci, threat: name ? { san: uciToSan(afterFen, replyUci), name } : null };
    } catch {
      return { replyUci: null, threat: null };
    }
  }

  // Habit-nudge rate limits (reset each new game): the principles coach may
  // mention castling once and piece-wandering twice per game, max.
  const castleNudgedRef = useRef(false);
  const samePieceNudgesRef = useRef(0);

  // Deposit a coach-flagged blunder/missed tactic into the Coach's Notebook so
  // Fix Mistakes can replay it later. Inaccuracies are skipped (too noisy to
  // drill); dedup inside addMistake keeps coach + review from double-saving.
  function captureMistake(beforeFen, move, v, source) {
    if (!profileId || !v || v.kind !== 'warn' || !v.best) return;
    if (!/^Missed/.test(v.label) && v.label !== 'Mistake') return;
    addMistake(profileId, {
      fen: beforeFen,
      played: { san: move.san, uci: move.from + move.to + (move.promotion || '') },
      best: v.best,
      label: v.label,
      motif: v.motif || null,
      lossCp: v.loss,
      text: v.text,
      source,
    });
  }

  async function gradeMove(beforeFen, move) {
    const uci = move.from + move.to + (move.promotion || '');
    const afterFen = gameRef.current.fen();
    setCoachNote({ kind: 'pending', text: '🎓 Coach is looking…' });
    const v = await classifyMove(beforeFen, uci, afterFen, { movetime: 1200, useHumanHint: true });
    captureMistake(beforeFen, move, v, 'coach');
    const reply = await opponentReply(afterFen);

    // Tier A — attach the broader-concept WHY to engine-flagged generic warns.
    // (Named tactic messages — missed fork etc. — already explain themselves.)
    let note = v;
    if (v && v.kind === 'warn' && (v.label === 'Inaccuracy' || v.label === 'Mistake')) {
      const why = explainWarn({ afterFen, move, herColor: studentColor, replyUci: reply.replyUci });
      if (why) note = { ...v, text: `${v.text} ${why}` };
    }

    // Tier B — gentle habit nudges, only when the move itself wasn't flagged
    // (no mixed messages) and never on an engine-best move.
    let habit = null;
    if (v && v.kind !== 'warn') {
      if (v.kind !== 'best' && samePieceNudgesRef.current < 2) {
        habit = samePieceNudge({
          history: gameRef.current.history({ verbose: true }),
          beforeFen,
          herColor: studentColor,
        });
        if (habit) samePieceNudgesRef.current += 1;
      }
      if (!habit && !castleNudgedRef.current) {
        habit = castleNudge({ fen: afterFen, herColor: studentColor });
        if (habit) castleNudgedRef.current = true;
      }
    }

    if (!note && !reply.threat && !habit) return setCoachNote(null);
    setCoachNote({ kind: note ? note.kind : 'warn', text: note ? note.text : '', threat: reply.threat, habit });
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
        const raw = await classifyMove(beforeFen, uci, g.fen(), { movetime: 600, useHumanHint: false });
        if (raw) captureMistake(beforeFen, m, raw, 'review');
        const v = raw || { kind: 'good', icon: '·', label: 'Move', text: '' };
        // ply = half-moves played up to and including this move → scrub target.
        rows.push({ num: Math.ceil(g.history().length / 2), san: m.san, v, ply: g.history().length });
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
    setViewPly(null);
    setOver(null);
    setFeedback(null);
    setReview(null);
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

  // ── Move-history review (scrub) ──────────────────────────────────────────
  // The position after each half-move, derived (never mutates the live game).
  // positions[k] = the board after k plies (positions[0] = start).
  const positions = useMemo(() => {
    const g = newGame();
    const out = [{ fen: g.fen(), from: null, to: null }];
    for (const san of history) {
      let m = null;
      try { m = g.move(san); } catch { m = null; }
      out.push({ fen: g.fen(), from: m ? m.from : null, to: m ? m.to : null });
    }
    return out;
  }, [history]);

  const viewing = viewPly != null && viewPly < history.length; // showing a past position
  const atLive = !viewing; // viewPly null OR pointing at the final ply
  const selectedPly = viewPly == null ? history.length : viewPly; // highlight in the log
  const viewPos = viewing ? positions[viewPly] : null;
  const displayFen = viewing ? viewPos.fen : fen;
  const displayLastMove = viewing ? { from: viewPos.from, to: viewPos.to } : lastMove;
  const viewSan = viewPly > 0 ? history[viewPly - 1] : null;

  function goLive() { setViewPly(null); }
  function stepBack() { setViewPly((v) => Math.max(0, (v == null ? history.length : v) - 1)); }
  function stepFwd() {
    setViewPly((v) => {
      const nv = (v == null ? history.length : v) + 1;
      return nv >= history.length ? null : nv; // reaching the end returns to live
    });
  }

  // Arrow keys scrub the history (no text inputs on this screen to conflict with).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') { e.preventDefault(); stepBack(); }
      else if (e.key === 'ArrowRight') { e.preventDefault(); stepFwd(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [history.length]); // eslint-disable-line react-hooks/exhaustive-deps

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
      fen={displayFen}
      orientation={viewOrientation}
      lastMove={displayLastMove}
      movableColor={viewing ? null : myTurn ? activeColor : null}
      moveStyle={moveStyle}
      onMove={handleBoardMove}
      pieceSet={pieceSet}
      boardTheme={boardTheme}
      big={focusBoard}
      silent={viewing}
    />
  );

  // History scrubber — sits directly under the board (a fixed, predictable spot;
  // the move log itself moves between the panel and the sidebar by screen width).
  const scrubber = history.length > 0 && (
    <div className="flex items-center justify-center gap-2">
      <button
        onClick={stepBack}
        disabled={selectedPly <= 0}
        className="cc-btn cc-btn-secondary px-4 py-1.5 text-sm disabled:opacity-40"
        title="Previous move (←)"
      >
        ◀
      </button>
      <button
        onClick={goLive}
        disabled={atLive}
        className={`cc-btn px-4 py-1.5 text-sm ${atLive ? 'cc-btn-secondary opacity-50' : 'cc-btn-primary'}`}
        title="Jump to the current position"
      >
        ● Live
      </button>
      <button
        onClick={stepFwd}
        disabled={atLive}
        className="cc-btn cc-btn-secondary px-4 py-1.5 text-sm disabled:opacity-40"
        title="Next move (→)"
      >
        ▶
      </button>
    </div>
  );

  const opponentOptions = [
    { id: 'stockfish', label: 'StockBot', icon: <span className="text-base leading-none">🤖</span> },
    { id: 'maia', label: 'MaiaBot', icon: <span className="text-base leading-none">🙂</span> },
    { id: 'human2', label: '2 Players', icon: <span className="text-base leading-none">👥</span> },
  ];

  const logEmpty = 'Moves will appear here in notation…';

  // Match setup — opponent, side, difficulty, coach. Lives inside the setup
  // popover (opened from the summary chip) so it's minimized by default.
  const matchSetup = (
    <div className="space-y-3">
      {seed && (
        <div className="text-sm font-bold text-grass">▶ Continuing from your opening — play it out!</div>
      )}
      <div className="space-y-1">
        <div className="text-[10px] uppercase tracking-wide text-frost-dim font-bold px-0.5">Opponent</div>
        <Segmented options={opponentOptions} value={opponentType} onChange={selectOpponent} size="sm" />
      </div>

      {/* Play-as side (engine modes only; hidden in pass-and-play and when
          continuing a seeded opening, where her color is fixed) */}
      {!twoPlayer && !seed && (
        <div className="space-y-1">
          <div className="text-[10px] uppercase tracking-wide text-frost-dim font-bold px-0.5">Play as</div>
          <Segmented
            options={[
              { id: 'w', label: '♔ White' },
              { id: 'b', label: '♚ Black' },
              { id: 'random', label: 'Random' },
            ]}
            value={sidePref}
            onChange={pickSide}
            size="sm"
          />
        </div>
      )}

      {opponentType === 'stockfish' ? (
        <div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] uppercase tracking-wide text-frost-dim font-bold">Level</span>
            <input type="range" min="1" max="20" value={level} onChange={(e) => setLevel(Number(e.target.value))} className="flex-1 accent-gold" />
            <div className="w-24 text-right whitespace-nowrap leading-tight">
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
            <input type="range" min="600" max="2600" step="100" value={humanRating} onChange={(e) => setHumanRating(Number(e.target.value))} className="flex-1 accent-gold" />
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
  );

  const movesLog = (
    <MoveLog pairs={rows} empty={logEmpty} variant="sidebar" onSelect={setViewPly} selectedPly={selectedPly} />
  );

  // Left rail (desktop) / inline (phone): just the move log now.
  const rail = <div className="max-h-[60vh] overflow-y-auto">{movesLog}</div>;

  // Game setup is minimized behind a summary chip → popover.
  const setupSummary = twoPlayer
    ? '👥 2 Players'
    : `${opponentType === 'maia' ? `🙂 MaiaBot ${humanRating}` : `🤖 StockBot · L${level}`} · ${
        studentColor === 'w' ? '♔ White' : '♚ Black'
      }${coach ? ' · 🎓 Coach' : ''}`;
  const setupBar = (
    <div className="relative">
      <button
        onClick={() => setSetupOpen((o) => !o)}
        className="w-full rounded-cc-lg bg-white/[0.04] border border-[var(--edge-soft)] cc-reveal px-3 py-2.5 flex items-center justify-between gap-2 text-sm"
      >
        <span className="font-bold text-frost truncate">{seed ? '▶ Continuing your opening' : setupSummary}</span>
        <span className="text-frost-dim shrink-0 flex items-center gap-1 text-xs font-bold">
          {setupOpen ? 'Close' : 'Setup'} <span className="text-[10px]">{setupOpen ? '▴' : '▾'}</span>
        </span>
      </button>
      {setupOpen && (
        <>
          <div className="fixed inset-0 z-30 bg-black/40" onClick={() => setSetupOpen(false)} />
          <div className="absolute z-40 left-0 right-0 mt-2 cc-menu p-3 origin-top animate-pop">
            <div className="flex items-center justify-between mb-2.5 px-0.5">
              <span className="text-[11px] uppercase tracking-wide text-gold/70 font-bold">Game setup</span>
              <button onClick={() => setSetupOpen(false)} className="text-frost-dim hover:text-frost text-base leading-none px-1" aria-label="Close">✕</button>
            </div>
            {matchSetup}
          </div>
        </>
      )}
    </div>
  );

  // Inline Game Review (replaces the old overlay) — tap a row to scrub the board.
  const reviewPanel = review && (
    <div className="rounded-cc-lg bg-white/[0.04] border border-[var(--edge-soft)] p-3">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-extrabold text-gold">📋 Game Review</h2>
        <button onClick={() => { setReview(null); goLive(); }} className="cc-icon-btn" aria-label="Close review">
          <IconClose size={18} />
        </button>
      </div>
      {review.running ? (
        <div>
          <div className="text-sm text-frost-dim mb-2">Reviewing… {review.done}/{review.total}</div>
          <div className="h-1.5 rounded-full bg-edge overflow-hidden">
            <div className="h-full bg-gold transition-all" style={{ width: `${Math.round((review.done / Math.max(1, review.total)) * 100)}%` }} />
          </div>
        </div>
      ) : (
        <>
          {review.summary && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(review.summary).map(([k, n]) => (
                <span key={k} className="cc-chip text-xs">{k}: {n}</span>
              ))}
            </div>
          )}
          <div className="text-[11px] text-frost-dim mb-1.5">Tap a move to see it on the board.</div>
          <div className="space-y-1 max-h-[46vh] overflow-y-auto md:-mr-1 md:pr-1">
            {review.rows.map((r, i) => (
              <button
                key={i}
                onClick={() => setViewPly(r.ply)}
                className={`w-full flex items-center gap-2 rounded-cc px-2.5 py-1.5 text-left ${selectedPly === r.ply ? 'ring-1 ring-gold/60 ' : ''}${r.v.kind === 'best' ? 'bg-grass/10' : r.v.kind === 'warn' ? 'bg-gold/10' : 'bg-surface'}`}
              >
                <span className="text-base w-6 text-center">{r.v.icon}</span>
                <span className="font-bold text-frost w-16 shrink-0">{r.num}. {r.san}</span>
                <span className={`text-sm ${r.v.kind === 'best' ? 'text-grass' : r.v.kind === 'warn' ? 'text-gold' : 'text-frost-dim'}`}>{r.v.label}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );

  const panel = (
    <div className="cc-glass p-3 md:p-4 space-y-3">
      {setupBar}

      {/* Status + controls */}
      <div className="flex items-center justify-between gap-2">
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
          {/* Hands-free mic lives HERE (not the move-entry row) so it stays
              mounted through game-over and review — "new game" works right
              after checkmate. Moves are gated to her live turn. */}
          {/* Tap-to-talk (one move per tap) — reliable on every platform. True
              hands-free fights the Web Speech API on Android (unsuppressable
              system earcon on each restart + poor continuous support → dropped
              commands); it returns properly in the native app via offline ASR.
              listenContinuous is kept in speech.js earmarked for that. */}
          <VoiceButton
            fen={fen}
            small
            canMove={myTurn && !viewing && !review}
            onMove={(from, to, promotion) => applyBoardMove(from, to, promotion)}
            onCommand={(cmd) => {
              if (cmd === 'undo') takeback();
              else if (cmd === 'hint' && !twoPlayer) showHint();
              else if (cmd === 'new') startNewWithPref(sidePref);
            }}
            onFeedback={setFeedback}
          />
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
          <button onClick={() => startNewWithPref(sidePref)} className="cc-btn cc-btn-secondary px-2.5 py-1.5 text-xs" title="New game">
            <IconRestart size={15} /> New
          </button>
        </div>
      </div>

      {!twoPlayer && history.length >= 2 && !review && (
        <button onClick={reviewGame} className="cc-btn cc-btn-secondary w-full py-2 text-sm">
          📋 Review game
        </button>
      )}

      {feedback && !review && (
        <div
          className={`rounded-cc-lg px-3 py-2 text-sm md:text-base font-bold animate-pop ${
            feedback.kind === 'good'
              ? 'bg-grass/20 text-grass ring-1 ring-grass/40'
              : feedback.kind === 'voice' || feedback.kind === 'voice-miss'
              ? 'bg-gold/15 text-gold ring-1 ring-gold/40'
              : 'bg-coral/15 text-coral ring-1 ring-coral/40'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Review (inline) replaces the move entry while active. */}
      {review ? (
        reviewPanel
      ) : viewing ? (
        <div className="flex items-center gap-2 rounded-cc-lg px-3 py-3 bg-gold/15 text-gold ring-1 ring-gold/40 animate-pop">
          <span className="text-sm md:text-base font-bold flex-1">
            👀 Reviewing {viewSan ? `move ${Math.ceil(viewPly / 2)}${viewPly % 2 ? '.' : '…'} ${viewSan}` : 'the start position'} — keypad paused.
          </span>
          <button onClick={goLive} className="cc-btn cc-btn-primary px-3 py-1.5 text-xs shrink-0">
            ⏭ Back to live
          </button>
        </div>
      ) : !over ? (
        <>
          {coachActive && (
            <div className="flex items-start gap-2">
              {coachNote ? (
                <div className="flex-1 space-y-1">
                  {coachNote.text && (
                    <div
                      className={`rounded-cc-lg px-3 py-2 text-sm md:text-base font-bold animate-pop ${
                        coachNote.kind === 'best' || coachNote.kind === 'good'
                          ? 'bg-grass/20 text-grass ring-1 ring-grass/40'
                          : coachNote.kind === 'warn'
                          ? 'bg-gold/15 text-gold ring-1 ring-gold/40'
                          : 'bg-surface text-frost-dim ring-1 ring-edge'
                      }`}
                    >
                      {coachNote.text}
                    </div>
                  )}
                  {coachNote.threat && (
                    <div className="rounded-cc-lg px-3 py-2 text-sm font-bold bg-gold/15 text-gold ring-1 ring-gold/40 animate-pop">
                      👀 Watch out — {studentColor === 'w' ? 'Black' : 'White'} can play {coachNote.threat.san} ({coachNote.threat.name}). Have an answer ready!
                    </div>
                  )}
                  {coachNote.habit && (
                    <div className="rounded-cc-lg px-3 py-2 text-sm font-bold bg-surface text-frost ring-1 ring-edge animate-pop">
                      🧭 {coachNote.habit}
                    </div>
                  )}
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

          {/* Move-entry row: tap the board (primary), 🎤 to say it, or ⌨ to type. */}
          <div className="flex items-center gap-2">
            <div className="text-xs text-frost-dim font-bold whitespace-nowrap">
              {activeColor === 'w' ? 'White' : 'Black'}:
            </div>
            <div className="flex-1 bg-bg-2 rounded-cc-lg ring-1 ring-edge px-3 py-2 min-h-[40px] flex items-center text-lg md:text-xl font-extrabold tracking-wider text-gold">
              {input || (
                <span className="text-gold/30 text-sm font-bold">
                  {myTurn ? (keypadOpen ? 'type your move…' : 'tap the board, or ⌨ to type') : 'waiting…'}
                </span>
              )}
            </div>
            <button
              onClick={() => setKeypadOpen((o) => !o)}
              className={`cc-btn px-3 py-2 text-sm shrink-0 ${keypadOpen ? 'cc-btn-primary' : 'cc-btn-secondary'}`}
              title={keypadOpen ? 'Hide the typing keypad' : 'Type the move instead'}
            >
              ⌨
            </button>
          </div>

          {keypadOpen && (
            <NotationKeypad
              onKey={(tok) => { setTokens((t) => [...t, tok]); setFeedback(null); }}
              onBackspace={() => setTokens((t) => t.slice(0, -1))}
              onClear={() => setTokens([])}
              onSubmit={submit}
              disabled={!myTurn}
              canSubmit={!!input && myTurn}
            />
          )}
        </>
      ) : (
        <>
          {ratingResult && (
            <div className="cc-card p-3 text-center animate-pop">
              <div className="text-[11px] uppercase tracking-wide text-gold/60 font-bold">Chess Power</div>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className="text-2xl font-extrabold text-gold">{ratingResult.rating}</span>
                <span
                  className={`text-sm font-bold ${
                    ratingResult.delta > 0 ? 'text-grass' : ratingResult.delta < 0 ? 'text-coral' : 'text-frost-dim'
                  }`}
                >
                  {ratingResult.delta > 0 ? `▲ +${ratingResult.delta}` : ratingResult.delta < 0 ? `▼ ${ratingResult.delta}` : '—'}
                </span>
              </div>
              {(ratingResult.suggestLevel != null || ratingResult.suggestRating != null) && (
                <button onClick={applyMatchSuggestion} className="cc-btn cc-btn-secondary w-full py-2 mt-2.5 text-sm">
                  🎯 {(ratingResult.suggestLevel != null ? ratingResult.suggestLevel > level : ratingResult.suggestRating > humanRating)
                    ? 'Try a tougher match'
                    : 'Try an easier match'}
                </button>
              )}
              {ratingResult.applied && (
                <div className="text-xs text-grass font-bold mt-2">✓ Opponent set to match your level!</div>
              )}
            </div>
          )}
          <button onClick={() => startNewWithPref(sidePref)} className="cc-btn cc-btn-grass w-full py-3 text-lg">
            ↺ Play again
          </button>
        </>
      )}

      {/* Move log below the fold on phone, collapsible (xl shows it in the rail). */}
      {history.length > 0 && (
        <div className="xl:hidden pt-1">
          <Collapsible title="Moves">{rail}</Collapsible>
        </div>
      )}
    </div>
  );

  return (
    <>
      <PlayLayout rail={rail} board={board} panel={panel} boardFooter={scrubber} focus={focusBoard} />

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

      {maiaPrompt && (
        <div className="cc-scrim items-center p-3" onClick={declineMaiaDownload}>
          <div className="cc-sheet p-5 text-center animate-pop" onClick={(e) => e.stopPropagation()}>
            <div className="text-4xl">🙂</div>
            <div className="text-xl md:text-2xl font-extrabold text-gold mt-2">Meet MaiaBot!</div>
            <p className="text-sm md:text-base text-frost-dim mt-2 leading-snug">
              MaiaBot plays like a <b className="text-frost">real person</b>, not a computer — way more fun and
              natural to play against. It’s a <b className="text-frost">one-time</b> download (~44&nbsp;MB), then it
              works even offline.
            </p>
            <button onClick={acceptMaiaDownload} className="cc-btn cc-btn-grass w-full py-3 mt-4 text-base">
              ⬇ Get MaiaBot (~44&nbsp;MB)
            </button>
            <button onClick={declineMaiaDownload} className="cc-btn cc-btn-secondary w-full py-2.5 mt-2 text-sm">
              Maybe later — use the practice bot
            </button>
            <div className="text-[11px] text-frost/40 mt-3">You can switch anytime in Setup.</div>
          </div>
        </div>
      )}

    </>
  );
}
