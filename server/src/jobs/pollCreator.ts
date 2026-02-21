import cron from 'node-cron';
import { createNextWeekPoll, getCurrentPoll, getPollDayDeadlines, updatePollScheduledDays, updatePollStatus } from '../services/pollService';
import { getVotesForPoll } from '../services/voteService';
import { saveSessionsForDay, getSessionsForPollAsPlain } from '../services/scheduleService';
import { generateScheduleForDay } from '../scheduler/algorithm';
import { optimize } from '../scheduler/optimizer';
import { CONFIG } from '../config';
import { DayOfWeek } from '../../../shared/types';

export function startPollCreatorJob(): void {
  // Every Friday at 00:00 Israel time - create next week's poll
  cron.schedule('0 0 * * 5', () => {
    console.log('[Cron] Checking if poll needs to be created...');
    try {
      const current = getCurrentPoll();
      if (current && current.status === 'open') {
        console.log('[Cron] Active poll exists, skipping creation');
        return;
      }

      const poll = createNextWeekPoll();
      console.log(`[Cron] Created poll for week starting ${poll.week_start}`);
    } catch (err) {
      console.error('[Cron] Failed to create poll:', err);
    }
  }, {
    timezone: CONFIG.TIMEZONE,
  });

  console.log('[Cron] Poll creator job scheduled (Friday 00:00 Israel time)');

  // Every day at 20:05 Israel time - auto-schedule days whose deadline has passed
  cron.schedule('5 20 * * *', () => {
    console.log('[Cron] Checking for days to auto-schedule...');
    try {
      const poll = getCurrentPoll();
      if (!poll || poll.status !== 'open') {
        console.log('[Cron] No open poll, skipping auto-schedule');
        return;
      }

      const dayDeadlines = getPollDayDeadlines(poll);
      const now = new Date();
      const scheduledSet = new Set(poll.scheduled_days);

      // Find days whose deadline has passed but aren't scheduled yet
      const daysToSchedule = dayDeadlines.filter(
        d => d.status === 'closed' && !scheduledSet.has(d.day)
      );

      if (daysToSchedule.length === 0) {
        console.log('[Cron] No days to schedule');
        return;
      }

      const votes = getVotesForPoll(poll.id);
      if (votes.length === 0) {
        console.log('[Cron] No votes, skipping auto-schedule');
        return;
      }

      let scheduledDays = [...poll.scheduled_days];

      for (const dayInfo of daysToSchedule) {
        console.log(`[Cron] Auto-scheduling day ${dayInfo.day}...`);
        const existingSessions = getSessionsForPollAsPlain(poll.id);
        let output = generateScheduleForDay(poll.id, poll.week_start, dayInfo.day, votes, existingSessions);
        output = optimize(output);
        saveSessionsForDay(poll.id, dayInfo.day, output.sessions);
        scheduledDays.push(dayInfo.day);
        console.log(`[Cron] Day ${dayInfo.day}: ${output.sessions.length} sessions created`);
      }

      // Update scheduled_days
      scheduledDays = [...new Set(scheduledDays)].sort((a, b) => a - b);
      updatePollScheduledDays(poll.id, scheduledDays as DayOfWeek[]);

      // If all 6 playable days are scheduled, transition poll to 'scheduled'
      if (scheduledDays.length >= 7) {
        updatePollStatus(poll.id, 'scheduled');
        console.log('[Cron] All days scheduled, poll status -> scheduled');
      }
    } catch (err) {
      console.error('[Cron] Failed to auto-schedule:', err);
    }
  }, {
    timezone: CONFIG.TIMEZONE,
  });

  console.log('[Cron] Daily auto-scheduler job scheduled (20:05 Israel time)');
}
