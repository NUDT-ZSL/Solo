import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { db, broadcastChange } from '../index';

const router = Router();

export function computeStatus(quantity: number, safetyStock: number): string {
  if (quantity <= 0) return 'out_of_stock';
  if (quantity <= safetyStock * 0.5) return 'critical';
  if (quantity <= safetyStock) return 'low_stock';
  return 'normal';
}

router.get('/', (req: Request, res: Response) => {
  const { search = '', category = '', status = '', page = '1', pageSize = '20' } = req.query;

  const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
  const pageSizeNum = Math.max(1, parseInt(pageSize as string, 10) || 20);
  const offset = (pageNum - 1) * pageSizeNum;

  const conditions: string[] = [];
  const paramsList: (string | number)[] = [];

  if (search) {
    conditions.push('name LIKE ?');
    paramsList.push(`%${search}%`);
  }
  if (category) {
    conditions.push('category = ?');
    paramsList.push(category as string);
  }
  if (status) {
    conditions.push('status = ?');
    paramsList.push(status as string);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countParams = [...paramsList];
  const countRow = db.prepare(`SELECT COUNT(*) as total FROM inventory_items ${whereClause}`).get(countParams.length === 1 ? countParams[0] : countParams) as { total: number };

  const dataParams = [...paramsList, pageSizeNum, offset];
  const items = db.prepare(
    `SELECT * FROM inventory_items ${whereClause} ORDER BY updated_at DESC LIMIT ? OFFSET ?`
  ).all(dataParams.length === 1 ? dataParams[0] : dataParams);

  res.json({ data: items, total: countRow.total, page: pageNum, pageSize: pageSizeNum });
});

router.get('/dashboard', (_req: Request, res: Response) => {
  const totalCategoriesRow = db.prepare('SELECT COUNT(DISTINCT category) as count FROM inventory_items').get() as { count: number };
  const totalQuantityRow = db.prepare('SELECT COALESCE(SUM(quantity), 0) as total FROM inventory_items').get() as { total: number };
  const lowStockCountRow = db.prepare("SELECT COUNT(*) as count FROM inventory_items WHERE status IN ('low_stock', 'critical', 'out_of_stock')").get() as { count: number };

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  thirtyDaysAgo.setHours(0, 0, 0, 0);

  const expiringCountRow = db.prepare(
    'SELECT COUNT(*) as count FROM inventory_items WHERE expiry_date <= ? AND expiry_date IS NOT NULL'
  ).get(thirtyDaysAgo.toISOString()) as { count: number };

  const trendRows = db.prepare(`
    SELECT
      DATE(date) as day,
      SUM(CASE WHEN type = 'in' THEN quantity ELSE 0 END) as inbound,
      SUM(CASE WHEN type = 'out' THEN quantity ELSE 0 END) as outbound
    FROM inventory_transactions
    WHERE date >= ?
    GROUP BY DATE(date)
    ORDER BY day ASC
  `).all(thirtyDaysAgo.toISOString()) as { day: string; inbound: number; outbound: number }[];

  const trend = trendRows.map((row) => ({
    date: row.day,
    inbound: row.inbound || 0,
    outbound: row.outbound || 0,
  }));

  res.json({
    totalCategories: totalCategoriesRow.count,
    totalQuantity: totalQuantityRow.total,
    lowStockCount: lowStockCountRow.count,
    expiringCount: expiringCountRow.count,
    trend,
  });
});

router.get('/heatmap', (_req: Request, res: Response) => {
  const areas = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6'];

  const result = areas.map((area) => {
    const items = db.prepare(
      'SELECT id, name, category, quantity, safety_stock, max_capacity, status FROM inventory_items WHERE storage_area = ?'
    ).all(area) as { id: string; name: string; category: string; quantity: number; safety_stock: number; max_capacity: number; status: string }[];

    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
    const maxCapacity = items.reduce((sum, item) => sum + item.max_capacity, 0);

    return {
      area,
      totalQuantity,
      maxCapacity,
      itemCount: items.length,
      items,
    };
  });

  res.json(result);
});

router.get('/:id', (req: Request, res: Response) => {
  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json(item);
});

router.post('/', (req: Request, res: Response) => {
  const { name, category, quantity, storage_area, safety_stock, max_capacity, expiry_date } = req.body;
  const id = uuidv4();
  const now = new Date().toISOString();
  const qty = quantity ?? 0;
  const safety = safety_stock ?? 0;
  const status = computeStatus(qty, safety);

  db.prepare(`
    INSERT INTO inventory_items (id, name, category, quantity, storage_area, safety_stock, max_capacity, expiry_date, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, name, category, qty, storage_area, safety, max_capacity ?? 0, expiry_date ?? null, status, now, now);

  db.prepare(`
    INSERT INTO inventory_transactions (id, item_id, type, quantity, date, note)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(uuidv4(), id, 'in', qty, now, '新建入库');

  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(id);
  broadcastChange({ action: 'create', item });
  res.status(201).json(item);
});

router.put('/batch-status', (req: Request, res: Response) => {
  const { ids, status } = req.body;
  if (!ids || !Array.isArray(ids) || !status) {
    res.status(400).json({ error: 'ids array and status are required' });
    return;
  }

  const now = new Date().toISOString();
  const placeholders = ids.map(() => '?').join(',');
  db.prepare(`UPDATE inventory_items SET status = ?, updated_at = ? WHERE id IN (${placeholders})`).run(status, now, ...ids);

  broadcastChange({ action: 'batch-status', ids, status });
  res.json({ updated: ids.length });
});

router.put('/:id', (req: Request, res: Response) => {
  const existing = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id) as Record<string, unknown> | undefined;
  if (!existing) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }

  const { name, category, quantity, storage_area, safety_stock, max_capacity, expiry_date } = req.body;
  const now = new Date().toISOString();
  const qty = quantity ?? (existing.quantity as number);
  const safety = safety_stock ?? (existing.safety_stock as number);
  const status = computeStatus(qty, safety);

  db.prepare(`
    UPDATE inventory_items
    SET name = ?, category = ?, quantity = ?, storage_area = ?, safety_stock = ?, max_capacity = ?, expiry_date = ?, status = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name ?? existing.name,
    category ?? existing.category,
    qty,
    storage_area ?? existing.storage_area,
    safety,
    max_capacity ?? existing.max_capacity,
    expiry_date ?? existing.expiry_date,
    status,
    now,
    req.params.id
  );

  if (quantity !== undefined && quantity !== (existing.quantity as number)) {
    const diff = quantity - (existing.quantity as number);
    const txType = diff > 0 ? 'in' : 'out';
    db.prepare(`
      INSERT INTO inventory_transactions (id, item_id, type, quantity, date, note)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), req.params.id, txType, Math.abs(diff), now, '库存调整');
  }

  const item = db.prepare('SELECT * FROM inventory_items WHERE id = ?').get(req.params.id);
  broadcastChange({ action: 'update', item });
  res.json(item);
});

router.delete('/:id', (req: Request, res: Response) => {
  const { ids } = req.body || {};
  const deleteIds: string[] = ids || [req.params.id];

  if (deleteIds.length === 0) {
    res.status(400).json({ error: 'No items specified for deletion' });
    return;
  }

  const placeholders = deleteIds.map(() => '?').join(',');
  db.prepare(`DELETE FROM inventory_transactions WHERE item_id IN (${placeholders})`).run(...deleteIds);
  db.prepare(`DELETE FROM inventory_items WHERE id IN (${placeholders})`).run(...deleteIds);

  broadcastChange({ action: 'delete', ids: deleteIds });
  res.json({ deleted: deleteIds });
});

export const inventoryController = router;
