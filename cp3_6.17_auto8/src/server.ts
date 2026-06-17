import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import { GameStateManager } from './server/gameState';
import { QueueHandler } from './server/queueHandler';
import type { GameAction } from './shared/types';

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const gameState = new GameStateManager();
const queueHandler = new QueueHandler(gameState);

app.get('/api/state', (_req, res) => {
  res.json(gameState.getPublicState());
});

app.post('/api/reset', (_req, res) => {
  gameState.reset();
  queueHandler.reset();
  res.json({ success: true });
});

function broadcast(action: GameAction): void {
  const data = JSON.stringify(action);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  ws.on('message', (data: string) => {
    try {
      const action: GameAction = JSON.parse(data.toString());
      queueHandler.enqueue({
        action,
        ws,
        broadcast,
      });
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

server.listen(PORT, () => {
  console.log(`Game server running on http://localhost:${PORT}`);
  console.log(`WebSocket server ready`);
});
