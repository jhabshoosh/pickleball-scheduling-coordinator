import { describe, it, expect } from 'vitest';
import { generateSchedule, generateScheduleForDay, seedStateFromSessions } from '../scheduler/algorithm';
import { VoteWithPlayer, DayOfWeek, Session } from '../../../shared/types';
import { calculateCost } from '../scheduler/costCalculator';

function makeVote(
  playerId: number,
  name: string,
  days: DayOfWeek[],
  opts: Partial<VoteWithPlayer> = {}
): VoteWithPlayer {
  return {
    id: playerId,
    poll_id: 1,
    player_id: playerId,
    player_name: name,
    available_days: days,
    day_preferences: days.map((d, i) => ({ day: d, rank: i + 1 })),
    min_sessions: 1,
    max_sessions: 7,
    constraints: [],
    ...opts,
  };
}

describe('generateSchedule', () => {
  it('should handle no votes', () => {
    const result = generateSchedule(1, '2026-03-01', []);
    expect(result.sessions).toHaveLength(0);
    expect(result.unscheduledPlayerIds).toHaveLength(0);
  });

  it('should handle single player (not enough for a game)', () => {
    const votes = [makeVote(1, 'Player1', [0, 1, 2])];
    const result = generateSchedule(1, '2026-03-01', votes);
    expect(result.sessions).toHaveLength(0);
    expect(result.unscheduledPlayerIds).toContain(1);
  });

  it('should schedule 4 players on overlapping days', () => {
    const votes = [
      makeVote(1, 'A', [0, 2]),
      makeVote(2, 'B', [0, 2]),
      makeVote(3, 'C', [0, 2]),
      makeVote(4, 'D', [0, 2]),
    ];
    const result = generateSchedule(1, '2026-03-01', votes);
    // Should have sessions on both days
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
    // All players should be scheduled
    expect(result.unscheduledPlayerIds).toHaveLength(0);
  });

  it('should create 2 courts for 6-10 players', () => {
    const votes = Array.from({ length: 8 }, (_, i) =>
      makeVote(i + 1, `P${i + 1}`, [0])
    );
    const result = generateSchedule(1, '2026-03-01', votes);
    const sundaySessions = result.sessions.filter(s => s.day_of_week === 0);
    expect(sundaySessions).toHaveLength(2);
    expect(sundaySessions[0].court_number).toBe(1);
    expect(sundaySessions[1].court_number).toBe(2);
  });

  it('should flag singles for 2-3 players', () => {
    const votes = [
      makeVote(1, 'A', [0]),
      makeVote(2, 'B', [0]),
    ];
    const result = generateSchedule(1, '2026-03-01', votes);
    expect(result.sessions).toHaveLength(1);
    expect(result.sessions[0].is_singles).toBe(true);
  });

  it('should respect mutual exclusion constraints', () => {
    const votes = [
      makeVote(1, 'A', [0, 2], {
        constraints: [{ type: 'mutual_exclusion', days: [0, 2] }],
      }),
      makeVote(2, 'B', [0, 2]),
      makeVote(3, 'C', [0, 2]),
      makeVote(4, 'D', [0, 2]),
    ];
    const result = generateSchedule(1, '2026-03-01', votes);
    // Player 1 should only appear on one of Sunday(0) or Tuesday(2)
    const player1Days = new Set<number>();
    for (const session of result.sessions) {
      if (session.player_ids.includes(1)) {
        player1Days.add(session.day_of_week);
      }
    }
    expect(player1Days.size).toBeLessThanOrEqual(1);
  });

  it('should respect no-consecutive constraint', () => {
    const votes = [
      makeVote(1, 'A', [0, 1, 2], {
        constraints: [{ type: 'no_consecutive' }],
      }),
      makeVote(2, 'B', [0, 1, 2]),
      makeVote(3, 'C', [0, 1, 2]),
      makeVote(4, 'D', [0, 1, 2]),
    ];
    const result = generateSchedule(1, '2026-03-01', votes);
    const player1Days: number[] = [];
    for (const session of result.sessions) {
      if (session.player_ids.includes(1)) {
        player1Days.push(session.day_of_week);
      }
    }
    // No two consecutive days
    player1Days.sort((a, b) => a - b);
    for (let i = 0; i < player1Days.length - 1; i++) {
      expect(Math.abs(player1Days[i + 1] - player1Days[i])).toBeGreaterThan(1);
    }
  });

  it('should respect max_sessions limit', () => {
    const votes = [
      makeVote(1, 'A', [0, 1, 2, 3, 4], { max_sessions: 2 }),
      makeVote(2, 'B', [0, 1, 2, 3, 4]),
      makeVote(3, 'C', [0, 1, 2, 3, 4]),
      makeVote(4, 'D', [0, 1, 2, 3, 4]),
    ];
    const result = generateSchedule(1, '2026-03-01', votes);
    let player1Count = 0;
    for (const session of result.sessions) {
      if (session.player_ids.includes(1)) player1Count++;
    }
    expect(player1Count).toBeLessThanOrEqual(2);
  });
});

