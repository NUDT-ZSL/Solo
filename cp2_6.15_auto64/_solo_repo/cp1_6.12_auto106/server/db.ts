import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.join(__dirname, 'taskfleet.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');
db.pragma('foreign_keys = ON');

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  created_at: string;
}

export type TaskStatus = 'todo' | 'in_progress' | 'review' | 'done';

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignee_id: string | null;
  estimated_hours: number;
  due_date: string;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface TimeLog {
  id: string;
  task_id: string;
  user_id: string;
  log_date: string;
  hours: number;
  estimated_hours: number;
  overdue_status: number;
  created_at: string;
}

export interface MemberStats {
  user_id: string;
  user_name: string;
  avatar: string;
  color: string;
  total_tasks: number;
  completed_tasks: number;
  total_estimated_hours: number;
  overdue_tasks: number;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    color TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    status TEXT NOT NULL DEFAULT 'todo',
    assignee_id TEXT,
    estimated_hours INTEGER NOT NULL DEFAULT 4,
    due_date TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    completed_at TEXT,
    FOREIGN KEY (assignee_id) REFERENCES users(id) ON DELETE SET NULL
  );

  CREATE TABLE IF NOT EXISTS time_logs (
    id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    log_date TEXT NOT NULL,
    hours INTEGER NOT NULL DEFAULT 0,
    estimated_hours INTEGER NOT NULL DEFAULT 0,
    overdue_status INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assignee_id);
  CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
  CREATE INDEX IF NOT EXISTS idx_time_logs_user_date ON time_logs(user_id, log_date);
  CREATE INDEX IF NOT EXISTS idx_time_logs_task ON time_logs(task_id);
`);

function seedData() {
  const userCount = db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number };
  if (userCount.cnt > 0) return;

  const insertUser = db.prepare(
    'INSERT INTO users (id, name, avatar, color) VALUES (?, ?, ?, ?)'
  );
  const insertTask = db.prepare(
    `INSERT INTO tasks (id, title, description, status, assignee_id, estimated_hours, due_date)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  );
  const insertTimeLog = db.prepare(
    'INSERT INTO time_logs (id, task_id, user_id, log_date, hours, estimated_hours, overdue_status) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );

  const members = [
    { id: uuidv4(), name: '张伟', color: '#3b82f6' },
    { id: uuidv4(), name: '李娜', color: '#10b981' },
    { id: uuidv4(), name: '王强', color: '#f59e0b' },
    { id: uuidv4(), name: '赵敏', color: '#ef4444' },
    { id: uuidv4(), name: '刘洋', color: '#8b5cf6' },
  ];

  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split('T')[0];
  const addDays = (d: Date, n: number) => {
    const nd = new Date(d);
    nd.setDate(nd.getDate() + n);
    return nd;
  };

  const tx = db.transaction(() => {
    members.forEach((m) => {
      const avatar = m.name.charAt(0);
      insertUser.run(m.id, m.name, avatar, m.color);
    });

    const sampleTasks = [
      { title: '设计用户登录页面', desc: '包含登录、注册、忘记密码三种表单', status: 'done' as TaskStatus, days: -15, est: 8 },
      { title: '实现 REST API 接口', desc: '完成 CRUD 接口开发', status: 'done' as TaskStatus, days: -10, est: 16 },
      { title: '数据库表结构优化', desc: '添加索引，优化查询性能', status: 'done' as TaskStatus, days: -5, est: 6 },
      { title: '开发任务看板页面', desc: '实现拖拽功能和任务卡片', status: 'in_progress' as TaskStatus, days: -2, est: 20 },
      { title: '编写单元测试用例', desc: '核心逻辑覆盖率达到 80%', status: 'review' as TaskStatus, days: 2, est: 12 },
      { title: '移动端适配优化', desc: '响应式布局调整', status: 'todo' as TaskStatus, days: 5, est: 10 },
      { title: '统计报表功能', desc: '图表展示和数据导出', status: 'todo' as TaskStatus, days: 8, est: 15 },
      { title: '消息通知系统', desc: '站内信+邮件通知', status: 'todo' as TaskStatus, days: 12, est: 18 },
      { title: '代码审查流程建立', desc: '制定代码规范和PR模板', status: 'in_progress' as TaskStatus, days: -7, est: 4 },
      { title: '部署环境配置', desc: 'CI/CD 流水线搭建', status: 'review' as TaskStatus, days: -1, est: 8 },
      { title: '性能压测', desc: '接口响应时间和并发测试', status: 'todo' as TaskStatus, days: 15, est: 10 },
      { title: '文档撰写', desc: 'API文档、用户手册', status: 'todo' as TaskStatus, days: 20, est: 6 },
    ];

    sampleTasks.forEach((t, i) => {
      const taskId = uuidv4();
      const member = members[i % members.length];
      const due = fmtDate(addDays(today, t.days));
      insertTask.run(taskId, t.title, t.desc, t.status, member.id, t.est, due);

      const logDays = Math.min(Math.abs(t.days) + 3, 10);
      for (let j = 0; j < logDays; j++) {
        const logDate = fmtDate(addDays(today, t.days - (logDays - j)));
        if (logDate < fmtDate(today)) {
          const hours = Math.floor(Math.random() * 4) + 1;
          const isOverdue = logDate > due && t.status !== 'done' ? 1 : 0;
          insertTimeLog.run(uuidv4(), taskId, member.id, logDate, hours, t.est, isOverdue);
        }
      }
    });
  });

  tx();
  console.log('✅ 种子数据已初始化');
}

