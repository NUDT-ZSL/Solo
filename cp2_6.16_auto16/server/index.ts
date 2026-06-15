import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import initSqlJs, { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import * as fs from 'fs';
import * as path from 'path';

export type Difficulty = 'easy' | 'medium' | 'hard';
export type RewardType = 'physical' | 'virtual';

export interface Family {
  id: string;
  name: string;
  created_at: string;
}

export interface Member {
  id: string;
  family_id: string;
  name: string;
  avatar: string;
  points: number;
}

export interface Task {
  id: string;
  family_id: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  points: number;
  claimed_by: string | null;
  completed: boolean;
}

export interface Reward {
  id: string;
  family_id: string;
  title: string;
  description: string;
  points_cost: number;
  type: RewardType;
  image_url: string | null;
}

export interface CreateFamilyBody {
  name: string;
  members: Array<{ name: string; avatar: string }>;
}

export interface ClaimTaskBody {
  taskId: string;
  memberId: string;
  familyId: string;
}

export interface CompleteTaskBody {
  taskId: string;
  familyId: string;
}

export interface RedeemRewardBody {
  rewardId: string;
  memberId: string;
  familyId: string;
}

export interface ApiError {
  error: string;
  details?: string;
}

const DIFFICULTY_POINTS: Record<Difficulty, number> = {
  easy: 10,
  medium: 20,
  hard: 30,
};

const DEFAULT_TASKS: Array<{ title: string; description: string; difficulty: Difficulty }> = [
  { title: '整理房间', description: '整理自己的房间，保持整洁有序', difficulty: 'medium' },
  { title: '洗碗', description: '清洗所有餐具并擦干放好', difficulty: 'easy' },
  { title: '倒垃圾', description: '将家中垃圾倒到指定位置', difficulty: 'easy' },
  { title: '浇花', description: '给家里的植物浇水', difficulty: 'easy' },
  { title: '辅导作业', description: '帮助弟弟妹妹辅导功课', difficulty: 'hard' },
];

const DEFAULT_REWARDS: Array<{ title: string; description: string; points_cost: number; type: RewardType }> = [
  { title: '周末免洗碗一次', description: '周末可以免洗碗一次', points_cost: 80, type: 'virtual' },
  { title: '选择晚餐菜单权', description: '可以选择某一天的晚餐菜单', points_cost: 50, type: 'virtual' },
  { title: '免做一次家务', description: '可以免做一次家务任务', points_cost: 100, type: 'virtual' },
  { title: '额外游戏时间1小时', description: '获得额外的1小时游戏时间', points_cost: 60, type: 'virtual' },
  { title: '家庭电影选择', description: '选择家庭电影夜观看的影片', points_cost: 150, type: 'virtual' },
];

const DB_FILE_PATH = path.join(__dirname, 'family.db');

let db: Database;

const saveDatabase = () => {
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE_PATH, buffer);
  } catch (e) {
    console.error('保存数据库失败:', e);
  }
};

const loadDatabase = async (SQL: initSqlJs.SqlJsStatic) => {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const buffer = fs.readFileSync(DB_FILE_PATH);
      return new SQL.Database(buffer);
    }
  } catch (e) {
    console.warn('读取现有数据库失败，将创建新数据库:', e);
  }
  return new SQL.Database();
};

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const initDatabase = async () => {
  const SQL = await initSqlJs({
    locateFile: (file: string) => path.join(require.resolve('sql.js'), '..', file),
  });

  db = await loadDatabase(SQL);

  db.run(`
    CREATE TABLE IF NOT EXISTS families (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS members (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      name TEXT NOT NULL,
      avatar TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      difficulty TEXT NOT NULL CHECK(difficulty IN ('easy', 'medium', 'hard')),
      points INTEGER NOT NULL,
      claimed_by TEXT,
      completed INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS rewards (
      id TEXT PRIMARY KEY,
      family_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      points_cost INTEGER NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('physical', 'virtual')),
      image_url TEXT
    );
  `);

  saveDatabase();
  console.log('数据库初始化完成');
};

const queryOne = <T = any>(sql: string, params: any[] = []): T | undefined => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  if (stmt.step()) {
    const result = stmt.getAsObject() as T;
    stmt.free();
    return result;
  }
  stmt.free();
  return undefined;
};

const queryAll = <T = any>(sql: string, params: any[] = []): T[] => {
  const results: T[] = [];
  const stmt = db.prepare(sql);
  stmt.bind(params);
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
};

const execute = (sql: string, params: any[] = []) => {
  db.run(sql, params);
};

