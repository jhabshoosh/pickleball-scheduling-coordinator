import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { CONFIG } from '../config';
import { adminAuth } from '../middleware/adminAuth';
import { createPollForWeek, getPollById, updatePollStatus, extendDeadline, getAllPolls } from '../services/pollService';

const router = Router();

// POST /api/admin/verify - Verify admin code
router.post('/verify', (req: Request, res: Response) => {
  const schema = z.object({ code: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  if (parsed.data.code === CONFIG.ADMIN_CODE) {
    res.json({ success: true });
  } else {
    res.status(401).json({ error: 'Invalid admin code' });
  }
});

// POST /api/admin/polls/create - Manual poll creation
router.post('/polls/create', adminAuth, (req: Request, res: Response) => {
  const schema = z.object({ week_start: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const poll = createPollForWeek(parsed.data.week_start, 'admin');
  res.status(201).json(poll);
});

// GET /api/admin/polls - List all polls
router.get('/polls', adminAuth, (_req: Request, res: Response) => {
  const polls = getAllPolls();
  res.json(polls);
});

// PUT /api/admin/polls/:id/extend - Extend deadline
router.put('/polls/:id/extend', adminAuth, (req: Request, res: Response) => {
  const schema = z.object({ new_deadline: z.string() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid request' });
    return;
  }

  const poll = extendDeadline(Number(req.params.id), parsed.data.new_deadline);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  res.json(poll);
});

// PUT /api/admin/polls/:id/publish - Publish schedule
router.put('/polls/:id/publish', adminAuth, (req: Request, res: Response) => {
  const poll = updatePollStatus(Number(req.params.id), 'published');
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  res.json(poll);
});

// PUT /api/admin/polls/:id/close - Close voting
router.put('/polls/:id/close', adminAuth, (req: Request, res: Response) => {
  const poll = updatePollStatus(Number(req.params.id), 'closed');
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  res.json(poll);
});

// PUT /api/admin/polls/:id/archive - Archive poll
router.put('/polls/:id/archive', adminAuth, (req: Request, res: Response) => {
  const poll = updatePollStatus(Number(req.params.id), 'archived');
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  res.json(poll);
});

export default router;
