import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { Artwork, GalleryConfig } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

const artworks: Artwork[] = [
  {
    id: 'art-001',
    name: '星夜幻想',
    author: '林风眠',
    type: 'painting',
    gradientStart: '#1a1a4e',
    gradientEnd: '#4a4a8a',
    icon: '🎨',
    width: 2,
    height: 1.5
  },
  {
    id: 'art-002',
    name: '山水清音',
    author: '张大千',
    type: 'painting',
    gradientStart: '#2d5a3d',
    gradientEnd: '#5a8a5d',
    icon: '🖼️',
    width: 2.5,
    height: 1.8
  },
  {
    id: 'art-003',
    name: '现代雕塑·思考者',
    author: '罗丹',
    type: 'sculpture',
    gradientStart: '#4a3a2a',
    gradientEnd: '#8a7a5a',
    icon: '🗿',
    width: 1.2,
    height: 2
  },
  {
    id: 'art-004',
    name: '都市光影',
    author: '何藩',
    type: 'photography',
    gradientStart: '#2a2a3a',
    gradientEnd: '#5a5a6a',
    icon: '📷',
    width: 2,
    height: 1.5
  },
  {
    id: 'art-005',
    name: '花开富贵',
    author: '齐白石',
    type: 'painting',
    gradientStart: '#5a2a3a',
    gradientEnd: '#9a5a6a',
    icon: '🌸',
    width: 1.8,
    height: 2.2
  },
  {
    id: 'art-006',
    name: '抽象之舞',
    author: '康定斯基',
    type: 'painting',
    gradientStart: '#3a1a4a',
    gradientEnd: '#7a4a9a',
    icon: '🎭',
    width: 2.2,
    height: 1.8
  },
  {
    id: 'art-007',
    name: '青铜时代',
    author: '米开朗基罗',
    type: 'sculpture',
    gradientStart: '#3a2a1a',
    gradientEnd: '#7a6a4a',
    icon: '🏛️',
    width: 1,
    height: 2.5
  },
  {
    id: 'art-008',
    name: '海边晨曦',
    author: '莫奈',
    type: 'photography',
    gradientStart: '#1a3a4a',
    gradientEnd: '#5a8aaa',
    icon: '🌅',
    width: 2.5,
    height: 1.5
  },
  {
    id: 'art-009',
    name: '竹林七贤',
    author: '范曾',
    type: 'painting',
    gradientStart: '#1a4a2a',
    gradientEnd: '#5aaa6a',
    icon: '🎋',
    width: 3,
    height: 2
  },
  {
    id: 'art-010',
    name: '几何构成',
    author: '蒙德里安',
    type: 'painting',
    gradientStart: '#1a1a1a',
    gradientEnd: '#ea3a3a',
    icon: '🔷',
    width: 2,
    height: 2
  },
  {
    id: 'art-011',
    name: '陶瓷艺术',
    author: '陶艺大师',
    type: 'sculpture',
    gradientStart: '#4a2a5a',
    gradientEnd: '#8a6aaa',
    icon: '🏺',
    width: 1,
    height: 1.5
  },
  {
    id: 'art-012',
    name: '人像摄影',
    author: '卡什',
    type: 'photography',
    gradientStart: '#2a1a1a',
    gradientEnd: '#6a4a4a',
    icon: '👤',
    width: 1.5,
    height: 2
  }
];

const galleryStore = new Map<string, GalleryConfig>();

app.get('/api/artworks', (req, res) => {
  setTimeout(() => {
    res.json({
      success: true,
      data: artworks
    });
  }, 80);
});

app.post('/api/gallery', (req, res) => {
  try {
    const config = req.body as GalleryConfig;
    const shortId = uuidv4().substring(0, 8);
    const savedConfig: GalleryConfig = {
      ...config,
      id: shortId,
      createdAt: Date.now()
    };
    galleryStore.set(shortId, savedConfig);

    setTimeout(() => {
      res.json({
        success: true,
        data: {
          id: shortId,
          shareUrl: `${req.protocol}://${req.get('host')}/gallery/${shortId}`,
          createdAt: savedConfig.createdAt
        }
      });
    }, 120);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: '保存画廊配置失败'
    });
  }
});

app.get('/api/gallery/:id', (req, res) => {
  const { id } = req.params;
  const config = galleryStore.get(id);

  setTimeout(() => {
    if (config) {
      res.json({
        success: true,
        data: config
      });
    } else {
      res.status(404).json({
        success: false,
        message: '画廊配置不存在'
      });
    }
  }, 100);
});

app.listen(PORT, () => {
  console.log(`🎨 虚拟画廊后端服务运行在 http://localhost:${PORT}`);
  console.log(`📚 艺术品库: ${artworks.length} 件作品`);
});
