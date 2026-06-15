import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

export type EmotionTag = '喜' | '怒' | '哀' | '乐' | '平静';
export type TasteTag = '甜' | '咸' | '辣' | '苦';

export interface Food {
  id: string;
  name: string;
  emoji: string;
  color: string;
  taste: TasteTag;
}

export interface Entry {
  id: string;
  date: string;
  moodKeywords: string[];
  emotion: EmotionTag;
  emotionIntensity: number;
  food: Food;
}

const emotionColorMap: Record<EmotionTag, string> = {
  '喜': '#FFD700',
  '怒': '#FF4444',
  '哀': '#4A90D9',
  '乐': '#66BB6A',
  '平静': '#B0BEC5'
};

const emotionKeywordMap: Record<string, EmotionTag> = {
  '开心': '喜', '快乐': '喜', '喜悦': '喜', '高兴': '喜', '兴奋': '喜',
  '生气': '怒', '愤怒': '怒', '烦躁': '怒', '恼火': '怒', '气愤': '怒',
  '伤心': '哀', '难过': '哀', '悲伤': '哀', '郁闷': '哀', '失落': '哀',
  '愉快': '乐', '满足': '乐', '幸福': '乐', '欣慰': '乐', '轻松': '乐',
  '平静': '平静', '淡定': '平静', '安稳': '平静', '平和': '平静', '安静': '平静'
};

const foods: Food[] = [
  { id: 'f1', name: '红烧肉', emoji: '🍖', color: '#8B4513', taste: '咸' },
  { id: 'f2', name: '糖醋里脊', emoji: '🥩', color: '#FF6B6B', taste: '甜' },
  { id: 'f3', name: '麻婆豆腐', emoji: '🍲', color: '#E74C3C', taste: '辣' },
  { id: 'f4', name: '抹茶蛋糕', emoji: '🍰', color: '#90EE90', taste: '苦' },
  { id: 'f5', name: '草莓奶昔', emoji: '🥤', color: '#FFB6C1', taste: '甜' },
  { id: 'f6', name: '酸辣粉', emoji: '🍜', color: '#FF4500', taste: '辣' },
  { id: 'f7', name: '黑咖啡', emoji: '☕', color: '#4A3728', taste: '苦' },
  { id: 'f8', name: '芒果布丁', emoji: '🍮', color: '#FFD700', taste: '甜' },
  { id: 'f9', name: '盐水鸭', emoji: '🦆', color: '#F5DEB3', taste: '咸' },
  { id: 'f10', name: '焦糖布丁', emoji: '🍮', color: '#D2691E', taste: '甜' },
  { id: 'f11', name: '水煮鱼', emoji: '🐟', color: '#DC143C', taste: '辣' },
  { id: 'f12', name: '苦瓜炒蛋', emoji: '🥒', color: '#556B2F', taste: '苦' },
  { id: 'f13', name: '芝士汉堡', emoji: '🍔', color: '#DAA520', taste: '咸' },
  { id: 'f14', name: '提拉米苏', emoji: '🍰', color: '#8B7355', taste: '甜' },
  { id: 'f15', name: '关东煮', emoji: '🍢', color: '#D2B48C', taste: '咸' },
  { id: 'f16', name: '冰淇淋', emoji: '🍦', color: '#FFE4E1', taste: '甜' },
  { id: 'f17', name: '辣子鸡', emoji: '🍗', color: '#B22222', taste: '辣' },
  { id: 'f18', name: '苦丁茶', emoji: '🍵', color: '#556B2F', taste: '苦' },
  { id: 'f19', name: '小笼包', emoji: '🥟', color: '#FFF8DC', taste: '咸' },
  { id: 'f20', name: '马卡龙', emoji: '🍪', color: '#FFB6C1', taste: '甜' },
  { id: 'f21', name: '麻辣烫', emoji: '🍲', color: '#FF6347', taste: '辣' },
  { id: 'f22', name: '巧克力', emoji: '🍫', color: '#6B4423', taste: '苦' },
  { id: 'f23', name: '寿司', emoji: '🍣', color: '#FFFAF0', taste: '咸' },
  { id: 'f24', name: '蜂蜜蛋糕', emoji: '🍯', color: '#FFD700', taste: '甜' },
  { id: 'f25', name: '咖喱饭', emoji: '🍛', color: '#DAA520', taste: '辣' },
  { id: 'f26', name: '杏仁茶', emoji: '🥛', color: '#F5F5DC', taste: '苦' },
  { id: 'f27', name: '披萨', emoji: '🍕', color: '#FF8C00', taste: '咸' },
  { id: 'f28', name: '水果捞', emoji: '🍓', color: '#FF69B4', taste: '甜' },
  { id: 'f29', name: '剁椒鱼头', emoji: '🐠', color: '#FF4500', taste: '辣' },
  { id: 'f30', name: '陈皮', emoji: '🍊', color: '#D2691E', taste: '苦' },
  { id: 'f31', name: '牛肉面', emoji: '🍜', color: '#8B4513', taste: '咸' },
  { id: 'f32', name: '棉花糖', emoji: '🍬', color: '#FFC0CB', taste: '甜' },
  { id: 'f33', name: '螺蛳粉', emoji: '🍜', color: '#A0522D', taste: '辣' },
  { id: 'f34', name: '绿茶', emoji: '🍵', color: '#90EE90', taste: '苦' },
  { id: 'f35', name: '热狗', emoji: '🌭', color: '#DEB887', taste: '咸' },
  { id: 'f36', name: '果冻', emoji: '🍮', color: '#E6E6FA', taste: '甜' },
  { id: 'f37', name: '宫保鸡丁', emoji: '🍗', color: '#CD853F', taste: '辣' },
  { id: 'f38', name: '莲子羹', emoji: '🥣', color: '#F5F5DC', taste: '苦' },
  { id: 'f39', name: '三明治', emoji: '🥪', color: '#F5DEB3', taste: '咸' },
  { id: 'f40', name: '棒棒糖', emoji: '🍭', color: '#FF1493', taste: '甜' },
  { id: 'f41', name: '酸菜鱼', emoji: '🐟', color: '#9ACD32', taste: '辣' },
  { id: 'f42', name: '苦荞茶', emoji: '🍵', color: '#8B7355', taste: '苦' },
  { id: 'f43', name: '炸鸡翅', emoji: '🍗', color: '#DAA520', taste: '咸' },
  { id: 'f44', name: '彩虹蛋糕', emoji: '🎂', color: '#FF69B4', taste: '甜' },
  { id: 'f45', name: '毛血旺', emoji: '🍲', color: '#B22222', taste: '辣' },
  { id: 'f46', name: '苦咖啡冰淇淋', emoji: '🍨', color: '#6B4423', taste: '苦' },
  { id: 'f47', name: '饭团', emoji: '🍙', color: '#FAEBD7', taste: '咸' },
  { id: 'f48', name: '奶盖茶', emoji: '🧋', color: '#D2B48C', taste: '甜' },
  { id: 'f49', name: '小龙虾', emoji: '🦞', color: '#FF6347', taste: '辣' },
  { id: 'f50', name: '山药羹', emoji: '🥣', color: '#E8E8E8', taste: '苦' }
];

