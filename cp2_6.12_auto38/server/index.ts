import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Note, Score, Collaborator } from '../src/types';

interface RoomState {
  score: Score;
  collaborators: Map<string, Collaborator>;
}

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const scores = new Map<string, Score>();
const rooms = new Map<string, RoomState>();

const sampleNotes: Note[] = [
  { id: 'n_demo1', pitch: 64, duration: 'quarter', x: 90, y: 7 },
  { id: 'n_demo2', pitch: 62, duration: 'quarter', x: 150, y: 6 },
  { id: 'n_demo3', pitch: 60, duration: 'quarter', x: 210, y: 5 },
  { id: 'n_demo4', pitch: 62, duration: 'quarter', x: 270, y: 6 },
  { id: 'n_demo5', pitch: 64, duration: 'quarter', x: 330, y: 7 },
  { id: 'n_demo6', pitch: 64, duration: 'quarter', x: 390, y: 7 },
  { id: 'n_demo7', pitch: 64, duration: 'half', x: 450, y: 7 },
  { id: 'n_demo8', pitch: 62, duration: 'quarter', x: 540, y: 6 },
  { id: 'n_demo9', pitch: 62, duration: 'quarter', x: 600, y: 6 },
  { id: 'n_demo10', pitch: 62, duration: 'half', x: 660, y: 6 },
  { id: 'n_demo11', pitch: 64, duration: 'quarter', x: 750, y: 7 },
  { id: 'n_demo12', pitch: 67, duration: 'quarter', x: 810, y: 9 },
  { id: 'n_demo13', pitch: 67, duration: 'half', x: 870, y: 9 },
];

const demoScore: Score = {
  id: 'demo-twinkle',
  name: '小星星 (示例)',
  notes: sampleNotes,
  createdAt: Date.now(),
};
scores.set(demoScore.id, demoScore);

function getOrCreateRoom(scoreId: string): RoomState {
  if (!rooms.has(scoreId)) {
    const score = scores.get(scoreId) || {
      id: scoreId,
      name: '未命名乐谱',
      notes: [],
      createdAt: Date.now(),
    };
    rooms.set(scoreId, { score, collaborators: new Map() });
  }
  return rooms.get(scoreId)!;
}

function broadcastCollaborators(scoreId: string) {
  const room = rooms.get(scoreId);
  if (!room) return;
  const list = Array.from(room.collaborators.values());
  io.to(scoreId).emit('collaborators', list);
}

io.on('connection', (socket: Socket) => {
  console.log('[Socket] 新连接:', socket.id);

  socket.on('score:list', (callback?: (list: Score[]) => void) => {
    const list = Array.from(scores.values()).sort((a, b) => b.createdAt - a.createdAt);
    if (callback) callback(list);
    else socket.emit('score:list', list);
  });

  socket.on('score:create', (name: string, callback?: (score: Score) => void) => {
    const id = uuidv4();
    const score: Score = {
      id,
      name: name || '未命名乐谱',
      notes: [],
      createdAt: Date.now(),
    };
    scores.set(id, score);
    if (callback) callback(score);
    const list = Array.from(scores.values()).sort((a, b) => b.createdAt - a.createdAt);
    io.emit('score:list', list);
    console.log('[Score] 创建新乐谱:', id, name);
  });

  socket.on('score:join', ({ scoreId, user }: { scoreId: string; user: Collaborator }) => {
    const room = getOrCreateRoom(scoreId);
    socket.join(scoreId);

    const collab: Collaborator = {
      ...user,
      id: user.id || socket.id,
      selectedNoteId: null,
    };
    room.collaborators.set(collab.id, collab);

    (socket.data as any).scoreId = scoreId;
    (socket.data as any).userId = collab.id;

    socket.emit('score:state', {
      score: room.score,
      collaborators: Array.from(room.collaborators.values()),
    });

    broadcastCollaborators(scoreId);
    console.log('[Room] 加入:', collab.name, '-> 乐谱', scoreId, '人数:', room.collaborators.size);
  });

  socket.on('note:add', ({ scoreId, note }: { scoreId: string; note: Note }) => {
    const room = rooms.get(scoreId);
    if (!room) return;
    if (!room.score.notes.find(n => n.id === note.id)) {
      room.score.notes.push(note);
    }
    const userId = (socket.data as any).userId;
    socket.to(scoreId).emit('note:add', { note, userId });
  });

  socket.on('note:update', ({ scoreId, noteId, changes }: { scoreId: string; noteId: string; changes: Partial<Note> }) => {
    const room = rooms.get(scoreId);
    if (!room) return;
    const note = room.score.notes.find(n => n.id === noteId);
    if (note) {
      Object.assign(note, changes);
    }
    const userId = (socket.data as any).userId;
    socket.to(scoreId).emit('note:update', { noteId, changes, userId });
  });

  socket.on('note:delete', ({ scoreId, noteId }: { scoreId: string; noteId: string }) => {
    const room = rooms.get(scoreId);
    if (!room) return;
    room.score.notes = room.score.notes.filter(n => n.id !== noteId);
    const userId = (socket.data as any).userId;
    socket.to(scoreId).emit('note:delete', { noteId, userId });
  });

  socket.on('cursor:move', ({ scoreId, x, y, noteId, userId }: { scoreId: string; x: number; y: number; noteId: string | null; userId: string }) => {
    const room = rooms.get(scoreId);
    if (!room) return;
    const collab = room.collaborators.get(userId);
    if (collab) {
      collab.cursorX = x;
      collab.cursorY = y;
      collab.selectedNoteId = noteId;
    }
    socket.to(scoreId).emit('cursor:update', { userId, x, y, noteId });
    // 降低广播协作者频率
    broadcastCollaborators(scoreId);
  });

  socket.on('disconnect', () => {
    const scoreId = (socket.data as any).scoreId;
    const userId = (socket.data as any).userId;
    if (scoreId && rooms.has(scoreId)) {
      const room = rooms.get(scoreId)!;
      room.collaborators.delete(userId);
      broadcastCollaborators(scoreId);
      console.log('[Room] 离开:', userId, '剩余:', room.collaborators.size);
    }
    console.log('[Socket] 断开:', socket.id);
  });
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, scores: scores.size, rooms: rooms.size });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`🚀 乐谱协作服务器启动:`);
  console.log(`   • HTTP/WS:  http://localhost:${PORT}`);
  console.log(`   • 前端访问: http://localhost:5173`);
  console.log(`   • 示例乐谱: demo-twinkle`);
});
