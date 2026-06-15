import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import bodyParser from 'body-parser';
import { store, DrawAction, Point } from './store';

const PORT = process.env.PORT || 3001;
const app = express();

app.use(cors());
app.use(bodyParser.json());

app.get('/api/users', (req, res) => {
  res.json({ users: store.getUsers() });
});

app.get('/api/actions', (req, res) => {
  const since = req.query.since ? parseInt(req.query.since as string) : undefined;
  res.json({ actions: store.getActions(since) });
});

app.get('/api/replay', (req, res) => {
  res.json(store.getActionsForReplay());
});

app.post('/api/clear', (req, res) => {
  const { userId } = req.body;
  if (!userId) {
    return res.status(400).json({ success: false, error: '缺少userId' });
  }
  const cleared = store.clearCanvas(userId);
  if (cleared) {
    broadcast({ type: 'canvas-cleared', timestamp: Date.now() });
    res.json({ success: true });
  } else {
    res.status(403).json({ success: false, error: '用户不存在' });
  }
});

app.post('/api/user/:id/name', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;
  if (!name || typeof name !== 'string') {
    return res.status(400).json({ success: false, error: '无效的名字' });
  }
  const user = store.updateUserName(id, name);
  if (user) {
    broadcast({ type: 'user-updated', user });
    res.json({ success: true, user });
  } else {
    res.status(404).json({ success: false, error: '用户不存在' });
  }
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface WSMessage {
  type: string;
  userId?: string;
  action?: Partial<DrawAction> & { points: Point[]; color: string; lineWidth: number; isEraser: boolean };
  name?: string;
}

interface WSConnection extends WebSocket {
  userId?: string;
  isAlive?: boolean;
}

function broadcast(data: object, excludeId?: string) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    const conn = client as WSConnection;
    if (conn.readyState === WebSocket.OPEN && conn.userId !== excludeId) {
      conn.send(msg);
    }
  });
}

function sendToClient(client: WebSocket, data: object) {
  if (client.readyState === WebSocket.OPEN) {
    client.send(JSON.stringify(data));
  }
}

wss.on('connection', (ws: WSConnection) => {
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  ws.on('message', (raw) => {
    try {
      const msg: WSMessage = JSON.parse(raw.toString());

      if (msg.type === 'join') {
        const result = store.addUser();
        if (!result.success) {
          sendToClient(ws, { type: 'error', message: result.message });
          ws.close();
          return;
        }
        ws.userId = result.user.id;
        sendToClient(ws, {
          type: 'welcome',
          user: result.user,
          users: store.getUsers(),
          actions: store.getActions(),
        });
        broadcast({ type: 'user-joined', user: result.user }, result.user.id);
        return;
      }

      if (!ws.userId) {
        sendToClient(ws, { type: 'error', message: '请先加入房间' });
        return;
      }

      if (msg.type === 'draw' && msg.action) {
        const validAction = store.addAction({
          type: 'draw',
          ...msg.action,
          userId: ws.userId,
        });
        if (validAction) {
          const user = store.getUser(ws.userId);
          broadcast({
            type: 'draw',
            action: validAction,
            userName: user?.name,
            userColor: user?.color,
          });
        }
        return;
      }

      if (msg.type === 'update-name' && msg.name) {
        const user = store.updateUserName(ws.userId, msg.name);
        if (user) {
          broadcast({ type: 'user-updated', user });
          sendToClient(ws, { type: 'name-updated', user });
        }
        return;
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    if (ws.userId) {
      const user = store.getUser(ws.userId);
      store.removeUser(ws.userId);
      broadcast({ type: 'user-left', userId: ws.userId });
    }
  });
});

const heartbeat = setInterval(() => {
  wss.clients.forEach((client) => {
    const conn = client as WSConnection;
    if (!conn.isAlive) {
      if (conn.userId) {
        store.removeUser(conn.userId);
        broadcast({ type: 'user-left', userId: conn.userId });
      }
      return conn.terminate();
    }
    conn.isAlive = false;
    conn.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(heartbeat);
});

server.listen(PORT, () => {
  console.log(`彩迹共绘服务已启动，端口: ${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}/ws`);
  console.log(`API: http://localhost:${PORT}/api`);
});
