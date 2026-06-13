import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(cors());
app.use(express.json());

const roomsDb = Datastore.create(join(__dirname, '..', 'data', 'rooms.db'));
const moodsDb = Datastore.create(join(__dirname, '..', 'data', 'moods.db'));
const messagesDb = Datastore.create(join(__dirname, '..', 'data', 'messages.db'));

type MoodType = 'happy' | 'calm' | 'sad' | 'angry' | 'anxious';

interface MoodRecord {
  _id?: string;
  roomId: string;
  userId: string;
  mood: MoodType;
  timestamp: number;
}

interface ChatMessage {
  _id?: string;
  roomId: string;
  userId: string;
  mood: MoodType;
  content: string;
  timestamp: number;
}

interface RoomData {
  _id?: string;
  roomId: string;
  theme: string;
  createdAt: number;
  users: Record<string, MoodType>;
  playlist: PlaylistTrack[];
  playlistGeneratedAt: number;
}

interface PlaylistTrack {
  id: string;
  title: string;
  artist: string;
  mood: MoodType;
  cover: string;
}

const MOOD_COLORS: Record<MoodType, string> = {
  happy: '#f59e0b',
  calm: '#6366f1',
  sad: '#8b5cf6',
  angry: '#ef4444',
  anxious: '#f97316',
};

const MOOD_NAMES: Record<MoodType, string> = {
  happy: '开心',
  calm: '平静',
  sad: '悲伤',
  angry: '愤怒',
  anxious: '焦虑',
};

const TRACK_LIBRARY: Record<MoodType, PlaylistTrack[]> = {
  happy: [
    { id: 'h1', title: '阳光灿烂的日子', artist: 'The Sunbeams', mood: 'happy', cover: 'https://picsum.photos/seed/happy1/120/120' },
    { id: 'h2', title: '夏日微风', artist: 'Breeze Band', mood: 'happy', cover: 'https://picsum.photos/seed/happy2/120/120' },
    { id: 'h3', title: '欢笑时光', artist: 'Joy Collective', mood: 'happy', cover: 'https://picsum.photos/seed/happy3/120/120' },
    { id: 'h4', title: '彩虹糖', artist: 'Candy Pop', mood: 'happy', cover: 'https://picsum.photos/seed/happy4/120/120' },
    { id: 'h5', title: '海边漫步', artist: 'Wave Riders', mood: 'happy', cover: 'https://picsum.photos/seed/happy5/120/120' },
  ],
  calm: [
    { id: 'c1', title: '月光奏鸣曲', artist: 'Luna', mood: 'calm', cover: 'https://picsum.photos/seed/calm1/120/120' },
    { id: 'c2', title: '静谧湖泊', artist: 'Still Waters', mood: 'calm', cover: 'https://picsum.photos/seed/calm2/120/120' },
    { id: 'c3', title: '晨曦微光', artist: 'Dawn', mood: 'calm', cover: 'https://picsum.photos/seed/calm3/120/120' },
    { id: 'c4', title: '森林私语', artist: 'Nature Sounds', mood: 'calm', cover: 'https://picsum.photos/seed/calm4/120/120' },
    { id: 'c5', title: '云端之上', artist: 'Skywalker', mood: 'calm', cover: 'https://picsum.photos/seed/calm5/120/120' },
  ],
  sad: [
    { id: 's1', title: '雨后初晴', artist: 'After Rain', mood: 'sad', cover: 'https://picsum.photos/seed/sad1/120/120' },
    { id: 's2', title: '回忆的秋天', artist: 'Autumn Leaves', mood: 'sad', cover: 'https://picsum.photos/seed/sad2/120/120' },
    { id: 's3', title: '远方的星', artist: 'Distant Stars', mood: 'sad', cover: 'https://picsum.photos/seed/sad3/120/120' },
    { id: 's4', title: '午夜独白', artist: 'Midnight', mood: 'sad', cover: 'https://picsum.photos/seed/sad4/120/120' },
    { id: 's5', title: '温柔的告别', artist: 'Farewell', mood: 'sad', cover: 'https://picsum.photos/seed/sad5/120/120' },
  ],
  angry: [
    { id: 'a1', title: '雷霆万钧', artist: 'Thunder', mood: 'angry', cover: 'https://picsum.photos/seed/angry1/120/120' },
    { id: 'a2', title: '燃烧的心', artist: 'Fire Inside', mood: 'angry', cover: 'https://picsum.photos/seed/angry2/120/120' },
    { id: 'a3', title: '冲破牢笼', artist: 'Break Free', mood: 'angry', cover: 'https://picsum.photos/seed/angry3/120/120' },
    { id: 'a4', title: '风暴之眼', artist: 'Storm', mood: 'angry', cover: 'https://picsum.photos/seed/angry4/120/120' },
    { id: 'a5', title: '岩浆喷发', artist: 'Volcano', mood: 'angry', cover: 'https://picsum.photos/seed/angry5/120/120' },
  ],
  anxious: [
    { id: 'x1', title: '心跳加速', artist: 'Heartbeat', mood: 'anxious', cover: 'https://picsum.photos/seed/anxious1/120/120' },
    { id: 'x2', title: '迷雾森林', artist: 'Misty Woods', mood: 'anxious', cover: 'https://picsum.photos/seed/anxious2/120/120' },
    { id: 'x3', title: '奔跑的思绪', artist: 'Running Mind', mood: 'anxious', cover: 'https://picsum.photos/seed/anxious3/120/120' },
    { id: 'x4', title: '悬崖边缘', artist: 'Edge', mood: 'anxious', cover: 'https://picsum.photos/seed/anxious4/120/120' },
    { id: 'x5', title: '漩涡', artist: 'Vortex', mood: 'anxious', cover: 'https://picsum.photos/seed/anxious5/120/120' },
  ],
};

