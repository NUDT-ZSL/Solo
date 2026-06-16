import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 4000;
const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SCORES_FILE = path.join(DATA_DIR, 'scores.json');

app.use(cors());
app.use(express.json());

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface UserData {
  id: string;
  username: string;
  password: string;
  avatar?: string;
  createdAt: string;
}

interface ScoreData {
  id: string;
  userId: string;
  title: string;
  notes: any[];
  createdAt: string;
  updatedAt: string;
}

const readUsers = (): UserData[] => {
  if (!fs.existsSync(USERS_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
};

const writeUsers = (users: UserData[]) => {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
};

const readScores = (): ScoreData[] => {
  if (!fs.existsSync(SCORES_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(SCORES_FILE, 'utf-8'));
  } catch {
    return [];
  }
};

const writeScores = (scores: ScoreData[]) => {
  fs.writeFileSync(SCORES_FILE, JSON.stringify(scores, null, 2), 'utf-8');
};

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.post('/api/users/register', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    if (username.length < 2 || password.length < 4) {
      return res.status(400).json({ error: '用户名至少2位，密码至少4位' });
    }

    const users = readUsers();

    if (users.find((u) => u.username === username)) {
      return res.status(409).json({ error: '用户名已存在' });
    }

    const newUser: UserData = {
      id: uuidv4(),
      username,
      password,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeUsers(users);

    const { password: _, ...safeUser } = newUser;
    res.status(201).json(safeUser);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/users/login', (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    const users = readUsers();
    const user = users.find((u) => u.username === username && u.password === password);

    if (!user) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/scores', (req, res) => {
  try {
    const { userId } = req.query;
    let scores = readScores();

    if (userId) {
      scores = scores.filter((s) => s.userId === userId);
    }

    scores.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    res.json(scores);
  } catch (err) {
    console.error('Get scores error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.get('/api/scores/:id', (req, res) => {
  try {
    const { id } = req.params;
    const scores = readScores();
    const score = scores.find((s) => s.id === id);

    if (!score) {
      return res.status(404).json({ error: '乐谱不存在' });
    }

    res.json(score);
  } catch (err) {
    console.error('Get score error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.post('/api/scores', (req, res) => {
  try {
    const { userId, title, notes } = req.body;

    if (!userId || !title) {
      return res.status(400).json({ error: '用户ID和标题不能为空' });
    }

    const users = readUsers();
    if (!users.find((u) => u.id === userId)) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const scores = readScores();
    const now = new Date().toISOString();

    const newScore: ScoreData = {
      id: uuidv4(),
      userId,
      title: title || '未命名琴谱',
      notes: notes || [],
      createdAt: now,
      updatedAt: now
    };

    scores.push(newScore);
    writeScores(scores);

    res.status(201).json(newScore);
  } catch (err) {
    console.error('Create score error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.put('/api/scores/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, notes } = req.body;

    const scores = readScores();
    const idx = scores.findIndex((s) => s.id === id);

    if (idx === -1) {
      return res.status(404).json({ error: '乐谱不存在' });
    }

    scores[idx] = {
      ...scores[idx],
      title: title || scores[idx].title,
      notes: notes !== undefined ? notes : scores[idx].notes,
      updatedAt: new Date().toISOString()
    };

    writeScores(scores);
    res.json(scores[idx]);
  } catch (err) {
    console.error('Update score error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.delete('/api/scores/:id', (req, res) => {
  try {
    const { id } = req.params;
    const scores = readScores();
    const filtered = scores.filter((s) => s.id !== id);

    if (filtered.length === scores.length) {
      return res.status(404).json({ error: '乐谱不存在' });
    }

    writeScores(filtered);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('Delete score error:', err);
    res.status(500).json({ error: '服务器错误' });
  }
});

app.listen(PORT, () => {
  console.log(`古琴谱后端服务已启动: http://localhost:${PORT}`);
  console.log(`数据目录: ${DATA_DIR}`);
});
