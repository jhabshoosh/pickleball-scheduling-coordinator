import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { SessionCard } from './SessionCard';
import { WhatsAppButton } from './WhatsAppButton';

interface ScheduleResultsProps {
  pollId: number;
}

export function ScheduleResults({ pollId }: ScheduleResultsProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ['pollResults', pollId],
    queryFn: () => api.getPollResults(pollId),
  });

  if (isLoading) return <p className="text-center text-muted-foreground">טוען תוצאות...</p>;
  if (error) return <p className="text-center text-destructive">שגיאה בטעינת תוצאות</p>;
  if (!data?.sessions?.length) return <p className="text-center text-muted-foreground">אין תוצאות עדיין</p>;

  return (
    <div className="space-y-4">
      {data.sessions.map((session: any) => (
        <SessionCard key={session.id} session={session} />
      ))}
      <WhatsAppButton pollId={pollId} />
    </div>
  );
}
