import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3001;
const DB_DIR = path.join(__dirname, '..', 'data');

interface RoomDoc {
  _id?: string;
  roomId: string;
  elements: any[];
  updatedAt: number;
}

interface ClientInfo {
  ws: WebSocket;
  roomId: string;
  userId: string;
  lastPing: number;
}

const app = express();
app.use(express.json({ limit: '10mb' }));

const roomsDb = Datastore.create({
  filename: path.join(DB_DIR, 'rooms.db'),
  autoload: true,
});

const server = createServer(app);
const wss = new WebSocketServer({ noServer: true });

const clients = new Map<string, ClientInfo>();
const roomClients = new Map<string, Set<string>>();

function getClientId(roomId: string, userId: string): string {
  return `${roomId}::${userId}`;
}

function broadcastToRoom(roomId: string, message: string, excludeUserId?: string) {
  const roomSet = roomClients.get(roomId);
  if (!roomSet) return;

  for (const clientId of roomSet) {
    const info = clients.get(clientId);
    if (!info || info.ws.readyState !== WebSocket.OPEN) continue;
    if (excludeUserId && info.userId === excludeUserId) continue;
    try {
      info.ws.send(message);
    } catch (e) {
      console.error('[WS] Failed to send to', clientId, e);
    }
  }
}

server.on('upgrade', (req, socket, head) => {
  const url = new URL(req.url || '/', 'http://localhost');
  const roomId = url.searchParams.get('roomId') || '';
  const userId = url.searchParams.get('userId') || '';

  if (!roomId || !userId) {
    socket.destroy();
    return;
  }

  if (!url.pathname.startsWith('/ws')) {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit('connection', ws, req, { roomId, userId });
  });
});

