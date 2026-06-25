const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const dayjs = require('dayjs');

const app = express();
const PORT = 4000;

const WORKS_FILE = path.join(__dirname, 'data', 'works.json');
const LOGS_FILE = path.join(__dirname, 'data', 'accessLogs.json');

app.use(cors());
app.use(express.json({ limit: '50mb' }));

const readJsonFile = (filePath) => {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
};

const writeJsonFile = (filePath, data) => {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
};

app.get('/api/works', (req, res) => {
  const works = readJsonFile(WORKS_FILE);
  res.json(works);
});

app.post('/api/works', (req, res) => {
  const { title, image, tags } = req.body;
  
  if (!title || !image || !tags) {
    return res.status(400).json({ error: '缺少必要字段' });
  }

  const works = readJsonFile(WORKS_FILE);
  const newWork = {
    id: uuidv4(),
    title,
    image,
    tags,
    clicks: 0,
    totalDuration: 0,
    viewCount: 0,
    createdAt: Date.now(),
  };

  works.push(newWork);
  writeJsonFile(WORKS_FILE, works);
  res.status(201).json(newWork);
});

app.post('/api/works/:id/click', (req, res) => {
  const { id } = req.params;
  const { timestamp } = req.body;
  
  const works = readJsonFile(WORKS_FILE);
  const workIndex = works.findIndex(w => w.id === id);
  
  if (workIndex === -1) {
    return res.status(404).json({ error: '作品不存在' });
  }

  works[workIndex].clicks += 1;
  works[workIndex].viewCount += 1;
  writeJsonFile(WORKS_FILE, works);

  const logs = readJsonFile(LOGS_FILE);
  logs.push({
    id: uuidv4(),
    workId: id,
    type: 'click',
    timestamp: timestamp || Date.now(),
  });
  writeJsonFile(LOGS_FILE, logs);

  res.json({ success: true, clicks: works[workIndex].clicks });
});

app.post('/api/works/:id/duration', (req, res) => {
  const { id } = req.params;
  const { duration, timestamp } = req.body;
  
  if (typeof duration !== 'number') {
    return res.status(400).json({ error: 'duration 必须是数字' });
  }

  const works = readJsonFile(WORKS_FILE);
  const workIndex = works.findIndex(w => w.id === id);
  
  if (workIndex === -1) {
    return res.status(404).json({ error: '作品不存在' });
  }

  works[workIndex].totalDuration += duration;
  writeJsonFile(WORKS_FILE, works);

  const logs = readJsonFile(LOGS_FILE);
  logs.push({
    id: uuidv4(),
    workId: id,
    type: 'duration',
    duration,
    timestamp: timestamp || Date.now(),
  });
  writeJsonFile(LOGS_FILE, logs);

  res.json({ success: true, totalDuration: works[workIndex].totalDuration });
});

app.get('/api/stats', (req, res) => {
  const works = readJsonFile(WORKS_FILE);
  const logs = readJsonFile(LOGS_FILE);

  const totalWorks = works.length;
  const totalClicks = works.reduce((sum, w) => sum + w.clicks, 0);
  const avgDuration = totalClicks > 0 
    ? Math.round(works.reduce((sum, w) => sum + w.totalDuration, 0) / totalClicks)
    : 0;

  const barData = works.map(w => ({
    id: w.id,
    title: w.title,
    clicks: w.clicks,
    avgDuration: w.clicks > 0 ? Math.round(w.totalDuration / w.clicks) : 0,
    totalDuration: w.totalDuration,
    tags: w.tags,
  }));

  const now = dayjs();
  const hourlyViews = {};
  for (let i = 23; i >= 0; i--) {
    const hour = now.subtract(i, 'hour').format('YYYY-MM-DD HH:00');
    hourlyViews[hour] = 0;
  }

  const clickLogs = logs.filter(l => l.type === 'click');
  clickLogs.forEach(log => {
    const logHour = dayjs(log.timestamp).format('YYYY-MM-DD HH:00');
    if (hourlyViews.hasOwnProperty(logHour)) {
      hourlyViews[logHour]++;
    }
  });

  const lineData = {
    labels: Object.keys(hourlyViews).map(h => dayjs(h).format('HH:00')),
    data: Object.values(hourlyViews),
  };

  const themeCount = {};
  works.forEach(w => {
    w.tags.forEach(tag => {
      themeCount[tag] = (themeCount[tag] || 0) + 1;
    });
  });

  const pieData = {
    labels: Object.keys(themeCount),
    data: Object.values(themeCount),
  };

  res.json({
    totalWorks,
    totalClicks,
    avgDuration,
    barData,
    lineData,
    pieData,
    works,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
