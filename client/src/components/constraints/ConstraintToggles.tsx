import React from 'react';
import { Switch } from '@/components/ui/switch';
import { DayOfWeek, Constraint, MutualExclusionConstraint } from 'shared/types';
import { HEBREW_DAYS } from '@/lib/constants';

interface ConstraintTogglesProps {
  selectedDays: DayOfWeek[];
  constraints: Constraint[];
  onChange: (constraints: Constraint[]) => void;
}

export function ConstraintToggles({ selectedDays, constraints, onChange }: ConstraintTogglesProps) {
  const hasNoConsecutive = constraints.some(c => c.type === 'no_consecutive');

  const toggleNoConsecutive = (checked: boolean) => {
    if (checked) {
      onChange([...constraints, { type: 'no_consecutive' }]);
    } else {
      onChange(constraints.filter(c => c.type !== 'no_consecutive'));
    }
  };

  const hasMutualExclusion = (dayA: DayOfWeek, dayB: DayOfWeek) => {
    return constraints.some(c =>
      c.type === 'mutual_exclusion' &&
      ((c.days[0] === dayA && c.days[1] === dayB) || (c.days[0] === dayB && c.days[1] === dayA))
    );
  };

  const toggleMutualExclusion = (dayA: DayOfWeek, dayB: DayOfWeek, checked: boolean) => {
    if (checked) {
      onChange([...constraints, { type: 'mutual_exclusion', days: [dayA, dayB] }]);
    } else {
      onChange(constraints.filter(c => {
        if (c.type !== 'mutual_exclusion') return true;
        return !((c.days[0] === dayA && c.days[1] === dayB) || (c.days[0] === dayB && c.days[1] === dayA));
      }));
    }
  };

  // Generate pairs
  const pairs: [DayOfWeek, DayOfWeek][] = [];
  const sorted = [...selectedDays].sort((a, b) => a - b);
  for (let i = 0; i < sorted.length; i++) {
    for (let j = i + 1; j < sorted.length; j++) {
      pairs.push([sorted[i], sorted[j]]);
    }
  }

  // Check if there are any consecutive days
  const hasConsecutiveDays = sorted.some((d, i) =>
    i < sorted.length - 1 && sorted[i + 1] - d === 1
  );

  return (
    <div className="space-y-4">
      {hasConsecutiveDays && (
        <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
          <span className="text-sm font-medium">לא לשחק ימים רצופים</span>
          <Switch checked={hasNoConsecutive} onCheckedChange={toggleNoConsecutive} />
        </div>
      )}

      {pairs.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">אחד מהשניים (לא שניהם):</p>
          {pairs.map(([a, b]) => (
            <div key={`${a}-${b}`} className="flex items-center justify-between p-3 rounded-lg bg-secondary/50">
              <span className="text-sm">
                {HEBREW_DAYS[a]} או {HEBREW_DAYS[b]} (לא שניהם)
              </span>
              <Switch
                checked={hasMutualExclusion(a, b)}
                onCheckedChange={(checked) => toggleMutualExclusion(a, b, checked)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
