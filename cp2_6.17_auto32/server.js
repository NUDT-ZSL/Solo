import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');

const readJSON = (file) => {
  const filePath = path.join(DATA_DIR, file);
  const data = fs.readFileSync(filePath, 'utf-8');
  return JSON.parse(data);
};

const writeJSON = (file, data) => {
  const filePath = path.join(DATA_DIR, file);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
};

// 剧目 API
app.get('/api/plays', (req, res) => {
  const plays = readJSON('plays.json');
  const { type, keyword } = req.query;
  
  let filtered = plays;
  
  if (type && type !== '全部') {
    filtered = filtered.filter(p => p.type === type);
  }
  
  if (keyword) {
    const kw = keyword.toLowerCase();
    filtered = filtered.filter(p => 
      p.name.toLowerCase().includes(kw) ||
      p.description.toLowerCase().includes(kw) ||
      p.cast.some(c => c.toLowerCase().includes(kw))
    );
  }
  
  res.json(filtered);
});

app.get('/api/plays/:id', (req, res) => {
  const plays = readJSON('plays.json');
  const play = plays.find(p => p.id === req.params.id);
  if (play) {
    res.json(play);
  } else {
    res.status(404).json({ error: '剧目不存在' });
  }
});

app.post('/api/plays', (req, res) => {
  const plays = readJSON('plays.json');
  const newPlay = {
    id: `play-${uuidv4().slice(0, 8)}`,
    ...req.body
  };
  plays.push(newPlay);
  writeJSON('plays.json', plays);
  res.status(201).json(newPlay);
});

app.put('/api/plays/:id', (req, res) => {
  const plays = readJSON('plays.json');
  const index = plays.findIndex(p => p.id === req.params.id);
  if (index !== -1) {
    plays[index] = { ...plays[index], ...req.body };
    writeJSON('plays.json', plays);
    res.json(plays[index]);
  } else {
    res.status(404).json({ error: '剧目不存在' });
  }
});

app.delete('/api/plays/:id', (req, res) => {
  const plays = readJSON('plays.json');
  const filtered = plays.filter(p => p.id !== req.params.id);
  writeJSON('plays.json', filtered);
  res.json({ success: true });
});

// 巡演站点 API
app.get('/api/stops', (req, res) => {
  const stops = readJSON('stops.json');
  const plays = readJSON('plays.json');
  
  const stopsWithPlay = stops.map(stop => {
    const play = plays.find(p => p.id === stop.playId);
    return { ...stop, playName: play?.name || '未知剧目' };
  });
  
  res.json(stopsWithPlay);
});

app.get('/api/stops/:id', (req, res) => {
  const stops = readJSON('stops.json');
  const stop = stops.find(s => s.id === req.params.id);
  if (stop) {
    res.json(stop);
  } else {
    res.status(404).json({ error: '站点不存在' });
  }
});

app.post('/api/stops', (req, res) => {
  const stops = readJSON('stops.json');
  const newStop = {
    id: `stop-${uuidv4().slice(0, 8)}`,
    ...req.body
  };
  stops.push(newStop);
  writeJSON('stops.json', stops);
  res.status(201).json(newStop);
});

app.put('/api/stops/:id', (req, res) => {
  const stops = readJSON('stops.json');
  const index = stops.findIndex(s => s.id === req.params.id);
  if (index !== -1) {
    stops[index] = { ...stops[index], ...req.body };
    writeJSON('stops.json', stops);
    res.json(stops[index]);
  } else {
    res.status(404).json({ error: '站点不存在' });
  }
});

// 订单 API
app.get('/api/orders', (req, res) => {
  const orders = readJSON('orders.json');
  const { stopId } = req.query;
  
  let filtered = orders;
  if (stopId) {
    filtered = orders.filter(o => o.stopId === stopId);
  }
  
  res.json(filtered);
});

app.get('/api/orders/:id', (req, res) => {
  const orders = readJSON('orders.json');
  const order = orders.find(o => o.id === req.params.id);
  if (order) {
    const plays = readJSON('plays.json');
    const stops = readJSON('stops.json');
    const play = plays.find(p => p.id === order.playId);
    const stop = stops.find(s => s.id === order.stopId);
    res.json({
      ...order,
      playName: play?.name || '未知剧目',
      city: stop?.city || '未知城市',
      venue: stop?.venue || '未知场馆',
      date: stop?.date || '未知日期'
    });
  } else {
    res.status(404).json({ error: '订单不存在' });
  }
});

app.post('/api/orders', (req, res) => {
  const orders = readJSON('orders.json');
  const newOrder = {
    id: `order-${uuidv4().slice(0, 8)}`,
    orderDate: new Date().toISOString().split('T')[0],
    ...req.body
  };
  orders.push(newOrder);
  writeJSON('orders.json', orders);
  res.status(201).json(newOrder);
});

// 票房数据 API
app.get('/api/boxoffice', (req, res) => {
  const { playId, range = 'week' } = req.query;
  
  const data = [];
  const today = new Date();
  
  const days = range === 'week' ? 7 : range === 'month' ? 30 : 14;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const baseTickets = Math.floor(Math.random() * 50) + 30;
    const weekendBonus = date.getDay() === 0 || date.getDay() === 6 ? 20 : 0;
    
    data.push({
      date: dateStr,
      ticketsSold: baseTickets + weekendBonus,
      revenue: (baseTickets + weekendBonus) * 280
    });
  }
  
  res.json(data);
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
