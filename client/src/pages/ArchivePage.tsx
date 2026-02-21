import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SessionCard } from '@/components/schedule/SessionCard';
import { Poll } from 'shared/types';

export function ArchivePage() {
  const [selectedPollId, setSelectedPollId] = useState<number | null>(null);

  const { data: polls, isLoading } = useQuery<Poll[]>({
    queryKey: ['archive'],
    queryFn: api.getArchive,
  });

  const { data: detail } = useQuery({
    queryKey: ['archiveDetail', selectedPollId],
    queryFn: () => api.getArchiveDetail(selectedPollId!),
    enabled: !!selectedPollId,
  });

  if (isLoading) return <p className="text-center text-muted-foreground py-8">טוען...</p>;

  if (selectedPollId && detail) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setSelectedPollId(null)}>
          → חזרה לרשימה
        </Button>
        <h2 className="text-lg font-bold">שבוע {detail.poll.week_start}</h2>
        {detail.sessions?.map((session: any) => (
          <SessionCard key={session.id} session={session} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold">ארכיון</h2>
      {!polls?.length ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            אין סקרים בארכיון
          </CardContent>
        </Card>
      ) : (
        polls.map(poll => (
          <Card
            key={poll.id}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => setSelectedPollId(poll.id)}
          >
            <CardContent className="p-4">
              <p className="font-medium">שבוע {poll.week_start}</p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
