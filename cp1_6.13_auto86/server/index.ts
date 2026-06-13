import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Datastore from 'nedb-promises';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const eventsDB = Datastore.create(path.join(dbDir, 'events.db'));
const musicDB = Datastore.create(path.join(dbDir, 'music.db'));
const guestbookDB = Datastore.create(path.join(dbDir, 'guestbook.db'));
const fansDB = Datastore.create(path.join(dbDir, 'fans.db'));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
});

async function seedData() {
  const eventCount = await eventsDB.count({});
  if (eventCount === 0) {
    const sampleEvents = [
      {
        name: '夏日摇滚夜',
        date: '2026-07-15',
        time: '20:00',
        location: '北京 Livehouse',
        price: 128,
        createdAt: Date.now(),
      },
      {
        name: '城市音乐节',
        date: '2026-08-20',
        time: '19:30',
        location: '上海 世博公园',
        price: 288,
        createdAt: Date.now(),
      },
      {
        name: '地下演出现场',
        date: '2026-09-10',
        time: '21:00',
        location: '广州 声音俱乐部',
        price: 88,
        createdAt: Date.now(),
      },
    ];
    await eventsDB.insert(sampleEvents);
  }

  const gbCount = await guestbookDB.count({});
  if (gbCount === 0) {
    const sampleMessages = [];
    const names = ['小明', '摇滚粉丝', '音乐狂人', '吉他手', '贝斯控', '鼓手王', '旋律', '和声', '节拍', '和弦'];
    const events = await eventsDB.find({});
    for (let i = 0; i < 25; i++) {
      const event = events[i % events.length];
      sampleMessages.push({
        eventId: event?._id || 'default',
        nickname: names[i % names.length],
        content: `期待这场演出！${i + 1}号一定要去！🎸🎶`,
        timestamp: Date.now() - i * 3600000,
      });
    }
    await guestbookDB.insert(sampleMessages);
  }

  const fansCount = await fansDB.count({});
  if (fansCount === 0) {
    const sampleFans = [];
    for (let i = 0; i < 50; i++) {
      sampleFans.push({
        nickname: `粉丝${i + 1}`,
        createdAt: Date.now() - i * 86400000,
      });
    }
    await fansDB.insert(sampleFans);
  }
}

app.get('/api/stats', async (req, res) => {
  try {
    const totalEvents = await eventsDB.count({});
    const totalMessages = await guestbookDB.count({});
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const newFans = await fansDB.count({ createdAt: { $gte: sevenDaysAgo } });
    res.json({ totalEvents, totalMessages, newFans });
  } catch (err) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

app.get('/api/events', async (req, res) => {
  try {
    const events = await eventsDB.find({}).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: '获取演出列表失败' });
  }
});

app.post('/api/events', async (req, res) => {
  try {
    const { name, date, time, location, price } = req.body;
    if (!name || !date || !time || !location || price === undefined) {
      return res.status(400).json({ error: '请填写完整信息' });
    }
    const event = await eventsDB.insert({
      name,
      date,
      time,
      location,
      price,
      createdAt: Date.now(),
    });
    res.json(event);
  } catch (err) {
    res.status(500).json({ error: '创建演出失败' });
  }
});

app.get('/api/music', async (req, res) => {
  try {
    const music = await musicDB.find({}).sort({ createdAt: -1 });
    res.json(music);
  } catch (err) {
    res.status(500).json({ error: '获取乐谱列表失败' });
  }
});

async function generateThumbnail(filePath: string, outputPath: string): Promise<void> {
  const roundedCorners = Buffer.from(
    `<svg width="200" height="280">
      <rect x="0" y="0" width="200" height="280" rx="8" ry="8" fill="white"/>
    </svg>`
  );

  await sharp(filePath)
    .resize(200, 280, { fit: 'cover' })
    .composite([{ input: roundedCorners, blend: 'dest-in' }])
    .jpeg({ quality: 85 })
    .toFile(outputPath);

  const finalBuffer = await sharp({
    create: {
      width: 200,
      height: 280,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: outputPath, top: 0, left: 0 }])
    .png()
    .toFile(outputPath.replace('.jpg', '.png'));

  fs.unlinkSync(outputPath);
}

app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '未上传文件' });
    }
    const { originalname, filename, mimetype, size } = req.file;
    let thumbnailPath = '';

    if (mimetype.startsWith('image/')) {
      const thumbName = `thumb_${filename}.png`;
      await generateThumbnail(req.file.path, path.join(uploadsDir, thumbName));
      thumbnailPath = `/uploads/${thumbName}`;
    } else if (mimetype === 'application/pdf') {
      const thumbName = `thumb_${filename}.png`;
      const pdfPagePath = path.join(uploadsDir, `page_${filename}.png`);
      try {
        await sharp(req.file.path, { page: 0, density: 150 })
          .resize(200, 280, { fit: 'cover' })
          .png()
          .toFile(pdfPagePath);
        await generateThumbnail(pdfPagePath, path.join(uploadsDir, thumbName));
        fs.unlinkSync(pdfPagePath);
        thumbnailPath = `/uploads/${thumbName}`;
      } catch (pdfErr) {
        console.error('PDF缩略图生成失败:', pdfErr);
        thumbnailPath = '';
      }
    }

    const music = await musicDB.insert({
      title: path.basename(originalname, path.extname(originalname)),
      originalName: originalname,
      fileName: filename,
      filePath: `/uploads/${filename}`,
      thumbnailPath,
      mimeType: mimetype,
      size,
      createdAt: Date.now(),
    });
    res.json(music);
  } catch (err) {
    res.status(500).json({ error: '上传失败' });
  }
});

app.get('/api/guestbook', async (req, res) => {
  try {
    const limit = 12;
    const messages = await guestbookDB
      .find({})
      .sort({ timestamp: -1 })
      .limit(limit);
    res.json({ messages, hasMore: true });
  } catch (err) {
    res.status(500).json({ error: '获取留言失败' });
  }
});

app.get('/api/guestbook/more', async (req, res) => {
  try {
    const before = parseInt(req.query.before as string) || Date.now();
    const limit = 12;
    const messages = await guestbookDB
      .find({ timestamp: { $lt: before } })
      .sort({ timestamp: -1 })
      .limit(limit);
    const hasMore = messages.length === limit;
    res.json({ messages, hasMore });
  } catch (err) {
    res.status(500).json({ error: '获取更多留言失败' });
  }
});

app.post('/api/guestbook', async (req, res) => {
  try {
    const { eventId, nickname, content } = req.body;
    if (!nickname || !content) {
      return res.status(400).json({ error: '请填写昵称和留言内容' });
    }
    const message = await guestbookDB.insert({
      eventId: eventId || 'default',
      nickname,
      content,
      timestamp: Date.now(),
    });
    res.json(message);
  } catch (err) {
    res.status(500).json({ error: '留言失败' });
  }
});

app.listen(PORT, async () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
  await seedData();
});
