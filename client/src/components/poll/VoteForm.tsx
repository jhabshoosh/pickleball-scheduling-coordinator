import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { PollDaySelector } from './PollDaySelector';
import { PreferenceRanker } from './PreferenceRanker';
import { SessionLimits } from './SessionLimits';
import { ConstraintToggles } from '@/components/constraints/ConstraintToggles';
import { Poll, DayOfWeek, DayPreference, Constraint, Vote, DayDeadlineInfo } from 'shared/types';

interface VoteFormProps {
  poll: Poll;
  playerId: number;
  existingVote?: Vote | null;
  onSubmit: (data: any) => Promise<void>;
  onDelete?: () => Promise<void>;
  isSubmitting?: boolean;
  dayDeadlines?: DayDeadlineInfo[];
}

export function VoteForm({ poll, playerId, existingVote, onSubmit, onDelete, isSubmitting, dayDeadlines }: VoteFormProps) {
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>(existingVote?.available_days || []);
  const [preferences, setPreferences] = useState<DayPreference[]>(existingVote?.day_preferences || []);
  const [minSessions, setMinSessions] = useState(existingVote?.min_sessions || 1);
  const [maxSessions, setMaxSessions] = useState(existingVote?.max_sessions || 7);
  const [constraints, setConstraints] = useState<Constraint[]>(existingVote?.constraints || []);
  const [error, setError] = useState('');

  const openDays = dayDeadlines?.filter(d => d.status === 'open').map(d => d.day) || [];
  const anyDaysOpen = openDays.length > 0;

  // Update preferences when days change
  useEffect(() => {
    setPreferences(prev => {
      const existing = new Map(prev.map(p => [p.day, p.rank]));
      const newPrefs: DayPreference[] = selectedDays.map((day, i) => ({
        day,
        rank: existing.get(day) || i + 1,
      }));
      // Re-normalize ranks
      newPrefs.sort((a, b) => a.rank - b.rank);
      return newPrefs.map((p, i) => ({ ...p, rank: i + 1 }));
    });
    // Remove constraints referencing deselected days
    setConstraints(prev => prev.filter(c => {
      if (c.type === 'mutual_exclusion') {
        return selectedDays.includes(c.days[0]) && selectedDays.includes(c.days[1]);
      }
      return true;
    }));
  }, [selectedDays]);

  const handleSubmit = async () => {
    if (selectedDays.length === 0) {
      setError('נא לבחור לפחות יום אחד');
      return;
    }
    setError('');
    await onSubmit({
      poll_id: poll.id,
      player_id: playerId,
      available_days: selectedDays,
      day_preferences: preferences,
      min_sessions: minSessions,
      max_sessions: maxSessions,
      constraints,
    });
  };

  // If no days are open at all, show closed message
  if (dayDeadlines && !anyDaysOpen) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">ההצבעה נסגרה לכל הימים</p>
          {existingVote && (
            <p className="text-sm text-primary mt-2">ההצבעה שלך נשמרה</p>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fallback: check legacy single deadline
  if (!dayDeadlines) {
    const isDeadlinePassed = new Date() > new Date(poll.voting_deadline);
    if (isDeadlinePassed) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">ההצבעה נסגרה</p>
            {existingVote && (
              <p className="text-sm text-primary mt-2">ההצבעה שלך נשמרה</p>
            )}
          </CardContent>
        </Card>
      );
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>באילו ימים אפשר לשחק?</CardTitle>
        </CardHeader>
        <CardContent>
          <PollDaySelector
            selectedDays={selectedDays}
            onChange={setSelectedDays}
            dayDeadlines={dayDeadlines}
          />
        </CardContent>
      </Card>

      {selectedDays.length > 0 && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>סדר עדיפות</CardTitle>
            </CardHeader>
            <CardContent>
              <PreferenceRanker
                preferences={preferences}
                onChange={setPreferences}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>מספר משחקים</CardTitle>
            </CardHeader>
            <CardContent>
              <SessionLimits
                min={minSessions}
                max={maxSessions}
                maxPossible={selectedDays.length}
                onMinChange={setMinSessions}
                onMaxChange={setMaxSessions}
              />
            </CardContent>
          </Card>

          {selectedDays.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle>העדפות</CardTitle>
              </CardHeader>
              <CardContent>
                <ConstraintToggles
                  selectedDays={selectedDays}
                  constraints={constraints}
                  onChange={setConstraints}
                />
              </CardContent>
            </Card>
          )}
        </>
      )}

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex gap-2">
        <Button
          className="flex-1"
          onClick={handleSubmit}
          disabled={isSubmitting || selectedDays.length === 0}
        >
          {isSubmitting ? 'שומר...' : existingVote ? 'עדכון הצבעה' : 'שליחת הצבעה'}
        </Button>
        {existingVote && onDelete && (
          <Button variant="destructive" onClick={onDelete}>
            מחיקה
          </Button>
        )}
      </div>
    </div>
  );
}
