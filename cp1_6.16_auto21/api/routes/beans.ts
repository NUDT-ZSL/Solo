import { Router } from 'express';
import { mockBeans } from '../data/mockData';

const router = Router();

router.get('/', (_req, res) => {
  res.json(mockBeans);
});

export default router;
