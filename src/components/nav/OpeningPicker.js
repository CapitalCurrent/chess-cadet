import React from 'react';
import Segmented from './Segmented';
import { OPENINGS, getSides, familiesOf, variationsOf, isUnlocked } from '../../data/openings';
import { starsFor } from '../../state/progress';

// Three-tier opening menu (the Learn-hub): Side → Opening → Variation.
// Mastery stars show on unlocked courses; locked courses show 🔒 and can't be
// picked until their prerequisites are mastered (3★). Unlocked content stays
// available forever — gating only hides what's still ahead.
export default function OpeningPicker({ value, onChange, progress }) {
  const current = OPENINGS.find((o) => o.id === value) || OPENINGS[0];
  const sides = getSides();
  const families = familiesOf(current.student);
  const variations = variationsOf(current.familyId);

  const courseOf = (id) => OPENINGS.find((o) => o.id === id);
  const courseUnlocked = (id) => isUnlocked(progress, courseOf(id));
  const familyUnlocked = (famId) => variationsOf(famId).some((v) => isUnlocked(progress, v));
  const sideUnlocked = (sideId) => familiesOf(sideId).some((f) => familyUnlocked(f.id));

  const stars = (id) => {
    const n = starsFor(progress, id);
    return n > 0 ? <span className="ml-1 opacity-80">{'★'.repeat(n)}</span> : null;
  };
  const lockLabel = (txt) => <span>🔒 {txt}</span>;

  const pickSide = (side) => {
    if (side === current.student) return;
    const first = OPENINGS.find((o) => o.student === side && isUnlocked(progress, o));
    if (first) onChange(first.id);
  };
  const pickFamily = (famId) => {
    if (famId === current.familyId) return;
    const first = OPENINGS.find((o) => o.familyId === famId && isUnlocked(progress, o));
    if (first) onChange(first.id);
  };

  return (
    <div className="space-y-2">
      <Segmented
        options={sides.map((s) => {
          const locked = !sideUnlocked(s.id);
          return {
            id: s.id,
            label: locked ? lockLabel(s.label) : s.label,
            icon: <span className="text-base leading-none">{s.icon}</span>,
            disabled: locked,
          };
        })}
        value={current.student}
        onChange={pickSide}
        size="sm"
      />
      {families.length > 1 && (
        <Segmented
          options={families.map((f) => {
            const locked = !familyUnlocked(f.id);
            const vars = variationsOf(f.id);
            const label = vars.length === 1 ? (
              <span>{f.label}{stars(vars[0].id)}</span>
            ) : (
              f.label
            );
            return {
              id: f.id,
              label: locked ? lockLabel(f.label) : label,
              icon: <span className="text-base leading-none">{f.icon}</span>,
              disabled: locked,
            };
          })}
          value={current.familyId}
          onChange={pickFamily}
          size="sm"
        />
      )}
      {variations.length > 1 && (
        <Segmented
          options={variations.map((v) => {
            const locked = !courseUnlocked(v.id);
            return {
              id: v.id,
              label: locked ? lockLabel(v.variation) : (
                <span>{v.variation}{stars(v.id)}</span>
              ),
              disabled: locked,
            };
          })}
          value={value}
          onChange={onChange}
          size="sm"
        />
      )}
    </div>
  );
}
