import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import cors from 'cors';
import { QueueHandler } from './server/queueHandler';
import {
  createInitialGameState,
  loadGameState,
  chooseAICard,
  getPlayerIndex,
  saveGameState,
} from './server/gameState';
import {
  PlayerAction,
  ServerMessage,
  GameStateUpdate,
  ServerAck,
  GameState,
} from './shared/types';
import { v4 as uuidv4 } from 'uuid';

const PORT = 3001;
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const queueHandler = new QueueHandler();
let currentState: GameState = loadGameState() || createInitialGameState();

interface ClientSession {
  ws: WebSocket;
  id: string;
  latencyMs: number;
  totalLatency: number;
  latencySamples: number;
  rollbackCount: number;
  totalActions: number;
  ackedActions: number;
}

const clients = new Map<string, ClientSession>();

queueHandler.on('get_state', (callback: (state: GameState) => void) => {
  callback(currentState);
});

queueHandler.on(
  'state_changed',
  (data: { newState: GameState; playedCard: { card: any; playerId: string } }) => {
    currentState = data.newState;
    broadcastStateUpdate(data.newState, data.playedCard);

    if (data.newState.currentTurnIndex === 1 && data.newState.status === 'playing') {
      scheduleAIPlay(data.newState);
    }
  }
);

function broadcastStateUpdate(
  state: GameState,
  lastPlayedCard?: { card: any; playerId: string }
): void {
  const update: GameStateUpdate = {
    type: 'state_update',
    state,
    lastPlayedCard,
  };

  const msgStr = JSON.stringify(update);
  clients.forEach((session) => {
    if (session.ws.readyState === WebSocket.OPEN) {
      setTimeout(() => {
        session.ws.send(msgStr);
      }, session.latencyMs);
    }
  });
}

function sendMessage(session: ClientSession, message: ServerMessage): void {
  if (session.ws.readyState !== WebSocket.OPEN) return;
  setTimeout(() => {
    session.ws.send(JSON.stringify(message));
  }, session.latencyMs);
}

function simulateLatency(session: ClientSession, action: PlayerAction): void {
  const actualLatency = session.latencyMs;
  const sendTime = Date.now() - action.timestamp;
  const roundTrip = sendTime + actualLatency * 2;

  session.latencySamples++;
  session.totalLatency += roundTrip;
}

function scheduleAIPlay(state: GameState): void {
  setTimeout(() => {
    if (state.currentTurnIndex !== 1 || state.status !== 'playing') return;

    const aiCard = chooseAICard(state);
    if (!aiCard) return;

    const aiAction: PlayerAction = {
      type: 'ai_play_card',
      playerId: 'player_ai',
      cardId: aiCard.id,
      sequence: Date.now() % 1000000,
      timestamp: Date.now(),
    };

    queueHandler.enqueue(aiAction).then((result) => {
      // AI的ack不需要广播，状态更新已经通过state_changed发出
    });
  }, 100 + Math.random() * 200);
}

wss.on('connection', (ws: WebSocket) => {
  const sessionId = uuidv4();
  const session: ClientSession = {
    ws,
    id: sessionId,
    latencyMs: 100 + Math.floor(Math.random() * 201),
    totalLatency: 0,
    latencySamples: 0,
    rollbackCount: 0,
    totalActions: 0,
    ackedActions: 0,
  };
  clients.set(sessionId, session);

  console.log(`客户端连接: ${sessionId}, 模拟延迟: ${session.latencyMs}ms`);

  broadcastStateUpdate(currentState);
  sendStatsUpdate();

  ws.on('message', async (raw: Buffer) => {
    try {
      const action: PlayerAction = JSON.parse(raw.toString());
      session.totalActions++;
      simulateLatency(session, action);

      const result = await queueHandler.enqueue(action);

      if (result.ack.type === 'ack') {
        session.ackedActions++;
      } else {
        session.rollbackCount++;
      }

      sendMessage(session, result.ack);
      sendStatsUpdate();
    } catch (e) {
      console.error('处理消息错误:', e);
    }
  });

  ws.on('close', () => {
    console.log(`客户端断开: ${sessionId}`);
    clients.delete(sessionId);
  });

  ws.on('error', (err) => {
    console.error(`客户端错误 ${sessionId}:`, err);
    clients.delete(sessionId);
  });
});

function sendStatsUpdate(): void {
  let totalLatencyAll = 0;
  let samplesAll = 0;
  let rollbackAll = 0;
  let actionsAll = 0;
  let ackedAll = 0;
  let avgLatency = 0;

  clients.forEach((s) => {
    totalLatencyAll += s.totalLatency;
    samplesAll += s.latencySamples;
    rollbackAll += s.rollbackCount;
    actionsAll += s.totalActions;
    ackedAll += s.ackedActions;
  });

  if (samplesAll > 0) {
    avgLatency = Math.round(totalLatencyAll / samplesAll);
  }

  const effectivePlayRate = actionsAll > 0 ? ackedAll / actionsAll : 1;

  clients.forEach((session) => {
    const msg = {
      type: 'stats',
      avgLatency,
      rollbackCount: rollbackAll,
      effectivePlayRate: Math.round(effectivePlayRate * 100),
      currentLatency: session.latencyMs,
      queueSize: queueHandler.getQueueSize(),
    };
    sendMessage(session, msg as any);
  });
}

app.get('/api/reset', (req, res) => {
  currentState = createInitialGameState();
  queueHandler.reset();
  clients.forEach((s) => {
    s.rollbackCount = 0;
    s.totalActions = 0;
    s.ackedActions = 0;
    s.totalLatency = 0;
    s.latencySamples = 0;
    s.latencyMs = 100 + Math.floor(Math.random() * 201);
  });
  broadcastStateUpdate(currentState);
  sendStatsUpdate();
  res.json({ success: true, state: currentState });
});

app.get('/api/state', (req, res) => {
  res.json(currentState);
});

app.get('/api/set-latency', (req, res) => {
  const min = parseInt((req.query.min as string) || '100');
  const max = parseInt((req.query.max as string) || '300');
  clients.forEach((s) => {
    s.latencyMs = min + Math.floor(Math.random() * (max - min + 1));
  });
  sendStatsUpdate();
  res.json({ success: true, message: `延迟范围已设置为 ${min}-${max}ms` });
});

server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log(`WebSocket 路径: ws://localhost:${PORT}/ws`);
});
