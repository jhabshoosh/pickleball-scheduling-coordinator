import { DayOfWeek, Vote, VoteWithPlayer, Session, DayPreference } from '../../../shared/types';
import { checkConstraints, createAssignmentState, assignPlayer, getPlayerSessionCount, AssignmentState } from './constraints';
import { calculateCost } from './costCalculator';
import { CONFIG } from '../config';
import { addDays, format } from 'date-fns';

interface DayScore {
  day: DayOfWeek;
  score: number;
  availablePlayers: number[];
}

interface CourtAssignment {
  day: DayOfWeek;
  courtNumber: number;
  playerIds: number[];
  isSingles: boolean;
}

export interface ScheduleOutput {
  sessions: Omit<Session, 'id'>[];
  warnings: string[];
  unscheduledPlayerIds: number[];
}

/**
 * Pre-seeds AssignmentState from already-scheduled sessions so constraints
 * (mutual_exclusion, no_consecutive, max_sessions) are respected across days.
 */
export function seedStateFromSessions(existingSessions: Session[]): AssignmentState {
  const state = createAssignmentState();
  for (const session of existingSessions) {
    for (const pid of session.player_ids) {
      assignPlayer(state, pid, session.day_of_week);
    }
  }
  return state;
}

/**
 * Generate schedule for a single day, respecting constraints from already-scheduled sessions.
 */
export function generateScheduleForDay(
  pollId: number,
  weekStart: string,
  targetDay: DayOfWeek,
  votes: VoteWithPlayer[],
  existingSessions: Session[] = []
): ScheduleOutput {
  const warnings: string[] = [];
  const state = seedStateFromSessions(existingSessions);
  const voteMap = new Map<number, VoteWithPlayer>();
  for (const v of votes) voteMap.set(v.player_id, v);

  // Build availability for the target day only
  const availablePlayers: number[] = [];
  for (const vote of votes) {
    if (vote.available_days.includes(targetDay)) {
      availablePlayers.push(vote.player_id);
    }
  }

  // Filter eligible players (respecting constraints from pre-seeded state)
  const eligible = availablePlayers.filter(pid => {
    const vote = voteMap.get(pid)!;
    const count = getPlayerSessionCount(state, pid);
    if (count >= vote.max_sessions) return false;
    return checkConstraints(pid, targetDay, vote, state);
  });

  const courtAssignments: CourtAssignment[] = [];

  if (eligible.length >= 2) {
    // Sort eligible: prioritize players with min_sessions deficit, then by preference
    eligible.sort((a, b) => {
      const voteA = voteMap.get(a)!;
      const voteB = voteMap.get(b)!;
      const countA = getPlayerSessionCount(state, a);
      const countB = getPlayerSessionCount(state, b);
      const deficitA = Math.max(0, voteA.min_sessions - countA);
      const deficitB = Math.max(0, voteB.min_sessions - countB);
      // Higher deficit first
      if (deficitB !== deficitA) return deficitB - deficitA;
      // Then by preference rank for this day
      const prefA = voteA.day_preferences.find(p => p.day === targetDay);
      const prefB = voteB.day_preferences.find(p => p.day === targetDay);
      const rankA = prefA ? prefA.rank : 99;
      const rankB = prefB ? prefB.rank : 99;
      return rankA - rankB;
    });

    if (eligible.length >= CONFIG.COURTS.TWO_COURTS_MIN && eligible.length <= CONFIG.COURTS.TWO_COURTS_MAX) {
      const mid = Math.ceil(eligible.length / 2);
      courtAssignments.push({
        day: targetDay,
        courtNumber: 1,
        playerIds: eligible.slice(0, mid),
        isSingles: eligible.slice(0, mid).length <= 3,
      });
      courtAssignments.push({
        day: targetDay,
        courtNumber: 2,
        playerIds: eligible.slice(mid),
        isSingles: eligible.slice(mid).length <= 3,
      });
      for (const pid of eligible) {
        assignPlayer(state, pid, targetDay);
      }
    } else if (eligible.length >= CONFIG.COURTS.MIN_DOUBLES) {
      const players = eligible.slice(0, CONFIG.COURTS.MAX_PER_COURT);
      courtAssignments.push({
        day: targetDay,
        courtNumber: 1,
        playerIds: players,
        isSingles: false,
      });
      for (const pid of players) {
        assignPlayer(state, pid, targetDay);
      }
    } else if (eligible.length >= CONFIG.COURTS.SINGLES_MIN) {
      const players = eligible.slice(0, CONFIG.COURTS.SINGLES_MAX);
      courtAssignments.push({
        day: targetDay,
        courtNumber: 1,
        playerIds: players,
        isSingles: true,
      });
      warnings.push(`יום ${targetDay}: ${players.length} שחקנים - משחק סינגלס`);
      for (const pid of players) {
        assignPlayer(state, pid, targetDay);
      }
    }
  } else if (eligible.length === 1) {
    warnings.push(`יום ${targetDay}: רק שחקן אחד זמין, לא ניתן לקבוע משחק`);
  }

  // Build sessions
  const startDate = new Date(weekStart);
  const sessions: Omit<Session, 'id'>[] = courtAssignments.map(ca => {
    const sessionDate = addDays(startDate, ca.day);
    const { totalCost, costPerPerson, isSingles } = calculateCost(ca.playerIds.length);
    return {
      poll_id: pollId,
      day_of_week: ca.day,
      session_date: format(sessionDate, 'yyyy-MM-dd'),
      time: CONFIG.DEFAULT_TIME,
      court_number: ca.courtNumber,
      player_ids: ca.playerIds,
      reserver_id: null,
      is_singles: isSingles,
      total_cost: totalCost,
      cost_per_person: costPerPerson,
      status: 'planned' as const,
    };
  });

  // Unscheduled = players available for this day but not assigned
  const scheduledPlayerIds = new Set<number>();
  for (const s of sessions) {
    for (const pid of s.player_ids) scheduledPlayerIds.add(pid);
  }
  const unscheduledPlayerIds = availablePlayers.filter(id => !scheduledPlayerIds.has(id));

  return { sessions, warnings, unscheduledPlayerIds };
}

