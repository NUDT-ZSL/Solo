import sqlite3 from 'sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

sqlite3.verbose();
const dbPath = path.join(__dirname, 'workshop.db');
const db = new sqlite3.Database(dbPath);

export interface Work {
  id: string;
  name: string;
  description: string;
  price: number;
  category: '钱包' | '皮带' | '背包' | '小物';
  image: string;
  stock: number;
  created_at: string;
}

export interface Order {
  id: string;
  customer_name: string;
  phone: string;
  items: string;
  total_price: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed';
  created_at: string;
}

export interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  price: number;
  image: string;
}

export interface CourseSlot {
  id: string;
  course_id: string;
  date: string;
  time: string;
  max_capacity: number;
  booked_count: number;
}

export interface Booking {
  id: string;
  slot_id: string;
  course_id: string;
  customer_name: string;
  phone: string;
  status: 'booked' | 'cancelled';
  created_at: string;
}

const run = (sql: string, params: unknown[] = []): Promise<sqlite3.RunResult> => {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
};

const get = <T>(sql: string, params: unknown[] = [] ): Promise<T | undefined> => {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row as T | undefined);
    });
  });
};

const all = <T>(sql: string, params: unknown[] = []): Promise<T[]> => {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows as T[]);
    });
  });
};

const exec = (sql: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.exec(sql, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
};

export const initTables = async () => {
  await exec(`
    CREATE TABLE IF NOT EXISTS works (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      category TEXT NOT NULL CHECK(category IN ('钱包', '皮带', '背包', '小物')),
      image TEXT NOT NULL,
      stock INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id TEXT PRIMARY KEY,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      items TEXT NOT NULL,
      total_price REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'paid', 'shipped', 'completed')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS courses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      duration TEXT NOT NULL,
      price REAL NOT NULL,
      image TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS course_slots (
      id TEXT PRIMARY KEY,
      course_id TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      max_capacity INTEGER NOT NULL DEFAULT 6,
      booked_count INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      slot_id TEXT NOT NULL,
      course_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'booked' CHECK(status IN ('booked', 'cancelled')),
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (slot_id) REFERENCES course_slots(id) ON DELETE CASCADE,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);
  await exec('PRAGMA foreign_keys = ON');
};

export const seedData = async () => {
  const workResult = await get<{ count: number }>('SELECT COUNT(*) as count FROM works');
  if (!workResult || workResult.count === 0) {
    const works = [
      { id: 'w1', name: '复古皮革钱包', description: '头层牛皮手工缝制，多卡位设计', price: 298, category: '钱包' as const, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', stock: 15 },
      { id: 'w2', name: '经典长款钱夹', description: '意大利植鞣皮，复古做旧风格', price: 388, category: '钱包' as const, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', stock: 12 },
      { id: 'w3', name: '商务真皮皮带', description: '头层牛皮自动扣，可调节长度', price: 258, category: '皮带' as const, image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400', stock: 20 },
      { id: 'w4', name: '复古针扣皮带', description: '黄铜扣头，疯马皮材质', price: 198, category: '皮带' as const, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', stock: 18 },
      { id: 'w5', name: '手工双肩背包', description: '头层牛皮大容量，复古军旅风', price: 1288, category: '背包' as const, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', stock: 8 },
      { id: 'w6', name: '通勤单肩包', description: '植鞣皮简约设计，适合日常通勤', price: 688, category: '背包' as const, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', stock: 10 },
      { id: 'w7', name: '皮革钥匙扣', description: '纯手工制作，小巧精致', price: 58, category: '小物' as const, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', stock: 50 },
      { id: 'w8', name: '皮质书签套装', description: '头层牛皮，3枚装礼盒', price: 88, category: '小物' as const, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400', stock: 30 },
      { id: 'w9', name: '编织短款钱包', description: '手工编织皮绳，个性十足', price: 328, category: '钱包' as const, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', stock: 10 },
      { id: 'w10', name: '宽版装饰皮带', description: '复古雕花设计，搭配裙装优选', price: 168, category: '皮带' as const, image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400', stock: 15 },
      { id: 'w11', name: '邮差斜挎包', description: '经典邮差包型，可单肩可斜挎', price: 788, category: '背包' as const, image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=400', stock: 6 },
      { id: 'w12', name: '皮革卡包', description: '超薄设计，多卡位收纳', price: 128, category: '小物' as const, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400', stock: 25 },
    ];

    for (const w of works) {
      await run(
        'INSERT INTO works (id, name, description, price, category, image, stock) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [w.id, w.name, w.description, w.price, w.category, w.image, w.stock]
      );
    }
  }

  const courseResult = await get<{ count: number }>('SELECT COUNT(*) as count FROM courses');
  if (!courseResult || courseResult.count === 0) {
    const courses: Omit<Course, never>[] = [
      { id: 'c1', name: '皮具入门体验课', description: '零基础入门，学习基础皮艺工具使用和简单缝制技巧，完成一个小作品', duration: '2小时', price: 198, image: 'https://images.unsplash.com/photo-1627123424574-724758594e93?w=400' },
      { id: 'c2', name: '钱包制作进阶课', description: '学习版型设计、边缘处理和高级缝制技巧，完成一个长款钱包', duration: '4小时', price: 498, image: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400' },
      { id: 'c3', name: '皮带定制工坊', description: '学习裁切、封边、打孔等核心工艺，定制专属皮带', duration: '3小时', price: 358, image: 'https://images.unsplash.com/photo-1624222247344-550fb60583dc?w=400' },
    ];

    for (const c of courses) {
      await run(
        'INSERT INTO courses (id, name, description, duration, price, image) VALUES (?, ?, ?, ?, ?, ?)',
        [c.id, c.name, c.description, c.duration, c.price, c.image]
      );
    }

    const today = new Date();
    const slots: Omit<CourseSlot, 'id'>[] = [];
    const timeSlots = ['10:00', '14:00', '16:00'];
    
    for (let i = 1; i <= 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      if (date.getDay() !== 1 && date.getDay() !== 2) {
        for (const course of courses) {
          for (const time of timeSlots) {
            if (Math.random() > 0.3) {
              slots.push({
                course_id: course.id,
                date: dateStr,
                time,
                max_capacity: 6,
                booked_count: Math.floor(Math.random() * 4)
              });
            }
          }
        }
      }
    }

    for (let idx = 0; idx < slots.length; idx++) {
      const slot = slots[idx];
      await run(
        'INSERT INTO course_slots (id, course_id, date, time, max_capacity, booked_count) VALUES (?, ?, ?, ?, ?, ?)',
        [`slot_${idx + 1}`, slot.course_id, slot.date, slot.time, slot.max_capacity, slot.booked_count]
      );
    }
  }
};

export const initializeDatabase = async () => {
  await initTables();
  await seedData();
};

export const getWorks = async (page: number = 1, pageSize: number = 8, category?: string) => {
  const offset = (page - 1) * pageSize;
  let whereClause = '';
  const params: (string | number)[] = [];

  if (category && category !== '全部') {
    whereClause = 'WHERE category = ?';
    params.push(category);
  }

  const works = await all<Work>(
    `SELECT * FROM works ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset]
  );

  const totalResult = await get<{ count: number }>(
    `SELECT COUNT(*) as count FROM works ${whereClause}`,
    params
  );

  return { works, total: totalResult?.count || 0, page, pageSize };
};

