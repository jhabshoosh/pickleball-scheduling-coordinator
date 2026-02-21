import { Session } from '../../../shared/types';
import { getReservationCounts } from '../services/scheduleService';
import { ScheduleOutput } from './algorithm';

export function optimize(output: ScheduleOutput): ScheduleOutput {
  const reservationCounts = getReservationCounts();

  // Assign reservers: player with fewest past reservations
  for (const session of output.sessions) {
    if (session.player_ids.length === 0) continue;

    let minCount = Infinity;
    let reserverId = session.player_ids[0];

    for (const pid of session.player_ids) {
      const count = reservationCounts.get(pid) || 0;
      if (count < minCount) {
        minCount = count;
        reserverId = pid;
      }
    }

    session.reserver_id = reserverId;
    // Update reservation counts for fairness within same schedule
    reservationCounts.set(reserverId, (reservationCounts.get(reserverId) || 0) + 1);
  }

  // Sort sessions by day then court number
  output.sessions.sort((a, b) => {
    if (a.day_of_week !== b.day_of_week) return a.day_of_week - b.day_of_week;
    return a.court_number - b.court_number;
  });

  return output;
}
