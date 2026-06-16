import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

const db = {
  projects: [],
  cards: [],
  votes: [],
  teamMembers: [],
  risks: [],
  notifications: []
};

const now = new Date();
const hoursAgo = (hours) => new Date(now.getTime() - hours * 60 * 60 * 1000).toISOString();
const daysAgo = (days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

db.teamMembers = [
  { id: 'u1', name: '张伟', role: 'manager' },
  { id: 'u2', name: '李娜', role: 'tech_lead' },
  { id: 'u3', name: '王强', role: 'developer' },
  { id: 'u4', name: '刘芳', role: 'designer' },
  { id: 'u5', name: '陈明', role: 'developer' }
];

db.projects = [
  {
    id: 'p1',
    name: '移动端APP重构',
    description: '重构现有移动端应用，提升用户体验和性能',
    createdAt: daysAgo(7)
  },
  {
    id: 'p2',
    name: '数据分析平台',
    description: '构建团队内部数据分析和可视化平台',
    createdAt: daysAgo(3)
  }
];

db.cards = [
  {
    id: 'c1',
    title: '用户登录模块重构',
    description: '重构用户登录系统，支持第三方登录',
    estimateDays: 5,
    dependencyId: null,
    tag: 'tech',
    assignee: 'u3',
    status: 'completed',
    projectId: 'p1',
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
    lastStatusChange: daysAgo(1)
  },
  {
    id: 'c2',
    title: '首页UI重新设计',
    description: '根据最新设计规范重新设计首页布局',
    estimateDays: 3,
    dependencyId: 'c1',
    tag: 'design',
    assignee: 'u4',
    status: 'in_progress',
    projectId: 'p1',
    createdAt: daysAgo(4),
    updatedAt: hoursAgo(36),
    lastStatusChange: hoursAgo(36)
  },
  {
    id: 'c3',
    title: '订单管理功能',
    description: '实现完整的订单创建、查询、取消功能',
    estimateDays: 8,
    dependencyId: 'c2',
    tag: 'feature',
    assignee: 'u2',
    status: 'confirmed',
    projectId: 'p1',
    createdAt: daysAgo(3),
    updatedAt: daysAgo(2),
    lastStatusChange: daysAgo(2)
  },
  {
    id: 'c4',
    title: '支付接口对接',
    description: '对接第三方支付平台，支持微信和支付宝',
    estimateDays: 6,
    dependencyId: 'c3',
    tag: 'tech',
    assignee: 'u5',
    status: 'scheduling',
    projectId: 'p1',
    createdAt: daysAgo(2),
    updatedAt: daysAgo(1),
    lastStatusChange: daysAgo(1)
  },
  {
    id: 'c5',
    title: '消息推送服务',
    description: '实现APP消息推送功能，支持多种推送类型',
    estimateDays: 4,
    dependencyId: null,
    tag: 'feature',
    assignee: 'u3',
    status: 'discussion',
    projectId: 'p1',
    createdAt: daysAgo(1),
    updatedAt: hoursAgo(12),
    lastStatusChange: hoursAgo(12)
  },
  {
    id: 'c6',
    title: '服务器环境配置',
    description: '配置生产环境服务器，包括负载均衡',
    estimateDays: 2,
    dependencyId: null,
    tag: 'ops',
    assignee: 'u2',
    status: 'completed',
    projectId: 'p1',
    createdAt: daysAgo(6),
    updatedAt: daysAgo(3),
    lastStatusChange: daysAgo(3)
  },
  {
    id: 'c7',
    title: '数据看板组件开发',
    description: '开发可复用的数据可视化看板组件',
    estimateDays: 7,
    dependencyId: null,
    tag: 'feature',
    assignee: 'u5',
    status: 'in_progress',
    projectId: 'p2',
    createdAt: daysAgo(3),
    updatedAt: hoursAgo(60),
    lastStatusChange: hoursAgo(60)
  },
  {
    id: 'c8',
    title: '数据报表导出功能',
    description: '支持导出Excel和PDF格式的数据报表',
    estimateDays: 5,
    dependencyId: 'c7',
    tag: 'feature',
    assignee: 'u3',
    status: 'confirmed',
    projectId: 'p2',
    createdAt: daysAgo(2),
    updatedAt: hoursAgo(24),
    lastStatusChange: hoursAgo(24)
  }
];

db.votes = [
  { cardId: 'c4', userId: 'u1', score: 5, userRole: 'manager' },
  { cardId: 'c4', userId: 'u2', score: 4, userRole: 'tech_lead' },
  { cardId: 'c4', userId: 'u3', score: 3, userRole: 'developer' },
  { cardId: 'c5', userId: 'u1', score: 4, userRole: 'manager' },
  { cardId: 'c5', userId: 'u2', score: 5, userRole: 'tech_lead' },
  { cardId: 'c5', userId: 'u4', score: 3, userRole: 'designer' }
];

app.get('/api/projects', (req, res) => {
  res.json(db.projects);
});

app.post('/api/projects', (req, res) => {
  const { name, description } = req.body;
  const project = {
    id: uuidv4(),
    name,
    description,
    createdAt: new Date().toISOString()
  };
  db.projects.push(project);
  res.json(project);
});

app.get('/api/cards', (req, res) => {
  const { projectId } = req.query;
  let cards = db.cards;
  if (projectId) {
    cards = cards.filter(c => c.projectId === projectId);
  }
  res.json(cards);
});

app.get('/api/cards/:id', (req, res) => {
  const card = db.cards.find(c => c.id === req.params.id);
  if (!card) {
    return res.status(404).json({ error: 'Card not found' });
  }
  res.json(card);
});

app.post('/api/cards', (req, res) => {
  const { title, description, estimateDays, dependencyId, tag, assignee, projectId } = req.body;
  const now = new Date().toISOString();
  const card = {
    id: uuidv4(),
    title,
    description,
    estimateDays,
    dependencyId: dependencyId || null,
    tag,
    assignee,
    status: 'discussion',
    projectId,
    createdAt: now,
    updatedAt: now,
    lastStatusChange: now
  };
  db.cards.push(card);
  res.json(card);
});

app.put('/api/cards/:id', (req, res) => {
  const index = db.cards.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Card not found' });
  }
  
  const oldCard = db.cards[index];
  const updates = req.body;
  
  if (updates.status && updates.status !== oldCard.status) {
    updates.lastStatusChange = new Date().toISOString();
  }
  
  db.cards[index] = {
    ...oldCard,
    ...updates,
    updatedAt: new Date().toISOString()
  };
  
  res.json(db.cards[index]);
});