function makeSession(day: DayOfWeek, playerIds: number[], opts: Partial<Session> = {}): Session {
  return {
    id: 1,
    poll_id: 1,
    day_of_week: day,
    session_date: '2026-03-01',
    time: '20:00',
    court_number: 1,
    player_ids: playerIds,
    reserver_id: null,
    is_singles: false,
    total_cost: 130,
    cost_per_person: 32.5,
    status: 'planned',
    ...opts,
  };
}

describe('generateScheduleForDay', () => {
  it('should schedule a single day', () => {
    const votes = [
      makeVote(1, 'A', [0, 1]),
      makeVote(2, 'B', [0, 1]),
      makeVote(3, 'C', [0, 1]),
      makeVote(4, 'D', [0, 1]),
    ];
    const result = generateScheduleForDay(1, '2026-03-01', 0 as DayOfWeek, votes);
    expect(result.sessions.length).toBeGreaterThanOrEqual(1);
    // All sessions should be on day 0
    for (const s of result.sessions) {
      expect(s.day_of_week).toBe(0);
    }
  });

  it('should respect max_sessions from pre-seeded sessions', () => {
    const votes = [
      makeVote(1, 'A', [0, 1, 2], { max_sessions: 2 }),
      makeVote(2, 'B', [0, 1, 2]),
      makeVote(3, 'C', [0, 1, 2]),
      makeVote(4, 'D', [0, 1, 2]),
    ];
    // Player 1 already played on day 0 and day 1
    const existingSessions = [
      makeSession(0, [1, 2, 3, 4]),
      makeSession(1, [1, 2, 3, 4]),
    ];
    const result = generateScheduleForDay(1, '2026-03-01', 2 as DayOfWeek, votes, existingSessions);
    // Player 1 should NOT appear on day 2 (already at max_sessions=2)
    for (const s of result.sessions) {
      expect(s.player_ids).not.toContain(1);
    }
  });

  it('should respect mutual_exclusion across pre-seeded days', () => {
    const votes = [
      makeVote(1, 'A', [0, 2], {
        constraints: [{ type: 'mutual_exclusion', days: [0, 2] }],
      }),
      makeVote(2, 'B', [0, 2]),
      makeVote(3, 'C', [0, 2]),
      makeVote(4, 'D', [0, 2]),
    ];
    // Player 1 already played on day 0
    const existingSessions = [makeSession(0, [1, 2, 3, 4])];
    const result = generateScheduleForDay(1, '2026-03-01', 2 as DayOfWeek, votes, existingSessions);
    // Player 1 should NOT appear on day 2 due to mutual_exclusion with day 0
    for (const s of result.sessions) {
      expect(s.player_ids).not.toContain(1);
    }
  });

  it('should respect no_consecutive across pre-seeded days', () => {
    const votes = [
      makeVote(1, 'A', [0, 1], {
        constraints: [{ type: 'no_consecutive' }],
      }),
      makeVote(2, 'B', [0, 1]),
      makeVote(3, 'C', [0, 1]),
      makeVote(4, 'D', [0, 1]),
    ];
    // Player 1 already played on day 0
    const existingSessions = [makeSession(0, [1, 2, 3, 4])];
    const result = generateScheduleForDay(1, '2026-03-01', 1 as DayOfWeek, votes, existingSessions);
    // Player 1 should NOT appear on day 1 (consecutive to day 0)
    for (const s of result.sessions) {
      expect(s.player_ids).not.toContain(1);
    }
  });

  it('should prioritize players with min_sessions deficit', () => {
    const votes = [
      makeVote(1, 'A', [0, 2], { min_sessions: 2 }),
      makeVote(2, 'B', [0, 2], { min_sessions: 1 }),
      makeVote(3, 'C', [0, 2], { min_sessions: 1 }),
      makeVote(4, 'D', [0, 2], { min_sessions: 1 }),
      makeVote(5, 'E', [0, 2], { min_sessions: 1 }),
      makeVote(6, 'F', [2], { min_sessions: 1 }),
    ];
    // Players 2-5 already played on day 0, player 1 did not (has deficit)
    const existingSessions = [makeSession(0, [2, 3, 4, 5])];
    const result = generateScheduleForDay(1, '2026-03-01', 2 as DayOfWeek, votes, existingSessions);
    // Player 1 should be included on day 2 due to min_sessions deficit
    const allPlayerIds = result.sessions.flatMap(s => s.player_ids);
    expect(allPlayerIds).toContain(1);
  });

  it('should handle day with no available players', () => {
    const votes = [
      makeVote(1, 'A', [0]),
      makeVote(2, 'B', [0]),
    ];
    const result = generateScheduleForDay(1, '2026-03-01', 3 as DayOfWeek, votes);
    expect(result.sessions).toHaveLength(0);
  });
});

