import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const dbPath = join(__dirname, '..', 'data');
const menuDb = Datastore.create(join(dbPath, 'menu.db'));
const ordersDb = Datastore.create(join(dbPath, 'orders.db'));
const userDb = Datastore.create(join(dbPath, 'user.db'));
const rewardsDb = Datastore.create(join(dbPath, 'rewards.db'));

const seedMenu = [
  {
    id: 'm1',
    name: '经典美式',
    description: '精选阿拉比卡咖啡豆，口感醇厚回甘',
    price: 28,
    category: '热饮',
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm2',
    name: '香浓拿铁',
    description: '绵密奶泡与浓缩咖啡的完美融合',
    price: 32,
    category: '热饮',
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm3',
    name: '焦糖玛奇朵',
    description: '香甜焦糖与浓郁咖啡的浪漫邂逅',
    price: 35,
    category: '热饮',
    image: 'https://images.unsplash.com/photo-1485808191679-5f86510681a2?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm4',
    name: '冰美式',
    description: '清爽冰凉，唤醒活力一整天',
    price: 26,
    category: '冷饮',
    image: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm5',
    name: '冰拿铁',
    description: '冰爽牛奶与浓缩咖啡的经典组合',
    price: 30,
    category: '冷饮',
    image: 'https://images.unsplash.com/photo-1578314675249-a6910f80cc4e?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm6',
    name: '冰摩卡',
    description: '巧克力与咖啡的甜蜜冰爽体验',
    price: 33,
    category: '冷饮',
    image: 'https://images.unsplash.com/photo-1577968897966-3d4325b36b61?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm7',
    name: '手冲耶加雪菲',
    description: '花香柑橘调，层次丰富的精品手冲',
    price: 42,
    category: '手冲',
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm8',
    name: '手冲曼特宁',
    description: '草本与坚果香，醇厚饱满的深焙风味',
    price: 40,
    category: '手冲',
    image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm9',
    name: '提拉米苏',
    description: '意式经典，咖啡与奶酪的完美结合',
    price: 28,
    category: '甜品',
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm10',
    name: '芝士蛋糕',
    description: '浓郁顺滑，入口即化的纽约风芝士',
    price: 26,
    category: '甜品',
    image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm11',
    name: '可颂',
    description: '法式黄油可颂，外酥内软',
    price: 18,
    category: '甜品',
    image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'm12',
    name: '冰摇柠檬茶',
    description: '清新柠檬与红茶的冰爽碰撞',
    price: 22,
    category: '冷饮',
    image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=400&h=400&fit=crop',
    active: true,
  },
];

const seedRewards = [
  {
    id: 'r1',
    name: '免费美式咖啡',
    description: '兑换一杯经典美式咖啡',
    points: 50,
    image: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'r2',
    name: '免费拿铁',
    description: '兑换一杯香浓拿铁',
    points: 80,
    image: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'r3',
    name: '免费提拉米苏',
    description: '兑换一块提拉米苏蛋糕',
    points: 60,
    image: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?w=400&h=400&fit=crop',
    active: true,
  },
  {
    id: 'r4',
    name: '手工手冲咖啡',
    description: '兑换一杯精品手冲咖啡',
    points: 100,
    image: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=400&h=400&fit=crop',
    active: true,
  },
];

const seedUser = {
  id: 'u1',
  name: '咖啡爱好者',
  points: 128,
  level: '金卡会员',
};

