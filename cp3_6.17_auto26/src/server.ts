import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { GameStateManager, GameAction, GameStateData } from './server/gameState';
import { QueueHandler, ProcessResult } from './server/queueHandler';

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const gameState = new GameStateManager();
const queueHandler = new QueueHandler(gameState);

interface ServerMessage {
  type: 'STATE_SYNC' | 'ACTION_ACK' | 'ACTION_ROLLBACK' | 'AI_ACTION' | 'GAME_OVER';
  sequence?: number;
  state?: GameStateData;
  action?: GameAction;
  winner?: string;
}

function broadcast(message: ServerMessage): void {
  const data = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function sendTo(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

queueHandler.setCallbacks(
  (result: ProcessResult) => {
    const message: ServerMessage = result.type === 'ACK'
      ? {
          type: 'ACTION_ACK',
          sequence: result.sequence,
          state: result.state,
        }
      : {
          type: 'ACTION_ROLLBACK',
          sequence: result.sequence,
        };

    broadcast(message);

    if (result.type === 'ACK' && result.state) {
      const aiMsg: ServerMessage = {
        type: 'AI_ACTION',
        state: result.state,
      };
      broadcast(aiMsg);
    }
  },
  (state: GameStateData) => {
    broadcast({
      type: 'STATE_SYNC',
      state,
    });
  },
  (winner: string) => {
    broadcast({
      type: 'GAME_OVER',
      winner,
    });
  }
);

wss.on('connection', (ws: WebSocket) => {
  console.log('[Server] New WebSocket connection');

  sendTo(ws, {
    type: 'STATE_SYNC',
    state: gameState.getState(),
  });

  ws.on('message', (data: string) => {
    try {
      const action: GameAction = JSON.parse(data.toString());
      console.log(`[Server] Received action: type=${action.type}, player=${action.playerId}, seq=${action.sequence}`);
      queueHandler.enqueue(action);
    } catch (e) {
      console.error('[Server] Failed to parse message:', e);
    }
  });

  ws.on('close', () => {
    console.log('[Server] WebSocket connection closed');
  });

  ws.on('error', (error) => {
    console.error('[Server] WebSocket error:', error);
  });
});

app.get('/api/state', (req, res) => {
  res.json(gameState.getState());
});

app.post('/api/reset', (req, res) => {
  gameState.reset();
  queueHandler.reset();
  broadcast({
    type: 'STATE_SYNC',
    state: gameState.getState(),
  });
  res.json({ success: true });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    queueSize: queueHandler.getQueueSize(),
    expectedSequence: queueHandler.getExpectedSequence(),
  });
});

server.listen(PORT, () => {
  console.log(`[Server] Listening on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket server ready`);
});
