import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { generateMockData, calculatePricingRange } from './src/api/dataService.ts';

const app = express();
const PORT = 3010;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const mockData = generateMockData();

app.get('/api/portfolio', (req: Request, res: Response) => {
  const portfolioWithPricing = mockData.portfolio.map(item => ({
    ...item,
    pricingSuggestion: calculatePricingRange(item.id, mockData.portfolio),
  }));
  res.json(portfolioWithPricing);
});

app.post('/api/portfolio', (req: Request, res: Response) => {
  const newItem = {
    id: uuidv4(),
    ...req.body,
    createdAt: new Date().toISOString(),
    authorizations: [],
  };
  mockData.portfolio.push(newItem);
  res.json({
    ...newItem,
    pricingSuggestion: calculatePricingRange(newItem.id, mockData.portfolio),
  });
});

app.put('/api/portfolio/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const index = mockData.portfolio.findIndex(item => item.id === id);
  if (index === -1) {
    return res.status(404).json({ error: '作品不存在' });
  }
  mockData.portfolio[index] = { ...mockData.portfolio[index], ...req.body };
  res.json({
    ...mockData.portfolio[index],
    pricingSuggestion: calculatePricingRange(mockData.portfolio[index].id, mockData.portfolio),
  });
});

app.get('/api/clients', (req: Request, res: Response) => {
  res.json(mockData.clients);
});

app.post('/api/clients/:id/logs', (req: Request, res: Response) => {
  const { id } = req.params;
  const client = mockData.clients.find(c => c.id === id);
  if (!client) {
    return res.status(404).json({ error: '客户不存在' });
  }
  const newLog = {
    id: uuidv4(),
    ...req.body,
    timestamp: new Date().toISOString(),
  };
  client.logs.unshift(newLog);
  res.json(newLog);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
