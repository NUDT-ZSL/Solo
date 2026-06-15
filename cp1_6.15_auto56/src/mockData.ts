import { v4 as uuidv4 } from 'uuid';
import { Activity, User, Plant, Bid } from './types';

const today = new Date();
const nextMonth = new Date(today);
nextMonth.setMonth(nextMonth.getMonth() + 1);
const lastMonth = new Date(today);
lastMonth.setMonth(lastMonth.getMonth() - 1);

export const mockUsers: User[] = [
  { id: uuidv4(), name: '张小花', avatar: 'https://i.pravatar.cc/150?img=1' },
  { id: uuidv4(), name: '李园艺', avatar: 'https://i.pravatar.cc/150?img=2' },
  { id: uuidv4(), name: '王多肉', avatar: 'https://i.pravatar.cc/150?img=3' },
  { id: uuidv4(), name: '陈绿萝', avatar: 'https://i.pravatar.cc/150?img=4' },
  { id: uuidv4(), name: '赵月季', avatar: 'https://i.pravatar.cc/150?img=5' },
];

const plantNames = [
  { name: '绿萝', variety: '大叶绿萝' },
  { name: '多肉', variety: '桃蛋' },
  { name: '月季', variety: '朱丽叶' },
  { name: '吊兰', variety: '金边吊兰' },
  { name: '仙人掌', variety: '金琥' },
  { name: '发财树', variety: '迷你发财树' },
  { name: '君子兰', variety: '大花君子兰' },
  { name: '蝴蝶兰', variety: '满天红' },
  { name: '薄荷', variety: '留兰香薄荷' },
  { name: '芦荟', variety: '库拉索芦荟' },
];

const plantPhotos = [
  'https://images.unsplash.com/photo-1459411552884-841db9b3cc2a?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1485955900006-10f4d324d411?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1508610048659-a06b669e3321?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1509423350716-97f9360b4e09?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1463320898484-cdee8141c787?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1490750967868-88aa4486c946?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1561181286-d3fee7d55364?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=300&h=300&fit=crop',
  'https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?w=300&h=300&fit=crop',
];

function generatePlants(activityId: string, count: number, sellerId: string): Plant[] {
  const plants: Plant[] = [];
  for (let i = 0; i < count; i++) {
    const plantInfo = plantNames[Math.floor(Math.random() * plantNames.length)];
    const startPrice = Math.floor(Math.random() * 200) + 10;
    const hasBid = Math.random() > 0.3;
    const bidCount = hasBid ? Math.floor(Math.random() * 5) + 1 : 0;
    const bidHistory: Bid[] = [];
    let currentPrice = startPrice;
    let highestBidder: string | null = null;

    for (let j = 0; j < bidCount; j++) {
      const bidder = mockUsers[Math.floor(Math.random() * mockUsers.length)];
      const bidAmount = currentPrice + Math.floor(Math.random() * 50) + 1;
      currentPrice = bidAmount;
      highestBidder = bidder.name;
      bidHistory.push({
        id: uuidv4(),
        userId: bidder.id,
        userName: bidder.name,
        amount: bidAmount,
        timestamp: new Date(today.getTime() - Math.random() * 86400000),
      });
    }

    plants.push({
      id: uuidv4(),
      name: plantInfo.name,
      variety: plantInfo.variety,
      description: `这是一盆健康的${plantInfo.variety}，养护得当，长势良好。适合室内摆放，净化空气。`,
      photoUrl: plantPhotos[i % plantPhotos.length],
      startPrice,
      currentPrice,
      highestBidder,
      sellerId,
      activityId,
      status: 'active',
      bidHistory,
    });
  }
  return plants;
}

function createActivity(
  name: string,
  date: Date,
  location: string,
  description: string,
  status: Activity['status'],
  plantCount: number,
  organizerIndex: number
): Activity {
  const id = uuidv4();
  const organizer = mockUsers[organizerIndex];
  const plants = generatePlants(id, plantCount, organizer.id);
  if (status === 'ended') {
    plants.forEach(p => { p.status = 'sold'; });
  }
  return {
    id,
    name,
    date,
    location,
    description,
    status,
    organizerId: organizer.id,
    plants,
  };
}

export const mockActivities: Activity[] = [
  createActivity(
    '春季多肉植物交换会',
    nextMonth,
    '城市公园花卉展区',
    '欢迎各位多肉爱好者带上你们的小肉肉来参加交换活动，现场还有专家讲座哦！',
    'upcoming',
    3,
    0
  ),
  createActivity(
    '月季花友见面会',
    today,
    '社区活动中心二楼',
    '月季爱好者齐聚一堂，分享养护经验，交换月季插穗和盆栽。',
    'ongoing',
    4,
    1
  ),
  createActivity(
    '室内绿植交换市集',
    lastMonth,
    '花卉市场B区',
    '往期活动回顾：室内绿植爱好者的盛大聚会，成功交换了50余盆绿植。',
    'ended',
    5,
    2
  ),
  createActivity(
    '兰花鉴赏交流会',
    new Date(today.getTime() + 7 * 86400000),
    '市文化馆',
    '兰花专题交流活动，品鉴名贵兰花，学习兰花养护技巧。',
    'upcoming',
    2,
    3
  ),
  createActivity(
    '香草植物分享会',
    new Date(today.getTime() + 14 * 86400000),
    '生态农场',
    '薄荷、罗勒、迷迭香等香草植物的交换与分享，现场制作香草茶。',
    'upcoming',
    3,
    4
  ),
  createActivity(
    '仙人掌多肉联展',
    new Date(today.getTime() - 7 * 86400000),
    '植物园温室',
    '往期活动：仙人掌与多肉植物联合展览，展出珍稀品种100余种。',
    'ended',
    4,
    0
  ),
];

export const currentUser: User = mockUsers[0];

export function getMockActivities(): Activity[] {
  return mockActivities;
}

export function getMockUsers(): User[] {
  return mockUsers;
}

export function getCurrentUser(): User {
  return currentUser;
}