wss.on('connection', (ws: WebSocket, req: any, params: { roomId: string; userId: string }) => {
  const { roomId, userId } = params;
  const clientId = getClientId(roomId, userId);

  const existing = clients.get(clientId);
  if (existing) {
    try {
      existing.ws.close();
    } catch {}
    clients.delete(clientId);
    roomClients.get(roomId)?.delete(clientId);
  }

  clients.set(clientId, { ws, roomId, userId, lastPing: Date.now() });
  if (!roomClients.has(roomId)) {
    roomClients.set(roomId, new Set());
  }
  roomClients.get(roomId)!.add(clientId);

  console.log(`[WS] Connected: ${userId} in room ${roomId} (total: ${roomClients.get(roomId)?.size})`);

  const joinMsg = JSON.stringify({
    type: 'user-join',
    payload: { userId },
    roomId,
    userId: 'system',
    timestamp: Date.now(),
  });
  broadcastToRoom(roomId, joinMsg, userId);

  roomsDb
    .findOne<RoomDoc>({ roomId })
    .then((doc) => {
      if (doc && doc.elements && doc.elements.length > 0) {
        const batchMsg = JSON.stringify({
          type: 'elements-batch',
          payload: doc.elements,
          roomId,
          userId: 'system',
          timestamp: Date.now(),
        });
        try {
          ws.send(batchMsg);
        } catch {}
      }
    })
    .catch((e) => console.error('[DB] Load error:', e));

  ws.on('message', (data) => {
    let msg: any;
    try {
      msg = JSON.parse(data.toString());
    } catch {
      return;
    }
    if (!msg || msg.roomId !== roomId || msg.userId !== userId) return;

    const clientInfo = clients.get(clientId);
    if (clientInfo) clientInfo.lastPing = Date.now();

    const rawStr = data.toString();
    broadcastToRoom(roomId, rawStr, userId);

    if (msg.type === 'element-add' || msg.type === 'element-update' || msg.type === 'element-delete') {
      persistRoomFromBroadcast(roomId, msg).catch((e) => console.error('[DB] Persist error:', e));
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    const roomSet = roomClients.get(roomId);
    if (roomSet) {
      roomSet.delete(clientId);
      if (roomSet.size === 0) {
        roomClients.delete(roomId);
      }
    }
    console.log(`[WS] Disconnected: ${userId} from room ${roomId} (remaining: ${roomClients.get(roomId)?.size || 0})`);

    const leaveMsg = JSON.stringify({
      type: 'user-leave',
      payload: { userId },
      roomId,
      userId: 'system',
      timestamp: Date.now(),
    });
    broadcastToRoom(roomId, leaveMsg);
  });

  ws.on('error', (err) => {
    console.error(`[WS] Error for ${userId}:`, err.message);
  });

  ws.on('pong', () => {
    const info = clients.get(clientId);
    if (info) info.lastPing = Date.now();
  });
});

let pendingRoomUpdates = new Map<string, any[]>();
let pendingTimers = new Map<string, NodeJS.Timeout>();

async function persistRoomFromBroadcast(roomId: string, msg: any) {
  if (!pendingRoomUpdates.has(roomId)) {
    pendingRoomUpdates.set(roomId, []);
  }
  pendingRoomUpdates.get(roomId)!.push(msg);

  if (pendingTimers.has(roomId)) return;

  pendingTimers.set(
    roomId,
    setTimeout(async () => {
      pendingTimers.delete(roomId);
      const updates = pendingRoomUpdates.get(roomId) || [];
      pendingRoomUpdates.delete(roomId);

      try {
        const doc = await roomsDb.findOne<RoomDoc>({ roomId });
        let elements = doc?.elements || [];

        for (const msg of updates) {
          if (msg.type === 'element-add') {
            elements = elements.filter((e) => e.id !== msg.payload.id);
            elements.push(msg.payload);
          } else if (msg.type === 'element-update') {
            elements = elements.map((e) => (e.id === msg.payload.id ? msg.payload : e));
          } else if (msg.type === 'element-delete') {
            elements = elements.filter((e) => e.id !== msg.payload);
          }
        }

        await roomsDb.update(
          { roomId },
          { $set: { roomId, elements, updatedAt: Date.now() } },
          { upsert: true }
        );
      } catch (e) {
        console.error('[DB] Batch persist failed:', e);
      }
    }, 300)
  );
}

app.get('/api/rooms/:roomId/elements', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const doc = await roomsDb.findOne<RoomDoc>({ roomId });
    res.json(doc?.elements || []);
  } catch (e: any) {
    console.error('[API] GET elements error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/rooms/:roomId/elements', async (req: Request, res: Response) => {
  try {
    const { roomId } = req.params;
    const { elements } = req.body;
    if (!Array.isArray(elements)) {
      return res.status(400).json({ error: 'elements must be array' });
    }
    await roomsDb.update(
      { roomId },
      { $set: { roomId, elements, updatedAt: Date.now() } },
      { upsert: true }
    );
    res.json({ ok: true });
  } catch (e: any) {
    console.error('[API] POST elements error:', e);
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, time: Date.now(), clients: clients.size, rooms: roomClients.size });
});

const heartbeatInterval = setInterval(() => {
  const now = Date.now();
  for (const [clientId, info] of clients.entries()) {
    if (info.ws.readyState === WebSocket.OPEN) {
      try {
        info.ws.ping();
      } catch {}
    }
    if (now - info.lastPing > 60000) {
      console.log(`[WS] Timeout: ${info.userId}`);
      try {
        info.ws.terminate();
      } catch {}
      clients.delete(clientId);
      const roomSet = roomClients.get(info.roomId);
      if (roomSet) {
        roomSet.delete(clientId);
        if (roomSet.size === 0) roomClients.delete(info.roomId);
      }
    }
  }
}, 30000);

server.on('close', () => {
  clearInterval(heartbeatInterval);
});

server.listen(PORT, () => {
  console.log(`[Sketchy] Server running on http://localhost:${PORT}`);
  console.log(`[Sketchy] WebSocket ready on ws://localhost:${PORT}/ws`);
});
