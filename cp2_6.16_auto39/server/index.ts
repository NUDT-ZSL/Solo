import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!fs.existsSync(__dirname)) {
  fs.mkdirSync(__dirname, { recursive: true });
}

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

interface DbRecord {
  id: string;
  exercise_type: string;
  duration: number;
  intensity: number;
  avg_heart_rate: number;
  calories: number;
  created_at: string;
}

const DATA_FILE = path.join(__dirname, 'records.json');

function loadRecords(): DbRecord[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('加载数据失败，使用空数据集');
  }
  return [];
}

function saveRecords(records: DbRecord[]): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(records, null, 2), 'utf-8');
  } catch (e) {
    console.error('保存数据失败');
  }
}

let recordsStore: DbRecord[] = loadRecords();

const EXERCISE_TYPES = [
  '跑步', '游泳', '力量训练', '瑜伽', '骑行',
  '篮球', '羽毛球', '跳绳', '登山', 'HIIT'
];

const CALORIE_MULTIPLIERS: Record<string, number> = {
  '跑步': 10, '游泳': 8, '力量训练': 7, '瑜伽': 4, '骑行': 7,
  '篮球': 9, '羽毛球': 7, '跳绳': 11, '登山': 8, 'HIIT': 12
};

function calculateCalories(type: string, duration: number, intensity: number): number {
  const base = CALORIE_MULTIPLIERS[type] || 6;
  return Math.round(base * duration * (0.5 + intensity * 0.05));
}

app.post('/api/records', (req: Request, res: Response) => {
  const { exercise_type, duration, intensity, avg_heart_rate } = req.body;

  if (!exercise_type || !duration || !intensity || !avg_heart_rate) {
    return res.status(400).json({ error: '所有字段都是必填的' });
  }

  if (!EXERCISE_TYPES.includes(exercise_type)) {
    return res.status(400).json({ error: '无效的运动类型' });
  }

  if (duration < 1 || duration > 480) {
    return res.status(400).json({ error: '时长必须在1-480分钟之间' });
  }

  if (intensity < 1 || intensity > 10) {
    return res.status(400).json({ error: '强度必须在1-10之间' });
  }

  if (avg_heart_rate < 40 || avg_heart_rate > 220) {
    return res.status(400).json({ error: '心率必须在40-220bpm之间' });
  }

  const id = uuidv4();
  const created_at = new Date().toISOString();
  const calories = calculateCalories(exercise_type, duration, intensity);

  const record: DbRecord = {
    id,
    exercise_type,
    duration,
    intensity,
    avg_heart_rate,
    calories,
    created_at
  };

  recordsStore.unshift(record);
  saveRecords(recordsStore);

  res.json({ id, exercise_type, duration, intensity, avg_heart_rate, calories, created_at });
});

