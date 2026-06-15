import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { inventoryController } from './controllers/inventoryController';
import { predictionController } from './controllers/predictionController';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

app.use('/api/inventory', inventoryController);
app.use('/api/inventory', predictionController);

const server = createServer(app);

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('WebSocket client connected');
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

export function broadcastChange(payload: Record<string, unknown>) {
  const message = JSON.stringify({ type: 'INVENTORY_CHANGE', payload });
  for (const client of wss.clients) {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    } catch {
      // skip closed or errored connections
    }
  }
}

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

export const db = new Database(path.join(dataDir, 'warehouse.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS inventory_items (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    storage_area TEXT NOT NULL,
    safety_stock INTEGER NOT NULL DEFAULT 0,
    max_capacity INTEGER NOT NULL DEFAULT 0,
    expiry_date TEXT,
    status TEXT NOT NULL DEFAULT 'normal',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY,
    item_id TEXT NOT NULL,
    type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    date TEXT NOT NULL,
    note TEXT
  );
`);

function seedData() {
  const itemCount = db.prepare('SELECT COUNT(*) as count FROM inventory_items').get() as { count: number };
  if (itemCount.count > 0) return;

  const categories = ['电子元件', '机械配件', '包装材料', '化工原料', '办公用品', '安全防护'];
  const storageAreas = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];
  const now = new Date();

  const items = [
    { name: '电阻 10KΩ', category: '电子元件', storage_area: 'A1', quantity: 5000, safety_stock: 1000, max_capacity: 10000 },
    { name: '电容 100μF', category: '电子元件', storage_area: 'A1', quantity: 3200, safety_stock: 800, max_capacity: 8000 },
    { name: 'LED灯珠 白光', category: '电子元件', storage_area: 'A1', quantity: 150, safety_stock: 500, max_capacity: 5000 },
    { name: 'IC芯片 STM32F103', category: '电子元件', storage_area: 'A2', quantity: 800, safety_stock: 200, max_capacity: 2000 },
    { name: '继电器 5V', category: '电子元件', storage_area: 'A2', quantity: 600, safety_stock: 150, max_capacity: 1500 },
    { name: '轴承 6205-2RS', category: '机械配件', storage_area: 'A2', quantity: 200, safety_stock: 50, max_capacity: 500 },
    { name: '螺栓 M8×30', category: '机械配件', storage_area: 'A3', quantity: 3000, safety_stock: 500, max_capacity: 5000 },
    { name: '齿轮 Z40', category: '机械配件', storage_area: 'A3', quantity: 45, safety_stock: 20, max_capacity: 200 },
    { name: '弹簧 压缩型', category: '机械配件', storage_area: 'A3', quantity: 180, safety_stock: 60, max_capacity: 1000 },
    { name: '联轴器 L型', category: '机械配件', storage_area: 'A4', quantity: 30, safety_stock: 10, max_capacity: 100 },
    { name: '纸箱 40×30×25', category: '包装材料', storage_area: 'A4', quantity: 800, safety_stock: 200, max_capacity: 2000 },
    { name: '气泡膜 1m宽', category: '包装材料', storage_area: 'A4', quantity: 50, safety_stock: 30, max_capacity: 200 },
    { name: '封箱胶带 48mm', category: '包装材料', storage_area: 'A5', quantity: 400, safety_stock: 100, max_capacity: 800 },
    { name: '标签纸 A4', category: '包装材料', storage_area: 'A5', quantity: 250, safety_stock: 50, max_capacity: 500 },
    { name: '丙酮 AR级', category: '化工原料', storage_area: 'A5', quantity: 20, safety_stock: 10, max_capacity: 50 },
    { name: '环氧树脂 E44', category: '化工原料', storage_area: 'A6', quantity: 8, safety_stock: 5, max_capacity: 30 },
    { name: 'A4复印纸 80g', category: '办公用品', storage_area: 'A6', quantity: 150, safety_stock: 30, max_capacity: 300 },
    { name: '墨盒 黑色', category: '办公用品', storage_area: 'A6', quantity: 12, safety_stock: 5, max_capacity: 50 },
    { name: '安全帽 白色', category: '安全防护', storage_area: 'A6', quantity: 60, safety_stock: 20, max_capacity: 200 },
    { name: '防尘口罩 N95', category: '安全防护', storage_area: 'A1', quantity: 200, safety_stock: 100, max_capacity: 1000 },
    { name: '防护手套 丁腈', category: '安全防护', storage_area: 'A3', quantity: 80, safety_stock: 50, max_capacity: 500 },
    { name: '护目镜 透明', category: '安全防护', storage_area: 'A5', quantity: 35, safety_stock: 20, max_capacity: 200 },
    { name: '润滑脂 锂基', category: '化工原料', storage_area: 'A2', quantity: 15, safety_stock: 8, max_capacity: 40 },
    { name: '焊锡丝 0.8mm', category: '电子元件', storage_area: 'A4', quantity: 90, safety_stock: 30, max_capacity: 200 },
  ];

  const insertItem = db.prepare(`
    INSERT INTO inventory_items (id, name, category, quantity, storage_area, safety_stock, max_capacity, expiry_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertTransaction = db.prepare(`
    INSERT INTO inventory_transactions (id, item_id, type, quantity, date, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const transactionBatch: { itemId: string; type: string; quantity: number; date: string; note: string }[] = [];

  const seedTransaction = db.transaction(() => {
    for (const item of items) {
      const id = uuidv4();
      let status = 'normal';
      if (item.quantity <= item.safety_stock * 0.5) {
        status = 'critical';
      } else if (item.quantity <= item.safety_stock) {
        status = 'low_stock';
      }

      const expiryDate = new Date(now);
      expiryDate.setMonth(expiryDate.getMonth() + (Math.floor(Math.random() * 12) + 3));
      if (item.category === '化工原料') {
        expiryDate.setMonth(expiryDate.getMonth() - 6);
      }

      const createdAt = new Date(now);
      createdAt.setDate(createdAt.getDate() - Math.floor(Math.random() * 60 + 30));

      insertItem.run(
        id,
        item.name,
        item.category,
        item.quantity,
        item.storage_area,
        item.safety_stock,
        item.max_capacity,
        expiryDate.toISOString(),
        status,
        createdAt.toISOString(),
        now.toISOString()
      );

      for (let day = 29; day >= 0; day--) {
        const txDate = new Date(now);
        txDate.setDate(txDate.getDate() - day);
        txDate.setHours(0, 0, 0, 0);

        const hasInbound = Math.random() < 0.3;
        if (hasInbound) {
          const inQty = Math.floor(Math.random() * Math.max(10, Math.floor(item.max_capacity * 0.05)) + 5);
          transactionBatch.push({
            itemId: id,
            type: 'in',
            quantity: inQty,
            date: txDate.toISOString(),
            note: '采购入库',
          });
        }

        const hasOutbound = Math.random() < 0.5;
        if (hasOutbound) {
          const maxOut = Math.min(item.quantity, Math.floor(item.max_capacity * 0.03) + 3);
          const outQty = Math.floor(Math.random() * Math.max(1, maxOut) + 1);
          transactionBatch.push({
            itemId: id,
            type: 'out',
            quantity: outQty,
            date: txDate.toISOString(),
            note: '生产领料',
          });
        }
      }
    }

    for (const tx of transactionBatch) {
      insertTransaction.run(uuidv4(), tx.itemId, tx.type, tx.quantity, tx.date, tx.note);
    }
  });

  seedTransaction();
  console.log(`Seeded ${items.length} inventory items and ${transactionBatch.length} transactions`);
}

seedData();

server.listen(PORT, () => {
  console.log(`Warehouse Inventory Server running on http://localhost:${PORT}`);
  console.log(`WebSocket server available on ws://localhost:${PORT}`);
});
