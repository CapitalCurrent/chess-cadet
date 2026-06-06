import React from 'react';

// Mobile-only sticky bottom navigation for the primary modes. Hidden on desktop
// (the segmented top bar takes over there). `tabs` = [{ id, label, icon }].
export default function BottomTabBar({ tabs, value, onChange }) {
  return (
    <nav role="tablist" className="cc-tabbar flex md:hidden">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={t.id === value}
          onClick={() => onChange(t.id)}
          className="cc-tab"
        >
          <span>{t.icon}</span>
          <span>{t.label}</span>
        </button>
      ))}
    </nav>
  );
}
