import { Router, Request, Response } from 'express';
import { getDb } from '../db/connection';
import { z } from 'zod';
import { Player } from '../../../shared/types';

const router = Router();

const createPlayerSchema = z.object({
  name: z.string().min(1).max(50).trim(),
});

// POST /api/players - Register or find player
router.post('/', (req: Request, res: Response) => {
  const parsed = createPlayerSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.errors[0].message });
    return;
  }

  const db = getDb();
  const { name } = parsed.data;

  // Check if player already exists
  const existing = db.prepare('SELECT * FROM players WHERE name = ?').get(name) as Player | undefined;
  if (existing) {
    res.json(existing);
    return;
  }

  const result = db.prepare('INSERT INTO players (name) VALUES (?)').run(name);
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(result.lastInsertRowid) as Player;
  res.status(201).json(player);
});

// GET /api/players - List all players
router.get('/', (_req: Request, res: Response) => {
  const db = getDb();
  const players = db.prepare('SELECT * FROM players ORDER BY name ASC').all() as Player[];
  res.json(players);
});

// GET /api/players/:id - Get player by id
router.get('/:id', (req: Request, res: Response) => {
  const db = getDb();
  const player = db.prepare('SELECT * FROM players WHERE id = ?').get(req.params.id) as Player | undefined;
  if (!player) {
    res.status(404).json({ error: 'Player not found' });
    return;
  }
  res.json(player);
});

export default router;
