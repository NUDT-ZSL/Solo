import express from 'express';
import http from 'http';
import { WebSocketServer } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { GameState } from './server/gameState';
import { QueueHandler } from './server/queueHandler';
import { ClientAction, ServerMessage } from './shared/types';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const LOCAL_PLAYER_ID = 'player-local';
const AI_PLAYER_ID = 'player-ai';

const gameState = new GameState(LOCAL_PLAYER_ID, AI_PLAYER_ID);

let aiSequenceCounter = 1000;

function broadcast(msg: ServerMessage) {
  wss.clients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify(msg));
    }
  });
}

const queueHandler = new QueueHandler(gameState, broadcast);

app.get('/api/state', (_req, res) => {
  res.json(gameState.getState());
});

app.get('/api/playerIds', (_req, res) => {
  res.json({ localPlayerId: LOCAL_PLAYER_ID, aiPlayerId: AI_PLAYER_ID });
});

wss.on('connection', (ws) => {
  const initMsg: ServerMessage = {
    type: 'STATE_UPDATE',
    state: gameState.getState(),
  };
  ws.send(JSON.stringify(initMsg));

  ws.on('message', (data) => {
    try {
      const action: ClientAction = JSON.parse(data.toString());
      queueHandler.enqueue(action);

      if (action.type === 'PLAY_CARD') {
        setTimeout(() => {
          const aiAction = gameState.generateAIAction(AI_PLAYER_ID);
          if (aiAction) {
            aiAction.sequence = aiSequenceCounter++;
            queueHandler.enqueue(aiAction);
          }
        }, 100 + Math.random() * 200);
      }
    } catch (err) {
      console.error('Failed to parse message:', err);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket on ws://localhost:${PORT}/ws`);
});
