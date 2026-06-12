const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3001;
const DB_PATH = path.join(__dirname, 'db.sqlite');

app.use(cors());
app.use(express.json());

let db;

function saveDatabase() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

function query(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function run(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  stmt.step();
  stmt.free();
  saveDatabase();
  return { changes: db.getRowsModified() };
}

function get(sql, params = []) {
  const results = query(sql, params);
  return results.length > 0 ? results[0] : undefined;
}

async function initDatabase() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      estimatedHours INTEGER NOT NULL,
      difficulty INTEGER NOT NULL CHECK(difficulty BETWEEN 1 AND 5),
      createdAt TEXT NOT NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS study_records (
      id TEXT PRIMARY KEY,
      courseId TEXT NOT NULL,
      duration INTEGER NOT NULL,
      date TEXT NOT NULL,
      createdAt TEXT NOT NULL,
      FOREIGN KEY (courseId) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);

  const courseCount = get('SELECT COUNT(*) as count FROM courses').count;

  if (courseCount === 0) {
    const now = new Date().toISOString();

    const course1Id = uuidv4();
    const course2Id = uuidv4();
    const course3Id = uuidv4();
    const course4Id = uuidv4();
    const course5Id = uuidv4();

    run('INSERT INTO courses (id, name, category, estimatedHours, difficulty, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [course1Id, 'JavaScript 基础', '前端开发', 20, 2, now]);
    run('INSERT INTO courses (id, name, category, estimatedHours, difficulty, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [course2Id, 'React 进阶', '前端开发', 40, 4, now]);
    run('INSERT INTO courses (id, name, category, estimatedHours, difficulty, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [course3Id, 'Node.js 入门', '后端开发', 30, 3, now]);
    run('INSERT INTO courses (id, name, category, estimatedHours, difficulty, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [course4Id, 'Python 数据分析', '数据科学', 50, 3, now]);
    run('INSERT INTO courses (id, name, category, estimatedHours, difficulty, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
      [course5Id, '算法与数据结构', '计算机基础', 60, 5, now]);

    const today = new Date();
    const formatDate = (d) => d.toISOString().split('T')[0];

    run('INSERT INTO study_records (id, courseId, duration, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), course1Id, 120, formatDate(new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)), now]);
    run('INSERT INTO study_records (id, courseId, duration, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), course1Id, 90, formatDate(new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000)), now]);
    run('INSERT INTO study_records (id, courseId, duration, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), course1Id, 60, formatDate(new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)), now]);

    run('INSERT INTO study_records (id, courseId, duration, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), course2Id, 180, formatDate(new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)), now]);
    run('INSERT INTO study_records (id, courseId, duration, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), course2Id, 150, formatDate(new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000)), now]);

    run('INSERT INTO study_records (id, courseId, duration, date, createdAt) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), course3Id, 200, formatDate(new Date(today.getTime() - 4 * 24 * 60 * 60 * 1000)), now]);

    console.log('示例数据已插入');
  }

  saveDatabase();
}

const getCourseWithStats = (course) => {
  const result = get('SELECT COALESCE(SUM(duration), 0) as total FROM study_records WHERE courseId = ?', [course.id]);
  const totalMinutes = result.total;
  const estimatedMinutes = course.estimatedHours * 60;
  const progress = estimatedMinutes > 0 ? Math.min(Math.round((totalMinutes / estimatedMinutes) * 100), 100) : 0;
  return {
    ...course,
    totalMinutes,
    progress
  };
};

app.get('/api/courses', (req, res) => {
  const courses = query('SELECT * FROM courses ORDER BY createdAt DESC');
  const coursesWithStats = courses.map(getCourseWithStats);
  res.json(coursesWithStats);
});

app.post('/api/courses', (req, res) => {
  const { name, category, estimatedHours, difficulty } = req.body;

  if (!name || !category || !estimatedHours || !difficulty) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  if (difficulty < 1 || difficulty > 5) {
    return res.status(400).json({ error: '难度必须在 1-5 之间' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  run('INSERT INTO courses (id, name, category, estimatedHours, difficulty, createdAt) VALUES (?, ?, ?, ?, ?, ?)',
    [id, name, category, estimatedHours, difficulty, createdAt]);

  const course = get('SELECT * FROM courses WHERE id = ?', [id]);
  res.status(201).json(getCourseWithStats(course));
});

app.get('/api/courses/:id', (req, res) => {
  const course = get('SELECT * FROM courses WHERE id = ?', [req.params.id]);

  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }

  res.json(getCourseWithStats(course));
});

app.put('/api/courses/:id', (req, res) => {
  const { name, category, estimatedHours, difficulty } = req.body;
  const course = get('SELECT * FROM courses WHERE id = ?', [req.params.id]);

  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }

  if (difficulty !== undefined && (difficulty < 1 || difficulty > 5)) {
    return res.status(400).json({ error: '难度必须在 1-5 之间' });
  }

  run('UPDATE courses SET name = ?, category = ?, estimatedHours = ?, difficulty = ? WHERE id = ?',
    [
      name !== undefined ? name : course.name,
      category !== undefined ? category : course.category,
      estimatedHours !== undefined ? estimatedHours : course.estimatedHours,
      difficulty !== undefined ? difficulty : course.difficulty,
      req.params.id
    ]);

  const updatedCourse = get('SELECT * FROM courses WHERE id = ?', [req.params.id]);
  res.json(getCourseWithStats(updatedCourse));
});

app.delete('/api/courses/:id', (req, res) => {
  const course = get('SELECT * FROM courses WHERE id = ?', [req.params.id]);

  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }

  run('DELETE FROM study_records WHERE courseId = ?', [req.params.id]);
  run('DELETE FROM courses WHERE id = ?', [req.params.id]);

  res.json({ message: '删除成功' });
});

app.get('/api/records', (req, res) => {
  const records = query('SELECT * FROM study_records ORDER BY date DESC, createdAt DESC');
  res.json(records);
});

app.get('/api/records/course/:courseId', (req, res) => {
  const course = get('SELECT * FROM courses WHERE id = ?', [req.params.courseId]);

  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }

  const records = query('SELECT * FROM study_records WHERE courseId = ? ORDER BY date DESC, createdAt DESC', [req.params.courseId]);
  res.json(records);
});

app.post('/api/records', (req, res) => {
  const { courseId, duration, date } = req.body;

  if (!courseId || !duration || !date) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const course = get('SELECT * FROM courses WHERE id = ?', [courseId]);
  if (!course) {
    return res.status(404).json({ error: '课程不存在' });
  }

  const id = uuidv4();
  const createdAt = new Date().toISOString();

  run('INSERT INTO study_records (id, courseId, duration, date, createdAt) VALUES (?, ?, ?, ?, ?)',
    [id, courseId, duration, date, createdAt]);

  const record = get('SELECT * FROM study_records WHERE id = ?', [id]);
  res.status(201).json(record);
});

app.put('/api/records/:id', (req, res) => {
  const { duration, date } = req.body;
  const record = get('SELECT * FROM study_records WHERE id = ?', [req.params.id]);

  if (!record) {
    return res.status(404).json({ error: '学习记录不存在' });
  }

  run('UPDATE study_records SET duration = ?, date = ? WHERE id = ?',
    [
      duration !== undefined ? duration : record.duration,
      date !== undefined ? date : record.date,
      req.params.id
    ]);

  const updatedRecord = get('SELECT * FROM study_records WHERE id = ?', [req.params.id]);
  res.json(updatedRecord);
});

app.delete('/api/records/:id', (req, res) => {
  const record = get('SELECT * FROM study_records WHERE id = ?', [req.params.id]);

  if (!record) {
    return res.status(404).json({ error: '学习记录不存在' });
  }

  run('DELETE FROM study_records WHERE id = ?', [req.params.id]);
  res.json({ message: '删除成功' });
});

app.get('/api/recommendations', (req, res) => {
  const courses = query('SELECT * FROM courses');
  const coursesWithStats = courses.map(getCourseWithStats);

  const categoryMinutes = {};
  coursesWithStats.forEach(course => {
    if (course.totalMinutes > 0) {
      categoryMinutes[course.category] = (categoryMinutes[course.category] || 0) + course.totalMinutes;
    }
  });

  const sortedCategories = Object.entries(categoryMinutes)
    .sort((a, b) => b[1] - a[1])
    .map(([category]) => category);

  const inProgress = coursesWithStats.filter(c => c.totalMinutes > 0 && c.progress < 100);
  const notStarted = coursesWithStats.filter(c => c.totalMinutes === 0);

  const priority1 = inProgress
    .filter(c => c.progress >= 30 && c.progress <= 70)
    .sort((a, b) => Math.abs(a.progress - 50) - Math.abs(b.progress - 50))
    .map(c => ({ courseId: c.id, reason: '进行中且完成率适中，建议继续学习', priority: 1, course: c }));

  const priority2 = inProgress
    .filter(c => c.progress < 30 || c.progress > 70)
    .sort((a, b) => b.progress - a.progress)
    .map(c => ({ courseId: c.id, reason: '进行中课程，建议完成', priority: 2, course: c }));

  const priority3 = [];
  for (const category of sortedCategories) {
    const categoryCourses = notStarted.filter(c => c.category === category);
    categoryCourses.sort((a, b) => a.difficulty - b.difficulty);
    categoryCourses.forEach(c => {
      priority3.push({ courseId: c.id, reason: `你常学习${category}，推荐尝试`, priority: 3, course: c });
    });
  }

  const priority3Ids = priority3.map(r => r.courseId);
  const priority4 = notStarted
    .filter(c => !priority3Ids.includes(c.id))
    .sort((a, b) => a.difficulty - b.difficulty)
    .map(c => ({ courseId: c.id, reason: '低难度入门推荐', priority: 4, course: c }));

  const recommendations = [...priority1, ...priority2, ...priority3, ...priority4];
  res.json(recommendations);
});

initDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}).catch(err => {
  console.error('数据库初始化失败:', err);
});