describe('seedStateFromSessions', () => {
  it('should populate state from existing sessions', () => {
    const sessions = [
      makeSession(0, [1, 2, 3]),
      makeSession(1, [2, 3, 4]),
    ];
    const state = seedStateFromSessions(sessions);
    expect(state.playerAssignments.get(1)?.has(0)).toBe(true);
    expect(state.playerAssignments.get(1)?.has(1)).toBeFalsy();
    expect(state.playerAssignments.get(2)?.has(0)).toBe(true);
    expect(state.playerAssignments.get(2)?.has(1)).toBe(true);
    expect(state.playerAssignments.get(4)?.has(1)).toBe(true);
  });
});

describe('calculateCost', () => {
  it('should return 0 for 0-1 players', () => {
    expect(calculateCost(0)).toEqual({ totalCost: 0, costPerPerson: 0, isSingles: false });
    expect(calculateCost(1)).toEqual({ totalCost: 0, costPerPerson: 0, isSingles: false });
  });

  it('should calculate singles cost for 2-3 players', () => {
    const c2 = calculateCost(2);
    expect(c2.totalCost).toBe(100);
    expect(c2.costPerPerson).toBe(50);
    expect(c2.isSingles).toBe(true);

    const c3 = calculateCost(3);
    expect(c3.totalCost).toBe(100);
    expect(c3.costPerPerson).toBeCloseTo(33.33, 1);
    expect(c3.isSingles).toBe(true);
  });

  it('should calculate doubles cost for 4+ players', () => {
    const c4 = calculateCost(4);
    expect(c4.totalCost).toBe(130);
    expect(c4.costPerPerson).toBe(32.5);
    expect(c4.isSingles).toBe(false);

    const c5 = calculateCost(5);
    expect(c5.totalCost).toBe(130);
    expect(c5.costPerPerson).toBe(26);
    expect(c5.isSingles).toBe(false);
  });
});