seedData();

// ========== Users ==========
export const getUsers = () => db.prepare('SELECT * FROM users ORDER BY created_at').all() as User[];
export const getUserById = (id: string) => db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;

// ========== Tasks ==========
export const getTasks = (options?: { status?: TaskStatus; assignee_id?: string }) => {
  let sql = 'SELECT * FROM tasks WHERE 1=1';
  const params: any[] = [];
  if (options?.status) {
    sql += ' AND status = ?';
    params.push(options.status);
  }
  if (options?.assignee_id) {
    sql += ' AND assignee_id = ?';
    params.push(options.assignee_id);
  }
  sql += ' ORDER BY created_at DESC';
  return db.prepare(sql).all(...params) as Task[];
};

export const getTaskById = (id: string) => db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Task | undefined;

export const createTask = (data: Omit<Task, 'id' | 'created_at' | 'updated_at' | 'completed_at'>) => {
  const id = uuidv4();
  const now = new Date().toISOString();
  const completedAt = data.status === 'done' ? now : null;
  db.prepare(
    `INSERT INTO tasks (id, title, description, status, assignee_id, estimated_hours, due_date, created_at, updated_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(id, data.title, data.description || '', data.status, data.assignee_id, data.estimated_hours, data.due_date, now, now, completedAt);
  return getTaskById(id)!;
};

export const updateTask = (id: string, data: Partial<Omit<Task, 'id' | 'created_at'>>) => {
  const task = getTaskById(id);
  if (!task) return undefined;
  const now = new Date().toISOString();
  const fields: string[] = ['updated_at = ?'];
  const params: any[] = [now];

  for (const key of Object.keys(data)) {
    if (key === 'updated_at' || key === 'created_at' || key === 'id') continue;
    fields.push(`${key} = ?`);
    params.push((data as any)[key]);
  }

  if (data.status === 'done' && !task.completed_at) {
    fields.push('completed_at = ?');
    params.push(now);
  } else if (data.status && data.status !== 'done' && task.completed_at) {
    fields.push('completed_at = ?');
    params.push(null);
  }

  params.push(id);
  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...params);
  return getTaskById(id);
};

export const deleteTask = (id: string) => db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

// ========== Time Logs ==========
export const getTimeLogs = (options?: { user_id?: string; from_date?: string; to_date?: string }) => {
  let sql = 'SELECT * FROM time_logs WHERE 1=1';
  const params: any[] = [];
  if (options?.user_id) {
    sql += ' AND user_id = ?';
    params.push(options.user_id);
  }
  if (options?.from_date) {
    sql += ' AND log_date >= ?';
    params.push(options.from_date);
  }
  if (options?.to_date) {
    sql += ' AND log_date <= ?';
    params.push(options.to_date);
  }
  sql += ' ORDER BY log_date DESC';
  return db.prepare(sql).all(...params) as TimeLog[];
};

export const getMemberStats = (range: '7d' | '30d' | 'all' = 'all'): MemberStats[] => {
  const today = new Date();
  const fmtDate = (d: Date) => d.toISOString().split('T')[0];
  let fromDate: string | null = null;

  if (range === '7d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 7);
    fromDate = fmtDate(d);
  } else if (range === '30d') {
    const d = new Date(today);
    d.setDate(d.getDate() - 30);
    fromDate = fmtDate(d);
  }

  const todayStr = fmtDate(today);

  const users = getUsers();
  const allTasks = getTasks();

  return users.map((u) => {
    const userTasks = allTasks.filter((t) => t.assignee_id === u.id);
    const filteredTasks = fromDate
      ? userTasks.filter((t) => t.created_at >= fromDate || (t.completed_at && t.completed_at >= fromDate))
      : userTasks;

    const totalTasks = filteredTasks.length;
    const completedTasks = filteredTasks.filter((t) => t.status === 'done').length;
    const totalEstimatedHours = filteredTasks.reduce((sum, t) => sum + (t.estimated_hours || 0), 0);

    const overdueTasks = filteredTasks.filter((t) => {
      if (t.status === 'done') return false;
      if (!t.due_date) return false;
      return t.due_date < todayStr;
    }).length;

    return {
      user_id: u.id,
      user_name: u.name,
      avatar: u.avatar || u.name.charAt(0),
      color: u.color || '#3b82f6',
      total_tasks: totalTasks,
      completed_tasks: completedTasks,
      total_estimated_hours: totalEstimatedHours,
      overdue_tasks: overdueTasks,
    };
  });
};

export default db;
