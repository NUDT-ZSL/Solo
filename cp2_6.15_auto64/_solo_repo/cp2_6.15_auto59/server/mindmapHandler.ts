import { WebSocket, WebSocketServer } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import * as db from './db.js';

interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  style: string;
  createdBy: string;
  updatedAt: number;
}

interface WSMessage {
  type: string;
  payload: any;
  userId: string;
  timestamp: number;
}

const clients = new Set<WebSocket>();
const userColors = ['#e91e63', '#9c27b0', '#3f51b5', '#009688', '#ff5722', '#795548'];
const userColorMap = new Map<string, string>();

function getUserColor(userId: string): string {
  if (!userColorMap.has(userId)) {
    userColorMap.set(userId, userColors[Math.floor(Math.random() * userColors.length)]);
  }
  return userColorMap.get(userId)!;
}

function broadcast(message: WSMessage, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function parseNode(row: any): MindMapNode {
  return {
    ...row,
    style: typeof row.style === 'string' ? JSON.parse(row.style) : row.style,
  };
}

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws) => {
    clients.add(ws);
    ws.send(JSON.stringify({ type: 'connected', payload: { message: 'Connected to mind map sync' } }));

    ws.on('message', (data) => {
      try {
        const msg: WSMessage = JSON.parse(data.toString());
        const { type, payload, userId } = msg;

        switch (type) {
          case 'node:create': {
            const id = payload.id || uuidv4();
            const style = typeof payload.style === 'string' ? payload.style : JSON.stringify(payload.style || {});
            const now = Date.now();
            db.run(
              'INSERT OR REPLACE INTO nodes (id, text, x, y, parentId, style, createdBy, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
              [id, payload.text || '', payload.x || 0, payload.y || 0, payload.parentId || null, style, userId || 'anonymous', now]
            );
            broadcast({ type: 'node:created', payload: { id, ...payload, updatedAt: now }, userId, timestamp: now }, ws);
            break;
          }
          case 'node:update': {
            const now = Date.now();
            const style = typeof payload.style === 'string' ? payload.style : JSON.stringify(payload.style || {});
            db.run(
              'UPDATE nodes SET text=?, x=?, y=?, parentId=?, style=?, updatedAt=? WHERE id=?',
              [payload.text, payload.x, payload.y, payload.parentId, style, now, payload.id]
            );
            broadcast({ type: 'node:updated', payload: { ...payload, updatedAt: now }, userId, timestamp: now }, ws);
            break;
          }
          case 'node:move': {
            const now = Date.now();
            db.run('UPDATE nodes SET x=?, y=?, updatedAt=? WHERE id=?', [payload.x, payload.y, now, payload.id]);
            broadcast({ type: 'node:moved', payload: { id: payload.id, x: payload.x, y: payload.y, updatedAt: now }, userId, timestamp: now }, ws);
            break;
          }
          case 'node:delete': {
            db.run('DELETE FROM nodes WHERE id=?', [payload.id]);
            db.run('UPDATE nodes SET parentId=NULL WHERE parentId=?', [payload.id]);
            broadcast({ type: 'node:deleted', payload: { id: payload.id }, userId, timestamp: Date.now() }, ws);
            break;
          }
          case 'sync:request': {
            const nodes = db.all<any>('SELECT * FROM nodes');
            const parsed = nodes.map(parseNode);
            ws.send(JSON.stringify({ type: 'sync:response', payload: parsed, userId, timestamp: Date.now() }));
            break;
          }
        }
      } catch (err) {
        console.error('WS message error:', err);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
    });
  });
}

export function setupMindMapREST(app: any) {
  app.get('/api/mindmap', (req: any, res: any) => {
    try {
      const nodes = db.all<any>('SELECT * FROM nodes');
      res.json(nodes.map(parseNode));
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch nodes' });
    }
  });

  app.post('/api/mindmap/node', (req: any, res: any) => {
    try {
      const { id, text, x, y, parentId, style, createdBy } = req.body;
      const nodeId = id || uuidv4();
      const styleStr = typeof style === 'string' ? style : JSON.stringify(style || {});
      const now = Date.now();
      db.run(
        'INSERT OR REPLACE INTO nodes (id, text, x, y, parentId, style, createdBy, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [nodeId, text || '', x || 0, y || 0, parentId || null, styleStr, createdBy || 'anonymous', now]
      );
      res.json({ id: nodeId, text, x, y, parentId, style, createdBy, updatedAt: now });
    } catch (err) {
      res.status(500).json({ error: 'Failed to create node' });
    }
  });

  app.put('/api/mindmap/node/:id', (req: any, res: any) => {
    try {
      const { text, x, y, parentId, style } = req.body;
      const now = Date.now();
      const styleStr = typeof style === 'string' ? style : JSON.stringify(style || {});
      db.run('UPDATE nodes SET text=?, x=?, y=?, parentId=?, style=?, updatedAt=? WHERE id=?',
        [text, x, y, parentId, styleStr, now, req.params.id]);
      res.json({ id: req.params.id, text, x, y, parentId, style, updatedAt: now });
    } catch (err) {
      res.status(500).json({ error: 'Failed to update node' });
    }
  });

  app.delete('/api/mindmap/node/:id', (req: any, res: any) => {
    try {
      db.run('DELETE FROM nodes WHERE id=?', [req.params.id]);
      db.run('UPDATE nodes SET parentId=NULL WHERE parentId=?', [req.params.id]);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: 'Failed to delete node' });
    }
  });
}
