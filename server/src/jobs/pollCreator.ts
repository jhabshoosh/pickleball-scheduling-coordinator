import cron from 'node-cron';
import { createNextWeekPoll, getCurrentPoll } from '../services/pollService';
import { CONFIG } from '../config';

export function startPollCreatorJob(): void {
  // Every Friday at 00:00 Israel time
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
}
