import express, { Request, Response } from 'express';
import Datastore from 'nedb-promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import type { Trail, User, WeatherDay, WeatherResponse, Activity, LocationUpdate } from '../src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

const dataDir = path.join(__dirname, '..', 'data');
const trailsDb = Datastore.create(path.join(dataDir, 'trails.db'));
const usersDb = Datastore.create(path.join(dataDir, 'users.db'));
const activitiesDb = Datastore.create(path.join(dataDir, 'activities.db'));

await trailsDb.load();
await usersDb.load();
await activitiesDb.load();

const sampleTrails: Trail[] = [
  {
    _id: uuidv4(),
    title: '尼泊尔ABC大本营徒步',
    description: '经典的安娜普尔纳大本营徒步线路，穿越尼泊尔乡村和森林，欣赏壮丽的喜马拉雅山脉。',
    difficulty: 4,
    distance: 72.5,
    waypoints: [
      { id: uuidv4(), lat: 28.2096, lng: 83.9856, elevation: 800, terrain: '乡村公路', estimatedTime: 120, notes: '起始点：博卡拉' },
      { id: uuidv4(), lat: 28.2612, lng: 83.9023, elevation: 1430, terrain: '石阶小路', estimatedTime: 180, notes: '沿途有茶馆' },
      { id: uuidv4(), lat: 28.3175, lng: 83.8193, elevation: 2340, terrain: '森林步道', estimatedTime: 240, notes: '景色优美' },
      { id: uuidv4(), lat: 28.3712, lng: 83.7621, elevation: 3200, terrain: '高山草甸', estimatedTime: 300, notes: '注意高反' },
      { id: uuidv4(), lat: 28.4236, lng: 83.7089, elevation: 4130, terrain: '碎石路面', estimatedTime: 360, notes: 'ABC大本营' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=400&h=300&fit=crop',
    authorId: 'user-001',
    authorName: '山野行者',
    likes: 256,
    isPublic: true,
    createdAt: new Date().toISOString(),
    centerLat: 28.3175,
    centerLng: 83.8193
  },
  {
    _id: uuidv4(),
    title: '云南虎跳峡高线徒步',
    description: '世界著名的峡谷徒步线路，金沙江峡谷壮观景色，茶马古道遗迹。',
    difficulty: 3,
    distance: 22.0,
    waypoints: [
      { id: uuidv4(), lat: 27.2025, lng: 100.0932, elevation: 1800, terrain: '山间小路', estimatedTime: 150, notes: '起始点：桥头镇' },
      { id: uuidv4(), lat: 27.1823, lng: 100.0714, elevation: 2200, terrain: '悬崖步道', estimatedTime: 180, notes: '二十八道拐' },
      { id: uuidv4(), lat: 27.1621, lng: 100.0512, elevation: 2670, terrain: '石板路', estimatedTime: 200, notes: '中途客栈' },
      { id: uuidv4(), lat: 27.1425, lng: 100.0318, elevation: 2450, terrain: '下坡路段', estimatedTime: 160, notes: '终点：Tinas客栈' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop',
    authorId: 'user-002',
    authorName: '云游四方',
    likes: 189,
    isPublic: true,
    createdAt: new Date().toISOString(),
    centerLat: 27.1621,
    centerLng: 100.0512
  },
  {
    _id: uuidv4(),
    title: '黄山后山环线',
    description: '安徽黄山经典徒步路线，从云谷寺上山，游览北海、西海大峡谷，从前山慈光阁下山。',
    difficulty: 3,
    distance: 18.5,
    waypoints: [
      { id: uuidv4(), lat: 30.1312, lng: 118.1756, elevation: 890, terrain: '石阶', estimatedTime: 180, notes: '云谷寺入口' },
      { id: uuidv4(), lat: 30.1389, lng: 118.1698, elevation: 1668, terrain: '观景步道', estimatedTime: 120, notes: '白鹅岭' },
      { id: uuidv4(), lat: 30.1425, lng: 118.1612, elevation: 1690, terrain: '石板路', estimatedTime: 90, notes: '北海宾馆' },
      { id: uuidv4(), lat: 30.1356, lng: 118.1534, elevation: 1820, terrain: '悬空栈道', estimatedTime: 240, notes: '西海大峡谷' },
      { id: uuidv4(), lat: 30.1218, lng: 118.1578, elevation: 840, terrain: '下山石阶', estimatedTime: 180, notes: '慈光阁出口' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?w=400&h=300&fit=crop',
    authorId: 'user-001',
    authorName: '山野行者',
    likes: 312,
    isPublic: true,
    createdAt: new Date().toISOString(),
    centerLat: 30.1356,
    centerLng: 118.1612
  },
  {
    _id: uuidv4(),
    title: '稻城亚丁大转山',
    description: '四川甘孜州高原徒步线路，环绕三座神山，欣赏高山湖泊和草甸。',
    difficulty: 5,
    distance: 56.0,
    waypoints: [
      { id: uuidv4(), lat: 28.5236, lng: 100.3521, elevation: 3750, terrain: '土路', estimatedTime: 240, notes: '亚丁村起点' },
      { id: uuidv4(), lat: 28.5412, lng: 100.3345, elevation: 4200, terrain: '高原草甸', estimatedTime: 300, notes: '冲古寺' },
      { id: uuidv4(), lat: 28.5623, lng: 100.3123, elevation: 4600, terrain: '碎石坡', estimatedTime: 360, notes: '牛奶海' },
      { id: uuidv4(), lat: 28.5834, lng: 100.2987, elevation: 4800, terrain: '雪山垭口', estimatedTime: 420, notes: '五色海' },
      { id: uuidv4(), lat: 28.5678, lng: 100.3456, elevation: 4100, terrain: '河谷地带', estimatedTime: 300, notes: '返回起点' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1483728642387-6c3bdd6c93e5?w=400&h=300&fit=crop',
    authorId: 'user-003',
    authorName: '高原向导',
    likes: 445,
    isPublic: true,
    createdAt: new Date().toISOString(),
    centerLat: 28.5412,
    centerLng: 100.3345
  },
  {
    _id: uuidv4(),
    title: '武功山草甸穿越',
    description: '江西武功山高山草甸徒步，云海日出，连绵起伏的绿色草原。',
    difficulty: 2,
    distance: 28.0,
    waypoints: [
      { id: uuidv4(), lat: 27.4823, lng: 114.1756, elevation: 450, terrain: '石阶', estimatedTime: 180, notes: '沈子村起点' },
      { id: uuidv4(), lat: 27.4912, lng: 114.1623, elevation: 1200, terrain: '林间小路', estimatedTime: 150, notes: '铁蹄峰' },
      { id: uuidv4(), lat: 27.4987, lng: 114.1512, elevation: 1700, terrain: '草甸', estimatedTime: 120, notes: '金顶' },
      { id: uuidv4(), lat: 27.5056, lng: 114.1389, elevation: 1650, terrain: '山脊线', estimatedTime: 240, notes: '发云界' },
      { id: uuidv4(), lat: 27.5123, lng: 114.1256, elevation: 800, terrain: '下坡路', estimatedTime: 180, notes: '明月山出口' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?w=400&h=300&fit=crop',
    authorId: 'user-002',
    authorName: '云游四方',
    likes: 167,
    isPublic: true,
    createdAt: new Date().toISOString(),
    centerLat: 27.4987,
    centerLng: 114.1512
  },
  {
    _id: uuidv4(),
    title: '箭扣长城徒步',
    description: '北京周边经典野长城徒步线路，未修复的明代长城，风景壮观。',
    difficulty: 4,
    distance: 12.0,
    waypoints: [
      { id: uuidv4(), lat: 40.4321, lng: 116.5623, elevation: 520, terrain: '乡村路', estimatedTime: 90, notes: '西栅子村' },
      { id: uuidv4(), lat: 40.4389, lng: 116.5512, elevation: 780, terrain: '碎石路', estimatedTime: 120, notes: '箭扣段' },
      { id: uuidv4(), lat: 40.4456, lng: 116.5423, elevation: 980, terrain: '长城墙体', estimatedTime: 150, notes: '正北楼' },
      { id: uuidv4(), lat: 40.4523, lng: 116.5334, elevation: 860, terrain: '残破长城', estimatedTime: 120, notes: '慕田峪方向' }
    ],
    thumbnail: 'https://images.unsplash.com/photo-1508804185872-d7badad00f7d?w=400&h=300&fit=crop',
    authorId: 'user-004',
    authorName: '京城驴友',
    likes: 298,
    isPublic: true,
    createdAt: new Date().toISOString(),
    centerLat: 40.4389,
    centerLng: 116.5512
  }
];

const sampleUsers: User[] = [
  {
    _id: 'user-001',
    name: '山野行者',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    following: ['user-002', 'user-003'],
    followers: ['user-002', 'user-004'],
    totalDistance: 456.8,
    badges: [
      { id: 'badge-001', name: '百里挑一', description: '累计徒步100公里', icon: '🏅', earnedAt: '2025-03-15T00:00:00Z' },
      { id: 'badge-002', name: '千里征途', description: '累计徒步500公里', icon: '🎖️', earnedAt: '2025-08-20T00:00:00Z' }
    ]
  },
  {
    _id: 'user-002',
    name: '云游四方',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    following: ['user-001', 'user-004'],
    followers: ['user-001', 'user-003'],
    totalDistance: 234.5,
    badges: [
      { id: 'badge-001', name: '百里挑一', description: '累计徒步100公里', icon: '🏅', earnedAt: '2025-05-10T00:00:00Z' }
    ]
  },
  {
    _id: 'user-003',
    name: '高原向导',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop&crop=face',
    following: ['user-004'],
    followers: ['user-001', 'user-002', 'user-004'],
    totalDistance: 1250.3,
    badges: [
      { id: 'badge-001', name: '百里挑一', description: '累计徒步100公里', icon: '🏅', earnedAt: '2024-12-01T00:00:00Z' },
      { id: 'badge-002', name: '千里征途', description: '累计徒步500公里', icon: '🎖️', earnedAt: '2025-02-28T00:00:00Z' },
      { id: 'badge-003', name: '万里长城', description: '累计徒步1000公里', icon: '🏆', earnedAt: '2025-06-15T00:00:00Z' }
    ]
  },
  {
    _id: 'user-004',
    name: '京城驴友',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    following: ['user-001', 'user-002', 'user-003'],
    followers: ['user-002', 'user-003'],
    totalDistance: 178.2,
    badges: [
      { id: 'badge-001', name: '百里挑一', description: '累计徒步100公里', icon: '🏅', earnedAt: '2025-07-22T00:00:00Z' }
    ]
  },
  {
    _id: 'user-current',
    name: '我',
    avatar: 'https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=100&h=100&fit=crop&crop=face',
    following: ['user-001', 'user-002', 'user-003', 'user-004'],
    followers: [],
    totalDistance: 45.6,
    badges: []
  }
];

const sampleActivities: Activity[] = [
  {
    id: uuidv4(),
    userId: 'user-001',
    userName: '山野行者',
    userAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    type: 'trail_published',
    content: '发布了新轨迹「黄山后山环线」',
    timestamp: new Date(Date.now() - 3600000 * 2).toISOString(),
    trail: sampleTrails[2]
  },
  {
    id: uuidv4(),
    userId: 'user-003',
    userName: '高原向导',
    userAvatar: 'https://images.unsplash.com/photo-1599566150163-29194dcabd36?w=100&h=100&fit=crop&crop=face',
    type: 'badge_earned',
    content: '获得了「万里长城」徽章',
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    badge: sampleUsers[2].badges[2]
  },
  {
    id: uuidv4(),
    userId: 'user-002',
    userName: '云游四方',
    userAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face',
    type: 'location_update',
    content: '正在徒步「武功山草甸穿越」',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    location: {
      userId: 'user-002',
      userName: '云游四方',
      lat: 27.4987,
      lng: 114.1512,
      timestamp: new Date(Date.now() - 300000).toISOString(),
      trailId: sampleTrails[4]._id!
    }
  },
  {
    id: uuidv4(),
    userId: 'user-004',
    userName: '京城驴友',
    userAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    type: 'trail_published',
    content: '发布了新轨迹「箭扣长城徒步」',
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(),
    trail: sampleTrails[5]
  }
];

async function initDatabase() {
  const trailCount = await trailsDb.count({});
  if (trailCount === 0) {
    for (const trail of sampleTrails) {
      await trailsDb.insert(trail);
    }
    console.log('示例轨迹数据已初始化');
  }

  const userCount = await usersDb.count({});
  if (userCount === 0) {
    for (const user of sampleUsers) {
      await usersDb.insert(user);
    }
    console.log('示例用户数据已初始化');
  }

  const activityCount = await activitiesDb.count({});
  if (activityCount === 0) {
    for (const activity of sampleActivities) {
      await activitiesDb.insert(activity);
    }
    console.log('示例动态数据已初始化');
  }
}

initDatabase().catch(console.error);

app.get('/api/trails', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const trails = await trailsDb.find({ isPublic: true }).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await trailsDb.count({ isPublic: true });

    res.json({ trails, total, page, limit });
  } catch (error) {
    res.status(500).json({ error: '获取轨迹列表失败' });
  }
});

app.get('/api/trails/:id', async (req: Request, res: Response) => {
  try {
    const trail = await trailsDb.findOne({ _id: req.params.id });
    if (!trail) {
      return res.status(404).json({ error: '轨迹不存在' });
    }
    res.json(trail);
  } catch (error) {
    res.status(500).json({ error: '获取轨迹详情失败' });
  }
});

app.post('/api/trails', async (req: Request, res: Response) => {
  try {
    const trailData = req.body as Trail;
    const newTrail = {
      ...trailData,
      _id: uuidv4(),
      createdAt: new Date().toISOString(),
      likes: 0
    };
    const inserted = await trailsDb.insert(newTrail);
    res.status(201).json(inserted);
  } catch (error) {
    res.status(500).json({ error: '创建轨迹失败' });
  }
});

app.put('/api/trails/:id', async (req: Request, res: Response) => {
  try {
    const updated = await trailsDb.update({ _id: req.params.id }, { $set: req.body }, { returnUpdatedDocs: true });
    if (!updated) {
      return res.status(404).json({ error: '轨迹不存在' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新轨迹失败' });
  }
});

app.delete('/api/trails/:id', async (req: Request, res: Response) => {
  try {
    const removed = await trailsDb.remove({ _id: req.params.id }, {});
    if (removed === 0) {
      return res.status(404).json({ error: '轨迹不存在' });
    }
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除轨迹失败' });
  }
});

app.post('/api/trails/:id/like', async (req: Request, res: Response) => {
  try {
    const trail = await trailsDb.findOne({ _id: req.params.id });
    if (!trail) {
      return res.status(404).json({ error: '轨迹不存在' });
    }
    const updated = await trailsDb.update(
      { _id: req.params.id },
      { $set: { likes: trail.likes + 1 } },
      { returnUpdatedDocs: true }
    );
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '点赞失败' });
  }
});

app.post('/api/trails/:id/import', async (req: Request, res: Response) => {
  try {
    const trail = await trailsDb.findOne({ _id: req.params.id });
    if (!trail) {
      return res.status(404).json({ error: '轨迹不存在' });
    }
    const importedTrail = {
      ...trail,
      _id: uuidv4(),
      title: `${trail.title} (已导入)`,
      authorId: 'user-current',
      authorName: '我',
      isPublic: false,
      likes: 0,
      createdAt: new Date().toISOString()
    };
    const inserted = await trailsDb.insert(importedTrail);
    res.status(201).json(inserted);
  } catch (error) {
    res.status(500).json({ error: '导入轨迹失败' });
  }
});

app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await usersDb.findOne({ _id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

app.post('/api/users/:id/follow', async (req: Request, res: Response) => {
  try {
    const { followerId } = req.body;
    const user = await usersDb.findOne({ _id: req.params.id });
    const follower = await usersDb.findOne({ _id: followerId });

    if (!user || !follower) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const isFollowing = follower.following.includes(req.params.id);

    if (isFollowing) {
      await usersDb.update({ _id: followerId }, { $pull: { following: req.params.id } });
      await usersDb.update({ _id: req.params.id }, { $pull: { followers: followerId } });
    } else {
      await usersDb.update({ _id: followerId }, { $push: { following: req.params.id } });
      await usersDb.update({ _id: req.params.id }, { $push: { followers: followerId } });
    }

    const updatedUser = await usersDb.findOne({ _id: req.params.id });
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: '关注操作失败' });
  }
});

app.get('/api/users/:id/activities', async (req: Request, res: Response) => {
  try {
    const user = await usersDb.findOne({ _id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }

    const followingIds = [...user.following];
    const activities = await activitiesDb
      .find({ userId: { $in: followingIds } })
      .sort({ timestamp: -1 })
      .limit(50);

    res.json({ activities });
  } catch (error) {
    res.status(500).json({ error: '获取动态失败' });
  }
});

app.get('/api/users/:id/trails', async (req: Request, res: Response) => {
  try {
    const trails = await trailsDb
      .find({ authorId: req.params.id })
      .sort({ createdAt: -1 });
    res.json({ trails });
  } catch (error) {
    res.status(500).json({ error: '获取用户轨迹失败' });
  }
});

app.get('/api/weather', async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: '坐标参数无效' });
    }

    const mockWeatherData = generateMockWeather(lat, lng);
    res.json(mockWeatherData);
  } catch (error) {
    res.status(500).json({ error: '获取天气数据失败' });
  }
});

function generateMockWeather(lat: number, lng: number): WeatherResponse {
  const conditions = ['晴', '多云', '阴', '小雨', '中雨', '雷阵雨'];
  const days: WeatherDay[] = [];

  for (let i = 0; i < 3; i++) {
    const date = new Date();
    date.setDate(date.getDate() + i);

    const tempMin = Math.floor(Math.random() * 15) + 5;
    const tempMax = tempMin + Math.floor(Math.random() * 15) + 5;
    const precipitation = Math.floor(Math.random() * 100);
    const windSpeed = Math.floor(Math.random() * 40) + 5;
    const windDirection = Math.floor(Math.random() * 360);
    const condition = conditions[Math.floor(Math.random() * conditions.length)];

    let warningLevel: 'safe' | 'caution' | 'danger' = 'safe';
    if (precipitation > 70 || windSpeed > 30 || tempMax > 35 || tempMin < -5) {
      warningLevel = 'danger';
    } else if (precipitation > 40 || windSpeed > 20 || tempMax > 30 || tempMin < 0) {
      warningLevel = 'caution';
    }

    days.push({
      date: date.toISOString().split('T')[0],
      tempMin,
      tempMax,
      precipitation,
      windSpeed,
      windDirection,
      condition,
      warningLevel
    });
  }

  return {
    location: `坐标 ${lat.toFixed(4)}, ${lng.toFixed(4)}`,
    days
  };
}

app.post('/api/location', async (req: Request, res: Response) => {
  try {
    const locationData = req.body as LocationUpdate;
    const activity: Activity = {
      id: uuidv4(),
      userId: locationData.userId,
      userName: locationData.userName,
      type: 'location_update',
      content: `正在徒步中`,
      timestamp: locationData.timestamp,
      location: locationData
    };
    await activitiesDb.insert(activity);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '更新位置失败' });
  }
});

app.get('/api/locations/active', async (req: Request, res: Response) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    const activities = await activitiesDb
      .find({
        type: 'location_update',
        timestamp: { $gte: fiveMinutesAgo }
      })
      .sort({ timestamp: -1 });

    const uniqueUsers = new Map<string, Activity>();
    for (const activity of activities) {
      if (!uniqueUsers.has(activity.userId)) {
        uniqueUsers.set(activity.userId, activity);
      }
    }

    res.json({ locations: Array.from(uniqueUsers.values()) });
  } catch (error) {
    res.status(500).json({ error: '获取实时位置失败' });
  }
});

app.listen(PORT, () => {
  console.log(`徒步轨迹后端服务运行在 http://localhost:${PORT}`);
});
