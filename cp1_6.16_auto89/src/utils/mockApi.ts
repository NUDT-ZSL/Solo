import type { Work, WorkDetail, Anchor, Review, MaterialCategory } from '../types';

const mockReviews: Review[] = [
  {
    id: 'r1',
    userId: 'u1',
    userName: '艺术爱好者',
    rating: 5,
    comment: '工艺非常精湛，细节处理得很好，能感受到匠人的用心！',
    createdAt: '2024-01-15'
  },
  {
    id: 'r2',
    userId: 'u2',
    userName: '收藏家小王',
    rating: 4,
    comment: '材质选得很好，整体造型优雅，期待更多作品。',
    createdAt: '2024-01-14'
  }
];

const mockAnchors: Anchor[] = [
  {
    id: 'a1',
    x: 35,
    y: 40,
    type: 'material',
    description: '采用景德镇高岭土，经过1280°C高温烧制，胎质细腻洁白'
  },
  {
    id: 'a2',
    x: 65,
    y: 55,
    type: 'technique',
    description: '手工拉坯成型，器壁均匀薄透，修坯痕迹清晰可见'
  },
  {
    id: 'a3',
    x: 50,
    y: 25,
    type: 'tool',
    description: '使用传统竹制修坯刀，刀刃锋利，便于精细修整'
  }
];

const mockWorks: Work[] = [
  {
    id: 'w1',
    title: '青瓷茶盏',
    author: '匠人老张',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    image: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?w=400',
    category: 'ceramic',
    description: '传统青瓷工艺，釉色温润如玉，是品茗收藏的佳品。',
    averageRating: 4.8,
    reviewCount: 128,
    views: 3560,
    createdAt: '2024-01-10'
  },
  {
    id: 'w2',
    title: '胡桃木首饰盒',
    author: '木艺坊小李',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    image: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1587049352851-8d4e89133924?w=400',
    category: 'wood',
    description: '精选北美黑胡桃木，纯手工榫卯结构，木纹自然流畅。',
    averageRating: 4.9,
    reviewCount: 86,
    views: 2340,
    createdAt: '2024-01-08'
  },
  {
    id: 'w3',
    title: '苏绣双面绣摆件',
    author: '绣娘王姐',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=3',
    image: 'https://images.unsplash.com/photo-1594040226829-7f251ab46d80?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1594040226829-7f251ab46d80?w=400',
    category: 'embroidery',
    description: '非遗苏绣技艺，双面异色绣，针脚细腻如画。',
    averageRating: 4.7,
    reviewCount: 210,
    views: 5680,
    createdAt: '2024-01-12'
  },
  {
    id: 'w4',
    title: '纯银手工戒指',
    author: '银匠阿明',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=4',
    image: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400',
    category: 'metal',
    description: '999纯银打造，手工捶打纹理，每一枚都是独一无二。',
    averageRating: 4.6,
    reviewCount: 312,
    views: 8920,
    createdAt: '2024-01-05'
  },
  {
    id: 'w5',
    title: '白瓷花瓶',
    author: '匠人老张',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=1',
    image: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=400',
    category: 'ceramic',
    description: '德化白瓷，象牙白釉色，器型典雅大方。',
    averageRating: 4.5,
    reviewCount: 95,
    views: 2100,
    createdAt: '2024-01-03'
  },
  {
    id: 'w6',
    title: '实木茶盘',
    author: '木艺坊小李',
    authorAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=2',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800',
    thumbnail: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400',
    category: 'wood',
    description: '巴西花梨木整木挖制，天然木纹，排水设计合理。',
    averageRating: 4.8,
    reviewCount: 156,
    views: 4230,
    createdAt: '2024-01-11'
  }
];

const delay = <T>(data: T, ms = 300): Promise<T> =>
  new Promise(resolve => setTimeout(() => resolve(data), ms));

export const getWorkList = (category: MaterialCategory = 'all', searchTerm = ''): Promise<Work[]> => {
  let filtered = [...mockWorks];
  
  if (category !== 'all') {
    filtered = filtered.filter(w => w.category === category);
  }
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    filtered = filtered.filter(
      w => w.title.toLowerCase().includes(term) || 
           w.author.toLowerCase().includes(term) ||
           w.description.toLowerCase().includes(term)
    );
  }
  
  filtered.sort((a, b) => (b.views * b.averageRating) - (a.views * a.averageRating));
  
  return delay(filtered);
};

export const getWorkDetail = (id: string): Promise<WorkDetail | null> => {
  const work = mockWorks.find(w => w.id === id);
  if (!work) return delay(null);
  
  return delay({
    ...work,
    anchors: mockAnchors.map(a => ({ ...a })),
    reviews: [...mockReviews]
  });
};

export const getAnchors = (_workId: string): Promise<Anchor[]> => {
  return delay(mockAnchors.map(a => ({ ...a })));
};

export const submitReview = (
  workId: string,
  rating: number,
  comment: string
): Promise<{ success: boolean; newAverage: number; review: Review }> => {
  const work = mockWorks.find(w => w.id === workId);
  if (!work) return delay({ success: false, newAverage: 0, review: {} as Review });
  
  const newReview: Review = {
    id: `r${Date.now()}`,
    userId: 'u_current',
    userName: '当前用户',
    rating,
    comment,
    createdAt: new Date().toISOString().split('T')[0]
  };
  
  const totalScore = work.averageRating * work.reviewCount + rating;
  work.reviewCount += 1;
  work.averageRating = Math.round((totalScore / work.reviewCount) * 10) / 10;
  
  return delay({ success: true, newAverage: work.averageRating, review: newReview });
};

export const addAnchor = (
  _workId: string,
  anchor: Omit<Anchor, 'id'>
): Promise<Anchor> => {
  const newAnchor: Anchor = {
    ...anchor,
    id: `a${Date.now()}`
  };
  mockAnchors.push(newAnchor);
  return delay(newAnchor);
};

export const updateAnchor = (
  _workId: string,
  anchorId: string,
  updates: Partial<Pick<Anchor, 'x' | 'y' | 'type' | 'description'>>
): Promise<Anchor | null> => {
  const anchor = mockAnchors.find(a => a.id === anchorId);
  if (!anchor) return delay(null);
  
  Object.assign(anchor, updates);
  return delay(anchor);
};

export const deleteAnchor = (_workId: string, anchorId: string): Promise<boolean> => {
  const index = mockAnchors.findIndex(a => a.id === anchorId);
  if (index === -1) return delay(false);
  
  mockAnchors.splice(index, 1);
  return delay(true);
};
