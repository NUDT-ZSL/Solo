import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(filePath, defaultData) {
  try {
    if (!fs.existsSync(filePath)) {
      fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2), 'utf-8');
      return defaultData;
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    if (!raw.trim()) return defaultData;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return defaultData;
  }
}

function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
}

app.get('/api/orders', (req, res) => {
  const orders = readJSON(ORDERS_FILE, []);
  res.json(orders);
});

app.post('/api/orders', (req, res) => {
  try {
    const { orderNo, customerName, phone, items, status } = req.body;

    if (!orderNo || !customerName || !phone || !items || !items.length) {
      return res.status(400).json({ error: '缺少必要字段' });
    }

    const orders = readJSON(ORDERS_FILE, []);
    const newOrder = {
      id: uuidv4(),
      orderNo,
      customerName,
      phone,
      items,
      status: status || 'new',
      createdAt: new Date().toISOString(),
    };

    orders.push(newOrder);
    writeJSON(ORDERS_FILE, orders);
    res.status(201).json(newOrder);
  } catch (err) {
    console.error('Create order error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.patch('/api/orders/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !['new', 'making', 'completed'].includes(status)) {
      return res.status(400).json({ error: '无效的状态值' });
    }

    const orders = readJSON(ORDERS_FILE, []);
    const orderIdx = orders.findIndex((o) => o.id === id);

    if (orderIdx === -1) {
      return res.status(404).json({ error: '订单不存在' });
    }

    orders[orderIdx].status = status;
    writeJSON(ORDERS_FILE, orders);
    res.json(orders[orderIdx]);
  } catch (err) {
    console.error('Update order error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/logs', (req, res) => {
  const logs = readJSON(LOGS_FILE, []);
  res.json(logs);
});

app.post('/api/logs', (req, res) => {
  try {
    const { date, materials, products, notes } = req.body;

    if (!date) {
      return res.status(400).json({ error: '缺少日期字段' });
    }

    const logs = readJSON(LOGS_FILE, []);
    const newLog = {
      id: uuidv4(),
      date,
      materials: materials || [],
      products: products || [],
      notes: notes || '',
      createdAt: new Date().toISOString(),
    };

    logs.push(newLog);
    writeJSON(LOGS_FILE, logs);
    res.status(201).json(newLog);
  } catch (err) {
    console.error('Create log error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`Bakery API server running on http://localhost:${PORT}`);
  console.log(`  - GET/POST  /api/orders`);
  console.log(`  - PATCH     /api/orders/:id`);
  console.log(`  - GET/POST  /api/logs`);
});