function generateRoomId(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 6; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function weightedRandomPick<T>(items: T[], weights: number[]): T {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

function generatePlaylist(moodDistribution: Record<MoodType, number>): PlaylistTrack[] {
  const moods: MoodType[] = ['happy', 'calm', 'sad', 'angry', 'anxious'];
  const playlist: PlaylistTrack[] = [];
  const total = Object.values(moodDistribution).reduce((a, b) => a + b, 0) || 1;

  for (const mood of moods) {
    const weight = moodDistribution[mood] || 0;
    if (weight > 0) {
      const tracks = TRACK_LIBRARY[mood];
      const track = weightedRandomPick(tracks, tracks.map((_, i) => Math.max(1, tracks.length - i)));
      playlist.push({ ...track, id: `${track.id}-${Date.now()}-${Math.random()}` });
    } else {
      const tracks = TRACK_LIBRARY[mood];
      const track = tracks[Math.floor(Math.random() * tracks.length)];
      playlist.push({ ...track, id: `${track.id}-${Date.now()}-${Math.random()}` });
    }
  }

  return playlist.sort(() => Math.random() - 0.5);
}

function getMoodDistribution(users: Record<string, MoodType>): Record<MoodType, number> {
  const dist: Record<MoodType, number> = { happy: 0, calm: 0, sad: 0, angry: 0, anxious: 0 };
  for (const mood of Object.values(users)) {
    dist[mood] = (dist[mood] || 0) + 1;
  }
  return dist;
}

async function getOrCreateRoom(roomId: string): Promise<RoomData | null> {
  let room = await roomsDb.findOne({ roomId }) as RoomData | null;
  if (!room) return null;

  const now = Date.now();
  if (!room.playlist || now - room.playlistGeneratedAt > 60000) {
    const dist = getMoodDistribution(room.users);
    room.playlist = generatePlaylist(dist);
    room.playlistGeneratedAt = now;
    await roomsDb.update({ roomId }, { $set: { playlist: room.playlist, playlistGeneratedAt: now } });
  }

  return room;
}

app.post('/api/rooms', async (req, res) => {
  try {
    const { theme } = req.body;
    let roomId = generateRoomId();
    while (await roomsDb.findOne({ roomId })) {
      roomId = generateRoomId();
    }

    const room: RoomData = {
      roomId,
      theme: theme || '都市夜晚',
      createdAt: Date.now(),
      users: {},
      playlist: [],
      playlistGeneratedAt: 0,
    };

    const dist = getMoodDistribution(room.users);
    room.playlist = generatePlaylist(dist);
    room.playlistGeneratedAt = Date.now();

    await roomsDb.insert(room);
    res.json({ roomId, theme: room.theme });
  } catch (err) {
    console.error('Create room error:', err);
    res.status(500).json({ error: '创建房间失败' });
  }
});

app.post('/api/rooms/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomsDb.findOne({ roomId: roomId.toUpperCase() }) as RoomData | null;
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }

    const distribution = getMoodDistribution(room.users);
    res.json({
      roomId: room.roomId,
      theme: room.theme,
      users: room.users,
      playlist: room.playlist,
      distribution,
      onlineCount: Object.keys(room.users).length,
    });
  } catch (err) {
    console.error('Join room error:', err);
    res.status(500).json({ error: '加入房间失败' });
  }
});

