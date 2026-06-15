import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import Datastore from 'nedb-promises';
import { extractMetadata, AudioMetadata } from './services/metadata';
import { generateWaveformData } from './services/waveform';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const uploadsDir = path.join(__dirname, '..', '..', 'uploads');
const dbPath = path.join(__dirname, '..', 'data', 'podcasts.db');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = Datastore.create(dbPath);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const id = uuidv4();
    cb(null, `${id}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 200 * 1024 * 1024
  }
});

export interface Podcast {
  _id: string;
  title: string;
  filename: string;
  originalName: string;
  filePath: string;
  duration: number;
  sampleRate: number;
  channels: number;
  bitrate: number;
  codec: string;
  tags: string[];
  waveform: number[];
  createdAt: string;
  updatedAt: string;
}

const mockTags = [
  ['科技', '互联网', '创业'],
  ['健康', '健身', '营养'],
  ['教育', '学习', '成长'],
  ['娱乐', '电影', '音乐'],
  ['商业', '财经', '投资'],
  ['生活', '旅行', '美食']
];

const mockTitles = [
  '科技前沿对话',
  '健康生活指南',
  '每日学习笔记',
  '电影深度解析',
  '商业思维训练',
  '旅行见闻分享',
  '创业者故事',
  '音乐漫谈',
  '心理学入门',
  '编程技术分享'
];

async function seedMockData() {
  const count = await db.count({});
  if (count > 0) return;

  const podcasts: Partial<Podcast>[] = [];

  for (let i = 0; i < 12; i++) {
    const tags = mockTags[i % mockTags.length];
    const waveform = await generateWaveformData('', 200);
    const createdAt = new Date(Date.now() - i * 86400000 * 2).toISOString();

    podcasts.push({
      _id: uuidv4(),
      title: mockTitles[i % mockTitles.length],
      filename: `mock_${i}.mp3`,
      originalName: `${mockTitles[i % mockTitles.length]}.mp3`,
      filePath: '',
      duration: 1800 + Math.random() * 1800,
      sampleRate: 44100,
      channels: 2,
      bitrate: 128000,
      codec: 'mp3',
      tags,
      waveform,
      createdAt,
      updatedAt: createdAt
    });
  }

  await db.insert(podcasts);
  console.log('Mock data seeded');
}

app.get('/api/podcasts', async (req, res) => {
  try {
    const podcasts = await db.find<Podcast>({}).sort({ createdAt: -1 });
    res.json(podcasts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch podcasts' });
  }
});

app.get('/api/podcasts/search', async (req, res) => {
  try {
    const { tags, startDate, endDate } = req.query;

    let query: any = {};

    if (tags && typeof tags === 'string' && tags.trim()) {
      const tagList = tags.split(/\s+/).filter(t => t.length > 0);
      if (tagList.length > 0) {
        query.tags = { $in: tagList };
      }
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string).toISOString();
      }
      if (endDate) {
        const end = new Date(endDate as string);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end.toISOString();
      }
    }

    const podcasts = await db.find<Podcast>(query).sort({ createdAt: -1 });
    res.json(podcasts);
  } catch (err) {
    res.status(500).json({ error: 'Failed to search podcasts' });
  }
});

app.get('/api/podcast/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const podcast = await db.findOne<Podcast>({ _id: id });
    if (!podcast) {
      res.status(404).json({ error: 'Podcast not found' });
      return;
    }
    res.json(podcast);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch podcast' });
  }
});

app.post('/api/upload', upload.array('files', 5), async (req, res) => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'No files uploaded' });
      return;
    }

    const results: Podcast[] = [];

    for (const file of files) {
      let metadata: AudioMetadata;
      try {
        metadata = await extractMetadata(file.path);
      } catch (err) {
        metadata = {
          duration: 1800 + Math.random() * 1800,
          sampleRate: 44100,
          channels: 2,
          bitrate: 128000,
          codec: 'unknown'
        };
      }

      let waveform: number[];
      try {
        waveform = await generateWaveformData(file.path, 200);
      } catch (err) {
        waveform = await generateWaveformData('', 200);
      }

      const podcast: Partial<Podcast> = {
        _id: uuidv4(),
        title: path.basename(file.originalname, path.extname(file.originalname)),
        filename: file.filename,
        originalName: file.originalname,
        filePath: file.path,
        duration: metadata.duration,
        sampleRate: metadata.sampleRate,
        channels: metadata.channels,
        bitrate: metadata.bitrate,
        codec: metadata.codec,
        tags: ['新上传'],
        waveform,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const inserted = await db.insert(podcast);
      results.push(inserted as Podcast);
    }

    res.json({ success: true, podcasts: results });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Upload failed' });
  }
});

app.put('/api/podcast/:id/tags', async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const podcast = await db.update<Podcast>(
      { _id: id },
      { $set: { tags, updatedAt: new Date().toISOString() } },
      { returnUpdatedDocs: true }
    );

    if (!podcast) {
      res.status(404).json({ error: 'Podcast not found' });
      return;
    }

    res.json(podcast);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update tags' });
  }
});

app.use('/uploads', express.static(uploadsDir));

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  await seedMockData();
});
