import React, { useEffect, useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import PlayLayout from './PlayLayout';
import { newGame } from '../engine/chessEngine';
import { bestMove, initEngine } from '../engine/stockfishEngine';
import { MATE_PACKS, ENDGAME_STAGES, getPack, getEndgame } from '../data/checkmates';
import { getCheckmateProgress, recordMateSolve, recordEndgameRun } from '../state/checkmateProgress';
import { IconTrophy, IconStar } from './icons';

// ♛ Checkmate School — a kid's REAL first chess lessons: finishing the game.
//  - Mate-in-1 packs: find the mate (any mating move counts; the board's own
//    checkmate fanfare is the reward).
//  - Endgame drills: K+Q and K+R vs the engine's lone king, played to mate.
//    Stalemate is caught and TAUGHT, not just announced — it's the single
//    most common kid heartbreak in won endgames.

function findMate(fen) {
  const g = newGame(fen);
  for (const m of g.moves({ verbose: true })) {
    g.move(m.san);
    const mate = g.isCheckmate();
    g.undo();
    if (mate) return m;
  }
  return null;
}

export default function CheckmateSchool({ profileId, pieceSet, boardTheme, moveStyle, focusBoard, rewardMove, onBack }) {
  const [view, setView] = useState({ kind: 'menu' }); // {kind:'menu'} | {kind:'pack', id} | {kind:'endgame', id}
  const [, setTick] = useState(0); // re-read progress after records
  const bump = () => setTick((t) => t + 1);
  const progress = getCheckmateProgress(profileId);

  useEffect(() => {
    initEngine(); // warm up for the endgame drills
  }, []);

  // ── Menu ──────────────────────────────────────────────────────────────────
  if (view.kind === 'menu') {
    return (
      <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-2xl md:text-3xl font-extrabold text-frost font-round flex items-center justify-center gap-2">
            <IconTrophy size={28} className="text-gold" /> Checkmate School
          </div>
          <div className="text-sm md:text-base text-frost-dim mt-1.5">
            Win the game! Learn to FINISH — the most important skill in chess.
          </div>
        </div>

        <div className="space-y-3">
          {MATE_PACKS.map((pack) => {
            const solved = pack.positions.filter((p) => progress.solved.includes(p.id)).length;
            const done = solved === pack.positions.length;
            return (
              <button
                key={pack.id}
                onClick={() => setView({ kind: 'pack', id: pack.id })}
                className="cc-glass cc-reveal w-full p-4 flex items-center gap-3 text-left"
              >
                <span className="text-2xl shrink-0">{pack.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-frost text-lg">
                    {pack.name} {done && <span className="text-gold">★</span>}
                  </span>
                  <span className="block text-sm text-frost-dim">{pack.blurb}</span>
                </span>
                <span className={`text-xs font-bold shrink-0 ${done ? 'text-gold' : 'text-frost-dim'}`}>
                  {solved}/{pack.positions.length}
                </span>
              </button>
            );
          })}

          {ENDGAME_STAGES.map((st) => {
            const e = progress.endgames[st.id] || { mates: 0 };
            return (
              <button
                key={st.id}
                onClick={() => setView({ kind: 'endgame', id: st.id })}
                className="cc-glass cc-reveal w-full p-4 flex items-center gap-3 text-left"
              >
                <span className="text-2xl shrink-0">{st.icon}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-extrabold text-frost text-lg">
                    {st.name} {e.mates > 0 && <span className="text-gold">★</span>}
                  </span>
                  <span className="block text-sm text-frost-dim">{st.blurb}</span>
                </span>
                <span className={`text-xs font-bold shrink-0 ${e.mates > 0 ? 'text-gold' : 'text-frost-dim'}`}>
                  {e.mates > 0 ? `Mated ×${e.mates}` : 'vs 🤖'}
                </span>
              </button>
            );
          })}
        </div>

        {onBack && (
          <button onClick={onBack} className="cc-btn cc-btn-secondary w-full py-2.5 mt-5 text-sm">
            ← Back to Learn
          </button>
        )}
      </div>
    );
  }

  const backToMenu = () => {
    bump();
    setView({ kind: 'menu' });
  };

  if (view.kind === 'pack') {
    return (
      <MatePackPlayer
        pack={getPack(view.id)}
        profileId={profileId}
        pieceSet={pieceSet}
        boardTheme={boardTheme}
        moveStyle={moveStyle}
        focusBoard={focusBoard}
        rewardMove={rewardMove}
        onBack={backToMenu}
      />
    );
  }

  return (
    <EndgameDrill
      stage={getEndgame(view.id)}
      profileId={profileId}
      pieceSet={pieceSet}
      boardTheme={boardTheme}
      moveStyle={moveStyle}
      focusBoard={focusBoard}
      rewardMove={rewardMove}
      onBack={backToMenu}
    />
  );
}

// ── Mate-in-1 player ──────────────────────────────────────────────────────────
function MatePackPlayer({ pack, profileId, pieceSet, boardTheme, moveStyle, focusBoard, rewardMove, onBack }) {
  // Start at the first unsolved position; she can still replay the rest.
  const [idx, setIdx] = useState(() => {
    const prog = getCheckmateProgress(profileId);
    const i = pack.positions.findIndex((p) => !prog.solved.includes(p.id));
    return i === -1 ? 0 : i;
  });
  const pos = pack.positions[idx] || null;
  const finished = !pos;
  const [shownFen, setShownFen] = useState(() => (pos ? pos.fen : null));
  const [lastMove, setLastMove] = useState(null);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(0);
  const [note, setNote] = useState(null);
  const snapTimer = useRef(null);

  useEffect(() => () => clearTimeout(snapTimer.current), []);

  function goTo(i) {
    const p = pack.positions[i];
    setIdx(i);
    setShownFen(p ? p.fen : null);
    setLastMove(null);
    setSolved(false);
    setHint(0);
    setNote(null);
  }

  function handleMove(from, to) {
    if (solved || !pos) return;
    const g = newGame(pos.fen);
    let m = null;
    try {
      m = g.move({ from, to, promotion: 'q' });
    } catch {
      m = null;
    }
    if (!m) return;
    setShownFen(g.fen());
    setLastMove({ from, to });
    if (g.isCheckmate()) {
      setSolved(true);
      recordMateSolve(profileId, pos.id);
      rewardMove && rewardMove(hint === 0 ? 2 : 1);
      setNote({ kind: 'good', text: `⭐ ${m.san} — CHECKMATE! That's the ${pos.name.toLowerCase()}.` });
    } else {
      setNote({ kind: 'warn', text: `${m.san} is a move — but the king escapes! Find the CHECKMATE.` });
      snapTimer.current = setTimeout(() => {
        setShownFen(pos.fen);
        setLastMove(null);
      }, 850);
    }
  }

  const mateMove = pos && hint >= 1 ? findMate(pos.fen) : null;
  const highlights = mateMove ? [mateMove.from] : [];
  const arrows = pos && hint >= 2 && mateMove ? [{ from: mateMove.from, to: mateMove.to }] : [];

  const board = (
    <ChessBoard
      fen={shownFen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'}
      orientation="w"
      lastMove={lastMove}
      highlights={highlights}
      arrows={arrows}
      movableColor={!solved && pos ? 'w' : null}
      moveStyle={moveStyle}
      onMove={handleMove}
      pieceSet={pieceSet}
      boardTheme={boardTheme}
      big={focusBoard}
    />
  );

  const panel = (
    <div className="cc-glass p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base md:text-lg font-extrabold text-gold">
          {pack.icon} {pack.name}
        </h2>
        {!finished && (
          <span className="text-xs font-bold text-frost-dim whitespace-nowrap">
            {idx + 1} of {pack.positions.length}
          </span>
        )}
      </div>

      {finished ? (
        <div className="cc-card p-4 md:p-5 text-center animate-pop">
          <IconStar size={36} className="mx-auto text-gold" />
          <div className="text-lg md:text-2xl font-extrabold text-gold mt-2">Pack complete!</div>
          <p className="text-sm text-frost-dim mt-1.5">You found every checkmate. ⭐</p>
          <button onClick={onBack} className="cc-btn cc-btn-grass w-full py-3 mt-3 text-base">
            ← Back to Checkmate School
          </button>
        </div>
      ) : (
        <>
          <div className="cc-card p-3 md:p-4">
            <div className="text-xs md:text-sm uppercase tracking-wide text-gold/50 mb-1.5">{pos.name}</div>
            <p className="text-sm md:text-lg leading-snug text-frost/90">
              White to move — <b className="text-gold">checkmate in ONE move</b>. Find it!
            </p>
          </div>

          {note && (
            <div
              className={`rounded-cc-lg px-3 py-2 text-sm md:text-base font-bold animate-pop ${
                note.kind === 'good'
                  ? 'bg-grass/20 text-grass ring-1 ring-grass/40'
                  : 'bg-gold/15 text-gold ring-1 ring-gold/40'
              }`}
            >
              {note.text}
            </div>
          )}

          {solved ? (
            <button
              onClick={() => goTo(idx + 1)}
              className="cc-btn cc-btn-grass w-full py-3 text-base md:text-lg"
            >
              {idx + 1 < pack.positions.length ? 'Next mate ▶' : 'Finish ▶'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {hint < 2 ? (
                <button onClick={() => setHint((h) => h + 1)} className="cc-btn cc-btn-secondary flex-1 py-2.5 text-sm">
                  💡 {hint === 0 ? 'Hint' : 'Show the move'}
                </button>
              ) : (
                <div className="flex-1 text-center text-xs text-frost-dim">Follow the arrow!</div>
              )}
              <button onClick={onBack} className="cc-btn cc-btn-secondary flex-1 py-2.5 text-sm">
                ← Back
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return <PlayLayout board={board} panel={panel} focus={focusBoard} />;
}

// ── Endgame drill: play K+Q / K+R vs the engine's lone king to mate ──────────
function EndgameDrill({ stage, profileId, pieceSet, boardTheme, moveStyle, focusBoard, rewardMove, onBack }) {
  const gameRef = useRef(null);
  if (!gameRef.current) gameRef.current = newGame(stage.fen);
  const [fen, setFen] = useState(() => gameRef.current.fen());
  const [lastMove, setLastMove] = useState(null);
  const [outcome, setOutcome] = useState(null); // {kind:'mate'|'stalemate'|'material'|'draw', text}
  const recordedRef = useRef(false);

  const game = gameRef.current;
  const myTurn = !outcome && game.turn() === 'w';
  const moveNo = Math.ceil(game.history().length / 2);

  function refresh(move) {
    setFen(gameRef.current.fen());
    setLastMove(move ? { from: move.from, to: move.to } : null);
  }

  function settle(kind, text, won) {
    setOutcome({ kind, text });
    if (!recordedRef.current) {
      recordedRef.current = true;
      recordEndgameRun(profileId, stage.id, won);
      if (won && rewardMove) rewardMove(5);
    }
  }

  function checkPosition() {
    const g = gameRef.current;
    if (g.isCheckmate()) {
      settle('mate', `🏆 CHECKMATE in ${Math.ceil(g.history().length / 2)} moves — you did it!`, true);
    } else if (g.isStalemate()) {
      settle(
        'stalemate',
        '😮 STALEMATE — the king has no moves but is NOT in check, so it\'s a draw! Always leave the king one square until you\'re ready to mate.',
        false
      );
    } else if (g.isInsufficientMaterial()) {
      settle('material', '💔 The king caught your piece! Keep it protected — it can never sit right next to the enemy king alone.', false);
    } else if (g.isThreefoldRepetition() || g.isDraw()) {
      settle('draw', '🤝 Draw — too much shuffling. Make progress: shrink the box every move!', false);
    }
  }

  // Engine defends with the lone king (full strength = best defense).
  useEffect(() => {
    if (outcome || game.turn() !== 'b') return;
    let cancelled = false;
    const t = setTimeout(() => {
      bestMove(game.fen(), { skill: 20, movetime: 250 }).then((uci) => {
        if (cancelled) return;
        const g = gameRef.current;
        let m = null;
        if (uci && uci.length >= 4) {
          try {
            m = g.move({ from: uci.slice(0, 2), to: uci.slice(2, 4), promotion: uci[4] || undefined });
          } catch {
            m = null;
          }
        }
        if (!m) {
          const ms = g.moves({ verbose: true });
          if (!ms.length) return checkPosition();
          m = g.move(ms[Math.floor(Math.random() * ms.length)].san);
        }
        refresh(m);
        checkPosition();
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fen, outcome]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMove(from, to) {
    if (!myTurn) return;
    let m = null;
    try {
      m = gameRef.current.move({ from, to, promotion: 'q' });
    } catch {
      m = null;
    }
    if (!m) return;
    refresh(m);
    checkPosition();
  }

  function restart() {
    gameRef.current = newGame(stage.fen);
    recordedRef.current = false;
    setOutcome(null);
    setFen(gameRef.current.fen());
    setLastMove(null);
  }

  function takeback() {
    const g = gameRef.current;
    if (!g.history().length || outcome) return;
    g.undo();
    if (g.history().length && g.turn() !== 'w') g.undo();
    refresh(null);
  }

  const board = (
    <ChessBoard
      fen={fen}
      orientation="w"
      lastMove={lastMove}
      movableColor={myTurn ? 'w' : null}
      moveStyle={moveStyle}
      onMove={handleMove}
      pieceSet={pieceSet}
      boardTheme={boardTheme}
      big={focusBoard}
    />
  );

  const panel = (
    <div className="cc-glass p-3 md:p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base md:text-lg font-extrabold text-gold">
          {stage.icon} {stage.name}
        </h2>
        <span className="text-xs font-bold text-frost-dim whitespace-nowrap">Move {Math.max(1, moveNo)}</span>
      </div>

      <div className="cc-card p-3">
        <div className="text-xs uppercase tracking-wide text-gold/50 mb-1">Your plan</div>
        <p className="text-sm leading-snug text-frost/90">{stage.plan}</p>
      </div>

      {outcome ? (
        <div className="cc-card p-4 text-center animate-pop">
          <div
            className={`text-base md:text-xl font-extrabold ${outcome.kind === 'mate' ? 'text-grass' : 'text-gold'}`}
          >
            {outcome.text}
          </div>
          <button onClick={restart} className="cc-btn cc-btn-grass w-full py-3 mt-3 text-base">
            ↺ {outcome.kind === 'mate' ? 'Mate it again' : 'Try again'}
          </button>
          <button onClick={onBack} className="cc-btn cc-btn-secondary w-full py-2.5 mt-2 text-sm">
            ← Back to Checkmate School
          </button>
        </div>
      ) : (
        <>
          <div className="font-bold md:text-lg">
            {myTurn ? (
              <span className="text-grass">Your move{game.inCheck() ? ' — check!' : ''}</span>
            ) : (
              <span className="text-frost-dim">The king is running…</span>
            )}
          </div>
          <div className="flex gap-1.5">
            <button onClick={takeback} className="cc-btn cc-btn-secondary flex-1 py-2 text-xs">
              ↩ Undo
            </button>
            <button onClick={restart} className="cc-btn cc-btn-secondary flex-1 py-2 text-xs">
              ↺ Restart
            </button>
            <button onClick={onBack} className="cc-btn cc-btn-secondary flex-1 py-2 text-xs">
              ← Back
            </button>
          </div>
        </>
      )}
    </div>
  );

  return <PlayLayout board={board} panel={panel} focus={focusBoard} />;
}
