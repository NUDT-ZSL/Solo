import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { db } from './db';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({ storage });

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = db.findUserByUsername(username);

  if (!user || user.password !== password) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }

  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      avatar: user.avatar,
    },
    token: `token-${user.id}-${Date.now()}`,
  });
});

app.post('/api/auth/register', (req, res) => {
  const { username, password } = req.body;

  if (db.findUserByUsername(username)) {
    return res.status(400).json({ error: '用户名已存在' });
  }

  const user = db.createUser(username, password);
  res.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
    },
  });
});

app.get('/api/trips', (req, res) => {
  const userId = req.query.userId as string;
  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' });
  }
  const trips = db.getTripsByUserId(userId);
  res.json({ trips });
});

app.get('/api/trips/:id', (req, res) => {
  const trip = db.getTripById(req.params.id);
  if (!trip) {
    return res.status(404).json({ error: '行程不存在' });
  }
  res.json({ trip });
});

app.post('/api/trips', (req, res) => {
  const { userId, ...tripData } = req.body;
  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' });
  }
  const trip = db.createTrip(userId, tripData);
  res.status(201).json({ trip });
});

app.put('/api/trips/:id', (req, res) => {
  const trip = db.updateTrip(req.params.id, req.body);
  if (!trip) {
    return res.status(404).json({ error: '行程不存在' });
  }
  res.json({ trip });
});

app.delete('/api/trips/:id', (req, res) => {
  const success = db.deleteTrip(req.params.id);
  if (!success) {
    return res.status(404).json({ error: '行程不存在' });
  }
  res.json({ success: true });
});

app.get('/api/attractions', (req, res) => {
  const query = (req.query.q as string) || '';
  const attractions = db.searchAttractions(query);
  res.json({ attractions });
});

app.get('/api/attractions/:id', (req, res) => {
  const attraction = db.getAttractionById(req.params.id);
  if (!attraction) {
    return res.status(404).json({ error: '景点不存在' });
  }
  res.json({ attraction });
});

app.post('/api/trips/:tripId/checkins', (req, res) => {
  const { tripId } = req.params;
  const checkIn = db.addCheckIn(tripId, req.body);
  if (!checkIn) {
    return res.status(404).json({ error: '行程不存在' });
  }
  res.status(201).json({ checkIn });
});

app.get('/api/trips/:tripId/checkins', (req, res) => {
  const trip = db.getTripById(req.params.tripId);
  if (!trip) {
    return res.status(404).json({ error: '行程不存在' });
  }
  res.json({ checkIns: trip.checkIns });
});

app.get('/api/weather', (req, res) => {
  const city = (req.query.city as string) || '北京';
  const weather = db.getWeather(city);
  res.json({ weather, city });
});

app.post('/api/photos/upload', upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: '未上传文件' });
  }
  const photoUrl = `/uploads/${req.file.filename}`;
  res.json({
    url: photoUrl,
    filename: req.file.filename,
    size: req.file.size,
  });
});

app.post('/api/photos/batch', upload.array('photos', 20), (req, res) => {
  if (!req.files || !Array.isArray(req.files)) {
    return res.status(400).json({ error: '未上传文件' });
  }
  const urls = req.files.map((file) => `/uploads/${file.filename}`);
  res.json({ urls });
});

app.post('/api/share', (req, res) => {
  const { tripId } = req.body;
  const trip = db.getTripById(tripId);
  if (!trip) {
    return res.status(404).json({ error: '行程不存在' });
  }
  const shareToken = Buffer.from(tripId).toString('base64');
  res.json({
    shareUrl: `/share/${shareToken}`,
    shareToken,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
});

app.get('/api/share/:token', (req, res) => {
  try {
    const tripId = Buffer.from(req.params.token, 'base64').toString('utf-8');
    const trip = db.getTripById(tripId);
    if (!trip) {
      return res.status(404).json({ error: '分享链接无效' });
    }
    res.json({ trip });
  } catch {
    res.status(400).json({ error: '无效的分享链接' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Travel Notes Server running on http://localhost:${PORT}`);
  console.log(`📸 Photo uploads served from: ${uploadsDir}`);
});
