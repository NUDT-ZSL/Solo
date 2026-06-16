import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

app.use(cors());
app.use(express.json());

const users = new Map();
const chapters = new Map();
const locks = new Map();
const onlineUsers = new Map();

const DEFAULT_CHAPTERS = [
  {
    id: 'chapter-1',
    title: '第一章：命运的交汇',
    paragraphs: [
      '林远站在古城墙上，远处的山峦在夕阳下渐渐隐入暮色。他紧握手中的剑，心中回想着师父临终前的嘱托："寻找苏晴，她掌握着开启封印的钥匙。"',
      '苏晴在密室中翻阅着古老的典籍，烛光映照着她疲惫的面容。一页页泛黄的纸张记录着千年前的那场大战，而她的名字赫然出现在预言之中。',
      '赵云策马穿行在暮色笼罩的荒原上，身后的追兵已渐渐远去。他怀中揣着的那封信，将改变所有人的命运。韩雪的笔迹依然清晰——"三日后，月圆之夜，在古城相见。"',
    ],
    versions: [],
    collaborators: [],
    createdAt: Date.now() - 86400000,
    updatedAt: Date.now(),
  },
  {
    id: 'chapter-2',
    title: '第二章：暗流涌动',
    paragraphs: [
      '陈风在酒馆角落默默观察着来往的客人，他的任务只有一个——确认林远的行踪。组织对他的信任已经不多了，这是最后的机会。',
      '韩雪站在城楼最高处，俯瞰着整个古城。风拂过她的长发，她低声自语："一切都在按计划进行。"然而她并不知道，真正的危机正从暗处逼近。',
    ],
    versions: [],
    collaborators: [],
    createdAt: Date.now() - 43200000,
    updatedAt: Date.now(),
  },
];

DEFAULT_CHAPTERS.forEach((ch) => {
  ch.versions = [
    {
      id: uuidv4(),
      chapterId: ch.id,
      content: ch.paragraphs.join('\n'),
      paragraphs: [...ch.paragraphs],
      timestamp: ch.updatedAt,
      authorId: 'system',
      authorName: '系统',
    },
  ];
  chapters.set(ch.id, ch);
});

function getLockKey(chapterId, paragraphIndex) {
  return `${chapterId}:${paragraphIndex}`;
}

function cleanupExpiredLocks() {
  const now = Date.now();
  for (const [key, lock] of locks) {
    if (now - lock.acquiredAt > 60000) {
      locks.delete(key);
      io.emit('lock-released', {
        chapterId: lock.chapterId,
        paragraphIndex: lock.paragraphIndex,
        userId: lock.userId,
      });
    }
  });
}

setInterval(cleanupExpiredLocks, 10000);

app.post('/api/users/register', (req, res) => {
  const { name, password } = req.body;
  if (!name || !password) {
    return res.status(400).json({ success: false, error: '用户名和密码不能为空' });
  }

  for (const [, user] of users) {
    if (user.name === name) {
      return res.status(409).json({ success: false, error: '用户名已存在' });
    }
  }

  const user = {
    id: uuidv4(),
    name,
    avatar: name[0],
    role: users.size === 0 ? 'admin' : 'editor',
  };
  users.set(user.id, { ...user, password });
  res.json({ success: true, user });
});

app.post('/api/users/login', (req, res) => {
  const { name, password } = req.body;
  for (const [, user] of users) {
    if (user.name === name && user.password === password) {
      const { password: _, ...publicUser } = user;
      return res.json({ success: true, user: publicUser, token: uuidv4() });
    }
  }
  res.status(401).json({ success: false, error: '用户名或密码错误' });
});

app.get('/api/users/online', (_req, res) => {
  res.json(Array.from(onlineUsers.values()));
});

app.get('/api/chapters', (_req, res) => {
  const list = Array.from(chapters.values()).map((ch) => ({
    id: ch.id,
    title: ch.title,
    paragraphs: ch.paragraphs,
    collaborators: ch.collaborators,
    createdAt: ch.createdAt,
    updatedAt: ch.updatedAt,
  }));
  res.json(list);
});

