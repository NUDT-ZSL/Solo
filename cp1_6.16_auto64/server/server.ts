import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Stall, OrderRequest, OrderResponse } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const mockStalls: Stall[] = [
  {
    id: 'veg-1',
    name: '青青蔬果摊',
    category: 'vegetable',
    categoryName: '蔬果',
    description: '新鲜直达，每日产地直供',
    soldCount: 328,
    products: [
      { id: 'veg-p1', name: '有机番茄', price: 12, description: '自然成熟，酸甜多汁，适合生吃或做沙拉', imageColor: '#E74C3C' },
      { id: 'veg-p2', name: '翠绿黄瓜', price: 6, description: '清脆爽口，低卡健康，夏日必备', imageColor: '#27AE60' },
      { id: 'veg-p3', name: '紫心胡萝卜', price: 9, description: '富含花青素，营养丰富，口感脆甜', imageColor: '#9B59B6' },
      { id: 'veg-p4', name: '新鲜苹果', price: 15, description: '红富士苹果，脆甜多汁，果香浓郁', imageColor: '#E74C3C' },
    ],
  },
  {
    id: 'veg-2',
    name: '田园鲜蔬铺',
    category: 'vegetable',
    categoryName: '蔬果',
    description: '有机种植，无农药残留',
    soldCount: 156,
    products: [
      { id: 'veg2-p1', name: '西兰花', price: 11, description: '翠绿鲜嫩，富含维生素，健身首选', imageColor: '#27AE60' },
      { id: 'veg2-p2', name: '甜玉米', price: 7, description: '颗粒饱满，香甜软糯，蒸煮皆宜', imageColor: '#F1C40F' },
    ],
  },
  {
    id: 'bakery-1',
    name: '香气烘培坊',
    category: 'bakery',
    categoryName: '烘焙',
    description: '现烤现卖，匠心制作',
    soldCount: 512,
    products: [
      { id: 'bak-p1', name: '法式牛角包', price: 14, description: '层层酥脆，黄油香浓，经典法式风味', imageColor: '#F39C12' },
      { id: 'bak-p2', name: '全麦吐司', price: 18, description: '高纤维全麦，健康营养，早餐必备', imageColor: '#D35400' },
      { id: 'bak-p3', name: '巧克力丹麦', price: 16, description: '浓郁巧克力夹心，外酥内软', imageColor: '#6E2C00' },
      { id: 'bak-p4', name: '蒜香法棍', price: 12, description: '酥脆外壳，蒜香四溢，佐餐佳品', imageColor: '#D4AC0D' },
    ],
  },
  {
    id: 'bakery-2',
    name: '麦香坊',
    category: 'bakery',
    categoryName: '烘焙',
    description: '手工面包，天然酵母',
    soldCount: 289,
    products: [
      { id: 'bak2-p1', name: '芝士贝果', price: 13, description: 'Q弹有嚼劲，芝士风味浓郁', imageColor: '#F4D03F' },
      { id: 'bak2-p2', name: '肉桂卷', price: 15, description: '温暖肉桂香，糖霜甜蜜', imageColor: '#A04000' },
    ],
  },
  {
    id: 'cooked-1',
    name: '老味道熟食',
    category: 'cooked',
    categoryName: '熟食',
    description: '传统工艺，家的味道',
    soldCount: 445,
    products: [
      { id: 'cook-p1', name: '红烧排骨', price: 38, description: '肉质软烂，酱香浓郁，下饭神器', imageColor: '#E74C3C' },
      { id: 'cook-p2', name: '卤味拼盘', price: 45, description: '多种卤味组合，越嚼越香', imageColor: '#922B21' },
      { id: 'cook-p3', name: '白切鸡', price: 52, description: '皮滑肉嫩，原汁原味，配姜葱酱', imageColor: '#FDEBD0' },
      { id: 'cook-p4', name: '酱牛肉', price: 48, description: '紧实有嚼劲，酱香醇厚，冷吃热吃皆宜', imageColor: '#7B241C' },
    ],
  },
  {
    id: 'cooked-2',
    name: '川湘小厨',
    category: 'cooked',
    categoryName: '熟食',
    description: '麻辣鲜香，地道川湘味',
    soldCount: 203,
    products: [
      { id: 'cook2-p1', name: '麻婆豆腐', price: 22, description: '麻辣鲜香，嫩滑入味', imageColor: '#C0392B' },
      { id: 'cook2-p2', name: '宫保鸡丁', price: 32, description: '酸甜微辣，花生香脆', imageColor: '#E67E22' },
    ],
  },
  {
    id: 'dessert-1',
    name: '甜蜜时光',
    category: 'dessert',
    categoryName: '甜点',
    description: '手作甜点，治愈心情',
    soldCount: 378,
    products: [
      { id: 'des-p1', name: '提拉米苏', price: 28, description: '意式经典，咖啡与马斯卡彭的完美融合', imageColor: '#6E2C00' },
      { id: 'des-p2', name: '草莓慕斯', price: 25, description: '新鲜草莓搭配轻盈慕斯，酸甜可口', imageColor: '#FF69B4' },
      { id: 'des-p3', name: '巧克力熔岩', price: 30, description: '外酥内流心，浓郁巧克力爆浆', imageColor: '#4A235A' },
      { id: 'des-p4', name: '抹茶千层', price: 27, description: '日式抹茶，层层细腻，回甘悠长', imageColor: '#52BE80' },
    ],
  },
  {
    id: 'dessert-2',
    name: '冰品小屋',
    category: 'dessert',
    categoryName: '甜点',
    description: '清凉一夏，甜蜜冰品',
    soldCount: 167,
    products: [
      { id: 'des2-p1', name: '芒果班戟', price: 22, description: '新鲜芒果果肉，奶油丝滑', imageColor: '#F39C12' },
      { id: 'des2-p2', name: '双皮奶', price: 16, description: '嫩滑奶香，传统广式甜品', imageColor: '#FEF9E7' },
    ],
  },
];

app.get('/api/market', (_req: Request, res: Response) => {
  res.json({ stalls: mockStalls });
});

app.post('/api/orders', (req: Request<{}, {}, OrderRequest>, res: Response<OrderResponse>) => {
  const orderId = uuidv4();
  res.json({ orderId, success: true });
});

app.listen(PORT, () => {
  console.log(`美食集市后端服务已启动: http://localhost:${PORT}`);
});

export default app;
