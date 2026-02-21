import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { submitVote, getVoteByPollAndPlayer, deleteVote } from '../services/voteService';
import { getPollById, getPollDayDeadlines } from '../services/pollService';
import { DayOfWeek } from '../../../shared/types';

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

  // Compute which days are still open
  const dayDeadlines = getPollDayDeadlines(poll);
  const openDays = new Set(
    dayDeadlines.filter(d => d.status === 'open').map(d => d.day)
  );

  if (openDays.size === 0) {
    res.status(400).json({ error: 'Voting deadline has passed for all days' });
    return;
  }

  // Filter submitted data to only include open days, merge with existing vote for closed days
  const existingVote = getVoteByPollAndPlayer(parsed.data.poll_id, parsed.data.player_id);

  const submittedDays = parsed.data.available_days as DayOfWeek[];
  const submittedPrefs = parsed.data.day_preferences;

  // For closed/scheduled days, keep existing vote data
  const closedDaysFromExisting = existingVote
    ? existingVote.available_days.filter((d: DayOfWeek) => !openDays.has(d))
    : [];
  const closedPrefsFromExisting = existingVote
    ? existingVote.day_preferences.filter((p: any) => !openDays.has(p.day))
    : [];

  // For open days, use submitted data
  const openDaysSubmitted = submittedDays.filter(d => openDays.has(d));
  const openPrefsSubmitted = submittedPrefs.filter((p: any) => openDays.has(p.day));

  // Merge
  const mergedDays = [...closedDaysFromExisting, ...openDaysSubmitted].sort((a, b) => a - b);
  const mergedPrefs = [...closedPrefsFromExisting, ...openPrefsSubmitted];
  // Re-normalize preference ranks
  mergedPrefs.sort((a: any, b: any) => a.rank - b.rank);
  const normalizedPrefs = mergedPrefs.map((p: any, i: number) => ({ ...p, rank: i + 1 }));

  const mergedData = {
    ...parsed.data,
    available_days: mergedDays,
    day_preferences: normalizedPrefs,
  };

  // Also merge constraints: keep constraints referencing closed days from existing
  if (existingVote) {
    const closedConstraints = existingVote.constraints.filter((c: any) => {
      if (c.type === 'mutual_exclusion') {
        return !openDays.has(c.days[0]) || !openDays.has(c.days[1]);
      }
      return false; // no_consecutive applies globally, use submitted
    });
    const openConstraints = parsed.data.constraints;
    mergedData.constraints = [...closedConstraints, ...openConstraints];
  }

  const vote = submitVote(mergedData as any);
  res.json({ ...vote, open_days: [...openDays] });
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
