import React, { useEffect, useMemo, useRef, useState } from 'react';
import { newGame, legalTargets } from '../engine/chessEngine';
import { getPieceSet } from '../pieces/pieceSets';
import { getBoardTheme } from '../pieces/boardThemes';
import { playMove, playCapture, playCheck, playCheckmate } from '../utils/sounds';

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

// Hex -> rgba, for translucent (glass) board squares.
function withAlpha(hex, a) {
  const h = (hex || '#000').replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const n = parseInt(full, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// Map a square ("e4") to its center in an 8x8 SVG viewBox, honoring orientation.
function squareToXY(square, orientation) {
  const f = FILES.indexOf(square[0]);
  const r = parseInt(square[1], 10);
  const col = orientation === 'w' ? f : 7 - f;
  const row = orientation === 'w' ? 8 - r : r - 1;
  return { x: col + 0.5, y: row + 0.5 };
}

// Right-drag draw color, by modifier key (lichess-style).
function drawColor(e) {
  if (e.shiftKey) return '#e7402b'; // red
  if (e.altKey) return '#3b82f6'; // blue
  if (e.ctrlKey || e.metaKey) return '#f6c544'; // yellow
  return '#15a34a'; // green (default)
}

function Arrow({ from, to, orientation, color = '#ff8a3d', opacity = 0.6 }) {
  const a = squareToXY(from, orientation);
  const b = squareToXY(to, orientation);
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const head = 0.22;
  const ex = b.x - ux * head;
  const ey = b.y - uy * head;
  const px = -uy;
  const py = ux;
  const hw = 0.12;
  return (
    <g opacity={opacity}>
      <line x1={a.x} y1={a.y} x2={ex} y2={ey} stroke={color} strokeWidth="0.1" strokeLinecap="round" />
      <polygon
        fill={color}
        stroke="none"
        points={`${b.x},${b.y} ${ex + px * hw},${ey + py * hw} ${ex - px * hw},${ey - py * hw}`}
      />
    </g>
  );
}

// Renders a position from a FEN with coordinate labels.
//   lastMove     = { from, to }      highlight last move
//   arrows       = [{ from, to }]    coaching arrows overlay
//   highlights   = ['c4', 'f1']      ring a square
//   movableColor = 'w' | 'b'         enables tap-to-move AND drag for that side
//   onMove(from, to)                 called when a move is completed
// Right-drag on the board draws annotation arrows/circles (any mode).
export default function ChessBoard({
  fen,
  orientation = 'w',
  lastMove = null,
  arrows = [],
  highlights = [],
  movableColor = null,
  moveStyle = 'both', // 'both' | 'click' (tap only) | 'drag' (drag only)
  onMove,
  pieceSet,
  boardTheme,
  big = false, // focus mode — let the board fill much more of a large screen
  silent = false, // suppress move sounds (e.g. while scrubbing the move history)
}) {
  const set = pieceSet || getPieceSet('classic');
  const theme = boardTheme || getBoardTheme('wood');

  // Outline for legibility + a deeper soft shadow so pieces sit grounded on the
  // glass board (Fluent depth) rather than looking pasted on.
  const shadowFor = (color) =>
    color === 'w'
      ? 'drop-shadow(0 0 1.1px rgba(0,0,0,0.7)) drop-shadow(0 3px 4px rgba(0,0,0,0.5))'
      : 'drop-shadow(0 0 1.3px rgba(255,255,255,0.65)) drop-shadow(0 3px 4px rgba(0,0,0,0.55))';

  const [selected, setSelected] = useState(null);
  const [drag, setDrag] = useState(null);
  const [userArrows, setUserArrows] = useState([]);
  const [userCircles, setUserCircles] = useState([]);
  const [drawing, setDrawing] = useState(null); // { from, to, color }
  const boardRef = useRef(null);
  const downRef = useRef(null);
  const drawRef = useRef(null);
  const userMoveRef = useRef(null); // "fromto" of a move the user just made on the board (skip its slide animation)

  // A move was made / position changed: clear selection AND annotations.
  useEffect(() => {
    setSelected(null);
    setUserArrows([]);
    setUserCircles([]);
    userMoveRef.current = null; // consumed by this render's slide check; reset for the next move
  }, [fen]);

  const { cells, byName } = useMemo(() => {
    const board = newGame(fen).board();
    const list = [];
    const map = {};
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const name = FILES[col] + (8 - row);
        const piece = board[row][col];
        const cell = { name, piece, light: (col + (8 - row)) % 2 === 0 };
        list.push(cell);
        map[name] = cell;
      }
    }
    return { cells: list, byName: map };
  }, [fen]);

  const targets = useMemo(() => (selected ? legalTargets(fen, selected) : []), [fen, selected]);

  // Play a move/capture sound when the position changes to a new move. Capture
  // is inferred from a drop in piece count (works for every board that uses us).
  const soundRef = useRef({ fen: null, count: null });
  useEffect(() => {
    const count = cells.reduce((a, c) => a + (c.piece ? 1 : 0), 0);
    const prev = soundRef.current;
    if (!silent && prev.fen !== null && prev.fen !== fen && lastMove) {
      if (prev.count !== null && count < prev.count) playCapture();
      else playMove();
      try {
        const g = newGame(fen);
        if (g.isCheckmate()) playCheckmate(); // triumphant fanfare
        else if (g.inCheck()) playCheck(); // bright chime layered on top
      } catch {
        /* ignore */
      }
    }
    soundRef.current = { fen, count };
  }, [fen]); // eslint-disable-line react-hooks/exhaustive-deps

  function toggleArrow(from, to, color) {
    setUserArrows((arr) => {
      const i = arr.findIndex((a) => a.from === from && a.to === to);
      if (i >= 0) {
        const copy = [...arr];
        if (arr[i].color === color) copy.splice(i, 1); // same color -> remove
        else copy[i] = { from, to, color }; // different color -> recolor
        return copy;
      }
      return [...arr, { from, to, color }];
    });
  }

  function toggleCircle(square, color) {
    setUserCircles((arr) => {
      const i = arr.findIndex((c) => c.square === square);
      if (i >= 0) {
        const copy = [...arr];
        if (arr[i].color === color) copy.splice(i, 1);
        else copy[i] = { square, color };
        return copy;
      }
      return [...arr, { square, color }];
    });
  }

  function tap(name) {
    if (!movableColor) return;
    const piece = byName[name]?.piece;
    if (selected) {
      if (name === selected) return setSelected(null);
      if (targets.includes(name)) {
        // Tap-to-move should SLIDE (you didn't physically drag the piece) — so we
        // do NOT mark it as a user-dragged move here. Only real drags skip the slide.
        onMove && onMove(selected, name);
        return setSelected(null);
      }
      if (piece && piece.color === movableColor) return setSelected(name);
      return setSelected(null);
    }
    if (piece && piece.color === movableColor) setSelected(name);
  }

  function squareFromEvent(e) {
    const el = boardRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    if (cx < 0 || cy < 0 || cx > rect.width || cy > rect.height) return null;
    const col = Math.min(7, Math.floor(cx / (rect.width / 8)));
    const row = Math.min(7, Math.floor(cy / (rect.height / 8)));
    const file = orientation === 'w' ? FILES[col] : FILES[7 - col];
    const rank = orientation === 'w' ? 8 - row : row + 1;
    return file + rank;
  }

  function onPointerDown(e) {
    // Right button: draw annotations (works in any mode).
    if (e.button === 2) {
      e.preventDefault();
      const name = squareFromEvent(e);
      if (!name) return;
      drawRef.current = { from: name, color: drawColor(e) };
      setDrawing({ from: name, to: name, color: drawColor(e) });
      try { boardRef.current.setPointerCapture(e.pointerId); } catch {}
      return;
    }
    if (e.button && e.button !== 0) return;
    // Left interaction clears any drawn annotations.
    if (userArrows.length || userCircles.length) { setUserArrows([]); setUserCircles([]); }
    if (!movableColor) return;
    const name = squareFromEvent(e);
    if (!name) return;
    downRef.current = { square: name, x: e.clientX, y: e.clientY, piece: byName[name]?.piece };
  }

  function onPointerMove(e) {
    if (drawRef.current) {
      const to = squareFromEvent(e) || drawRef.current.from;
      setDrawing((d) => (d ? { ...d, to } : d));
      return;
    }
    if (moveStyle === 'click') return; // tap-only: never start a drag
    const down = downRef.current;
    if (!down || !down.piece || down.piece.color !== movableColor) return;
    const dist = Math.abs(e.clientX - down.x) + Math.abs(e.clientY - down.y);
    if (dist <= 6) return;
    const rect = boardRef.current.getBoundingClientRect();
    if (!drag) {
      setSelected(down.square);
      try { boardRef.current.setPointerCapture(e.pointerId); } catch {}
    }
    setDrag({ from: down.square, piece: down.piece, x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  function onPointerUp(e) {
    if (drawRef.current) {
      const { from, color } = drawRef.current;
      drawRef.current = null;
      setDrawing(null);
      try { boardRef.current.releasePointerCapture(e.pointerId); } catch {}
      const to = squareFromEvent(e);
      if (!to || to === from) toggleCircle(from, color);
      else toggleArrow(from, to, color);
      return;
    }
    downRef.current = null;
    const up = squareFromEvent(e);
    if (drag) {
      const from = drag.from;
      setDrag(null);
      try { boardRef.current.releasePointerCapture(e.pointerId); } catch {}
      if (up && up !== from && legalTargets(fen, from).includes(up)) {
        userMoveRef.current = `${from}${up}`;
        onMove && onMove(from, up);
      }
      setSelected(null);
      return;
    }
    if (up && moveStyle !== 'drag') tap(up); // drag-only: a click doesn't move
  }

  const ordered = orientation === 'w' ? cells : [...cells].reverse();
  const fileLabels = orientation === 'w' ? FILES : [...FILES].reverse();
  const rankLabels = orientation === 'w' ? [8, 7, 6, 5, 4, 3, 2, 1] : [1, 2, 3, 4, 5, 6, 7, 8];
  const hasOverlay = arrows.length || userArrows.length || userCircles.length || drawing;

  return (
    <div className="select-none inline-block">
      <div className="flex">
        <div className="flex flex-col justify-around pr-1 text-gold/80 font-bold text-sm">
          {rankLabels.map((r) => (
            <div key={r} className="h-[12.5%] flex items-center">{r}</div>
          ))}
        </div>

        <div>
          <div
            ref={boardRef}
            className={
              big
                ? 'relative w-[min(92vw,520px)] md:w-[min(86vh,760px)] lg:w-[min(90vh,920px)] xl:w-[min(92vh,1100px)]'
                : 'relative w-[min(86vw,56vh,420px)] md:w-[min(64vh,620px)] lg:w-[min(78vh,780px)] xl:w-[min(82vh,900px)]'
            }
            style={{ touchAction: movableColor ? 'none' : 'auto', containerType: 'inline-size' }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onContextMenu={(e) => e.preventDefault()}
          >
            <div
              className="grid grid-cols-8 rounded-lg overflow-hidden ring-2 ring-edge"
              style={{
                backdropFilter: 'blur(5px) saturate(125%)',
                WebkitBackdropFilter: 'blur(5px) saturate(125%)',
                boxShadow:
                  '0 18px 50px -12px rgba(0,0,0,0.7), 0 0 42px -18px rgb(var(--glow) / 0.32)',
              }}
            >
              {ordered.map((sq) => {
                const isLast = lastMove && (sq.name === lastMove.from || sq.name === lastMove.to);
                const isSel = sq.name === selected;
                const isHi = highlights.includes(sq.name);
                const isTarget = targets.includes(sq.name);
                const isDragging = drag && drag.from === sq.name;
                return (
                  <div
                    key={sq.name}
                    style={{ containerType: 'inline-size', backgroundColor: withAlpha(sq.light ? theme.light : theme.dark, sq.light ? 0.9 : 0.6) }}
                    className={`relative aspect-square flex items-center justify-center ${movableColor ? 'cursor-grab' : ''}`}
                  >
                    {isLast && <div className="absolute inset-0 bg-gold/35 pointer-events-none" />}
                    {isHi && <div className="absolute inset-0 ring-4 ring-inset ring-grass/80 pointer-events-none" />}
                    {isSel && <div className="absolute inset-0 ring-4 ring-inset ring-frost pointer-events-none" />}
                    {sq.piece && !isDragging && (() => {
                      // The piece that just landed slides in from its origin —
                      // but NOT when the user dragged/tapped it there themselves
                      // (it should stay where they dropped it, no re-slide).
                      const isMoved =
                        lastMove &&
                        sq.name === lastMove.to &&
                        userMoveRef.current !== `${lastMove.from}${lastMove.to}`;
                      let slide = {};
                      if (isMoved) {
                        const f = squareToXY(lastMove.from, orientation);
                        const tt = squareToXY(lastMove.to, orientation);
                        slide = { '--slide-dx': `${(f.x - tt.x) * 100}%`, '--slide-dy': `${(f.y - tt.y) * 100}%` };
                      }
                      return (
                        <div
                          key={isMoved ? `mv-${lastMove.from}${lastMove.to}` : 'pc'}
                          className={`absolute inset-0 flex items-center justify-center pointer-events-none${isMoved ? ' piece-slide' : ''}`}
                          style={{ transform: `scale(${set.scale || 1})`, filter: shadowFor(sq.piece.color), ...slide }}
                        >
                          {set.render(sq.piece.color, sq.piece.type)}
                        </div>
                      );
                    })()}
                    {isTarget && !sq.piece && (
                      <div className="absolute w-1/3 h-1/3 rounded-full bg-frost/50 pointer-events-none" />
                    )}
                    {isTarget && sq.piece && (
                      <div className="absolute inset-0 ring-4 ring-inset ring-frost/60 pointer-events-none" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Arrow / circle overlay (coaching + user-drawn) */}
            {hasOverlay && (
              <svg viewBox="0 0 8 8" className="absolute inset-0 w-full h-full pointer-events-none">
                {arrows.map((ar, i) => (
                  <Arrow key={'c' + i} from={ar.from} to={ar.to} orientation={orientation} color={ar.color} />
                ))}
                {userCircles.map((c, i) => {
                  const p = squareToXY(c.square, orientation);
                  return <circle key={'uc' + i} cx={p.x} cy={p.y} r="0.42" fill="none" stroke={c.color} strokeWidth="0.08" opacity="0.85" />;
                })}
                {userArrows.map((a, i) => (
                  <Arrow key={'ua' + i} from={a.from} to={a.to} orientation={orientation} color={a.color} opacity={0.85} />
                ))}
                {drawing && (drawing.to === drawing.from
                  ? (() => { const p = squareToXY(drawing.from, orientation); return <circle cx={p.x} cy={p.y} r="0.42" fill="none" stroke={drawing.color} strokeWidth="0.08" opacity="0.5" />; })()
                  : <Arrow from={drawing.from} to={drawing.to} orientation={orientation} color={drawing.color} opacity={0.5} />)}
              </svg>
            )}

            {drag && (
              <div
                className="absolute pointer-events-none z-10 flex items-center justify-center"
                style={{
                  left: drag.x,
                  top: drag.y,
                  transform: `translate(-50%, -50%) scale(${set.scale || 1})`,
                  width: '13.5cqw',
                  height: '13.5cqw',
                  containerType: 'inline-size',
                  filter: shadowFor(drag.piece.color),
                }}
              >
                {set.render(drag.piece.color, drag.piece.type)}
              </div>
            )}
          </div>

          <div className="grid grid-cols-8 pt-1 text-gold/80 font-bold text-sm">
            {fileLabels.map((f) => (
              <div key={f} className="text-center">{f}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
