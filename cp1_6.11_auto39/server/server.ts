import express from 'express';
import cors from 'cors';
import * as networkController from './controllers/networkController';
import { ensureDataDir } from './repositories/fileRepository';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api/networks', networkController.listNetworks);
app.get('/api/networks/:id', networkController.getNetwork);
app.post('/api/networks', networkController.createNetwork);
app.put('/api/networks/:id', networkController.updateNetwork);
app.delete('/api/networks/:id', networkController.deleteNetwork);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

async function startServer(): Promise<void> {
  await ensureDataDir();
  
  app.listen(PORT, () => {
    console.log(`
╔══════════════════════════════════════════════════════════════╗
║           因果织网 Causal Weave Server                        ║
╠══════════════════════════════════════════════════════════════╣
║  🚀 Server running on: http://localhost:${PORT}               ║
║  📁 Data directory: server/data/networks                    ║
╚══════════════════════════════════════════════════════════════╝
    `);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

export default app;
