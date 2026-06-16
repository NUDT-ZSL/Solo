import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { ClothingItem, FavoriteItem } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const mockItems: ClothingItem[] = [
  {
    id: '1',
    name: '复古卡其色风衣',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20khaki%20trench%20coat%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '风衣',
    color: '#C3B091',
    colorName: '卡其色',
    season: ['春', '秋'],
    occasion: ['日常', '职场', '约会'],
    category: 'outer',
  },
  {
    id: '2',
    name: '格纹羊毛马甲',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20plaid%20wool%20vest%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '马甲',
    color: '#8B4513',
    colorName: '棕色',
    season: ['春', '秋', '冬'],
    occasion: ['日常', '学院'],
    category: 'outer',
  },
  {
    id: '3',
    name: '高腰阔腿牛仔裤',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20high%20waist%20wide%20leg%20jeans%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '阔腿裤',
    color: '#2C3E50',
    colorName: '深蓝色',
    season: ['春', '秋', '冬'],
    occasion: ['日常', '休闲'],
    category: 'bottom',
  },
  {
    id: '4',
    name: '米色直筒西装裤',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20beige%20straight%20leg%20suit%20pants%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '直筒裤',
    color: '#F5F0E1',
    colorName: '米色',
    season: ['春', '夏', '秋'],
    occasion: ['职场', '日常'],
    category: 'bottom',
  },
  {
    id: '5',
    name: '复古蓝色牛仔裤',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20blue%20denim%20jeans%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '牛仔裤',
    color: '#34495E',
    colorName: '蓝色',
    season: ['春', '秋', '冬'],
    occasion: ['日常', '休闲'],
    category: 'bottom',
  },
  {
    id: '6',
    name: '波点印花连衣裙',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20polka%20dot%20print%20dress%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '连衣裙',
    color: '#E74C3C',
    colorName: '红色',
    season: ['春', '夏'],
    occasion: ['约会', '派对', '日常'],
    category: 'dress',
  },
  {
    id: '7',
    name: '灯芯绒短裙',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20corduroy%20mini%20skirt%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '短裙',
    color: '#E67E22',
    colorName: '橙色',
    season: ['秋', '冬'],
    occasion: ['日常', '学院', '约会'],
    category: 'bottom',
  },
  {
    id: '8',
    name: '真丝白衬衫',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20white%20silk%20button%20down%20shirt%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '衬衫',
    color: '#FFFFFF',
    colorName: '白色',
    season: ['春', '夏', '秋'],
    occasion: ['职场', '日常', '约会'],
    category: 'top',
  },
  {
    id: '9',
    name: '黑色高领毛衣',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20black%20turtleneck%20sweater%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '高领毛衣',
    color: '#2C3E50',
    colorName: '黑色',
    season: ['秋', '冬'],
    occasion: ['日常', '职场'],
    category: 'top',
  },
  {
    id: '10',
    name: '米色针织开衫',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20beige%20knit%20cardigan%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '针织衫',
    color: '#F5F0E1',
    colorName: '米色',
    season: ['春', '秋'],
    occasion: ['日常', '学院'],
    category: 'top',
  },
  {
    id: '11',
    name: '军绿色短外套',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20army%20green%20cropped%20jacket%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '短外套',
    color: '#556B2F',
    colorName: '军绿色',
    season: ['春', '秋'],
    occasion: ['日常', '休闲'],
    category: 'outer',
  },
  {
    id: '12',
    name: '灰色西装外套',
    imageUrl: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20gray%20blazer%20fashion%20photography%20on%20white%20background&image_size=square_hd',
    style: '西装外套',
    color: '#95A5A6',
    colorName: '灰色',
    season: ['春', '秋', '冬'],
    occasion: ['职场', '日常'],
    category: 'outer',
  },
];

let favorites: FavoriteItem[] = [];

app.get('/api/items', (_req: Request, res: Response<ClothingItem[]>) => {
  res.json(mockItems);
});

app.get('/api/items/:id', (req: Request, res: Response<ClothingItem | { error: string }>) => {
  const item = mockItems.find((i) => i.id === req.params.id);
  if (!item) {
    res.status(404).json({ error: 'Item not found' });
    return;
  }
  res.json(item);
});

app.post('/api/upload', (req: Request, res: Response<{ id: string; imageUrl: string }>) => {
  const { image } = req.body;
  const id = uuidv4();
  const imageUrl = image || `https://picsum.photos/seed/${id}/400/400`;
  res.json({ id, imageUrl });
});

app.get('/api/user/favorites', (_req: Request, res: Response<FavoriteItem[]>) => {
  res.json(favorites);
});

app.post('/api/user/favorites', (req: Request<{}, {}, FavoriteItem>, res: Response<{ success: boolean }>) => {
  const item = req.body;
  if (!item.id) {
    item.id = uuidv4();
  }
  item.createdAt = Date.now();
  favorites.push(item);
  res.json({ success: true });
});

app.delete('/api/user/favorites/:id', (req: Request, res: Response<{ success: boolean }>) => {
  const index = favorites.findIndex((f) => f.id === req.params.id);
  if (index > -1) {
    favorites.splice(index, 1);
    res.json({ success: true });
  } else {
    res.status(404).json({ success: false });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