const seedOrders = [
  {
    id: 'o1',
    items: [
      { menuItemId: 'm1', name: '经典美式', price: 28, quantity: 2 },
      { menuItemId: 'm9', name: '提拉米苏', price: 28, quantity: 1 },
    ],
    total: 84,
    pointsEarned: 8,
    status: 'completed',
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'o2',
    items: [
      { menuItemId: 'm2', name: '香浓拿铁', price: 32, quantity: 1 },
    ],
    total: 32,
    pointsEarned: 3,
    status: 'completed',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'o3',
    items: [
      { menuItemId: 'm5', name: '冰拿铁', price: 30, quantity: 2 },
      { menuItemId: 'm11', name: '可颂', price: 18, quantity: 2 },
    ],
    total: 96,
    pointsEarned: 9,
    status: 'preparing',
    createdAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: 'o4',
    items: [
      { menuItemId: 'm7', name: '手冲耶加雪菲', price: 42, quantity: 1 },
    ],
    total: 42,
    pointsEarned: 4,
    status: 'pending',
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
];

async function seedDatabase() {
  try {
    const menuCount = await menuDb.count({});
    if (menuCount === 0) {
      await menuDb.insert(seedMenu);
      console.log('Menu seeded');
    }

    const rewardsCount = await rewardsDb.count({});
    if (rewardsCount === 0) {
      await rewardsDb.insert(seedRewards);
      console.log('Rewards seeded');
    }

    const userCount = await userDb.count({});
    if (userCount === 0) {
      await userDb.insert(seedUser);
      console.log('User seeded');
    }

    const ordersCount = await ordersDb.count({});
    if (ordersCount === 0) {
      await ordersDb.insert(seedOrders);
      console.log('Orders seeded');
    }
  } catch (err) {
    console.error('Seed error:', err);
  }
}

app.get('/api/menu', async (req, res) => {
  try {
    const { category, includeInactive } = req.query;
    const query: any = {};
    if (includeInactive !== 'true') {
      query.active = true;
    }
    if (category && category !== 'all') {
      query.category = category;
    }
    const menu = await menuDb.find(query);
    res.json(menu);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

app.get('/api/menu/:id', async (req, res) => {
  try {
    const item = await menuDb.findOne({ id: req.params.id });
    if (!item) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch menu item' });
  }
});

app.post('/api/menu', async (req, res) => {
  try {
    const { name, description, price, category, image } = req.body;
    if (!name || !description || !price || !category || !image) {
      return res.status(400).json({ error: 'All fields are required' });
    }
    if (typeof price !== 'number' || price <= 0) {
      return res.status(400).json({ error: 'Price must be a positive number' });
    }
    const newItem = {
      id: uuidv4(),
      name,
      description,
      price,
      category,
      image,
      active: true,
    };
    const inserted = await menuDb.insert(newItem);
    res.status(201).json(inserted);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

app.put('/api/menu/:id', async (req, res) => {
  try {
    const { name, description, price, category, image, active } = req.body;
    const existing = await menuDb.findOne({ id: req.params.id });
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    const updated = {
      ...existing,
      name: name ?? existing.name,
      description: description ?? existing.description,
      price: price ?? existing.price,
      category: category ?? existing.category,
      image: image ?? existing.image,
      active: active !== undefined ? active : existing.active,
    };
    await menuDb.update({ id: req.params.id }, { $set: updated });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    const existing = await menuDb.findOne({ id: req.params.id });
    if (!existing) {
      return res.status(404).json({ error: 'Menu item not found' });
    }
    await menuDb.update({ id: req.params.id }, { $set: { active: false } });
    res.json({ message: 'Menu item deactivated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to deactivate menu item' });
  }
});

app.get('/api/order', async (req, res) => {
  try {
    const orders = await ordersDb.find({}).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

app.get('/api/order/:id', async (req, res) => {
  try {
    const order = await ordersDb.findOne({ id: req.params.id });
    if (!order) {
      return res.status(404).json({ error: 'Order not found' });
    }
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch order' });
  }
});

app.post('/api/order', async (req, res) => {
  try {
    const { items } = req.body;
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Items are required' });
    }

    let total = 0;
    for (const item of items) {
      if (!item.menuItemId || !item.quantity || item.quantity <= 0) {
        return res.status(400).json({ error: 'Invalid order item' });
      }
      const menuItem = await menuDb.findOne({ id: item.menuItemId });
      if (!menuItem || !menuItem.active) {
        return res.status(400).json({ error: `Item ${item.menuItemId} not available` });
      }
      total += menuItem.price * item.quantity;
    }

    const pointsEarned = Math.floor(total / 10);

    const newOrder = {
      id: uuidv4(),
      items: items.map((item: any) => {
        const menuItem = seedMenu.find((m) => m.id === item.menuItemId) || {};
        return {
          menuItemId: item.menuItemId,
          name: item.name || menuItem.name,
          price: item.price || menuItem.price || 0,
          quantity: item.quantity,
        };
      }),
      total,
      pointsEarned,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const user = await userDb.findOne({ id: 'u1' });
    if (user) {
      await userDb.update({ id: 'u1' }, { $set: { points: user.points + pointsEarned } });
    }

    const inserted = await ordersDb.insert(newOrder);
    res.status(201).json(inserted);
  } catch (err) {
    console.error('Order error:', err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

app.put('/api/order/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'preparing', 'completed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    const existing = await ordersDb.findOne({ id: req.params.id });
    if (!existing) {
      return res.status(404).json({ error: 'Order not found' });
    }
    await ordersDb.update({ id: req.params.id }, { $set: { status } });
    res.json({ ...existing, status });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update order status' });
  }
});

app.get('/api/user', async (req, res) => {
  try {
    const user = await userDb.findOne({ id: 'u1' });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

app.get('/api/user/points-history', async (req, res) => {
  try {
    const orders = await ordersDb.find({}).sort({ createdAt: -1 });
    const history = orders.map((order: any) => ({
      id: order.id,
      type: 'earn',
      points: order.pointsEarned,
      description: `消费 ¥${order.total}`,
      createdAt: order.createdAt,
    }));
    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch points history' });
  }
});

app.get('/api/reward', async (req, res) => {
  try {
    const rewards = await rewardsDb.find({ active: true });
    res.json(rewards);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch rewards' });
  }
});

app.post('/api/reward/:id/redeem', async (req, res) => {
  try {
    const reward = await rewardsDb.findOne({ id: req.params.id });
    if (!reward || !reward.active) {
      return res.status(404).json({ error: 'Reward not available' });
    }

    const user = await userDb.findOne({ id: 'u1' });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.points < reward.points) {
      return res.status(400).json({ error: 'Insufficient points' });
    }

    await userDb.update({ id: 'u1' }, { $set: { points: user.points - reward.points } });

    const redemption = {
      id: uuidv4(),
      rewardId: reward.id,
      rewardName: reward.name,
      pointsSpent: reward.points,
      type: 'redeem',
      createdAt: new Date().toISOString(),
    };

    res.json({
      success: true,
      remainingPoints: user.points - reward.points,
      redemption,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to redeem reward' });
  }
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

async function startServer() {
  await seedDatabase();
  app.listen(PORT, () => {
    console.log(`BrewBook server running on http://localhost:${PORT}`);
  });
}

startServer();
