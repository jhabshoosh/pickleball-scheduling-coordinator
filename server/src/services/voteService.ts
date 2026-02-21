import { getDb } from '../db/connection';
import { Vote, VoteWithPlayer, SubmitVoteRequest } from '../../../shared/types';

export function submitVote(data: SubmitVoteRequest): Vote {
  const db = getDb();

  const existing = db.prepare(
    'SELECT id FROM votes WHERE poll_id = ? AND player_id = ?'
  ).get(data.poll_id, data.player_id) as any;

  if (existing) {
    db.prepare(`
      UPDATE votes SET
        available_days = ?, day_preferences = ?,
        min_sessions = ?, max_sessions = ?, constraints = ?,
        updated_at = datetime('now')
      WHERE id = ?
    `).run(
      JSON.stringify(data.available_days),
      JSON.stringify(data.day_preferences),
      data.min_sessions,
      data.max_sessions,
      JSON.stringify(data.constraints),
      existing.id
    );
    return getVoteById(existing.id)!;
  }

  const result = db.prepare(`
    INSERT INTO votes (poll_id, player_id, available_days, day_preferences, min_sessions, max_sessions, constraints)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    data.poll_id,
    data.player_id,
    JSON.stringify(data.available_days),
    JSON.stringify(data.day_preferences),
    data.min_sessions,
    data.max_sessions,
    JSON.stringify(data.constraints)
  );

  return getVoteById(result.lastInsertRowid as number)!;
}

export function getVoteById(id: number): Vote | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM votes WHERE id = ?').get(id) as any;
  return row ? mapVoteRow(row) : null;
}

export function getVoteByPollAndPlayer(pollId: number, playerId: number): Vote | null {
  const db = getDb();
  const row = db.prepare(
    'SELECT * FROM votes WHERE poll_id = ? AND player_id = ?'
  ).get(pollId, playerId) as any;
  return row ? mapVoteRow(row) : null;
}

export function getVotesForPoll(pollId: number): VoteWithPlayer[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT v.*, p.name as player_name
    FROM votes v JOIN players p ON v.player_id = p.id
    WHERE v.poll_id = ?
    ORDER BY v.created_at ASC
  `).all(pollId) as any[];
  return rows.map(row => ({
    ...mapVoteRow(row),
    player_name: row.player_name,
  }));
}

export function deleteVote(pollId: number, playerId: number): boolean {
  const db = getDb();
  const result = db.prepare(
    'DELETE FROM votes WHERE poll_id = ? AND player_id = ?'
  ).run(pollId, playerId);
  return result.changes > 0;
}

function mapVoteRow(row: any): Vote {
  return {
    id: row.id,
    poll_id: row.poll_id,
    player_id: row.player_id,
    available_days: JSON.parse(row.available_days),
    day_preferences: JSON.parse(row.day_preferences),
    min_sessions: row.min_sessions,
    max_sessions: row.max_sessions,
    constraints: JSON.parse(row.constraints),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}
