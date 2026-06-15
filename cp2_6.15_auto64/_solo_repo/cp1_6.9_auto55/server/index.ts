import express from 'express';
import type { Request, Response } from 'express';
import type {
  MoodType,
  ShapeType,
  MoodRecord,
  MoodStats,
  AddMoodRequest,
  ApiResponse,
} from '../src/types';
import { formatDate, formatTime, getDateRange, getToday, isValidDate } from '../src/utils/dateUtils';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.options('*', (_req, res) => {
  res.sendStatus(204);
});

const moods: MoodRecord[] = [];

const VALID_MOODS: MoodType[] = ['happy', 'calm', 'melancholy', 'anger', 'anxiety'];
const VALID_SHAPES: ShapeType[] = ['circle', 'star', 'diamond'];

function generateId(): string {
  return `mood_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function randomShape(): ShapeType {
  return VALID_SHAPES[Math.floor(Math.random() * VALID_SHAPES.length)];
}

function validateMoodRequest(body: unknown): body is AddMoodRequest {
  if (typeof body !== 'object' || body === null) return false;
  const b = body as Record<string, unknown>;
  if (typeof b.date !== 'string' || !isValidDate(b.date)) return false;
  if (typeof b.mood !== 'string' || !VALID_MOODS.includes(b.mood as MoodType)) return false;
  if (typeof b.text !== 'string' || b.text.length > 50) return false;
  return true;
}

app.post('/api/mood', (req: Request, res: Response<ApiResponse<MoodRecord>>) => {
  if (!validateMoodRequest(req.body)) {
    return res.status(400).json({
      success: false,
      error: '请求参数无效，请检查日期、情绪类型和文字描述',
    });
  }

  const now = new Date();
  const record: MoodRecord = {
    id: generateId(),
    date: req.body.date,
    mood: req.body.mood,
    text: req.body.text.trim(),
    time: formatTime(now),
    shape: randomShape(),
    createdAt: now.getTime(),
  };

  moods.push(record);
  moods.sort((a, b) => a.createdAt - b.createdAt);

  return res.json({ success: true, data: record });
});

app.get('/api/mood', (req: Request, res: Response<ApiResponse<MoodRecord[]>>) => {
  const { startDate, endDate } = req.query;

  let filtered = [...moods];

  if (typeof startDate === 'string' && isValidDate(startDate)) {
    filtered = filtered.filter((m) => m.date >= startDate);
  }

  if (typeof endDate === 'string' && isValidDate(endDate)) {
    filtered = filtered.filter((m) => m.date <= endDate);
  }

  filtered.sort((a, b) => a.createdAt - b.createdAt);

  return res.json({ success: true, data: filtered });
});

app.get('/api/mood/stats', (_req: Request, res: Response<ApiResponse<MoodStats>>) => {
  const today = getToday();
  const dateRange = getDateRange(today, 7);
  const startDate = dateRange[0];
  const endDate = dateRange[dateRange.length - 1];

  const stats: MoodStats = {
    happy: 0,
    calm: 0,
    melancholy: 0,
    anger: 0,
    anxiety: 0,
    total: 0,
  };

  for (const mood of moods) {
    if (mood.date >= startDate && mood.date <= endDate) {
      if (mood.mood in stats) {
        stats[mood.mood]++;
        stats.total++;
      }
    }
  }

  return res.json({ success: true, data: stats });
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

function generateSeedData(): void {
  const today = getToday();
  const seedTexts: Record<MoodType, string[]> = {
    happy: ['阳光明媚，心情大好！', '和朋友一起喝咖啡很开心', '完成了一个小目标', '收到了意外的惊喜'],
    calm: ['午后的静谧时光', '看书听歌，岁月静好', '今天很专注，效率不错', '散步，感受晚风'],
    melancholy: ['有点想家了...', '下雨天，思绪万千', '想起了一些往事', '莫名的有点失落'],
    anger: ['被bug折磨了一下午', '交通太拥堵，烦躁', '有些事情不如人意', '需要冷静一下'],
    anxiety: ['deadline快到了...', '对未来有些迷茫', '紧张得睡不着', '太多事情要处理'],
  };

  for (let i = 1; i <= 6; i++) {
    const date = formatDate(new Date(today.getTime() - i * 86400000));
    const numRecords = Math.random() < 0.3 ? 2 : 1;

    for (let j = 0; j < numRecords; j++) {
      const moodType = VALID_MOODS[Math.floor(Math.random() * VALID_MOODS.length)];
      const texts = seedTexts[moodType];
      const text = texts[Math.floor(Math.random() * texts.length)];
      const hour = 8 + Math.floor(Math.random() * 12);
      const minute = Math.floor(Math.random() * 60);

      const record: MoodRecord = {
        id: generateId(),
        date,
        mood: moodType,
        text,
        time: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
        shape: randomShape(),
        createdAt: new Date(`${date}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`).getTime(),
      };
      moods.push(record);
    }
  }
  moods.sort((a, b) => a.createdAt - b.createdAt);
}

generateSeedData();

app.listen(PORT, () => {
  console.log(`[server] 时光胶囊后端服务已启动: http://localhost:${PORT}`);
  console.log(`[server] 已加载 ${moods.length} 条种子数据`);
});
