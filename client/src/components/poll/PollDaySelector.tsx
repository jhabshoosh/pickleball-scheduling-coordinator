import React from 'react';
import { DayOfWeek, DayDeadlineInfo } from 'shared/types';
import { HEBREW_DAYS, PLAYABLE_DAYS } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface PollDaySelectorProps {
  selectedDays: DayOfWeek[];
  onChange: (days: DayOfWeek[]) => void;
  dayDeadlines?: DayDeadlineInfo[];
}

export function PollDaySelector({ selectedDays, onChange, dayDeadlines }: PollDaySelectorProps) {
  const deadlineMap = new Map(dayDeadlines?.map(d => [d.day, d]) || []);

  const toggle = (day: DayOfWeek) => {
    const info = deadlineMap.get(day);
    if (info && info.status !== 'open') return; // Can't toggle closed/scheduled days

    if (selectedDays.includes(day)) {
      onChange(selectedDays.filter(d => d !== day));
    } else {
      onChange([...selectedDays, day].sort((a, b) => a - b));
    }
  };

  return (
    <div className="grid grid-cols-3 gap-2">
      {PLAYABLE_DAYS.map(day => {
        const info = deadlineMap.get(day);
        const isSelected = selectedDays.includes(day);
        const isClosed = info?.status === 'closed';
        const isScheduled = info?.status === 'scheduled';
        const isLocked = isClosed || isScheduled;

        return (
          <button
            key={day}
            onClick={() => toggle(day)}
            disabled={isLocked}
            className={cn(
              'py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all relative',
              isScheduled
                ? 'border-green-300 bg-green-50 text-green-700 cursor-not-allowed'
                : isClosed
                  ? 'border-border bg-muted text-muted-foreground cursor-not-allowed opacity-60'
                  : isSelected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/30'
            )}
          >
            <span>יום {HEBREW_DAYS[day]}</span>
            {isScheduled && <span className="mr-1">&#10003;</span>}
            {isClosed && <span className="mr-1">&#128274;</span>}
          </button>
        );
      })}
    </div>
  );
}
