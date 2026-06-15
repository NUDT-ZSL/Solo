import express, { Request, Response, NextFunction } from 'express';
import multer, { MemoryStorage } from 'multer';
import session from 'express-session';
import cors from 'cors';
import { deflateSync } from 'zlib';

declare module 'express-session' {
  interface SessionData {
    initialized?: boolean;
  }
}

interface PhotoMeta {
  id: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  latitude: number;
  longitude: number;
  dominantColor: string;
  takenAt: number;
  uploadedAt: number;
}

interface PhotoRecord extends PhotoMeta {
  buffer: Buffer;
}

interface UploadGroup {
  groupId: string;
  photoCount: number;
  timeRange: { start: number; end: number };
  distanceKm: number;
  photoIds: string[];
  uploadedAt: number;
}

interface UserData {
  photos: Map<string, PhotoRecord>;
  groups: UploadGroup[];
}

const app = express();
const PORT = 3001;

const userStore = new Map<string, UserData>();

const COLOR_PALETTE = [
  '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
  '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2',
  '#F1948A', '#82E0AA', '#F8C471', '#AED6F1', '#D7BDE2'
];

function crc32(buf: Buffer): number {
  let table: number[] | null = null;
  if (!table) {
    table = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) {
        c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      }
      table[n] = c;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function crc32Buf(buf: Buffer): Buffer {
  const out = Buffer.alloc(4);
  out.writeUInt32BE(crc32(buf), 0);
  return out;
}

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function calcGroupDistance(photos: PhotoMeta[]): number {
  if (photos.length < 2) return 0;
  const sorted = [...photos].sort((a, b) => a.takenAt - b.takenAt);
  let total = 0;
  for (let i = 1; i < sorted.length; i++) {
    total += haversineKm(
      sorted[i - 1].latitude, sorted[i - 1].longitude,
      sorted[i].latitude, sorted[i].longitude
    );
  }
  return total;
}

function uuid(): string {
  return crypto.randomUUID();
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getSessionId(req: Request): string {
  return (req.sessionID || uuid()) as string;
}

function getUserData(sid: string): UserData {
  if (!userStore.has(sid)) {
    userStore.set(sid, { photos: new Map(), groups: [] });
  }
  return userStore.get(sid)!;
}

function generateMockMeta(
  sessionId: string,
  filename: string,
  mimeType: string,
  uploadedAt: number,
  index: number,
  prev?: { lat: number; lon: number; time: number }
): PhotoMeta {
  let lat: number, lon: number, time: number;
  if (prev) {
    lat = Math.max(-90, Math.min(90, prev.lat + (Math.random() - 0.5) * 20));
    lon = ((prev.lon + (Math.random() - 0.5) * 30 + 540) % 360) - 180;
    time = prev.time + Math.random() * 6 * 3600 * 1000 + 1000;
  } else {
    lat = (Math.random() - 0.5) * 180;
    lon = (Math.random() - 0.5) * 360;
    const start2023 = new Date('2023-01-01T00:00:00Z').getTime();
    const end2023 = new Date('2023-12-31T23:59:59Z').getTime();
    time = start2023 + Math.random() * (end2023 - start2023);
  }
  void index;
  return {
    id: uuid(),
    sessionId,
    filename,
    mimeType,
    latitude: parseFloat(lat.toFixed(6)),
    longitude: parseFloat(lon.toFixed(6)),
    dominantColor: pickRandom(COLOR_PALETTE),
    takenAt: time,
    uploadedAt
  };
}

function generatePresetMockData(sid: string): { photos: PhotoRecord[]; groups: UploadGroup[] } {
  const result: PhotoRecord[] = [];
  const groups: UploadGroup[] = [];
  let prev: { lat: number; lon: number; time: number } | undefined;
  let groupIdx = 0;
  let photosInGroup = 0;
  let currentGroupIds: string[] = [];

  const start2023 = new Date('2023-01-15T00:00:00Z').getTime();
  const end2023 = new Date('2023-12-20T00:00:00Z').getTime();
  const range = end2023 - start2023;
  prev = {
    lat: (Math.random() - 0.5) * 180,
    lon: (Math.random() - 0.5) * 360,
    time: start2023
  };

  for (let i = 0; i < 200; i++) {
    if (photosInGroup >= 8 || i === 0) {
      if (currentGroupIds.length > 0) {
        const gPhotos = currentGroupIds
          .map(id => result.find(p => p.id === id)!)
          .filter(Boolean);
        groups.push({
          groupId: `preset-${groupIdx}`,
          photoCount: currentGroupIds.length,
          timeRange: {
            start: Math.min(...gPhotos.map(p => p.takenAt)),
            end: Math.max(...gPhotos.map(p => p.takenAt))
          },
          distanceKm: calcGroupDistance(gPhotos),
          photoIds: [...currentGroupIds],
          uploadedAt: prev.time
        });
        groupIdx++;
      }
      photosInGroup = 0;
      currentGroupIds = [];
      prev = {
        lat: (Math.random() - 0.5) * 180,
        lon: (Math.random() - 0.5) * 360,
        time: start2023 + (i / 200) * range + Math.random() * 86400000
      };
    }

    const meta = generateMockMeta(
      sid,
      `preset-${i}.jpg`,
      'image/jpeg',
      prev.time,
      i,
      prev
    );
    prev = { lat: meta.latitude, lon: meta.longitude, time: meta.takenAt };
    result.push({ ...meta, buffer: Buffer.alloc(0) });
    currentGroupIds.push(meta.id);
    photosInGroup++;
  }

  if (currentGroupIds.length > 0) {
    const gPhotos = currentGroupIds
      .map(id => result.find(p => p.id === id)!)
      .filter(Boolean);
    groups.push({
      groupId: `preset-${groupIdx}`,
      photoCount: currentGroupIds.length,
      timeRange: {
        start: Math.min(...gPhotos.map(p => p.takenAt)),
        end: Math.max(...gPhotos.map(p => p.takenAt))
      },
      distanceKm: calcGroupDistance(gPhotos),
      photoIds: [...currentGroupIds],
      uploadedAt: prev.time
    });
  }

  return { photos: result, groups: groups.reverse() };
}

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(
  session({
    secret: 'guangying-zuji-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, maxAge: 7 * 24 * 60 * 60 * 1000 }
  })
);

const storage = multer.memoryStorage();
const upload = multer({
  storage: storage as MemoryStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 10 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_TYPE') as unknown as multer.FileFilterCallbackError, false);
    }
  }
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  if (err.message === 'INVALID_TYPE') {
    return res.status(400).json({ success: false, error: '仅支持 JPG/PNG 格式', code: 'INVALID_TYPE' });
  }
  if (err.message.includes('File too large')) {
    return res.status(400).json({ success: false, error: '单张照片不能超过 5MB', code: 'FILE_TOO_LARGE' });
  }
  res.status(500).json({ success: false, error: err.message || '内部错误', code: 'INTERNAL' });
});

