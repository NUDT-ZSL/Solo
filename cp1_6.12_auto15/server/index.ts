import express from 'express';
import { createServer } from 'http';
import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';

import type { Express, Request, Response } from 'express';
import type { Server as HTTPServer } from 'http';

const PORT = 3001;
const MAX_STROKE_POINTS = 1000;
const MAX_MESSAGE_BYTES = 10 * 1024;
const MAX_HISTORY_STROKES = 5000;

interface Point {
  x: number;
  y: number;
}

interface DrawPayload {
  strokeId: string;
  userId: string;
  color: string;
  size: number;
  points: Point[];
}

interface UndoPayload {
  userId: string;
  strokeId: string;
}

type ClientMessage =
  | { type: 'DRAW'; payload: DrawPayload }
  | { type: 'UNDO'; payload: UndoPayload }
  | { type: 'CLEAR_CANVAS'; payload: { userId: string } };

type ServerMessage =
  | { type: 'WELCOME'; payload: { userId: string; isAdmin: boolean; strokes: DrawPayload[] } }
  | { type: 'USER_JOINED'; payload: { userId: string; onlineCount: number } }
  | { type: 'USER_LEFT'; payload: { userId: string; onlineCount: number } }
  | { type: 'DRAW_BROADCAST'; payload: DrawPayload }
  | { type: 'UNDO_BROADCAST'; payload: UndoPayload }
  | { type: 'CLEAR_BROADCAST' }
  | { type: 'ERROR'; payload: { message: string } };

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  isAdmin: boolean;
}

const app: Express = express();
const httpServer: HTTPServer = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const clients: Map<string, ConnectedClient> = new Map();
let adminId: string | null = null;
const strokeHistory: DrawPayload[] = [];
const undoneStrokes: Set<string> = new Set();

function sendToClient(ws: WebSocket, message: ServerMessage): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(message));
  }
}

function broadcast(message: ServerMessage, excludeId?: string): void {
  const json = JSON.stringify(message);
  for (const [id, client] of clients) {
    if (id === excludeId) continue;
    if (client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(json);
    }
  }
}

function getOnlineCount(): number {
  return clients.size;
}

function transferAdminIfNeeded(disconnectedId: string): void {
  if (adminId === disconnectedId) {
    const nextAdmin = clients.values().next().value as ConnectedClient | undefined;
    if (nextAdmin) {
      nextAdmin.isAdmin = true;
      adminId = nextAdmin.id;
      sendToClient(nextAdmin.ws, {
        type: 'WELCOME',
        payload: {
          userId: nextAdmin.id,
          isAdmin: true,
          strokes: strokeHistory.filter((s) => !undoneStrokes.has(s.strokeId)),
        },
      });
    } else {
      adminId = null;
    }
  }
}

function validateDrawPayload(payload: any): payload is DrawPayload {
  if (!payload || typeof payload !== 'object') return false;
  if (typeof payload.strokeId !== 'string') return false;
  if (typeof payload.userId !== 'string') return false;
  if (typeof payload.color !== 'string') return false;
  if (typeof payload.size !== 'number' || payload.size < 1 || payload.size > 20) return false;
  if (!Array.isArray(payload.points)) return false;
  return true;
}

function addStrokeToHistory(stroke: DrawPayload): void {
  strokeHistory.push(stroke);
  if (strokeHistory.length > MAX_HISTORY_STROKES) {
    const removed = strokeHistory.shift();
    if (removed) {
      undoneStrokes.delete(removed.strokeId);
    }
  }
}

function handleClientMessage(clientId: string, rawData: WebSocket.RawData): void {
  const client = clients.get(clientId);
  if (!client) return;

  const dataStr = rawData.toString();
  if (Buffer.byteLength(dataStr, 'utf8') > MAX_MESSAGE_BYTES) {
    sendToClient(client.ws, { type: 'ERROR', payload: { message: 'Message too large' } });
    return;
  }

  let message: ClientMessage;
  try {
    message = JSON.parse(dataStr) as ClientMessage;
  } catch {
    sendToClient(client.ws, { type: 'ERROR', payload: { message: 'Invalid JSON' } });
    return;
  }

  switch (message.type) {
    case 'DRAW': {
      if (!validateDrawPayload(message.payload)) {
        sendToClient(client.ws, { type: 'ERROR', payload: { message: 'Invalid draw payload' } });
        return;
      }
      if (message.payload.userId !== clientId) {
        sendToClient(client.ws, { type: 'ERROR', payload: { message: 'UserId mismatch' } });
        return;
      }
      const stroke = {
        ...message.payload,
        points: message.payload.points.slice(0, MAX_STROKE_POINTS).map((p) => ({
          x: Math.round(p.x),
          y: Math.round(p.y),
        })),
      };
      addStrokeToHistory(stroke);
      broadcast({ type: 'DRAW_BROADCAST', payload: stroke }, clientId);
      break;
    }
    case 'UNDO': {
      const { userId, strokeId } = message.payload;
      if (userId !== clientId) {
        sendToClient(client.ws, { type: 'ERROR', payload: { message: 'UserId mismatch' } });
        return;
      }
      const stroke = strokeHistory.find((s) => s.strokeId === strokeId && s.userId === clientId);
      if (stroke) {
        undoneStrokes.add(strokeId);
        broadcast({ type: 'UNDO_BROADCAST', payload: { userId: clientId, strokeId } });
      }
      break;
    }
    case 'CLEAR_CANVAS': {
      if (!client.isAdmin || clientId !== adminId) {
        sendToClient(client.ws, { type: 'ERROR', payload: { message: 'Permission denied: admin only' } });
        return;
      }
      strokeHistory.length = 0;
      undoneStrokes.clear();
      broadcast({ type: 'CLEAR_BROADCAST' });
      break;
    }
    default:
      sendToClient(client.ws, { type: 'ERROR', payload: { message: 'Unknown message type' } });
  }
}

wss.on('connection', (ws: WebSocket) => {
  const clientId = uuidv4();
  const isAdmin = clients.size === 0;
  if (isAdmin) adminId = clientId;

  clients.set(clientId, { id: clientId, ws, isAdmin });

  sendToClient(ws, {
    type: 'WELCOME',
    payload: {
      userId: clientId,
      isAdmin,
      strokes: strokeHistory.filter((s) => !undoneStrokes.has(s.strokeId)),
    },
  });

  broadcast({
    type: 'USER_JOINED',
    payload: { userId: clientId, onlineCount: getOnlineCount() },
  });

  ws.on('message', (data) => {
    handleClientMessage(clientId, data);
  });

  ws.on('close', () => {
    clients.delete(clientId);
    transferAdminIfNeeded(clientId);
    broadcast({
      type: 'USER_LEFT',
      payload: { userId: clientId, onlineCount: getOnlineCount() },
    });
  });

  ws.on('error', (err) => {
    console.error(`WebSocket error for client ${clientId}:`, err.message);
  });
});

httpServer.on('upgrade', (request, socket, head) => {
  if (request.url === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', online: getOnlineCount(), isAdminSet: !!adminId });
});

httpServer.listen(PORT, () => {
  console.log(`[server] HTTP + WebSocket server listening on port ${PORT}`);
  console.log(`[server] WebSocket endpoint: ws://localhost:${PORT}/ws`);
  console.log(`[server] Health check: http://localhost:${PORT}/api/health`);
});
