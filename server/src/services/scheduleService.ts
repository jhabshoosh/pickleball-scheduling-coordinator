import { getDb } from '../db/connection';
import { Session, SessionWithPlayers, Player, DayOfWeek } from '../../../shared/types';

export function getSessionsForPoll(pollId: number): SessionWithPlayers[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM sessions WHERE poll_id = ? ORDER BY session_date, court_number'
  ).all(pollId) as any[];

  return rows.map(row => {
    const session = mapSessionRow(row);
    const playerIds = session.player_ids;
    const players = playerIds.length > 0
      ? db.prepare(`SELECT * FROM players WHERE id IN (${playerIds.map(() => '?').join(',')})`)
          .all(...playerIds) as Player[]
      : [];
    const reserver = session.reserver_id
      ? db.prepare('SELECT * FROM players WHERE id = ?').get(session.reserver_id) as Player | undefined
      : null;
    return {
      ...session,
      players,
      reserver: reserver || null,
    };
  });
}

export function saveSessions(pollId: number, sessions: Omit<Session, 'id'>[]): void {
  const db = getDb();
  // Clear existing sessions for this poll
  db.prepare('DELETE FROM sessions WHERE poll_id = ?').run(pollId);

  const insert = db.prepare(`
    INSERT INTO sessions (poll_id, day_of_week, session_date, time, court_number, player_ids, reserver_id, is_singles, total_cost, cost_per_person, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: Omit<Session, 'id'>[]) => {
    for (const s of items) {
      insert.run(
        s.poll_id, s.day_of_week, s.session_date, s.time, s.court_number,
        JSON.stringify(s.player_ids), s.reserver_id, s.is_singles ? 1 : 0,
        s.total_cost, s.cost_per_person, s.status
      );
    }
  });

  insertMany(sessions);

  // Record reservation history
  const savedSessions = db.prepare('SELECT * FROM sessions WHERE poll_id = ?').all(pollId) as any[];
  const insertHistory = db.prepare(
    'INSERT INTO reservation_history (player_id, session_id) VALUES (?, ?)'
  );
  for (const s of savedSessions) {
    if (s.reserver_id) {
      insertHistory.run(s.reserver_id, s.id);
    }
  }
}

export function saveSessionsForDay(pollId: number, day: DayOfWeek, sessions: Omit<Session, 'id'>[]): void {
  const db = getDb();
  // Delete only this day's sessions for append-safe behavior
  db.prepare('DELETE FROM sessions WHERE poll_id = ? AND day_of_week = ?').run(pollId, day);

  const insert = db.prepare(`
    INSERT INTO sessions (poll_id, day_of_week, session_date, time, court_number, player_ids, reserver_id, is_singles, total_cost, cost_per_person, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertMany = db.transaction((items: Omit<Session, 'id'>[]) => {
    for (const s of items) {
      insert.run(
        s.poll_id, s.day_of_week, s.session_date, s.time, s.court_number,
        JSON.stringify(s.player_ids), s.reserver_id, s.is_singles ? 1 : 0,
        s.total_cost, s.cost_per_person, s.status
      );
    }
  });

  insertMany(sessions);

  // Record reservation history for this day's sessions
  const savedSessions = db.prepare(
    'SELECT * FROM sessions WHERE poll_id = ? AND day_of_week = ?'
  ).all(pollId, day) as any[];
  const insertHistory = db.prepare(
    'INSERT INTO reservation_history (player_id, session_id) VALUES (?, ?)'
  );
  for (const s of savedSessions) {
    if (s.reserver_id) {
      insertHistory.run(s.reserver_id, s.id);
    }
  }
}

export function getSessionsForPollAsPlain(pollId: number): Session[] {
  const db = getDb();
  const rows = db.prepare(
    'SELECT * FROM sessions WHERE poll_id = ? ORDER BY session_date, court_number'
  ).all(pollId) as any[];
  return rows.map(mapSessionRow);
}

export function getReservationCounts(): Map<number, number> {
  const db = getDb();
  const rows = db.prepare(
    'SELECT player_id, COUNT(*) as count FROM reservation_history GROUP BY player_id'
  ).all() as any[];
  const counts = new Map<number, number>();
  for (const row of rows) {
    counts.set(row.player_id, row.count);
  }
  return counts;
}

function mapSessionRow(row: any): Session {
  return {
    id: row.id,
    poll_id: row.poll_id,
    day_of_week: row.day_of_week,
    session_date: row.session_date,
    time: row.time,
    court_number: row.court_number,
    player_ids: JSON.parse(row.player_ids),
    reserver_id: row.reserver_id,
    is_singles: Boolean(row.is_singles),
    total_cost: row.total_cost,
    cost_per_person: row.cost_per_person,
    status: row.status,
  };
}
