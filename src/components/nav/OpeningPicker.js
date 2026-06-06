import React from 'react';
import Segmented from './Segmented';
import { OPENINGS, getSides, familiesOf, variationsOf } from '../../data/openings';
import { starsFor } from '../../state/progress';

// Three-tier opening menu (the Learn-hub):
//   Side    ♔ White (1.e4) · ♚ Black
//   Opening Italian · Scandinavian · Mixed   (within the side)
//   Variation Main line · Fried Liver        (within the opening; only if >1)
// Picking a higher tier jumps to the first entry beneath it. Tiers with a single
// option are hidden to keep it tidy.
export default function OpeningPicker({ value, onChange, progress }) {
  const current = OPENINGS.find((o) => o.id === value) || OPENINGS[0];
  const sides = getSides();
  const families = familiesOf(current.student);
  const variations = variationsOf(current.familyId);

  // Mastery stars on a course (inherits text color so it reads on the gold
  // selected pill and the dark idle ones alike).
  const stars = (id) => {
    const n = starsFor(progress, id);
    return n > 0 ? <span className="ml-1 opacity-80">{'★'.repeat(n)}</span> : null;
  };
  const familyLabel = (f) => {
    const vars = variationsOf(f.id);
    return vars.length === 1 ? (
      <span>{f.label}{stars(vars[0].id)}</span>
    ) : (
      f.label
    );
  };

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
            label: familyLabel(f),
            icon: <span className="text-base leading-none">{f.icon}</span>,
          }))}
          value={current.familyId}
          onChange={pickFamily}
          size="sm"
        />
      )}
      {variations.length > 1 && (
        <Segmented
          options={variations.map((v) => ({
            id: v.id,
            label: (
              <span>
                {v.variation}
                {stars(v.id)}
              </span>
            ),
          }))}
          value={value}
          onChange={onChange}
          size="sm"
        />
      )}
    </div>
  );
}
