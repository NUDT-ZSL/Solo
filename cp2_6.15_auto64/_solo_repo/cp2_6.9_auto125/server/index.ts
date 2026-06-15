import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import type { Objective, Quarter, KeyResult, WsMessage, WsEventType } from '../src/types';
import http from 'http';

const app = express();
app.use(express.json());

const PORT = 3001;
const USER_COLORS = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'];

let okrs: Objective[] = [
  {
    id: uuidv4(),
    title: '提升产品用户体验',
    description: '通过用户调研和迭代优化，全面提升产品的易用性和满意度',
    quarter: 'Q2',
    owner: '张三',
    keyResults: [
      { id: uuidv4(), title: '完成10次用户访谈', progress: 60 },
      { id: uuidv4(), title: '用户满意度NPS提升至40+', progress: 45 },
      { id: uuidv4(), title: '核心流程转化率提升20%', progress: 30 }
    ],
    createdAt: Date.now()
  },
  {
    id: uuidv4(),
    title: '拓展市场份额',
    description: '在新客户获取和留存方面实现突破增长',
    quarter: 'Q2',
    owner: '李四',
    keyResults: [
      { id: uuidv4(), title: '新增付费客户100家', progress: 25 },
      { id: uuidv4(), title: '老客户续约率达到90%', progress: 70 }
    ],
    createdAt: Date.now()
  },
  {
    id: uuidv4(),
    title: '技术架构升级',
    description: '完成微服务改造，提升系统稳定性和可扩展性',
    quarter: 'Q3',
    owner: '王五',
    keyResults: [
      { id: uuidv4(), title: '完成核心服务拆分', progress: 15 },
      { id: uuidv4(), title: '系统可用性达到99.9%', progress: 0 },
      { id: uuidv4(), title: '接口响应时间降低50%', progress: 10 }
    ],
    createdAt: Date.now()
  }
];

interface ClientInfo {
  ws: WebSocket;
  userId: string;
  color: string;
}

const clients = new Map<string, ClientInfo>();

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

function broadcast(type: WsEventType, data: unknown, excludeId?: string) {
  const message: WsMessage = { type, data };
  const payload = JSON.stringify(message);
  clients.forEach((client, id) => {
    if (id !== excludeId && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(payload);
    }
  });
}

function broadcastOnlineUsers() {
  const onlineUsers = Array.from(clients.values()).map(c => ({
    id: c.userId,
    color: c.color
  }));
  broadcast('users:online', onlineUsers);
}

wss.on('connection', (ws) => {
  const userId = uuidv4();
  const color = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
  clients.set(userId, { ws, userId, color });

  ws.send(JSON.stringify({
    type: 'okr:list',
    data: okrs
  } as WsMessage));

  ws.send(JSON.stringify({
    type: 'users:online',
    data: Array.from(clients.values()).map(c => ({ id: c.userId, color: c.color }))
  } as WsMessage));

  broadcastOnlineUsers();

  ws.on('message', (raw) => {
    try {
      const msg: WsMessage = JSON.parse(raw.toString());
      const client = clients.get(userId);
      if (!client) return;

      switch (msg.type) {
        case 'okr:locked': {
          const { objectiveId } = msg.data as { objectiveId: string };
          const okr = okrs.find(o => o.id === objectiveId);
          if (okr && !okr.lockedBy) {
            okr.lockedBy = userId;
            okr.lockColor = client.color;
            broadcast('okr:locked', { objectiveId, userId, color: client.color });
          } else if (okr && okr.lockedBy === userId) {
            broadcast('okr:locked', { objectiveId, userId, color: client.color });
          }
          break;
        }
        case 'okr:unlocked': {
          const { objectiveId } = msg.data as { objectiveId: string };
          const okr = okrs.find(o => o.id === objectiveId);
          if (okr && okr.lockedBy === userId) {
            okr.lockedBy = undefined;
            okr.lockColor = undefined;
            broadcast('okr:unlocked', { objectiveId });
          }
          break;
        }
        case 'okr:updated': {
          const updated = msg.data as Objective;
          const idx = okrs.findIndex(o => o.id === updated.id);
          if (idx !== -1) {
            okrs[idx] = { ...updated, lockedBy: okrs[idx].lockedBy, lockColor: okrs[idx].lockColor };
            broadcast('okr:updated', okrs[idx], userId);
          }
          break;
        }
      }
    } catch (e) {
      console.error('WS message parse error:', e);
    }
  });

  ws.on('close', () => {
    okrs.forEach(okr => {
      if (okr.lockedBy === userId) {
        okr.lockedBy = undefined;
        okr.lockColor = undefined;
        broadcast('okr:unlocked', { objectiveId: okr.id });
      }
    });
    clients.delete(userId);
    broadcastOnlineUsers();
  });
});

app.get('/api/okrs', (_req, res) => {
  res.json(okrs);
});

app.post('/api/okrs', (req, res) => {
  const { title, description, quarter, owner } = req.body as {
    title: string;
    description: string;
    quarter: Quarter;
    owner: string;
  };

  if (!title || title.length > 50) {
    return res.status(400).json({ error: '标题不能为空且最多50字' });
  }
  if (description && description.length > 200) {
    return res.status(400).json({ error: '描述最多200字' });
  }
  if (!['Q1', 'Q2', 'Q3', 'Q4'].includes(quarter)) {
    return res.status(400).json({ error: '季度必须为Q1-Q4' });
  }

  const newOkr: Objective = {
    id: uuidv4(),
    title,
    description: description || '',
    quarter,
    owner: owner || '未分配',
    keyResults: [],
    createdAt: Date.now()
  };

  okrs.push(newOkr);
  broadcast('okr:created', newOkr);
  res.status(201).json(newOkr);
});

app.put('/api/okrs/:id', (req, res) => {
  const id = req.params.id;
  const idx = okrs.findIndex(o => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '目标不存在' });
  }

  const updates = req.body as Partial<Objective>;
  if (updates.title !== undefined) {
    if (!updates.title || updates.title.length > 50) {
      return res.status(400).json({ error: '标题不能为空且最多50字' });
    }
  }
  if (updates.description !== undefined && updates.description.length > 200) {
    return res.status(400).json({ error: '描述最多200字' });
  }
  if (updates.keyResults !== undefined && updates.keyResults.length > 5) {
    return res.status(400).json({ error: '每个目标最多5个关键结果' });
  }
  if (updates.keyResults !== undefined) {
    updates.keyResults = updates.keyResults.map((kr: KeyResult) => ({
      ...kr,
      progress: Math.max(0, Math.min(100, kr.progress))
    }));
  }

  okrs[idx] = { ...okrs[idx], ...updates };
  broadcast('okr:updated', okrs[idx]);
  res.json(okrs[idx]);
});

app.delete('/api/okrs/:id', (req, res) => {
  const id = req.params.id;
  const idx = okrs.findIndex(o => o.id === id);
  if (idx === -1) {
    return res.status(404).json({ error: '目标不存在' });
  }
  okrs.splice(idx, 1);
  broadcast('okr:deleted', { id });
  res.json({ success: true });
});

server.listen(PORT, () => {
  console.log(`OKR Server running on http://localhost:${PORT}`);
});
