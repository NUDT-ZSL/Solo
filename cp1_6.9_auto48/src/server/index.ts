import express, { Request, Response } from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import type { DrawCommand, Note, User } from '../client/types';
import { generateRandomName, assignUserColor } from '../client/types';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
  },
});

const PORT = 3001;
const MAX_HISTORY = 50;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

let drawings: DrawCommand[] = [];
let notes: Note[] = [];
const users: Map<string, User> = new Map();
const userHistory: Map<string, string[]> = new Map();
let userCount = 0;

function broadcastUserList() {
  io.emit('userList', Array.from(users.values()));
}

io.on('connection', (socket: Socket) => {
  const userId = socket.id;
  const userName = generateRandomName();
  const userColor = assignUserColor(userCount);
  userCount++;

  const user: User = {
    id: userId,
    name: userName,
    color: userColor,
  };
  users.set(userId, user);
  userHistory.set(userId, []);

  socket.emit('selfInfo', user);
  socket.emit('drawBatch', drawings.filter(d => !d.undone));
  socket.emit('noteBatch', notes);
  broadcastUserList();

  socket.on('join', (data: { name?: string }) => {
    const u = users.get(userId);
    if (u && data.name) {
      u.name = data.name;
      users.set(userId, u);
      broadcastUserList();
    }
  });

  socket.on('draw', (cmd: DrawCommand) => {
    cmd.userId = userId;
    cmd.id = cmd.id || Math.random().toString(36).slice(2);
    cmd.timestamp = Date.now();
    drawings.push(cmd);

    const history = userHistory.get(userId) || [];
    history.push(cmd.id);
    if (history.length > MAX_HISTORY) {
      history.shift();
    }
    userHistory.set(userId, history);

    socket.broadcast.emit('draw', cmd);
  });

  socket.on('undo', () => {
    const history = userHistory.get(userId) || [];
    let lastCmdId: string | undefined;

    while (history.length > 0) {
      const id = history.pop()!;
      const cmd = drawings.find(d => d.id === id);
      if (cmd && !cmd.undone) {
        cmd.undone = true;
        lastCmdId = id;
        break;
      }
    }
    userHistory.set(userId, history);

    if (lastCmdId) {
      io.emit('undoBroadcast', { userId, commandId: lastCmdId });
    }
  });

  socket.on('clearCanvas', () => {
    drawings = [];
    notes = [];
    userHistory.clear();
    io.emit('canvasCleared');
  });

  socket.on('addNote', (note: Note) => {
    note.userId = userId;
    notes.push(note);
    io.emit('addNote', note);
  });

  socket.on('updateNote', (note: Note) => {
    const idx = notes.findIndex(n => n.id === note.id);
    if (idx !== -1) {
      notes[idx] = note;
      io.emit('updateNote', note);
    }
  });

  socket.on('deleteNote', (data: { id: string }) => {
    notes = notes.filter(n => n.id !== data.id);
    io.emit('deleteNote', data);
  });

  let lastCursorEmit = 0;
  socket.on('cursorMove', (pos: { x: number; y: number }) => {
    const now = Date.now();
    if (now - lastCursorEmit < 33) return;
    lastCursorEmit = now;
    const u = users.get(userId);
    if (u) {
      u.cursor = pos;
      users.set(userId, u);
    }
    socket.broadcast.emit('cursorUpdate', { userId, x: pos.x, y: pos.y });
  });

  socket.on('disconnect', () => {
    users.delete(userId);
    userHistory.delete(userId);
    io.emit('userLeft', { userId });
    broadcastUserList();
  });
});

httpServer.listen(PORT, () => {
  console.log(`[server] Server running on http://localhost:${PORT}`);
});