/**
 * Generate schedule for all days at once (wrapper for admin "generate all" override).
 * Calls generateScheduleForDay in sequence so constraints accumulate across days.
 */
export function generateSchedule(
  pollId: number,
  weekStart: string,
  votes: VoteWithPlayer[]
): ScheduleOutput {
  const playableDays: DayOfWeek[] = [0, 1, 2, 3, 4, 5];
  const allSessions: Omit<Session, 'id'>[] = [];
  const allWarnings: string[] = [];
  const allUnscheduled = new Set<number>();

  // Build fake existing sessions array that grows as we process each day
  const accumulatedSessions: Session[] = [];

  for (const day of playableDays) {
    const dayOutput = generateScheduleForDay(pollId, weekStart, day, votes, accumulatedSessions);
    allSessions.push(...dayOutput.sessions);
    allWarnings.push(...dayOutput.warnings);
    for (const pid of dayOutput.unscheduledPlayerIds) allUnscheduled.add(pid);

    // Add generated sessions (with fake ids) to accumulated for next day's constraints
    for (const s of dayOutput.sessions) {
      accumulatedSessions.push({ ...s, id: -1 } as Session);
    }
  }

  // Remove from unscheduled anyone who was scheduled on any day
  const scheduledPlayerIds = new Set<number>();
  for (const s of allSessions) {
    for (const pid of s.player_ids) {
      scheduledPlayerIds.add(pid);
      allUnscheduled.delete(pid);
    }
  }

  return {
    sessions: allSessions,
    warnings: allWarnings,
    unscheduledPlayerIds: [...allUnscheduled],
  };
}
