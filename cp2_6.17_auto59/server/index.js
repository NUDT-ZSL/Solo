import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');

const readJSON = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading file:', err);
    return [];
  }
};

const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing file:', err);
    return false;
  }
};

let latestReport = null;

app.post('/api/login', (req, res) => {
  const { name, password } = req.body;
  const users = readJSON(USERS_FILE);
  const user = users.find(
    (u) => u.name === name && u.password === password
  );

  if (user) {
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      success: true,
      token: 'mock-token-' + user.id,
      user: userWithoutPassword,
    });
  } else {
    res.status(401).json({ success: false, message: '用户名或密码错误' });
  }
});

app.get('/api/users', (req, res) => {
  const users = readJSON(USERS_FILE);
  const safeUsers = users.map(({ password, ...rest }) => rest);
  res.json(safeUsers);
});

app.get('/api/reports', (req, res) => {
  const {
    userId,
    startDate,
    endDate,
    page = 1,
    pageSize = 20,
  } = req.query;

  let reports = readJSON(REPORTS_FILE);
  const users = readJSON(USERS_FILE);

  if (userId) {
    reports = reports.filter((r) => r.userId === userId);
  }

  if (startDate) {
    const start = new Date(startDate).getTime();
    reports = reports.filter((r) => new Date(r.createdAt).getTime() >= start);
  }

  if (endDate) {
    const end = new Date(endDate).getTime();
    reports = reports.filter((r) => new Date(r.createdAt).getTime() <= end);
  }

  reports.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const userMap = {};
  users.forEach((u) => {
    userMap[u.id] = { id: u.id, name: u.name, avatarUrl: u.avatarUrl, role: u.role };
  });

  const reportsWithUser = reports.map((r) => ({
    ...r,
    user: userMap[r.userId] || null,
  }));

  const pageNum = parseInt(page, 10);
  const size = parseInt(pageSize, 10);
  const startIdx = (pageNum - 1) * size;
  const paginated = reportsWithUser.slice(startIdx, startIdx + size);

  res.json({
    data: paginated,
    total: reportsWithUser.length,
    page: pageNum,
    pageSize: size,
    hasMore: startIdx + size < reportsWithUser.length,
  });
});

app.post('/api/reports', (req, res) => {
  const { userId, type, content, blockerType } = req.body;

  if (!userId || !type || !content) {
    return res
      .status(400)
      .json({ success: false, message: '缺少必要参数' });
  }

  const reports = readJSON(REPORTS_FILE);
  const users = readJSON(USERS_FILE);

  const newReport = {
    id: uuidv4(),
    userId,
    type,
    content,
    blockerType: blockerType || '无',
    likes: 0,
    rating: 0,
    createdAt: new Date().toISOString(),
  };

  reports.unshift(newReport);
  writeJSON(REPORTS_FILE, reports);

  const user = users.find((u) => u.id === userId);
  latestReport = {
    ...newReport,
    user: user
      ? { id: user.id, name: user.name, avatarUrl: user.avatarUrl, role: user.role }
      : null,
  };

  setTimeout(() => {
    latestReport = null;
  }, 15000);

  res.json({ success: true, data: latestReport });
});

app.post('/api/reports/:id/like', (req, res) => {
  const { id } = req.params;
  const reports = readJSON(REPORTS_FILE);
  const users = readJSON(USERS_FILE);

  const reportIdx = reports.findIndex((r) => r.id === id);
  if (reportIdx === -1) {
    return res.status(404).json({ success: false, message: '汇报不存在' });
  }

  reports[reportIdx].likes = (reports[reportIdx].likes || 0) + 1;
  writeJSON(REPORTS_FILE, reports);

  const userMap = {};
  users.forEach((u) => {
    userMap[u.id] = { id: u.id, name: u.name, avatarUrl: u.avatarUrl, role: u.role };
  });

  const updated = {
    ...reports[reportIdx],
    user: userMap[reports[reportIdx].userId] || null,
  };

  res.json({ success: true, data: updated });
});

app.post('/api/reports/:id/rate', (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ success: false, message: '评分必须在1-5之间' });
  }

  const reports = readJSON(REPORTS_FILE);
  const users = readJSON(USERS_FILE);

  const reportIdx = reports.findIndex((r) => r.id === id);
  if (reportIdx === -1) {
    return res.status(404).json({ success: false, message: '汇报不存在' });
  }

  reports[reportIdx].rating = rating;
  writeJSON(REPORTS_FILE, reports);

  const userMap = {};
  users.forEach((u) => {
    userMap[u.id] = { id: u.id, name: u.name, avatarUrl: u.avatarUrl, role: u.role };
  });

  const updated = {
    ...reports[reportIdx],
    user: userMap[reports[reportIdx].userId] || null,
  };

  res.json({ success: true, data: updated });
});

app.get('/api/reports/stats', (req, res) => {
  const { startDate, endDate } = req.query;
  let reports = readJSON(REPORTS_FILE);
  const users = readJSON(USERS_FILE);

  if (startDate) {
    const start = new Date(startDate).getTime();
    reports = reports.filter((r) => new Date(r.createdAt).getTime() >= start);
  }

  if (endDate) {
    const end = new Date(endDate).getTime();
    reports = reports.filter((r) => new Date(r.createdAt).getTime() <= end);
  }

  const memberColors = {
    'user-1': '#3949ab',
    'user-2': '#ff7043',
    'user-3': '#26a69a',
    'user-4': '#ec407a',
    'user-5': '#ffa726',
  };

  const reportCounts = {};
  users.forEach((u) => {
    reportCounts[u.id] = {
      userId: u.id,
      name: u.name,
      count: 0,
      color: memberColors[u.id] || '#78909c',
    };
  });

  reports.forEach((r) => {
    if (reportCounts[r.userId]) {
      reportCounts[r.userId].count++;
    }
  });

  const barChartData = Object.values(reportCounts);

  const blockerDistribution = {};
  reports.forEach((r) => {
    const type = r.blockerType || '无';
    if (!blockerDistribution[type]) {
      blockerDistribution[type] = { name: type, value: 0 };
    }
    blockerDistribution[type].value++;
  });

  const pieColors = ['#3949ab', '#ff7043', '#26a69a', '#ec407a', '#ffa726', '#5c6bc0'];
  const pieChartData = Object.values(blockerDistribution).map((item, idx) => ({
    ...item,
    fill: pieColors[idx % pieColors.length],
  }));

  res.json({
    barChartData,
    pieChartData,
    totalReports: reports.length,
    totalUsers: users.length,
    dateRange: { startDate, endDate },
  });
});

app.get('/api/reports/poll-latest', (req, res) => {
  if (latestReport) {
    res.json({ hasNew: true, report: latestReport });
  } else {
    res.json({ hasNew: false });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
