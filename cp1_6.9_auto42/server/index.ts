import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import {
  Note,
  NoteStatus,
  HistoryAction,
  User,
  Comment,
  ClientToServerEvents,
  ServerToClientEvents,
  classifyNote,
  generateId
} from './types.js';

const PORT = process.env.PORT || 3001;
const MAX_NOTES = 500;
const MAX_HISTORY = 1000;
const HISTORY_RETENTION_MS = 60 * 60 * 1000;
const MAX_USERS = 5;

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: { origin: '*' }
});

const notesStore = new Map<string, Note>();
const historyStore: HistoryAction[] = [];
const onlineUsers = new Map<string, User>();

const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#A29BFE', '#FF9FF3'
];

function getAllNotes(): Note[] {
  return Array.from(notesStore.values());
}

function addHistory(action: HistoryAction) {
  const now = Date.now();
  while (historyStore.length > 0 && now - historyStore[0].timestamp > HISTORY_RETENTION_MS) {
    historyStore.shift();
  }
  while (historyStore.length >= MAX_HISTORY) {
    historyStore.shift();
  }
  historyStore.push(action);
}

function broadcastSync() {
  io.emit('syncBoard', getAllNotes());
}

app.get('/api/notes', (_req, res) => {
  res.json(getAllNotes());
});

app.get('/api/history', (_req, res) => {
  const now = Date.now();
  const recentHistory = historyStore.filter(h => now - h.timestamp <= HISTORY_RETENTION_MS);
  res.json(recentHistory);
});

app.get('/api/users', (_req, res) => {
  res.json(Array.from(onlineUsers.values()));
});

io.on('connection', (socket: Socket) => {
  console.log(`Client connected: ${socket.id}`);

  socket.emit('syncBoard', getAllNotes());

  socket.on('joinBoard', (userName: string) => {
    if (onlineUsers.size >= MAX_USERS) {
      socket.emit('userJoined', 
        { id: '', name: '', color: '' }, 
        Array.from(onlineUsers.values())
      );
      return;
    }

    const colorIndex = onlineUsers.size % USER_COLORS.length;
    const user: User = {
      id: socket.id,
      name: userName || `用户${onlineUsers.size + 1}`,
      color: USER_COLORS[colorIndex]
    };
    onlineUsers.set(socket.id, user);
    io.emit('userJoined', user, Array.from(onlineUsers.values()));
  });

  socket.on('createNote', ({ content, status }) => {
    if (notesStore.size >= MAX_NOTES) return;

    const { category, color } = classifyNote(content);
    const statusColumn = status;
    
    const note: Note = {
      id: generateId(),
      content,
      x: 20,
      y: 20 + notesStore.size * 10,
      status: statusColumn,
      color,
      category,
      comments: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    notesStore.set(note.id, note);

    addHistory({
      id: generateId(),
      type: 'create',
      noteId: note.id,
      note: { ...note },
      timestamp: Date.now()
    });

    broadcastSync();
  });

  socket.on('moveNote', ({ noteId, x, y, status }) => {
    const note = notesStore.get(noteId);
    if (!note) return;

    const oldX = note.x;
    const oldY = note.y;
    const oldStatus = note.status;

    note.x = x;
    note.y = y;
    note.status = status;
    note.updatedAt = Date.now();

    addHistory({
      id: generateId(),
      type: 'move',
      noteId,
      oldX,
      oldY,
      oldStatus,
      newX: x,
      newY: y,
      newStatus: status,
      timestamp: Date.now()
    });

    broadcastSync();
  });

  socket.on('updateNote', ({ noteId, content, comments }) => {
    const note = notesStore.get(noteId);
    if (!note) return;

    if (content !== undefined) {
      const { category, color } = classifyNote(content);
      note.content = content;
      note.category = category;
      note.color = color;
    }
    if (comments !== undefined) {
      note.comments = comments;
    }
    note.updatedAt = Date.now();

    addHistory({
      id: generateId(),
      type: 'update',
      noteId,
      note: { ...note },
      timestamp: Date.now()
    });

    broadcastSync();
  });

  socket.on('deleteNote', (noteId: string) => {
    const note = notesStore.get(noteId);
    if (!note) return;

    addHistory({
      id: generateId(),
      type: 'delete',
      noteId,
      note: { ...note },
      timestamp: Date.now()
    });

    notesStore.delete(noteId);
    broadcastSync();
  });

  socket.on('requestHistory', () => {
    const now = Date.now();
    const recentHistory = historyStore.filter(h => now - h.timestamp <= HISTORY_RETENTION_MS);
    socket.emit('syncHistory', recentHistory);
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
    onlineUsers.delete(socket.id);
    io.emit('userLeft', socket.id, Array.from(onlineUsers.values()));
  });
});

server.listen(PORT, () => {
  console.log(`灵感联萌服务端运行在 http://localhost:${PORT}`);
});
