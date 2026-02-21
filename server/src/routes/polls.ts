import { Router, Request, Response } from 'express';
import { getCurrentPoll, getPollById } from '../services/pollService';
import { getVotesForPoll } from '../services/voteService';
import { getSessionsForPoll } from '../services/scheduleService';

const router = Router();

// GET /api/polls/current - Get active poll
router.get('/current', (_req: Request, res: Response) => {
  const poll = getCurrentPoll();
  if (!poll) {
    res.status(404).json({ error: 'No active poll' });
    return;
  }
  res.json(poll);
});

// GET /api/polls/:id - Get poll by id
router.get('/:id', (req: Request, res: Response) => {
  const poll = getPollById(Number(req.params.id));
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  res.json(poll);
});

// GET /api/polls/:id/votes - All votes for poll
router.get('/:id/votes', (req: Request, res: Response) => {
  const poll = getPollById(Number(req.params.id));
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  const votes = getVotesForPoll(poll.id);
  res.json(votes);
});

// GET /api/polls/:id/results - Schedule results
router.get('/:id/results', (req: Request, res: Response) => {
  const poll = getPollById(Number(req.params.id));
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  const sessions = getSessionsForPoll(poll.id);
  res.json({ poll, sessions });
});

export default router;
