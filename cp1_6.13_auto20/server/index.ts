import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import type { DrawStroke, StickyNote, VotePayload, WsMessage } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const dbPath = path.join(__dirname, '..', 'data');
const strokesDb = Datastore.create(path.join(dbPath, 'strokes.db'));
const notesDb = Datastore.create(path.join(dbPath, 'notes.db'));

app.use(express.json());

const DEFAULT_ROOM = 'default-room';
const clients: Map<string, { ws: WebSocket; userId: string; roomId: string }> = new Map();
const roomOnlineCount: Map<string, Set<string>> = new Map();

function broadcastToRoom(roomId: string, message: WsMessage, excludeClientId?: string) {
  const data = JSON.stringify(message);
  for (const [clientId, client] of clients) {
    if (client.roomId === roomId && clientId !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(data);
    }
  }
}

function getOnlineCount(roomId: string): number {
  return roomOnlineCount.get(roomId)?.size ?? 0;
}

function updateOnlineCount(roomId: string) {
  const count = getOnlineCount(roomId);
  const message: WsMessage = {
    type: 'online-count',
    payload: { roomId, count }
  };
  broadcastToRoom(roomId, message);
}

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', online: getOnlineCount(DEFAULT_ROOM) });
});

app.get('/api/room/:roomId/state', async (req, res) => {
  const { roomId } = req.params;
  try {
    const strokes = await strokesDb.find({ roomId }).sort({ timestamp: 1 });
    const notes = await notesDb.find({ roomId }).sort({ timestamp: 1 });
    res.json({ strokes, notes });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load room state' });
  }
});

wss.on('connection', (ws) => {
  const clientId = uuidv4();
  let userId = '';
  let roomId = DEFAULT_ROOM;

  ws.on('message', async (raw) => {
    try {
      const msg: WsMessage = JSON.parse(raw.toString());

      switch (msg.type) {
        case 'join': {
          userId = msg.payload.userId;
          roomId = msg.payload.roomId || DEFAULT_ROOM;

          clients.set(clientId, { ws, userId, roomId });
          if (!roomOnlineCount.has(roomId)) {
            roomOnlineCount.set(roomId, new Set());
          }
          roomOnlineCount.get(roomId)!.add(userId);

          try {
            const strokes = await strokesDb.find({ roomId }).sort({ timestamp: 1 });
            const notes = await notesDb.find({ roomId }).sort({ timestamp: 1 });
            ws.send(JSON.stringify({
              type: 'sync',
              payload: { strokes, notes, onlineCount: getOnlineCount(roomId) }
            } as WsMessage));
          } catch (err) {
            console.error('Sync error:', err);
          }

          updateOnlineCount(roomId);
          break;
        }

        case 'draw': {
          const stroke = msg.payload as DrawStroke;
          stroke.id = stroke.id || uuidv4();
          stroke.roomId = roomId;
          stroke.timestamp = Date.now();

          try {
            await strokesDb.insert(stroke);
          } catch (err) {
            console.error('Insert stroke error:', err);
          }

          broadcastToRoom(roomId, { type: 'draw', payload: stroke }, clientId);
          break;
        }

        case 'clear': {
          try {
            await strokesDb.remove({ roomId }, { multi: true });
            await notesDb.remove({ roomId }, { multi: true });
          } catch (err) {
            console.error('Clear error:', err);
          }
          broadcastToRoom(roomId, { type: 'clear', payload: { roomId } }, clientId);
          break;
        }

        case 'sticky-add': {
          const note = msg.payload as StickyNote;
          note.id = note.id || uuidv4();
          note.roomId = roomId;
          note.timestamp = Date.now();
          note.votes = note.votes || {};

          try {
            await notesDb.insert(note);
          } catch (err) {
            console.error('Insert note error:', err);
          }

          broadcastToRoom(roomId, { type: 'sticky-add', payload: note }, clientId);
          break;
        }

        case 'sticky-update': {
          const note = msg.payload as StickyNote;
          try {
            await notesDb.update({ id: note.id, roomId }, { $set: { content: note.content, x: note.x, y: note.y } });
          } catch (err) {
            console.error('Update note error:', err);
          }
          broadcastToRoom(roomId, { type: 'sticky-update', payload: note }, clientId);
          break;
        }

        case 'vote': {
          const { noteId, userId: voterId, vote } = msg.payload as VotePayload;
          try {
            const existing = await notesDb.findOne({ id: noteId, roomId }) as StickyNote | null;
            if (existing) {
              const newVotes = { ...(existing.votes || {}) };
              if (newVotes[voterId] === vote) {
                delete newVotes[voterId];
              } else {
                newVotes[voterId] = vote;
              }
              await notesDb.update({ id: noteId, roomId }, { $set: { votes: newVotes } });
              const updated = { ...existing, votes: newVotes };
              broadcastToRoom(roomId, { type: 'vote', payload: updated });
            }
          } catch (err) {
            console.error('Vote error:', err);
          }
          break;
        }
      }
    } catch (err) {
      console.error('Message parse error:', err);
    }
  });

  ws.on('close', () => {
    clients.delete(clientId);
    if (userId && roomId) {
      const users = roomOnlineCount.get(roomId);
      if (users) {
        users.delete(userId);
        if (users.size === 0) {
          roomOnlineCount.delete(roomId);
        }
      }
      updateOnlineCount(roomId);
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`CrowdCanvas server running on port ${PORT}`);
});