app.get('/api/chapters/:id', (req, res) => {
  const ch = chapters.get(req.params.id);
  if (!ch) return res.status(404).json({ error: '章节不存在' });
  res.json({
    id: ch.id,
    title: ch.title,
    paragraphs: ch.paragraphs,
    collaborators: ch.collaborators,
    createdAt: ch.createdAt,
    updatedAt: ch.updatedAt,
  });
});

app.post('/api/chapters', (req, res) => {
  const { title, userId, userName } = req.body;
  const id = uuidv4();
  const ch = {
    id,
    title: title || '新章节',
    paragraphs: [''],
    versions: [],
    collaborators: userId ? [{ userId, userName, permission: 'edit' }] : [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  ch.versions.push({
    id: uuidv4(),
    chapterId: id,
    content: '',
    paragraphs: [''],
    timestamp: ch.createdAt,
    authorId: userId || 'system',
    authorName: userName || '系统',
  });
  chapters.set(id, ch);
  res.json({ success: true, chapter: { id, title: ch.title } });
});

app.post('/api/chapters/:id/paragraphs', (req, res) => {
  const { paragraphIndex, content, userId, userName } = req.body;
  const ch = chapters.get(req.params.id);
  if (!ch) return res.status(404).json({ error: '章节不存在' });

  const lockKey = getLockKey(req.params.id, paragraphIndex);
  const lock = locks.get(lockKey);
  if (lock && lock.userId !== userId) {
    return res.status(409).json({
      success: false,
      conflict: {
        versionA: {
          id: uuidv4(),
          content: lock.currentContent || ch.paragraphs[paragraphIndex] || '',
          timestamp: lock.acquiredAt,
          authorId: lock.userId,
          authorName: lock.userName,
        },
        versionB: {
          id: uuidv4(),
          content,
          timestamp: Date.now(),
          authorId: userId,
          authorName: userName,
        },
      },
    });
  }

  ch.paragraphs[paragraphIndex] = content;
  ch.updatedAt = Date.now();

  const version = {
    id: uuidv4(),
    chapterId: req.params.id,
    content,
    paragraphs: [...ch.paragraphs],
    timestamp: ch.updatedAt,
    authorId: userId,
    authorName: userName,
  };
  ch.versions.push(version);

  if (ch.versions.length > 10) {
    ch.versions = ch.versions.slice(-10);
  }

  io.emit('chapter-updated', { chapterId: req.params.id });
  io.emit('version-added', { chapterId: req.params.id, version });

  res.json({ success: true, version });
});

app.get('/api/chapters/:id/versions', (req, res) => {
  const ch = chapters.get(req.params.id);
  if (!ch) return res.status(404).json({ error: '章节不存在' });
  res.json(ch.versions.slice(-10));
});

app.post('/api/chapters/:id/rollback', (req, res) => {
  const { versionId, userId } = req.body;
  const ch = chapters.get(req.params.id);
  if (!ch) return res.status(404).json({ error: '章节不存在' });

  const version = ch.versions.find((v) => v.id === versionId);
  if (!version) return res.status(404).json({ error: '版本不存在' });

  ch.paragraphs = [...version.paragraphs];
  ch.updatedAt = Date.now();

  const newVersion = {
    id: uuidv4(),
    chapterId: req.params.id,
    content: version.content,
    paragraphs: [...version.paragraphs],
    timestamp: ch.updatedAt,
    authorId: userId,
    authorName: '回滚操作',
  };
  ch.versions.push(newVersion);
  if (ch.versions.length > 10) {
    ch.versions = ch.versions.slice(-10);
  }

  io.emit('chapter-updated', { chapterId: req.params.id });
  io.emit('version-added', { chapterId: req.params.id, version: newVersion });

  res.json({ success: true });
});

app.post('/api/locks/acquire', (req, res) => {
  const { chapterId, paragraphIndex, userId, userName } = req.body;
  const lockKey = getLockKey(chapterId, paragraphIndex);
  const existing = locks.get(lockKey);

  if (existing && existing.userId !== userId) {
    if (Date.now() - existing.acquiredAt < 60000) {
      return res.status(423).json({
        success: false,
        error: `段落正被 ${existing.userName} 编辑`,
        lock: existing,
      });
    }
    locks.delete(lockKey);
  }

  const ch = chapters.get(chapterId);
  const lock = {
    chapterId,
    paragraphIndex,
    userId,
    userName,
    acquiredAt: Date.now(),
    currentContent: ch ? ch.paragraphs[paragraphIndex] || '' : '',
  };
  locks.set(lockKey, lock);

  res.json({ success: true, lock });
});

app.post('/api/locks/release', (req, res) => {
  const { chapterId, paragraphIndex, userId } = req.body;
  const lockKey = getLockKey(chapterId, paragraphIndex);
  const existing = locks.get(lockKey);

  if (existing && existing.userId === userId) {
    locks.delete(lockKey);
    return res.json({ success: true });
  }

  res.json({ success: false });
});

app.post('/api/chapters/:id/permissions', (req, res) => {
  const { userId, permission, adminId } = req.body;
  const ch = chapters.get(req.params.id);
  if (!ch) return res.status(404).json({ error: '章节不存在' });

  const admin = users.get(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ success: false, error: '无权限操作' });
  }

  const collab = ch.collaborators.find((c) => c.userId === userId);
  if (collab) {
    collab.permission = permission;
  } else {
    const user = users.get(userId);
    if (user) {
      ch.collaborators.push({
        userId,
        userName: user.name,
        permission,
      });
    }
  }

  res.json({ success: true });
});

