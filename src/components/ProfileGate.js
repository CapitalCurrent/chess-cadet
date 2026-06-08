import React, { useState } from 'react';
import { AVATARS, COLORS } from '../state/profiles';

// Shared create-a-player form: name + avatar + color. Used by the first-run gate
// and by the header switcher's "Add player" flow.
export function ProfileForm({ onSubmit, onCancel, submitLabel = "Let's go!", autoFocus = true }) {
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [color, setColor] = useState(COLORS[0]);
  const canSubmit = name.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(name, avatar, color);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Live preview chip */}
      <div className="flex items-center justify-center gap-3">
        <span
          className="grid place-items-center rounded-full text-2xl shrink-0"
          style={{ width: 52, height: 52, background: color, boxShadow: '0 8px 22px -8px rgba(0,0,0,0.6)' }}
        >
          {avatar}
        </span>
        <span className="text-lg font-extrabold text-frost truncate max-w-[60vw]">
          {name.trim() || 'Your name'}
        </span>
      </div>

      <div>
        <label className="block text-xs font-bold text-frost-dim mb-1.5">Your name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={20}
          autoFocus={autoFocus}
          placeholder="Type your name"
          className="w-full rounded-cc-lg bg-white/5 border border-[var(--edge-soft)] px-3 py-2.5 text-frost text-base outline-none focus:border-gold"
        />
      </div>

      <div>
        <label className="block text-xs font-bold text-frost-dim mb-1.5">Pick a buddy</label>
        <div className="grid grid-cols-6 gap-2">
          {AVATARS.map((a) => (
            <button
              type="button"
              key={a}
              onClick={() => setAvatar(a)}
              className="grid place-items-center rounded-cc-lg text-xl py-1.5 transition-colors"
              style={{
                background: avatar === a ? color : 'rgba(255,255,255,0.05)',
                outline: avatar === a ? '2px solid rgba(255,255,255,0.6)' : 'none',
              }}
            >
              {a}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-frost-dim mb-1.5">Pick a color</label>
        <div className="flex gap-2.5">
          {COLORS.map((c) => (
            <button
              type="button"
              key={c}
              onClick={() => setColor(c)}
              className="rounded-full transition-transform"
              style={{
                width: 30,
                height: 30,
                background: c,
                transform: color === c ? 'scale(1.15)' : 'scale(1)',
                outline: color === c ? '2px solid rgba(255,255,255,0.85)' : 'none',
                outlineOffset: 2,
              }}
              aria-label={`color ${c}`}
            />
          ))}
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        {onCancel && (
          <button type="button" onClick={onCancel} className="cc-btn cc-btn-secondary flex-1 py-2.5 text-sm">
            Cancel
          </button>
        )}
        <button
          type="submit"
          disabled={!canSubmit}
          className="cc-btn cc-btn-grass flex-1 py-2.5 text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

// Blocking landing shown when no player is active: first run = create one;
// returning with players but none selected = "Who's playing?" picker.
export default function ProfileGate({ profiles, onCreate, onSelect }) {
  const [adding, setAdding] = useState(profiles.length === 0);

  return (
    <div className="min-h-screen text-frost grid place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Brand hero */}
        <div className="relative text-center mb-6">
          <div
            className="pointer-events-none absolute left-1/2 -translate-x-1/2 -top-6 w-56 h-56 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(246,197,68,0.16), transparent)' }}
          />
          <img
            src={`${process.env.PUBLIC_URL}/logo512.png`}
            alt="Chess Lair"
            className="relative mx-auto w-16 h-16 rounded-2xl animate-bob"
            style={{ boxShadow: '0 0 0 1px rgba(246,197,68,0.35), 0 18px 44px -12px rgba(246,197,68,0.5)' }}
            draggable={false}
          />
          <div className="relative mt-3 text-2xl font-extrabold text-frost font-round">
            {adding && profiles.length === 0 ? 'Welcome to Chess Lair!' : "Who's playing?"}
          </div>
          <div className="relative text-sm text-frost-dim mt-1">
            {adding && profiles.length === 0
              ? 'Make a player so your progress is saved.'
              : 'Pick your player to keep your own progress.'}
          </div>
        </div>

        <div className="cc-card p-4 md:p-5 animate-pop">
          {adding ? (
            <ProfileForm
              onSubmit={(name, avatar, color) => onCreate(name, avatar, color)}
              onCancel={profiles.length > 0 ? () => setAdding(false) : undefined}
              submitLabel="Start playing!"
            />
          ) : (
            <div className="space-y-2.5">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelect(p.id)}
                  className="cc-card cc-reveal w-full p-3 flex items-center gap-3 text-left"
                >
                  <span
                    className="grid place-items-center rounded-full text-xl shrink-0"
                    style={{ width: 44, height: 44, background: p.color }}
                  >
                    {p.avatar}
                  </span>
                  <span className="font-bold text-frost text-base flex-1 truncate">{p.name}</span>
                  <span className="text-gold text-xl">▶</span>
                </button>
              ))}
              <button
                onClick={() => setAdding(true)}
                className="w-full py-2.5 text-sm font-bold text-frost-dim hover:text-frost rounded-cc-lg border border-dashed border-[var(--edge-soft)] hover:bg-white/5 transition-colors"
              >
                + Add player
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
