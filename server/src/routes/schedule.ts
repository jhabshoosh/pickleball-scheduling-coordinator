import { Router, Request, Response } from 'express';
import { adminAuth } from '../middleware/adminAuth';
import { getPollById, updatePollStatus } from '../services/pollService';
import { getVotesForPoll } from '../services/voteService';
import { saveSessions, getSessionsForPoll } from '../services/scheduleService';
import { generateSchedule } from '../scheduler/algorithm';
import { optimize } from '../scheduler/optimizer';
import { formatWhatsAppMessage } from '../services/whatsappService';
import { getDb } from '../db/connection';

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
