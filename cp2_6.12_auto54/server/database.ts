import Database from 'better-sqlite3';
import type { Database as DatabaseType } from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db: DatabaseType = new Database('./market.db');

export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  createdAt: string;
}

export interface SaleRecord {
  id: string;
  total: number;
  timestamp: string;
  items: SaleItem[];
}

export interface SaleItem {
  id: string;
  saleId: string;
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  price: number;
  subtotal: number;
}

export function initDatabase(): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      price REAL NOT NULL,
      stock INTEGER NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      total REAL NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL,
      product_id TEXT NOT NULL,
      product_name TEXT NOT NULL,
      category TEXT NOT NULL,
      quantity INTEGER NOT NULL,
      price REAL NOT NULL,
      subtotal REAL NOT NULL,
      FOREIGN KEY (sale_id) REFERENCES sales(id)
    );

    CREATE INDEX IF NOT EXISTS idx_sales_timestamp ON sales(timestamp);
    CREATE INDEX IF NOT EXISTS idx_sale_items_sale_id ON sale_items(sale_id);
    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
  `);
}

export function seedData(): void {
  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get() as { count: number };
  
  if (productCount.count === 0) {
    const products: Omit<Product, 'id' | 'createdAt'>[] = [
      { name: '银质耳环', category: '首饰', price: 128, stock: 45 },
      { name: '珍珠项链', category: '首饰', price: 298, stock: 30 },
      { name: '手工茶杯', category: '陶艺', price: 88, stock: 60 },
      { name: '陶瓷花瓶', category: '陶艺', price: 258, stock: 25 },
      { name: '棉麻围巾', category: '布艺', price: 68, stock: 80 },
      { name: '刺绣帆布袋', category: '布艺', price: 58, stock: 100 },
      { name: '木质书签', category: '木工', price: 28, stock: 90 },
      { name: '胡桃木手机支架', category: '木工', price: 168, stock: 35 },
      { name: '原创明信片', category: '插画', price: 38, stock: 75 },
      { name: '手绘海报', category: '插画', price: 128, stock: 40 },
    ];

    const insertProduct = db.prepare(
      'INSERT INTO products (id, name, category, price, stock, created_at) VALUES (?, ?, ?, ?, ?, ?)'
    );

    const now = new Date().toISOString();
    for (const product of products) {
      insertProduct.run(uuidv4(), product.name, product.category, product.price, product.stock, now);
    }
  }

  const saleCount = db.prepare('SELECT COUNT(*) as count FROM sales').get() as { count: number };
  
  if (saleCount.count === 0) {
    const allProducts = db.prepare('SELECT * FROM products').all() as Product[];
    const insertSale = db.prepare(
      'INSERT INTO sales (id, total, timestamp) VALUES (?, ?, ?)'
    );
    const insertSaleItem = db.prepare(
      'INSERT INTO sale_items (id, sale_id, product_id, product_name, category, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    );

    const now = Date.now();
    const twentyFourHoursAgo = now - 24 * 60 * 60 * 1000;

    for (let i = 0; i < 50; i++) {
      const timestamp = new Date(twentyFourHoursAgo + Math.random() * (now - twentyFourHoursAgo)).toISOString();
      const itemCount = Math.floor(Math.random() * 3) + 1;
      const items: { productId: string; quantity: number; price: number }[] = [];
      let total = 0;

      for (let j = 0; j < itemCount; j++) {
        const product = allProducts[Math.floor(Math.random() * allProducts.length)];
        const quantity = Math.floor(Math.random() * 3) + 1;
        const price = product.price;
        const subtotal = quantity * price;
        total += subtotal;
        items.push({ productId: product.id, quantity, price });
      }

      const saleId = uuidv4();
      insertSale.run(saleId, total, timestamp);

      for (const item of items) {
        const product = allProducts.find(p => p.id === item.productId)!;
        insertSaleItem.run(
          uuidv4(),
          saleId,
          item.productId,
          product.name,
          product.category,
          item.quantity,
          item.price,
          item.quantity * item.price
        );
      }
    }
  }
}

export function getProducts(): Product[] {
  const rows = db.prepare('SELECT * FROM products ORDER BY created_at DESC').all() as any[];
  return rows.map(row => ({
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    stock: row.stock,
    createdAt: row.created_at
  }));
}

export function getProductById(id: string): Product | undefined {
  const row = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!row) return undefined;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    price: row.price,
    stock: row.stock,
    createdAt: row.created_at
  };
}

export function createProduct(data: Omit<Product, 'id' | 'createdAt'>): Product {
  const id = uuidv4();
  const createdAt = new Date().toISOString();
  db.prepare(
    'INSERT INTO products (id, name, category, price, stock, created_at) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(id, data.name, data.category, data.price, data.stock, createdAt);
  return { id, ...data, createdAt };
}

export function updateProduct(
  id: string,
  data: Partial<Omit<Product, 'id' | 'createdAt'>>
): Product | undefined {
  const existing = getProductById(id);
  if (!existing) return undefined;

  const fields = Object.keys(data);
  if (fields.length === 0) return existing;

  const setClause = fields.map(f => `${f === 'createdAt' ? 'created_at' : f} = ?`).join(', ');
  const values = fields.map(f => data[f as keyof typeof data]);
  values.push(id);

  db.prepare(`UPDATE products SET ${setClause} WHERE id = ?`).run(...values);
  return getProductById(id);
}

export function deleteProduct(id: string): boolean {
  const result = db.prepare('DELETE FROM products WHERE id = ?').run(id);
  return result.changes > 0;
}

export function createSale(
  items: { productId: string; quantity: number; price: number }[],
  total: number
): SaleRecord {
  const saleId = uuidv4();
  const timestamp = new Date().toISOString();

  const insertSale = db.prepare(
    'INSERT INTO sales (id, total, timestamp) VALUES (?, ?, ?)'
  );
  const insertSaleItem = db.prepare(
    'INSERT INTO sale_items (id, sale_id, product_id, product_name, category, quantity, price, subtotal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  );

  const transaction = db.transaction(() => {
    insertSale.run(saleId, total, timestamp);
    
    const saleItems: SaleItem[] = [];
    for (const item of items) {
      const product = db.prepare('SELECT name, category FROM products WHERE id = ?').get(item.productId) as { name: string; category: string };
      if (!product) {
        throw new Error(`Product not found: ${item.productId}`);
      }
      
      const saleItemId = uuidv4();
      const subtotal = item.quantity * item.price;
      insertSaleItem.run(
        saleItemId,
        saleId,
        item.productId,
        product.name,
        product.category,
        item.quantity,
        item.price,
        subtotal
      );
      
      saleItems.push({
        id: saleItemId,
        saleId,
        productId: item.productId,
        productName: product.name,
        category: product.category,
        quantity: item.quantity,
        price: item.price,
        subtotal
      });
    }
    
    return { id: saleId, total, timestamp, items: saleItems };
  });

  return transaction();
}

export function getTodaySalesStats(): {
  totalSales: number;
  orderCount: number;
  topCategory: string;
  hourlySales: { hour: number; amount: number }[];
  categorySales: { category: string; amount: number }[];
} {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];

  const totals = db.prepare(`
    SELECT COALESCE(SUM(total), 0) as totalSales, COUNT(*) as orderCount
    FROM sales
    WHERE DATE(timestamp) = ?
  `).get(todayStr) as { totalSales: number; orderCount: number };

  const hourlySalesRaw = db.prepare(`
    SELECT CAST(strftime('%H', timestamp) as INTEGER) as hour,
           COALESCE(SUM(total), 0) as amount
    FROM sales
    WHERE DATE(timestamp) = ?
    GROUP BY strftime('%H', timestamp)
    ORDER BY hour
  `).all(todayStr) as { hour: number; amount: number }[];

  const hourlySales: { hour: number; amount: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const found = hourlySalesRaw.find(h => h.hour === i);
    hourlySales.push({ hour: i, amount: found ? found.amount : 0 });
  }

  const categorySales = db.prepare(`
    SELECT si.category, COALESCE(SUM(si.subtotal), 0) as amount
    FROM sale_items si
    JOIN sales s ON si.sale_id = s.id
    WHERE DATE(s.timestamp) = ?
    GROUP BY si.category
    ORDER BY amount DESC
  `).all(todayStr) as { category: string; amount: number }[];

  const topCategory = categorySales.length > 0 ? categorySales[0].category : '';

  return {
    totalSales: totals.totalSales,
    orderCount: totals.orderCount,
    topCategory,
    hourlySales,
    categorySales
  };
}

initDatabase();
seedData();

export { db };
