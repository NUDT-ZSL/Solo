import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import initSqlJs, { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type {
  Habit,
  HabitProgress,
  CheckIn,
  StatsDataPoint,
  StatsResponse,
  TimeRange
} from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const DATA_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'habit-tracker.db');

let db: Database;

const saveDbToFile = () => {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (err) {
    console.error('保存数据库失败:', err);
  }
};

setInterval(saveDbToFile, 30000);
process.on('SIGINT', () => {
  saveDbToFile();
  process.exit(0);
});

const initDatabase = async () => {
  const SQL = await initSqlJs({
    locateFile: (file: string) =>
      path.join(__dirname, '..', 'node_modules', 'sql.js', 'dist', file)
  });

  let buffer: Buffer | null = null;
  if (fs.existsSync(DB_PATH)) {
    buffer = fs.readFileSync(DB_PATH);
  }

  db = buffer ? new SQL.Database(buffer) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      frequency TEXT NOT NULL CHECK(frequency IN ('daily', 'weekly', 'custom')),
      customDays TEXT,
      targetValue INTEGER NOT NULL DEFAULT 1,
      unit TEXT NOT NULL DEFAULT '次',
      reminders TEXT NOT NULL DEFAULT '[]',
      createdAt TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS checkins (
      id TEXT PRIMARY KEY,
      habitId TEXT NOT NULL,
      date TEXT NOT NULL,
      value INTEGER NOT NULL DEFAULT 1,
      timeOfDay TEXT NOT NULL CHECK(timeOfDay IN ('morning', 'forenoon', 'afternoon', 'evening')),
      completedAt TEXT NOT NULL
    );
  `);

  try {
    db.exec('CREATE INDEX IF NOT EXISTS idx_checkins_habit_date ON checkins(habitId, date)');
    db.exec('CREATE INDEX IF NOT EXISTS idx_checkins_date_time ON checkins(date, timeOfDay)');
  } catch (e) {}
};

const execQuery = <T = any>(sql: string, params: any[] = []): T[] => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as unknown as T);
  }
  stmt.free();
  return results;
};

const runSql = (sql: string, params: any[] = []) => {
  db.run(sql, params);
};

const getToday = (): string => {
  const now = new Date();
  return now.toISOString().slice(0, 10);
};

const getTimeOfDay = (): CheckIn['timeOfDay'] => {
  const hour = new Date().getHours();
  if (hour < 6) return 'morning';
  if (hour < 12) return 'forenoon';
  if (hour < 18) return 'afternoon';
  return 'evening';
};

const parseHabit = (row: any): Habit => ({
  id: String(row.id),
  name: String(row.name),
  frequency: String(row.frequency) as Habit['frequency'],
  customDays: row.customDays ? JSON.parse(String(row.customDays)) : undefined,
  targetValue: Number(row.targetValue),
  unit: String(row.unit),
  reminders: JSON.parse(String(row.reminders || '[]')),
  createdAt: String(row.createdAt)
});

const parseCheckIn = (row: any): CheckIn => ({
  id: String(row.id),
  habitId: String(row.habitId),
  date: String(row.date),
  value: Number(row.value),
  timeOfDay: String(row.timeOfDay) as CheckIn['timeOfDay'],
  completedAt: String(row.completedAt)
});

const seedSampleData = () => {
  const count = execQuery<{ c: number }>('SELECT COUNT(*) as c FROM habits')[0]?.c || 0;
  if (count > 0) return;

  const now = new Date();
  const habits: Array<Omit<Habit, 'id' | 'createdAt'>> = [
    {
      name: '喝 8 杯水',
      frequency: 'daily',
      targetValue: 8,
      unit: '杯',
      reminders: ['09:00', '14:00', '19:00']
    },
    {
      name: '阅读 30 分钟',
      frequency: 'daily',
      targetValue: 1,
      unit: '次',
      reminders: ['21:00']
    },
    {
      name: '锻炼身体',
      frequency: 'weekly',
      targetValue: 3,
      unit: '次',
      reminders: ['07:00']
    },
    {
      name: '冥想 10 分钟',
      frequency: 'custom',
      customDays: [1, 2, 3, 4, 5],
      targetValue: 1,
      unit: '次',
      reminders: ['06:30']
    }
  ];

  habits.forEach((h) => {
    const id = uuidv4();
    const created = new Date(now);
    created.setDate(created.getDate() - 30);
    runSql(
      'INSERT INTO habits (id, name, frequency, customDays, targetValue, unit, reminders, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        h.name,
        h.frequency,
        h.customDays ? JSON.stringify(h.customDays) : null,
        h.targetValue,
        h.unit,
        JSON.stringify(h.reminders),
        created.toISOString()
      ]
    );

    for (let dayOffset = 0; dayOffset < 90; dayOffset++) {
      const date = new Date(now);
      date.setDate(date.getDate() - dayOffset);
      const dateStr = date.toISOString().slice(0, 10);
      const dayOfWeek = date.getDay();

      let shouldCheckIn = false;
      if (h.frequency === 'daily') shouldCheckIn = true;
      else if (h.frequency === 'weekly') shouldCheckIn = Math.random() < 0.4;
      else if (h.frequency === 'custom' && h.customDays)
        shouldCheckIn = h.customDays.includes(dayOfWeek);

      if (!shouldCheckIn) continue;

      const numCheckins = h.name.includes('喝水')
        ? Math.floor(Math.random() * 5) + 1
        : Math.random() < 0.7
        ? 1
        : 0;

      for (let i = 0; i < numCheckins; i++) {
        const ciDate = new Date(date);
        ciDate.setHours(
          Math.floor(Math.random() * 24),
          Math.floor(Math.random() * 60),
          0,
          0
        );

        let tod: CheckIn['timeOfDay'] = 'morning';
        const hh = ciDate.getHours();
        if (hh < 6) tod = 'morning';
        else if (hh < 12) tod = 'forenoon';
        else if (hh < 18) tod = 'afternoon';
        else tod = 'evening';

        const maxVal = h.name.includes('喝水') ? 2 : 1;
        const val = Math.max(1, Math.floor(Math.random() * maxVal) + 1);

        runSql(
          'INSERT INTO checkins (id, habitId, date, value, timeOfDay, completedAt) VALUES (?, ?, ?, ?, ?, ?)',
          [uuidv4(), id, dateStr, val, tod, ciDate.toISOString()]
        );
      }
    }
  });

  saveDbToFile();
  console.log('✅ 已生成示例数据');
};

app.get('/api/habits', (_req, res) => {
  try {
    const today = getToday();
    const habitRows = execQuery<any>('SELECT * FROM habits ORDER BY createdAt DESC');
    const habits = habitRows.map(parseHabit);

    const result: HabitProgress[] = habits.map((habit) => {
      const checkInRows = execQuery<any>(
        'SELECT * FROM checkins WHERE habitId = ? AND date = ? ORDER BY completedAt DESC',
        [habit.id, today]
      );
      const checkIns = checkInRows.map(parseCheckIn);
      const todayValue = checkIns.reduce((sum, c) => sum + c.value, 0);
      return {
        habit,
        todayValue,
        completed: todayValue >= habit.targetValue,
        checkIns
      };
    });

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取习惯列表失败' });
  }
});

app.post('/api/habits', (req, res) => {
  try {
    const body = req.body as Partial<Omit<Habit, 'id' | 'createdAt'>>;

    if (!body.name?.trim()) {
      return res.status(400).json({ error: '习惯名称不能为空' });
    }
    if (!body.frequency || !['daily', 'weekly', 'custom'].includes(body.frequency)) {
      return res.status(400).json({ error: '无效的频率类型' });
    }
    if (body.frequency === 'custom' && (!body.customDays || body.customDays.length === 0)) {
      return res.status(400).json({ error: '自定义频率必须选择日期' });
    }
    if (!body.targetValue || body.targetValue < 1) {
      return res.status(400).json({ error: '目标值必须大于 0' });
    }

    const id = uuidv4();
    const createdAt = new Date().toISOString();
    const reminders = (body.reminders || []).slice(0, 3);

    runSql(
      'INSERT INTO habits (id, name, frequency, customDays, targetValue, unit, reminders, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        id,
        body.name.trim(),
        body.frequency,
        body.customDays ? JSON.stringify(body.customDays.sort()) : null,
        body.targetValue,
        body.unit?.trim() || '次',
        JSON.stringify(reminders),
        createdAt
      ]
    );

    saveDbToFile();

    const habit: Habit = {
      id,
      name: body.name.trim(),
      frequency: body.frequency,
      customDays: body.customDays ? body.customDays.sort() : undefined,
      targetValue: body.targetValue,
      unit: body.unit?.trim() || '次',
      reminders,
      createdAt
    };

    res.status(201).json(habit);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '创建习惯失败' });
  }
});

app.delete('/api/habits/:id', (req, res) => {
  try {
    const { id } = req.params;
    const existing = execQuery<any>('SELECT * FROM habits WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '习惯不存在' });
    }
    runSql('DELETE FROM checkins WHERE habitId = ?', [id]);
    runSql('DELETE FROM habits WHERE id = ?', [id]);
    saveDbToFile();
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '删除习惯失败' });
  }
});

app.post('/api/habits/:id/checkin', (req, res) => {
  try {
    const { id } = req.params;
    const { value = 1 } = req.body as { value?: number };

    const existing = execQuery<any>('SELECT * FROM habits WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: '习惯不存在' });
    }

    const checkIn: CheckIn = {
      id: uuidv4(),
      habitId: id,
      date: getToday(),
      value: Math.max(1, value),
      timeOfDay: getTimeOfDay(),
      completedAt: new Date().toISOString()
    };

    runSql(
      'INSERT INTO checkins (id, habitId, date, value, timeOfDay, completedAt) VALUES (?, ?, ?, ?, ?, ?)',
      [checkIn.id, checkIn.habitId, checkIn.date, checkIn.value, checkIn.timeOfDay, checkIn.completedAt]
    );

    saveDbToFile();
    res.status(201).json(checkIn);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '打卡失败' });
  }
});

const generateStatsForRange = (days: number): StatsDataPoint[] => {
  const now = new Date();
  const start = new Date(now);
  start.setDate(now.getDate() - days + 1);

  const startStr = start.toISOString().slice(0, 10);
  const endStr = now.toISOString().slice(0, 10);

  const rows = execQuery<any>(
    'SELECT * FROM checkins WHERE date >= ? AND date <= ? ORDER BY date, timeOfDay',
    [startStr, endStr]
  );

  const result: StatsDataPoint[] = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(start);
    date.setDate(start.getDate() + d);
    const dateStr = date.toISOString().slice(0, 10);
    const dayOfWeek = date.getDay();

    const timeSlots: Array<CheckIn['timeOfDay']> = ['morning', 'forenoon', 'afternoon', 'evening'];
    for (const slot of timeSlots) {
      const matching = rows.filter((r) => r.date === dateStr && r.timeOfDay === slot);
      const count = matching.reduce((s: number, r: any) => s + Number(r.value || 0), 0);
      result.push({
        date: dateStr,
        dayOfWeek,
        timeOfDay: slot,
        count
      });
    }
  }

  return result;
};

app.get('/api/stats', (req, res) => {
  try {
    void (req.query.range as TimeRange);

    const response: StatsResponse = {
      weekly: generateStatsForRange(7),
      monthly: generateStatsForRange(35),
      quarterly: generateStatsForRange(91)
    };

    res.json(response);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

initDatabase()
  .then(() => {
    seedSampleData();
    app.listen(PORT, () => {
      console.log(`🚀 Habit Tracker API 服务已启动: http://localhost:${PORT}`);
      console.log(`💾 数据库路径: ${DB_PATH}`);
    });
  })
  .catch((err) => {
    console.error('❌ 初始化数据库失败:', err);
    process.exit(1);
  });
