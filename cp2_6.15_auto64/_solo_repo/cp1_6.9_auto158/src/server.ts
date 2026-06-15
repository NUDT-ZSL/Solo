import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import {
  User, MindNode, Connection, OpPacket, Snapshot, WSMessage, WSMessageType,
  SCI_FI_NAMES, USER_COLORS,
  DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT,
} from './types';

const PORT = 3001;
const HEARTBEAT_INTERVAL = 15000;
const HEARTBEAT_TIMEOUT = 30000;
const SNAPSHOT_INTERVAL = 30000;
const CONFLICT_WINDOW = 200;
const RECENT_LOG_LIMIT = 100;

function uuid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function sendJSON(ws: WebSocket, msg: WSMessage) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}
function makeRootNode(): MindNode {
  const now = Date.now();
  return {
    id: uuid(),
    text: '中心主题',
    x: 400, y: 300,
    bgColor: '#4ECDC4',
    borderColor: '#2BA9A0',
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
    lastEditorId: 'system',
    lastEditTime: now,
    createdAt: now,
  };
}

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

const state = {
  nodes: [makeRootNode()],
  connections: [] as Connection[],
  operationLog: [] as OpPacket[],
  snapshots: [] as Snapshot[],
  users: new Map<string, { user: User; ws: WebSocket; lastPong: number }>(),
  pendingEdits: new Map<string, OpPacket[]>(),
};

function getUsersArray(): User[] {
  return Array.from(state.users.values()).map(v => v.user);
}

function broadcast(msg: WSMessage, excludeId?: string) {
  const data = JSON.stringify(msg);
  for (const [, { ws, user }] of state.users) {
    if (excludeId && user.id === excludeId) continue;
    if (ws.readyState === WebSocket.OPEN) ws.send(data);
  }
}

function applyOp(op: OpPacket) {
  switch (op.type) {
    case 'node_add':
      state.nodes.push(op.newValue as MindNode);
      break;
    case 'node_update':
    case 'node_move': {
      const idx = state.nodes.findIndex(n => n.id === op.targetId);
      if (idx >= 0) state.nodes[idx] = { ...state.nodes[idx], ...op.newValue };
      break;
    }
    case 'node_delete': {
      state.nodes = state.nodes.filter(n => n.id !== op.targetId);
      state.connections = state.connections.filter(c => c.fromId !== op.targetId && c.toId !== op.targetId);
      break;
    }
    case 'connection_add':
      state.connections.push(op.newValue as Connection);
      break;
    case 'connection_delete':
      state.connections = state.connections.filter(c => c.id !== op.targetId);
      break;
  }
  state.operationLog.push(op);
}

function saveSnapshot() {
  const snap: Snapshot = {
    id: uuid(),
    timestamp: Date.now(),
    nodes: JSON.parse(JSON.stringify(state.nodes)),
    connections: JSON.parse(JSON.stringify(state.connections))),
  };
  state.snapshots.push(snap);
  broadcast({ type: 'snapshot_list', payload: { snapshots: state.snapshots.map(s => ({ id: s.id, timestamp: s.timestamp })) });
}

function tryDetectConflict(newOp: OpPacket): OpPacket | null {
  if (newOp.type !== 'node_update') return null;
  const buffer = state.pendingEdits.get(newOp.targetId) || [];
  const now = Date.now();
  const recent = buffer.filter(o => now - o.timestamp <= CONFLICT_WINDOW && o.userId !== newOp.userId);
  if (recent.length === 0) {
    buffer.push(newOp);
    state.pendingEdits.set(newOp.targetId, buffer.filter(o => now - o.timestamp <= CONFLICT_WINDOW));
    setTimeout(() => {
      const b = state.pendingEdits.get(newOp.targetId) || [];
      state.pendingEdits.set(newOp.targetId, b.filter(o => Date.now() - o.timestamp <= CONFLICT_WINDOW));
    }, CONFLICT_WINDOW + 50);
    return null;
  }
  const all = [...recent, newOp];
  all.sort((a, b) => b.timestamp - a.timestamp);
  const winner = all[0];
  const losers = all.slice(1);
  const userMap = new Map<string, { id: string; name: string; content: string; timestamp: number }>();
  for (const op of all) {
    const entry = state.users.get(op.userId);
    const userName = entry ? entry.user.name : 'Unknown';
    userMap.set(op.userId, {
      id: op.userId, name: userName,
      content: op.newValue && typeof op.newValue.text || '',
      timestamp: op.timestamp,
    });
  }
  broadcast({
    type: 'conflict', payload: {
      conflictId: uuid(),
      nodeId: newOp.targetId,
      users: Array.from(userMap.values()),
      winnerId: winner.userId,
      winningContent: winner.newValue && winner.newValue.text,
    },
  });
  if (winner.opId !== newOp.opId) {
    const nodeIdx = state.nodes.findIndex(n => n.id === newOp.targetId);
    if (nodeIdx >= 0) state.nodes[nodeIdx] = { ...state.nodes[nodeIdx], ...winner.newValue, lastEditTime: winner.timestamp };
  }
  return winner;
}

