import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

app.use(express.json());

const dbFile = join(__dirname, 'db.json');
const adapter = new JSONFile(dbFile);
const defaultData = { rooms: [], cities: [] };
const db = new Low(adapter, defaultData);

await db.read();

const citiesData = [
  {
    id: 'paris',
    name: '巴黎',
    nameEn: 'Paris',
    description: '浪漫之都，艺术与美食的天堂',
    image: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=640&h=360&fit=crop',
    lat: 48.8566,
    lng: 2.3522,
    attractions: [
      { id: 'a1', name: '埃菲尔铁塔', description: '巴黎标志性建筑，高324米', source: 'https://en.wikipedia.org/wiki/Eiffel_Tower' },
      { id: 'a2', name: '卢浮宫', description: '世界最大的艺术博物馆', source: 'https://en.wikipedia.org/wiki/Louvre' },
      { id: 'a3', name: '圣母院', description: '哥特式建筑的杰作', source: 'https://en.wikipedia.org/wiki/Notre-Dame_de_Paris' },
    ],
  },
  {
    id: 'tokyo',
    name: '东京',
    nameEn: 'Tokyo',
    description: '传统与现代交融的霓虹都市',
    image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=640&h=360&fit=crop',
    lat: 35.6762,
    lng: 139.6503,
    attractions: [
      { id: 'b1', name: '东京塔', description: '东京的地标性建筑', source: 'https://en.wikipedia.org/wiki/Tokyo_Tower' },
      { id: 'b2', name: '浅草寺', description: '东京最古老的寺庙', source: 'https://en.wikipedia.org/wiki/Sens%C5%8D-ji' },
      { id: 'b3', name: '涩谷十字路口', description: '世界最繁忙的人行横道', source: 'https://en.wikipedia.org/wiki/Shibuya_Crossing' },
    ],
  },
  {
    id: 'newyork',
    name: '纽约',
    nameEn: 'New York',
    description: '不夜城，世界金融与文化中心',
    image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=640&h=360&fit=crop',
    lat: 40.7128,
    lng: -74.006,
    attractions: [
      { id: 'c1', name: '自由女神像', description: '美国的象征', source: 'https://en.wikipedia.org/wiki/Statue_of_Liberty' },
      { id: 'c2', name: '时代广场', description: '世界的十字路口', source: 'https://en.wikipedia.org/wiki/Times_Square' },
      { id: 'c3', name: '中央公园', description: '城市中的绿洲', source: 'https://en.wikipedia.org/wiki/Central_Park' },
    ],
  },
  {
    id: 'london',
    name: '伦敦',
    nameEn: 'London',
    description: '历史悠久的雾都，绅士与朋克并存',
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=640&h=360&fit=crop',
    lat: 51.5074,
    lng: -0.1278,
    attractions: [
      { id: 'd1', name: '大本钟', description: '英国的标志性钟楼', source: 'https://en.wikipedia.org/wiki/Big_Ben' },
      { id: 'd2', name: '伦敦眼', description: '巨型摩天轮', source: 'https://en.wikipedia.org/wiki/London_Eye' },
      { id: 'd3', name: '白金汉宫', description: '英国王室官邸', source: 'https://en.wikipedia.org/wiki/Buckingham_Palace' },
    ],
  },
  {
    id: 'sydney',
    name: '悉尼',
    nameEn: 'Sydney',
    description: '南半球的明珠，海滩与歌剧院',
    image: 'https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?w=640&h=360&fit=crop',
    lat: -33.8688,
    lng: 151.2093,
    attractions: [
      { id: 'e1', name: '悉尼歌剧院', description: '世界著名的表演艺术中心', source: 'https://en.wikipedia.org/wiki/Sydney_Opera_House' },
      { id: 'e2', name: '海港大桥', description: '世界最高的钢铁拱桥', source: 'https://en.wikipedia.org/wiki/Sydney_Harbour_Bridge' },
      { id: 'e3', name: '邦迪海滩', description: '悉尼最著名的海滩', source: 'https://en.wikipedia.org/wiki/Bondi_Beach' },
    ],
  },
  {
    id: 'rome',
    name: '罗马',
    nameEn: 'Rome',
    description: '永恒之城，古罗马帝国的心脏',
    image: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5?w=640&h=360&fit=crop',
    lat: 41.9028,
    lng: 12.4964,
    attractions: [
      { id: 'f1', name: '斗兽场', description: '古罗马最大的圆形角斗场', source: 'https://en.wikipedia.org/wiki/Colosseum' },
      { id: 'f2', name: '梵蒂冈', description: '世界最小的国家', source: 'https://en.wikipedia.org/wiki/Vatican_City' },
      { id: 'f3', name: '许愿池', description: '罗马最大的巴洛克喷泉', source: 'https://en.wikipedia.org/wiki/Trevi_Fountain' },
    ],
  },
  {
    id: 'beijing',
    name: '北京',
    nameEn: 'Beijing',
    description: '千年古都，现代与传统的完美融合',
    image: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=640&h=360&fit=crop',
    lat: 39.9042,
    lng: 116.4074,
    attractions: [
      { id: 'g1', name: '故宫', description: '明清两代的皇家宫殿', source: 'https://en.wikipedia.org/wiki/Forbidden_City' },
      { id: 'g2', name: '长城', description: '世界七大奇迹之一', source: 'https://en.wikipedia.org/wiki/Great_Wall_of_China' },
      { id: 'g3', name: '颐和园', description: '皇家园林博物馆', source: 'https://en.wikipedia.org/wiki/Summer_Palace' },
    ],
  },
  {
    id: 'bangkok',
    name: '曼谷',
    nameEn: 'Bangkok',
    description: '微笑之国的首都，寺庙与夜市',
    image: 'https://images.unsplash.com/photo-1508009603885-50cf7c579365?w=640&h=360&fit=crop',
    lat: 13.7563,
    lng: 100.5018,
    attractions: [
      { id: 'h1', name: '大皇宫', description: '泰国王室的宫殿', source: 'https://en.wikipedia.org/wiki/Grand_Palace' },
      { id: 'h2', name: '卧佛寺', description: '拥有世界最大的卧佛', source: 'https://en.wikipedia.org/wiki/Wat_Pho' },
      { id: 'h3', name: '考山路', description: '背包客的天堂', source: 'https://en.wikipedia.org/wiki/Khao_San_Road' },
    ],
  },
  {
    id: 'dubai',
    name: '迪拜',
    nameEn: 'Dubai',
    description: '沙漠中的奇迹，奢华与未来感',
    image: 'https://images.unsplash.com/photo-1512453979798-5ea266f8880c?w=640&h=360&fit=crop',
    lat: 25.2048,
    lng: 55.2708,
    attractions: [
      { id: 'i1', name: '哈利法塔', description: '世界最高的建筑', source: 'https://en.wikipedia.org/wiki/Burj_Khalifa' },
      { id: 'i2', name: '棕榈岛', description: '人工岛屿奇迹', source: 'https://en.wikipedia.org/wiki/Palm_Islands' },
      { id: 'i3', name: '迪拜购物中心', description: '世界最大的购物中心', source: 'https://en.wikipedia.org/wiki/The_Dubai_Mall' },
    ],
  },
];