app.patch('/api/cards/:id/status', (req, res) => {
  const index = db.cards.findIndex(c => c.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: 'Card not found' });
  }
  
  const { status } = req.body;
  const now = new Date().toISOString();
  
  db.cards[index] = {
    ...db.cards[index],
    status,
    updatedAt: now,
    lastStatusChange: now
  };
  
  res.json(db.cards[index]);
});

app.get('/api/votes', (req, res) => {
  const { cardId } = req.query;
  let votes = db.votes;
  if (cardId) {
    votes = votes.filter(v => v.cardId === cardId);
  }
  res.json(votes);
});

app.post('/api/vote', (req, res) => {
  const { cardId, userId, score } = req.body;
  
  if (!Number.isInteger(score) || score < 1 || score > 5) {
    return res.status(400).json({ error: 'Invalid score, must be 1-5' });
  }
  
  const user = db.teamMembers.find(m => m.id === userId);
  const existingIndex = db.votes.findIndex(v => v.cardId === cardId && v.userId === userId);
  
  const vote = {
    cardId,
    userId,
    score,
    userRole: user?.role || 'default'
  };
  
  if (existingIndex >= 0) {
    db.votes[existingIndex] = vote;
  } else {
    db.votes.push(vote);
  }
  
  res.json(vote);
});

app.get('/api/team-members', (req, res) => {
  res.json(db.teamMembers);
});

app.get('/api/risks', (req, res) => {
  const { projectId } = req.query;
  
  const cards = projectId 
    ? db.cards.filter(c => c.projectId === projectId)
    : db.cards;
  
  const alerts = scanDependencies(cards);
  
  const cardMap = new Map(cards.map(c => [c.id, c]));
  
  const result = alerts.map(alert => {
    const card = cardMap.get(alert.cardId);
    return {
      ...alert,
      card,
      dependency: alert.dependencyId ? cardMap.get(alert.dependencyId) : null
    };
  });
  
  res.json(result);
});

app.post('/api/risks/:cardId/acknowledge', (req, res) => {
  const { cardId } = req.params;
  const acknowledged = db.risks.some(r => r.cardId === cardId && r.acknowledged);
  if (!acknowledged) {
    db.risks.push({ cardId, acknowledged: true, acknowledgedAt: new Date().toISOString() });
  }
  res.json({ success: true });
});

app.get('/api/stats/progress', (req, res) => {
  const { projectId } = req.query;
  let cards = db.cards;
  if (projectId) {
    cards = cards.filter(c => c.projectId === projectId);
  }
  
  const total = cards.length;
  const completed = cards.filter(c => c.status === 'completed').length;
  const inProgress = cards.filter(c => c.status === 'in_progress').length;
  const confirmed = cards.filter(c => c.status === 'confirmed').length;
  
  res.json({
    total,
    completed,
    inProgress,
    confirmed,
    percentage: total > 0 ? Math.round((completed / total) * 100) : 0
  });
});

