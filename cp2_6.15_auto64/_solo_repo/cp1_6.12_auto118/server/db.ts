import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database(path.join(__dirname, 'travel.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS plans (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    cities TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS members (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    name TEXT NOT NULL,
    avatar_color TEXT NOT NULL,
    is_online INTEGER DEFAULT 0,
    joined_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS schedules (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    date TEXT NOT NULL,
    time TEXT NOT NULL,
    location TEXT NOT NULL,
    activity TEXT NOT NULL,
    budget REAL NOT NULL DEFAULT 0,
    expense_type TEXT DEFAULT 'split',
    is_personal INTEGER DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    plan_id TEXT NOT NULL,
    member_id TEXT NOT NULL,
    schedule_id TEXT,
    amount REAL NOT NULL,
    description TEXT,
    expense_type TEXT NOT NULL DEFAULT 'split',
    split_type TEXT DEFAULT 'even',
    date TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plan_id) REFERENCES plans(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
  );
`);

export interface Plan {
  id: string;
  name: string;
  start_date: string;
  end_date: string;
  cities: string;
  invite_code: string;
  created_at: string;
}

export interface Member {
  id: string;
  plan_id: string;
  name: string;
  avatar_color: string;
  is_online: number;
  joined_at: string;
}

export interface Schedule {
  id: string;
  plan_id: string;
  member_id: string;
  date: string;
  time: string;
  location: string;
  activity: string;
  budget: number;
  expense_type: string;
  is_personal: number;
  created_at: string;
}

export interface Expense {
  id: string;
  plan_id: string;
  member_id: string;
  schedule_id?: string;
  amount: number;
  description?: string;
  expense_type: string;
  split_type: string;
  date: string;
  created_at: string;
}

function generateInviteCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export const dbQueries = {
  createPlan: db.prepare(`
    INSERT INTO plans (id, name, start_date, end_date, cities, invite_code)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  getPlanById: db.prepare(`
    SELECT * FROM plans WHERE id = ?
  `),

  getPlanByInviteCode: db.prepare(`
    SELECT * FROM plans WHERE invite_code = ?
  `),

  addMember: db.prepare(`
    INSERT INTO members (id, plan_id, name, avatar_color, is_online)
    VALUES (?, ?, ?, ?, 1)
  `),

  getMembersByPlanId: db.prepare(`
    SELECT * FROM members WHERE plan_id = ? ORDER BY joined_at
  `),

  getMemberById: db.prepare(`
    SELECT * FROM members WHERE id = ?
  `),

  updateMemberOnline: db.prepare(`
    UPDATE members SET is_online = ? WHERE id = ?
  `),

  addSchedule: db.prepare(`
    INSERT INTO schedules (id, plan_id, member_id, date, time, location, activity, budget, expense_type, is_personal)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  updateSchedule: db.prepare(`
    UPDATE schedules SET date = ?, time = ?, location = ?, activity = ?, budget = ?, expense_type = ?, is_personal = ?
    WHERE id = ? AND plan_id = ?
  `),

  deleteSchedule: db.prepare(`
    DELETE FROM schedules WHERE id = ? AND plan_id = ?
  `),

  getSchedulesByPlanId: db.prepare(`
    SELECT * FROM schedules WHERE plan_id = ? ORDER BY date, time
  `),

  getSchedulesByDate: db.prepare(`
    SELECT * FROM schedules WHERE plan_id = ? AND date = ? ORDER BY time
  `),

  addExpense: db.prepare(`
    INSERT INTO expenses (id, plan_id, member_id, schedule_id, amount, description, expense_type, split_type, date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  getExpensesByPlanId: db.prepare(`
    SELECT * FROM expenses WHERE plan_id = ? ORDER BY date
  `),

  getExpensesByDate: db.prepare(`
    SELECT * FROM expenses WHERE plan_id = ? AND date = ?
  `),

  getTotalBudgetByPlan: db.prepare(`
    SELECT COALESCE(SUM(budget), 0) as total FROM schedules WHERE plan_id = ?
  `),

  getDailyBudget: db.prepare(`
    SELECT date, COALESCE(SUM(budget), 0) as total
    FROM schedules
    WHERE plan_id = ?
    GROUP BY date
    ORDER BY date
  `),

  getMemberBudget: db.prepare(`
    SELECT m.id, m.name, m.avatar_color, COALESCE(SUM(s.budget), 0) as total
    FROM members m
    LEFT JOIN schedules s ON m.id = s.member_id
    WHERE m.plan_id = ?
    GROUP BY m.id
    ORDER BY total DESC
  `),

  generateInviteCode
};

export { db };
