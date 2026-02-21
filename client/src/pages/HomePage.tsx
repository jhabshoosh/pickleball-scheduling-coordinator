import React from 'react';
import { useCurrentPoll } from '@/hooks/useCurrentPoll';
import { useVote, usePollVotes } from '@/hooks/useVote';
import { VoteForm } from '@/components/poll/VoteForm';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Player, DayDeadlineInfo } from 'shared/types';
import { HEBREW_DAYS } from '@/lib/constants';

interface HomePageProps {
  player: Player;
}

export function HomePage({ player }: HomePageProps) {
  const { data: poll, isLoading: pollLoading, error: pollError } = useCurrentPoll();
  const { vote, submitVote, deleteVote, isSubmitting } = useVote(poll?.id, player.id);
  const { data: allVotes } = usePollVotes(poll?.id);

  if (pollLoading) return <p className="text-center text-muted-foreground py-8">טוען...</p>;

  if (pollError || !poll) {
    return (
      <Card>
        <CardContent className="py-8 text-center">
          <p className="text-muted-foreground">אין סקר פעיל כרגע</p>
          <p className="text-sm text-muted-foreground mt-2">המתן ליצירת סקר חדש</p>
        </CardContent>
      </Card>
    );
  }

  const dayDeadlines: DayDeadlineInfo[] | undefined = (poll as any).day_deadlines;
  const openDays = dayDeadlines?.filter(d => d.status === 'open') || [];
  const nextDeadline = openDays.length > 0
    ? openDays.reduce((earliest, d) =>
        new Date(d.deadline) < new Date(earliest.deadline) ? d : earliest
      )
    : null;

  const isOpen = poll.status === 'open' && openDays.length > 0;

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold">שבוע {poll.week_start}</p>
              {nextDeadline ? (
                <p className="text-sm text-muted-foreground">
                  דדליין הבא (יום {HEBREW_DAYS[nextDeadline.day]}): {new Date(nextDeadline.deadline).toLocaleDateString('he-IL')}{' '}
                  {new Date(nextDeadline.deadline).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">כל הימים נסגרו</p>
              )}
              {dayDeadlines && (
                <p className="text-xs text-muted-foreground mt-1">
                  {openDays.length} ימים פתוחים
                  {poll.scheduled_days.length > 0 && ` | ${poll.scheduled_days.length} ימים תוזמנו`}
                </p>
              )}
            </div>
            <Badge variant={isOpen ? 'default' : 'secondary'}>
              {isOpen ? 'פתוח' : 'סגור'}
            </Badge>
          </div>
          {allVotes && (
            <p className="text-xs text-muted-foreground mt-2">
              {allVotes.length} הצביעו: {allVotes.map((v: any) => v.player_name).join(', ')}
            </p>
          )}
        </CardContent>
      </Card>

      <VoteForm
        poll={poll}
        playerId={player.id}
        existingVote={vote}
        onSubmit={submitVote}
        onDelete={vote ? deleteVote : undefined}
        isSubmitting={isSubmitting}
        dayDeadlines={dayDeadlines}
      />
    </div>
  );
}
