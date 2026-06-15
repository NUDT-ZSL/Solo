import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Annotation, ClientMessage, Snapshot } from './types';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, '..', 'dist')));

interface Store {
  annotations: Annotation[];
  snapshots: Snapshot[];
  clients: Map<string, WebSocket>;
}

const store: Store = {
  annotations: [],
  snapshots: [],
  clients: new Map(),
};

function broadcast(message: any, excludeClientId?: string) {
  const data = JSON.stringify(message);
  store.clients.forEach((ws, clientId) => {
    if (clientId !== excludeClientId && ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  });
}

function sendUserCount() {
  broadcast({
    type: 'user_count',
    payload: { count: store.clients.size },
  });
}

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  store.clients.set(clientId, ws);
  console.log(`[WS] Client connected: ${clientId}, total: ${store.clients.size}`);

  ws.send(JSON.stringify({
    type: 'sync_all',
    payload: {
      annotations: store.annotations,
      snapshots: store.snapshots,
      userCount: store.clients.size,
    },
  }));

  sendUserCount();

  ws.on('message', (raw) => {
    try {
      const msg: ClientMessage = JSON.parse(raw.toString());
      const payload = msg.payload || {};

      switch (msg.type) {
        case 'sync': {
          ws.send(JSON.stringify({
            type: 'sync_all',
            payload: {
              annotations: store.annotations,
              snapshots: store.snapshots,
              userCount: store.clients.size,
            },
          }));
          break;
        }
        case 'add': {
          const annotation = payload.annotation as Annotation;
          if (annotation && annotation.id) {
            store.annotations.push(annotation);
            broadcast({
              type: 'annotation_add',
              payload: { annotation, clientId: payload.clientId },
            });
          }
          break;
        }
        case 'move': {
          const { id, x, y } = payload;
          const ann = store.annotations.find((a) => a.id === id);
          if (ann) {
            ann.x = x;
            ann.y = y;
            broadcast({
              type: 'annotation_move',
              payload: { id, x, y, clientId: payload.clientId },
            });
          }
          break;
        }
        case 'delete': {
          const { id } = payload;
          const idx = store.annotations.findIndex((a) => a.id === id);
          if (idx !== -1) {
            store.annotations.splice(idx, 1);
            broadcast({
              type: 'annotation_delete',
              payload: { id, clientId: payload.clientId },
            });
          }
          break;
        }
        case 'snapshot_create': {
          const snapshot = payload.snapshot as Snapshot;
          if (snapshot && snapshot.id) {
            store.snapshots.push(snapshot);
            if (store.snapshots.length > 5) {
              store.snapshots.shift();
            }
            broadcast({
              type: 'snapshot_created',
              payload: { snapshot, clientId: payload.clientId },
            });
          }
          break;
        }
      }
    } catch (e) {
      console.error('[WS] Message error:', e);
    }
  });

  ws.on('close', () => {
    store.clients.delete(clientId);
    console.log(`[WS] Client disconnected: ${clientId}, total: ${store.clients.size}`);
    sendUserCount();
  });
});

app.post('/api/upload', (req, res) => {
  try {
    res.json({ success: true, message: 'Upload received' });
  } catch (e) {
    res.status(500).json({ success: false, error: 'Upload failed' });
  }
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket server on ws://localhost:${PORT}/ws`);
});
