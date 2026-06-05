import React, { useState } from 'react';
import { PIECE_SETS, getPieceSet } from '../pieces/pieceSets';
import { BOARD_THEMES, getBoardTheme } from '../pieces/boardThemes';
import { THEME_PRESETS, activePresetId } from '../pieces/themePresets';
import { isMuted, setMuted } from '../utils/sounds';

export default function Settings({
  open,
  onClose,
  pieceSetId,
  setPieceSetId,
  boardThemeId,
  setBoardThemeId,
  moveStyle,
  setMoveStyle,
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [soundOn, setSoundOn] = useState(!isMuted());
  if (!open) return null;

  const activeId = activePresetId(pieceSetId, boardThemeId);

  const applyPreset = (t) => {
    setPieceSetId(t.piece);
    setBoardThemeId(t.board);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
      onClick={onClose}
    >
      <div
        className="bg-surface rounded-2xl ring-1 ring-edge w-full max-w-md p-4 max-h-[88vh] overflow-y-auto animate-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-gold">⚙️ Settings</h2>
          <button onClick={onClose} className="text-frost/70 text-xl leading-none px-2 py-1">
            ✕
          </button>
        </div>

        {/* Sound */}
        <div className="text-xs uppercase tracking-wide text-gold/50 font-bold mb-2">Sound</div>
        <button
          onClick={() => { const next = !soundOn; setSoundOn(next); setMuted(!next); }}
          className={`w-full mb-4 rounded-xl p-2.5 ring-1 flex items-center justify-between transition ${
            soundOn ? 'bg-gold/15 ring-gold' : 'bg-bg ring-edge'
          }`}
        >
          <span className={`text-sm font-bold ${soundOn ? 'text-gold' : 'text-frost/80'}`}>
            {soundOn ? '🔊 Move sounds on' : '🔇 Move sounds off'}
          </span>
          <span className={`text-xs font-bold ${soundOn ? 'text-gold' : 'text-frost/50'}`}>
            {soundOn ? 'ON' : 'OFF'}
          </span>
        </button>

        {/* Move input style */}
        <div className="text-xs uppercase tracking-wide text-gold/50 font-bold mb-2">Move pieces by</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { id: 'both', name: 'Both', hint: 'tap or drag' },
            { id: 'click', name: 'Tap', hint: 'tap, then tap' },
            { id: 'drag', name: 'Drag', hint: 'drag & drop' },
          ].map((m) => {
            const active = m.id === moveStyle;
            return (
              <button
                key={m.id}
                onClick={() => setMoveStyle(m.id)}
                className={`rounded-xl p-2 ring-1 flex flex-col items-center gap-0.5 transition ${
                  active ? 'bg-gold/15 ring-gold' : 'bg-bg ring-edge'
                }`}
              >
                <span className={`text-sm font-bold ${active ? 'text-gold' : 'text-frost/80'}`}>{m.name}</span>
                <span className="text-[10px] text-frost/50">{m.hint}</span>
              </button>
            );
          })}
        </div>

        {/* Themes (board + pieces matched) */}
        <div className="text-xs uppercase tracking-wide text-gold/50 font-bold mb-2">Theme</div>
        <div className="grid grid-cols-3 gap-2">
          {THEME_PRESETS.map((t) => {
            const board = getBoardTheme(t.board);
            const set = getPieceSet(t.piece);
            const active = t.id === activeId;
            return (
              <button
                key={t.id}
                onClick={() => applyPreset(t)}
                className={`rounded-xl p-2 ring-1 flex flex-col items-center gap-1.5 transition ${
                  active ? 'bg-gold/15 ring-gold' : 'bg-bg ring-edge'
                }`}
              >
                <div className="relative w-14 h-14 rounded-md overflow-hidden grid grid-cols-2 grid-rows-2 ring-1 ring-black/20">
                  <span style={{ background: board.light }} />
                  <span style={{ background: board.dark }} />
                  <span style={{ background: board.dark }} />
                  <span style={{ background: board.light }} />
                  <img
                    src={set.previewSrc}
                    alt=""
                    draggable={false}
                    className="absolute inset-0 w-full h-full object-contain p-1"
                  />
                </div>
                <span className={`text-[11px] font-bold leading-tight text-center ${active ? 'text-gold' : 'text-frost/80'}`}>
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Customize (independent pickers) */}
        <button
          onClick={() => setShowCustom((s) => !s)}
          className="mt-4 w-full text-left text-xs uppercase tracking-wide text-gold/50 font-bold flex items-center justify-between"
        >
          <span>Customize</span>
          <span>{showCustom ? '▲' : '▼'}</span>
        </button>

        {showCustom && (
          <div className="mt-3 animate-float">
            <div className="text-[11px] uppercase tracking-wide text-gold/40 font-bold mb-1.5">Pieces</div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {PIECE_SETS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPieceSetId(s.id)}
                  className={`rounded-xl p-1.5 ring-1 flex flex-col items-center gap-1 transition ${
                    s.id === pieceSetId ? 'bg-gold/15 ring-gold' : 'bg-bg ring-edge'
                  }`}
                >
                  <img src={s.previewSrc} alt="" draggable={false} className="w-8 h-8" />
                  <span className={`text-[10px] font-bold ${s.id === pieceSetId ? 'text-gold' : 'text-frost/80'}`}>
                    {s.name}
                  </span>
                </button>
              ))}
            </div>

            <div className="text-[11px] uppercase tracking-wide text-gold/40 font-bold mb-1.5">Board</div>
            <div className="grid grid-cols-3 gap-2">
              {BOARD_THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setBoardThemeId(t.id)}
                  className={`rounded-xl p-1.5 ring-1 flex flex-col items-center gap-1 bg-bg transition ${
                    t.id === boardThemeId ? 'ring-gold' : 'ring-edge'
                  }`}
                >
                  <span className="w-full h-7 rounded-md overflow-hidden flex ring-1 ring-black/20">
                    <span className="flex-1" style={{ background: t.light }} />
                    <span className="flex-1" style={{ background: t.dark }} />
                    <span className="flex-1" style={{ background: t.light }} />
                    <span className="flex-1" style={{ background: t.dark }} />
                  </span>
                  <span className={`text-[10px] font-bold ${t.id === boardThemeId ? 'text-gold' : 'text-frost/80'}`}>
                    {t.name}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 text-[10px] text-frost/40 leading-snug">
          Piece sets: cburnett &amp; merida (GPLv2+), chessnut (Apache 2.0) — from the lichess project.
        </div>
      </div>
    </div>
  );
}
