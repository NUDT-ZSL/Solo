import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(express.json({ limit: '5mb' }));

const whiteboards = new Map();
const onlineUsers = new Map();

function generateThumbnail(boardId, title) {
  const colors = [
    { bg1: '#E0F7FA', bg2: '#B2EBF2', accent: '#4FC3F7' },
    { bg1: '#F3E5F5', bg2: '#E1BEE7', accent: '#BA68C8' },
    { bg1: '#FFF9C4', bg2: '#FFF59D', accent: '#FBC02D' },
    { bg1: '#FFEBEE', bg2: '#FFCDD2', accent: '#EF5350' },
    { bg1: '#E8F5E9', bg2: '#C8E6C9', accent: '#66BB6A' },
    { bg1: '#E3F2FD', bg2: '#BBDEFB', accent: '#42A5F5' }
  ];
  const hash = boardId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const palette = colors[hash % colors.length];

  const titleShort = title.length > 8 ? title.substring(0, 8) + '..' : title;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">
    <defs>
      <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:${palette.bg1}"/>
        <stop offset="100%" style="stop-color:${palette.bg2}"/>
      </linearGradient>
    </defs>
    <rect width="400" height="300" fill="url(#bg)"/>
    <circle cx="70" cy="70" r="25" fill="none" stroke="${palette.accent}" stroke-width="3"/>
    <rect x="280" y="45" width="70" height="45" rx="3" fill="none" stroke="#EF5350" stroke-width="3"/>
    <line x1="50" y1="240" x2="140" y2="200" stroke="#424242" stroke-width="3" stroke-linecap="round"/>
    <rect x="240" y="200" width="90" height="70" rx="4" fill="#FFF9C4" stroke="#FBC02D" stroke-width="2"/>
    <text x="285" y="242" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#424242">${titleShort}</text>
    <circle cx="200" cy="150" r="18" fill="${palette.accent}" opacity="0.6"/>
    <rect x="150" y="100" width="100" height="100" rx="8" fill="white" opacity="0.3"/>
  </svg>`;

  const base64 = Buffer.from(svg).toString('base64');
  return `data:image/svg+xml;base64,${base64}`;
}

const sampleProjects = [
  {
    id: 'board-1',
    title: '产品设计评审',
    lastEditTime: Date.now() - 3600000,
    thumbnail: generateThumbnail('board-1', '产品设计评审')
  },
  {
    id: 'board-2',
    title: 'UI组件讨论',
    lastEditTime: Date.now() - 7200000,
    thumbnail: generateThumbnail('board-2', 'UI组件讨论')
  },
  {
    id: 'board-3',
    title: '需求头脑风暴',
    lastEditTime: Date.now() - 86400000,
    thumbnail: generateThumbnail('board-3', '需求头脑风暴')
  },
  {
    id: 'board-4',
    title: '架构设计图',
    lastEditTime: Date.now() - 172800000,
    thumbnail: generateThumbnail('board-4', '架构设计图')
  }
];

function initWhiteboard(boardId) {
  if (!whiteboards.has(boardId)) {
    whiteboards.set(boardId, {
      graphics: [],
      stickyNotes: [],
      annotations: [],
      designImage: null,
      history: []
    });
  }
  return whiteboards.get(boardId);
}

function addHistory(boardId, op, data) {
  const board = whiteboards.get(boardId);
  if (board) {
    board.history.unshift({
      id: uuidv4(),
      op,
      data,
      timestamp: Date.now()
    });
    if (board.history.length > 100) {
      board.history = board.history.slice(0, 100);
    }
  }
}

app.get('/api/projects', (req, res) => {
  res.json(sampleProjects);
});

app.get('/api/whiteboards/:id', (req, res) => {
  const { id } = req.params;
  const board = initWhiteboard(id);
  res.json(board);
});

app.get('/api/whiteboards/:id/thumbnail', (req, res) => {
  const { id } = req.params;
  const project = sampleProjects.find(p => p.id === id);
  const title = project ? project.title : `白板 ${id}`;
  const thumbnail = generateThumbnail(id, title);
  res.json({ id, thumbnail });
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('join-board', ({ boardId, userName }) => {
    socket.join(boardId);
    
    if (!onlineUsers.has(boardId)) {
      onlineUsers.set(boardId, new Map());
    }
    const boardUsers = onlineUsers.get(boardId);
    boardUsers.set(socket.id, {
      id: socket.id,
      name: userName || '匿名用户',
      color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')
    });

    const userList = Array.from(boardUsers.values());
    io.to(boardId).emit('online-users', userList);
    io.to(boardId).emit('user-joined', { user: boardUsers.get(socket.id) });

    const board = initWhiteboard(boardId);
    socket.emit('board-data', board);
  });

  socket.on('add-graphic', ({ boardId, graphic }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      board.graphics.push(graphic);
      addHistory(boardId, 'add-graphic', graphic);
      socket.to(boardId).emit('graphic-added', graphic);
    }
  });

  socket.on('update-graphic', ({ boardId, graphic }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      const idx = board.graphics.findIndex(g => g.id === graphic.id);
      if (idx !== -1) {
        board.graphics[idx] = graphic;
        addHistory(boardId, 'update-graphic', graphic);
        socket.to(boardId).emit('graphic-updated', graphic);
      }
    }
  });

  socket.on('delete-graphic', ({ boardId, graphicId }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      board.graphics = board.graphics.filter(g => g.id !== graphicId);
      addHistory(boardId, 'delete-graphic', { id: graphicId });
      socket.to(boardId).emit('graphic-deleted', graphicId);
    }
  });

  socket.on('add-sticky-note', ({ boardId, note }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      board.stickyNotes.push(note);
      addHistory(boardId, 'add-sticky-note', note);
      socket.to(boardId).emit('sticky-note-added', note);
    }
  });

  socket.on('update-sticky-note', ({ boardId, note }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      const idx = board.stickyNotes.findIndex(n => n.id === note.id);
      if (idx !== -1) {
        board.stickyNotes[idx] = note;
        addHistory(boardId, 'update-sticky-note', note);
        socket.to(boardId).emit('sticky-note-updated', note);
      }
    }
  });

  socket.on('delete-sticky-note', ({ boardId, noteId }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      board.stickyNotes = board.stickyNotes.filter(n => n.id !== noteId);
      addHistory(boardId, 'delete-sticky-note', { id: noteId });
      socket.to(boardId).emit('sticky-note-deleted', noteId);
    }
  });

  socket.on('add-annotation', ({ boardId, annotation }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      board.annotations.push(annotation);
      addHistory(boardId, 'add-annotation', annotation);
      socket.to(boardId).emit('annotation-added', annotation);
    }
  });

  socket.on('update-annotation', ({ boardId, annotation }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      const idx = board.annotations.findIndex(a => a.id === annotation.id);
      if (idx !== -1) {
        board.annotations[idx] = annotation;
        addHistory(boardId, 'update-annotation', annotation);
        socket.to(boardId).emit('annotation-updated', annotation);
      }
    }
  });

  socket.on('delete-annotation', ({ boardId, annotationId }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      board.annotations = board.annotations.filter(a => a.id !== annotationId);
      addHistory(boardId, 'delete-annotation', { id: annotationId });
      socket.to(boardId).emit('annotation-deleted', annotationId);
    }
  });

  socket.on('upload-design', ({ boardId, imageData }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      board.designImage = imageData;
      addHistory(boardId, 'upload-design', { hasImage: true });
      io.to(boardId).emit('design-uploaded', imageData);
    }
  });

  socket.on('get-history', ({ boardId }) => {
    const board = whiteboards.get(boardId);
    if (board) {
      socket.emit('history-data', board.history);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    for (const [boardId, users] of onlineUsers.entries()) {
      if (users.has(socket.id)) {
        const user = users.get(socket.id);
        users.delete(socket.id);
        const userList = Array.from(users.values());
        io.to(boardId).emit('online-users', userList);
        io.to(boardId).emit('user-left', { user });
      }
    }
  });
});

const PORT = 3002;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
