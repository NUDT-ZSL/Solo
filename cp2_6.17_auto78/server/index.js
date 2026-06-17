import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const DATA_DIR = path.join(__dirname, 'data');
const ORDERS_FILE = path.join(DATA_DIR, 'orders.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const readJSONFile = (filePath) => {
  try {
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const data = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(data || '[]');
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err);
    return [];
  }
};

const writeJSONFile = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error(`Error writing ${filePath}:`, err);
    return false;
  }
};

app.get('/api/orders', (req, res) => {
  const orders = readJSONFile(ORDERS_FILE);
  const { status } = req.query;
  let result = orders;
  if (status) {
    result = orders.filter((o) => o.status === status);
  }
  setTimeout(() => {
    res.json(result);
  }, 50);
});

app.get('/api/orders/:id', (req, res) => {
  const orders = readJSONFile(ORDERS_FILE);
  const order = orders.find((o) => o.id === req.params.id);
  setTimeout(() => {
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ error: '订单不存在' });
    }
  }, 50);
});

app.post('/api/orders', (req, res) => {
  const orders = readJSONFile(ORDERS_FILE);
  const { customerName, phone, items } = req.body;

  if (!customerName || !items || items.length === 0) {
    return res.status(400).json({ error: '顾客姓名和物品清单不能为空' });
  }

  const newOrder = {
    id: uuidv4(),
    orderNo: 'BK' + Date.now().toString().slice(-8),
    customerName,
    phone: phone || '',
    items,
    status: 'new',
    createdAt: new Date().toISOString(),
  };

  orders.unshift(newOrder);
  writeJSONFile(ORDERS_FILE, orders);

  setTimeout(() => {
    res.status(201).json(newOrder);
  }, 50);
});

app.put('/api/orders/:id/status', (req, res) => {
  const orders = readJSONFile(ORDERS_FILE);
  const { status } = req.body;
  const index = orders.findIndex((o) => o.id === req.params.id);

  if (index === -1) {
    return res.status(404).json({ error: '订单不存在' });
  }

  if (!['new', 'processing', 'completed'].includes(status)) {
    return res.status(400).json({ error: '无效的订单状态' });
  }

  orders[index].status = status;
  orders[index].updatedAt = new Date().toISOString();
  writeJSONFile(ORDERS_FILE, orders);

  setTimeout(() => {
    res.json(orders[index]);
  }, 50);
});

app.get('/api/logs', (req, res) => {
  const logs = readJSONFile(LOGS_FILE);
  setTimeout(() => {
    res.json(logs);
  }, 50);
});

app.post('/api/logs', (req, res) => {
  const logs = readJSONFile(LOGS_FILE);
  const { date, ingredients, products, notes } = req.body;

  if (!date) {
    return res.status(400).json({ error: '日期不能为空' });
  }

  const existingIndex = logs.findIndex((l) => l.date === date);

  const newLog = {
    id: existingIndex >= 0 ? logs[existingIndex].id : uuidv4(),
    date,
    ingredients: ingredients || [],
    products: products || [],
    notes: (notes || '').slice(0, 200),
    createdAt: existingIndex >= 0 ? logs[existingIndex].createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  if (existingIndex >= 0) {
    logs[existingIndex] = newLog;
  } else {
    logs.unshift(newLog);
  }

  writeJSONFile(LOGS_FILE, logs);

  setTimeout(() => {
    res.status(201).json(newLog);
  }, 50);
});

app.listen(PORT, () => {
  console.log(`Bakery API server running on http://localhost:${PORT}`);
});
