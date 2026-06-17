import express from 'express';
import cors from 'cors';
import { addBrew, getBrews, deleteBrew, getStats, SortType } from './dataStore.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.post('/api/brews', (req, res) => {
  const { origin, grindLevel, waterTemp, ratio, pourTime, flavorTags, rating } = req.body;

  if (!origin || !grindLevel || !waterTemp || !ratio || !pourTime || !flavorTags || !rating) {
    res.status(400).json({ success: false, error: '所有字段均为必填' });
    return;
  }

  const brew = addBrew({ origin, grindLevel, waterTemp, ratio, pourTime, flavorTags, rating });
  res.status(201).json({ success: true, data: brew });
});

app.get('/api/brews', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 12;
  const sort = (req.query.sort as string) || 'date_desc';
  const validSort = ['date_desc', 'rating_desc', 'rating_asc'].includes(sort)
    ? (sort as SortType)
    : 'date_desc';
  const result = getBrews(page, limit, validSort);
  res.json(result);
});

app.delete('/api/brews/:id', (req, res) => {
  const success = deleteBrew(req.params.id);
  if (!success) {
    res.status(404).json({ success: false, error: '记录未找到' });
    return;
  }
  res.json({ success: true });
});

app.get('/api/brews/stats', (req, res) => {
  const range = (req.query.range as string) || 'all';
  const validRange = ['all', '30d', '7d'].includes(range) ? range : 'all';
  const stats = getStats(validRange as 'all' | '30d' | '7d');
  res.json(stats);
});

app.listen(PORT, () => {
  console.log(`☕ 咖啡日志服务器运行在 http://localhost:${PORT}`);
});
