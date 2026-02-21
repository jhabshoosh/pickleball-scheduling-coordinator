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

  if (poll.status === 'open') {
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
      <ScheduleResults pollId={poll.id} />
    </div>
  );
}
