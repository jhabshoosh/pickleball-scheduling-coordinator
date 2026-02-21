import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config';

export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const code = req.headers['x-admin-code'] as string;
  if (!code || code !== CONFIG.ADMIN_CODE) {
    res.status(401).json({ error: 'Unauthorized: invalid admin code' });
    return;
  }
  next();
}
