import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import type { Comment } from '../src/types';

const HEARTBEAT_INTERVAL = 30000;

export function setupWebSocket(server: HTTPServer) {
  const wss = new WebSocketServer({ server });
  const clients = new Set<WebSocket>();

  const heartbeat = setInterval(() => {
    for (const ws of clients) {
      if ((ws as any).isAlive === false) {
        ws.terminate();
        clients.delete(ws);
        continue;
      }
      (ws as any).isAlive = false;
      try {
        ws.ping();
      } catch (e) {
        ws.terminate();
        clients.delete(ws);
      }
    }
  }, HEARTBEAT_INTERVAL);

  wss.on('close', () => {
    clearInterval(heartbeat);
  });

  wss.on('connection', (ws: WebSocket) => {
    (ws as any).isAlive = true;
    clients.add(ws);

    ws.on('pong', () => {
      (ws as any).isAlive = true;
    });

    ws.on('close', () => {
      clients.delete(ws);
    });

    ws.on('error', () => {
      clients.delete(ws);
    });
  });

  function broadcast(frameId: string, comment: Comment, count: number) {
    const message = JSON.stringify({
      type: 'NEW_COMMENT',
      frameId,
      comment,
      count,
    });

    for (const ws of clients) {
      if (ws.readyState === WebSocket.OPEN) {
        try {
          ws.send(message);
        } catch (e) {
          // ignore send errors
        }
      }
    }
  }

  return { broadcast, wss };
}
