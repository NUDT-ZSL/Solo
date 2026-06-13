const express = require('express');
const cors = require('cors');
const low = require('lowdb');
const FileSync = require('lowdb/adapters/FileSync');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const adapter = new FileSync(path.join(__dirname, 'db.json'));
const db = low(adapter);

db.defaults({
  users: [
    { id: 'user-1', nickname: 'Alice', password: '123456', avatar: 'A' },
    { id: 'user-2', nickname: 'Bob', password: '123456', avatar: 'B' },
    { id: 'user-3', nickname: 'Charlie', password: '123456', avatar: 'C' },
  ],
  projects: [
    {
      id: 'project-1',
      name: '示例项目',
      createdAt: new Date().toISOString(),
      startDate: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ],
  projectMembers: [
    { id: 'pm-1', projectId: 'project-1', userId: 'user-1' },
    { id: 'pm-2', projectId: 'project-1', userId: 'user-2' },
    { id: 'pm-3', projectId: 'project-1', userId: 'user-3' },
  ],
  cards: [
    {
      id: 'card-1',
      projectId: 'project-1',
      column: 'todo',
      title: '设计登录页面',
      description: '完成登录页面的UI设计，包含表单验证和响应式布局。',
      assigneeId: 'user-1',
      priority: 'high',
      dueDate: '2026-06-20',
      tags: [{ name: '设计', color: '#10b981' }, { name: 'UI', color: '#8b5cf6' }],
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      movedAt: null,
    },
    {
      id: 'card-2',
      projectId: 'project-1',
      column: 'todo',
      title: '编写API文档',
      description: '为所有RESTful接口编写详细的API文档。',
      assigneeId: 'user-2',
      priority: 'medium',
      dueDate: '2026-06-22',
      tags: [{ name: '文档', color: '#f59e0b' }],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      movedAt: null,
    },
    {
      id: 'card-3',
      projectId: 'project-1',
      column: 'inProgress',
      title: '实现拖拽功能',
      description: '实现看板卡片的拖拽排序和列间移动功能。',
      assigneeId: 'user-1',
      priority: 'urgent',
      dueDate: '2026-06-15',
      tags: [{ name: '前端', color: '#3b82f6' }],
      createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      movedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'card-4',
      projectId: 'project-1',
      column: 'inProgress',
      title: '数据库建模',
      description: '设计项目、卡片、评论等数据表结构。',
      assigneeId: 'user-3',
      priority: 'high',
      dueDate: '2026-06-16',
      tags: [{ name: '后端', color: '#ef4444' }],
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      movedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'card-5',
      projectId: 'project-1',
      column: 'inProgress',
      title: '配置CI/CD',
      description: '设置自动化构建和部署流水线。',
      assigneeId: 'user-2',
      priority: 'low',
      dueDate: '2026-06-25',
      tags: [{ name: '运维', color: '#6b7280' }],
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      movedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'card-6',
      projectId: 'project-1',
      column: 'done',
      title: '项目初始化',
      description: '创建项目骨架，配置开发环境。',
      assigneeId: 'user-3',
      priority: 'high',
      dueDate: '2026-06-10',
      tags: [{ name: '基建', color: '#14b8a6' }],
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      movedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'card-7',
      projectId: 'project-1',
      column: 'done',
      title: '需求分析',
      description: '收集并整理项目需求文档。',
      assigneeId: 'user-1',
      priority: 'urgent',
      dueDate: '2026-06-09',
      tags: [{ name: '产品', color: '#ec4899' }],
      createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
      movedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: 'card-8',
      projectId: 'project-1',
      column: 'done',
      title: '原型设计',
      description: '使用Figma完成产品原型设计。',
      assigneeId: 'user-2',
      priority: 'medium',
      dueDate: '2026-06-11',
      tags: [{ name: '设计', color: '#10b981' }],
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      movedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
  comments: [
    {
      id: 'comment-1',
      cardId: 'card-3',
      userId: 'user-2',
      content: '拖拽的时候记得加过渡动画，体验会更好。',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 3600000).toISOString(),
    },
    {
      id: 'comment-2',
      cardId: 'card-3',
      userId: 'user-1',
      content: '好的，我已经加上了0.2秒的弹性缓动。',
      createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000 + 7200000).toISOString(),
    },
    {
      id: 'comment-3',
      cardId: 'card-6',
      userId: 'user-1',
      content: '环境配置完成，大家可以拉代码了。',
      createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000 + 1800000).toISOString(),
    },
  ],
}).write();

