import express from 'express';
import http from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import path from 'path';
import { roomManager, Stroke, Point, StickyNoteData } from './roomManager';

const app = express();
const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const PORT = process.env.PORT || 4000;

app.use(express.json());

const distPath = path.join(__dirname, '..', 'dist');
const clientPath = path.join(__dirname, '..', 'client');

let staticPath = distPath;
if (require('fs').existsSync(distPath)) {
  staticPath = distPath;
} else if (require('fs').existsSync(clientPath)) {
  staticPath = clientPath;
}
app.use(express.static(staticPath));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/room/:roomId/exists', (req, res) => {
  const { roomId } = req.params;
  const exists = roomManager.hasRoom(roomId);
  res.json({ exists });
});

app.post('/api/room/create', (req, res) => {
  const roomId = roomManager.createRoom();
  res.json({ roomId });
});

interface JoinRoomData {
  roomId: string;
  userName: string;
}

interface DrawStrokeData {
  roomId: string;
  stroke: Stroke;
}

interface CursorMoveData {
  roomId: string;
  position: Point;
}

interface AddStickyNoteData {
  roomId: string;
  note: StickyNoteData;
}

interface UpdateStickyNoteData {
  roomId: string;
  noteId: string;
  updates: Partial<StickyNoteData>;
}

interface DeleteStickyNoteData {
  roomId: string;
  noteId: string;
}

interface UndoStrokeData {
  roomId: string;
}

interface ClearCanvasData {
  roomId: string;
}

io.on('connection', (socket: Socket) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  socket.on('join_room', (data: JoinRoomData) => {
    const { roomId, userName } = data;

    if (currentRoomId && currentUserId) {
      socket.leave(currentRoomId);
      roomManager.removeUser(currentRoomId, currentUserId);
      io.to(currentRoomId).emit('user_left', { userId: currentUserId });
    }

    currentRoomId = roomId;
    currentUserId = socket.id;

    const user = roomManager.addUser(roomId, socket.id, userName);
    socket.join(roomId);

    socket.emit('room_state', {
      strokes: roomManager.getStrokes(roomId),
      stickyNotes: roomManager.getStickyNotes(roomId),
      users: roomManager.getUsers(roomId),
      currentUser: user,
    });

    socket.to(roomId).emit('user_joined', { user });
  });

  socket.on('draw_stroke', (data: DrawStrokeData) => {
    const { roomId, stroke } = data;
    if (!roomManager.hasRoom(roomId)) return;

    stroke.id = stroke.id || `stroke_${Date.now()}_${Math.random()}`;
    roomManager.addStroke(roomId, stroke);
    socket.to(roomId).emit('stroke_drawn', { stroke });
  });

  socket.on('cursor_move', (data: CursorMoveData) => {
    const { roomId, position } = data;
    if (!roomManager.hasRoom(roomId) || !currentUserId) return;

    roomManager.updateCursor(roomId, currentUserId, position);
    socket.to(roomId).emit('cursor_moved', {
      userId: currentUserId,
      position,
    });
  });

  socket.on('add_sticky_note', (data: AddStickyNoteData) => {
    const { roomId, note } = data;
    if (!roomManager.hasRoom(roomId)) return;

    note.id = note.id || `note_${Date.now()}_${Math.random()}`;
    roomManager.addStickyNote(roomId, note);
    socket.to(roomId).emit('sticky_note_added', { note });
  });

  socket.on('update_sticky_note', (data: UpdateStickyNoteData) => {
    const { roomId, noteId, updates } = data;
    if (!roomManager.hasRoom(roomId)) return;

    const updated = roomManager.updateStickyNote(roomId, noteId, updates);
    if (updated) {
      socket.to(roomId).emit('sticky_note_updated', { noteId, updates });
    }
  });

  socket.on('delete_sticky_note', (data: DeleteStickyNoteData) => {
    const { roomId, noteId } = data;
    if (!roomManager.hasRoom(roomId)) return;

    const deleted = roomManager.deleteStickyNote(roomId, noteId);
    if (deleted) {
      socket.to(roomId).emit('sticky_note_deleted', { noteId });
    }
  });

  socket.on('undo_stroke', (data: UndoStrokeData) => {
    const { roomId } = data;
    if (!roomManager.hasRoom(roomId) || !currentUserId) return;

    const removed = roomManager.undoStroke(roomId, currentUserId);
    if (removed) {
      io.to(roomId).emit('stroke_undone', { strokeId: removed.id, userId: currentUserId });
    }
  });

  socket.on('clear_canvas', (data: ClearCanvasData) => {
    const { roomId } = data;
    if (!roomManager.hasRoom(roomId)) return;

    roomManager.clearStrokes(roomId);
    io.to(roomId).emit('canvas_cleared', { userId: currentUserId });
  });

  socket.on('disconnect', () => {
    if (currentRoomId && currentUserId) {
      roomManager.removeUser(currentRoomId, currentUserId);
      io.to(currentRoomId).emit('user_left', { userId: currentUserId });
    }
  });
});

app.get('*', (req, res) => {
  const indexPath = path.join(staticPath, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).send('Not found');
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