const entriesMap = new Map<string, Entry>();

function mapKeywordToEmotion(keywords: string[]): EmotionTag {
  const counts: Record<EmotionTag, number> = { '喜': 0, '怒': 0, '哀': 0, '乐': 0, '平静': 0 };
  
  for (const kw of keywords) {
    const emotion = emotionKeywordMap[kw];
    if (emotion) {
      counts[emotion]++;
    }
  }
  
  let maxCount = 0;
  let result: EmotionTag = '平静';
  
  for (const [emotion, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      result = emotion as EmotionTag;
    }
  }
  
  return result;
}

function calculateEmotionIntensity(emotion: EmotionTag): number {
  const base: Record<EmotionTag, number> = {
    '喜': 75, '怒': 85, '哀': 65, '乐': 80, '平静': 50
  };
  return base[emotion] + Math.floor(Math.random() * 20) - 10;
}

app.get('/api/entries', (_req: Request, res: Response) => {
  const entries = Array.from(entriesMap.values()).sort((a, b) => 
    new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  res.json(entries);
});

app.post('/api/entries', (req: Request, res: Response) => {
  const { date, moodKeywords, foodId } = req.body;
  
  if (!date || !moodKeywords || !foodId) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  
  const food = foods.find(f => f.id === foodId);
  if (!food) {
    return res.status(400).json({ error: '无效的食物ID' });
  }
  
  const emotion = mapKeywordToEmotion(moodKeywords);
  const emotionIntensity = calculateEmotionIntensity(emotion);
  const id = `e_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const entry: Entry = {
    id,
    date,
    moodKeywords,
    emotion,
    emotionIntensity,
    food
  };
  
  entriesMap.set(id, entry);
  res.status(201).json(entry);
});

app.delete('/api/entries/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!entriesMap.has(id)) {
    return res.status(404).json({ error: '记录不存在' });
  }
  
  entriesMap.delete(id);
  res.status(204).send();
});

app.get('/api/foods', (_req: Request, res: Response) => {
  res.json(foods);
});

app.get('/api/emotions', (_req: Request, res: Response) => {
  res.json({ emotionColorMap, emotionKeywordMap });
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