const errorHandler = (err: any, req: Request, res: Response<ApiError>, next: NextFunction) => {
  console.error('服务器错误:', err);
  res.status(500).json({ error: '服务器内部错误', details: err.message });
};

app.post('/api/family', (req: Request<{}, {}, CreateFamilyBody>, res: Response<{ family: Family; tasks: Task[]; rewards: Reward[] } | ApiError>, next: NextFunction) => {
  try {
    const { name, members } = req.body;

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ error: '家庭名称不能为空' });
    }

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ error: '至少需要添加一个家庭成员' });
    }

    for (let i = 0; i < members.length; i++) {
      const m = members[i];
      if (!m.name || typeof m.name !== 'string' || m.name.trim().length === 0) {
        return res.status(400).json({ error: `第${i + 1}个成员的名称不能为空` });
      }
      if (!m.avatar || typeof m.avatar !== 'string' || m.avatar.trim().length === 0) {
        return res.status(400).json({ error: `第${i + 1}个成员的头像不能为空` });
      }
    }

    const familyId = uuidv4();
    const createdAt = new Date().toISOString();

    execute(
      'INSERT INTO families (id, name, created_at) VALUES (?, ?, ?)',
      [familyId, name.trim(), createdAt]
    );

    for (const m of members) {
      const memberId = uuidv4();
      execute(
        'INSERT INTO members (id, family_id, name, avatar, points) VALUES (?, ?, ?, ?, 0)',
        [memberId, familyId, m.name.trim(), m.avatar.trim()]
      );
    }

    const taskRecords: Task[] = [];
    for (const t of DEFAULT_TASKS) {
      const taskId = uuidv4();
      const points = DIFFICULTY_POINTS[t.difficulty];
      execute(
        'INSERT INTO tasks (id, family_id, title, description, difficulty, points, claimed_by, completed) VALUES (?, ?, ?, ?, ?, ?, NULL, 0)',
        [taskId, familyId, t.title, t.description, t.difficulty, points]
      );
      taskRecords.push({
        id: taskId,
        family_id: familyId,
        title: t.title,
        description: t.description,
        difficulty: t.difficulty,
        points,
        claimed_by: null,
        completed: false,
      });
    }

    const rewardRecords: Reward[] = [];
    for (const r of DEFAULT_REWARDS) {
      const rewardId = uuidv4();
      execute(
        'INSERT INTO rewards (id, family_id, title, description, points_cost, type, image_url) VALUES (?, ?, ?, ?, ?, ?, NULL)',
        [rewardId, familyId, r.title, r.description, r.points_cost, r.type]
      );
      rewardRecords.push({
        id: rewardId,
        family_id: familyId,
        title: r.title,
        description: r.description,
        points_cost: r.points_cost,
        type: r.type,
        image_url: null,
      });
    }

    saveDatabase();

    const family: Family = {
      id: familyId,
      name: name.trim(),
      created_at: createdAt,
    };

    return res.status(201).json({ family, tasks: taskRecords, rewards: rewardRecords });
  } catch (err) {
    next(err);
  }
});

app.get('/api/family/:id', (req: Request<{ id: string }>, res: Response<{ family: Family; members: Member[]; tasks: Task[]; rewards: Reward[] } | ApiError>, next: NextFunction) => {
  try {
    const { id } = req.params;

    const family = queryOne<Family>('SELECT * FROM families WHERE id = ?', [id]);

    if (!family) {
      return res.status(404).json({ error: '家庭不存在' });
    }

    const members = queryAll<Member>('SELECT * FROM members WHERE family_id = ? ORDER BY name', [id]);

    const tasksRaw = queryAll<any>('SELECT * FROM tasks WHERE family_id = ? ORDER BY completed ASC, difficulty DESC', [id]);
    const tasks: Task[] = tasksRaw.map(t => ({
      ...t,
      completed: !!t.completed,
    }));

    const rewards = queryAll<Reward>('SELECT * FROM rewards WHERE family_id = ? ORDER BY points_cost ASC', [id]);

    return res.json({ family, members, tasks, rewards });
  } catch (err) {
    next(err);
  }
});

app.get('/api/family/:id/members', (req: Request<{ id: string }>, res: Response<Member[] | ApiError>, next: NextFunction) => {
  try {
    const { id } = req.params;

    const family = queryOne<Family>('SELECT id FROM families WHERE id = ?', [id]);

    if (!family) {
      return res.status(404).json({ error: '家庭不存在' });
    }

    const members = queryAll<Member>('SELECT * FROM members WHERE family_id = ? ORDER BY points DESC, name ASC', [id]);

    return res.json(members);
  } catch (err) {
    next(err);
  }
});

