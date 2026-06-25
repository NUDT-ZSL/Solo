import express, { Request, Response } from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const DATA_FILE = path.join(__dirname, 'data.json');

app.use(cors());
app.use(express.json());

interface Stall {
  id: string;
  number: string;
  status: 'available' | 'booked';
  category: string;
  description: string;
  contact: string;
  bookerName: string;
  bookerAvatar: string;
  estimatedAmount: number;
}

interface Market {
  id: string;
  name: string;
  date: string;
  deadline: string;
  stalls: Stall[];
}

interface User {
  id: string;
  username: string;
  password: string;
  role: string;
  name: string;
  avatar: string;
}

interface Transaction {
  id: string;
  userId: string;
  marketId: string;
  stallId: string;
  action: string;
  amount: number;
  timestamp: string;
}

interface Feedback {
  id: string;
  userId: string;
  marketId: string;
  rating: number;
  content: string;
  timestamp: string;
}

interface Data {
  markets: Market[];
  users: User[];
  transactions: Transaction[];
  feedback: Feedback[];
}

const readData = (): Promise<Data> => {
  return new Promise((resolve, reject) => {
    fs.readFile(DATA_FILE, 'utf-8', (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(JSON.parse(data));
      }
    });
  });
};

const writeData = (data: Data): Promise<void> => {
  return new Promise((resolve, reject) => {
    fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

app.get('/api/markets', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    res.json(data.markets);
  } catch (err) {
    res.status(500).json({ error: '读取市场数据失败' });
  }
});

app.get('/api/markets/:id', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const market = data.markets.find((m) => m.id === req.params.id);
    if (!market) {
      res.status(404).json({ error: '市场不存在' });
      return;
    }
    res.json(market);
  } catch (err) {
    res.status(500).json({ error: '读取市场详情失败' });
  }
});

app.post('/api/markets', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const { name, date, deadline } = req.body;

    if (!name || !date || !deadline) {
      res.status(400).json({ error: '缺少必要字段' });
      return;
    }

    const stalls: Stall[] = [];
    const categories = ['手工艺品', '文创产品', '食品饮品', '服饰配件', '书籍文具', '绿植花艺', '复古收藏', '其他'];
    for (let i = 0; i < 16; i++) {
      const row = String.fromCharCode(65 + Math.floor(i / 4));
      const col = (i % 4) + 1;
      stalls.push({
        id: generateId(),
        number: `${row}0${col}`,
        status: 'available',
        category: categories[i % categories.length],
        description: '',
        contact: '',
        bookerName: '',
        bookerAvatar: '',
        estimatedAmount: 0,
      });
    }

    const newMarket: Market = {
      id: generateId(),
      name,
      date,
      deadline,
      stalls,
    };

    data.markets.push(newMarket);
    await writeData(data);
    res.status(201).json(newMarket);
  } catch (err) {
    res.status(500).json({ error: '创建市场失败' });
  }
});

app.put('/api/markets/:id/stalls/:stallId', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const market = data.markets.find((m) => m.id === req.params.id);
    if (!market) {
      res.status(404).json({ error: '市场不存在' });
      return;
    }

    const stall = market.stalls.find((s) => s.id === req.params.stallId);
    if (!stall) {
      res.status(404).json({ error: '摊位不存在' });
      return;
    }

    const { bookerName, bookerAvatar, contact, category, description, estimatedAmount } = req.body;

    if (bookerName !== undefined) stall.bookerName = bookerName;
    if (bookerAvatar !== undefined) stall.bookerAvatar = bookerAvatar;
    if (contact !== undefined) stall.contact = contact;
    if (category !== undefined) stall.category = category;
    if (description !== undefined) stall.description = description;
    if (estimatedAmount !== undefined) stall.estimatedAmount = estimatedAmount;

    if (stall.bookerName && stall.status === 'available') {
      stall.status = 'booked';
      const transaction: Transaction = {
        id: generateId(),
        userId: req.body.userId || 'u2',
        marketId: market.id,
        stallId: stall.id,
        action: 'book',
        amount: stall.estimatedAmount,
        timestamp: new Date().toISOString(),
      };
      data.transactions.push(transaction);
    }

    await writeData(data);
    res.json(stall);
  } catch (err) {
    res.status(500).json({ error: '更新摊位失败' });
  }
});