export const getWorkById = async (id: string) => {
  return await get<Work>('SELECT * FROM works WHERE id = ?', [id]);
};

export const createOrder = async (order: Omit<Order, 'id' | 'created_at'>) => {
  const id = uuidv4();
  await run(
    'INSERT INTO orders (id, customer_name, phone, items, total_price, status) VALUES (?, ?, ?, ?, ?, ?)',
    [id, order.customer_name, order.phone, order.items, order.total_price, order.status]
  );
  return { id, ...order };
};

export const getCourses = async () => {
  return await all<Course>('SELECT * FROM courses');
};

export const getCourseSlots = async (courseId: string, date?: string) => {
  let whereClause = 'WHERE course_id = ?';
  const params: string[] = [courseId];
  
  if (date) {
    whereClause += ' AND date = ?';
    params.push(date);
  }

  return await all<CourseSlot>(
    `SELECT * FROM course_slots ${whereClause} ORDER BY date, time`,
    params
  );
};

export const getSlotsByDate = async (date: string) => {
  return await all<{ date: string; course_id: string }>(
    'SELECT DISTINCT date, course_id FROM course_slots WHERE date = ? AND booked_count < max_capacity',
    [date]
  );
};

export const createBooking = async (booking: Omit<Booking, 'id' | 'created_at' | 'status'>) => {
  const id = uuidv4();
  
  const slot = await get<CourseSlot>('SELECT * FROM course_slots WHERE id = ?', [booking.slot_id]);
  if (!slot) throw new Error('时段不存在');
  if (slot.booked_count >= slot.max_capacity) throw new Error('该时段已满');

  await run('BEGIN TRANSACTION');
  try {
    await run(
      'INSERT INTO bookings (id, slot_id, course_id, customer_name, phone, status) VALUES (?, ?, ?, ?, ?, \'booked\')',
      [id, booking.slot_id, booking.course_id, booking.customer_name, booking.phone]
    );
    await run('UPDATE course_slots SET booked_count = booked_count + 1 WHERE id = ?', [booking.slot_id]);
    await run('COMMIT');
  } catch (err) {
    await run('ROLLBACK');
    throw err;
  }

  return { id, ...booking, status: 'booked' as const };
};

export default db;
