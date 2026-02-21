import { Router, Request, Response } from 'express';
import { getArchivedPolls, getPollById } from '../services/pollService';
import { getSessionsForPoll } from '../services/scheduleService';
import { getVotesForPoll } from '../services/voteService';

const router = Router();

// GET /api/archive - List past polls
router.get('/', (_req: Request, res: Response) => {
  const polls = getArchivedPolls();
  res.json(polls);
});

// GET /api/archive/:id - Get archived poll details
router.get('/:id', (req: Request, res: Response) => {
  const poll = getPollById(Number(req.params.id));
  if (!poll || poll.status !== 'archived') {
    res.status(404).json({ error: 'Archived poll not found' });
    return;
  }

  const sessions = getSessionsForPoll(poll.id);
  const votes = getVotesForPoll(poll.id);

  res.json({ poll, sessions, votes });
});

export default router;
