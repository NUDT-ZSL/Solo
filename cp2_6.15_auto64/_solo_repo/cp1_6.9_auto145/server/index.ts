import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ==================== 类型定义 ====================
interface Card {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  content: string;
  color: string;
  sentiment: number; // -1 ~ 1
  createdAt: number;
}

interface Connection {
  id: string;
  fromCardId: string;
  toCardId: string;
  createdAt: number;
}

interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  ws: WebSocket;
}

interface BoardState {
  cards: Record<string, Card>;
  connections: Record<string, Connection>;
}

type ActionType =
  | 'createCard'
  | 'updateCard'
  | 'deleteCard'
  | 'createConnection'
  | 'deleteConnection'
  | 'autoLayout';

interface HistoryAction {
  type: ActionType;
  payload: any;
  inverse: any;
  timestamp: number;
}

// ==================== 情感词库 ====================
const POSITIVE_WORDS: { word: string; weight: number }[] = [
  { word: '好', weight: 0.8 }, { word: '棒', weight: 0.9 }, { word: '优秀', weight: 0.9 },
  { word: '厉害', weight: 0.85 }, { word: '喜欢', weight: 0.9 }, { word: '爱', weight: 0.95 },
  { word: '完美', weight: 1.0 }, { word: '精彩', weight: 0.9 }, { word: '创新', weight: 0.7 },
  { word: '创意', weight: 0.7 }, { word: '强大', weight: 0.8 }, { word: '赞', weight: 0.9 },
  { word: '开心', weight: 0.85 }, { word: '快乐', weight: 0.9 }, { word: '满意', weight: 0.8 },
  { word: '惊喜', weight: 0.9 }, { word: '惊艳', weight: 0.95 }, { word: '突破', weight: 0.75 },
  { word: '成功', weight: 0.9 }, { word: '胜利', weight: 0.9 }, { word: 'great', weight: 0.9 },
  { word: 'good', weight: 0.7 }, { word: 'excellent', weight: 0.95 }, { word: 'amazing', weight: 0.95 },
  { word: 'awesome', weight: 0.9 }, { word: 'love', weight: 0.95 }, { word: 'perfect', weight: 1.0 },
  { word: 'wonderful', weight: 0.9 }, { word: 'fantastic', weight: 0.95 }, { word: 'brilliant', weight: 0.9 },
  { word: 'creative', weight: 0.75 }, { word: 'innovative', weight: 0.8 }, { word: 'happy', weight: 0.85 },
  { word: 'beautiful', weight: 0.85 }, { word: 'smart', weight: 0.8 }, { word: 'clever', weight: 0.8 },
];

const NEGATIVE_WORDS: { word: string; weight: number }[] = [
  { word: '差', weight: 0.8 }, { word: '烂', weight: 0.9 }, { word: '糟糕', weight: 0.9 },
  { word: '讨厌', weight: 0.85 }, { word: '难用', weight: 0.8 }, { word: '失败', weight: 0.9 },
  { word: '问题', weight: 0.5 }, { word: '错误', weight: 0.6 }, { word: '困难', weight: 0.6 },
  { word: '复杂', weight: 0.5 }, { word: '慢', weight: 0.5 }, { word: '卡', weight: 0.6 },
  { word: '生气', weight: 0.85 }, { word: '失望', weight: 0.8 }, { word: '痛苦', weight: 0.9 },
  { word: '不好', weight: 0.7 }, { word: '不行', weight: 0.7 }, { word: '垃圾', weight: 0.95 },
  { word: 'bad', weight: 0.75 }, { word: 'terrible', weight: 0.95 }, { word: 'awful', weight: 0.95 },
  { word: 'worse', weight: 0.85 }, { word: 'worst', weight: 1.0 }, { word: 'hate', weight: 0.9 },
  { word: 'disappointing', weight: 0.85 }, { word: 'fail', weight: 0.9 }, { word: 'failure', weight: 0.9 },
  { word: 'problem', weight: 0.5 }, { word: 'issue', weight: 0.5 }, { word: 'difficult', weight: 0.6 },
  { word: 'complicated', weight: 0.55 }, { word: 'slow', weight: 0.5 }, { word: 'angry', weight: 0.85 },
  { word: 'sad', weight: 0.8 }, { word: 'ugly', weight: 0.75 }, { word: 'stupid', weight: 0.8 },
];

// ==================== 全局状态 ====================
let state: BoardState = {
  cards: {},
  connections: {},
};

