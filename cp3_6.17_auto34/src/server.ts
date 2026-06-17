import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import {
  initGame,
  validateAction,
  applyAction,
  generateAIPlay,
  getState,
  type PlayerAction,
  type GameState,
} from './server/gameState';
import {
  enqueue,
  processQueue,
  type ProcessResult,
} from './server/queueHandler';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const clients = new Map<string, WebSocket>();
const aiPlayerId = 'ai-player';
let gameInitialized = false;

type WsMessage = {
  type: 'action' | 'init' | 'ping';
  data: unknown;
};

type WsResponse = {
  type: 'state' | 'confirmation' | 'rollback' | 'error' | 'init';
  data: unknown;
  timestamp: number;
};

const broadcast = (response: WsResponse): void => {
  const message = JSON.stringify(response);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
};

const sendToClient = (clientId: string, response: WsResponse): void => {
  const client = clients.get(clientId);
  if (client && client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(response));
  }
};

const broadcastState = (): void => {
  const state = getState();
  broadcast({
    type: 'state',
    data: state,
    timestamp: Date.now(),
  });
};

const handleAction = (action: PlayerAction, clientId: string): void => {
  if (!gameInitialized) {
    sendToClient(clientId, {
      type: 'error',
      data: 'Game not initialized',
      timestamp: Date.now(),
    });
    return;
  }

  enqueue(action);

  const results = processQueue(validateAction, (act) => {
    applyAction(act);
  });

  processResults(results, clientId);
};

const processResults = (results: ProcessResult[], clientId: string): void => {
  for (const result of results) {
    if (result.success && result.confirmation) {
      sendToClient(clientId, {
        type: 'confirmation',
        data: result.confirmation,
        timestamp: Date.now(),
      });
      broadcastState();

      setTimeout(() => {
        const state = getState();
        if (state.gamePhase === 'playing' && state.currentPlayerId === aiPlayerId) {
          const aiAction = generateAIPlay(aiPlayerId);
          if (aiAction) {
            const currentState = getState();
            const playerIds = Object.keys(currentState.players);
            const humanPlayerId = playerIds.find((id) => id !== aiPlayerId);
            enqueue(aiAction);
            const aiResults = processQueue(validateAction, (act) => {
              applyAction(act);
            });
            aiResults.forEach((aiResult) => {
              if (aiResult.success && aiResult.confirmation && humanPlayerId) {
                sendToClient(humanPlayerId, {
                  type: 'confirmation',
                  data: aiResult.confirmation,
                  timestamp: Date.now(),
                });
              }
            });
            broadcastState();
          }
        }
      }, 1000);
    } else if (result.rollback) {
      sendToClient(clientId, {
        type: 'rollback',
        data: result.rollback,
        timestamp: Date.now(),
      });
    }
  }
};

const handleInit = (clientId: string): void => {
  const playerIds = [clientId, aiPlayerId];
  initGame(playerIds);
  gameInitialized = true;

  const state = getState();
  sendToClient(clientId, {
    type: 'init',
    data: {
      playerId: clientId,
      aiPlayerId,
      state,
    },
    timestamp: Date.now(),
  });

  broadcastState();
};

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  clients.set(clientId, ws);

  console.log(`Client connected: ${clientId}`);

  ws.on('message', (rawData) => {
    try {
      const message: WsMessage = JSON.parse(rawData.toString());

      switch (message.type) {
        case 'init':
          handleInit(clientId);
          break;
        case 'action':
          handleAction(message.data as PlayerAction, clientId);
          break;
        case 'ping':
          ws.send(
            JSON.stringify({
              type: 'pong',
              timestamp: Date.now(),
            })
          );
          break;
        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error parsing message:', error);
      sendToClient(clientId, {
        type: 'error',
        data: 'Invalid message format',
        timestamp: Date.now(),
      });
    }
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${clientId}`);
    clients.delete(clientId);
    gameInitialized = false;
  });

  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', clients: clients.size });
});

app.get('/state', (req, res) => {
  if (!gameInitialized) {
    res.json({ status: 'not_initialized' });
    return;
  }
  res.json(getState());
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server ready`);
});

export { wss, server };
