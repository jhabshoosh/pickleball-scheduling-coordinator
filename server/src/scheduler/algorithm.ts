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

export function generateSchedule(
  pollId: number,
  weekStart: string,
  votes: VoteWithPlayer[]
): ScheduleOutput {
  const warnings: string[] = [];
  const state = createAssignmentState();
  const voteMap = new Map<number, VoteWithPlayer>();
  for (const v of votes) voteMap.set(v.player_id, v);

  // Step 1: Build availability matrix
  const dayAvailability = new Map<DayOfWeek, number[]>();
  for (let d = 0; d <= 6; d++) {
    dayAvailability.set(d as DayOfWeek, []);
  }

  for (const vote of votes) {
    for (const day of vote.available_days) {
      dayAvailability.get(day)!.push(vote.player_id);
    }
  }

  // Step 2: Score days
  const dayScores: DayScore[] = [];
  for (const [day, players] of dayAvailability.entries()) {
    if (players.length < 2) continue; // Need at least 2 players

    let prefBonus = 0;
    for (const pid of players) {
      const vote = voteMap.get(pid)!;
      const pref = vote.day_preferences.find(p => p.day === day);
      if (pref) {
        // Higher rank (lower number) = higher bonus
        prefBonus += (8 - pref.rank);
      }
    }
    const avgPrefBonus = players.length > 0 ? prefBonus / players.length : 0;

    dayScores.push({
      day,
      score: players.length * 10 + avgPrefBonus,
      availablePlayers: players,
    });
  }

  // Sort by score descending
  dayScores.sort((a, b) => b.score - a.score);

  // Step 3: Greedy assignment
  const courtAssignments: CourtAssignment[] = [];

  for (const dayScore of dayScores) {
    const eligible = dayScore.availablePlayers.filter(pid => {
      const vote = voteMap.get(pid)!;
      const count = getPlayerSessionCount(state, pid);
      if (count >= vote.max_sessions) return false;
      return checkConstraints(pid, dayScore.day, vote, state);
    });

    if (eligible.length < 2) {
      if (eligible.length === 1) {
        warnings.push(`יום ${dayScore.day}: רק שחקן אחד זמין, לא ניתן לקבוע משחק`);
      }
      continue;
    }

    // Sort eligible by preference for this day (higher preference first)
    eligible.sort((a, b) => {
      const prefA = voteMap.get(a)!.day_preferences.find(p => p.day === dayScore.day);
      const prefB = voteMap.get(b)!.day_preferences.find(p => p.day === dayScore.day);
      const rankA = prefA ? prefA.rank : 99;
      const rankB = prefB ? prefB.rank : 99;
      return rankA - rankB;
    });

    if (eligible.length >= CONFIG.COURTS.TWO_COURTS_MIN && eligible.length <= CONFIG.COURTS.TWO_COURTS_MAX) {
      // 2 courts
      const mid = Math.ceil(eligible.length / 2);
      const court1Players = eligible.slice(0, mid);
      const court2Players = eligible.slice(mid);

      courtAssignments.push({
        day: dayScore.day,
        courtNumber: 1,
        playerIds: court1Players,
        isSingles: court1Players.length <= 3,
      });
      courtAssignments.push({
        day: dayScore.day,
        courtNumber: 2,
        playerIds: court2Players,
        isSingles: court2Players.length <= 3,
      });

      for (const pid of eligible) {
        assignPlayer(state, pid, dayScore.day);
      }
    } else if (eligible.length >= CONFIG.COURTS.MIN_DOUBLES) {
      // 1 court, 4-5 players
      const players = eligible.slice(0, CONFIG.COURTS.MAX_PER_COURT);
      courtAssignments.push({
        day: dayScore.day,
        courtNumber: 1,
        playerIds: players,
        isSingles: false,
      });
      for (const pid of players) {
        assignPlayer(state, pid, dayScore.day);
      }
    } else if (eligible.length >= CONFIG.COURTS.SINGLES_MIN) {
      // Singles: 2-3 players
      const players = eligible.slice(0, CONFIG.COURTS.SINGLES_MAX);
      courtAssignments.push({
        day: dayScore.day,
        courtNumber: 1,
        playerIds: players,
        isSingles: true,
      });
      warnings.push(`יום ${dayScore.day}: ${players.length} שחקנים - משחק סינגלס`);
      for (const pid of players) {
        assignPlayer(state, pid, dayScore.day);
      }
    }
  }

  // Step 4: Optimization pass - try to satisfy minSessions
  for (const vote of votes) {
    const count = getPlayerSessionCount(state, vote.player_id);
    if (count < vote.min_sessions) {
      // Try to add player to existing sessions or create new ones
      for (const dayScore of dayScores) {
        if (getPlayerSessionCount(state, vote.player_id) >= vote.min_sessions) break;
        if (!vote.available_days.includes(dayScore.day)) continue;
        if (state.playerAssignments.get(vote.player_id)?.has(dayScore.day)) continue;
        if (!checkConstraints(vote.player_id, dayScore.day, vote, state)) continue;

        // Try to add to existing court assignment for this day
        const existingCourts = courtAssignments.filter(ca => ca.day === dayScore.day);
        let added = false;
        for (const court of existingCourts) {
          if (court.playerIds.length < CONFIG.COURTS.MAX_PER_COURT) {
            court.playerIds.push(vote.player_id);
            assignPlayer(state, vote.player_id, dayScore.day);
            added = true;
            break;
          }
        }

        if (!added) {
          warnings.push(`לא ניתן לספק מינימום משחקים ל${vote.player_name || `שחקן ${vote.player_id}`}`);
        }
      }
    }
  }

  // Step 5: Build sessions with costs and reservers
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
      reserver_id: null, // Will be set by optimizer
      is_singles: isSingles,
      total_cost: totalCost,
      cost_per_person: costPerPerson,
      status: 'planned' as const,
    };
  });

  // Find unscheduled players
  const allPlayerIds = new Set(votes.map(v => v.player_id));
  const scheduledPlayerIds = new Set<number>();
  for (const s of sessions) {
    for (const pid of s.player_ids) scheduledPlayerIds.add(pid);
  }
  const unscheduledPlayerIds = [...allPlayerIds].filter(id => !scheduledPlayerIds.has(id));

  return { sessions, warnings, unscheduledPlayerIds };
}