const users: Record<string, User> = {};
const undoStack: HistoryAction[] = [];
const redoStack: HistoryAction[] = [];
const MAX_HISTORY = 50;

const AVATARS = ['🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🦄', '🐙', '🦋', '🌸', '⭐', '🌙', '☀️', '🔥'];
const COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9'];

// ==================== 情感分析 ====================
function analyzeSentiment(text: string): number {
  if (!text || text.trim().length === 0) return 0;
  const lowerText = text.toLowerCase();
  let positiveScore = 0;
  let negativeScore = 0;

  for (const { word, weight } of POSITIVE_WORDS) {
    const regex = new RegExp(word.toLowerCase(), 'g');
    const matches = lowerText.match(regex);
    if (matches) {
      positiveScore += matches.length * weight;
    }
  }

  for (const { word, weight } of NEGATIVE_WORDS) {
    const regex = new RegExp(word.toLowerCase(), 'g');
    const matches = lowerText.match(regex);
    if (matches) {
      negativeScore += matches.length * weight;
    }
  }

  const total = positiveScore + negativeScore;
  if (total === 0) return 0;
  return (positiveScore - negativeScore) / total;
}

function sentimentToColor(sentiment: number): string {
  if (sentiment === 0) return '#CCCCCC';
  const t = (sentiment + 1) / 2; // 0~1
  // 从暖橙红(-1)到灰(0)到冷蓝紫(1)
  if (sentiment < 0) {
    // 橙红渐变: #FF6B35 (消极) -> #CCCCCC (中性)
    const negT = Math.abs(sentiment);
    const r = Math.round(255 * (1 - 0.2 * negT));
    const g = Math.round(107 + 148 * (1 - negT));
    const b = Math.round(53 + 150 * (1 - negT));
    return `rgb(${r},${g},${b})`;
  } else {
    // 蓝紫渐变: #CCCCCC (中性) -> #9B59B6 (积极)
    const r = Math.round(204 - 49 * t);
    const g = Math.round(204 - 86 * t);
    const b = Math.round(204 - 34 * t);
    return `rgb(${r},${g},${b})`;
  }
}

// ==================== 力导向布局 ====================
function forceDirectedLayout() {
  const cardIds = Object.keys(state.cards);
  if (cardIds.length === 0) return;

  const nodes = cardIds.map((id) => ({
    id,
    x: state.cards[id].x,
    y: state.cards[id].y,
    vx: 0,
    vy: 0,
    w: state.cards[id].width,
    h: state.cards[id].height,
  }));

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const edges = Object.values(state.connections).map((c) => ({
    from: c.fromCardId,
    to: c.toCardId,
  }));

  const ITERATIONS = 300;
  const REPULSION = 80000;
  const ATTRACTION = 0.005;
  const DAMPING = 0.9;
  const CENTER_X = 0;
  const CENTER_Y = 0;
  const CENTER_GRAVITY = 0.01;
  const PADDING = 40;

  for (let iter = 0; iter < ITERATIONS; iter++) {
    // 斥力
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let distSq = dx * dx + dy * dy;
        if (distSq < 1) distSq = 1;
        const dist = Math.sqrt(distSq);
        const force = REPULSION / distSq;
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        a.vx += fx;
        a.vy += fy;
        b.vx -= fx;
        b.vy -= fy;
      }
    }

    // 引力
    for (const edge of edges) {
      const a = nodeMap.get(edge.from);
      const b = nodeMap.get(edge.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const idealDist = 280;
      const displacement = dist - idealDist;
      const fx = (dx / dist) * displacement * ATTRACTION;
      const fy = (dy / dist) * displacement * ATTRACTION;
      a.vx += fx;
      a.vy += fy;
      b.vx -= fx;
      b.vy -= fy;
    }

    // 中心引力
    for (const n of nodes) {
      n.vx += (CENTER_X - n.x) * CENTER_GRAVITY;
      n.vy += (CENTER_Y - n.y) * CENTER_GRAVITY;
    }

    // 应用速度
    for (const n of nodes) {
      n.vx *= DAMPING;
      n.vy *= DAMPING;
      const speed = Math.sqrt(n.vx * n.vx + n.vy * n.vy);
      if (speed > 100) {
        n.vx = (n.vx / speed) * 100;
        n.vy = (n.vy / speed) * 100;
      }
      n.x += n.vx;
      n.y += n.vy;
    }
  }

  // 找到最小坐标平移到原点附近
  let minX = Infinity, minY = Infinity;
  for (const n of nodes) {
    if (n.x < minX) minX = n.x;
    if (n.y < minY) minY = n.y;
  }
  const offsetX = -minX + PADDING;
  const offsetY = -minY + PADDING;

  const oldPositions: Record<string, { x: number; y: number }> = {};
  for (const n of nodes) {
    oldPositions[n.id] = { x: state.cards[n.id].x, y: state.cards[n.id].y };
    state.cards[n.id].x = n.x + offsetX;
    state.cards[n.id].y = n.y + offsetY;
  }

  return { oldPositions };
}

