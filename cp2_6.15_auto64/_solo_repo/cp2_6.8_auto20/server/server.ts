import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';

interface StickyNote {
  id: string;
  x: number;
  y: number;
  text: string;
  color: string;
}

type WSMessage =
  | { type: 'init'; notes: StickyNote[]; onlineCount: number }
  | { type: 'note-create'; note: StickyNote }
  | { type: 'note-move'; id: string; x: number; y: number }
  | { type: 'note-update'; id: string; text: string }
  | { type: 'note-delete'; id: string }
  | { type: 'notes-clear' }
  | { type: 'online-count'; count: number };

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server });

const MAX_NOTES = 200;
let notes: Map<string, StickyNote> = new Map();

app.use(express.static(path.join(__dirname, '..', 'client', 'dist')));

function broadcast(message: WSMessage, exclude?: WebSocket) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client !== exclude && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function sendOnlineCount() {
  broadcast({ type: 'online-count', count: wss.clients.size });
}

wss.on('connection', (ws) => {
  ws.send(
    JSON.stringify({
      type: 'init',
      notes: Array.from(notes.values()),
      onlineCount: wss.clients.size,
    } as WSMessage)
  );
  sendOnlineCount();

  ws.on('message', (raw) => {
    try {
      const message = JSON.parse(raw.toString());

      switch (message.type) {
        case 'note-create': {
          if (notes.size >= MAX_NOTES) {
            ws.send(
              JSON.stringify({
                type: 'error',
                message: '便签数量已达上限（200个）',
              })
            );
            return;
          }
          const note: StickyNote = {
            id: uuidv4(),
            x: message.x,
            y: message.y,
            text: message.text || '',
            color: message.color || '#FFF9C4',
          };
          notes.set(note.id, note);
          broadcast({ type: 'note-create', note });
          break;
        }
        case 'note-move': {
          const note = notes.get(message.id);
          if (note) {
            note.x = message.x;
            note.y = message.y;
            broadcast({ type: 'note-move', id: message.id, x: message.x, y: message.y }, ws);
          }
          break;
        }
        case 'note-update': {
          const note = notes.get(message.id);
          if (note) {
            note.text = message.text;
            broadcast({ type: 'note-update', id: message.id, text: message.text }, ws);
          }
          break;
        }
        case 'note-delete': {
          if (notes.has(message.id)) {
            notes.delete(message.id);
            broadcast({ type: 'note-delete', id: message.id });
          }
          break;
        }
        case 'notes-clear': {
          notes.clear();
          broadcast({ type: 'notes-clear' });
          break;
        }
      }
    } catch (e) {
      console.error('Invalid message:', e);
    }
  });

  ws.on('close', () => {
    sendOnlineCount();
  });
});

const PORT = 2555;
server.listen(PORT, () => {
  console.log(`便签墙服务器运行在 http://localhost:${PORT}`);
});
