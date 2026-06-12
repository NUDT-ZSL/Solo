import express from 'express';
import cors from 'cors';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import { initDb, db, User, Skill, ExchangeRequest, Message } from './models';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

app.use(cors());
app.use(express.json());

interface WebSocketWithUserId extends WebSocket {
  userId?: string;
}

interface WsMessage {
  type: string;
  exchangeId?: string;
  fromUserId?: string;
  toUserId?: string;
  content?: string;
  userId?: string;
}

const connections = new Map<string, WebSocketWithUserId>();

wss.on('connection', (ws: WebSocketWithUserId) => {
  console.log('New WebSocket connection');

  ws.on('message', async (data) => {
    try {
      const msg: WsMessage = JSON.parse(data.toString());

      if (msg.type === 'auth' && msg.userId) {
        ws.userId = msg.userId;
        connections.set(msg.userId, ws);
        console.log(`User ${msg.userId} authenticated`);
        return;
      }

      if (msg.type === 'message' && msg.exchangeId && msg.fromUserId && msg.toUserId && msg.content) {
        const message: Message = {
          _id: uuidv4(),
          exchangeId: msg.exchangeId,
          fromUserId: msg.fromUserId,
          toUserId: msg.toUserId,
          content: msg.content,
          read: false,
          createdAt: Date.now(),
        };

        await db.messages.insert(message);

        const broadcastMsg = JSON.stringify({ type: 'message', data: message });
        ws.send(broadcastMsg);

        const targetWs = connections.get(msg.toUserId);
        if (targetWs && targetWs.readyState === WebSocket.OPEN) {
          targetWs.send(broadcastMsg);
        }

        const fromWs = connections.get(msg.fromUserId);
        if (fromWs && fromWs !== ws && fromWs.readyState === WebSocket.OPEN) {
          fromWs.send(broadcastMsg);
        }
      }

      if (msg.type === 'mark_read' && msg.exchangeId && msg.userId) {
        await db.messages.update(
          { exchangeId: msg.exchangeId, toUserId: msg.userId, read: false },
          { $set: { read: true } },
          { multi: true }
        );

        const notification = JSON.stringify({
          type: 'read_update',
          exchangeId: msg.exchangeId,
          userId: msg.userId,
        });

        const otherWs = connections.get(msg.fromUserId || '');
        if (otherWs && otherWs.readyState === WebSocket.OPEN) {
          otherWs.send(notification);
        }
      }
    } catch (err) {
      console.error('WebSocket message error:', err);
    }
  });

  ws.on('close', () => {
    for (const [userId, conn] of connections.entries()) {
      if (conn === ws) {
        connections.delete(userId);
        console.log(`User ${userId} disconnected`);
        break;
      }
    }
  });
});

app.post('/api/users', async (req, res) => {
  try {
    const { nickname, email } = req.body;

    if (!nickname || nickname.length < 2 || nickname.length > 12) {
      return res.status(400).json({ error: '昵称长度必须在2-12个字符之间' });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return res.status(400).json({ error: '请输入有效的邮箱地址' });
    }

    let user = await db.users.findOne({ email });

    if (!user) {
      user = {
        _id: uuidv4(),
        nickname,
        email,
        createdAt: Date.now(),
      };
      await db.users.insert(user);
    } else {
      await db.users.update({ _id: user._id }, { $set: { nickname } });
      user = await db.users.findOne({ _id: user._id });
    }

    res.json(user);
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '注册失败' });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

app.get('/api/skills', async (req, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 12;
    const skip = (page - 1) * limit;

    const [skills, total] = await Promise.all([
      db.skills.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit),
      db.skills.count({}),
    ]);

    res.json({ skills, total, page, limit });
  } catch (err) {
    console.error('Get skills error:', err);
    res.status(500).json({ error: '获取技能列表失败' });
  }
});

app.get('/api/skills/user/:userId', async (req, res) => {
  try {
    const skills = await db.skills.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(skills);
  } catch (err) {
    res.status(500).json({ error: '获取用户技能失败' });
  }
});

