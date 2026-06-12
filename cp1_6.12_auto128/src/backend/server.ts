import express from 'express';
import cors from 'cors';
import { createApiRouter } from './ApiRouter';
import { DataManager } from './DataManager';

const PORT = process.env.PORT || 3001;

async function startServer(): Promise<void> {
  const app = express();

  app.use(cors());
  app.use(express.json());

  await DataManager.initialize();

  app.use('/api', createApiRouter());

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', service: 'RuneForge API' });
  });

  app.listen(PORT, () => {
    console.log(`RuneForge API server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
