import React from 'react';
import { DayOfWeek } from 'shared/types';
import { HEBREW_DAYS, PLAYABLE_DAYS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PollDaySelectorProps {
  selectedDays: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
}

export function PollDaySelector({ selectedDays, onChange }: PollDaySelectorProps) {
  const toggle = (day: DayOfWeek) => {
    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter(d => d !== day));
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {PLAYABLE_DAYS.map(day => (
        <button
          key={day}
          onClick={() => toggle(day)}
          className={cn(
            'py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all',
            selectedDays.includes(day)
              ? 'border-primary bg-primary/10 text-primary'
              : 'border-border hover:border-primary/30'
          )}
        >
          יום {HEBREW_DAYS[day]}
        </button>
      ))}
    </div>
  );
}
