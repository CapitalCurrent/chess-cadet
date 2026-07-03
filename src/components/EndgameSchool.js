import React, { useEffect, useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import PlayLayout from './PlayLayout';
import { newGame } from '../engine/chessEngine';
import { bestMove, initEngine } from '../engine/stockfishEngine';
import { ENDGAME_COURSE, getEndgameStage } from '../data/endgameCourse';
import { getEndgameCourseProgress, recordEndgameStageRun } from '../state/endgameProgress';
import { IconStar } from './icons';

// 🏁 Endgame School — the technique ladder, basic → advanced. Each stage is a
// LESSON (concept + plan) plus a real drill vs the full-strength engine.
// Goals differ by stage: mate, promote, or — just as important — HOLD THE
// DRAW. Defensive technique is graded as a win here: a held fortress or a
// Philidor wall is a success, not a consolation.

const GOAL_LABEL = {
  mate: '🎯 Goal: checkmate them',
  promote: '🎯 Goal: promote your pawn',
  draw: '🎯 Goal: HOLD THE DRAW — that is the win here',
};

export default function EndgameSchool({ profileId, pieceSet, boardTheme, moveStyle, focusBoard, rewardMove, onBack }) {
  const [view, setView] = useState({ kind: 'menu' }); // {kind:'menu'} | {kind:'stage', id}
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const progress = getEndgameCourseProgress(profileId);

  useEffect(() => {
    initEngine();
  }, []);

  if (view.kind === 'menu') {
    // Group stages by tier, preserving the authored basic→advanced order.
    const tiers = [];
    for (const st of ENDGAME_COURSE) {
      const t = tiers[tiers.length - 1];
      if (t && t.name === st.tier) t.stages.push(st);
      else tiers.push({ name: st.tier, stages: [st] });
    }
    return (
      <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-2xl md:text-3xl font-extrabold text-frost font-round flex items-center justify-center gap-2">
            🏁 Endgame School
          </div>
          <div className="text-sm md:text-base text-frost-dim mt-1.5">
            Fewer pieces, deeper ideas — technique the engine can't shake.
          </div>
        </div>

        <div className="cc-card p-3 mb-4 text-sm text-frost-dim">
          ♛ New here? Master the <b className="text-frost">Queen Mate</b> and <b className="text-frost">Rook Mate</b> in
          Checkmate School first — everything below builds on them.
        </div>

        {tiers.map((tier) => (
          <div key={tier.name} className="mb-4">
            <div className="text-xs uppercase tracking-wide text-gold/50 font-bold mb-2">{tier.name}</div>
            <div className="space-y-3">
              {tier.stages.map((st) => {
                const e = progress.stages[st.id] || { wins: 0 };
                return (
                  <button
                    key={st.id}
                    onClick={() => setView({ kind: 'stage', id: st.id })}
                    className="cc-glass cc-reveal w-full p-4 flex items-center gap-3 text-left"
                  >
                    <span className="text-2xl shrink-0">{st.icon}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-extrabold text-frost text-lg">
                        {st.name} {e.wins > 0 && <span className="text-gold">★</span>}
                      </span>
                      <span className="block text-sm text-frost-dim">{st.blurb}</span>
                    </span>
                    <span className="text-right shrink-0">
                      <span className="block text-[10px] uppercase tracking-wide font-bold text-frost-dim">{st.level}</span>
                      <span className={`block text-xs font-bold ${e.wins > 0 ? 'text-gold' : 'text-frost-dim'}`}>
                        {e.wins > 0 ? `⭐ ×${e.wins}` : 'vs 🤖'}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}

        {onBack && (
          <button onClick={onBack} className="cc-btn cc-btn-secondary w-full py-2.5 mt-2 text-sm">
            ← Back to Learn
          </button>
        )}
      </div>
    );
  }

  return (
    <EndgameStageDrill
      stage={getEndgameStage(view.id)}
      profileId={profileId}
      pieceSet={pieceSet}
      boardTheme={boardTheme}
      moveStyle={moveStyle}
      focusBoard={focusBoard}
      rewardMove={rewardMove}
      onBack={() => {
        bump();
        setView({ kind: 'menu' });
      }}
    />
  );
}

function EndgameStageDrill({ stage, profileId, pieceSet, boardTheme, moveStyle, focusBoard, rewardMove, onBack }) {
  const gameRef = useRef(newGame(stage.fen));
  const [fen, setFen] = useState(stage.fen);
  const [lastMove, setLastMove] = useState(null);
  const [outcome, setOutcome] = useState(null); // { kind: 'win'|'fail', text }
  const recordedRef = useRef(false);
  const herMovesRef = useRef(0);
  // The click-through IDEA walkthrough (arrows + circles + captions) plays
  // BEFORE the drill — see the technique, then try it. -1 = drilling.
  const walkthrough = stage.walkthrough || [];
  const [wtIdx, setWtIdx] = useState(walkthrough.length ? 0 : -1);
  const showingIdea = wtIdx >= 0;
  const wtStep = showingIdea ? walkthrough[wtIdx] : null;
  const game = gameRef.current;
  const myTurn = !outcome && !showingIdea && game.turn() === 'w';

  function refresh(move) {
    setFen(gameRef.current.fen());
    setLastMove(move ? { from: move.from, to: move.to } : null);
  }

  function settle(won, text) {
    setOutcome({ kind: won ? 'win' : 'fail', text });
    if (!recordedRef.current) {
      recordedRef.current = true;
      recordEndgameStageRun(profileId, stage.id, won);
      if (won && rewardMove) rewardMove(5);
    }
  }

  // Goal-aware outcome check. `move` = the move just played (hers or the
  // engine's) so promotions can be attributed to a side.
  function checkPosition(move) {
    const g = gameRef.current;
    const goal = stage.goal;
    if (g.isCheckmate()) {
      if (g.turn() === 'b') {
        // She delivered mate — a win for every goal (even a defensive stage
        // that turns around is a win, just a rarer one).
        return settle(true, goal === 'draw' ? '🏆 You didn\'t just hold it — you WON it!' : stage.winText);
      }
      return settle(false, goal === 'draw' ? '💥 Mated — the wall broke. Read the plan and try again!' : '💥 Checkmated — regroup and try again!');
    }
    if (move && move.promotion) {
      if (move.color === 'w' && goal === 'promote') return settle(true, stage.winText);
      if (move.color === 'b') {
        return settle(false, goal === 'draw' ? '💔 Their pawn queened — the technique slipped. Try again!' : '💔 Their pawn queened first. Try again!');
      }
    }
    if (g.isStalemate() || g.isInsufficientMaterial() || g.isThreefoldRepetition() || g.isDraw()) {
      if (goal === 'draw') return settle(true, stage.winText);
      if (g.isStalemate()) return settle(false, "😮 STALEMATE — no moves but not in check is a DRAW. Always leave the king one square until you're ready!");
      if (g.isInsufficientMaterial()) return settle(false, '💔 Not enough pieces left to win — you lost the one that mattered. Try again!');
      return settle(false, '🤝 Draw — too much shuffling. Follow the plan and make progress every move!');
    }
    if (goal === 'draw' && herMovesRef.current >= 30) {
      return settle(true, `${stage.winText} You held for 30 moves — that IS the technique.`);
    }
  }

  // Engine plays Black at full strength — best defense (or attack) there is.
  useEffect(() => {
    if (outcome || showingIdea || game.turn() !== 'b') return;
    let cancelled = false;
    const t = setTimeout(() => {
      bestMove(game.fen(), { skill: 20, movetime: 300 }).then((uci) => {
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
          if (!ms.length) return checkPosition(null);
          m = g.move(ms[Math.floor(Math.random() * ms.length)].san);
        }
        refresh(m);
        checkPosition(m);
      });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [fen, outcome, showingIdea]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleMove(from, to) {
    if (!myTurn) return;
    const g = gameRef.current;
    let m = null;
    try {
      m = g.move({ from, to, promotion: 'q' });
    } catch {
      m = null;
    }
    if (!m) return;
    herMovesRef.current += 1;
    refresh(m);
    checkPosition(m);
  }

  function restart() {
    gameRef.current = newGame(stage.fen);
    herMovesRef.current = 0;
    recordedRef.current = false;
    setOutcome(null);
    refresh(null);
  }

  const board = (
    <ChessBoard
      fen={showingIdea ? wtStep.fen : fen}
      orientation="w"
      lastMove={showingIdea ? null : lastMove}
      arrows={showingIdea ? wtStep.arrows || [] : []}
      highlights={showingIdea ? wtStep.circles || [] : []}
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
        <h2 className="text-base md:text-lg font-extrabold text-gold flex items-center gap-2">
          <span className="text-xl">{stage.icon}</span> {stage.name}
        </h2>
        <span className="text-[10px] uppercase tracking-wide font-bold text-frost-dim whitespace-nowrap">{stage.level}</span>
      </div>

      {showingIdea ? (
        /* The IDEA walkthrough — click through the annotated steps, then drill. */
        <>
          <div className="cc-card p-3 md:p-4">
            <div className="flex items-center gap-1.5 mb-2">
              {walkthrough.map((_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === wtIdx ? 'w-6 bg-gold' : 'w-1.5 bg-frost/25'}`}
                />
              ))}
              <span className="ml-auto text-[11px] font-bold text-frost-dim">
                {wtIdx + 1} / {walkthrough.length}
              </span>
            </div>
            <p className="text-sm md:text-lg leading-snug text-frost/95 animate-pop" key={wtIdx}>
              {wtStep.caption}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setWtIdx((i) => Math.max(0, i - 1))}
              disabled={wtIdx === 0}
              className="cc-btn cc-btn-secondary px-4 py-2.5 text-sm disabled:opacity-40"
            >
              ◀
            </button>
            {wtIdx < walkthrough.length - 1 ? (
              <button onClick={() => setWtIdx((i) => i + 1)} className="cc-btn cc-btn-primary flex-1 py-2.5 text-sm md:text-base">
                Next ▶
              </button>
            ) : (
              <button onClick={() => setWtIdx(-1)} className="cc-btn cc-btn-grass flex-1 py-2.5 text-sm md:text-base">
                Got it — let me try! ▶
              </button>
            )}
            <button onClick={() => setWtIdx(-1)} className="cc-btn cc-btn-secondary px-3 py-2.5 text-sm">
              Skip
            </button>
          </div>
        </>
      ) : (
        /* The lesson summary — concept, plan, goal — always visible while drilling. */
        <div className="cc-card p-3 md:p-4">
          <p className="text-sm md:text-base leading-snug text-frost/90">{stage.concept}</p>
          <p className="mt-2 text-sm md:text-base leading-snug text-frost-dim">
            <b className="text-gold">📋 The plan:</b> {stage.plan}
          </p>
          <div className="mt-2 text-sm md:text-base text-grass font-bold">{GOAL_LABEL[stage.goal]}</div>
        </div>
      )}

      {showingIdea ? null : outcome ? (
        <div className="cc-card p-4 text-center animate-pop">
          {outcome.kind === 'win' && <IconStar size={32} className="mx-auto text-gold" />}
          <div className={`mt-1 text-base md:text-xl font-extrabold ${outcome.kind === 'win' ? 'text-grass' : 'text-gold'}`}>
            {outcome.text}
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={restart} className="cc-btn cc-btn-grass flex-1 py-2.5 text-sm md:text-base">
              ↺ {outcome.kind === 'win' ? 'Do it again' : 'Try again'}
            </button>
            <button onClick={onBack} className="cc-btn cc-btn-secondary flex-1 py-2.5 text-sm md:text-base">
              ← Stages
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <div className="flex-1 text-sm font-bold text-frost-dim">
            {myTurn ? 'Your move — follow the plan.' : '🤖 Thinking…'}
          </div>
          {walkthrough.length > 0 && (
            <button onClick={() => setWtIdx(0)} className="cc-btn cc-btn-secondary px-3 py-2 text-sm" title="Replay the idea">
              📖 Idea
            </button>
          )}
          <button onClick={restart} className="cc-btn cc-btn-secondary px-3 py-2 text-sm">
            ↺ Restart
          </button>
          <button onClick={onBack} className="cc-btn cc-btn-secondary px-3 py-2 text-sm">
            ← Stages
          </button>
        </div>
      )}
    </div>
  );

  return <PlayLayout board={board} panel={panel} focus={focusBoard} />;
}
