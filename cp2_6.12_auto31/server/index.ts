import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server, Socket } from 'socket.io';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface User {
  id: string;
  name: string;
  socketId: string;
  projectId: string | null;
  cursor?: { x: number; y: number };
}

interface AudioFile {
  id: string;
  filename: string;
  originalName: string;
  path: string;
  size: number;
  mimetype: string;
  createdAt: number;
}

interface Clip {
  id: string;
  audioFileId: string;
  start: number;
  duration: number;
  offset: number;
}

interface Track {
  id: string;
  name: string;
  volume: number;
  muted: boolean;
  clips: Clip[];
}

interface Project {
  id: string;
  name: string;
  tracks: Track[];
  audioFiles: string[];
  inviteCode: string | null;
  createdAt: number;
}

interface ServerToClientEvents {
  'user-joined': (user: User) => void;
  'user-left': (userId: string) => void;
  'cursor-update': (userId: string, cursor: { x: number; y: number }) => void;
  'track-added': (track: Track) => void;
  'track-deleted': (trackId: string) => void;
  'track-updated': (trackId: string, updates: Partial<Track>) => void;
  'clip-moved': (trackId: string, clipId: string, start: number) => void;
  'project-users': (users: User[]) => void;
}

interface ClientToServerEvents {
  'join-project': (projectId: string, user: Omit<User, 'socketId' | 'projectId'>) => void;
  'leave-project': () => void;
  'cursor-move': (cursor: { x: number; y: number }) => void;
  'add-track': (track: Track) => void;
  'delete-track': (trackId: string) => void;
  'update-track': (trackId: string, updates: Partial<Track>) => void;
  'move-clip': (trackId: string, clipId: string, start: number) => void;
}

const app = express();
const server = http.createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents>(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueName = `${uuidv4()}-${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024
  },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = /mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 MP3 和 WAV 格式的音频文件'));
    }
  }
});

const projects = new Map<string, Project>();
const users = new Map<string, User>();
const audioFiles = new Map<string, AudioFile>();
const inviteCodes = new Map<string, string>();

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

app.use('/uploads', express.static(uploadsDir));

app.post('/api/upload', upload.single('audio'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '没有上传文件' });
  }
  const audioFile: AudioFile = {
    id: uuidv4(),
    filename: req.file.filename,
    originalName: req.file.originalname,
    path: req.file.path,
    size: req.file.size,
    mimetype: req.file.mimetype,
    createdAt: Date.now()
  };
  audioFiles.set(audioFile.id, audioFile);
  res.json({
    id: audioFile.id,
    filename: audioFile.filename,
    originalName: audioFile.originalName,
    url: `/uploads/${audioFile.filename}`,
    size: audioFile.size,
    mimetype: audioFile.mimetype
  });
});

app.get('/api/audio', (_req, res) => {
  const list = Array.from(audioFiles.values()).map(file => ({
    id: file.id,
    filename: file.filename,
    originalName: file.originalName,
    url: `/uploads/${file.filename}`,
    size: file.size,
    mimetype: file.mimetype,
    createdAt: file.createdAt
  }));
  res.json(list);
});

app.get('/api/project/:id', (req, res) => {
  const project = projects.get(req.params.id);
  if (!project) {
    return res.status(404).json({ error: '项目不存在' });
  }
  res.json(project);
});

app.post('/api/invite/:code', (req, res) => {
  const code = req.params.code.toUpperCase();
  const projectId = inviteCodes.get(code);
  if (!projectId) {
    return res.status(404).json({ error: '邀请码无效或已过期' });
  }
  const project = projects.get(projectId);
  if (!project) {
    return res.status(404).json({ error: '关联项目不存在' });
  }
  res.json({
    valid: true,
    projectId: project.id,
    projectName: project.name
  });
});

function getProjectUsers(projectId: string): User[] {
  return Array.from(users.values()).filter(u => u.projectId === projectId);
}

io.on('connection', (socket: Socket) => {
  console.log(`用户连接: ${socket.id}`);

  socket.on('join-project', (projectId, userData) => {
    let project = projects.get(projectId);
    if (!project) {
      const inviteCode = generateInviteCode();
      project = {
        id: projectId,
        name: userData.name ? `${userData.name}的项目` : '未命名项目',
        tracks: [],
        audioFiles: [],
        inviteCode,
        createdAt: Date.now()
      };
      projects.set(projectId, project);
      inviteCodes.set(inviteCode, projectId);
    }

    const user: User = {
      id: userData.id || uuidv4(),
      name: userData.name || '匿名用户',
      socketId: socket.id,
      projectId,
      cursor: userData.cursor
    };
    users.set(socket.id, user);
    socket.join(projectId);

    io.to(projectId).emit('user-joined', user);
    socket.emit('project-users', getProjectUsers(projectId));

    console.log(`用户 ${user.name} 加入项目 ${projectId}`);
  });

  socket.on('leave-project', () => {
    const user = users.get(socket.id);
    if (user && user.projectId) {
      socket.leave(user.projectId);
      io.to(user.projectId).emit('user-left', user.id);
      users.delete(socket.id);
      console.log(`用户 ${user.name} 离开项目`);
    }
  });

  socket.on('cursor-move', (cursor) => {
    const user = users.get(socket.id);
    if (user && user.projectId) {
      user.cursor = cursor;
      socket.to(user.projectId).emit('cursor-update', user.id, cursor);
    }
  });

  socket.on('add-track', (track) => {
    const user = users.get(socket.id);
    if (user && user.projectId) {
      const project = projects.get(user.projectId);
      if (project) {
        project.tracks.push(track);
        io.to(user.projectId).emit('track-added', track);
      }
    }
  });

  socket.on('delete-track', (trackId) => {
    const user = users.get(socket.id);
    if (user && user.projectId) {
      const project = projects.get(user.projectId);
      if (project) {
        project.tracks = project.tracks.filter(t => t.id !== trackId);
        io.to(user.projectId).emit('track-deleted', trackId);
      }
    }
  });

  socket.on('update-track', (trackId, updates) => {
    const user = users.get(socket.id);
    if (user && user.projectId) {
      const project = projects.get(user.projectId);
      if (project) {
        const track = project.tracks.find(t => t.id === trackId);
        if (track) {
          Object.assign(track, updates);
          io.to(user.projectId).emit('track-updated', trackId, updates);
        }
      }
    }
  });

  socket.on('move-clip', (trackId, clipId, start) => {
    const user = users.get(socket.id);
    if (user && user.projectId) {
      const project = projects.get(user.projectId);
      if (project) {
        const track = project.tracks.find(t => t.id === trackId);
        if (track) {
          const clip = track.clips.find(c => c.id === clipId);
          if (clip) {
            clip.start = start;
            io.to(user.projectId).emit('clip-moved', trackId, clipId, start);
          }
        }
      }
    }
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user && user.projectId) {
      io.to(user.projectId).emit('user-left', user.id);
      console.log(`用户断开连接: ${user.name}`);
    }
    users.delete(socket.id);
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
