const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'exchange.db');

let db: any = null;

function snakeToCamel(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    result[camelKey] = obj[key];
  }
  return result;
}

function camelToSnake(obj: Record<string, any>): Record<string, any> {
  if (!obj || typeof obj !== 'object') return obj;
  const result: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
    result[snakeKey] = obj[key];
  }
  return result;
}

function saveDb() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function run(sql: string, params: any[] = []): void {
  db.run(sql, params);
  saveDb();
}

function get(sql: string, params: any[] = []): any {
  const results = db.exec(sql, params);
  if (results.length === 0) return undefined;
  const columns = results[0].columns;
  const values = results[0].values;
  if (values.length === 0) return undefined;
  const row: Record<string, any> = {};
  columns.forEach((col: string, idx: number) => {
    row[col] = values[0][idx];
  });
  return row;
}

function all(sql: string, params: any[] = []): any[] {
  const results = db.exec(sql, params);
  if (results.length === 0) return [];
  const columns = results[0].columns;
  const values = results[0].values;
  return values.map((row: any[]) => {
    const obj: Record<string, any> = {};
    columns.forEach((col: string, idx: number) => {
      obj[col] = row[idx];
    });
    return obj;
  });
}

function initializeDatabase() {
  return new Promise<void>(async (resolve, reject) => {
    try {
      const SQL = await initSqlJs();

      if (fs.existsSync(dbPath)) {
        const fileBuffer = fs.readFileSync(dbPath);
        db = new SQL.Database(fileBuffer);
      } else {
        db = new SQL.Database();
      }

      db.run(`
        CREATE TABLE IF NOT EXISTS items (
          id TEXT PRIMARY KEY,
          title TEXT NOT NULL,
          description TEXT NOT NULL,
          category TEXT NOT NULL,
          image_url TEXT NOT NULL,
          contact TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'available',
          owner_id TEXT NOT NULL,
          owner_name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_items_category ON items(category)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_items_owner ON items(owner_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_items_status ON items(status)`);

      db.run(`
        CREATE TABLE IF NOT EXISTS exchanges (
          id TEXT PRIMARY KEY,
          item_id TEXT NOT NULL,
          item_title TEXT NOT NULL,
          from_user_id TEXT NOT NULL,
          from_user_name TEXT NOT NULL,
          to_user_id TEXT NOT NULL,
          to_user_name TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending',
          message TEXT,
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          FOREIGN KEY (item_id) REFERENCES items(id)
        )
      `);

      db.run(`CREATE INDEX IF NOT EXISTS idx_exchanges_from_user ON exchanges(from_user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_exchanges_to_user ON exchanges(to_user_id)`);
      db.run(`CREATE INDEX IF NOT EXISTS idx_exchanges_item ON exchanges(item_id)`);

      saveDb();

      const countResult = db.exec('SELECT COUNT(*) as cnt FROM items');
      const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;

      if (count === 0) {
        const now = new Date().toISOString();
        const seedItems = [
          { title: '实木书桌', description: '9成新实木书桌，尺寸120x60cm，带抽屉，适合办公学习使用。', category: '家具', imageUrl: 'https://images.unsplash.com/photo-1518455027359-f3f8164ba6bd?w=800&h=600&fit=crop', contact: '13800138001', status: 'available', ownerId: 'user-001', ownerName: '张小明' },
          { title: '双人布艺沙发', description: '灰色布艺沙发，使用一年多，轻微使用痕迹，非常舒适。', category: '家具', imageUrl: 'https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=800&h=600&fit=crop', contact: '13800138002', status: 'available', ownerId: 'user-002', ownerName: '李小红' },
          { title: '原木餐桌椅套装', description: '北欧风原木餐桌+4把椅子，餐桌140x80cm，搬家转让。', category: '家具', imageUrl: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?w=800&h=600&fit=crop', contact: '13800138003', status: 'available', ownerId: 'user-003', ownerName: '王大伟' },
          { title: '小米空气净化器Pro', description: '米家空气净化器Pro，使用6个月，滤芯还剩80%，除甲醛雾霾效果好。', category: '电子产品', imageUrl: 'https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=800&h=600&fit=crop', contact: '13800138004', status: 'available', ownerId: 'user-001', ownerName: '张小明' },
          { title: 'Kindle Paperwhite电子书阅读器', description: 'Kindle Paperwhite第10代，8GB版本，屏幕有贴膜，带原装皮套。', category: '电子产品', imageUrl: 'https://images.unsplash.com/photo-1611532736597-de2d4265fba3?w=800&h=600&fit=crop', contact: '13800138005', status: 'available', ownerId: 'user-004', ownerName: '刘小华' },
          { title: '索尼WH-1000XM4降噪耳机', description: '索尼旗舰降噪耳机，黑色，音质优秀，降噪效果一流，配件齐全。', category: '电子产品', imageUrl: 'https://images.unsplash.com/photo-1546435770-a3e426bf472b?w=800&h=600&fit=crop', contact: '13800138006', status: 'available', ownerId: 'user-002', ownerName: '李小红' },
          { title: 'iPad Air 4 64GB WiFi版', description: 'iPad Air第四代，天蓝色，64GB WiFi版本，带Apple Pencil第二代。', category: '电子产品', imageUrl: 'https://images.unsplash.com/photo-1585790050230-5dd28404ccb9?w=800&h=600&fit=crop', contact: '13800138007', status: 'available', ownerId: 'user-005', ownerName: '陈小雨' },
          { title: '《三体》全集三册', description: '刘慈欣科幻巨著《三体》三部曲，全新未拆封，正版书籍。', category: '书籍', imageUrl: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?w=800&h=600&fit=crop', contact: '13800138008', status: 'available', ownerId: 'user-003', ownerName: '王大伟' },
          { title: '《人类简史》精装版', description: '尤瓦尔·赫拉利经典著作，精装版，9成新，有少量笔记。', category: '书籍', imageUrl: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&h=600&fit=crop', contact: '13800138009', status: 'available', ownerId: 'user-004', ownerName: '刘小华' },
          { title: '编程书籍打包5本', description: '《JavaScript高级程序设计》《CSS权威指南》《深入浅出React》等5本技术书籍。', category: '书籍', imageUrl: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=800&h=600&fit=crop', contact: '13800138010', status: 'available', ownerId: 'user-001', ownerName: '张小明' },
          { title: '优衣库羽绒服男款L码', description: '优衣库轻薄羽绒服，黑色L码，穿过两次，几乎全新，保暖性好。', category: '衣物', imageUrl: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?w=800&h=600&fit=crop', contact: '13800138011', status: 'available', ownerId: 'user-005', ownerName: '陈小雨' },
          { title: 'Nike Air Max运动鞋', description: 'Nike Air Max 90经典款，白色，42码，9成新，只穿过几次。', category: '衣物', imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=800&h=600&fit=crop', contact: '13800138012', status: 'available', ownerId: 'user-002', ownerName: '李小红' },
          { title: '羊毛围巾+手套套装', description: '100%羊毛围巾+羊毛手套套装，灰色，保暖舒适，冬季必备。', category: '衣物', imageUrl: 'https://images.unsplash.com/photo-1520903920243-00d872a2d1c9?w=800&h=600&fit=crop', contact: '13800138013', status: 'available', ownerId: 'user-003', ownerName: '王大伟' },
          { title: '德国双立人刀具套装', description: '双立人厨房刀具5件套，包含菜刀、水果刀、剪刀等，使用半年。', category: '厨具', imageUrl: 'https://images.unsplash.com/photo-1593618998160-e34014e67546?w=800&h=600&fit=crop', contact: '13800138014', status: 'available', ownerId: 'user-004', ownerName: '刘小华' },
          { title: '苏泊尔电压力锅5L', description: '苏泊尔智能电压力锅，5L容量，适合3-6人使用，功能完好。', category: '厨具', imageUrl: 'https://images.unsplash.com/photo-1585515320310-259814833e62?w=800&h=600&fit=crop', contact: '13800138015', status: 'available', ownerId: 'user-001', ownerName: '张小明' },
          { title: '日式陶瓷餐具套装', description: '精美日式陶瓷餐具套装，碗碟盘共20件，全新未使用过。', category: '厨具', imageUrl: 'https://images.unsplash.com/photo-1603199506016-b9a594b593c0?w=800&h=600&fit=crop', contact: '13800138016', status: 'available', ownerId: 'user-005', ownerName: '陈小雨' },
          { title: '瑜伽垫+瑜伽砖套装', description: '加厚TPE瑜伽垫（10mm）+2块瑜伽砖，防滑环保，适合初学者。', category: '运动器材', imageUrl: 'https://images.unsplash.com/photo-1601925260368-ae2f83cf8b7f?w=800&h=600&fit=crop', contact: '13800138017', status: 'available', ownerId: 'user-002', ownerName: '李小红' },
          { title: '捷安特山地自行车', description: '捷安特ATX系列山地车，26寸，21速，骑行顺畅，适合通勤和周末骑行。', category: '运动器材', imageUrl: 'https://images.unsplash.com/photo-1576435728678-68d0fbf94e91?w=800&h=600&fit=crop', contact: '13800138018', status: 'available', ownerId: 'user-003', ownerName: '王大伟' },
          { title: '哑铃套装可调节重量', description: '可调节哑铃套装，单只5-25kg可调节，带连接杆可做杠铃，家庭健身必备。', category: '运动器材', imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&h=600&fit=crop', contact: '13800138019', status: 'available', ownerId: 'user-004', ownerName: '刘小华' },
          { title: '迪卡侬户外帐篷3-4人', description: '迪卡侬全自动帐篷，3-4人使用，防水防风，露营装备齐全。', category: '运动器材', imageUrl: 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&h=600&fit=crop', contact: '13800138020', status: 'available', ownerId: 'user-005', ownerName: '陈小雨' },
          { title: '北欧台灯LED护眼灯', description: '简约北欧风格台灯，三档亮度调节，LED护眼，适合学习办公。', category: '家具', imageUrl: 'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?w=800&h=600&fit=crop', contact: '13800138021', status: 'available', ownerId: 'user-001', ownerName: '张小明' },
          { title: '戴森吹风机HD08', description: '戴森Supersonic吹风机HD08，紫红色，配件齐全，9成新。', category: '电子产品', imageUrl: 'https://images.unsplash.com/photo-1522338140262-f46f5913618a?w=800&h=600&fit=crop', contact: '13800138022', status: 'available', ownerId: 'user-002', ownerName: '李小红' },
        ];

        const stmt = db.prepare(`
          INSERT INTO items (id, title, description, category, image_url, contact, status, owner_id, owner_name, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);

        for (const item of seedItems) {
          const snakeItem = camelToSnake(item);
          stmt.run([
            uuidv4(),
            snakeItem.title,
            snakeItem.description,
            snakeItem.category,
            snakeItem.image_url,
            snakeItem.contact,
            snakeItem.status,
            snakeItem.owner_id,
            snakeItem.owner_name,
            now,
            now
          ]);
        }
        stmt.free();

        saveDb();
        console.log(`已插入 ${seedItems.length} 条种子数据`);
      }

      console.log('数据库初始化完成');
      resolve();
    } catch (err) {
      reject(err);
    }
  });
}

module.exports = {
  initializeDatabase,
  run,
  get,
  all,
  saveDb,
  snakeToCamel,
  camelToSnake,
  getDb: () => db
};