app.post('/api/chapters/:id/kick', (req, res) => {
  const { userId, adminId } = req.body;
  const ch = chapters.get(req.params.id);
  if (!ch) return res.status(404).json({ error: '章节不存在' });

  const admin = users.get(adminId);
  if (!admin || admin.role !== 'admin') {
    return res.status(403).json({ success: false, error: '无权限操作' });
  }

  ch.collaborators = ch.collaborators.filter((c) => c.userId !== userId);
  res.json({ success: true });
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.on('user-join', (user) => {
    onlineUsers.set(user.id, user);
    socket.userId = user.id;
    io.emit('user-online', Array.from(onlineUsers.values()));
  });

  socket.on('lock-acquired', (data) => {
    socket.broadcast.emit('lock-acquired', data);
  });

  socket.on('lock-released', (data) => {
    const lockKey = getLockKey(data.chapterId, data.paragraphIndex);
    const existing = locks.get(lockKey);
    if (existing && existing.userId === data.userId) {
      locks.delete(lockKey);
    }
    socket.broadcast.emit('lock-released', data);
  });

  socket.on('paragraph-updating', (data) => {
    socket.broadcast.emit('paragraph-updating', data);
  });

  socket.on('paragraph-updated', (data) => {
    const ch = chapters.get(data.chapterId);
    if (ch) {
      ch.paragraphs[data.paragraphIndex] = data.content;
      ch.updatedAt = Date.now();

      if (data.version) {
        ch.versions.push({
          ...data.version,
          id: data.version.id || uuidv4(),
        });
        if (ch.versions.length > 10) {
          ch.versions = ch.versions.slice(-10);
        }
      }
    }
    socket.broadcast.emit('paragraph-updated', data);
  });

  socket.on('conflict-detected', (data) => {
    socket.broadcast.emit('conflict-detected', data);
  });

  socket.on('conflict-resolved', (data) => {
    const ch = chapters.get(data.chapterId);
    if (ch) {
      ch.paragraphs[data.paragraphIndex] = data.content;
      ch.updatedAt = Date.now();
    }
    socket.broadcast.emit('conflict-resolved', data);
  });

  socket.on('cursor-move', (data) => {
    socket.broadcast.emit('cursor-move', data);
  });

  socket.on('disconnect', () => {
    if (socket.userId) {
      onlineUsers.delete(socket.userId);

      for (const [key, lock] of locks) {
        if (lock.userId === socket.userId) {
          locks.delete(key);
          io.emit('lock-released', {
            chapterId: lock.chapterId,
            paragraphIndex: lock.paragraphIndex,
            userId: lock.userId,
          });
        }
      }

      io.emit('user-online', Array.from(onlineUsers.values()));
    }
    console.log('Client disconnected:', socket.id);
  });
});

const PORT = 4001;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
