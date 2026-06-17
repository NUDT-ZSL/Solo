import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import http from 'http';
import { createInitialGameState, getPublicState } from './server/gameState';
import { MessageQueue, ServerResponse, simulateAiPlay } from './server/queueHandler';

const PORT = 3001;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

let gameState = createInitialGameState();
let messageQueue: MessageQueue;

let playerWs: WebSocket | null = null;

function broadcastStateUpdate(data: any) {
  if (data.playerId === 'player' && playerWs && playerWs.readyState === WebSocket.OPEN) {
    playerWs.send(
      JSON.stringify({
        type: 'state_update',
        state: data.state,
        playedCard: data.playedCard,
        damage: data.damage,
      })
    );
  }
}

function handleAiTurn() {
  const currentState = messageQueue.getGameState();
  if (currentState.isGameOver) return;
  if (currentState.currentTurn !== 'ai') return;

  const aiDelay = 100 + Math.random() * 200;

  setTimeout(() => {
    const state = messageQueue.getGameState();
    if (state.isGameOver || state.currentTurn !== 'ai') return;

    const responses = simulateAiPlay(messageQueue, state);
    if (responses) {
      for (const res of responses) {
        if (res.type === 'ack' && playerWs && playerWs.readyState === WebSocket.OPEN) {
          const newState = messageQueue.getGameState();
          if (newState.currentTurn === 'player' || newState.isGameOver) {
            playerWs.send(
              JSON.stringify({
                type: 'state_update',
                state: getPublicState(newState, 'player'),
                playedCard: (res.payload as any)?.playedCard,
                damage: (res.payload as any)?.damage,
                fromAi: true,
              })
            );
          }
        }
      }
    }
  }, aiDelay);
}

messageQueue = new MessageQueue(
  gameState,
  broadcastStateUpdate,
  handleAiTurn
);

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', queueSize: messageQueue.getQueueSize() });
});

app.post('/api/restart', (req, res) => {
  const newState = createInitialGameState();
  messageQueue.reset(newState);
  gameState = newState;

  if (playerWs && playerWs.readyState === WebSocket.OPEN) {
    playerWs.send(
      JSON.stringify({
        type: 'game_start',
        state: getPublicState(newState, 'player'),
      })
    );
  }

  res.json({ success: true, state: getPublicState(newState, 'player') });
});

wss.on('connection', (ws) => {
  console.log('新的WebSocket连接');
  playerWs = ws;

  ws.send(
    JSON.stringify({
      type: 'game_start',
      state: getPublicState(messageQueue.getGameState(), 'player'),
    })
  );

  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());

      const latency = 100 + Math.random() * 200;

      setTimeout(() => {
        if (message.type === 'play_card' || message.type === 'ping') {
          const responses = messageQueue.addMessage({
            sequence: message.sequence,
            playerId: 'player',
            type: message.type,
            payload: message.payload,
          });

          for (const response of responses) {
            if (ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(response));
            }
          }
        }
      }, latency);
    } catch (error) {
      console.error('处理消息时出错:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket连接关闭');
    if (playerWs === ws) {
      playerWs = null;
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket错误:', error);
  });
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket路径: ws://localhost:${PORT}/ws`);
});