function getUserById(id: string) { return state.users.get(id); }

function handleOp(ws: WebSocket, payload: OpPacket, userId: string) {
  const winnerOverride = tryDetectConflict(payload);
  if (payload.type === 'node_update' && winnerOverride) {
  } else {
    applyOp(payload);
  }
  broadcast({ type: 'op_broadcast', payload }, userId);
  sendJSON(ws, { type: 'op_broadcast', payload });
}

function doRecoverTo(snapId: string) {
  const snap = state.snapshots.find(s => s.id === snapId);
  if (!snap) return;
  state.nodes = JSON.parse(JSON.stringify(snap.nodes));
  state.connections = JSON.parse(JSON.stringify(snap.connections));
  broadcast({
    type: 'full_state', payload: {
      nodes: state.nodes, connections: state.connections,
      users: getUsersArray(),
    },
  });
}

function resolveConflict(nodeId: string, chosenUserId: string) {
  const buffer = state.pendingEdits.get(nodeId) || [];
  const chosen = buffer.find(o => o.userId === chosenUserId);
  if (chosen) {
    const idx = state.nodes.findIndex(n => n.id === nodeId);
    if (idx >= 0) {
      state.nodes[idx] = { ...state.nodes[idx], ...chosen.newValue, lastEditorId: chosen.userId, lastEditTime: chosen.timestamp };
      broadcast({
        type: 'op_broadcast', payload: chosen });
    }
  }
  state.pendingEdits.delete(nodeId);
}

wss.on('connection', (ws, _req) => {
  let userId = '';
  ws.on('message', (raw) => {
    let msg: WSMessage;
    try { msg = JSON.parse(raw.toString()); } catch { return; }
    if (msg.type === 'hello') {
      const color = pickRandom(USER_COLORS);
      userId = uuid();
      const user: User = {
        id: userId,
        name: pickRandom(SCI_FI_NAMES),
        color,
        cursorX: 0, cursorY: 0,
        lastActive: Date.now(),
        isOnline: true,
      };
      state.users.set(userId, { user, ws, lastPong: Date.now() });
      sendJSON(ws, {
        type: 'user_joined', payload: { self: user } });
      sendJSON(ws, {
        type: 'full_state', payload: { nodes: state.nodes, connections: state.connections, users: getUsersArray(),
      });
      sendJSON(ws, {
        type: 'recent_ops', payload: { ops: state.operationLog.slice(-RECENT_LOG_LIMIT) } });
      sendJSON(ws, {
        type: 'snapshot_list', payload: {
          snapshots: state.snapshots.map(s => ({ id: s.id, timestamp: s.timestamp })) } });
      broadcast({ type: 'user_join', payload: { user } }, userId);
      return;
    }
    if (!userId) return;
    const entry = state.users.get(userId);
    if (!entry) return;
    entry.lastPong = Date.now();
    entry.user.lastActive = Date.now();
    switch (msg.type) {
      case 'ping':
        sendJSON(ws, { type: 'pong', payload: { t: Date.now() } });
        break;
      case 'pong':
        entry.lastPong = Date.now();
        break;
      case 'op':
        handleOp(ws, msg.payload as OpPacket, userId);
        break;
      case 'cursor_move': {
          const { x, y } = msg.payload || {};
          entry.user.cursorX = x || 0;
          entry.user.cursorY = y || 0;
          broadcast({ type: 'cursor_broadcast', payload: { userId, x, y } }, userId);
          break;
      }
      case 'recover_to':
        doRecoverTo(msg.payload.snapshotId);
        break;
      case 'conflict_resolve':
        resolveConflict(msg.payload.nodeId, msg.payload.chosenUserId);
        break;
    }
  });
  const onClose = () => {
    if (!userId) return;
    state.users.delete(userId);
    broadcast({ type: 'user_leave', payload: { userId } });
  };
  ws.on('close', onClose);
  ws.on('error', onClose);
});

setInterval(() => {
  const now = Date.now();
  for (const [uid, { user, ws, lastPong }] of state.users) {
    if (now - lastPong > HEARTBEAT_TIMEOUT) {
      state.users.delete(uid);
      try { ws.close(); } catch {}
      broadcast({ type: 'user_leave', payload: { userId: uid } });
    } else {
      sendJSON(ws, { type: 'ping', payload: { t: now } });
    }
  }
}, HEARTBEAT_INTERVAL);

setInterval(() => saveSnapshot(), SNAPSHOT_INTERVAL);
saveSnapshot();

server.listen(PORT, () => {
  console.log(`[server] listening on http://localhost:${PORT}`);
});
