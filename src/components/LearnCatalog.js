import React from 'react';

// The Learn hub — "what do you want to learn?". Tapping Learn lands here so the
// app is a catalog of subjects (Notation, Openings, …) rather than dropping
// straight into one lesson. New subjects slot in as more cards.
const SUBJECTS = [
  { id: 'notation', icon: '📝', title: 'Notation', blurb: 'Read & write chess moves' },
  { id: 'openings', icon: '⚔️', title: 'Openings', blurb: 'Learn opening lines & traps' },
  { id: 'tactics', icon: '🎯', title: 'Tactics', blurb: 'Forks, pins & skewers', soon: true },
  { id: 'basics', icon: '♟️', title: 'How to Play', blurb: 'How the pieces move', soon: true },
];

export default function LearnCatalog({ onPick }) {
  return (
    <div className="w-full max-w-md md:max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-6">
        <div className="text-2xl md:text-3xl font-extrabold text-frost font-round">What do you want to learn?</div>
        <div className="text-sm md:text-base text-frost-dim mt-1.5">Pick a topic to start.</div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {SUBJECTS.map((s) => (
          <button
            key={s.id}
            disabled={s.soon}
            onClick={() => !s.soon && onPick(s.id)}
            className={`cc-card p-4 flex items-center gap-3 text-left ${s.soon ? 'opacity-50 cursor-default' : 'cc-reveal'}`}
          >
            <span className="text-3xl shrink-0">{s.icon}</span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-2 font-extrabold text-frost text-lg">
                {s.title}
                {s.soon && (
                  <span className="text-[10px] uppercase tracking-wide text-gold/70 font-bold bg-gold/10 ring-1 ring-gold/30 rounded-full px-2 py-0.5">
                    Soon
                  </span>
                )}
              </span>
              <span className="block text-sm text-frost-dim">{s.blurb}</span>
            </span>
            {!s.soon && <span className="text-gold text-xl shrink-0">▶</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