app.get('/api/stats/workload', (req, res) => {
  const { projectId } = req.query;
  let cards = db.cards;
  if (projectId) {
    cards = cards.filter(c => c.projectId === projectId);
  }
  
  const memberMap = new Map(db.teamMembers.map(m => [m.id, m]));
  const workloadMap = new Map();
  
  db.teamMembers.forEach(member => {
    workloadMap.set(member.id, {
      memberId: member.id,
      memberName: member.name,
      totalEstimate: 0,
      completedEstimate: 0,
      cards: []
    });
  });
  
  cards.forEach(card => {
    const workload = workloadMap.get(card.assignee);
    if (workload) {
      workload.totalEstimate += card.estimateDays;
      workload.cards.push(card);
      if (card.status === 'completed') {
        workload.completedEstimate += card.estimateDays;
      }
    }
  });
  
  res.json(Array.from(workloadMap.values()));
});

app.post('/api/notifications/email', (req, res) => {
  const { to, subject, body } = req.body;
  console.log(`[模拟邮件] 发送给: ${to}, 主题: ${subject}`);
  console.log(`内容: ${body}`);
  
  db.notifications.push({
    id: uuidv4(),
    type: 'email',
    to,
    subject,
    body,
    sentAt: new Date().toISOString()
  });
  
  res.json({ success: true, message: 'Email sent (simulated)' });
});

function scanDependencies(cards, thresholdHours = 48) {
  const now = new Date();
  const thresholdMs = thresholdHours * 60 * 60 * 1000;
  const cardMap = new Map(cards.map(c => [c.id, c]));
  const alerts = [];
  const alertedCards = new Set();
  
  const confirmedCards = cards.filter(c => c.status === 'confirmed' || c.status === 'in_progress');
  
  confirmedCards.forEach(card => {
    if (!card.dependencyId) return;
    
    const dependency = cardMap.get(card.dependencyId);
    if (!dependency) return;
    
    const dependencyStatus = dependency.status;
    const lastChange = new Date(dependency.lastStatusChange).getTime();
    const nowTime = now.getTime();
    const hoursSinceChange = (nowTime - lastChange) / (60 * 60 * 1000);
    
    if (dependencyStatus !== 'completed') {
      const noProgress = (nowTime - lastChange) >= thresholdMs;
      
      if (noProgress) {
        if (alertedCards.has(card.id)) return;
        
        let level = 'medium';
        let reason = '';
        
        if (dependencyStatus === 'in_progress') {
          if (hoursSinceChange >= 72) {
            level = 'high';
            reason = `前置依赖「${dependency.title}」进行中已超过${Math.floor(hoursSinceChange)}小时无进展`;
          } else {
            level = 'medium';
            reason = `前置依赖「${dependency.title}」进行中${Math.floor(hoursSinceChange)}小时未更新状态`;
          }
        } else if (dependencyStatus === 'confirmed' || dependencyStatus === 'scheduling') {
          level = 'high';
          reason = `前置依赖「${dependency.title}」尚未开始，已确认超过${Math.floor(hoursSinceChange)}小时`;
        } else {
          level = 'high';
          reason = `前置依赖「${dependency.title}」仍在${translateStatus(dependencyStatus)}阶段`;
        }
        
        alerts.push({
          cardId: card.id,
          cardTitle: card.title,
          dependencyId: dependency.id,
          dependencyTitle: dependency.title,
          reason,
          level,
          assignee: card.assignee,
          projectId: card.projectId
        });
        
        alertedCards.add(card.id);
      }
    }
  });
  
  const levelOrder = { high: 0, medium: 1, low: 2 };
  return alerts.sort((a, b) => levelOrder[a.level] - levelOrder[b.level]);
}

function translateStatus(status) {
  const map = {
    'discussion': '待讨论',
    'scheduling': '排期中',
    'confirmed': '已确认',
    'in_progress': '进行中',
    'completed': '已完成'
  };
  return map[status] || status;
}

setInterval(() => {
  console.log(`[${new Date().toLocaleString()}] 执行定时风险扫描...`);
  const alerts = scanDependencies(db.cards);
  if (alerts.length > 0) {
    console.log(`发现 ${alerts.length} 个风险告警`);
    alerts.forEach(alert => {
      if (alert.level === 'high') {
        const member = db.teamMembers.find(m => m.id === alert.assignee);
        if (member) {
          console.log(`[模拟邮件] 高风险告警通知 ${member.name}: ${alert.reason}`);
        }
      }
    });
  }
}, 12 * 60 * 60 * 1000);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/projects');
  console.log('  POST /api/projects');
  console.log('  GET  /api/cards');
  console.log('  POST /api/cards');
  console.log('  PUT  /api/cards/:id');
  console.log('  PATCH /api/cards/:id/status');
  console.log('  GET  /api/votes');
  console.log('  POST /api/vote');
  console.log('  GET  /api/team-members');
  console.log('  GET  /api/risks');
  console.log('  GET  /api/stats/progress');
  console.log('  GET  /api/stats/workload');
  console.log('  POST /api/risks/:cardId/acknowledge');
  console.log('  POST /api/notifications/email');
});