db.data.cities = citiesData;
await db.write();

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

function getRoom(roomCode) {
  return db.data.rooms.find((r) => r.code === roomCode);
}

function saveRoom(room) {
  const index = db.data.rooms.findIndex((r) => r.id === room.id);
  if (index >= 0) {
    db.data.rooms[index] = room;
  } else {
    db.data.rooms.push(room);
  }
  db.write();
}

app.get('/api/cities/search', (req, res) => {
  const { q } = req.query;
  if (!q || typeof q !== 'string') {
    return res.json([]);
  }
  const query = q.toLowerCase();
  const results = db.data.cities.filter(
    (city) =>
      city.name.toLowerCase().includes(query) ||
      city.nameEn.toLowerCase().includes(query) ||
      city.description.toLowerCase().includes(query)
  );
  res.json(results);
});

app.get('/api/cities/:id', (req, res) => {
  const city = db.data.cities.find((c) => c.id === req.params.id);
  if (!city) {
    return res.status(404).json({ error: 'City not found' });
  }
  res.json(city);
});

app.post('/api/rooms', (req, res) => {
  const { userId, userName } = req.body;
  let code;
  do {
    code = generateRoomCode();
  } while (getRoom(code));

  const room = {
    id: uuidv4(),
    code,
    phase: 'search',
    selectedCities: [],
    votes: {},
    finalCities: [],
    members: [
      {
        id: userId,
        name: userName,
        colorIndex: 0,
      },
    ],
    votingStartTime: null,
    createdAt: Date.now(),
  };
  saveRoom(room);
  res.json(room);
});

app.get('/api/rooms/:code', (req, res) => {
  const room = getRoom(req.params.code);
  if (!room) {
    return res.status(404).json({ error: 'Room not found' });
  }
  res.json(room);
});

