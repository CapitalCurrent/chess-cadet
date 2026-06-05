import React from 'react';

export default function RewardBar({ progress }) {
  const { gems, streak, bestStreak } = progress;
  return (
    <div className="flex items-center justify-center gap-3 text-sm font-bold">
      <Badge icon="💎" value={gems} label="gems" color="text-frost" />
      <Badge icon="🔥" value={streak} label="streak" color="text-coral" />
      <Badge icon="🏆" value={bestStreak} label="best" color="text-gold" />
    </div>
  );
}

function Badge({ icon, value, label, color }) {
  return (
    <div className="flex items-center gap-1 bg-surface/80 rounded-full px-3 py-1 ring-1 ring-edge">
      <span className="text-base">{icon}</span>
      <span className={color}>{value}</span>
      <span className="text-[10px] text-gold/50 uppercase tracking-wide">{label}</span>
    </div>
  );
}
