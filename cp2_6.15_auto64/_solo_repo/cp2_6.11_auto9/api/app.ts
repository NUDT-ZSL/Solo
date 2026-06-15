import express, {
  type Request,
  type Response,
  type NextFunction,
} from 'express';
import cors from 'cors';
import path from 'path';
import dotenv from 'dotenv';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app: express.Application = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const audioStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `audio_${uuidv4()}${ext}`);
  },
});

const imageStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `image_${uuidv4()}${ext}`);
  },
});

const audioUpload = multer({
  storage: audioStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 WAV/MP3 格式'));
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

const imageUpload = multer({
  storage: imageStorage,
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 JPG/PNG 格式'));
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 },
});

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (_req, file, cb) => {
      const prefix = file.fieldname === 'audio' ? 'audio_' : 'image_';
      const ext = path.extname(file.originalname);
      cb(null, `${prefix}${uuidv4()}${ext}`);
    },
  }),
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === 'audio') {
      const allowed = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('仅支持 WAV/MP3 格式'));
      }
    } else if (file.fieldname === 'image') {
      const allowed = ['image/jpeg', 'image/png', 'image/jpg'];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('仅支持 JPG/PNG 格式'));
      }
    } else {
      cb(null, true);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

interface StoredMarker {
  id: string;
  userId: string;
  username: string;
  lat: number;
  lng: number;
  title: string;
  note: string;
  audioUrl: string;
  imageUrl: string;
  emotionTag: string;
  isPublic: boolean;
  likes: number;
  likesToday: number;
  likeDates: Record<string, number>;
  playCount: number;
  comments: StoredComment[];
  createdAt: string;
  expiresAt: string;
}

interface StoredComment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

interface StoredFavorite {
  id: string;
  userId: string;
  markerId: string;
  note: string;
  createdAt: string;
}

let markers: StoredMarker[] = [];
let favorites: StoredFavorite[] = [];

function seedData() {
  const now = new Date();
  const sampleMarkers: Partial<StoredMarker>[] = [
    {
      id: 'seed-1',
      userId: 'demo-user-1',
      username: '声景漫步者',
      lat: 39.9087,
      lng: 116.3975,
      title: '胡同深处的鸽哨',
      note: '午后阳光洒在青砖灰瓦上，远处传来悠扬的鸽哨声，伴随着老人下棋的落子声。',
      emotionTag: 'serene',
      isPublic: true,
    },
    {
      id: 'seed-2',
      userId: 'demo-user-1',
      username: '声景漫步者',
      lat: 39.9168,
      lng: 116.3975,
      title: '咖啡馆研磨声',
      note: '咖啡豆在研磨机中旋转的声音，混合着牛奶蒸汽的嘶嘶声，窗外的雨声做背景。',
      emotionTag: 'warm',
      isPublic: true,
    },
    {
      id: 'seed-3',
      userId: 'demo-user-1',
      username: '声景漫步者',
      lat: 39.9342,
      lng: 116.3904,
      title: '公园清晨鸟鸣',
      note: '晨光中鸟儿在枝头欢唱，露水从叶尖滴落，晨练老人的太极扇在空中划过。',
      emotionTag: 'cheerful',
      isPublic: true,
    },
    {
      id: 'seed-4',
      userId: 'demo-user-1',
      username: '声景漫步者',
      lat: 39.9054,
      lng: 116.3911,
      title: '地铁站的脚步回响',
      note: '地下通道里脚步声此起彼伏，列车进站的轰鸣与报站广播交织成独特的节奏。',
      emotionTag: 'noisy',
      isPublic: true,
    },
    {
      id: 'seed-5',
      userId: 'demo-user-1',
      username: '声景漫步者',
      lat: 39.8822,
      lng: 116.4066,
      title: '夜市人声鼎沸',
      note: '烤串滋滋作响，小贩的吆喝声、食客的交谈声汇成一片热闹的声浪。',
      emotionTag: 'noisy',
      isPublic: true,
    },
  ];

  for (const sm of sampleMarkers) {
    const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);
    markers.push({
      id: sm.id || uuidv4(),
      userId: sm.userId || 'demo-user-1',
      username: sm.username || '声景漫步者',
      lat: sm.lat || 0,
      lng: sm.lng || 0,
      title: sm.title || '',
      note: sm.note || '',
      audioUrl: '',
      imageUrl: '',
      emotionTag: sm.emotionTag || 'serene',
      isPublic: sm.isPublic !== false,
      likes: Math.floor(Math.random() * 50),
      likesToday: Math.floor(Math.random() * 5),
      likeDates: {},
      playCount: Math.floor(Math.random() * 100),
      comments: [],
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
    });
  }
}

seedData();

function checkExpiredMarkers() {
  const now = new Date();
  for (const m of markers) {
    if (m.isPublic && new Date(m.expiresAt) <= now) {
      m.isPublic = false;
    }
  }
}

checkExpiredMarkers();
setInterval(checkExpiredMarkers, 24 * 60 * 60 * 1000);

function haversineDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

app.get('/api/markers', (req: Request, res: Response) => {
  const { search, tag, sort, page: pageStr, limit: limitStr, lat, lng } = req.query;

  let result = markers.filter((m) => m.isPublic);

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.note.toLowerCase().includes(q)
    );
  }

  if (tag && typeof tag === 'string') {
    result = result.filter((m) => m.emotionTag === tag);
  }

  const refLat = lat ? parseFloat(lat as string) : 39.908;
  const refLng = lng ? parseFloat(lng as string) : 116.397;

  if (sort === 'distance') {
    result.sort((a, b) => {
      const dA = haversineDistance(refLat, refLng, a.lat, a.lng);
      const dB = haversineDistance(refLat, refLng, b.lat, b.lng);
      return dA - dB;
    });
  } else if (sort === 'newest') {
    result.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } else if (sort === 'popular') {
    result.sort((a, b) => b.likes - a.likes);
  }

  const limit = limitStr ? Math.min(parseInt(limitStr as string, 10), 100) : 20;
  const page = pageStr ? parseInt(pageStr as string, 10) : 1;
  const start = (page - 1) * limit;
  const paged = result.slice(start, start + limit);

  res.json({ markers: paged, total: result.length });
});

