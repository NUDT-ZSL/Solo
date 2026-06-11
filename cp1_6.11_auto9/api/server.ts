import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const audioTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/x-wav'];
    const imageTypes = ['image/jpeg', 'image/png', 'image/jpg'];
    if (file.fieldname === 'audio' && !audioTypes.includes(file.mimetype)) {
      cb(new Error('Only WAV/MP3 audio files allowed'));
      return;
    }
    if (file.fieldname === 'image' && !imageTypes.includes(file.mimetype)) {
      cb(new Error('Only JPG/PNG image files allowed'));
      return;
    }
    cb(null, true);
  },
});

interface Comment {
  id: string;
  userId: string;
  username: string;
  content: string;
  createdAt: string;
}

interface MarkerData {
  id: string;
  userId: string;
  lng: number;
  lat: number;
  title: string;
  note: string;
  tag: string;
  audioUrl: string;
  imageUrl: string;
  isPublic: boolean;
  likes: number;
  likesToday: number;
  likesTodayDate: string;
  comments: Comment[];
  playCount: number;
  createdAt: string;
  expiresAt: string;
}

interface FavoriteData {
  markerId: string;
  userId: string;
  note: string;
  createdAt: string;
}

interface UserData {
  id: string;
  username: string;
  avatar: string;
}

let markers: MarkerData[] = [];
let favorites: FavoriteData[] = [];
let users: UserData[] = [];

const DATA_FILE = path.join(uploadsDir, 'data.json');

function loadData() {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const data = JSON.parse(raw);
    markers = data.markers || [];
    favorites = data.favorites || [];
    users = data.users || [];
  }
}

function saveData() {
  fs.writeFileSync(DATA_FILE, JSON.stringify({ markers, favorites, users }, null, 2));
}

loadData();

function checkExpiry() {
  const now = new Date().toISOString();
  markers.forEach((m) => {
    if (m.isPublic && m.expiresAt && now > m.expiresAt) {
      m.isPublic = false;
    }
  });
  saveData();
}
checkExpiry();

const TAG_COLORS: Record<string, string> = {
  '\u5B81\u9759': '#6ECB63',
  '\u55A7\u95F9': '#FF6B6B',
  '\u5FE7\u90C1': '#5C6BC0',
  '\u6B22\u5FEB': '#FFD54F',
  '\u795E\u79D8': '#AB47BC',
  '\u6E29\u6696': '#FF8A65',
  '\u6E05\u65B0': '#26A69A',
  '\u6000\u65E7': '#8D6E63',
  '\u6D6A\u6F2B': '#EC407A',
  '\u9707\u64BC': '#FF7043',
};

app.get('/api/tags', (_req, res) => {
  res.json({ tags: Object.keys(TAG_COLORS), colors: TAG_COLORS });
});

app.get('/api/markers', (req, res) => {
  const { search, tag, sort, page = '1' } = req.query;
  let result = markers.filter((m) => m.isPublic);

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    result = result.filter(
      (m) =>
        m.title.toLowerCase().includes(q) ||
        m.note.toLowerCase().includes(q) ||
        m.tag.toLowerCase().includes(q)
    );
  }

  if (tag && typeof tag === 'string') {
    result = result.filter((m) => m.tag === tag);
  }

  if (sort === 'time' || sort === 'newest') {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  } else if (sort === 'distance') {
    const userLat = parseFloat(req.query.lat as string) || 0;
    const userLng = parseFloat(req.query.lng as string) || 0;
    result.sort((a, b) => {
      const da = Math.sqrt((a.lat - userLat) ** 2 + (a.lng - userLng) ** 2);
      const db = Math.sqrt((b.lat - userLat) ** 2 + (b.lng - userLng) ** 2);
      return da - db;
    });
  } else {
    result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const perPage = 100;
  const total = result.length;
  const start = (pageNum - 1) * perPage;
  const paged = result.slice(start, start + perPage);

  res.json({ markers: paged, total });
});

app.post('/api/markers', upload.fields([{ name: 'audio' }, { name: 'image' }]), (req, res) => {
  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const audioFile = files['audio']?.[0];
  const imageFile = files['image']?.[0];

  if (!audioFile) {
    res.status(400).json({ error: 'Audio file is required' });
    return;
  }

  const { lng, lat, note = '', tag, isPublic = 'true', title = '' } = req.body;
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const marker: MarkerData = {
    id: uuidv4(),
    userId: req.body.userId || 'anonymous',
    lng: parseFloat(lng) || 0,
    lat: parseFloat(lat) || 0,
    title: title || `Sound at ${parseFloat(lng).toFixed(4)}, ${parseFloat(lat).toFixed(4)}`,
    note: note as string,
    tag: tag as string,
    audioUrl: `/uploads/${audioFile.filename}`,
    imageUrl: imageFile ? `/uploads/${imageFile.filename}` : '',
    isPublic: isPublic === 'true',
    likes: 0,
    likesToday: 0,
    likesTodayDate: now.toISOString().split('T')[0],
    comments: [],
    playCount: 0,
    createdAt: now.toISOString(),
    expiresAt: expiresAt.toISOString(),
  };

  markers.push(marker);
  saveData();
  res.json({ marker });
});