app.post('/api/skills', async (req, res) => {
  try {
    const { userId, name, description, tags } = req.body;

    if (!userId || !name || !description || !tags || tags.length === 0) {
      return res.status(400).json({ error: '请填写完整的技能信息' });
    }

    const user = await db.users.findOne({ _id: userId });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const skill: Skill = {
      _id: uuidv4(),
      userId,
      userNickname: user.nickname,
      name,
      description,
      tags,
      createdAt: Date.now(),
    };

    await db.skills.insert(skill);
    res.json(skill);
  } catch (err) {
    console.error('Create skill error:', err);
    res.status(500).json({ error: '发布技能失败' });
  }
});

app.post('/api/exchanges', async (req, res) => {
  try {
    const { fromUserId, toUserId, skillId } = req.body;

    if (!fromUserId || !toUserId || !skillId) {
      return res.status(400).json({ error: '参数不完整' });
    }

    const [fromUserSkills, toUserSkills, skill] = await Promise.all([
      db.skills.find({ userId: fromUserId }),
      db.skills.find({ userId: toUserId }),
      db.skills.findOne({ _id: skillId }),
    ]);

    if (fromUserSkills.length === 0 || toUserSkills.length === 0) {
      return res.status(400).json({ error: '双方都需要发布至少一个技能才能发起交换' });
    }

    if (!skill) {
      return res.status(404).json({ error: '技能不存在' });
    }

    const existingExchange = await db.exchanges.findOne({
      fromUserId,
      toUserId,
      skillId,
      status: { $in: ['pending', 'confirmed'] },
    });

    if (existingExchange) {
      return res.status(400).json({ error: '已存在相同的交换请求' });
    }

    const exchange: ExchangeRequest = {
      _id: uuidv4(),
      fromUserId,
      toUserId,
      skillId,
      skillName: skill.name,
      status: 'pending',
      createdAt: Date.now(),
    };

    await db.exchanges.insert(exchange);
    res.json(exchange);
  } catch (err) {
    console.error('Create exchange error:', err);
    res.status(500).json({ error: '创建交换请求失败' });
  }
});

app.get('/api/exchanges', async (req, res) => {
  try {
    const userId = req.query.userId as string;
    if (!userId) {
      return res.status(400).json({ error: '缺少userId参数' });
    }

    const exchanges = await db.exchanges.find({
      $or: [{ fromUserId: userId }, { toUserId: userId }],
    }).sort({ createdAt: -1 });

    const exchangesWithUsers = await Promise.all(
      exchanges.map(async (exchange) => {
        const [fromUser, toUser, skill] = await Promise.all([
          db.users.findOne({ _id: exchange.fromUserId }),
          db.users.findOne({ _id: exchange.toUserId }),
          db.skills.findOne({ _id: exchange.skillId }),
        ]);
        return {
          ...exchange,
          fromUser,
          toUser,
          skill,
        };
      })
    );

    res.json(exchangesWithUsers);
  } catch (err) {
    console.error('Get exchanges error:', err);
    res.status(500).json({ error: '获取交换请求失败' });
  }
});

app.patch('/api/exchanges/:id', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['pending', 'confirmed', 'completed'].includes(status)) {
      return res.status(400).json({ error: '无效的状态' });
    }

    await db.exchanges.update({ _id: req.params.id }, { $set: { status } });
    const exchange = await db.exchanges.findOne({ _id: req.params.id });
    res.json(exchange);
  } catch (err) {
    res.status(500).json({ error: '更新交换状态失败' });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const exchangeId = req.query.exchangeId as string;
    if (!exchangeId) {
      return res.status(400).json({ error: '缺少exchangeId参数' });
    }

    const messages = await db.messages.find({ exchangeId }).sort({ createdAt: 1 });
    res.json(messages);
  } catch (err) {
    console.error('Get messages error:', err);
    res.status(500).json({ error: '获取消息失败' });
  }
});

app.get('/api/messages/unread/:userId', async (req, res) => {
  try {
    const userId = req.params.userId;
    const messages = await db.messages.find({ toUserId: userId, read: false });
    res.json({ count: messages.length });
  } catch (err) {
    res.status(500).json({ error: '获取未读消息数失败' });
  }
});

const PORT = 4000;

async function startServer() {
  await initDb();
  server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`WebSocket server ready on ws://localhost:${PORT}/ws`);
  });
}

startServer().catch(console.error);