io.on('connection', (socket) => {
  let currentRoomCode = null;
  let currentUserId = null;

  socket.on('join-room', ({ roomCode, userId, userName }) => {
    const room = getRoom(roomCode);
    if (!room) {
      socket.emit('error', 'Room not found');
      return;
    }

    const existingMember = room.members.find((m) => m.id === userId);
    if (!existingMember) {
      const colorIndex = room.members.length % 6;
      room.members.push({ id: userId, name: userName, colorIndex });
      saveRoom(room);
    }

    socket.join(roomCode);
    currentRoomCode = roomCode;
    currentUserId = userId;

    io.to(roomCode).emit('room-updated', room);
    io.to(roomCode).emit('member-joined', { userId, userName });
  });

  socket.on('add-city', ({ cityId }) => {
    const room = getRoom(currentRoomCode);
    if (!room || room.phase !== 'search') return;

    const city = db.data.cities.find((c) => c.id === cityId);
    if (!city) return;

    if (!room.selectedCities.find((c) => c.id === cityId)) {
      room.selectedCities.push({
        id: city.id,
        name: city.name,
        nameEn: city.nameEn,
        description: city.description,
        image: city.image,
        lat: city.lat,
        lng: city.lng,
        attractions: [...city.attractions],
        addedBy: currentUserId,
      });
      saveRoom(room);
      io.to(currentRoomCode).emit('room-updated', room);
    }
  });

  socket.on('remove-city', ({ cityId }) => {
    const room = getRoom(currentRoomCode);
    if (!room || room.phase !== 'search') return;

    room.selectedCities = room.selectedCities.filter((c) => c.id !== cityId);
    saveRoom(room);
    io.to(currentRoomCode).emit('room-updated', room);
  });

  socket.on('start-voting', () => {
    const room = getRoom(currentRoomCode);
    if (!room || room.phase !== 'search') return;
    if (room.selectedCities.length === 0) return;

    room.phase = 'voting';
    room.votingStartTime = Date.now();
    room.votes = {};
    room.selectedCities.forEach((city) => {
      room.votes[city.id] = { yes: [], no: [] };
    });
    saveRoom(room);
    io.to(currentRoomCode).emit('voting-started', room);
    io.to(currentRoomCode).emit('room-updated', room);
  });

  socket.on('vote', ({ cityId, vote }) => {
    const room = getRoom(currentRoomCode);
    if (!room || room.phase !== 'voting') return;
    if (!room.votes[cityId]) return;

    room.votes[cityId].yes = room.votes[cityId].yes.filter((id) => id !== currentUserId);
    room.votes[cityId].no = room.votes[cityId].no.filter((id) => id !== currentUserId);

    if (vote === 'yes') {
      room.votes[cityId].yes.push(currentUserId);
    } else if (vote === 'no') {
      room.votes[cityId].no.push(currentUserId);
    }

    saveRoom(room);
    io.to(currentRoomCode).emit('vote-updated', { cityId, votes: room.votes[cityId] });
  });

  socket.on('end-voting', () => {
    const room = getRoom(currentRoomCode);
    if (!room || room.phase !== 'voting') return;

    const memberCount = room.members.length;
    const passedCities = room.selectedCities.filter((city) => {
      const yesVotes = room.votes[city.id]?.yes.length || 0;
      return yesVotes > memberCount / 2;
    });

    room.finalCities = passedCities.map((city) => ({
      ...city,
      attractions: city.attractions || [],
    }));
    room.phase = 'final';
    saveRoom(room);
    io.to(currentRoomCode).emit('voting-ended', room);
    io.to(currentRoomCode).emit('room-updated', room);
  });

  socket.on('reorder-attractions', ({ cityId, attractionIds }) => {
    const room = getRoom(currentRoomCode);
    if (!room || room.phase !== 'final') return;

    const city = room.finalCities.find((c) => c.id === cityId);
    if (!city) return;

    const ordered = [];
    const remaining = [...city.attractions];
    attractionIds.forEach((id) => {
      const idx = remaining.findIndex((a) => a.id === id);
      if (idx >= 0) {
        ordered.push(remaining[idx]);
        remaining.splice(idx, 1);
      }
    });
    city.attractions = [...ordered, ...remaining];

    saveRoom(room);
    io.to(currentRoomCode).emit('room-updated', room);
  });

  socket.on('add-attraction', ({ cityId, attraction }) => {
    const room = getRoom(currentRoomCode);
    if (!room || room.phase !== 'final') return;

    const city = room.finalCities.find((c) => c.id === cityId);
    if (!city) return;

    city.attractions.push({
      id: uuidv4(),
      name: attraction.name,
      description: attraction.description || '',
      source: attraction.source || '',
    });

    saveRoom(room);
    io.to(currentRoomCode).emit('room-updated', room);
  });

  socket.on('remove-attraction', ({ cityId, attractionId }) => {
    const room = getRoom(currentRoomCode);
    if (!room || room.phase !== 'final') return;

    const city = room.finalCities.find((c) => c.id === cityId);
    if (!city) return;

    city.attractions = city.attractions.filter((a) => a.id !== attractionId);
    saveRoom(room);
    io.to(currentRoomCode).emit('room-updated', room);
  });

  socket.on('reset-to-search', () => {
    const room = getRoom(currentRoomCode);
    if (!room) return;

    room.phase = 'search';
    room.votes = {};
    room.finalCities = [];
    room.votingStartTime = null;
    saveRoom(room);
    io.to(currentRoomCode).emit('room-updated', room);
  });

  socket.on('disconnect', () => {
    if (currentRoomCode && currentUserId) {
      const room = getRoom(currentRoomCode);
      if (room) {
        io.to(currentRoomCode).emit('member-left', { userId: currentUserId });
      }
    }
  });
});

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => {
  console.log(`TravelSage server running on port ${PORT}`);
});
