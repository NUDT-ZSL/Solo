import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import bcrypt from 'bcrypt';

interface AuctionItem {
  id: string;
  name: string;
  description: string;
  category: 'coin' | 'sports' | 'art' | 'toy';
  imageUrl: string;
  thumbnailUrl: string;
  currentPrice: number;
  startingPrice: number;
  endTime: string;
  createdAt: string;
}

interface Bid {
  id: string;
  auctionId: string;
  userId: string;
  userName: string;
  amount: number;
  previousAmount: number;
  createdAt: string;
}

interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  avatarUrl: string;
  createdAt: string;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

const app = express();
const PORT = 3000;
const SALT_ROUNDS = 10;

app.use(cors());
app.use(express.json());

const categoryMap: Record<string, string> = {
  coin: '钱币',
  sports: '体育',
  art: '艺术',
  toy: '玩具'
};

const initialAuctions: AuctionItem[] = [
  {
    id: '1',
    name: '1889年摩根银币',
    description: '美国1889年发行的摩根银元，品相极佳，包浆自然，是钱币收藏领域的经典珍品。该币由设计师George T. Morgan设计，正面为自由女神侧面像，背面为展翅雄鹰。存世量稀少，具有极高的收藏和投资价值。',
    category: 'coin',
    imageUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1621761191319-c6fb62004040?w=400',
    currentPrice: 2500,
    startingPrice: 1000,
    endTime: new Date(Date.now() + 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString()
  },
  {
    id: '2',
    name: '迈克尔·乔丹签名球衣',
    description: '芝加哥公牛队23号迈克尔·乔丹亲笔签名球衣，附有权威鉴定证书。球衣为球员版正品，签名清晰流畅，保存完好，是体育收藏品中的顶级珍品，极具纪念意义和升值潜力。',
    category: 'sports',
    imageUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
    currentPrice: 15800,
    startingPrice: 5000,
    endTime: new Date(Date.now() + 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString()
  },
  {
    id: '3',
    name: '1960年代复古电影海报',
    description: '60年代经典电影原版海报，色彩饱满，图案精美，保存状态良好。展现了黄金时代电影艺术的独特魅力，是复古文化爱好者和海报收藏家的梦幻藏品。',
    category: 'art',
    imageUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=400',
    currentPrice: 3200,
    startingPrice: 800,
    endTime: new Date(Date.now() + 86400000 * 1).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString()
  },
  {
    id: '4',
    name: '限量版星球大战手办',
    description: '1977年原版星球大战限量版手办套装，含经典角色多个。原包装保存完好，配件齐全，是玩具收藏界的圣杯级物品，价值逐年攀升。',
    category: 'toy',
    imageUrl: 'https://images.unsplash.com/photo-1608889476561-6242cfdbf622?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1608889476561-6242cfdbf622?w=400',
    currentPrice: 8900,
    startingPrice: 2000,
    endTime: new Date(Date.now() + 86400000 * 4).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString()
  },
  {
    id: '5',
    name: '清代光绪元宝铜币',
    description: '清代光绪年间铸造的元宝铜币，文字清晰，龙纹图案精美，包浆醇厚自然。作为中国近代机制币的代表，具有重要的历史价值和收藏意义。',
    category: 'coin',
    imageUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1606760227091-3dd870d97f1d?w=400',
    currentPrice: 4600,
    startingPrice: 1500,
    endTime: new Date(Date.now() + 86400000 * 5).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString()
  },
  {
    id: '6',
    name: '科比·布莱恩特签名篮球',
    description: '洛杉矶湖人队传奇球星科比·布莱恩特亲笔签名官方比赛用球，附专业鉴定机构证书。签名为经典黑色马克笔，笔迹流畅有力，是篮球迷梦寐以求的珍藏。',
    category: 'sports',
    imageUrl: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1519861531473-9200262188bf?w=400',
    currentPrice: 12500,
    startingPrice: 3000,
    endTime: new Date(Date.now() + 86400000 * 2).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString()
  },
  {
    id: '7',
    name: '复古铁皮机器人玩具',
    description: '1950年代日本产复古铁皮机器人玩具，经典机械设计，发条功能完好。色泽鲜艳，复古感十足，是古董玩具收藏市场的热门品类。',
    category: 'toy',
    imageUrl: 'https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1582201942988-13e60e4556ee?w=400',
    currentPrice: 5600,
    startingPrice: 1200,
    endTime: new Date(Date.now() + 86400000 * 3).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 1).toISOString()
  },
  {
    id: '8',
    name: '毕加索限量版画',
    description: '巴勃罗·毕加索经典作品限量复刻版画，编号清晰，附有画廊证书。印刷精美，色彩还原度高，装裱考究，是艺术入门收藏的绝佳选择。',
    category: 'art',
    imageUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
    currentPrice: 18500,
    startingPrice: 8000,
    endTime: new Date(Date.now() + 86400000 * 6).toISOString(),
    createdAt: new Date(Date.now() - 86400000 * 8).toISOString()
  }
];

let auctions: AuctionItem[] = [...initialAuctions];

const initialUsers: User[] = [];
let users: User[] = [...initialUsers];

const initialBids: Bid[] = [
  {
    id: 'b1',
    auctionId: '1',
    userId: 'demo1',
    userName: '藏友老张',
    amount: 2500,
    previousAmount: 2200,
    createdAt: new Date(Date.now() - 3600000 * 2).toISOString()
  },
  {
    id: 'b2',
    auctionId: '1',
    userId: 'demo2',
    userName: '钱币猎手',
    amount: 2200,
    previousAmount: 1800,
    createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
  },
  {
    id: 'b3',
    auctionId: '2',
    userId: 'demo3',
    userName: '篮球狂热者',
    amount: 15800,
    previousAmount: 13000,
    createdAt: new Date(Date.now() - 3600000 * 1).toISOString()
  },
  {
    id: 'b4',
    auctionId: '3',
    userId: 'demo4',
    userName: '复古迷',
    amount: 3200,
    previousAmount: 2800,
    createdAt: new Date(Date.now() - 3600000 * 3).toISOString()
  }
];
let bids: Bid[] = [...initialBids];

const respond = <T>(res: Response, data: T, status = 200): void => {
  res.status(status).json({ success: true, data } as ApiResponse<T>);
};

const fail = (res: Response, error: string, status = 400): void => {
  res.status(status).json({ success: false, error } as ApiResponse<null>);
};

app.get('/api/auctions', (req: Request, res: Response): void => {
  const { search, category } = req.query;
  let result = [...auctions];

  if (typeof search === 'string' && search.trim()) {
    const keyword = search.trim().toLowerCase();
    result = result.filter(
      (a) =>
        a.name.toLowerCase().includes(keyword) ||
        a.description.toLowerCase().includes(keyword) ||
        categoryMap[a.category]?.includes(search.trim())
    );
  }

  if (typeof category === 'string' && category.trim() && category !== 'all') {
    result = result.filter((a) => a.category === category);
  }

  respond(res, result);
});

app.get('/api/auctions/:id', (req: Request, res: Response): void => {
  const auction = auctions.find((a) => a.id === req.params.id);
  if (!auction) {
    return fail(res, '拍品不存在', 404);
  }
  respond(res, auction);
});

app.get('/api/auctions/:id/bids', (req: Request, res: Response): void => {
  const auction = auctions.find((a) => a.id === req.params.id);
  if (!auction) {
    return fail(res, '拍品不存在', 404);
  }
  const auctionBids = bids
    .filter((b) => b.auctionId === req.params.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  respond(res, auctionBids);
});

app.post('/api/auctions/:id/bids', (req: Request, res: Response): void => {
  const { userId, amount } = req.body as { userId: string; amount: number };
  const auctionIndex = auctions.findIndex((a) => a.id === req.params.id);

  if (auctionIndex === -1) {
    return fail(res, '拍品不存在', 404);
  }

  if (!userId || !amount || typeof amount !== 'number') {
    return fail(res, '参数不完整');
  }

  const user = users.find((u) => u.id === userId);
  if (!user) {
    return fail(res, '用户不存在或未登录', 401);
  }

  const auction = auctions[auctionIndex];
  if (amount <= auction.currentPrice) {
    return fail(res, `出价必须高于当前最高价 ¥${auction.currentPrice}`);
  }

  const newBid: Bid = {
    id: `b${Date.now()}`,
    auctionId: auction.id,
    userId: user.id,
    userName: user.username,
    amount,
    previousAmount: auction.currentPrice,
    createdAt: new Date().toISOString()
  };

  bids.push(newBid);
  auctions[auctionIndex] = { ...auction, currentPrice: amount };

  respond(res, newBid, 201);
});

app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, email, password } = req.body as {
      username: string;
      email: string;
      password: string;
    };

    if (!username || !email || !password) {
      return fail(res, '请填写完整的注册信息');
    }

    if (users.some((u) => u.email === email)) {
      return fail(res, '该邮箱已被注册');
    }

    if (users.some((u) => u.username === username)) {
      return fail(res, '该用户名已被使用');
    }

    if (password.length < 6) {
      return fail(res, '密码至少需要6位字符');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const newUser: User = {
      id: `u${Date.now()}`,
      username,
      email,
      passwordHash,
      avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(username)}`,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);

    const { passwordHash: _h, ...userInfo } = newUser;
    respond(res, userInfo, 201);
  } catch (err) {
    fail(res, '注册失败，请稍后重试', 500);
  }
});

app.post('/api/auth/login', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body as { email: string; password: string };

    if (!email || !password) {
      return fail(res, '请填写邮箱和密码');
    }

    const user = users.find((u) => u.email === email);
    if (!user) {
      return fail(res, '邮箱或密码错误');
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return fail(res, '邮箱或密码错误');
    }

    const { passwordHash: _h, ...userInfo } = user;
    respond(res, userInfo);
  } catch (err) {
    fail(res, '登录失败，请稍后重试', 500);
  }
});

app.get('/api/health', (_req: Request, res: Response): void => {
  respond(res, { status: 'ok', time: new Date().toISOString() });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction): void => {
  console.error('[Server Error]', err);
  fail(res, '服务器内部错误', 500);
});

app.listen(PORT, () => {
  console.log(`ArtifactAuction API server running at http://localhost:${PORT}`);
});

export default app;
