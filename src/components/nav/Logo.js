import React from 'react';

// Brand mark. Placeholder uses the existing dragon-knight piece art (on-brand,
// already shipped) inside a gold Fluent badge — a Grok-made dragon mascot can
// later drop into this same <img> slot. Dark dragon for contrast on gold.
const MARK = `${process.env.PUBLIC_URL}/pieces/dragons/bN.png`;

export default function Logo({ compact = false, version }) {
  return (
    <div className="flex items-center gap-2.5 min-w-0">
      <span
        className="grid place-items-center shrink-0"
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: 'linear-gradient(180deg, #f6c544 0%, #e0a92e 100%)',
          boxShadow: '0 6px 16px -8px rgba(246,197,68,0.6), 0 1px 0 rgba(255,255,255,0.25) inset',
        }}
      >
        <img
          src={MARK}
          alt=""
          draggable={false}
          className="w-8 h-8 object-contain"
          style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.25))' }}
        />
      </span>
      {!compact && (
        <div className="leading-tight min-w-0">
          <div className="font-round font-extrabold text-frost text-lg md:text-xl truncate">
            Chess Cadet
          </div>
          {version && (
            <div className="text-[10px] font-bold text-frost-dim/70 -mt-0.5">v{version}</div>
          )}
        </div>
      )}
    </div>
  );
}
