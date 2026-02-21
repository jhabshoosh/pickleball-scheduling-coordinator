import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SessionWithPlayers, DayOfWeek, HEBREW_DAYS } from 'shared/types';

interface SessionCardProps {
  session: SessionWithPlayers;
}

export function SessionCard({ session }: SessionCardProps) {
  const dayName = HEBREW_DAYS[session.day_of_week as DayOfWeek];
  const type = session.is_singles ? 'סינגלס' : 'זוגות';

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <span className="font-bold">יום {dayName}</span>
            <span className="text-muted-foreground text-sm mr-2">{session.session_date}</span>
          </div>
          <div className="flex gap-1">
            <Badge variant="secondary">{session.time}</Badge>
            <Badge variant={session.is_singles ? 'outline' : 'default'}>{type}</Badge>
          </div>
        </div>

        {session.court_number > 1 && (
          <p className="text-xs text-muted-foreground mb-2">מגרש {session.court_number}</p>
        )}

        <div className="flex flex-wrap gap-1 mb-3">
          {session.players.map(p => (
            <Badge key={p.id} variant="secondary" className="text-xs">
              {p.name}
              {session.reserver?.id === p.id && ' 📋'}
            </Badge>
          ))}
        </div>

        <div className="flex justify-between text-sm text-muted-foreground border-t pt-2">
          <span>סה"כ: {session.total_cost}₪</span>
          <span>{session.cost_per_person.toFixed(0)}₪ לאדם</span>
        </div>
      </CardContent>
    </Card>
  );
}
