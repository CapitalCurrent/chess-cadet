import React from 'react';
import Segmented from './Segmented';
import { OPENINGS, getSides, familiesOf, variationsOf } from '../../data/openings';

// Three-tier opening menu (the Learn-hub):
//   Side    ♔ White (1.e4) · ♚ Black
//   Opening Italian · Scandinavian · Mixed   (within the side)
//   Variation Main line · Fried Liver        (within the opening; only if >1)
// Picking a higher tier jumps to the first entry beneath it. Tiers with a single
// option are hidden to keep it tidy.
export default function OpeningPicker({ value, onChange }) {
  const current = OPENINGS.find((o) => o.id === value) || OPENINGS[0];
  const sides = getSides();
  const families = familiesOf(current.student);
  const variations = variationsOf(current.familyId);

  const pickSide = (side) => {
    if (side === current.student) return;
    const first = OPENINGS.find((o) => o.student === side);
    if (first) onChange(first.id);
  };
  const pickFamily = (famId) => {
    if (famId === current.familyId) return;
    const first = OPENINGS.find((o) => o.familyId === famId);
    if (first) onChange(first.id);
  };

  return (
    <div className="space-y-2">
      <Segmented
        options={sides.map((s) => ({
          id: s.id,
          label: s.label,
          icon: <span className="text-base leading-none">{s.icon}</span>,
        }))}
        value={current.student}
        onChange={pickSide}
        size="sm"
      />
      {families.length > 1 && (
        <Segmented
          options={families.map((f) => ({
            id: f.id,
            label: f.label,
            icon: <span className="text-base leading-none">{f.icon}</span>,
          }))}
          value={current.familyId}
          onChange={pickFamily}
          size="sm"
        />
      )}
      {variations.length > 1 && (
        <Segmented
          options={variations.map((v) => ({ id: v.id, label: v.variation }))}
          value={value}
          onChange={onChange}
          size="sm"
        />
      )}
    </div>
  );
}