app.delete('/api/markets/:id/stalls/:stallId', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const market = data.markets.find((m) => m.id === req.params.id);
    if (!market) {
      res.status(404).json({ error: '市场不存在' });
      return;
    }

    const stall = market.stalls.find((s) => s.id === req.params.stallId);
    if (!stall) {
      res.status(404).json({ error: '摊位不存在' });
      return;
    }

    const amount = stall.estimatedAmount;

    stall.status = 'available';
    stall.contact = '';
    stall.bookerName = '';
    stall.bookerAvatar = '';
    stall.estimatedAmount = 0;

    const transaction: Transaction = {
      id: generateId(),
      userId: req.body.userId || 'u2',
      marketId: market.id,
      stallId: stall.id,
      action: 'cancel',
      amount,
      timestamp: new Date().toISOString(),
    };
    data.transactions.push(transaction);

    await writeData(data);
    res.json({ message: '已取消预订' });
  } catch (err) {
    res.status(500).json({ error: '取消预订失败' });
  }
});

app.get('/api/users/:id/history', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const user = data.users.find((u) => u.id === req.params.id);
    if (!user) {
      res.status(404).json({ error: '用户不存在' });
      return;
    }

    const userTransactions = data.transactions.filter((t) => t.userId === req.params.id);
    const history = userTransactions.map((t) => {
      const market = data.markets.find((m) => m.id === t.marketId);
      const stall = market?.stalls.find((s) => s.id === t.stallId);
      return {
        ...t,
        marketName: market?.name || '',
        stallNumber: stall?.number || '',
        stallCategory: stall?.category || '',
      };
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: '获取用户历史失败' });
  }
});

app.post('/api/feedback', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const { userId, marketId, rating, content } = req.body;

    if (!userId || !marketId || !rating || !content) {
      res.status(400).json({ error: '缺少必要字段' });
      return;
    }

    const newFeedback: Feedback = {
      id: generateId(),
      userId,
      marketId,
      rating,
      content,
      timestamp: new Date().toISOString(),
    };

    data.feedback.push(newFeedback);
    await writeData(data);
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(500).json({ error: '提交反馈失败' });
  }
});

app.get('/api/markets/:id/feedback', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const market = data.markets.find((m) => m.id === req.params.id);
    if (!market) {
      res.status(404).json({ error: '市场不存在' });
      return;
    }

    const marketFeedback = data.feedback
      .filter((f) => f.marketId === req.params.id)
      .map((f) => {
        const user = data.users.find((u) => u.id === f.userId);
        return {
          ...f,
          userName: user?.name || '',
          userAvatar: user?.avatar || '',
        };
      });

    res.json(marketFeedback);
  } catch (err) {
    res.status(500).json({ error: '获取反馈失败' });
  }
});

app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const { username, password } = req.body;

    if (!username || !password) {
      res.status(400).json({ error: '请输入用户名和密码' });
      return;
    }

    const user = data.users.find((u) => u.username === username && u.password === password);
    if (!user) {
      res.status(401).json({ error: '用户名或密码错误' });
      return;
    }

    res.json({
      id: user.id,
      username: user.username,
      role: user.role,
      name: user.name,
      avatar: user.avatar,
    });
  } catch (err) {
    res.status(500).json({ error: '登录失败' });
  }
});

app.get('/api/markets/:id/stats', async (req: Request, res: Response) => {
  try {
    const data = await readData();
    const market = data.markets.find((m) => m.id === req.params.id);
    if (!market) {
      res.status(404).json({ error: '市场不存在' });
      return;
    }

    const totalStalls = market.stalls.length;
    const bookedStalls = market.stalls.filter((s) => s.status === 'booked').length;
    const availableStalls = totalStalls - bookedStalls;
    const occupancyRate = Math.round((bookedStalls / totalStalls) * 100);
    const totalEstimatedAmount = market.stalls.reduce((sum, s) => sum + s.estimatedAmount, 0);

    const categoryStats: Record<string, { total: number; booked: number }> = {};
    market.stalls.forEach((s) => {
      if (!categoryStats[s.category]) {
        categoryStats[s.category] = { total: 0, booked: 0 };
      }
      categoryStats[s.category].total++;
      if (s.status === 'booked') {
        categoryStats[s.category].booked++;
      }
    });

    const marketFeedback = data.feedback.filter((f) => f.marketId === req.params.id);
    const avgRating = marketFeedback.length > 0
      ? Math.round((marketFeedback.reduce((sum, f) => sum + f.rating, 0) / marketFeedback.length) * 10) / 10
      : 0;

    res.json({
      totalStalls,
      bookedStalls,
      availableStalls,
      occupancyRate,
      totalEstimatedAmount,
      categoryStats,
      avgRating,
      feedbackCount: marketFeedback.length,
    });
  } catch (err) {
    res.status(500).json({ error: '获取统计数据失败' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
