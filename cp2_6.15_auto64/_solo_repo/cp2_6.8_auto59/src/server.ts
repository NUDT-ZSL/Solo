import express from 'express';
import http from 'http';
import { Server, Socket } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface EditHistory {
  authorId: string;
  authorName: string;
  timestamp: number;
  content: string;
}

interface Paragraph {
  id: string;
  content: string;
  authorId: string;
  authorName: string;
  createdAt: number;
  updatedAt: number;
  parentId: string | null;
  children: string[];
  history: EditHistory[];
}

interface Member {
  id: string;
  name: string;
  avatarColor: string;
  online: boolean;
}

interface Room {
  name: string;
  paragraphs: Record<string, Paragraph>;
  rootParagraphId: string | null;
  members: Record<string, Member>;
}

const AVATAR_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#A855F7', '#22C55E', '#FF8BAC'];

const rooms: Record<string, Room> = {};

const getUnusedColor = (room: Room): string => {
  const usedColors = new Set(Object.values(room.members).map(m => m.avatarColor));
  for (const color of AVATAR_COLORS) {
    if (!usedColors.has(color)) return color;
  }
  return AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
};

const getRoom = (roomName: string): Room => {
  if (!rooms[roomName]) {
    rooms[roomName] = {
      name: roomName,
      paragraphs: {},
      rootParagraphId: null,
      members: {},
    };
  }
  return rooms[roomName];
};

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

io.on('connection', (socket: Socket) => {
  let currentRoomName: string | null = null;
  let currentUserId: string | null = null;

  socket.on('joinRoom', ({ roomName, user }: { roomName: string; user: { id: string; name: string; avatarColor: string } }) => {
    const room = getRoom(roomName);
    const onlineCount = Object.values(room.members).filter(m => m.online).length;

    if (onlineCount >= 6 && !room.members[user.id]) {
      socket.emit('error', { message: '房间已满，最多支持6人同时在线' });
      return;
    }

    currentRoomName = roomName;
    currentUserId = user.id;

    let assignedColor = user.avatarColor;
    if (room.members[user.id]) {
      room.members[user.id].online = true;
      assignedColor = room.members[user.id].avatarColor;
    } else {
      const usedColors = new Set(Object.values(room.members).map(m => m.avatarColor));
      if (usedColors.has(user.avatarColor)) {
        assignedColor = getUnusedColor(room);
      }
      room.members[user.id] = {
        id: user.id,
        name: user.name,
        avatarColor: assignedColor,
        online: true,
      };
    }

    socket.join(roomName);
    socket.emit('userColorAssigned', assignedColor);
    socket.emit('roomState', {
      roomName: room.name,
      paragraphs: room.paragraphs,
      rootParagraphId: room.rootParagraphId,
      members: room.members,
    });
    io.to(roomName).emit('membersUpdated', room.members);
  });

  socket.on('addParagraph', ({ roomName, paragraph, parentId }: { roomName: string; paragraph: Paragraph; parentId: string | null }) => {
    const room = getRoom(roomName);
    if (parentId && !room.paragraphs[parentId]) return;

    room.paragraphs[paragraph.id] = paragraph;

    if (parentId) {
      room.paragraphs[parentId].children.push(paragraph.id);
    } else {
      room.rootParagraphId = paragraph.id;
    }

    io.to(roomName).emit('paragraphAdded', { paragraph, parentId });
  });

  socket.on('updateParagraph', ({ roomName, paragraphId, content, editor }: {
    roomName: string;
    paragraphId: string;
    content: string;
    editor: { id: string; name: string };
  }) => {
    const room = getRoom(roomName);
    const paragraph = room.paragraphs[paragraphId];
    if (!paragraph) return;

    paragraph.content = content;
    paragraph.updatedAt = Date.now();
    paragraph.history.push({
      authorId: editor.id,
      authorName: editor.name,
      timestamp: Date.now(),
      content,
    });

    io.to(roomName).emit('paragraphUpdated', paragraph);
  });

  socket.on('deleteParagraph', ({ roomName, paragraphId, parentId }: {
    roomName: string;
    paragraphId: string;
    parentId: string | null;
  }) => {
    const room = getRoom(roomName);

    const deleteRecursive = (id: string) => {
      const p = room.paragraphs[id];
      if (!p) return;
      p.children.forEach(c => deleteRecursive(c));
      delete room.paragraphs[id];
    };

    deleteRecursive(paragraphId);

    if (parentId && room.paragraphs[parentId]) {
      room.paragraphs[parentId].children = room.paragraphs[parentId].children.filter(c => c !== paragraphId);
    }

    if (room.rootParagraphId === paragraphId) {
      room.rootParagraphId = null;
    }

    io.to(roomName).emit('paragraphDeleted', { paragraphId, parentId });
  });

  socket.on('disconnect', () => {
    if (!currentRoomName || !currentUserId) return;
    const room = rooms[currentRoomName];
    if (!room || !room.members[currentUserId]) return;

    room.members[currentUserId].online = false;
    io.to(currentRoomName).emit('membersUpdated', room.members);

    const anyOnline = Object.values(room.members).some(m => m.online);
    if (!anyOnline) {
      setTimeout(() => {
        const r = rooms[currentRoomName!];
        if (r && !Object.values(r.members).some(m => m.online)) {
          delete rooms[currentRoomName!];
        }
      }, 60000);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`故事蜗牛服务器运行在 http://localhost:${PORT}`);
});