app.get('/api/records/stats', (_req: Request, res: Response) => {
  try {
    const rows = [...recordsStore].sort((a, b) => b.created_at.localeCompare(a.created_at));

    const records = rows.map(r => ({
      id: r.id,
      exerciseType: r.exercise_type,
      duration: r.duration,
      intensity: r.intensity,
      avgHeartRate: r.avg_heart_rate,
      calories: r.calories,
      createdAt: r.created_at
    }));

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());

    const dailyStats: { [key: string]: { duration: number; heartRate: number[]; calories: number } } = {};
    const last7Days: string[] = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const key = d.toISOString().split('T')[0];
      last7Days.push(key);
      dailyStats[key] = { duration: 0, heartRate: [], calories: 0 };
    }

    records.forEach(record => {
      const recordDate = new Date(record.createdAt);
      const recordKey = recordDate.toISOString().split('T')[0];
      if (dailyStats[recordKey]) {
        dailyStats[recordKey].duration += record.duration;
        dailyStats[recordKey].heartRate.push(record.avgHeartRate);
        dailyStats[recordKey].calories += record.calories;
      }
    });

    const dailyTrend = last7Days.map(key => {
      const d = new Date(key);
      const label = `${d.getMonth() + 1}/${d.getDate()}`;
      const stats = dailyStats[key];
      return {
        date: key,
        label,
        duration: stats.duration,
        avgHeartRate: stats.heartRate.length > 0
          ? Math.round(stats.heartRate.reduce((a: number, b: number) => a + b, 0) / stats.heartRate.length)
          : 0,
        calories: stats.calories
      };
    });

    let weeklyTotalDuration = 0;
    let weeklyHeartRates: number[] = [];
    let weeklyTotalCalories = 0;
    let activeDays = 0;
    let bestDay = '';
    let maxDuration = 0;

    dailyTrend.forEach(day => {
      weeklyTotalDuration += day.duration;
      weeklyTotalCalories += day.calories;
      if (day.avgHeartRate > 0) {
        weeklyHeartRates.push(day.avgHeartRate);
      }
      if (day.duration > 0) {
        activeDays++;
      }
      if (day.duration > maxDuration) {
        maxDuration = day.duration;
        bestDay = day.date;
      }
    });

    const weeklyAvgHeartRate = weeklyHeartRates.length > 0
      ? Math.round(weeklyHeartRates.reduce((a: number, b: number) => a + b, 0) / weeklyHeartRates.length)
      : 0;

    const weeklyByType: { [key: string]: number } = {};
    EXERCISE_TYPES.forEach(t => { weeklyByType[t] = 0; });

    records.forEach(record => {
      const recordDate = new Date(record.createdAt);
      if (recordDate >= weekStart) {
        weeklyByType[record.exerciseType] = (weeklyByType[record.exerciseType] || 0) + record.duration;
      }
    });

    const weeklyTypeDistribution = EXERCISE_TYPES
      .filter(t => weeklyByType[t] > 0)
      .map(type => ({ type, duration: weeklyByType[type] }));

    const last4Weeks: { [key: string]: { label: string; byType: { [key: string]: number } } } = {};
    const weekLabels: string[] = [];

    for (let i = 3; i >= 0; i--) {
      const ws = new Date(weekStart);
      ws.setDate(weekStart.getDate() - i * 7);
      const we = new Date(ws);
      we.setDate(ws.getDate() + 6);
      const key = `${ws.toISOString().split('T')[0]}`;
      const label = `${ws.getMonth() + 1}/${ws.getDate()}-${we.getMonth() + 1}/${we.getDate()}`;
      weekLabels.push(label);
      last4Weeks[key] = {
        label,
        byType: Object.fromEntries(EXERCISE_TYPES.map(t => [t, 0]))
      };
    }

    const monthlyHeartRates: { [key: string]: number[] } = {};
    weekLabels.forEach(l => { monthlyHeartRates[l] = []; });

    records.forEach(record => {
      const recordDate = new Date(record.createdAt);
      for (let i = 3; i >= 0; i--) {
        const ws = new Date(weekStart);
        ws.setDate(weekStart.getDate() - i * 7);
        const we = new Date(ws);
        we.setDate(ws.getDate() + 6);
        if (recordDate >= ws && recordDate <= we) {
          const key = ws.toISOString().split('T')[0];
          if (last4Weeks[key]) {
            last4Weeks[key].byType[record.exerciseType] = (last4Weeks[key].byType[record.exerciseType] || 0) + record.duration;
            monthlyHeartRates[last4Weeks[key].label].push(record.avgHeartRate);
          }
          break;
        }
      }
    });

    const monthlyStacked = weekLabels.map(label => {
      const entry: any = { week: label };
      const weekKey = Object.keys(last4Weeks).find(k => last4Weeks[k].label === label);
      if (weekKey) {
        Object.entries(last4Weeks[weekKey].byType).forEach(([type, dur]) => {
          if (dur > 0) entry[type] = dur;
        });
      }
      const hrs = monthlyHeartRates[label] || [];
      entry.avgHeartRate = hrs.length > 0
        ? Math.round(hrs.reduce((a: number, b: number) => a + b, 0) / hrs.length)
        : 0;
      return entry;
    });

    const monthlyTypeTotals: { [key: string]: number } = {};
    EXERCISE_TYPES.forEach(t => { monthlyTypeTotals[t] = 0; });

    Object.values(last4Weeks).forEach(week => {
      Object.entries(week.byType).forEach(([type, dur]) => {
        monthlyTypeTotals[type] = (monthlyTypeTotals[type] || 0) + dur;
      });
    });

    const monthlyTypeDistribution = EXERCISE_TYPES
      .filter(t => monthlyTypeTotals[t] > 0)
      .map(type => ({ name: type, value: monthlyTypeTotals[type] }));

    res.json({
      records,
      weekly: {
        totalDuration: weeklyTotalDuration,
        avgHeartRate: weeklyAvgHeartRate,
        totalCalories: weeklyTotalCalories,
        activeDays,
        bestDay,
        dailyTrend,
        typeDistribution: weeklyTypeDistribution
      },
      monthly: {
        stackedByWeek: monthlyStacked,
        typeDistribution: monthlyTypeDistribution
      },
      exerciseTypes: EXERCISE_TYPES
    });
  } catch (err: any) {
    res.status(500).json({ error: '获取记录失败: ' + err.message });
  }
});

app.get('/api/records/type/:type', (req: Request, res: Response) => {
  const { type } = req.params;
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const threshold = thirtyDaysAgo.toISOString();

  try {
    const rows = recordsStore
      .filter(r => r.exercise_type === type && r.created_at >= threshold)
      .sort((a, b) => b.created_at.localeCompare(a.created_at));

    const records = rows.map(r => ({
      id: r.id,
      exerciseType: r.exercise_type,
      duration: r.duration,
      intensity: r.intensity,
      avgHeartRate: r.avg_heart_rate,
      calories: r.calories,
      createdAt: r.created_at
    }));
    res.json({ records });
  } catch (err: any) {
    res.status(500).json({ error: '获取记录失败: ' + err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`数据文件: ${DATA_FILE}`);
});
