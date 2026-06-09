import React, { useState } from 'react';
import { CHARGES, TINTS } from '../state/profiles';
import CoatOfArms from './CoatOfArms';

// Shared create-a-player form: name + crest charge + shield tint, with a live
// coat-of-arms preview. Used by the first-run gate and the header "Add player".
export function ProfileForm({ onSubmit, onCancel, submitLabel = "Let's go!", autoFocus = true }) {
  const [name, setName] = useState('');
  const [charge, setCharge] = useState(CHARGES[0].id);
  const [tint, setTint] = useState(TINTS[0].id);
  const canSubmit = name.trim().length > 0;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit(name, charge, tint);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Live crest preview */}
      <div className="flex items-center justify-center gap-3">
        <CoatOfArms charge={charge} tint={tint} size={56} />
        <span className="text-lg font-extrabold text-frost truncate max-w-[55vw]">
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
        <label className="block text-xs font-bold text-frost-dim mb-1.5">Pick your crest</label>
        <div className="grid grid-cols-4 gap-2">
          {CHARGES.map((c) => (
            <button
              type="button"
              key={c.id}
              onClick={() => setCharge(c.id)}
              className="grid place-items-center rounded-cc-lg py-1.5 transition-colors"
              style={{
                background: charge === c.id ? 'rgb(var(--gold) / 0.16)' : 'rgba(255,255,255,0.05)',
                outline: charge === c.id ? '2px solid rgb(var(--gold))' : '1px solid var(--edge-soft)',
              }}
              aria-label={c.label}
            >
              <CoatOfArms charge={c.id} tint={tint} size={30} glow={false} />
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-bold text-frost-dim mb-1.5">Pick your metal</label>
        <div className="grid grid-cols-8 gap-1.5">
          {TINTS.map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setTint(t.id)}
              className="rounded-full transition-transform"
              style={{
                aspectRatio: '1',
                background: `linear-gradient(180deg, ${t.light}, ${t.dark})`,
                transform: tint === t.id ? 'scale(1.12)' : 'scale(1)',
                outline: tint === t.id ? '2px solid rgb(var(--gold))' : '1px solid rgba(255,255,255,0.15)',
                outlineOffset: 1,
              }}
              aria-label={t.name}
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
          <div className="relative mx-auto w-fit animate-bob">
            <CoatOfArms charge="knight" tint="onyx" size={62} />
          </div>
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
                  <CoatOfArms charge={p.charge || p.avatar} tint={p.tint || p.color} size={40} />
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