app.post('/api/markers', upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'image', maxCount: 1 },
]), (req: Request, res: Response) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const { lat, lng, title, note, emotionTag, userId } = req.body;

  if (!files?.audio?.[0]) {
    res.status(400).json({ error: '音频文件必填' });
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const marker: StoredMarker = {
    id: uuidv4(),
    userId: userId || 'demo-user-1',
    username: '声景漫步者',
    lat: parseFloat(lat),
    lng: parseFloat(lng),
    title: title || '未命名声景',
    note: note || '',
    audioUrl: `/uploads/${files.audio[0].filename}`,
    imageUrl: files?.image?.[0] ? `/uploads/${files.image[0].filename}` : '',
    emotionTag: emotionTag || 'serene',
    isPublic: true,
    likes: 0,
    likesToday: 0,
    likeDates: {},
    playCount: 0,
    comments: [],
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  markers.push(marker);
  res.status(201).json(marker);
});

app.get('/api/markers/:id', (req: Request, res: Response) => {
  const marker = markers.find((m) => m.id === req.params.id);
  if (!marker) {
    res.status(404).json({ error: '标记不存在' });
    return;
  }
  res.json(marker);
});

app.put('/api/markers/:id', (req: Request, res: Response) => {
  const idx = markers.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '标记不存在' });
    return;
  }

  const { note, emotionTag, isPublic, title, lat, lng } = req.body;
  const m = markers[idx];

  if (note !== undefined) m.note = note;
  if (emotionTag !== undefined) m.emotionTag = emotionTag;
  if (isPublic !== undefined) m.isPublic = isPublic;
  if (title !== undefined) m.title = title;
  if (lat !== undefined) m.lat = lat;
  if (lng !== undefined) m.lng = lng;

  res.json(m);
});

app.post('/api/markers/:id/like', (req: Request, res: Response) => {
  const marker = markers.find((m) => m.id === req.params.id);
  if (!marker) {
    res.status(404).json({ error: '标记不存在' });
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  marker.likes += 1;

  if (!marker.likeDates[today]) {
    marker.likeDates[today] = 0;
  }
  marker.likeDates[today] += 1;

  marker.likesToday = marker.likeDates[today] || 0;

  res.json({ likes: marker.likes, likesToday: marker.likesToday });
});

app.post('/api/markers/:id/comment', (req: Request, res: Response) => {
  const marker = markers.find((m) => m.id === req.params.id);
  if (!marker) {
    res.status(404).json({ error: '标记不存在' });
    return;
  }

  const { content, userId, username } = req.body;
  if (!content || content.length > 100) {
    res.status(400).json({ error: '评论内容不能为空且最多100字' });
    return;
  }

  const comment: StoredComment = {
    id: uuidv4(),
    userId: userId || 'demo-user-1',
    username: username || '声景漫步者',
    content,
    createdAt: new Date().toISOString(),
  };

  marker.comments.push(comment);
  res.status(201).json(comment);
});

app.get('/api/users/:id/markers', (req: Request, res: Response) => {
  const { page: pageStr } = req.query;
  const userMarkers = markers
    .filter((m) => m.userId === req.params.id)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const page = pageStr ? parseInt(pageStr as string, 10) : 1;
  const limit = 10;
  const start = (page - 1) * limit;
  const paged = userMarkers.slice(start, start + limit);

  res.json({ markers: paged, total: userMarkers.length });
});

app.post('/api/favorites/:id', (req: Request, res: Response) => {
  const markerId = req.params.id;
  const { userId, note } = req.body;

  const marker = markers.find((m) => m.id === markerId);
  if (!marker) {
    res.status(404).json({ error: '标记不存在' });
    return;
  }

  const existing = favorites.find(
    (f) => f.markerId === markerId && f.userId === (userId || 'demo-user-1')
  );
  if (existing) {
    res.status(400).json({ error: '已收藏' });
    return;
  }

  const fav: StoredFavorite = {
    id: uuidv4(),
    userId: userId || 'demo-user-1',
    markerId,
    note: note || '',
    createdAt: new Date().toISOString(),
  };

  favorites.push(fav);
  res.status(201).json(fav);
});

app.get('/api/favorites', (req: Request, res: Response) => {
  const { page: pageStr, userId } = req.query;
  const uid = (userId as string) || 'demo-user-1';

  const userFavs = favorites
    .filter((f) => f.userId === uid)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

  const page = pageStr ? parseInt(pageStr as string, 10) : 1;
  const limit = 10;
  const start = (page - 1) * limit;
  const paged = userFavs.slice(start, start + limit);

  const withMarkers = paged.map((f) => ({
    ...f,
    marker: markers.find((m) => m.id === f.markerId) || null,
  }));

  res.json({ favorites: withMarkers, total: userFavs.length });
});

app.delete('/api/favorites/:id', (req: Request, res: Response) => {
  const idx = favorites.findIndex((f) => f.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: '收藏不存在' });
    return;
  }
  favorites.splice(idx, 1);
  res.json({ success: true });
});

app.use(
  '/api/health',
  (_req: Request, res: Response, _next: NextFunction): void => {
    res.status(200).json({ success: true, message: 'ok' });
  }
);

app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(error.message);
  res.status(500).json({ success: false, error: error.message || 'Server internal error' });
});

app.use((_req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

export default app;
