import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { DrawAction, WebSocketMessage } from '../src/types';

const START_PORT = 3001;
const MAX_HISTORY = 50;

const USER_COLORS = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6',
  '#ec4899', '#14b8a6', '#f43f5e', '#f59e0b',
];

interface ClientData {
  id: string;
  name: string;
  color: string;
  ws: WebSocket;
}

function listenWithAutoPort(appServer: ReturnType<typeof createServer>, startPort: number): Promise<number> {
  return new Promise((resolve, reject) => {
    let current = startPort;
    const tryListen = () => {
      if (current > startPort + 100) {
        reject(new Error('No available port found in range'));
        return;
      }
      const onError = (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          appServer.removeListener('error', onError);
          current++;
          tryListen();
        } else {
          reject(err);
        }
      };
      const onListening = () => {
        appServer.removeListener('error', onError);
        resolve((appServer.address() as { port: number }).port);
      };
      appServer.once('error', onError);
      appServer.once('listening', onListening);
      appServer.listen(current, '0.0.0.0');
    };
    tryListen();
  });
}

let history: DrawAction[] = [];
const clients = new Map<string, ClientData>();
let colorIdx = 0;

function nextColor(): string {
  const c = USER_COLORS[colorIdx % USER_COLORS.length];
  colorIdx++;
  return c;
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function broadcast(msg: WebSocketMessage, excludeId?: string) {
  const data = JSON.stringify(msg);
  clients.forEach((c) => {
    if (c.id !== excludeId && c.ws.readyState === WebSocket.OPEN) {
      c.ws.send(data);
    }
  });
}

function broadcastUsers() {
  const users = Array.from(clients.values()).map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
  }));
  broadcast({ type: 'users', users });
}

async function startServer() {
  const PORT = await findAvailablePort(START_PORT);

  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.get('/api/port', (_req, res) => {
    res.json({ port: PORT });
  });

  app.get('/api/health', (_req, res) => {
    res.json({
      status: 'ok',
      port: PORT,
      users: clients.size,
      history: history.length,
    });
  });

  wss.on('connection', (ws) => {
    let clientId: string | null = null;

    ws.on('error', (err) => {
      console.error('WebSocket error:', err.message);
    });

    ws.on('message', (raw) => {
      try {
        const data = JSON.parse(raw.toString()) as WebSocketMessage;

        if (data.type === 'join') {
          clientId = data.userId || generateId();
          if (clients.has(clientId)) {
            clientId = generateId();
          }
          const assignedColor = data.color || nextColor();
          const name = data.userName || '用户';

          clients.set(clientId, {
            id: clientId,
            name,
            color: assignedColor,
            ws,
          });

          if (ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'init',
                history,
                userId: clientId,
                color: assignedColor,
              } satisfies WebSocketMessage)
            );
          }

          broadcastUsers();
          return;
        }

        if (!clientId) return;

        if (data.type === 'draw') {
          const client = clients.get(clientId);
          if (client) {
            data.action.color = client.color;
          }
          data.action.userId = clientId;
          history.push(data.action);
          if (history.length > MAX_HISTORY) {
            history = history.slice(-MAX_HISTORY);
          }
          broadcast({ type: 'draw', action: data.action }, clientId);
        } else if (data.type === 'undo') {
          const idx = history.findIndex((a) => a.id === data.actionId);
          if (idx >= 0) {
            history.splice(idx, 1);
          }
          broadcast({ type: 'undo', actionId: data.actionId, userId: data.userId }, clientId);
        } else if (data.type === 'redo') {
          history.push(data.action);
          if (history.length > MAX_HISTORY) {
            history = history.slice(-MAX_HISTORY);
          }
          broadcast({ type: 'redo', action: data.action, userId: data.userId }, clientId);
        }
      } catch (e) {
        console.error('Parse message error:', (e as Error).message);
      }
    });

    ws.on('close', () => {
      if (clientId) {
        clients.delete(clientId);
        broadcastUsers();
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    const pad = (n: number) => n.toString().padEnd(4, ' ');
    console.log(`
╔════════════════════════════════════════════╗
║     🎨 实时协作白板服务已启动                ║
║                                              ║
║   HTTP / WebSocket: http://localhost:${pad(PORT)}     ║
║   健康检查:        /api/health                 ║
║   端口查询:        /api/port                   ║
║                                              ║
║   前端地址:        http://localhost:5173       ║
╚════════════════════════════════════════════╝
    `);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
