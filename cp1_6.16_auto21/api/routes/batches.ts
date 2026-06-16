import { Router } from 'express';
import { mockBatches, addBatch, updateBeanStock } from '../data/mockData';
import { BeanManager } from '../../src/beans/BeanManager';
import type { CreateBatchRequest } from '../../src/types';

const router = Router();

router.get('/', (_req, res) => {
  res.json(mockBatches);
});

router.post('/', (req, res) => {
  const data = req.body as CreateBatchRequest;
  const score = BeanManager.calculateRoastScore(
    data.inputTemp,
    data.outputTemp,
    data.roastLevel,
    data.roastDuration
  );

  const bean = mockBatches.find(b => b.beanId === data.beanId);
  const batch = addBatch({
    ...data,
    beanName: bean?.beanName || '未知生豆',
    score,
  });

  updateBeanStock(data.beanId, 1);

  res.status(201).json(batch);
});

export default router;
