import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'market.db');

let db = null;

function rowToProduct(row) {
  return {
    id: row[0],
    name: row[1],
    category: row[2],
    price: row[3],
    stock: row[4],
    unit: row[5],
    vendorId: row[6],
    vendorName: row[7],
    createdAt: row[8],
  };
}

function rowToVendor(row) {
  return {
    id: row[0],
    name: row[1],
    role: row[2],
    createdAt: row[3],
  };
}

export async function initDB() {
  const SQL = await initSqlJs();

  let existingData = null;
  if (fs.existsSync(DB_FILE)) {
    existingData = fs.readFileSync(DB_FILE);
  }

  db = existingData ? new SQL.Database(existingData) : new SQL.Database();

  db.run(`
    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'vendor',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      unit TEXT NOT NULL DEFAULT '斤',
      vendor_id TEXT NOT NULL,
      vendor_name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS list_items (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL,
      quantity INTEGER NOT NULL DEFAULT 1,
      session_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);

  db.run(`CREATE INDEX IF NOT EXISTS idx_products_category ON products(category)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON products(vendor_id)`);
  db.run(`CREATE INDEX IF NOT EXISTS idx_products_created_at ON products(created_at)`);

  const vendorResult = db.exec('SELECT COUNT(*) as cnt FROM vendors');
  if (vendorResult.length === 0 || vendorResult[0].values[0][0] === 0) {
    seedData();
  }

  saveDB();
  return db;
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

function seedData() {
  const vendor1Id = uuidv4();
  const vendor2Id = uuidv4();
  const vendor3Id = uuidv4();
  const vendor4Id = uuidv4();
  const adminId = uuidv4();

  db.run(
    'INSERT INTO vendors (id, name, password, role) VALUES (?, ?, ?, ?)',
    [vendor1Id, '绿源蔬菜摊', '123456', 'vendor']
  );
  db.run(
    'INSERT INTO vendors (id, name, password, role) VALUES (?, ?, ?, ?)',
    [vendor2Id, '鲜果时光', '123456', 'vendor']
  );
  db.run(
    'INSERT INTO vendors (id, name, password, role) VALUES (?, ?, ?, ?)',
    [vendor3Id, '海鲜达人', '123456', 'vendor']
  );
  db.run(
    'INSERT INTO vendors (id, name, password, role) VALUES (?, ?, ?, ?)',
    [vendor4Id, '老铺肉食', '123456', 'vendor']
  );
  db.run(
    'INSERT INTO vendors (id, name, password, role) VALUES (?, ?, ?, ?)',
    [adminId, '管理员', 'admin123', 'admin']
  );

  const products = [
    ['有机西红柿', 'vegetable', 4.5, 50, '斤', vendor1Id, '绿源蔬菜摊'],
    ['新鲜黄瓜', 'vegetable', 3.2, 80, '斤', vendor1Id, '绿源蔬菜摊'],
    ['紫皮茄子', 'vegetable', 5.0, 30, '斤', vendor1Id, '绿源蔬菜摊'],
    ['小青菜', 'vegetable', 2.8, 100, '把', vendor1Id, '绿源蔬菜摊'],
    ['彩椒组合', 'vegetable', 8.5, 25, '斤', vendor1Id, '绿源蔬菜摊'],
    ['红富士苹果', 'fruit', 6.8, 120, '斤', vendor2Id, '鲜果时光'],
    ['海南香蕉', 'fruit', 4.2, 90, '斤', vendor2Id, '鲜果时光'],
    ['巨峰葡萄', 'fruit', 12.0, 40, '斤', vendor2Id, '鲜果时光'],
    ['水蜜桃', 'fruit', 9.5, 60, '斤', vendor2Id, '鲜果时光'],
    ['新鲜橙子', 'fruit', 5.5, 75, '个', vendor2Id, '鲜果时光'],
    ['活虾', 'seafood', 38.0, 20, '斤', vendor3Id, '海鲜达人'],
    ['鲈鱼', 'seafood', 28.0, 15, '斤', vendor3Id, '海鲜达人'],
    ['生蚝', 'seafood', 3.5, 200, '个', vendor3Id, '海鲜达人'],
    ['大闸蟹', 'seafood', 15.0, 50, '个', vendor3Id, '海鲜达人'],
    ['花甲', 'seafood', 8.0, 60, '斤', vendor3Id, '海鲜达人'],
    ['土猪五花肉', 'meat', 22.0, 35, '斤', vendor4Id, '老铺肉食'],
    ['牛腱子肉', 'meat', 45.0, 20, '斤', vendor4Id, '老铺肉食'],
    ['柴鸡', 'meat', 35.0, 15, '只', vendor4Id, '老铺肉食'],
    ['精选排骨', 'meat', 28.0, 25, '斤', vendor4Id, '老铺肉食'],
    ['东北黑木耳', 'drygoods', 65.0, 30, '斤', vendor1Id, '绿源蔬菜摊'],
    ['宁夏枸杞', 'drygoods', 48.0, 40, '斤', vendor1Id, '绿源蔬菜摊'],
    ['新疆红枣', 'drygoods', 25.0, 55, '斤', vendor2Id, '鲜果时光'],
  ];

  const now = new Date();
  products.forEach((p, i) => {
    const id = uuidv4();
    const offset = Math.floor(Math.random() * 5);
    const date = new Date(now.getTime() - offset * 24 * 60 * 60 * 1000 + i * 60 * 60 * 1000);
    db.run(
      `INSERT INTO products (id, name, category, price, stock, unit, vendor_id, vendor_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [id, p[0], p[1], p[2], p[3], p[4], p[5], p[6], date.toISOString()]
    );
  });
}

