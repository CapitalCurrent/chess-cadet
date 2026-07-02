import React, { useRef, useState } from 'react';
import ChessBoard from './ChessBoard';
import PlayLayout from './PlayLayout';
import { newGame } from '../engine/chessEngine';
import { TACTICS_PACKS, getTacticsPack, achievesMotif } from '../data/tacticsPacks';
import { getTacticsProgress, recordTacticSolve } from '../state/tacticsProgress';
import { IconDrill, IconStar } from './icons';

// 🎯 Tactics School — the motifs the coach names in her games, taught
// proactively. Solving is VALIDATOR-based: any move that genuinely achieves
// the pack's motif counts (the same SEE/legality-gated detectors the live
// coach uses), exactly like Checkmate School accepts any mating move. This
// closes the loop: learn the motif here → the coach spots it in games → the
// Notebook drills the ones she misses.

export default function TacticsSchool({ profileId, pieceSet, boardTheme, moveStyle, focusBoard, rewardMove, onBack }) {
  const [view, setView] = useState({ kind: 'menu' }); // {kind:'menu'} | {kind:'pack', id}
  const [, setTick] = useState(0);
  const bump = () => setTick((t) => t + 1);
  const progress = getTacticsProgress(profileId);

  if (view.kind === 'menu') {
    return (
      <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-8">
        <div className="text-center mb-6">
          <div className="text-2xl md:text-3xl font-extrabold text-frost font-round flex items-center justify-center gap-2">
            <IconDrill size={28} className="text-gold" /> Tactics School
          </div>
          <div className="text-sm md:text-base text-frost-dim mt-1.5">
            Win pieces with one sharp move — the patterns behind almost every won game.
          </div>
        </div>

        <div className="space-y-3">
          {TACTICS_PACKS.map((pack) => {
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
        </div>

        {onBack && (
          <button onClick={onBack} className="cc-btn cc-btn-secondary w-full py-2.5 mt-5 text-sm">
            ← Back to Learn
          </button>
        )}
      </div>
    );
  }

  return (
    <TacticPackPlayer
      pack={getTacticsPack(view.id)}
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

function TacticPackPlayer({ pack, profileId, pieceSet, boardTheme, moveStyle, focusBoard, rewardMove, onBack }) {
  // Start at the first unsolved position; she can still replay the rest.
  const [idx, setIdx] = useState(() => {
    const prog = getTacticsProgress(profileId);
    const i = pack.positions.findIndex((p) => !prog.solved.includes(p.id));
    return i === -1 ? 0 : i;
  });
  const pos = pack.positions[idx] || null;
  const finished = !pos;
  const [shownFen, setShownFen] = useState(() => (pos ? pos.fen : null));
  const [lastMove, setLastMove] = useState(null);
  const [solved, setSolved] = useState(false);
  const [hint, setHint] = useState(0); // 0 none · 1 highlight the piece · 2 arrow
  const [note, setNote] = useState(null);
  const snapTimer = useRef(null);

  function goTo(i) {
    clearTimeout(snapTimer.current);
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
    const uci = from + to + (m.promotion || '');
    setShownFen(g.fen());
    setLastMove({ from, to });
    if (achievesMotif(pack.id, pos.fen, uci)) {
      setSolved(true);
      recordTacticSolve(profileId, pos.id);
      rewardMove && rewardMove(hint === 0 ? 2 : 1);
      setNote({ kind: 'good', text: `⭐ ${m.san} — that's the ${pack.name.replace(/s$/, '').toLowerCase()}! ${pos.why}` });
    } else {
      // Back-rank pack teaches the mate definition like Checkmate School does;
      // the other packs get their motif-specific nudge.
      const backrankMsg = g.inCheck()
        ? `${m.san} is check — but the king can get out! Find the check with NO escape.`
        : `${m.san} doesn't give check — ${pack.wrongHint}`;
      setNote({ kind: 'warn', text: pack.id === 'backrank' ? backrankMsg : `${m.san} isn't it. ${pack.wrongHint}` });
      snapTimer.current = setTimeout(() => {
        setShownFen(pos.fen);
        setLastMove(null);
      }, 850);
    }
  }

  const highlights = pos && hint >= 1 && !solved ? [pos.uci.slice(0, 2)] : [];
  const arrows = pos && hint >= 2 && !solved ? [{ from: pos.uci.slice(0, 2), to: pos.uci.slice(2, 4) }] : [];

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
        <h2 className="text-base md:text-lg font-extrabold text-gold flex items-center gap-2">
          <span className="text-xl">{pack.icon}</span> {pack.name}
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
          <p className="text-sm text-frost-dim mt-1.5">
            Now watch for this pattern in your games — the coach will cheer when you find one for real.
          </p>
          <button onClick={onBack} className="cc-btn cc-btn-grass w-full py-3 mt-3 text-base">
            ← Back to Tactics
          </button>
        </div>
      ) : (
        <>
          {/* Concept first — the lesson the whole pack teaches. */}
          <div className="cc-card p-3 md:p-4">
            <div className="text-xs md:text-sm uppercase tracking-wide text-gold/50 mb-1.5">{pos.name}</div>
            <p className="text-sm md:text-base leading-snug text-frost/90">{pack.concept}</p>
            <div className="mt-2 text-sm md:text-lg text-grass font-bold">👉 {pack.findPrompt}</div>
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
            <button onClick={() => goTo(idx + 1)} className="cc-btn cc-btn-grass w-full py-3 text-base md:text-lg">
              {idx + 1 < pack.positions.length ? 'Next puzzle ▶' : 'Finish pack ▶'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              {hint < 2 ? (
                <button onClick={() => setHint((h) => h + 1)} className="cc-btn cc-btn-secondary flex-1 py-2.5 text-sm">
                  💡 {hint === 0 ? 'Hint' : 'Bigger hint'}
                </button>
              ) : (
                <div className="flex-1 text-center text-xs text-frost-dim">Follow the arrow!</div>
              )}
              <button onClick={onBack} className="cc-btn cc-btn-secondary flex-1 py-2.5 text-sm">
                ← Packs
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );

  return <PlayLayout board={board} panel={panel} focus={focusBoard} />;
}
