import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(express.json({ limit: '10mb' }));
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

type Category = '手绘' | '复古' | '和风' | '简约' | '节日';

interface Material {
  id: string;
  name: string;
  thumbnail: string;
  image: string;
  category: Category;
  tags: string[];
  width: number;
  height: number;
}

const CATEGORIES: Category[] = ['手绘', '复古', '和风', '简约', '节日'];

const PRESET_TAGS = [
  '花卉', '植物', '动物', '星星', '月亮', '云朵', '心形',
  '边框', '装饰线', '气泡', '标签', '箭头', '文字框',
  '春季', '夏季', '秋季', '冬季', '生日', '圣诞', '新年',
  '水彩', '油画', '线描', '涂鸦', '胶带', '贴纸', '印章'
];

const generatePlaceholderImage = (seed: string, w: number, h: number, color: string): string => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <defs>
        <linearGradient id="g-${seed}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${color};stop-opacity:0.9" />
          <stop offset="100%" style="stop-color:${color};stop-opacity:0.5" />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#g-${seed})" rx="8"/>
      <circle cx="${w/2}" cy="${h/2}" r="${Math.min(w,h)/4}" fill="#FFF8F0" opacity="0.6"/>
      <text x="${w/2}" y="${h/2 + 8}" text-anchor="middle" font-size="${Math.min(w,h)/6}" fill="#8B7355" font-family="Georgia, serif" font-style="italic">${seed}</text>
    </svg>
  `.trim();
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
};

const colorPalette = [
  '#F5C6AA', '#F7D9C4', '#E8C4C4', '#C9DABF', '#B4CFB0',
  '#94B49F', '#DFD3C3', '#D7B899', '#C8B6A6', '#A77979',
  '#C69774', '#B2A4FF', '#FFB4B4', '#FFDEB4', '#DFE8CC'
];

const namePatterns = [
  { prefix: '花漾', suffix: '贴纸', emoji: '🌸' },
  { prefix: '复古', suffix: '胶带', emoji: '📜' },
  { prefix: '和风', suffix: '印章', emoji: '🎋' },
  { prefix: '简约', suffix: '边框', emoji: '✨' },
  { prefix: '节日', suffix: '装饰', emoji: '🎉' },
  { prefix: '梦境', suffix: '素材', emoji: '🌙' },
  { prefix: '森林', suffix: '元素', emoji: '🌿' },
  { prefix: '星空', suffix: '点缀', emoji: '⭐' }
];

const generateMockMaterials = (): Material[] => {
  const materials: Material[] = [];
  
  for (let i = 0; i < 48; i++) {
    const category = CATEGORIES[i % CATEGORIES.length];
    const pattern = namePatterns[i % namePatterns.length];
    const color = colorPalette[i % colorPalette.length];
    const widths = [150, 180, 200, 220, 160, 190];
    const heights = [150, 200, 180, 240, 170, 210];
    const w = widths[i % widths.length];
    const h = heights[i % heights.length];
    const name = `${pattern.prefix}${String(i + 1).padStart(2, '0')}${pattern.suffix}`;
    const seed = pattern.emoji;
    
    const tagCount = (i % 3) + 1;
    const tags: string[] = [];
    for (let j = 0; j < tagCount; j++) {
      const tag = PRESET_TAGS[(i + j * 7) % PRESET_TAGS.length];
      if (!tags.includes(tag)) tags.push(tag);
    }
    tags.push(category);
    
    materials.push({
      id: uuidv4(),
      name,
      thumbnail: generatePlaceholderImage(seed, w, h, color),
      image: generatePlaceholderImage(seed, w * 2, h * 2, color),
      category,
      tags,
      width: w * 2,
      height: h * 2
    });
  }
  
  return materials;
};

let materials = generateMockMaterials();

app.get('/api/materials', (req: Request, res: Response) => {
  const { category, search, page = '1', limit = '6' } = req.query;
  let filtered = [...materials];
  
  if (category && category !== '全部') {
    filtered = filtered.filter(m => m.category === category);
  }
  
  if (search) {
    const keyword = String(search).toLowerCase();
    filtered = filtered.filter(m => 
      m.name.toLowerCase().includes(keyword) ||
      m.tags.some(t => t.toLowerCase().includes(keyword))
    );
  }
  
  const pageNum = parseInt(String(page));
  const limitNum = parseInt(String(limit));
  const start = (pageNum - 1) * limitNum;
  const end = start + limitNum;
  const paged = filtered.slice(start, end);
  
  res.json({
    data: paged,
    total: filtered.length,
    page: pageNum,
    limit: limitNum,
    hasMore: end < filtered.length
  });
});

app.get('/api/materials/:id', (req: Request, res: Response) => {
  const material = materials.find(m => m.id === req.params.id);
  if (!material) {
    res.status(404).json({ error: '素材不存在' });
  } else {
    res.json({ data: material });
  }
});

app.get('/api/categories', (req: Request, res: Response) => {
  res.json({ data: CATEGORIES });
});

app.get('/api/tags', (req: Request, res: Response) => {
  res.json({ data: PRESET_TAGS });
});

app.post('/api/materials', (req: Request, res: Response) => {
  const { name, image, category, tags } = req.body;
  
  if (!tags || tags.length === 0) {
    return res.status(400).json({ error: '至少选择1个标签' });
  }
  
  const newMaterial: Material = {
    id: uuidv4(),
    name: name || '新素材',
    thumbnail: image,
    image,
    category: category || CATEGORIES[0],
    tags,
    width: 300,
    height: 300
  };
  
  materials = [newMaterial, ...materials];
  res.json({ data: newMaterial });
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
