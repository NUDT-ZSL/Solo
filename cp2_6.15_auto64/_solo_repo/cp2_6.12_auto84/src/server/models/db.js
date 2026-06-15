import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const db = new Database('tools.db');

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    avatar_url TEXT,
    credit_score INTEGER DEFAULT 70,
    credit_level TEXT DEFAULT '良好',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tools (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('园艺', '维修', '清洁', '户外')),
    image_url TEXT,
    description TEXT,
    status TEXT NOT NULL DEFAULT '可用' CHECK (status IN ('可用', '已借出', '维修中')),
    owner_id TEXT NOT NULL,
    available_from TEXT,
    available_to TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (owner_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    tool_id TEXT NOT NULL,
    borrower_id TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    purpose TEXT,
    status TEXT NOT NULL DEFAULT '待确认' CHECK (status IN ('待确认', '进行中', '已归还', '已逾期')),
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    returned_at TEXT,
    FOREIGN KEY (tool_id) REFERENCES tools(id),
    FOREIGN KEY (borrower_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS ratings (
    id TEXT PRIMARY KEY,
    reservation_id TEXT NOT NULL,
    from_user_id TEXT NOT NULL,
    to_user_id TEXT NOT NULL,
    score INTEGER NOT NULL CHECK (score BETWEEN 1 AND 5),
    comment TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reservation_id) REFERENCES reservations(id),
    FOREIGN KEY (from_user_id) REFERENCES users(id),
    FOREIGN KEY (to_user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tools_category ON tools(category);
  CREATE INDEX IF NOT EXISTS idx_tools_status ON tools(status);
  CREATE INDEX IF NOT EXISTS idx_tools_owner ON tools(owner_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_tool ON reservations(tool_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_borrower ON reservations(borrower_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
  CREATE INDEX IF NOT EXISTS idx_ratings_to_user ON ratings(to_user_id);
  CREATE INDEX IF NOT EXISTS idx_ratings_from_user ON ratings(from_user_id);
`);

const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
if (userCount === 0) {
  const userId1 = uuidv4();
  const userId2 = uuidv4();

  const insertUser = db.prepare(`
    INSERT INTO users (id, username, avatar_url, credit_score, credit_level)
    VALUES (?, ?, ?, ?, ?)
  `);
  insertUser.run(userId1, '张小明', 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangxiaoming', 85, '优秀');
  insertUser.run(userId2, '李华', 'https://api.dicebear.com/7.x/avataaars/svg?seed=lihua', 72, '良好');

  const toolIds = [uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4(), uuidv4()];
  const insertTool = db.prepare(`
    INSERT INTO tools (id, name, category, image_url, description, status, owner_id, available_from, available_to)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  insertTool.run(toolIds[0], '电动割草机', '园艺', 'https://images.unsplash.com/photo-1581092160562-40aa08e78837?w=400', '高效电动割草机，适合小型花园使用', '可用', userId1, '09:00', '18:00');
  insertTool.run(toolIds[1], '工具箱套装', '维修', 'https://images.unsplash.com/photo-1504148455328-c376907d081c?w=400', '包含扳手、螺丝刀、钳子等常用工具', '可用', userId1, '08:00', '20:00');
  insertTool.run(toolIds[2], '高压洗车机', '清洁', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400', '150Bar高压水枪，轻松清洗车辆和庭院', '已借出', userId2, '10:00', '17:00');
  insertTool.run(toolIds[3], '帐篷(4人)', '户外', 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=400', '防水4人帐篷，适合家庭露营', '可用', userId2, '00:00', '23:59');
  insertTool.run(toolIds[4], '修枝剪刀', '园艺', 'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=400', '专业园林修枝剪，省力设计', '维修中', userId1, '09:00', '18:00');
  insertTool.run(toolIds[5], '吸尘器', '清洁', 'https://images.unsplash.com/photo-1558317374-067fb5f30001?w=400', '大功率手持吸尘器，适合深度清洁', '可用', userId2, '09:00', '19:00');

  const reservationIds = [uuidv4(), uuidv4(), uuidv4()];
  const insertReservation = db.prepare(`
    INSERT INTO reservations (id, tool_id, borrower_id, start_date, end_date, purpose, status)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  insertReservation.run(reservationIds[0], toolIds[2], userId1, '2026-06-10', '2026-06-12', '清洗自家车辆', '进行中');
  insertReservation.run(reservationIds[1], toolIds[0], userId2, '2026-06-05', '2026-06-07', '修剪花园草坪', '已归还');
  insertReservation.run(reservationIds[2], toolIds[1], userId2, '2026-06-01', '2026-06-03', '修理家里的椅子', '已归还');

  const insertRating = db.prepare(`
    INSERT INTO ratings (id, reservation_id, from_user_id, to_user_id, score, comment)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertRating.run(uuidv4(), reservationIds[1], userId2, userId1, 5, '割草机性能很好，张先生也很热情！');
  insertRating.run(uuidv4(), reservationIds[2], userId2, userId1, 4, '工具箱很齐全，使用方便。');
}

export default db;
