import React, { useState } from 'react';
import { ProfileForm } from '../ProfileGate';
import CoatOfArms from '../CoatOfArms';

// Header player chip + dropdown: switch player, add, rename, or delete. The
// active player's avatar/name is always visible so kids know whose stars they're
// earning. Switching swaps in that player's progress (handled upstream).
export default function ProfileMenu({ profiles, activeProfile, onSelect, onCreate, onUpdate, onDelete }) {
  const [open, setOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  if (!activeProfile) return null;

  const close = () => {
    setOpen(false);
    setAdding(false);
    setEditingId(null);
    setConfirmDeleteId(null);
  };

  const pick = (id) => {
    if (id !== activeProfile.id) onSelect(id);
    close();
  };

  const startRename = (p) => {
    setEditingId(p.id);
    setEditName(p.name);
    setConfirmDeleteId(null);
  };
  const saveRename = () => {
    if (editName.trim()) onUpdate(editingId, { name: editName });
    setEditingId(null);
  };

  return (
    <div className="relative">
      <button
        onClick={() => (open ? close() : setOpen(true))}
        className="flex items-center gap-2 rounded-full pl-1 pr-2.5 py-1 hover:bg-white/5 transition-colors"
        title={`Player: ${activeProfile.name}`}
      >
        <CoatOfArms charge={activeProfile.charge || activeProfile.avatar} tint={activeProfile.tint || activeProfile.color} size={26} glow={false} />
        <span className="hidden sm:block text-sm font-bold text-frost max-w-[10ch] truncate">
          {activeProfile.name}
        </span>
      </button>

      {open && (
        <>
          {/* click-catcher */}
          <div className="fixed inset-0 z-30" onClick={close} />
          <div className="absolute right-0 z-40 mt-2 w-72 cc-menu p-3 origin-top-right animate-pop">
            {adding ? (
              <ProfileForm
                onSubmit={(name, avatar, color) => {
                  onCreate(name, avatar, color);
                  close();
                }}
                onCancel={() => setAdding(false)}
                submitLabel="Add player"
              />
            ) : (
              <>
                <div className="text-xs font-bold text-frost-dim px-1 mb-2">Players</div>
                <div className="space-y-1.5">
                  {profiles.map((p) => {
                    const active = p.id === activeProfile.id;
                    if (editingId === p.id) {
                      return (
                        <div key={p.id} className="flex items-center gap-2 p-1.5">
                          <input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            maxLength={20}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') saveRename();
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            className="flex-1 min-w-0 rounded-cc bg-white/5 border border-[var(--edge-soft)] px-2 py-1 text-frost text-sm outline-none focus:border-gold"
                          />
                          <button onClick={saveRename} className="cc-icon-btn text-grass" title="Save">✓</button>
                          <button onClick={() => setEditingId(null)} className="cc-icon-btn" title="Cancel">✕</button>
                        </div>
                      );
                    }
                    if (confirmDeleteId === p.id) {
                      return (
                        <div key={p.id} className="rounded-cc-lg bg-white/5 p-2 text-center">
                          <div className="text-xs text-frost mb-1.5">Delete <b>{p.name}</b> and their progress?</div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="cc-btn cc-btn-secondary flex-1 py-1.5 text-xs"
                            >
                              Keep
                            </button>
                            <button
                              onClick={() => { onDelete(p.id); setConfirmDeleteId(null); }}
                              className="cc-btn flex-1 py-1.5 text-xs"
                              style={{ background: '#e0564a', color: '#fff' }}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={p.id}
                        className={`flex items-center gap-2.5 rounded-cc-lg p-1.5 ${active ? 'bg-white/10' : 'hover:bg-white/5'}`}
                      >
                        <button onClick={() => pick(p.id)} className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
                          <CoatOfArms charge={p.charge || p.avatar} tint={p.tint || p.color} size={30} glow={false} />
                          <span className="font-bold text-frost text-sm truncate flex-1">{p.name}</span>
                          {active && <span className="text-grass text-sm shrink-0">✓</span>}
                        </button>
                        <button onClick={() => startRename(p)} className="cc-icon-btn shrink-0" title="Rename">✏️</button>
                        {profiles.length > 1 && (
                          <button onClick={() => setConfirmDeleteId(p.id)} className="cc-icon-btn shrink-0" title="Delete">🗑️</button>
                        )}
                      </div>
                    );
                  })}
                </div>
                <button
                  onClick={() => setAdding(true)}
                  className="w-full mt-2 py-2 text-sm font-bold text-frost-dim hover:text-frost rounded-cc-lg border border-dashed border-[var(--edge-soft)] hover:bg-white/5 transition-colors"
                >
                  + Add player
                </button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
