export interface User {
  id: string;
  nickname: string;
  avatar: string;
  password: string;
  token?: string;
}

export interface SpecialDrink {
  id: string;
  name: string;
  baristaNote: string;
  flavorTags: {
    acidity: number;
    sweetness: number;
    bitterness: number;
  };
  limitedCount: number;
  price: number;
  imageColor: string;
}

export interface OrderItem {
  userId: string;
  userName: string;
  drinkId: string;
  drinkName: string;
}

export interface GroupOrder {
  id: string;
  initiatorId: string;
  initiatorName: string;
  targetDrinkId: string;
  targetDrinkName: string;
  participants: OrderItem[];
  maxParticipants: number;
  deadline: number;
  tableNumber: number;
  status: 'active' | 'completed' | 'timeout';
  createdAt: number;
}

export interface HiddenMenu {
  id: string;
  name: string;
  story: string;
  imageSvg: string;
}

export interface Post {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  hiddenMenu: HiddenMenu;
  likes: string[];
  createdAt: number;
}

export const users: Map<string, User> = new Map();
export const tokens: Map<string, string> = new Map();

export const specials: SpecialDrink[] = [
  {
    id: 's1',
    name: '晨光埃塞俄比亚',
    baristaNote: '选用埃塞俄比亚日晒豆，带有草莓果酸与茉莉花香',
    flavorTags: { acidity: 4, sweetness: 3, bitterness: 1 },
    limitedCount: 20,
    price: 38,
    imageColor: '#A1887F'
  },
  {
    id: 's2',
    name: '焦糖日落拿铁',
    baristaNote: '哥伦比亚豆搭配自制焦糖酱，丝滑醇厚',
    flavorTags: { acidity: 1, sweetness: 4, bitterness: 2 },
    limitedCount: 30,
    price: 32,
    imageColor: '#8D6E63'
  },
  {
    id: 's3',
    name: '曼特宁夜曲',
    baristaNote: '印尼曼特宁深烘，草本与雪松尾韵',
    flavorTags: { acidity: 1, sweetness: 2, bitterness: 4 },
    limitedCount: 15,
    price: 35,
    imageColor: '#6D4C41'
  },
  {
    id: 's4',
    name: '橙香冷萃',
    baristaNote: '12小时低温慢萃，加入新鲜橙皮浸泡',
    flavorTags: { acidity: 3, sweetness: 3, bitterness: 2 },
    limitedCount: 25,
    price: 30,
    imageColor: '#BCAAA4'
  },
  {
    id: 's5',
    name: '榛果意式',
    baristaNote: '意式浓缩配榛果糖浆，浓郁坚果香气',
    flavorTags: { acidity: 1, sweetness: 3, bitterness: 3 },
    limitedCount: 40,
    price: 28,
    imageColor: '#5D4037'
  }
];

export const groupOrders: Map<string, GroupOrder> = new Map();
export const posts: Post[] = [];

