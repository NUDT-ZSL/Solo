import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import {
  users,
  tokens,
  specials,
  groupOrders,
  posts,
  hiddenMenus,
  generateToken,
  User,
  SpecialDrink,
  GroupOrder,
  Post,
  OrderItem
} from './data';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '');
    const userId = tokens.get(token);
    if (userId) {
      (req as any).userId = userId;
      (req as any).token = token;
    }
  }
  next();
}

app.use(authMiddleware);

app.get('/api/specials', (_req: Request, res: Response) => {
  res.json(specials);
});

app.get('/api/hidden-menus', (_req: Request, res: Response) => {
  res.json(hiddenMenus);
});

app.post('/api/register', (req: Request, res: Response) => {
  const { nickname, avatar, password } = req.body;
  if (!nickname || !password) {
    return res.status(400).json({ error: '昵称和密码不能为空' });
  }
  const id = 'u' + Date.now();
  const token = generateToken();
  const user: User = { id, nickname, avatar: avatar || '', password, token };
  users.set(id, user);
  tokens.set(token, id);
  res.json({ token, user: { id, nickname, avatar: user.avatar } });
});

app.post('/api/login', (req: Request, res: Response) => {
  const { nickname, password } = req.body;
  const userArr = Array.from(users.values()).find(
    (u) => u.nickname === nickname && u.password === password
  );
  if (!userArr) {
    return res.status(401).json({ error: '昵称或密码错误' });
  }
  const token = generateToken();
  userArr.token = token;
  tokens.set(token, userArr.id);
  res.json({ token, user: { id: userArr.id, nickname: userArr.nickname, avatar: userArr.avatar } });
});

app.get('/api/me', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (userId) {
    const user = users.get(userId);
    if (user) {
      return res.json({ id: user.id, nickname: user.nickname, avatar: user.avatar });
    }
  }
  res.status(401).json({ error: '未登录' });
});

app.get('/api/orders', (_req: Request, res: Response) => {
  const now = Date.now();
  const activeOrders = Array.from(groupOrders.values()).filter((o) => {
    return o.status === 'active' && o.deadline > now;
  });
  res.json(activeOrders);
});

app.post('/api/orders', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: '未登录' });
  }
  const { targetDrinkId, targetDrinkName, duration, tableNumber } = req.body;
  const user = users.get(userId);
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }
  const id = 'o' + Date.now();
  const deadline = Date.now() + duration * 60 * 1000;
  const participant: OrderItem = {
    userId,
    userName: user.nickname,
    drinkId: targetDrinkId,
    drinkName: targetDrinkName
  };
  const order: GroupOrder = {
    id,
    initiatorId: userId,
    initiatorName: user.nickname,
    targetDrinkId,
    targetDrinkName,
    participants: [participant],
    maxParticipants: 4,
    deadline,
    tableNumber,
    status: 'active',
    createdAt: Date.now()
  };
  groupOrders.set(id, order);
  res.json(order);
});

app.post('/api/orders/:id/join', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: '未登录' });
  }
  const order = groupOrders.get(req.params.id);
  if (!order) {
    return res.status(404).json({ error: '拼单不存在' });
  }
  const user = users.get(userId);
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }
  if (order.participants.length >= order.maxParticipants) {
    return res.status(400).json({ error: '拼单已满' });
  }
  if (order.participants.some((p) => p.userId === userId)) {
    return res.status(400).json({ error: '已加入该拼单' });
  }
  const { drinkId, drinkName } = req.body;
  order.participants.push({
    userId, userName: user.nickname, drinkId: drinkId || order.targetDrinkId, drinkName: drinkName || order.targetDrinkName
  });
  if (order.participants.length >= 2) {
    order.status = 'completed';
  }
  res.json(order);
});

app.get('/api/posts', (_req: Request, res: Response) => {
  const sorted = [...posts].sort((a, b) => b.createdAt - a.createdAt);
  res.json(sorted);
});

app.post('/api/posts', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: '未登录' });
  }
  const user = users.get(userId);
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }
  const { hiddenMenu } = req.body;
  const post: Post = {
    id: 'p' + Date.now(),
    userId,
    userName: user.nickname,
    userAvatar: user.avatar,
    hiddenMenu,
    likes: [],
    createdAt: Date.now()
  };
  posts.unshift(post);
  res.json(post);
});

app.post('/api/posts/:id/like', (req: Request, res: Response) => {
  const userId = (req as any).userId;
  if (!userId) {
    return res.status(401).json({ error: '未登录' });
  }
  const post = posts.find((p) => p.id === req.params.id);
  if (!post) {
    return res.status(404).json({ error: '动态不存在' });
  }
  const idx = post.likes.indexOf(userId);
  if (idx === -1) {
    post.likes.push(userId);
  } else {
    post.likes.splice(idx, 1);
  }
  res.json(post);
});

app.listen(PORT, () => {
  console.log('Coffee Corner backend running on http://localhost:' + PORT);
});
