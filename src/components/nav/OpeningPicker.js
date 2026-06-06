import React from 'react';
import Segmented from './Segmented';
import { OPENINGS, getFamilies, variationsOf } from '../../data/openings';

// Two-row opening menu: Family (Italian / Black) → Variation (Main line / Fried
// Liver / …). Picking a family jumps to its first variation. The variation row
// only appears when a family has more than one line. This is the first step of
// the Learn-hub catalog.
export default function OpeningPicker({ value, onChange }) {
  const current = OPENINGS.find((o) => o.id === value) || OPENINGS[0];
  const families = getFamilies();
  const variations = variationsOf(current.familyId);

  const pickFamily = (famId) => {
    if (famId === current.familyId) return;
    const first = OPENINGS.find((o) => o.familyId === famId);
    if (first) onChange(first.id);
  };

  return (
    <div className="space-y-2">
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