const app = express();
app.use(cors());
app.use(express.json());

const resOk = (data, message) => ({ code: 0, data, message: message || 'success' });
const resErr = (message, code) => ({ code: code || -1, data: null, message: message || 'error' });

app.post('/api/users/register', (req, res) => {
  const { nickname, password } = req.body;
  if (!nickname || !password) return res.json(resErr('昵称和密码不能为空'));
  const exists = db.get('users').find({ nickname }).value();
  if (exists) return res.json(resErr('昵称已存在'));
  const user = {
    id: 'user-' + uuidv4().slice(0, 8),
    nickname,
    password,
    avatar: nickname.charAt(0).toUpperCase(),
  };
  db.get('users').push(user).write();
  res.json(resOk({ id: user.id, nickname: user.nickname, avatar: user.avatar }, '注册成功'));
});

app.post('/api/users/login', (req, res) => {
  const { nickname, password } = req.body;
  const user = db.get('users').find({ nickname, password }).value();
  if (!user) return res.json(resErr('昵称或密码错误'));
  res.json(resOk({ id: user.id, nickname: user.nickname, avatar: user.avatar }, '登录成功'));
});

app.get('/api/projects', (req, res) => {
  const userId = req.query.userId;
  let projects;
  if (userId) {
    const memberProjectIds = db
      .get('projectMembers')
      .filter({ userId })
      .map('projectId')
      .value();
    projects = db
      .get('projects')
      .filter(function (p) { return memberProjectIds.includes(p.id); })
      .value();
  } else {
    projects = db.get('projects').value();
  }
  res.json(resOk(projects));
});

app.post('/api/projects', (req, res) => {
  const { name, userId } = req.body;
  if (!name || !userId) return res.json(resErr('项目名称和用户ID不能为空'));
  const project = {
    id: 'project-' + uuidv4().slice(0, 8),
    name,
    createdAt: new Date().toISOString(),
    startDate: new Date().toISOString().split('T')[0],
  };
  db.get('projects').push(project).write();
  db.get('projectMembers')
    .push({ id: 'pm-' + uuidv4().slice(0, 8), projectId: project.id, userId })
    .write();
  res.json(resOk(project, '项目创建成功'));
});

app.post('/api/projects/join', (req, res) => {
  const { projectId, userId } = req.body;
  if (!projectId || !userId) return res.json(resErr('项目ID和用户ID不能为空'));
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.json(resErr('项目不存在'));
  const exists = db.get('projectMembers').find({ projectId, userId }).value();
  if (!exists) {
    db.get('projectMembers')
      .push({ id: 'pm-' + uuidv4().slice(0, 8), projectId, userId })
      .write();
  }
  res.json(resOk(project, '加入项目成功'));
});

app.get('/api/cards', (req, res) => {
  const projectId = req.query.projectId;
  if (!projectId) return res.json(resErr('项目ID不能为空'));
  const cards = db.get('cards').filter({ projectId }).value();
  res.json(resOk(cards));
});

app.post('/api/cards', (req, res) => {
  const { projectId, title, description, assigneeId, priority, dueDate, tags } = req.body;
  if (!projectId || !title) return res.json(resErr('项目ID和标题不能为空'));
  const card = {
    id: 'card-' + uuidv4().slice(0, 8),
    projectId,
    column: 'todo',
    title,
    description: description || '',
    assigneeId: assigneeId || null,
    priority: priority || 'medium',
    dueDate: dueDate || null,
    tags: tags || [],
    createdAt: new Date().toISOString(),
    movedAt: null,
  };
  db.get('cards').push(card).write();
  res.json(resOk(card, '卡片创建成功'));
});