app.post('/api/task/claim', (req: Request<{}, {}, ClaimTaskBody>, res: Response<Task | ApiError>, next: NextFunction) => {
  try {
    const { taskId, memberId, familyId } = req.body;

    if (!taskId || !memberId || !familyId) {
      return res.status(400).json({ error: 'taskId、memberId、familyId均为必填项' });
    }

    const task = queryOne<any>('SELECT * FROM tasks WHERE id = ? AND family_id = ?', [taskId, familyId]);

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (task.completed) {
      return res.status(400).json({ error: '该任务已完成，无法认领' });
    }

    if (task.claimed_by) {
      return res.status(400).json({ error: '该任务已被认领' });
    }

    const member = queryOne<Member>('SELECT * FROM members WHERE id = ? AND family_id = ?', [memberId, familyId]);

    if (!member) {
      return res.status(404).json({ error: '成员不存在' });
    }

    execute('UPDATE tasks SET claimed_by = ? WHERE id = ?', [memberId, taskId]);
    saveDatabase();

    const updatedTask = queryOne<any>('SELECT * FROM tasks WHERE id = ?', [taskId])!;

    const result: Task = {
      ...updatedTask,
      completed: !!updatedTask.completed,
    };

    return res.json(result);
  } catch (err) {
    next(err);
  }
});

app.post('/api/task/complete', (req: Request<{}, {}, CompleteTaskBody>, res: Response<{ task: Task; member: Member } | ApiError>, next: NextFunction) => {
  try {
    const { taskId, familyId } = req.body;

    if (!taskId || !familyId) {
      return res.status(400).json({ error: 'taskId、familyId均为必填项' });
    }

    const task = queryOne<any>('SELECT * FROM tasks WHERE id = ? AND family_id = ?', [taskId, familyId]);

    if (!task) {
      return res.status(404).json({ error: '任务不存在' });
    }

    if (task.completed) {
      return res.status(400).json({ error: '该任务已完成' });
    }

    if (!task.claimed_by) {
      return res.status(400).json({ error: '该任务尚未被认领' });
    }

    execute('UPDATE tasks SET completed = 1 WHERE id = ?', [taskId]);

    const pointsEarned = DIFFICULTY_POINTS[task.difficulty as Difficulty];
    execute('UPDATE members SET points = points + ? WHERE id = ? AND family_id = ?', [pointsEarned, task.claimed_by, familyId]);

    saveDatabase();

    const updatedTaskRaw = queryOne<any>('SELECT * FROM tasks WHERE id = ?', [taskId])!;
    const updatedMember = queryOne<Member>('SELECT * FROM members WHERE id = ?', [task.claimed_by])!;

    const updatedTask: Task = {
      ...updatedTaskRaw,
      completed: !!updatedTaskRaw.completed,
    };

    return res.json({ task: updatedTask, member: updatedMember });
  } catch (err) {
    next(err);
  }
});

app.post('/api/reward/redeem', (req: Request<{}, {}, RedeemRewardBody>, res: Response<{ reward: Reward; member: Member } | ApiError>, next: NextFunction) => {
  try {
    const { rewardId, memberId, familyId } = req.body;

    if (!rewardId || !memberId || !familyId) {
      return res.status(400).json({ error: 'rewardId、memberId、familyId均为必填项' });
    }

    const reward = queryOne<Reward>('SELECT * FROM rewards WHERE id = ? AND family_id = ?', [rewardId, familyId]);

    if (!reward) {
      return res.status(404).json({ error: '奖品不存在' });
    }

    const member = queryOne<Member>('SELECT * FROM members WHERE id = ? AND family_id = ?', [memberId, familyId]);

    if (!member) {
      return res.status(404).json({ error: '成员不存在' });
    }

    if (member.points < reward.points_cost) {
      return res.status(400).json({
        error: '积分不足',
        details: `需要${reward.points_cost}积分，当前只有${member.points}积分`,
      });
    }

    execute('UPDATE members SET points = points - ? WHERE id = ? AND family_id = ?', [reward.points_cost, memberId, familyId]);
    saveDatabase();

    const updatedMember = queryOne<Member>('SELECT * FROM members WHERE id = ?', [memberId])!;

    return res.json({ reward, member: updatedMember });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`家庭任务服务已启动，监听端口 ${PORT}`);
      console.log(`API 基础地址: http://localhost:${PORT}/api`);
    });
  } catch (err) {
    console.error('启动服务器失败:', err);
    process.exit(1);
  }
};

startServer();

export { app };
