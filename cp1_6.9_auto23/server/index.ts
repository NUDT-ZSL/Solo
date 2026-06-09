import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

interface Emotion {
  id: string;
  name: string;
  emoji: string;
  color: string;
  intensity: 1 | 2 | 3 | 4 | 5;
  isCustom?: boolean;
}

interface DiaryEntry {
  id: string;
  date: string;
  emotions: Emotion[];
  intensities: Record<string, number>;
  canvasData: string;
  reflection: string;
  createdAt: number;
}

interface CreateDiaryRequest {
  date: string;
  emotions: Emotion[];
  intensities: Record<string, number>;
  canvasData: string;
  reflection: string;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const diaryStore: Map<string, DiaryEntry> = new Map();
const dateIndex: Map<string, DiaryEntry> = new Map();
const diaryList: DiaryEntry[] = [];

function getTodayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ success: true, data: { status: 'ok', time: Date.now() } });
});

app.get('/api/diary', (_req: Request, res: Response) => {
  try {
    const sorted = [...diaryList].sort((a, b) => b.createdAt - a.createdAt);
    res.json({ success: true, data: sorted });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/diary/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entry = diaryStore.get(id);
    if (!entry) {
      return res.status(404).json({ success: false, error: '日记不存在' });
    }
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.post('/api/diary', (req: Request, res: Response) => {
  try {
    const body = req.body as CreateDiaryRequest;
    if (!body.date || !body.emotions || !body.canvasData) {
      return res.status(400).json({ success: false, error: '缺少必要字段' });
    }
    if (body.emotions.length === 0) {
      return res.status(400).json({ success: false, error: '请至少选择一种情绪' });
    }

    const id = uuidv4();
    const existingByDate = dateIndex.get(body.date);

    const entry: DiaryEntry = {
      id,
      date: body.date,
      emotions: body.emotions,
      intensities: body.intensities || {},
      canvasData: body.canvasData,
      reflection: body.reflection || '',
      createdAt: Date.now(),
    };

    if (existingByDate) {
      const idx = diaryList.findIndex((d) => d.id === existingByDate.id);
      if (idx >= 0) diaryList.splice(idx, 1);
      diaryStore.delete(existingByDate.id);
    }

    diaryStore.set(id, entry);
    dateIndex.set(body.date, entry);
    diaryList.push(entry);

    res.status(201).json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.get('/api/share/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const entry = diaryStore.get(id);
    if (!entry) {
      return res.status(404).json({ success: false, error: '分享链接无效或已过期' });
    }
    res.json({ success: true, data: entry });
  } catch (err) {
    res.status(500).json({ success: false, error: (err as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`[server] 情绪水彩日记后端已启动: http://localhost:${PORT}`);
  console.log(`[server] API: GET /api/diary, POST /api/diary, GET /api/diary/:id`);
  console.log(`[server] 今日: ${getTodayStr()}`);
});