app.put('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const updates = req.body;
  const card = db.get('cards').find({ id }).value();
  if (!card) return res.json(resErr('卡片不存在'));
  if (updates.column && updates.column !== card.column) {
    updates.movedAt = new Date().toISOString();
  }
  const updated = db.get('cards').find({ id }).assign(updates).write();
  res.json(resOk(updated, '卡片更新成功'));
});

app.delete('/api/cards/:id', (req, res) => {
  const { id } = req.params;
  const card = db.get('cards').find({ id }).value();
  if (!card) return res.json(resErr('卡片不存在'));
  db.get('cards').remove({ id }).write();
  db.get('comments').remove({ cardId: id }).write();
  res.json(resOk(null, '卡片删除成功'));
});

app.get('/api/comments', (req, res) => {
  const cardId = req.query.cardId;
  if (!cardId) return res.json(resErr('卡片ID不能为空'));
  const comments = db.get('comments').filter({ cardId }).sortBy('createdAt').value();
  const users = db.get('users').value();
  const enriched = comments.map(function (c) {
    const user = users.find(function (u) { return u.id === c.userId; });
    return {
      ...c,
      user: user ? { id: user.id, nickname: user.nickname, avatar: user.avatar } : null,
    };
  });
  res.json(resOk(enriched));
});

app.post('/api/comments', (req, res) => {
  const { cardId, userId, content } = req.body;
  if (!cardId || !userId || !content) return res.json(resErr('参数不完整'));
  const comment = {
    id: 'comment-' + uuidv4().slice(0, 8),
    cardId,
    userId,
    content,
    createdAt: new Date().toISOString(),
  };
  db.get('comments').push(comment).write();
  const user = db.get('users').find({ id: userId }).value();
  const enriched = {
    ...comment,
    user: user ? { id: user.id, nickname: user.nickname, avatar: user.avatar } : null,
  };
  res.json(resOk(enriched, '评论发布成功'));
});

app.get('/api/chart/burndown', (req, res) => {
  const projectId = req.query.projectId;
  if (!projectId) return res.json(resErr('项目ID不能为空'));
  const project = db.get('projects').find({ id: projectId }).value();
  if (!project) return res.json(resErr('项目不存在'));
  const cards = db.get('cards').filter({ projectId }).value();
  const total = cards.length;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates = [];
  const ideal = [];
  const actual = [];
  const dailyRatios = [];

  const doneCards = cards.filter(function (c) {
    return c.column === 'done' && c.movedAt;
  });

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const dateStr = d.toISOString().split('T')[0];
    dates.push(dateStr);

    let cumulDone = 0;
    for (let j = 0; j < doneCards.length; j++) {
      const movedDate = new Date(doneCards[j].movedAt);
      movedDate.setHours(0, 0, 0, 0);
      if (movedDate.getTime() <= d.getTime()) {
        cumulDone++;
      }
    }

    const ratio = total > 0 ? Math.min(1, Math.max(0, cumulDone / total)) : 0;
    dailyRatios.push(Math.round(ratio * 1000) / 1000);
    actual.push(total - cumulDone);
  }

  for (let i = 0; i < 7; i++) {
    ideal.push(Math.max(0, Math.round(total * (1 - i / 6))));
  }

  res.json(resOk({ dates, ideal, actual, total, dailyRatios }));
});

app.get('/api/users', (req, res) => {
  const users = db
    .get('users')
    .value()
    .map(function (u) { return { id: u.id, nickname: u.nickname, avatar: u.avatar }; });
  res.json(resOk(users));
});

const PORT = 3001;
app.listen(PORT, function () {
  console.log('Server running on http://localhost:' + PORT);
});
