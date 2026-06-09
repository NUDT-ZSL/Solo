import express from 'express';
import cors from 'cors';

type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'calm'
  | 'anxious'
  | 'surprised';

interface EmotionRecord {
  id: string;
  date: string;
  type: EmotionType;
  intensity: number;
  note: string;
  timestamp: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const emotionStore: EmotionRecord[] = [];

const validEmotionTypes: EmotionType[] = [
  'happy',
  'sad',
  'angry',
  'calm',
  'anxious',
  'surprised',
];

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function isValidDate(dateStr: string): boolean {
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

app.get('/api/emotions', (req, res) => {
  try {
    const days = parseInt(req.query.days as string) || 7;

    const now = new Date();
    now.setHours(23, 59, 59, 999);
    const cutoffDate = new Date(now);
    cutoffDate.setDate(c cutoffDate.getDate() - (days - 1));
    cutoffDate.setHours(0, 0, 0, 0);
    const cutoffTime = cutoffDate.getTime();

    const filtered = emotionStore.filter((record) => {
      const recordDate = new Date(record.date);
      return recordDate.getTime() >= cutoffTime;
    });

    filtered.sort((a, b) => {
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return b.timestamp - a.timestamp;
    });

    res.json({
      success: true,
      data: filtered,
      count: filtered.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取情绪记录失败',
    });
  }
});

app.get('/api/emotions/all', (_req, res) => {
  try {
    const sorted = [...emotionStore].sort(
      (a, b) => b.timestamp - a.timestamp
    );
    res.json({
      success: true,
      data: sorted,
      count: sorted.length,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取全部情绪记录失败',
    });
  }
});

app.get('/api/emotions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const record = emotionStore.find((r) => r.id === id);

    if (!record) {
      return res.status(404).json({
        success: false,
        error: '情绪记录不存在',
      });
    }

    res.json({
      success: true,
      data: record,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '获取情绪记录失败',
    });
  }
});

app.post('/api/emotions', (req, res) => {
  try {
    const { date, type, intensity, note } = req.body;

    if (!date || !isValidDate(date)) {
      return res.status(400).json({
        success: false,
        error: '日期格式无效',
      });
    }

    if (!type || !validEmotionTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: '情绪类型无效',
      });
    }

    const intensityNum = Number(intensity);
    if (
      isNaN(intensityNum) ||
      intensityNum < 0 ||
      intensityNum > 5 ||
      !Number.isInteger(intensityNum)
    ) {
      return res.status(400).json({
        success: false,
        error: '情绪强度必须是0-5的整数',
      });
    }

    if (!note || typeof note !== 'string' || note.trim().length < 10) {
      return res.status(400).json({
        success: false,
        error: '文字说明不少于10个字',
      });
    }

    const newRecord: EmotionRecord = {
      id: generateId(),
      date: new Date(date).toISOString().split('T')[0],
      type,
      intensity: intensityNum,
      note: note.trim(),
      timestamp: Date.now(),
    };

    emotionStore.push(newRecord);

    res.status(201).json({
      success: true,
      data: newRecord,
      message: '情绪已记录',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '保存情绪记录失败',
    });
  }
});

app.put('/api/emotions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { type, intensity } = req.body;

    const recordIndex = emotionStore.findIndex((r) => r.id === id);
    if (recordIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '情绪记录不存在',
      });
    }

    const updates: Partial<EmotionRecord> = {};

    if (type !== undefined) {
      if (!validEmotionTypes.includes(type)) {
        return res.status(400).json({
          success: false,
          error: '情绪类型无效',
        });
      }
      updates.type = type;
    }

    if (intensity !== undefined) {
      const intensityNum = Number(intensity);
      if (
        isNaN(intensityNum) ||
        intensityNum < 0 ||
        intensityNum > 5 ||
        !Number.isInteger(intensityNum)
      ) {
        return res.status(400).json({
          success: false,
          error: '情绪强度必须是0-5的整数',
        });
      }
      updates.intensity = intensityNum;
    }

    emotionStore[recordIndex] = {
      ...emotionStore[recordIndex],
      ...updates,
      timestamp: Date.now(),
    };

    res.json({
      success: true,
      data: emotionStore[recordIndex],
      message: '情绪记录已更新',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '更新情绪记录失败',
    });
  }
});

app.delete('/api/emotions/:id', (req, res) => {
  try {
    const { id } = req.params;
    const recordIndex = emotionStore.findIndex((r) => r.id === id);

    if (recordIndex === -1) {
      return res.status(404).json({
        success: false,
        error: '情绪记录不存在',
      });
    }

    const deletedRecord = emotionStore.splice(recordIndex, 1)[0];

    res.json({
      success: true,
      data: deletedRecord,
      message: '情绪记录已删除',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: '删除情绪记录失败',
    });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: Date.now(),
    recordCount: emotionStore.length,
  });
});

app.listen(PORT, () => {
  console.log(`[情绪涟漪] 后端服务已启动: http://localhost:${PORT}`);
  console.log(`[情绪涟漪] API健康检查: http://localhost:${PORT}/api/health`);
});
