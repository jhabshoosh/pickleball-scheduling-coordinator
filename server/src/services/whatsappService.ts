import { SessionWithPlayers, HEBREW_DAYS, DayOfWeek } from '../../../shared/types';

export function formatWhatsAppMessage(sessions: SessionWithPlayers[], weekStart: string): string {
  if (sessions.length === 0) {
    return 'לא נקבעו משחקים לשבוע הקרוב';
  }

  const lines: string[] = [];
  lines.push(`🏓 *סידור משחקי פיקלבול*`);
  lines.push(`📅 שבוע ${weekStart}`);
  lines.push('');

  // Group sessions by day
  const byDay = new Map<number, SessionWithPlayers[]>();
  for (const session of sessions) {
    const existing = byDay.get(session.day_of_week) || [];
    existing.push(session);
    byDay.set(session.day_of_week, existing);
  }

  // Sort by day of week
  const sortedDays = [...byDay.keys()].sort((a, b) => a - b);

  for (const day of sortedDays) {
    const daySessions = byDay.get(day)!;
    const dayName = HEBREW_DAYS[day as DayOfWeek];
    const date = daySessions[0].session_date;

    lines.push(`*יום ${dayName} (${date})*`);

    for (const session of daySessions) {
      const type = session.is_singles ? 'סינגלס' : 'זוגות';
      const courtLabel = daySessions.length > 1 ? ` | מגרש ${session.court_number}` : '';
      lines.push(`⏰ ${session.time}${courtLabel} | ${type}`);

      const playerNames = session.players.map(p => p.name).join(', ');
      lines.push(`👥 ${playerNames}`);

      if (session.reserver) {
        lines.push(`📋 מזמין: ${session.reserver.name}`);
      }

      lines.push(`💰 ${session.total_cost}₪ (${session.cost_per_person.toFixed(0)}₪ לאדם)`);
      lines.push('');
    }
  }

  lines.push('בהצלחה! 🎾');
  return lines.join('\n');
}