app.post('/api/upload', (req, res) => {
  upload.array('photos', 10)(req, res, (err) => {
    if (err) {
      if (err.message === 'INVALID_TYPE') {
        return res.status(400).json({ success: false, error: '仅支持 JPG/PNG 格式', code: 'INVALID_TYPE' });
      }
      if (err.message.includes('File too large')) {
        return res.status(400).json({ success: false, error: '单张照片不能超过 5MB', code: 'FILE_TOO_LARGE' });
      }
      if (err.message.includes('Too many files')) {
        return res.status(400).json({ success: false, error: '单次最多上传 10 张照片', code: 'TOO_MANY_FILES' });
      }
      return res.status(500).json({ success: false, error: err.message, code: 'INTERNAL' });
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: '请选择照片', code: 'INVALID_TYPE' });
    }

    const sid = getSessionId(req);
    const userData = getUserData(sid);
    const uploadedAt = Date.now();
    const newPhotos: PhotoMeta[] = [];
    let prev: { lat: number; lon: number; time: number } | undefined;

    files.forEach((f, idx) => {
      const meta = generateMockMeta(sid, f.originalname, f.mimetype, uploadedAt, idx, prev);
      userData.photos.set(meta.id, { ...meta, buffer: f.buffer });
      newPhotos.push(meta);
      prev = { lat: meta.latitude, lon: meta.longitude, time: meta.takenAt };
    });

    const sorted = [...newPhotos].sort((a, b) => a.takenAt - b.takenAt);
    const group: UploadGroup = {
      groupId: uuid(),
      photoCount: newPhotos.length,
      timeRange: { start: sorted[0].takenAt, end: sorted[sorted.length - 1].takenAt },
      distanceKm: calcGroupDistance(newPhotos),
      photoIds: sorted.map(p => p.id),
      uploadedAt
    };
    userData.groups.unshift(group);

    res.json({ success: true, photos: newPhotos, group });
  });
});