app.get('/api/rooms/:roomId/distribution', async (req, res) => {
  try {
    const { roomId } = req.params;
    const room = await roomsDb.findOne({ roomId: roomId.toUpperCase() }) as RoomData | null;
    if (!room) {
      return res.status(404).json({ error: '房间不存在' });
    }
    res.json({ distribution: getMoodDistribution(room.users) });
  } catch (err) {
    res.status(500).json({ error: '获取心情分布失败' });
  }
});

io.on('connection', (socket) => {
  let currentRoomId: string | null = null;
  let currentUserId: string | null = null;

  socket.on('join-room', async ({ roomId, userId }) => {
    try {
      roomId = roomId.toUpperCase();
      const room = await getOrCreateRoom(roomId);
      if (!room) {
        socket.emit('error-message', '房间不存在');
        return;
      }

      currentRoomId = roomId;
      currentUserId = userId;
      socket.join(roomId);

      if (!room.users[userId]) {
        room.users[userId] = 'calm';
        await roomsDb.update({ roomId }, { $set: { users: room.users } });
      }

      const messages = (await messagesDb.find({ roomId }).sort({ timestamp: -1 }).limit(50)) as ChatMessage[];
      messages.reverse();

      socket.emit('room-state', {
        users: room.users,
        distribution: getMoodDistribution(room.users),
        playlist: room.playlist,
        messages,
        onlineCount: Object.keys(room.users).length,
      });

      io.to(roomId).emit('user-joined', {
        userId,
        users: room.users,
        distribution: getMoodDistribution(room.users),
        onlineCount: Object.keys(room.users).length,
      });
    } catch (err) {
      console.error('Socket join error:', err);
    }
  });

  socket.on('set-mood', async ({ roomId, userId, mood }) => {
    try {
      roomId = roomId.toUpperCase();
      const room = await roomsDb.findOne({ roomId }) as RoomData | null;
      if (!room) return;

      room.users[userId] = mood;
      await roomsDb.update({ roomId }, { $set: { users: room.users } });

      await moodsDb.insert({
        roomId,
        userId,
        mood,
        timestamp: Date.now(),
      } as MoodRecord);

      io.to(roomId).emit('mood-updated', {
        userId,
        mood,
        users: room.users,
        distribution: getMoodDistribution(room.users),
        onlineCount: Object.keys(room.users).length,
      });
    } catch (err) {
      console.error('Set mood error:', err);
    }
  });

  socket.on('send-message', async ({ roomId, userId, mood, content }) => {
    try {
      roomId = roomId.toUpperCase();
      const message: ChatMessage = {
        roomId,
        userId,
        mood,
        content: String(content).slice(0, 200),
        timestamp: Date.now(),
      };
      await messagesDb.insert(message);

      const allMessages = (await messagesDb.find({ roomId }).sort({ timestamp: 1 }).exec()) as ChatMessage[];
      if (allMessages.length > 50) {
        const toRemove = allMessages.slice(0, allMessages.length - 50);
        for (const m of toRemove) {
          if (m._id) await messagesDb.remove({ _id: m._id });
        }
      }

      io.to(roomId).emit('new-message', message);
    } catch (err) {
      console.error('Send message error:', err);
    }
  });

  socket.on('disconnect', async () => {
    if (!currentRoomId || !currentUserId) return;
    try {
      const room = await roomsDb.findOne({ roomId: currentRoomId }) as RoomData | null;
      if (room && room.users[currentUserId]) {
        delete room.users[currentUserId];
        await roomsDb.update({ roomId: currentRoomId }, { $set: { users: room.users } });
        io.to(currentRoomId).emit('user-left', {
          userId: currentUserId,
          users: room.users,
          distribution: getMoodDistribution(room.users),
          onlineCount: Object.keys(room.users).length,
        });
      }
    } catch (err) {
      console.error('Disconnect error:', err);
    }
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`MoodMix server running on port ${PORT}`);
});