// ==================== 历史记录 ====================
function pushHistory(action: HistoryAction) {
  undoStack.push(action);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  redoStack.length = 0;
}

function undo(): HistoryAction | null {
  if (undoStack.length === 0) return null;
  const action = undoStack.pop()!;
  redoStack.push(action);
  applyInverse(action);
  return action;
}

function redo(): HistoryAction | null {
  if (redoStack.length === 0) return null;
  const action = redoStack.pop()!;
  undoStack.push(action);
  applyAction(action);
  return action;
}

function applyAction(action: HistoryAction) {
  switch (action.type) {
    case 'createCard':
      state.cards[action.payload.id] = { ...action.payload };
      break;
    case 'updateCard':
      Object.assign(state.cards[action.payload.id], action.payload.changes);
      break;
    case 'deleteCard':
      delete state.cards[action.payload.id];
      break;
    case 'createConnection':
      state.connections[action.payload.id] = { ...action.payload };
      break;
    case 'deleteConnection':
      delete state.connections[action.payload.id];
      break;
    case 'autoLayout':
      for (const id in action.payload.positions) {
        if (state.cards[id]) {
          state.cards[id].x = action.payload.positions[id].x;
          state.cards[id].y = action.payload.positions[id].y;
        }
      }
      break;
  }
}

function applyInverse(action: HistoryAction) {
  switch (action.type) {
    case 'createCard':
      delete state.cards[action.inverse.id];
      break;
    case 'updateCard':
      Object.assign(state.cards[action.payload.id], action.inverse);
      break;
    case 'deleteCard':
      state.cards[action.inverse.id] = { ...action.inverse.card };
      // 恢复关联连线
      for (const conn of action.inverse.connections) {
        state.connections[conn.id] = { ...conn };
      }
      break;
    case 'createConnection':
      delete state.connections[action.inverse.id];
      break;
    case 'deleteConnection':
      state.connections[action.inverse.id] = { ...action.inverse.connection };
      break;
    case 'autoLayout':
      for (const id in action.inverse.oldPositions) {
        if (state.cards[id]) {
          state.cards[id].x = action.inverse.oldPositions[id].x;
          state.cards[id].y = action.inverse.oldPositions[id].y;
        }
      }
      break;
  }
}

// ==================== 广播 ====================
function broadcastMessage(message: any, excludeUserId?: string) {
  const data = JSON.stringify(message);
  for (const uid in users) {
    if (uid === excludeUserId) continue;
    const ws = users[uid].ws;
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  }
}

function getUsersInfo() {
  return Object.values(users).map(({ id, name, avatar, color }) => ({
    id, name, avatar, color,
  }));
}

function broadcastState(excludeUserId?: string) {
  broadcastMessage({
    type: 'state',
    payload: state,
    users: getUsersInfo(),
  }, excludeUserId);
}

// ==================== WebSocket 消息处理 ====================
interface WSMessage {
  type: string;
  payload: any;
}

