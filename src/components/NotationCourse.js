import React, { useState } from 'react';
import NotationSquares from './NotationSquares';
import NotationWrite from './NotationWrite';

// The Notation subject — a small course with its own lessons. Foundations first
// (find the square = coordinates), then writing whole moves.
const LESSONS = [
  { id: 'squares', icon: '🧭', title: 'Find the Square', blurb: 'Files a–h and ranks 1–8 — tap the right square.' },
  { id: 'write', icon: '✍️', title: 'Write the Move', blurb: 'Type moves in notation: pieces, x, +, #, =, O-O.' },
];

export default function NotationCourse({ pieceSet, boardTheme, moveStyle, focusBoard, onBack }) {
  const [lesson, setLesson] = useState(null);

  if (lesson === 'squares') return <NotationSquares boardTheme={boardTheme} onBack={() => setLesson(null)} />;
  if (lesson === 'write')
    return (
      <NotationWrite pieceSet={pieceSet} boardTheme={boardTheme} moveStyle={moveStyle} focusBoard={focusBoard} onBack={() => setLesson(null)} />
    );

  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-6">
      <button onClick={onBack} className="cc-btn cc-btn-ghost px-2 py-1 text-sm mb-2">← Lessons</button>
      <div className="text-center mb-5">
        <div className="text-2xl md:text-3xl font-extrabold text-frost font-round">📝 Notation</div>
        <div className="text-sm md:text-base text-frost-dim mt-1.5">Learn to read and write chess moves.</div>
      </div>
      <div className="space-y-3">
        {LESSONS.map((l) => (
          <button key={l.id} onClick={() => setLesson(l.id)} className="cc-card cc-reveal w-full p-4 flex items-center gap-3 text-left">
            <span className="text-3xl shrink-0">{l.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="block font-extrabold text-frost text-lg">{l.title}</span>
              <span className="block text-sm text-frost-dim">{l.blurb}</span>
            </span>
            <span className="text-gold text-xl shrink-0">▶</span>
          </button>
        ))}
      </div>
    </div>
  );
}
