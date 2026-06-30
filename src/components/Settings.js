import React, { useState, useRef } from 'react';
import { PIECE_SETS, getPieceSet } from '../pieces/pieceSets';
import { BOARD_THEMES, getBoardTheme } from '../pieces/boardThemes';
import { THEME_PRESETS, activePresetId } from '../pieces/themePresets';
import { APP_THEMES } from '../state/theme';
import { isMuted, setMuted, playTest, audioState } from '../utils/sounds';
import { IconSettings, IconClose, IconSoundOn, IconSoundOff } from './icons';

export default function Settings({
  open,
  onClose,
  pieceSetId,
  setPieceSetId,
  customSets = [],
  onImportSet,
  onRemoveSet,
  boardThemeId,
  setBoardThemeId,
  moveStyle,
  setMoveStyle,
  logPlacement,
  setLogPlacement,
  appTheme,
  setAppTheme,
}) {
  const [showCustom, setShowCustom] = useState(false);
  const [soundOn, setSoundOn] = useState(!isMuted());
  const [audioInfo, setAudioInfo] = useState('');
  const [importMsg, setImportMsg] = useState('');
  const fileRef = useRef(null);

  const handleImportFile = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = ''; // allow re-importing the same filename
    if (!file || !onImportSet) return;
    try {
      const rec = await onImportSet(file);
      setImportMsg(`✓ Imported “${rec.name}”`);
    } catch (err) {
      setImportMsg(`✕ ${err.message || 'Could not import that file.'}`);
    }
  };

  if (!open) return null;

  const activeId = activePresetId(pieceSetId, boardThemeId);

  const applyPreset = (t) => {
    setPieceSetId(t.piece);
    setBoardThemeId(t.board);
  };

  return (
    <div
      className="cc-scrim items-end sm:items-center p-3"
      onClick={onClose}
    >
      <div className="cc-sheet p-4 animate-pop" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-extrabold text-gold flex items-center gap-2">
            <IconSettings size={20} /> Settings
          </h2>
          <button onClick={onClose} className="cc-icon-btn" aria-label="Close">
            <IconClose size={20} />
          </button>
        </div>

        {/* App look — chrome theme (distinct from the board/piece set below) */}
        <div className="text-xs uppercase tracking-wide text-gold/50 font-bold mb-2">App look</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {APP_THEMES.map((t) => {
            const active = t.id === appTheme;
            return (
              <button
                key={t.id}
                onClick={() => setAppTheme(t.id)}
                className={`rounded-xl p-2 ring-1 flex flex-col items-center gap-1.5 transition ${
                  active ? 'bg-gold/15 ring-gold' : 'bg-bg ring-edge'
                }`}
              >
                <span
                  className="w-full h-9 rounded-md overflow-hidden flex ring-1 ring-black/30"
                  style={{ background: t.swatch[0] }}
                >
                  <span className="flex-1 self-center mx-auto rounded-full" style={{ width: 14, height: 14, background: t.swatch[1], boxShadow: `0 0 8px ${t.swatch[2]}` }} />
                </span>
                <span className={`text-[11px] font-bold leading-tight text-center ${active ? 'text-gold' : 'text-frost/80'}`}>
                  {t.name}
                </span>
              </button>
            );
          })}
        </div>

        {/* Sound */}
        <div className="text-xs uppercase tracking-wide text-gold/50 font-bold mb-2">Sound</div>
        <button
          onClick={() => { const next = !soundOn; setSoundOn(next); setMuted(!next); if (next) playTest(); }}
          className={`w-full mb-2 rounded-xl p-2.5 ring-1 flex items-center justify-between transition ${
            soundOn ? 'bg-gold/15 ring-gold' : 'bg-bg ring-edge'
          }`}
        >
          <span className={`text-sm font-bold flex items-center gap-2 ${soundOn ? 'text-gold' : 'text-frost/80'}`}>
            {soundOn ? <IconSoundOn size={18} /> : <IconSoundOff size={18} />}
            {soundOn ? 'Move sounds on' : 'Move sounds off'}
          </span>
          <span className={`text-xs font-bold ${soundOn ? 'text-gold' : 'text-frost/50'}`}>
            {soundOn ? 'ON' : 'OFF'}
          </span>
        </button>
        <button
          onClick={() => { playTest(); setTimeout(() => setAudioInfo(audioState()), 120); }}
          className="w-full mb-4 rounded-xl p-2 ring-1 ring-edge bg-bg text-sm font-bold text-frost/80 active:translate-y-px flex items-center justify-center gap-2"
        >
          <IconSoundOn size={16} /> Play a test sound{audioInfo ? ` — audio: ${audioInfo}` : ''}
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

        {/* Move log placement (wide screens) */}
        <div className="text-xs uppercase tracking-wide text-gold/50 font-bold mb-2">Move log (wide screens)</div>
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { id: 'auto', name: 'Auto', hint: 'side if room' },
            { id: 'sidebar', name: 'Sidebar', hint: 'right column' },
            { id: 'panel', name: 'In panel', hint: 'with controls' },
          ].map((m) => {
            const active = m.id === logPlacement;
            return (
              <button
                key={m.id}
                onClick={() => setLogPlacement(m.id)}
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

        {/* Board + pieces matched presets */}
        <div className="text-xs uppercase tracking-wide text-gold/50 font-bold mb-2">Board &amp; pieces</div>
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
            <div className="grid grid-cols-4 gap-2 mb-2">
              {PIECE_SETS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setPieceSetId(s.id)}
                  className={`rounded-xl p-1.5 ring-1 flex flex-col items-center gap-1 transition ${
                    s.id === pieceSetId ? 'bg-gold/15 ring-gold' : 'bg-bg ring-edge'
                  }`}
                >
                  {s.svg ? (
                    <span className="w-8 h-8 inline-block">{s.render('w', 'n')}</span>
                  ) : (
                    <img src={s.previewSrc} alt="" draggable={false} className="w-8 h-8" />
                  )}
                  <span className={`text-[10px] font-bold ${s.id === pieceSetId ? 'text-gold' : 'text-frost/80'}`}>
                    {s.name}
                  </span>
                </button>
              ))}
              {customSets.map((s) => (
                <div
                  key={s.id}
                  className={`relative rounded-xl p-1.5 ring-1 flex flex-col items-center gap-1 transition ${
                    s.id === pieceSetId ? 'bg-gold/15 ring-gold' : 'bg-bg ring-edge'
                  }`}
                >
                  <button onClick={() => setPieceSetId(s.id)} className="flex flex-col items-center gap-1 w-full">
                    <img src={s.previewSrc} alt="" draggable={false} className="w-8 h-8" />
                    <span className={`text-[10px] font-bold truncate max-w-full ${s.id === pieceSetId ? 'text-gold' : 'text-frost/80'}`}>
                      {s.name}
                    </span>
                  </button>
                  {onRemoveSet && (
                    <button
                      onClick={() => onRemoveSet(s.id)}
                      title="Remove this set"
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-bg ring-1 ring-edge text-frost/70 text-[11px] font-bold leading-none flex items-center justify-center hover:text-red-300 hover:ring-red-400/50"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
            {/* Import a generated set (.chessset.json) */}
            <input ref={fileRef} type="file" accept=".json,application/json" onChange={handleImportFile} className="hidden" />
            <button
              onClick={() => fileRef.current && fileRef.current.click()}
              className="w-full mb-1 rounded-xl p-2 ring-1 ring-edge bg-bg text-xs font-bold text-frost/80 active:translate-y-px flex items-center justify-center gap-2"
            >
              ＋ Import a chess set (.chessset.json)
            </button>
            {importMsg && <div className="text-[10px] text-frost/60 mb-3">{importMsg}</div>}
            {!importMsg && <div className="mb-3" />}

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