function handleMessage(userId: string, rawMsg: string) {
  try {
    const msg: WSMessage = JSON.parse(rawMsg);
    const user = users[userId];
    if (!user) return;

    switch (msg.type) {
      case 'createCard': {
        const card: Card = {
          id: uuidv4(),
          x: msg.payload.x ?? 0,
          y: msg.payload.y ?? 0,
          width: msg.payload.width ?? 220,
          height: msg.payload.height ?? 160,
          title: msg.payload.title ?? '',
          content: msg.payload.content ?? '',
          color: '#CCCCCC',
          sentiment: 0,
          createdAt: Date.now(),
        };
        state.cards[card.id] = card;
        pushHistory({
          type: 'createCard',
          payload: { ...card },
          inverse: { id: card.id },
          timestamp: Date.now(),
        });
        broadcastState();
        break;
      }

      case 'updateCard': {
        const { id, changes } = msg.payload;
        if (!state.cards[id]) return;
        const prev = { ...state.cards[id] };
        Object.assign(state.cards[id], changes);
        // 重新计算情感
        if (changes.title !== undefined || changes.content !== undefined) {
          const sentiment = analyzeSentiment(state.cards[id].title + ' ' + state.cards[id].content);
          state.cards[id].sentiment = sentiment;
          state.cards[id].color = sentimentToColor(sentiment);
        }
        const changesForHistory = { ...changes };
        if (changes.title !== undefined || changes.content !== undefined) {
          changesForHistory.sentiment = state.cards[id].sentiment;
          changesForHistory.color = state.cards[id].color;
        }
        pushHistory({
          type: 'updateCard',
          payload: { id, changes: changesForHistory },
          inverse: {
            x: prev.x,
            y: prev.y,
            width: prev.width,
            height: prev.height,
            title: prev.title,
            content: prev.content,
            sentiment: prev.sentiment,
            color: prev.color,
          },
          timestamp: Date.now(),
        });
        broadcastState();
        break;
      }

      case 'deleteCard': {
        const { id } = msg.payload;
        if (!state.cards[id]) return;
        const card = { ...state.cards[id] };
        const relatedConns: Connection[] = [];
        for (const cid in state.connections) {
          const conn = state.connections[cid];
          if (conn.fromCardId === id || conn.toCardId === id) {
            relatedConns.push({ ...conn });
            delete state.connections[cid];
          }
        }
        delete state.cards[id];
        pushHistory({
          type: 'deleteCard',
          payload: { id },
          inverse: { id, card, connections: relatedConns },
          timestamp: Date.now(),
        });
        broadcastState();
        break;
      }

      case 'createConnection': {
        const { fromCardId, toCardId } = msg.payload;
        if (!state.cards[fromCardId] || !state.cards[toCardId] || fromCardId === toCardId) return;
        // 检查是否已存在
        for (const cid in state.connections) {
          const c = state.connections[cid];
          if ((c.fromCardId === fromCardId && c.toCardId === toCardId) ||
              (c.fromCardId === toCardId && c.toCardId === fromCardId)) {
            return;
          }
        }
        const conn: Connection = {
          id: uuidv4(),
          fromCardId,
          toCardId,
          createdAt: Date.now(),
        };
        state.connections[conn.id] = conn;
        pushHistory({
          type: 'createConnection',
          payload: { ...conn },
          inverse: { id: conn.id },
          timestamp: Date.now(),
        });
        broadcastState();
        break;
      }

      case 'deleteConnection': {
        const { id } = msg.payload;
        if (!state.connections[id]) return;
        const conn = { ...state.connections[id] };
        delete state.connections[id];
        pushHistory({
          type: 'deleteConnection',
          payload: { id },
          inverse: { id, connection: conn },
          timestamp: Date.now(),
        });
        broadcastState();
        break;
      }

      case 'autoLayout': {
        const result = forceDirectedLayout();
        if (!result) return;
        const positions: Record<string, { x: number; y: number }> = {};
        for (const id in state.cards) {
          positions[id] = { x: state.cards[id].x, y: state.cards[id].y };
        }
        pushHistory({
          type: 'autoLayout',
          payload: { positions },
          inverse: { oldPositions: result.oldPositions },
          timestamp: Date.now(),
        });
        broadcastMessage({ type: 'autoLayoutStart' });
        broadcastState();
        break;
      }

      case 'undo': {
        const action = undo();
        if (action) {
          broadcastState();
        }
        break;
      }

      case 'redo': {
        const action = redo();
        if (action) {
          broadcastState();
        }
        break;
      }
    }
  } catch (e) {
    console.error('Message error:', e);
  }
}

// ==================== 启动服务器 ====================
const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

wss.on('connection', (ws) => {
  const userId = uuidv4();
  const avatar = AVATARS[Math.floor(Math.random() * AVATARS.length)];
  const color = COLORS[Math.floor(Math.random() * COLORS.length)];
  const name = `用户${Math.floor(Math.random() * 9000 + 1000)}`;

  users[userId] = { id: userId, name, avatar, color, ws };

  // 发送初始状态
  ws.send(JSON.stringify({
    type: 'init',
    payload: { userId, state, users: getUsersInfo() },
  }));

  // 广播新用户
  broadcastMessage({
    type: 'userJoin',
    payload: { id: userId, name, avatar, color },
  }, userId);

  ws.on('message', (data) => {
    handleMessage(userId, data.toString());
  });

  ws.on('close', () => {
    delete users[userId];
    broadcastMessage({
      type: 'userLeave',
      payload: { id: userId },
    });
  });
});

const PORT = 3003;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server running on ws://localhost:${PORT}`);
});