export const hiddenMenus: HiddenMenu[] = [
  {
    id: 'h1',
    name: '月光协奏曲',
    story: '传说在满月之夜调制的咖啡，融合了牙买加蓝山与香草豆荚，入口如银色月光般温柔，尾韵带着淡淡的紫罗兰花香。',
    imageSvg: ''
  },
  {
    id: 'h2',
    name: '星空玛奇朵',
    story: '灵感来自夏夜银河，蝶豆花染成的蓝色奶泡覆盖在浓缩之上，搅拌后呈现梦幻紫渐层，酸甜交织。',
    imageSvg: ''
  },
  {
    id: 'h3',
    name: '森林漫步',
    story: '加入了松木熏制的糖浆和榛果碎，仿佛置身清晨的北欧森林，每一口都是大地的馈赠。',
    imageSvg: ''
  },
  {
    id: 'h4',
    name: '海风吹拂',
    story: '海盐焦糖与冷萃的碰撞，咸甜之间是夏日海边的记忆，顶部点缀一片风干柠檬。',
    imageSvg: ''
  },
  {
    id: 'h5',
    name: '玫瑰密语',
    story: '大马士革玫瑰露与埃塞俄比亚耶加雪菲的完美融合，花香与果酸在舌尖绽放，像一封情书。',
    imageSvg: ''
  },
  {
    id: 'h6',
    name: '熔岩可可',
    story: '70%黑巧克力融化在浓缩咖啡中，撒上辣椒粉带来惊喜的微辣，是冬天最温暖的拥抱。',
    imageSvg: ''
  },
  {
    id: 'h7',
    name: '柚子清风',
    story: '日式柚子茶与手冲咖啡的跨界合作，清新的柑橘调让每个午后都变得轻盈。',
    imageSvg: ''
  },
  {
    id: 'h8',
    name: '伯爵之梦',
    story: '伯爵茶的佛手柑香气浸润咖啡，加入薰衣草蜂蜜，适合在慵懒的午后慢慢品味。',
    imageSvg: ''
  },
  {
    id: 'h9',
    name: '琥珀时光',
    story: '陈年朗姆酒浸泡的咖啡豆与焦糖的结合，像一杯液态的时间，醇厚而有故事。',
    imageSvg: ''
  },
  {
    id: 'h10',
    name: '薄荷奇缘',
    story: '新鲜薄荷叶捣出的汁液与冰美式相遇，清凉透顶的夏日限定，让人念念不忘。',
    imageSvg: ''
  }
];

export const recommendedDrinks = [
  { id: 'r1', name: '埃塞俄比亚手冲', region: '非洲', roast: '浅烘', brew: '手冲', desc: '明亮果酸，花香四溢' },
  { id: 'r2', name: '肯尼亚AA', region: '非洲', roast: '浅烘', brew: '意式浓缩', desc: '黑醋栗与番茄酸感' },
  { id: 'r3', name: '耶加雪菲冷萃', region: '非洲', roast: '浅烘', brew: '冷萃', desc: '柔和果酸，茶感清爽' },
  { id: 'r4', name: '非洲法压', region: '非洲', roast: '浅烘', brew: '法压壶', desc: '醇厚body，莓果甜感' },
  { id: 'r5', name: '曼特宁手冲', region: '印度尼西亚', roast: '深烘', brew: '手冲', desc: '草本香料，大地气息' },
  { id: 'r6', name: '黄金曼特宁', region: '印度尼西亚', roast: '深烘', brew: '法压壶', desc: '浓郁醇厚，尾韵悠长' },
  { id: 'r7', name: '印尼意式', region: '印度尼西亚', roast: '深烘', brew: '意式浓缩', desc: '厚实crema，烟熏感' },
  { id: 'r8', name: '巴厘岛冷萃', region: '印度尼西亚', roast: '中烘', brew: '冷萃', desc: '平衡顺滑，低酸' },
  { id: 'r9', name: '哥伦比亚慧兰', region: '中南美洲', roast: '中烘', brew: '手冲', desc: '焦糖甜感，坚果调性' },
  { id: 'r10', name: '巴西喜拉多', region: '中南美洲', roast: '中烘', brew: '意式浓缩', desc: '巧克力坚果，平衡经典' },
  { id: 'r11', name: '哥斯达黎加', region: '中南美洲', roast: '中烘', brew: '冷萃', desc: '蜜糖甜感，柔和干净' },
  { id: 'r12', name: '危地马拉法压', region: '中南美洲', roast: '中烘', brew: '法压壶', desc: '可可坚果，圆润厚实' },
  { id: 'r13', name: '云南手冲', region: '亚洲', roast: '中烘', brew: '手冲', desc: '醇厚饱满，红糖甜感' },
  { id: 'r14', name: '亚洲深烘意式', region: '亚洲', roast: '深烘', brew: '意式浓缩', desc: '焦糖果香，浓郁厚实' },
  { id: 'r15', name: '极深烘拼配', region: '亚洲', roast: '极深烘', brew: '法压壶', desc: '炭烧风味，厚重浓烈' }
];

export function generateToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
