import express, { Request, Response } from 'express';
import { InteractionRequest } from '../src/types';
import {
  adjustWeights,
  generateRecommendations,
  getAllTags,
  getWeights,
  resetWeights,
} from './recommendEngine';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

app.get('/api/recommendations', (_req: Request, res: Response) => {
  const start = Date.now();
  const books = generateRecommendations(10);
  res.json({
    books,
    timestamp: Date.now(),
    took: Date.now() - start,
  });
});

app.post('/api/interact', (req: Request, res: Response) => {
  const start = Date.now();
  const { bookId, action } = req.body as InteractionRequest;
  if (!bookId || !action) {
    res.status(400).json({ error: 'Missing bookId or action' });
    return;
  }
  adjustWeights(bookId, action);
  const books = generateRecommendations(10);
  res.json({
    books,
    timestamp: Date.now(),
    took: Date.now() - start,
  });
});

app.get('/api/preferences', (_req: Request, res: Response) => {
  res.json({
    weights: getWeights(),
    allTags: getAllTags(),
  });
});

app.post('/api/preferences/reset', (_req: Request, res: Response) => {
  resetWeights();
  const books = generateRecommendations(10);
  res.json({
    weights: getWeights(),
    allTags: getAllTags(),
    books,
    timestamp: Date.now(),
  });
});

app.listen(PORT, () => {
  console.log(`[server] 书海导览后端服务已启动: http://localhost:${PORT}`);
});

export default app;
