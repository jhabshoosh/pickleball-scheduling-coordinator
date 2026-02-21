import { getDb } from '../db/connection';
import { CONFIG } from '../config';
import { Poll, PollStatus, DayOfWeek, DayDeadlineInfo } from '../../../shared/types';
import { getDayDeadlines } from '../../../shared/deadlines';
import { addDays, nextSunday, format, setHours, setMinutes } from 'date-fns';
import { toZonedTime, fromZonedTime } from 'date-fns-tz';

export function getCurrentPoll(): Poll | null {
  const db = getDb();
  const row = db.prepare(
    `SELECT * FROM polls WHERE status IN ('open', 'closed', 'scheduled', 'published') ORDER BY week_start DESC LIMIT 1`
  ).get() as any;
  return row ? mapPollRow(row) : null;
}

export function getPollById(id: number): Poll | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM polls WHERE id = ?').get(id) as any;
  return row ? mapPollRow(row) : null;
}

export function createPollForWeek(weekStart: string, createdBy: string = 'system'): Poll {
  const db = getDb();
  const startDate = new Date(weekStart);
  const endDate = addDays(startDate, 6);

  // Voting deadline: Saturday 18:00 Israel time
  const deadlineDate = addDays(startDate, 6); // Saturday
  let deadline = setHours(deadlineDate, CONFIG.VOTING_DEADLINE_HOUR);
  deadline = setMinutes(deadline, 0);
  const deadlineStr = fromZonedTime(deadline, CONFIG.TIMEZONE).toISOString();

  const result = db.prepare(
    `INSERT INTO polls (week_start, week_end, voting_deadline, created_by) VALUES (?, ?, ?, ?)`
  ).run(
    format(startDate, 'yyyy-MM-dd'),
    format(endDate, 'yyyy-MM-dd'),
    deadlineStr,
    createdBy
  );

  return getPollById(result.lastInsertRowid as number)!;
}

export function createNextWeekPoll(): Poll {
  const now = toZonedTime(new Date(), CONFIG.TIMEZONE);
  const sunday = nextSunday(now);
  return createPollForWeek(format(sunday, 'yyyy-MM-dd'), 'system');
}

export function updatePollStatus(id: number, status: PollStatus): Poll | null {
  const db = getDb();
  db.prepare('UPDATE polls SET status = ? WHERE id = ?').run(status, id);
  return getPollById(id);
}

export function extendDeadline(id: number, newDeadline: string): Poll | null {
  const db = getDb();
  db.prepare('UPDATE polls SET extended_deadline = ?, voting_deadline = ? WHERE id = ?')
    .run(newDeadline, newDeadline, id);
  return getPollById(id);
}

export function getArchivedPolls(): Poll[] {
  const db = getDb();
  const rows = db.prepare(
    `SELECT * FROM polls WHERE status = 'archived' ORDER BY week_start DESC`
  ).all() as any[];
  return rows.map(mapPollRow);
}

export function getAllPolls(): Poll[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM polls ORDER BY week_start DESC').all() as any[];
  return rows.map(mapPollRow);
}

export function updatePollScheduledDays(id: number, scheduledDays: DayOfWeek[]): Poll | null {
  const db = getDb();
  db.prepare('UPDATE polls SET scheduled_days = ? WHERE id = ?')
    .run(JSON.stringify(scheduledDays), id);
  return getPollById(id);
}

export function getPollDayDeadlines(poll: Poll): DayDeadlineInfo[] {
  return getDayDeadlines(poll.week_start, poll.scheduled_days);
}

function mapPollRow(row: any): Poll {
  return {
    id: row.id,
    week_start: row.week_start,
    week_end: row.week_end,
    voting_deadline: row.voting_deadline,
    status: row.status as PollStatus,
    created_by: row.created_by,
    extended_deadline: row.extended_deadline,
    scheduled_days: JSON.parse(row.scheduled_days || '[]'),
  };
}
