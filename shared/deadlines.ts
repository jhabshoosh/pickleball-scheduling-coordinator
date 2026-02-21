import { DayOfWeek, DayDeadlineInfo, DayStatus } from './types';

const DEADLINE_HOUR = 20; // 20:00 Israel time
const ISRAEL_TZ = 'Asia/Jerusalem';

/**
 * Computes the deadline for a given day: 20:00 Israel time the evening before.
 * Sunday (0) closes Saturday 20:00, Monday (1) closes Sunday 20:00, etc.
 */
export function getDayDeadline(weekStart: string, day: DayOfWeek): Date {
  const start = new Date(weekStart + 'T00:00:00');
  // The deadline is the evening before the target day
  // day 0 (Sunday) -> offset -1 from week start (Saturday before)
  // But weekStart IS Sunday, so Saturday before = weekStart - 1 day
  // day 1 (Monday) -> Sunday evening = weekStart + 0 days
  // day 2 (Tuesday) -> Monday evening = weekStart + 1 day
  // General: deadline day offset = day - 1
  const deadlineDayOffset = day - 1;
  const deadlineDate = new Date(start);
  deadlineDate.setDate(deadlineDate.getDate() + deadlineDayOffset);

  // Build the deadline as DEADLINE_HOUR:00 in Israel time
  // We construct an ISO string with the target date and convert from Israel TZ
  const year = deadlineDate.getFullYear();
  const month = String(deadlineDate.getMonth() + 1).padStart(2, '0');
  const dateStr = String(deadlineDate.getDate()).padStart(2, '0');

  // Create a date string representing the deadline in Israel time
  // Then convert to UTC by parsing in the Israel timezone
  const israelDateStr = `${year}-${month}-${dateStr}T${String(DEADLINE_HOUR).padStart(2, '0')}:00:00`;

  // Use a portable approach: calculate Israel's UTC offset for that date
  // Israel is typically UTC+2 (winter) or UTC+3 (summer/DST)
  const tempDate = new Date(israelDateStr + 'Z'); // treat as UTC temporarily
  // Get the offset by comparing local representation in Israel TZ
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: ISRAEL_TZ,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  });
  // We need to find what UTC time corresponds to DEADLINE_HOUR:00 Israel time
  // Binary approach: start with an estimate and adjust
  // Israel is UTC+2 or UTC+3, so DEADLINE_HOUR Israel = DEADLINE_HOUR - 2 or -3 UTC
  // Try UTC+2 first, then check
  let utcEstimate = new Date(`${year}-${month}-${dateStr}T${String(DEADLINE_HOUR - 2).padStart(2, '0')}:00:00Z`);
  const parts = formatter.formatToParts(utcEstimate);
  const hourInIsrael = parseInt(parts.find(p => p.type === 'hour')?.value || '0');

  if (hourInIsrael !== DEADLINE_HOUR) {
    // Must be UTC+3 (DST), so adjust
    utcEstimate = new Date(`${year}-${month}-${dateStr}T${String(DEADLINE_HOUR - 3).padStart(2, '0')}:00:00Z`);
  }

  return utcEstimate;
}

/**
 * Computes deadline info for all playable days (Sun-Fri) in a poll week.
 */
export function getDayDeadlines(
  weekStart: string,
  scheduledDays: DayOfWeek[],
  now: Date = new Date()
): DayDeadlineInfo[] {
  const playableDays: DayOfWeek[] = [0, 1, 2, 3, 4, 5, 6];
  const scheduledSet = new Set(scheduledDays);

  return playableDays.map(day => {
    const deadline = getDayDeadline(weekStart, day);
    let status: DayStatus;
    if (scheduledSet.has(day)) {
      status = 'scheduled';
    } else if (now > deadline) {
      status = 'closed';
    } else {
      status = 'open';
    }
    return {
      day,
      deadline: deadline.toISOString(),
      status,
    };
  });
}
