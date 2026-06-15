import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import { initDB } from './db.js';
import { setupWebSocket, setupMindMapREST } from './mindmapHandler.js';
import { setupNoteRoutes } from './noteHandler.js';

const app = express();
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

async function start() {
  await initDB();
  setupMindMapREST(app);
  setupNoteRoutes(app);
  setupWebSocket(wss);

  const PORT = 3001;
  server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`WebSocket available at ws://localhost:${PORT}/ws`);
  });
}

start().catch(console.error);
