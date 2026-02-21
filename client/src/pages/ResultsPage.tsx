import React from 'react';
import { useCurrentPoll } from '@/hooks/useCurrentPoll';
import { ScheduleResults } from '@/components/schedule/ScheduleResults';
import { Card, CardContent } from '@/components/ui/card';

export function ResultsPage() {
  const { data: poll, isLoading } = useCurrentPoll();

  if (isLoading) return <p className="text-center text-muted-foreground py-8">טוען...</p>;

  if (!poll) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          אין סקר פעיל
        </CardContent>
      </Card>
    );
  }

  // Show results as soon as any days have been scheduled
  const hasScheduledDays = poll.scheduled_days && poll.scheduled_days.length > 0;

  if (poll.status === 'open' && !hasScheduledDays) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          ההצבעה עדיין פתוחה - התוצאות יופיעו לאחר חישוב הסידור
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">תוצאות - שבוע {poll.week_start}</h2>
      {poll.status === 'open' && hasScheduledDays && (
        <Card>
          <CardContent className="py-3 text-center text-sm text-muted-foreground">
            תוצאות חלקיות - {poll.scheduled_days.length} ימים תוזמנו, ימים נוספים יתוזמנו בהמשך
          </CardContent>
        </Card>
      )}
      <ScheduleResults pollId={poll.id} />
    </div>
  );
}
