import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

const dbPath = path.join(process.cwd(), 'learning.db');
let db: Database;
let SQL: SqlJsStatic;

function saveDatabase(): void {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (e) {
    console.error('Failed to save database:', e);
  }
}

function queryAll(sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows: any[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function queryOne(sql: string, params: any[] = []): any | null {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function runSql(sql: string, params: any[] = []): void {
  db.run(sql, params);
}

function getLastInsertId(): number {
  const row = queryOne('SELECT last_insert_rowid() as id');
  return row ? row.id : 0;
}

async function initDb(): Promise<void> {
  SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    try {
      const fileBuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(fileBuffer);
      console.log('Database loaded from file');
    } catch (e) {
      console.error('Failed to load database, creating new one:', e);
      db = new SQL.Database();
    }
  } else {
    db = new SQL.Database();
    console.log('New database created');
  }

  db.run(`CREATE TABLE IF NOT EXISTS courses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    topics TEXT NOT NULL,
    total_hours INTEGER NOT NULL
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id INTEGER NOT NULL,
    target_date TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plan_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    date TEXT NOT NULL,
    duration INTEGER NOT NULL,
    status TEXT DEFAULT '未开始',
    detail TEXT DEFAULT ''
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    duration INTEGER NOT NULL,
    description TEXT NOT NULL,
    knowledge_scores TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS daily_completions (
    date TEXT PRIMARY KEY,
    all_completed INTEGER DEFAULT 0
  )`);

  const courseCount = queryOne('SELECT COUNT(*) as count FROM courses');
  if (courseCount.count === 0) {
    const coursesData: [string, string, number][] = [
      ['React前端开发', '组件设计,状态管理,路由,Hooks,性能优化', 40],
      ['Node.js后端开发', 'Express框架,REST API,数据库,中间件,部署', 35],
      ['Python数据分析', 'NumPy,Pandas,数据可视化,统计分析,机器学习基础', 50],
      ['TypeScript进阶', '类型系统,泛型,装饰器,模块化,工程化', 30],
      ['全栈项目实战', '架构设计,前后端联调,测试,CI/CD,性能调优', 45],
    ];
    coursesData.forEach(c => {
      db.run('INSERT INTO courses (name, topics, total_hours) VALUES (?, ?, ?)', c);
    });
    saveDatabase();
    console.log('Sample courses inserted');
  }

  console.log('Database initialized successfully');
}

app.get('/api/courses', (req, res) => {
  try {
    const rows = queryAll('SELECT * FROM courses');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/plan', (req, res) => {
  try {
    const { course_id, target_date } = req.body;
    if (!course_id || !target_date) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    const course = queryOne('SELECT * FROM courses WHERE id = ?', [course_id]);
    if (!course) {
      return res.status(404).json({ error: '课程不存在' });
    }

    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    const endDate = new Date(target_date);
    endDate.setHours(0, 0, 0, 0);
    const diffTime = endDate.getTime() - startDate.getTime();
    const diffDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

    const topics = (course.topics as string).split(',');
    const totalHours = course.total_hours as number;
    const hoursPerDay = Math.max(1, Math.round((totalHours / diffDays) * 10) / 10);

    db.run('INSERT INTO plans (course_id, target_date) VALUES (?, ?)', [course_id, target_date]);
    const planId = getLastInsertId();

    for (let i = 0; i < diffDays; i++) {
      const taskDate = new Date(startDate);
      taskDate.setDate(taskDate.getDate() + i);
      const dateStr = taskDate.toISOString().split('T')[0];
      const topicIndex = i % topics.length;
      const taskName = `${topics[topicIndex].trim()} - 第${Math.floor(i / topics.length) + 1}轮学习`;
      const duration = Math.round(hoursPerDay * 60);
      db.run(
        'INSERT INTO tasks (plan_id, name, date, duration, status) VALUES (?, ?, ?, ?, ?)',
        [planId, taskName, dateStr, duration, '未开始']
      );
    }

    saveDatabase();

    const insertedTasks = queryAll(
      'SELECT * FROM tasks WHERE plan_id = ? ORDER BY date ASC',
      [planId]
    );

    res.json({
      plan: { id: planId, course_id, target_date, course_name: course.name },
      tasks: insertedTasks,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/plan/latest', (req, res) => {
  try {
    const plan = queryOne('SELECT * FROM plans ORDER BY id DESC LIMIT 1');
    if (!plan) {
      return res.json({ plan: null, tasks: [] });
    }

    const course = queryOne('SELECT name FROM courses WHERE id = ?', [plan.course_id]);
    const tasks = queryAll('SELECT * FROM tasks WHERE plan_id = ? ORDER BY date ASC', [plan.id]);

    res.json({
      plan: { ...plan, course_name: course?.name || '' },
      tasks: tasks || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/task/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, status, detail, duration } = req.body;
    const fields: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { fields.push('name = ?'); values.push(name); }
    if (status !== undefined) { fields.push('status = ?'); values.push(status); }
    if (detail !== undefined) { fields.push('detail = ?'); values.push(detail); }
    if (duration !== undefined) { fields.push('duration = ?'); values.push(duration); }

    if (fields.length === 0) {
      return res.status(400).json({ error: '没有更新字段' });
    }
    values.push(id);

    db.run(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    const task = queryOne('SELECT date, plan_id FROM tasks WHERE id = ?', [id]);
    if (task) {
      const dayTasks = queryAll(
        'SELECT status FROM tasks WHERE date = ? AND plan_id = ?',
        [task.date, task.plan_id]
      );
      const allCompleted = dayTasks.length > 0 && dayTasks.every((t: any) => t.status === '已完成');
      db.run(
        'INSERT OR REPLACE INTO daily_completions (date, all_completed) VALUES (?, ?)',
        [task.date, allCompleted ? 1 : 0]
      );
      saveDatabase();
    }

    res.json({ message: '更新成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/daily-completions', (req, res) => {
  try {
    const rows = queryAll('SELECT * FROM daily_completions WHERE all_completed = 1');
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/activity', (req, res) => {
  try {
    const { date, duration, description, knowledge_scores } = req.body;
    if (!date || !duration || !description) {
      return res.status(400).json({ error: '缺少必要参数' });
    }
    const scoresJson = JSON.stringify(knowledge_scores || {});
    db.run(
      'INSERT INTO activities (date, duration, description, knowledge_scores) VALUES (?, ?, ?, ?)',
      [date, duration, description, scoresJson]
    );
    saveDatabase();

    const id = getLastInsertId();
    res.json({ id, message: '活动记录成功' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/stats', (req, res) => {
  try {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);
    const startDate = sevenDaysAgo.toISOString().split('T')[0];

    const dailyDurations = queryAll(
      'SELECT date, SUM(duration) as total_duration FROM activities WHERE date >= ? GROUP BY date ORDER BY date ASC',
      [startDate]
    );

    const durationMap: Record<string, number> = {};
    dailyDurations.forEach((d: any) => {
      durationMap[d.date] = d.total_duration;
    });

    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      last7Days.push({
        date: dateStr,
        label: `${d.getMonth() + 1}/${d.getDate()}`,
        duration: durationMap[dateStr] || 0,
      });
    }

    const scoreRows = queryAll(
      'SELECT knowledge_scores FROM activities WHERE date >= ?',
      [startDate]
    );

    const knowledgeTotals: Record<string, { total: number; count: number }> = {
      '组件设计': { total: 0, count: 0 },
      '状态管理': { total: 0, count: 0 },
      '路由配置': { total: 0, count: 0 },
      '性能优化': { total: 0, count: 0 },
      '工程化': { total: 0, count: 0 },
    };

    scoreRows.forEach((row: any) => {
      try {
        const scores = JSON.parse(row.knowledge_scores);
        Object.keys(scores).forEach(key => {
          if (knowledgeTotals[key]) {
            knowledgeTotals[key].total += scores[key];
            knowledgeTotals[key].count += 1;
          }
        });
      } catch (e) {
        // ignore parse errors
      }
    });

    const knowledgeStats = Object.entries(knowledgeTotals).map(([name, data]) => ({
      name,
      score: data.count > 0 ? Math.round((data.total / data.count) * 20) : 0,
    }));

    res.json({ dailyDurations: last7Days, knowledgeStats });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

initDb().then(() => {
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database file: ${dbPath}`);
  });
});
