import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import {
  MindNode,
  Connection,
  MindMapData,
  VersionSnapshot,
  UserCursor,
  HistoryAction,
  WSMessage,
  WSInitMessage,
  WSActionMessage,
  WSCursorMessage,
  WSVersionsMessage,
  WSUsersMessage,
  WSPongMessage,
  COLOR_PALETTE,
  USER_COLORS,
} from '../src/types';

const PORT = 3001;
const VERSION_SAVE_INTERVAL = 30000;
const MAX_VERSIONS = 100;
const CURSOR_BROADCAST_INTERVAL = 50;

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const initialNodes: MindNode[] = [
  {
    id: uuidv4(),
    title: '中心主题',
    x: 600,
    y: 400,
    width: 140,
    height: 60,
    color: COLOR_PALETTE[0],
    parentId: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
];

let mindMapData: MindMapData = {
  nodes: initialNodes,
  connections: [],
};

let versions: VersionSnapshot[] = [
  {
    id: uuidv4(),
    timestamp: Date.now(),
    data: JSON.parse(JSON.stringify(mindMapData)),
    description: '初始版本',
  },
];

interface ConnectedClient {
  ws: WebSocket;
  userId: string;
  userName: string;
  color: string;
  lastCursor?: UserCursor;
  lastMessageTime: number;
}

const clients = new Map<string, ConnectedClient>();
let userColorIndex = 0;

const userNames = ['思考者', '创意家', '规划师', '探险家', '筑梦者', '开拓者', '领航员', '先锋者'];
let userNameIndex = 0;

function deepClone<T>(obj: T): T {
  return JSON.parse(JSON.stringify(obj));
}

function saveVersion(description: string): void {
  const snapshot: VersionSnapshot = {
    id: uuidv4(),
    timestamp: Date.now(),
    data: deepClone(mindMapData),
    description,
  };
  versions.push(snapshot);
  if (versions.length > MAX_VERSIONS) {
    versions = versions.slice(versions.length - MAX_VERSIONS);
  }
  broadcastVersions();
}

function broadcastVersions(): void {
  const message: WSVersionsMessage = {
    type: 'versions',
    versions: deepClone(versions),
  };
  broadcastToAll(JSON.stringify(message));
}

function broadcastToAll(data: string, excludeId?: string): void {
  clients.forEach((client, id) => {
    if (excludeId && id === excludeId) return;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}

function broadcastAction(action: HistoryAction, excludeId?: string): void {
  const message: WSActionMessage = {
    type: 'action',
    action,
  };
  broadcastToAll(JSON.stringify(message), excludeId);
}

function broadcastUsers(): void {
  const cursors: UserCursor[] = [];
  clients.forEach((client) => {
    if (client.lastCursor) {
      cursors.push(client.lastCursor);
    }
  });
  const message: WSUsersMessage = {
    type: 'users',
    users: cursors,
  };
  broadcastToAll(JSON.stringify(message));
}

function applyAction(action: HistoryAction, fromUserId: string): void {
  switch (action.type) {
    case 'node:create': {
      mindMapData.nodes.push(deepClone(action.node));
      break;
    }
    case 'node:update': {
      const idx = mindMapData.nodes.findIndex((n) => n.id === action.node.id);
      if (idx !== -1) {
        mindMapData.nodes[idx] = deepClone(action.node);
      }
      break;
    }
    case 'node:move': {
      const idx = mindMapData.nodes.findIndex((n) => n.id === action.node.id);
      if (idx !== -1) {
        mindMapData.nodes[idx].x = action.node.x;
        mindMapData.nodes[idx].y = action.node.y;
        mindMapData.nodes[idx].updatedAt = action.node.updatedAt;
      }
      break;
    }
    case 'node:delete': {
      const nodeId = action.node.id;
      mindMapData.nodes = mindMapData.nodes.filter((n) => n.id !== nodeId);
      mindMapData.connections = mindMapData.connections.filter(
        (c) => c.from !== nodeId && c.to !== nodeId
      );
      mindMapData.nodes.forEach((n) => {
        if (n.parentId === nodeId) n.parentId = null;
      });
      break;
    }
    case 'connection:create': {
      const exists = mindMapData.connections.some(
        (c) =>
          (c.from === action.connection.from && c.to === action.connection.to) ||
          (c.from === action.connection.to && c.to === action.connection.from)
      );
      if (!exists) {
        mindMapData.connections.push(deepClone(action.connection));
        const toNode = mindMapData.nodes.find((n) => n.id === action.connection.to);
        if (toNode) toNode.parentId = action.connection.from;
      }
      break;
    }
    case 'connection:delete': {
      mindMapData.connections = mindMapData.connections.filter(
        (c) => c.id !== action.connection.id
      );
      const toNode = mindMapData.nodes.find((n) => n.id === action.connection.to);
      if (toNode && toNode.parentId === action.connection.from) {
        toNode.parentId = null;
      }
      break;
    }
    case 'version:restore': {
      mindMapData = deepClone(action.data);
      break;
    }
  }

  const isStructuralChange = [
    'node:create',
    'node:delete',
    'connection:create',
    'connection:delete',
    'version:restore',
  ].includes(action.type);

  if (isStructuralChange) {
    saveVersion(action.description);
  }
}

setInterval(() => {
  saveVersion('自动保存');
}, VERSION_SAVE_INTERVAL);

function handleMessage(ws: WebSocket, rawData: string): void {
  const client = [...clients.values()].find((c) => c.ws === ws);
  if (!client) return;

  try {
    const message: WSMessage = JSON.parse(rawData);
    client.lastMessageTime = Date.now();

    switch (message.type) {
      case 'action': {
        const actionMsg = message as WSActionMessage;
        applyAction(actionMsg.action, client.userId);
        broadcastAction(actionMsg.action, client.userId);
        break;
      }
      case 'cursor': {
        const cursorMsg = message as WSCursorMessage;
        const cursor: UserCursor = {
          ...cursorMsg.cursor,
          userId: client.userId,
          userName: client.userName,
          color: client.color,
        };
        client.lastCursor = cursor;
        break;
      }
      case 'ping': {
        const pongMsg: WSPongMessage = {
          type: 'pong',
          timestamp: Date.now(),
        };
        ws.send(JSON.stringify(pongMsg));
        break;
      }
    }
  } catch (e) {
    console.error('Message parse error:', e);
  }
}

setInterval(() => {
  const userList: UserCursor[] = [];
  clients.forEach((client) => {
    if (client.lastCursor) {
      userList.push(client.lastCursor);
    } else {
      userList.push({
        userId: client.userId,
        userName: client.userName,
        x: 0,
        y: 0,
        color: client.color,
      });
    }
  });
  const message: WSUsersMessage = { type: 'users', users: userList };
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  });
}, CURSOR_BROADCAST_INTERVAL);

wss.on('connection', (ws, req) => {
  const userId = uuidv4();
  const color = USER_COLORS[userColorIndex % USER_COLORS.length];
  userColorIndex++;
  const userName = userNames[userNameIndex % userNames.length] + (Math.floor(userNameIndex / userNames.length) || '');
  userNameIndex++;

  const client: ConnectedClient = {
    ws,
    userId,
    userName,
    color,
    lastMessageTime: Date.now(),
  };
  clients.set(userId, client);

  console.log(`Client connected: ${userId} (${userName})`);

  const initMsg: WSInitMessage = {
    type: 'init',
    data: deepClone(mindMapData),
    versions: deepClone(versions),
    userId,
    users: [],
  };
  ws.send(JSON.stringify(initMsg));

  setTimeout(() => broadcastUsers(), 50);

  ws.on('message', (data) => {
    handleMessage(ws, data.toString());
  });

  ws.on('close', () => {
    console.log(`Client disconnected: ${userId}`);
    clients.delete(userId);
    setTimeout(() => broadcastUsers(), 50);
  });

  ws.on('error', (err) => {
    console.error(`Client error ${userId}:`, err);
    clients.delete(userId);
  });
});

server.listen(PORT, () => {
  console.log(`思维方舟服务端启动:`);
  console.log(`  HTTP:  http://localhost:${PORT}`);
  console.log(`  WS:    ws://localhost:${PORT}/ws`);
  console.log(`  健康检查: http://localhost:${PORT}/api/health`);
});
