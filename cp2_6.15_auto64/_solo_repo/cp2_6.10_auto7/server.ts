import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import multiparty from 'multiparty';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));

type InspirationCategory = 'text' | 'image' | 'color' | 'audio';

interface User {
  id: string;
  email: string;
  password: string;
  createdAt: number;
  lastLoginDate?: string;
  highlightIndex: number;
}

interface Inspiration {
  id: string;
  userId: string;
  category: InspirationCategory;
  content: string;
  tags: string[];
  colorComplement?: string;
  createdAt: number;
  updatedAt: number;
}

const users = new Map<string, User>();
const emails = new Map<string, string>();
const tokens = new Map<string, string>();
const inspirations = new Map<string, Inspiration>();
const userInspirations = new Map<string, string[]>();
const audioFiles = new Map<string, { buffer: Buffer; type: string }>();

const getTodayStr = (): string => new Date().toISOString().slice(0, 10);

const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['x-auth-token'] as string;
  if (!token || !tokens.has(token)) {
    res.status(401).json({ success: false, error: '未授权访问' });
    return;
  }
  (req as any).userId = tokens.get(token);
  (req as any).token = token;
  next();
};

const jsonRes = <T>(res: express.Response, success: boolean, data?: T, error?: string, status = 200) => {
  res.status(status).json({ success, data, error });
};

app.post('/api/auth/register', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return jsonRes(res, false, undefined, '邮箱和密码必填', 400);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return jsonRes(res, false, undefined, '邮箱格式不正确', 400);
    if (password.length < 6) return jsonRes(res, false, undefined, '密码至少6位', 400);
    if (emails.has(email)) return jsonRes(res, false, undefined, '邮箱已注册', 409);

    const id = uuidv4();
    const user: User = { id, email, password, createdAt: Date.now(), highlightIndex: 0 };
    users.set(id, user);
    emails.set(email, id);
    userInspirations.set(id, []);

    const token = uuidv4();
    tokens.set(token, id);
    jsonRes(res, true, { token, userId: id });
  } catch (e: any) {
    jsonRes(res, false, undefined, e.message, 500);
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return jsonRes(res, false, undefined, '邮箱和密码必填', 400);
    const userId = emails.get(email);
    if (!userId) return jsonRes(res, false, undefined, '用户不存在', 404);
    const user = users.get(userId)!;
    if (user.password !== password) return jsonRes(res, false, undefined, '密码错误', 401);

    const token = uuidv4();
    tokens.set(token, userId);

    const today = getTodayStr();
    let isFirstLoginToday = false;
    if (user.lastLoginDate !== today) {
      user.lastLoginDate = today;
      user.highlightIndex = (user.highlightIndex || 0) + 1;
      isFirstLoginToday = true;
    }
    jsonRes(res, true, { token, userId, isFirstLoginToday, highlightIndex: user.highlightIndex });
  } catch (e: any) {
    jsonRes(res, false, undefined, e.message, 500);
  }
});

app.post('/api/auth/logout', authMiddleware, (req, res) => {
  tokens.delete((req as any).token);
  jsonRes(res, true, { ok: true });
});

app.get('/api/inspirations', authMiddleware, (req, res) => {
  const userId = (req as any).userId;
  const ids = userInspirations.get(userId) || [];
  const list = ids
    .map((id) => inspirations.get(id))
    .filter(Boolean)
    .sort((a, b) => b!.createdAt - a!.createdAt);
  jsonRes(res, true, list);
});

app.post('/api/inspirations', authMiddleware, (req, res) => {
  try {
    const userId = (req as any).userId;
    const { category, content, tags, colorComplement } = req.body || {};
    if (!['text', 'image', 'color', 'audio'].includes(category)) {
      return jsonRes(res, false, undefined, '类别无效', 400);
    }
    if (content === undefined || content === null || content === '') {
      return jsonRes(res, false, undefined, '内容必填', 400);
    }
    const tagsArr = Array.isArray(tags) ? tags.slice(0, 3) : [];
    const now = Date.now();
    const insp: Inspiration = {
      id: uuidv4(),
      userId,
      category,
      content: String(content),
      tags: tagsArr.map((t) => String(t).trim()).filter(Boolean),
      colorComplement,
      createdAt: now,
      updatedAt: now,
    };
    inspirations.set(insp.id, insp);
    const list = userInspirations.get(userId) || [];
    list.unshift(insp.id);
    userInspirations.set(userId, list);
    jsonRes(res, true, insp, undefined, 201);
  } catch (e: any) {
    jsonRes(res, false, undefined, e.message, 500);
  }
});

app.put('/api/inspirations/:id', authMiddleware, (req, res) => {
  const userId = (req as any).userId;
  const id = req.params.id;
  const insp = inspirations.get(id);
  if (!insp || insp.userId !== userId) return jsonRes(res, false, undefined, '记录不存在', 404);

  const { content, tags, colorComplement } = req.body || {};
  if (content !== undefined) insp.content = String(content);
  if (Array.isArray(tags)) insp.tags = tags.slice(0, 3).map((t: any) => String(t).trim()).filter(Boolean);
  if (colorComplement !== undefined) insp.colorComplement = colorComplement;
  insp.updatedAt = Date.now();
  inspirations.set(id, insp);
  jsonRes(res, true, insp);
});

app.delete('/api/inspirations/:id', authMiddleware, (req, res) => {
  const userId = (req as any).userId;
  const id = req.params.id;
  const insp = inspirations.get(id);
  if (!insp || insp.userId !== userId) return jsonRes(res, false, undefined, '记录不存在', 404);
  inspirations.delete(id);
  const list = userInspirations.get(userId) || [];
  const idx = list.indexOf(id);
  if (idx >= 0) list.splice(idx, 1);
  userInspirations.set(userId, list);
  jsonRes(res, true, { deleted: true });
});

app.get('/api/inspirations/tag/:tag', authMiddleware, (req, res) => {
  const userId = (req as any).userId;
  const tag = decodeURIComponent(req.params.tag);
  const ids = userInspirations.get(userId) || [];
  const list = ids
    .map((id) => inspirations.get(id))
    .filter((i): i is Inspiration => !!i && i.tags.includes(tag))
    .sort((a, b) => b.createdAt - a.createdAt);
  jsonRes(res, true, list);
});

app.post('/api/audio/upload', authMiddleware, (req, res) => {
  const form = new multiparty.Form();
  form.parse(req, (err, _fields, files) => {
    if (err) return jsonRes(res, false, undefined, err.message, 400);
    try {
      const fileArr = files.audio || files.file || [];
      if (!fileArr.length) return jsonRes(res, false, undefined, '未找到文件', 400);
      const file = fileArr[0];
      const id = uuidv4();
      const fs = require('fs');
      const buffer = fs.readFileSync(file.path);
      audioFiles.set(id, { buffer, type: file.headers['content-type'] || 'audio/webm' });
      jsonRes(res, true, { audioId: id }, undefined, 201);
    } catch (e: any) {
      jsonRes(res, false, undefined, e.message, 500);
    }
  });
});

app.get('/api/audio/:id', (req, res) => {
  const id = req.params.id;
  const data = audioFiles.get(id);
  if (!data) return res.status(404).end();
  res.setHeader('Content-Type', data.type);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(data.buffer);
});

app.listen(PORT, () => {
  console.log(`[Server] Inspiration Board API listening on http://localhost:${PORT}`);
});
