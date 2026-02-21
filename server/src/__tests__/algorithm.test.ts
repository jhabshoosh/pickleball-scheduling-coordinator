import { describe, it, expect } from 'vitest';
import { generateSchedule } from '../scheduler/algorithm';
import { VoteWithPlayer, DayOfWeek } from '../../../shared/types';
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
