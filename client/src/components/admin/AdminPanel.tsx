import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/lib/api';
import { Poll } from 'shared/types';

interface AdminPanelProps {
  onLogout: () => void;
}

export function AdminPanel({ onLogout }: AdminPanelProps) {
  const queryClient = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: polls, isLoading } = useQuery<Poll[]>({
    queryKey: ['adminPolls'],
    queryFn: api.getAdminPolls,
  });

  const generateMutation = useMutation({
    mutationFn: (pollId: number) => api.generateSchedule(pollId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['currentPoll'] });
    },
  });

  const closeMutation = useMutation({
    mutationFn: (pollId: number) => api.closePoll(pollId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPolls'] }),
  });

  const publishMutation = useMutation({
    mutationFn: (pollId: number) => api.publishPoll(pollId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPolls'] }),
  });

  const archiveMutation = useMutation({
    mutationFn: (pollId: number) => api.archivePoll(pollId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['adminPolls'] }),
  });

  const handleCreatePoll = async () => {
    setCreating(true);
    try {
      // Create poll for next Sunday
      const now = new Date();
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
      const nextSunday = new Date(now);
      nextSunday.setDate(now.getDate() + daysUntilSunday);
      const weekStart = nextSunday.toISOString().split('T')[0];
      await api.createPoll(weekStart);
      queryClient.invalidateQueries({ queryKey: ['adminPolls'] });
      queryClient.invalidateQueries({ queryKey: ['currentPoll'] });
    } finally {
      setCreating(false);
    }
  };

  const statusColors: Record<string, string> = {
    open: 'bg-green-100 text-green-800',
    closed: 'bg-yellow-100 text-yellow-800',
    scheduled: 'bg-blue-100 text-blue-800',
    published: 'bg-purple-100 text-purple-800',
    archived: 'bg-gray-100 text-gray-800',
  };

  const statusLabels: Record<string, string> = {
    open: 'פתוח',
    closed: 'סגור',
    scheduled: 'מתוזמן',
    published: 'פורסם',
    archived: 'בארכיון',
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">פאנל ניהול</h2>
        <Button variant="ghost" size="sm" onClick={onLogout}>
          יציאה
        </Button>
      </div>

      <Button onClick={handleCreatePoll} disabled={creating} className="w-full">
        {creating ? 'יוצר...' : 'צור סקר לשבוע הבא'}
      </Button>

      {isLoading ? (
        <p className="text-center text-muted-foreground">טוען...</p>
      ) : (
        <div className="space-y-3">
          {polls?.map(poll => (
            <Card key={poll.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-sm">{poll.week_start}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${statusColors[poll.status]}`}>
                    {statusLabels[poll.status]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {poll.status === 'open' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => closeMutation.mutate(poll.id)}
                    >
                      סגור הצבעה
                    </Button>
                  )}
                  {(poll.status === 'open' || poll.status === 'closed') && (
                    <Button
                      size="sm"
                      onClick={() => generateMutation.mutate(poll.id)}
                      disabled={generateMutation.isPending}
                    >
                      {generateMutation.isPending ? 'מחשב...' : 'הרץ אלגוריתם'}
                    </Button>
                  )}
                  {poll.status === 'scheduled' && (
                    <Button
                      size="sm"
                      onClick={() => publishMutation.mutate(poll.id)}
                    >
                      פרסם
                    </Button>
                  )}
                  {(poll.status === 'published' || poll.status === 'scheduled') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => archiveMutation.mutate(poll.id)}
                    >
                      ארכיון
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
