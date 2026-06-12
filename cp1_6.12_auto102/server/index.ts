import express from 'express';
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}
const db = new Database(path.join(dbDir, 'groupbuyhub.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT UNIQUE NOT NULL,
    customer_name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    qty INTEGER NOT NULL DEFAULT 1,
    picked_qty INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_items_order_id ON items(order_id);
  CREATE INDEX IF NOT EXISTS idx_items_name ON items(item_name);
`);

type OrderItem = {
  name: string;
  qty: number;
};

type ParsedCSVRow = {
  order_id: string;
  customer_name: string;
  items: OrderItem[];
};

function parseCSV(content: string): ParsedCSVRow[] {
  const lines = content.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headerLine = lines[0];
  const headers = parseCSVLine(headerLine);
  const orderIdIdx = headers.indexOf('order_id');
  const customerNameIdx = headers.indexOf('customer_name');
  const itemsIdx = headers.indexOf('items');

  if (orderIdIdx === -1 || customerNameIdx === -1 || itemsIdx === -1) {
    throw new Error('CSV 文件缺少必要列：order_id, customer_name, items');
  }

  const rows: ParsedCSVRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 3) continue;

    const orderId = fields[orderIdIdx]?.trim();
    const customerName = fields[customerNameIdx]?.trim();
    const itemsRaw = fields[itemsIdx]?.trim();

    if (!orderId || !customerName || !itemsRaw) continue;

    let items: OrderItem[] = [];
    try {
      const parsed = JSON.parse(itemsRaw);
      if (Array.isArray(parsed)) {
        items = parsed
          .filter((it) => it && it.name)
          .map((it) => ({
            name: String(it.name),
            qty: parseInt(it.qty, 10) || 1,
          }));
      }
    } catch {
      continue;
    }

    if (items.length === 0) continue;
    rows.push({ order_id: orderId, customer_name, items });
  }
  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current);
  return result.map((f) => f.replace(/^"|"$/g, '').trim());
}

app.post('/api/orders/import', (req, res) => {
  try {
    const { csvContent } = req.body;
    if (!csvContent || typeof csvContent !== 'string') {
      return res.status(400).json({ error: '缺少 csvContent 参数' });
    }

    const rows = parseCSV(csvContent);
    if (rows.length === 0) {
      return res.json({ success: 0, failed: 0, message: '没有可导入的数据' });
    }

    const insertOrder = db.prepare(
      'INSERT OR IGNORE INTO orders (order_id, customer_name) VALUES (?, ?)'
    );
    const insertItem = db.prepare(
      'INSERT INTO items (order_id, item_name, qty, picked_qty) VALUES (?, ?, ?, 0)'
    );
    const checkOrderExists = db.prepare(
      'SELECT order_id FROM orders WHERE order_id = ?'
    );

    const tx = db.transaction((parsedRows: ParsedCSVRow[]) => {
      let success = 0;
      let failed = 0;
      for (const row of parsedRows) {
        try {
          const existing = checkOrderExists.get(row.order_id) as
            | { order_id: string }
            | undefined;
          if (!existing) {
            insertOrder.run(row.order_id, row.customer_name);
          }
          for (const item of row.items) {
            insertItem.run(row.order_id, item.name, item.qty);
          }
          success++;
        } catch {
          failed++;
        }
      }
      return { success, failed };
    });

    const result = tx(rows);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : '导入失败';
    res.status(500).json({ error: message });
  }
});

app.get('/api/orders', (req, res) => {
  const search = (req.query.search as string) || '';
  const status = (req.query.status as string) || 'all';

  let sql = `
    SELECT DISTINCT o.id, o.order_id, o.customer_name, o.created_at,
           (SELECT COUNT(*) FROM items i WHERE i.order_id = o.order_id) AS total_items,
           (SELECT COUNT(*) FROM items i WHERE i.order_id = o.order_id AND i.picked_qty >= i.qty) AS picked_items
    FROM orders o
    LEFT JOIN items i ON o.order_id = i.order_id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (search) {
    sql += ' AND (o.order_id LIKE ? OR o.customer_name LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  const rows = db
    .prepare(sql)
    .all(...params) as Array<{
    id: number;
    order_id: string;
    customer_name: string;
    created_at: string;
    total_items: number;
    picked_items: number;
  }>;

  let filtered = rows;
  if (status === 'completed') {
    filtered = rows.filter((r) => r.total_items > 0 && r.picked_items >= r.total_items);
  } else if (status === 'pending') {
    filtered = rows.filter((r) => r.total_items === 0 || r.picked_items < r.total_items);
  }

  const stmtItems = db.prepare(
    'SELECT id, item_name, qty, picked_qty FROM items WHERE order_id = ?'
  );
  const result = filtered.map((order) => {
    const items = stmtItems.all(order.order_id) as Array<{
      id: number;
      item_name: string;
      qty: number;
      picked_qty: number;
    }>;
    return {
      ...order,
      items,
      isComplete: order.total_items > 0 && order.picked_items >= order.total_items,
    };
  });

  res.json(result);
});

app.get('/api/stats', (_req, res) => {
  const totalOrders = (db.prepare('SELECT COUNT(*) as cnt FROM orders').get() as { cnt: number }).cnt;

  const completedOrders = (
    db.prepare(`
      SELECT COUNT(DISTINCT o.order_id) as cnt
      FROM orders o
      WHERE NOT EXISTS (
        SELECT 1 FROM items i WHERE i.order_id = o.order_id AND i.picked_qty < i.qty
      ) AND EXISTS (SELECT 1 FROM items i WHERE i.order_id = o.order_id)
    `).get() as { cnt: number }
  ).cnt;

  const pendingOrders = totalOrders - completedOrders;

  const itemStats = db
    .prepare(`
      SELECT item_name,
             SUM(qty) as total_qty,
             SUM(CASE WHEN picked_qty >= qty THEN qty ELSE picked_qty END) as picked_qty
      FROM items
      GROUP BY item_name
      ORDER BY item_name ASC
    `)
    .all() as Array<{
    item_name: string;
    total_qty: number;
    picked_qty: number;
  }>;

  res.json({
    totalOrders,
    completedOrders,
    pendingOrders,
    itemStats,
  });
});

app.post('/api/items/:id/pick', (req, res) => {
  try {
    const itemId = parseInt(req.params.id, 10);
    const { picked } = req.body;
    if (isNaN(itemId)) {
      return res.status(400).json({ error: '无效的 item id' });
    }

    const item = db.prepare('SELECT qty, picked_qty FROM items WHERE id = ?').get(itemId) as
      | { qty: number; picked_qty: number }
      | undefined;
    if (!item) {
      return res.status(404).json({ error: '商品不存在' });
    }

    const newPickedQty = picked ? item.qty : 0;
    db.prepare('UPDATE items SET picked_qty = ? WHERE id = ?').run(newPickedQty, itemId);

    res.json({ success: true, id: itemId, picked_qty: newPickedQty });
  } catch (err) {
    const message = err instanceof Error ? err.message : '更新失败';
    res.status(500).json({ error: message });
  }
});

app.post('/api/items/batch-pick', (req, res) => {
  try {
    const updates: Array<{ id: number; picked: boolean }> = req.body.updates || [];
    if (!Array.isArray(updates)) {
      return res.status(400).json({ error: 'updates 必须是数组' });
    }

    const updateStmt = db.prepare('UPDATE items SET picked_qty = ? WHERE id = ?');
    const getItem = db.prepare('SELECT qty FROM items WHERE id = ?');

    const tx = db.transaction((list: typeof updates) => {
      const results: Array<{ id: number; picked_qty: number }> = [];
      for (const u of list) {
        const item = getItem.get(u.id) as { qty: number } | undefined;
        if (!item) continue;
        const newPickedQty = u.picked ? item.qty : 0;
        updateStmt.run(newPickedQty, u.id);
        results.push({ id: u.id, picked_qty: newPickedQty });
      }
      return results;
    });

    const results = tx(updates);
    res.json({ success: true, updated: results });
  } catch (err) {
    const message = err instanceof Error ? err.message : '批量更新失败';
    res.status(500).json({ error: message });
  }
});

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`GroupBuyHub Server running on http://localhost:${PORT}`);
});
