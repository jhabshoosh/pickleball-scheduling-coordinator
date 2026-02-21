import { Constraint, DayOfWeek, Vote } from '../../../shared/types';

export interface AssignmentState {
  // player_id -> set of assigned days
  playerAssignments: Map<number, Set<DayOfWeek>>;
}

export function checkConstraints(
  playerId: number,
  day: DayOfWeek,
  vote: Vote,
  state: AssignmentState
): boolean {
  const assigned = state.playerAssignments.get(playerId) || new Set();

  for (const constraint of vote.constraints) {
    switch (constraint.type) {
      case 'mutual_exclusion': {
        const [dayA, dayB] = constraint.days;
        if (day === dayA && assigned.has(dayB)) return false;
        if (day === dayB && assigned.has(dayA)) return false;
        break;
      }
      case 'no_consecutive': {
        // Check if any assigned day is consecutive to this day
        for (const assignedDay of assigned) {
          if (Math.abs(day - assignedDay) === 1) return false;
          // Also handle Saturday(6) -> Sunday(0) wrap-around
          if ((day === 0 && assignedDay === 6) || (day === 6 && assignedDay === 0)) return false;
        }
        break;
      }
    }
  }

  return true;
}

export function createAssignmentState(): AssignmentState {
  return {
    playerAssignments: new Map(),
  };
}

export function assignPlayer(state: AssignmentState, playerId: number, day: DayOfWeek): void {
  if (!state.playerAssignments.has(playerId)) {
    state.playerAssignments.set(playerId, new Set());
  }
  state.playerAssignments.get(playerId)!.add(day);
}

export function getPlayerSessionCount(state: AssignmentState, playerId: number): number {
  return state.playerAssignments.get(playerId)?.size || 0;
}
