import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { getPollById, updatePollStatus, updatePollScheduledDays } from '../services/pollService';
import { getVotesForPoll } from '../services/voteService';
import { saveSessions, saveSessionsForDay, getSessionsForPoll, getSessionsForPollAsPlain } from '../services/scheduleService';
import { generateSchedule, generateScheduleForDay } from '../scheduler/algorithm';
import { optimize } from '../scheduler/optimizer';
import { formatWhatsAppMessage } from '../services/whatsappService';
import { getDb } from '../db/connection';
import { DayOfWeek } from '../../../shared/types';

const router = Router();

// POST /api/schedule/:pollId/generate - Run algorithm (admin)
router.post('/:pollId/generate', adminAuth, (req: Request, res: Response) => {
  const pollId = Number(req.params.pollId);
  const poll = getPollById(pollId);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  const votes = getVotesForPoll(pollId);
  if (votes.length === 0) {
    res.status(400).json({ error: 'No votes submitted' });
    return;
  }

  // Generate schedule
  let output = generateSchedule(pollId, poll.week_start, votes);
  output = optimize(output);

  // Save sessions
  saveSessions(pollId, output.sessions);

  // Mark all playable days as scheduled
  updatePollScheduledDays(pollId, [0, 1, 2, 3, 4, 5] as DayOfWeek[]);

  // Update poll status
  updatePollStatus(pollId, 'scheduled');

  // Fetch saved sessions with player details
  const sessions = getSessionsForPoll(pollId);

  // Get unscheduled players
  const db = getDb();
  const unscheduledPlayers = output.unscheduledPlayerIds.length > 0
    ? db.prepare(`SELECT * FROM players WHERE id IN (${output.unscheduledPlayerIds.map(() => '?').join(',')})`)
        .all(...output.unscheduledPlayerIds)
    : [];

  res.json({
    poll,
    sessions,
    unscheduled_players: unscheduledPlayers,
    warnings: output.warnings,
  });
});

// POST /api/schedule/:pollId/generate/:day - Run algorithm for a single day (admin)
router.post('/:pollId/generate/:day', adminAuth, (req: Request, res: Response) => {
  const pollId = Number(req.params.pollId);
  const targetDay = Number(req.params.day) as DayOfWeek;

  if (targetDay < 0 || targetDay > 5) {
    res.status(400).json({ error: 'Invalid day (must be 0-5)' });
    return;
  }

  const poll = getPollById(pollId);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  const votes = getVotesForPoll(pollId);
  if (votes.length === 0) {
    res.status(400).json({ error: 'No votes submitted' });
    return;
  }

  // Get existing sessions for constraint pre-seeding
  const existingSessions = getSessionsForPollAsPlain(pollId);

  // Generate schedule for the target day
  let output = generateScheduleForDay(pollId, poll.week_start, targetDay, votes, existingSessions);
  output = optimize(output);

  // Save sessions for this day only
  saveSessionsForDay(pollId, targetDay, output.sessions);

  // Update scheduled_days
  const scheduledDays = [...new Set([...poll.scheduled_days, targetDay])].sort((a, b) => a - b) as DayOfWeek[];
  updatePollScheduledDays(pollId, scheduledDays);

  // If all 6 playable days are scheduled, transition poll to 'scheduled'
  if (scheduledDays.length >= 6) {
    updatePollStatus(pollId, 'scheduled');
  }

  const sessions = getSessionsForPoll(pollId);

  res.json({
    poll: getPollById(pollId),
    sessions,
    day_scheduled: targetDay,
    warnings: output.warnings,
  });
});

// GET /api/schedule/:pollId/whatsapp - WhatsApp formatted text
router.get('/:pollId/whatsapp', (req: Request, res: Response) => {
  const pollId = Number(req.params.pollId);
  const poll = getPollById(pollId);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  const sessions = getSessionsForPoll(pollId);
  const text = formatWhatsAppMessage(sessions, poll.week_start);
  res.json({ text });
});

export default router;