app.get('/api/trajectory', (req, res) => {
  const sid = getSessionId(req);
  const userData = getUserData(sid);

  if (userData.photos.size === 0 && userData.groups.length === 0) {
    const preset = generatePresetMockData(sid);
    preset.photos.forEach(p => userData.photos.set(p.id, p));
    userData.groups = [...preset.groups];
  }

  const photosArr: PhotoMeta[] = [];
  userData.photos.forEach((v) => {
    const { buffer, ...meta } = v;
    void buffer;
    photosArr.push(meta);
  });
  photosArr.sort((a, b) => a.takenAt - b.takenAt);

  res.json({
    success: true,
    photos: photosArr,
    groups: userData.groups
  });
});

app.get('/api/photo/:id', async (req, res) => {
  const sid = getSessionId(req);
  const userData = getUserData(sid);
  const photo = userData.photos.get(req.params.id);

  if (!photo) {
    return res.status(404).json({ success: false, error: '照片不存在', code: 'NOT_FOUND' });
  }

  if (photo.buffer.length === 0) {
    const size = 100;
    const color = photo.dominantColor;
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const header = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52
    ]);
    const widthBytes = Buffer.alloc(4); widthBytes.writeUInt32BE(size, 0);
    const heightBytes = Buffer.alloc(4); heightBytes.writeUInt32BE(size, 0);
    const ihdrData = Buffer.concat([widthBytes, heightBytes, Buffer.from([0x08, 0x02, 0x00, 0x00, 0x00])]);
    const ihdrCrc = crc32Buf(Buffer.concat([Buffer.from('IHDR'), ihdrData]));
    const ihdrLen = Buffer.alloc(4); ihdrLen.writeUInt32BE(13, 0);
    const raw = Buffer.alloc(size * (size * 3 + 1));
    for (let y = 0; y < size; y++) {
      raw[y * (size * 3 + 1)] = 0;
      for (let x = 0; x < size; x++) {
        const idx = y * (size * 3 + 1) + 1 + x * 3;
        raw[idx] = r; raw[idx + 1] = g; raw[idx + 2] = b;
      }
    }
    const compressed = deflateSync(raw);
    const idatCrc = crc32Buf(Buffer.concat([Buffer.from('IDAT'), compressed]));
    const idatLen = Buffer.alloc(4); idatLen.writeUInt32BE(compressed.length, 0);
    const iend = Buffer.from([0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82]);
    const png = Buffer.concat([header, ihdrLen, Buffer.from('IHDR'), ihdrData, ihdrCrc, idatLen, Buffer.from('IDAT'), compressed, idatCrc, iend]);
    res.set('Content-Type', 'image/png');
    return res.send(png);
  }

  res.set('Content-Type', photo.mimeType);
  res.send(photo.buffer);
});

app.post('/api/reset', (req, res) => {
  const sid = getSessionId(req);
  userStore.delete(sid);
  res.json({ success: true });
});

app.get('/api/session', (req, res) => {
  res.json({ success: true, sessionId: getSessionId(req) });
});

app.listen(PORT, () => {
  console.log(`[光影足迹] 后端服务运行于 http://localhost:${PORT}`);
});
