import express from 'express';
import cors from 'cors';
import { initDB, saveConfig, getConfigs } from './db.js';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const PLATFORMS = [
  { id: 'netease', name: '网易云', icon: 'netease', color: '#e60026' },
  { id: 'qq', name: 'QQ音乐', icon: 'qq', color: '#4e6ef2' },
  { id: 'spotify', name: 'Spotify', icon: 'spotify', color: '#1db954' },
];

const GENRES = ['流行', '摇滚', '电子', '民谣', '古典', '嘻哈', 'R&B', '爵士'];
const COVER_COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
  '#a29bfe', '#fd79a8', '#6c5ce7', '#00b894', '#e17055',
  '#d63031', '#0984e3', '#00cec9', '#e84393', '#6c5ce7',
];

const SONG_POOL = [
  { title: '晴天', artist: '周杰伦', genre: '流行', coverColor: '#ff6b6b' },
  { title: '夜曲', artist: '周杰伦', genre: '流行', coverColor: '#4ecdc4' },
  { title: '光年之外', artist: '邓紫棋', genre: '电子', coverColor: '#45b7d1' },
  { title: '平凡之路', artist: '朴树', genre: '民谣', coverColor: '#96ceb4' },
  { title: '海阔天空', artist: 'Beyond', genre: '摇滚', coverColor: '#ffeaa7' },
  { title: 'Someone Like You', artist: 'Adele', genre: '流行', coverColor: '#a29bfe' },
  { title: 'Shape of You', artist: 'Ed Sheeran', genre: '流行', coverColor: '#fd79a8' },
  { title: '孤勇者', artist: '陈奕迅', genre: '流行', coverColor: '#6c5ce7' },
  { title: '起风了', artist: '买辣椒也用券', genre: '民谣', coverColor: '#00b894' },
  { title: 'Blinding Lights', artist: 'The Weeknd', genre: '电子', coverColor: '#e17055' },
  { title: '晚风', artist: '陈奕迅', genre: '流行', coverColor: '#d63031' },
  { title: '星河', artist: '林俊杰', genre: '流行', coverColor: '#0984e3' },
  { title: '红豆', artist: '王菲', genre: '流行', coverColor: '#00cec9' },
  { title: '飞鸟和鱼', artist: '五月天', genre: '摇滚', coverColor: '#e84393' },
  { title: '春风十里', artist: '鹿先森乐队', genre: '民谣', coverColor: '#6c5ce7' },
  { title: '匆匆那年', artist: '王菲', genre: '流行', coverColor: '#ff6b6b' },
  { title: '稻香', artist: '周杰伦', genre: '流行', coverColor: '#00b894' },
  { title: '七里香', artist: '周杰伦', genre: '流行', coverColor: '#4ecdc4' },
  { title: '告白气球', artist: '周杰伦', genre: '流行', coverColor: '#fd79a8' },
  { title: 'Hotel California', artist: 'Eagles', genre: '摇滚', coverColor: '#e17055' },
  { title: 'Bohemian Rhapsody', artist: 'Queen', genre: '摇滚', coverColor: '#a29bfe' },
  { title: 'Yesterday', artist: 'The Beatles', genre: '古典', coverColor: '#96ceb4' },
  { title: 'Let It Be', artist: 'The Beatles', genre: '流行', coverColor: '#ffeaa7' },
  { title: 'Imagine', artist: 'John Lennon', genre: '民谣', coverColor: '#45b7d1' },
  { title: '岁月神偷', artist: '金玟岐', genre: '民谣', coverColor: '#d63031' },
  { title: '时间煮雨', artist: '郁可唯', genre: '流行', coverColor: '#0984e3' },
  { title: '小幸运', artist: '田馥甄', genre: '流行', coverColor: '#00cec9' },
  { title: '那些年', artist: '胡夏', genre: '流行', coverColor: '#e84393' },
  { title: '说好不哭', artist: '周杰伦', genre: '流行', coverColor: '#6c5ce7' },
  { title: 'Mojito', artist: '周杰伦', genre: '拉丁', coverColor: '#ff6b6b' },
  { title: '漂洋过海来看你', artist: '刘明湘', genre: '流行', coverColor: '#4ecdc4' },
  { title: '光辉岁月', artist: 'Beyond', genre: '摇滚', coverColor: '#e17055' },
  { title: '后来', artist: '刘若英', genre: '流行', coverColor: '#a29bfe' },
  { title: '简单爱', artist: '周杰伦', genre: '流行', coverColor: '#00b894' },
  { title: '双截棍', artist: '周杰伦', genre: '嘻哈', coverColor: '#d63031' },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function generateMockRecords(platformId: string): object[] {
  const seed = platformId === 'netease' ? 42 : platformId === 'qq' ? 137 : 256;
  const rand = seededRandom(seed);

  const count = 20 + Math.floor(rand() * 15);
  const records: object[] = [];

  const usedIndices = new Set<number>();

  for (let i = 0; i < count; i++) {
    let idx: number;
    do {
      idx = Math.floor(rand() * SONG_POOL.length);
    } while (usedIndices.has(idx) && usedIndices.size < SONG_POOL.length);
    usedIndices.add(idx);

    const song = SONG_POOL[idx];
    const playCount = 5 + Math.floor(rand() * 200);
    const month = 1 + Math.floor(rand() * 12);
    const day = 1 + Math.floor(rand() * 28);

    records.push({
      id: `${platformId}-${i}`,
      platformId,
      title: song.title,
      artist: song.artist,
      playCount,
      date: `2025-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      genre: song.genre,
      coverColor: song.coverColor,
    });
  }

  return records;
}

const recordsCache: Map<string, object[]> = new Map();

app.get('/api/platforms', (_req, res) => {
  res.json(PLATFORMS);
});

app.get('/api/records', (req, res) => {
  const platform = req.query.platform as string;
  if (!platform) {
    res.status(400).json({ error: 'Missing platform parameter' });
    return;
  }
  if (!recordsCache.has(platform)) {
    recordsCache.set(platform, generateMockRecords(platform));
  }
  res.json(recordsCache.get(platform));
});

app.post('/api/config', (req, res) => {
  const { platformId, token } = req.body;
  if (!platformId || !token) {
    res.status(400).json({ error: 'Missing platformId or token' });
    return;
  }
  try {
    saveConfig(platformId, token);
    res.json({ success: true });
  } catch {
    res.status(500).json({ error: 'Failed to save config' });
  }
});

app.get('/api/configs', (_req, res) => {
  try {
    const configs = getConfigs();
    res.json(configs);
  } catch {
    res.status(500).json({ error: 'Failed to get configs' });
  }
});

initDB()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
