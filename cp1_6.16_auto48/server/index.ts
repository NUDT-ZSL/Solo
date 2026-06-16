import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

export interface Material {
  id: string;
  name: string;
  color: string;
  rgb: [number, number, number];
  icon: string;
  description: string;
}

export interface RecipeTemplate {
  id: string;
  name: string;
  materials: string[];
  minQuality: number;
  description: string;
}

export interface BrewingRecord {
  id: string;
  recipeName: string;
  quality: number;
  timestamp: number;
  success: boolean;
  materialsUsed: string[];
  heat: number;
}

const materials: Material[] = [
  {
    id: 'moonstone',
    name: '月光石粉',
    color: '#E8D5E8',
    rgb: [232, 213, 232],
    icon: '🌙',
    description: '在满月之夜收集的神秘石粉'
  },
  {
    id: 'dragonscale',
    name: '龙鳞碎屑',
    color: '#E74C3C',
    rgb: [231, 76, 60],
    icon: '🐉',
    description: '远古巨龙遗落的鳞片碎片'
  },
  {
    id: 'glowshroom',
    name: '夜光菌汁',
    color: '#2ECC71',
    rgb: [46, 204, 113],
    icon: '🍄',
    description: '幽暗森林中发光蘑菇的汁液'
  },
  {
    id: 'crystal',
    name: '魔法水晶',
    color: '#3498DB',
    rgb: [52, 152, 219],
    icon: '💎',
    description: '蕴含纯净魔力的天然水晶'
  },
  {
    id: 'phoenixfeather',
    name: '凤凰羽毛',
    color: '#F39C12',
    rgb: [243, 156, 18],
    icon: '🪶',
    description: '不死鸟燃烧后重生的羽毛'
  },
  {
    id: 'starlight',
    name: '星尘精华',
    color: '#9B59B6',
    rgb: [155, 89, 182],
    icon: '✨',
    description: '从夜空中凝聚的星辰精华'
  }
];

const recipeTemplates: RecipeTemplate[] = [
  {
    id: 'healing',
    name: '生命恢复药剂',
    materials: ['moonstone', 'glowshroom'],
    minQuality: 3,
    description: '恢复生命力的神奇药水'
  },
  {
    id: 'strength',
    name: '力量增幅药剂',
    materials: ['dragonscale', 'phoenixfeather'],
    minQuality: 3,
    description: '暂时提升体力与力量'
  },
  {
    id: 'wisdom',
    name: '智慧药剂',
    materials: ['crystal', 'starlight'],
    minQuality: 3,
    description: '增强精神力与魔法悟性'
  },
  {
    id: 'fire_resist',
    name: '火焰抗性药剂',
    materials: ['dragonscale', 'crystal'],
    minQuality: 3,
    description: '获得对火焰的抵抗能力'
  },
  {
    id: 'night_vision',
    name: '夜视药剂',
    materials: ['glowshroom', 'starlight'],
    minQuality: 3,
    description: '在黑暗中也能看清事物'
  },
  {
    id: 'speed',
    name: '迅捷药剂',
    materials: ['phoenixfeather', 'moonstone'],
    minQuality: 3,
    description: '大幅提升移动速度'
  },
  {
    id: 'master',
    name: '大师万能药剂',
    materials: ['moonstone', 'dragonscale', 'glowshroom', 'crystal'],
    minQuality: 4,
    description: '传说中的万能药剂'
  },
  {
    id: 'cosmic',
    name: '星辰秘药',
    materials: ['starlight', 'crystal', 'phoenixfeather'],
    minQuality: 4,
    description: '蕴含星辰之力的神秘药水'
  }
];

let records: BrewingRecord[] = [];

app.get('/api/materials', (req, res) => {
  res.json(materials);
});

app.get('/api/recipes', (req, res) => {
  res.json(recipeTemplates);
});

app.post('/api/records', (req, res) => {
  const record: BrewingRecord = {
    id: uuidv4(),
    recipeName: req.body.recipeName,
    quality: req.body.quality,
    timestamp: Date.now(),
    success: req.body.success,
    materialsUsed: req.body.materialsUsed,
    heat: req.body.heat
  };
  records.push(record);
  res.status(201).json(record);
});

app.get('/api/records', (req, res) => {
  res.json(records);
});

app.listen(PORT, () => {
  console.log(`魔法药水工坊服务器运行在 http://localhost:${PORT}`);
});
