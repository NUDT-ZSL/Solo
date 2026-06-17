import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { extractColorsFromBuffer, extractColorsFromHexArray, ExtractedColor } from './colorExtractor';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

interface Artwork {
  id: string;
  title: string;
  colors: string[];
  thumbnailColor: string;
  createdAt: number;
}

const artworkStore: Map<string, Artwork> = new Map();

const presetArtworks: Omit<Artwork, 'createdAt'>[] = [
  { id: '1', title: '春日樱花', colors: ['#FFB7C5', '#FF69B4', '#87CEEB', '#98FB98', '#FFFACD'], thumbnailColor: '#FFB7C5' },
  { id: '2', title: '深海秘境', colors: ['#006994', '#00CED1', '#20B2AA', '#48D1CC', '#E0FFFF'], thumbnailColor: '#006994' },
  { id: '3', title: '秋叶飘零', colors: ['#D2691E', '#CD853F', '#FF8C00', '#B8860B', '#8B4513'], thumbnailColor: '#D2691E' },
  { id: '4', title: '北极光', colors: ['#00FF7F', '#7FFFD4', '#00FFFF', '#9370DB', '#4B0082'], thumbnailColor: '#00FF7F' },
  { id: '5', title: '沙漠黄昏', colors: ['#FF7F50', '#FF6347', '#FA8072', '#CD5C5C', '#F08080'], thumbnailColor: '#FF7F50' },
  { id: '6', title: '森林晨雾', colors: ['#228B22', '#32CD32', '#90EE90', '#98FB98', '#F0FFF0'], thumbnailColor: '#228B22' },
  { id: '7', title: '星空漫游', colors: ['#191970', '#000080', '#4169E1', '#6495ED', '#87CEEB'], thumbnailColor: '#191970' },
  { id: '8', title: '蜜桃成熟', colors: ['#FFDAB9', '#FFE4C4', '#FFEFD5', '#FFF8DC', '#FAFAD2'], thumbnailColor: '#FFDAB9' },
  { id: '9', title: '薰衣草田', colors: ['#E6E6FA', '#DDA0DD', '#DA70D6', '#BA55D3', '#9932CC'], thumbnailColor: '#E6E6FA' },
  { id: '10', title: '日落海滩', colors: ['#FF4500', '#FF6347', '#FFA07A', '#FFD700', '#FFFFE0'], thumbnailColor: '#FF4500' },
  { id: '11', title: '冰川蓝调', colors: ['#B0E0E6', '#ADD8E6', '#87CEFA', '#6495ED', '#4682B4'], thumbnailColor: '#B0E0E6' },
  { id: '12', title: '复古咖啡', colors: ['#D2B48C', '#F5DEB3', '#DEB887', '#D2691E', '#8B4513'], thumbnailColor: '#D2B48C' },
];

presetArtworks.forEach(art => {
  artworkStore.set(art.id, { ...art, createdAt: Date.now() });
});

const colorStore: Map<string, ExtractedColor[]> = new Map();

app.get('/api/artworks', (_req, res) => {
  const artworks = Array.from(artworkStore.values()).sort((a, b) => b.createdAt - a.createdAt);
  res.json(artworks);
});

app.post('/api/extract-colors', upload.single('image'), async (req, res) => {
  try {
    const startTime = Date.now();
    
    if (req.body.colors && Array.isArray(req.body.colors)) {
      const colors = extractColorsFromHexArray(req.body.colors);
      const id = `simulated_${Date.now()}`;
      colorStore.set(id, colors);
      
      const artwork: Artwork = {
        id,
        title: req.body.title || `作品 ${artworkStore.size + 1}`,
        colors: colors.map(c => c.hex),
        thumbnailColor: req.body.thumbnailColor || colors[0]?.hex || '#888888',
        createdAt: Date.now()
      };
      artworkStore.set(id, artwork);
      
      console.log(`模拟颜色提取耗时: ${Date.now() - startTime}ms`);
      return res.json({ colors, artworkId: id });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: '未上传图片或提供颜色数据' });
    }
    
    const colors = await extractColorsFromBuffer(req.file.buffer, 5);
    const id = `art_${Date.now()}`;
    colorStore.set(id, colors);
    
    const artwork: Artwork = {
      id,
      title: req.body.title || `作品 ${artworkStore.size + 1}`,
      colors: colors.map(c => c.hex),
      thumbnailColor: colors[0]?.hex || '#888888',
      createdAt: Date.now()
    };
    artworkStore.set(id, artwork);
    
    const elapsed = Date.now() - startTime;
    console.log(`颜色提取耗时: ${elapsed}ms`);
    
    res.json({ colors, artworkId: id });
  } catch (error) {
    console.error('颜色提取失败:', error);
    res.status(500).json({ error: '颜色提取失败' });
  }
});

app.post('/api/extract-from-colors', (req, res) => {
  try {
    const { colors, title, thumbnailColor } = req.body;
    
    if (!colors || !Array.isArray(colors) || colors.length < 5) {
      return res.status(400).json({ error: '需要提供至少5个颜色' });
    }
    
    const extractedColors = extractColorsFromHexArray(colors.slice(0, 5));
    const id = `art_${Date.now()}`;
    colorStore.set(id, extractedColors);
    
    const artwork: Artwork = {
      id,
      title: title || `作品 ${artworkStore.size + 1}`,
      colors: extractedColors.map(c => c.hex),
      thumbnailColor: thumbnailColor || extractedColors[0]?.hex || '#888888',
      createdAt: Date.now()
    };
    artworkStore.set(id, artwork);
    
    res.json({ colors: extractedColors, artworkId: id });
  } catch (error) {
    console.error('颜色处理失败:', error);
    res.status(500).json({ error: '颜色处理失败' });
  }
});

app.get('/api/colors/:id', (req, res) => {
  const colors = colorStore.get(req.params.id);
  if (!colors) {
    return res.status(404).json({ error: '未找到颜色数据' });
  }
  res.json(colors);
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
  console.log(`预设作品数量: ${artworkStore.size}`);
});
