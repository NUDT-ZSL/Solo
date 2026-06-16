import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { GameStateManager } from './gameState';
import { QueueHandler } from './queueHandler';
import { ClientMessage, ServerMessage, ServerState } from '../shared/types';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const gameStateManager = new GameStateManager();
const queueHandler = new QueueHandler(gameStateManager);

app.get('/api/status', (req, res) => {
  res.json({
    gameState: gameStateManager.getState(),
    queueSize: queueHandler.getQueueSize()
  });
});

app.post('/api/reset', (req, res) => {
  const state = gameStateManager.reset();
  queueHandler.reset();
  broadcast({
    type: 'STATE_UPDATE',
    gameState: state
  });
  res.json({ success: true, gameState: state });
});

function broadcast(message: ServerMessage): void {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

wss.on('connection', (ws: WebSocket) => {
  console.log('Client connected');

  const initialState: ServerState = {
    type: 'STATE_UPDATE',
    gameState: gameStateManager.getState()
  };
  ws.send(JSON.stringify(initialState));

  ws.on('message', async (data: string) => {
    try {
      const message: ClientMessage = JSON.parse(data);
      console.log('Received:', message.type, 'seq:', message.sequence);

      const result = await queueHandler.enqueue(message);
      
      setTimeout(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(result));
        }
      }, Math.floor(Math.random() * 200) + 100);

      if (result.status === 'success' && !result.gameState.gameOver) {
        broadcast({
          type: 'STATE_UPDATE',
          gameState: result.gameState
        });
      }

      if (result.gameState.gameOver) {
        broadcast({
          type: 'GAME_OVER',
          winner: result.gameState.winner || '',
          stats: {
            avgLatency: 200,
            rollbackCount: 0,
            validPlayRate: 0.95
          },
          gameState: result.gameState
        });
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });

  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket on ws://localhost:${PORT}/ws`);
});
