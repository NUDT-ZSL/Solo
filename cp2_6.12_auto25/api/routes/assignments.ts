import { Router, type Request, type Response } from 'express';
import { getAssignments } from '../data/assignments.js';

const router = Router();

router.get('/', (_req: Request, res: Response) => {
  const assignments = getAssignments();
  res.json(assignments);
});

export default router;
