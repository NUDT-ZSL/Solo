import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { StickyNoteData, Board, WSMessage, OnlineUser } from './types';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

const boards: Map<string, Board> = new Map();
const notes: Map<string, StickyNoteData[]> = new Map();
const onlineUsers: Map<string, OnlineUser> = new Map();
const boardClients: Map<string, Set<WebSocket>> = new Map();

const defaultBoardId = uuidv4();
boards.set(defaultBoardId, {
  id: defaultBoardId,
  name: '默认白板',
  createdAt: Date.now(),
});
notes.set(defaultBoardId, []);

interface ExtWebSocket extends WebSocket {
  userId?: string;
  boardId?: string;
}

function broadcastToBoard(boardId: string, message: WSMessage, excludeWs?: WebSocket) {
  const clients = boardClients.get(boardId);
  if (!clients) return;
  const data = JSON.stringify(message);
  clients.forEach((client) => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

function broadcastOnlineCount(boardId: string) {
  const clients = boardClients.get(boardId);
  const count = clients ? clients.size : 0;
  broadcastToBoard(boardId, {
    type: 'ONLINE_COUNT',
    payload: { boardId, count },
  });
}

app.get('/api/boards', (req, res) => {
  const boardList = Array.from(boards.values());
  res.json(boardList);
});

app.post('/api/boards', (req, res) => {
  const { name } = req.body;
  if (!name || name.length > 20) {
    return res.status(400).json({ error: '白板名称无效' });
  }
  const id = uuidv4();
  const board: Board = { id, name, createdAt: Date.now() };
  boards.set(id, board);
  notes.set(id, []);
  boardClients.set(id, new Set());
  return res.json(board);
});

app.delete('/api/boards/:id', (req, res) => {
  const { id } = req.params;
  if (!boards.has(id)) {
    return res.status(404).json({ error: '白板不存在' });
  }
  boards.delete(id);
  notes.delete(id);
  boardClients.delete(id);
  return res.json({ success: true });
});

wss.on('connection', (ws: ExtWebSocket) => {
  const userId = uuidv4();
  ws.userId = userId;

  ws.on('message', (raw) => {
    try {
      const message: WSMessage = JSON.parse(raw.toString());

      switch (message.type) {
        case 'JOIN_BOARD': {
          const { boardId } = message.payload;
          if (!boards.has(boardId)) return;

          if (ws.boardId) {
            const prevClients = boardClients.get(ws.boardId);
            if (prevClients) {
              prevClients.delete(ws);
              broadcastOnlineCount(ws.boardId);
            }
          }

          ws.boardId = boardId;
          onlineUsers.set(userId, { userId, boardId });

          if (!boardClients.has(boardId)) {
            boardClients.set(boardId, new Set());
          }
          boardClients.get(boardId)!.add(ws);

          const boardNotes = notes.get(boardId) || [];
          ws.send(
            JSON.stringify({
              type: 'BOARD_STATE',
              payload: { boardId, notes: boardNotes },
            })
          );

          broadcastOnlineCount(boardId);
          break;
        }

        case 'createNote': {
          const { note } = message.payload as { note: StickyNoteData };
          if (!boards.has(note.boardId)) return;

          const boardNotes = notes.get(note.boardId) || [];
          boardNotes.push(note);
          notes.set(note.boardId, boardNotes);

          broadcastToBoard(
            note.boardId,
            { type: 'createNote', payload: { note } },
            ws
          );
          break;
        }

        case 'moveNote': {
          const { noteId, x, y, boardId } = message.payload;
          if (!boards.has(boardId)) return;

          const boardNotes = notes.get(boardId) || [];
          const note = boardNotes.find((n) => n.id === noteId);
          if (note) {
            note.x = x;
            note.y = y;
          }

          broadcastToBoard(
            boardId,
            { type: 'moveNote', payload: { noteId, x, y } },
            ws
          );
          break;
        }

        case 'updateNote': {
          const { noteId, boardId, content, color } = message.payload;
          if (!boards.has(boardId)) return;

          const boardNotes = notes.get(boardId) || [];
          const note = boardNotes.find((n) => n.id === noteId);
          if (note) {
            if (content !== undefined) note.content = content;
            if (color !== undefined) note.color = color;
          }

          broadcastToBoard(
            boardId,
            { type: 'updateNote', payload: { noteId, content, color } },
            ws
          );
          break;
        }

        case 'deleteNote': {
          const { noteId, boardId } = message.payload;
          if (!boards.has(boardId)) return;

          const boardNotes = notes.get(boardId) || [];
          const idx = boardNotes.findIndex((n) => n.id === noteId);
          if (idx !== -1) {
            boardNotes.splice(idx, 1);
            notes.set(boardId, boardNotes);
          }

          broadcastToBoard(
            boardId,
            { type: 'deleteNote', payload: { noteId } },
            ws
          );
          break;
        }
      }
    } catch (e) {
      console.error('WebSocket message error:', e);
    }
  });

  ws.on('close', () => {
    onlineUsers.delete(userId);
    if (ws.boardId) {
      const clients = boardClients.get(ws.boardId);
      if (clients) {
        clients.delete(ws);
        broadcastOnlineCount(ws.boardId);
      }
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