app.get('/api/markers/:id', (req, res) => {
  const marker = markers.find((m) => m.id === req.params.id);
  if (!marker) {
    res.status(404).json({ error: 'Marker not found' });
    return;
  }
  marker.playCount++;
  saveData();
  res.json({ marker });
});

app.put('/api/markers/:id', upload.fields([{ name: 'image' }]), (req, res) => {
  const idx = markers.findIndex((m) => m.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Marker not found' });
    return;
  }

  const files = req.files as { [fieldname: string]: Express.Multer.File[] };
  const imageFile = files?.['image']?.[0];

  const marker = markers[idx];
  if (req.body.note !== undefined) marker.note = req.body.note;
  if (req.body.tag !== undefined) marker.tag = req.body.tag;
  if (req.body.isPublic !== undefined) marker.isPublic = req.body.isPublic === 'true';
  if (req.body.lng !== undefined) marker.lng = parseFloat(req.body.lng);
  if (req.body.lat !== undefined) marker.lat = parseFloat(req.body.lat);
  if (req.body.title !== undefined) marker.title = req.body.title;
  if (imageFile) marker.imageUrl = `/uploads/${imageFile.filename}`;

  saveData();
  res.json({ marker });
});

app.post('/api/markers/:id/like', (req, res) => {
  const marker = markers.find((m) => m.id === req.params.id);
  if (!marker) {
    res.status(404).json({ error: 'Marker not found' });
    return;
  }

  const today = new Date().toISOString().split('T')[0];
  if (marker.likesTodayDate !== today) {
    marker.likesToday = 0;
    marker.likesTodayDate = today;
  }

  marker.likes++;
  marker.likesToday++;
  saveData();
  res.json({ likes: marker.likes, likesToday: marker.likesToday });
});

app.post('/api/markers/:id/comment', (req, res) => {
  const marker = markers.find((m) => m.id === req.params.id);
  if (!marker) {
    res.status(404).json({ error: 'Marker not found' });
    return;
  }

  const { content, userId = 'anonymous', username = 'Anonymous' } = req.body;
  if (!content || (content as string).length > 100) {
    res.status(400).json({ error: 'Comment must be 1-100 characters' });
    return;
  }

  const comment: Comment = {
    id: uuidv4(),
    userId,
    username,
    content,
    createdAt: new Date().toISOString(),
  };

  marker.comments.push(comment);
  saveData();
  res.json({ comment });
});

app.get('/api/users/:id/markers', (req, res) => {
  const { page = '1' } = req.query;
  const userId = req.params.id;
  let result = markers.filter((m) => m.userId === userId);
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const pageNum = parseInt(page as string, 10) || 1;
  const perPage = 10;
  const total = result.length;
  const start = (pageNum - 1) * perPage;
  const paged = result.slice(start, start + perPage);

  res.json({ markers: paged, total });
});

app.post('/api/favorites/:id', (req, res) => {
  const markerId = req.params.id;
  const marker = markers.find((m) => m.id === markerId);
  if (!marker) {
    res.status(404).json({ error: 'Marker not found' });
    return;
  }

  const { userId, note = '' } = req.body;
  const existing = favorites.find((f) => f.markerId === markerId && f.userId === userId);
  if (existing) {
    existing.note = note;
    saveData();
    res.json({ favorite: existing });
    return;
  }

  const fav: FavoriteData = {
    markerId,
    userId,
    note: (note as string).slice(0, 50),
    createdAt: new Date().toISOString(),
  };
  favorites.push(fav);
  saveData();
  res.json({ favorite: fav });
});

app.get('/api/favorites', (req, res) => {
  const { userId, page = '1' } = req.query;
  let userFavs = favorites;
  if (userId) {
    userFavs = favorites.filter((f) => f.userId === (userId as string));
  }

  const pageNum = parseInt(page as string, 10) || 1;
  const perPage = 10;
  const total = userFavs.length;
  const start = (pageNum - 1) * perPage;
  const paged = userFavs.slice(start, start + perPage);

  const result = paged.map((f) => {
    const marker = markers.find((m) => m.id === f.markerId);
    return { ...f, marker: marker || null };
  });

  res.json({ favorites: result, total });
});

app.delete('/api/favorites/:id', (req, res) => {
  const { userId } = req.body;
  const idx = favorites.findIndex((f) => f.markerId === req.params.id && f.userId === userId);
  if (idx === -1) {
    res.status(404).json({ error: 'Favorite not found' });
    return;
  }
  favorites.splice(idx, 1);
  saveData();
  res.json({ success: true });
});

app.post('/api/auth/register', (req, res) => {
  const { username } = req.body;
  if (!username) {
    res.status(400).json({ error: 'Username required' });
    return;
  }
  const existing = users.find((u) => u.username === username);
  if (existing) {
    res.json({ user: existing });
    return;
  }
  const user: UserData = {
    id: uuidv4(),
    username,
    avatar: '',
  };
  users.push(user);
  saveData();
  res.json({ user });
});

app.post('/api/auth/login', (req, res) => {
  const { username } = req.body;
  const user = users.find((u) => u.username === username);
  if (!user) {
    res.status(404).json({ error: 'User not found' });
    return;
  }
  res.json({ user });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