export function getDB() {
  return db;
}

export const productQueries = {
  getAll(category) {
    let sql = 'SELECT id, name, category, price, stock, unit, vendor_id, vendor_name, created_at FROM products ORDER BY created_at DESC';
    let params = [];
    if (category) {
      sql = 'SELECT id, name, category, price, stock, unit, vendor_id, vendor_name, created_at FROM products WHERE category = ? ORDER BY created_at DESC';
      params = [category];
    }
    const result = db.exec(sql, params);
    if (result.length === 0) return [];
    return result[0].values.map(rowToProduct);
  },

  getByVendor(vendorId) {
    const result = db.exec(
      'SELECT id, name, category, price, stock, unit, vendor_id, vendor_name, created_at FROM products WHERE vendor_id = ? ORDER BY created_at DESC',
      [vendorId]
    );
    if (result.length === 0) return [];
    return result[0].values.map(rowToProduct);
  },

  getById(id) {
    const result = db.exec(
      'SELECT id, name, category, price, stock, unit, vendor_id, vendor_name, created_at FROM products WHERE id = ?',
      [id]
    );
    if (result.length === 0 || result[0].values.length === 0) return null;
    return rowToProduct(result[0].values[0]);
  },

  create(data) {
    const id = uuidv4();
    db.run(
      `INSERT INTO products (id, name, category, price, stock, unit, vendor_id, vendor_name, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
      [id, data.name, data.category, data.price, data.stock, data.unit, data.vendorId, data.vendorName]
    );
    saveDB();
    return productQueries.getById(id);
  },

  update(id, data) {
    const fields = [];
    const params = [];
    if (data.name !== undefined) { fields.push('name = ?'); params.push(data.name); }
    if (data.category !== undefined) { fields.push('category = ?'); params.push(data.category); }
    if (data.price !== undefined) { fields.push('price = ?'); params.push(data.price); }
    if (data.stock !== undefined) { fields.push('stock = ?'); params.push(data.stock); }
    if (data.unit !== undefined) { fields.push('unit = ?'); params.push(data.unit); }
    params.push(id);
    db.run(`UPDATE products SET ${fields.join(', ')} WHERE id = ?`, params);
    saveDB();
    return productQueries.getById(id);
  },

  remove(id) {
    db.run('DELETE FROM products WHERE id = ?', [id]);
    saveDB();
    return true;
  },
};

export const vendorQueries = {
  getAll() {
    const result = db.exec('SELECT id, name, role, created_at FROM vendors');
    if (result.length === 0) return [];
    return result[0].values.map(rowToVendor);
  },

  getById(id) {
    const result = db.exec('SELECT id, name, role, created_at FROM vendors WHERE id = ?', [id]);
    if (result.length ===