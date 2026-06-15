import { Router, type Request, type Response } from 'express';
import { changesDB } from '../db.js';

const router = Router();

router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { since, memberId } = req.query;

    const query: Record<string, unknown> = {};

    if (since) {
      query.createdAt = { $gt: String(since) };
    }

    if (memberId) {
      query.affectedMembers = String(memberId);
    }

    const changes = await changesDB.find(query).sort({ createdAt: -1 });
    res.json({ success: true, data: changes });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Server internal error' });
  }
});

export default router;
