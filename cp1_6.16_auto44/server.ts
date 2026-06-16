import express from 'express';
import type { Request, Response } from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { v4 as uuidv4 } from 'uuid';
import { generateMockData, calculatePricingRange } from './src/api/dataService.ts';
import { writeFileSync, existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const DEFAULT_PORT = 3010;
const MAX_PORT_TRIES = 50;
const PORT_FILE = join(__dirname, '.server-port');

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

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', port: server.address() });
});

function findAvailablePort(startPort: number, maxTries: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const tryPort = (port: number) => {
      const testServer = createServer();
      testServer.unref();
      testServer.once('error', (err: any) => {
        if (err.code === 'EADDRINUSE' && attempts < maxTries) {
          attempts++;
          tryPort(port + 1);
        } else {
          reject(err);
        }
      });
      testServer.once('listening', () => {
        testServer.close(() => resolve(port));
      });
      testServer.listen(port, '127.0.0.1');
    };
    tryPort(startPort);
  });
}

let server: ReturnType<typeof createServer>;

async function startServer() {
  try {
    const availablePort = await findAvailablePort(DEFAULT_PORT, MAX_PORT_TRIES);
    server = createServer(app);
    server.listen(availablePort, '127.0.0.1', () => {
      const addr = server.address() as { port: number };
      console.log(`Server running on http://localhost:${addr.port}`);
      writeFileSync(PORT_FILE, String(addr.port), 'utf-8');
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
