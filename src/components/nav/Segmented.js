import React from 'react';

// Fluent-style segmented control. Replaces rows of separate pill buttons with a
// single track and one highlighted segment. `options` = [{ id, label, icon? }].
export default function Segmented({ options, value, onChange, className = '', size = 'md' }) {
  return (
    <div role="tablist" className={`cc-seg w-full ${className}`}>
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={o.id === value}
          disabled={o.disabled}
          onClick={() => !o.disabled && onChange(o.id)}
          className={`cc-seg-item ${size === 'sm' ? 'text-sm py-1.5' : 'md:text-lg'} ${
            o.disabled ? 'opacity-40 cursor-not-allowed' : ''
          }`}
        >
          {o.icon && <span className="shrink-0">{o.icon}</span>}
          <span className="truncate">{o.label}</span>
        </button>
      ))}
    </div>
  );
}
