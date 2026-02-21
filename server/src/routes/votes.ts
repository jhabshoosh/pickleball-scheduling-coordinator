import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { submitVote, getVoteByPollAndPlayer, deleteVote } from '../services/voteService';
import { getPollById } from '../services/pollService';

const router = Router();

const voteSchema = z.object({
  poll_id: z.number().int().positive(),
  player_id: z.number().int().positive(),
  available_days: z.array(z.number().int().min(0).max(6)).min(1),
  day_preferences: z.array(z.object({
    day: z.number().int().min(0).max(6),
    rank: z.number().int().positive(),
  })),
  min_sessions: z.number().int().min(1).max(7).default(1),
  max_sessions: z.number().int().min(1).max(7).default(7),
  constraints: z.array(z.union([
    z.object({
      type: z.literal('mutual_exclusion'),
      days: z.tuple([z.number().int().min(0).max(6), z.number().int().min(0).max(6)]),
    }),
    z.object({
      type: z.literal('no_consecutive'),
    }),
  ])).default([]),
});

// POST /api/votes - Submit or update vote
router.post('/', (req: Request, res: Response) => {
  const parsed = voteSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const poll = getPollById(parsed.data.poll_id);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }

  if (poll.status !== 'open') {
    res.status(400).json({ error: 'Poll is not open for voting' });
    return;
  }

  // Check if deadline has passed
  const deadline = new Date(poll.voting_deadline);
  if (new Date() > deadline) {
    res.status(400).json({ error: 'Voting deadline has passed' });
    return;
  }

  const vote = submitVote(parsed.data as any);
  res.json(vote);
});

// GET /api/votes/:pollId/:playerId - Get player's vote
router.get('/:pollId/:playerId', (req: Request, res: Response) => {
  const vote = getVoteByPollAndPlayer(
    Number(req.params.pollId),
    Number(req.params.playerId)
  );
  if (!vote) {
    res.status(404).json({ error: 'Vote not found' });
    return;
  }
  res.json(vote);
});

// DELETE /api/votes/:pollId/:playerId - Retract vote
router.delete('/:pollId/:playerId', (req: Request, res: Response) => {
  const poll = getPollById(Number(req.params.pollId));
  if (!poll || poll.status !== 'open') {
    res.status(400).json({ error: 'Cannot retract vote - poll is not open' });
    return;
  }

  const deleted = deleteVote(
    Number(req.params.pollId),
    Number(req.params.playerId)
  );
  if (!deleted) {
    res.status(404).json({ error: 'Vote not found' });
    return;
  }
  res.json({ success: true });
});

export default router;
