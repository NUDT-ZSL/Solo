import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface Comment {
  id: string;
  artworkId: string;
  username: string;
  avatar: string;
  content: string;
  createdAt: number;
}

export interface Artwork {
  id: string;
  galleryId: string;
  title: string;
  author: string;
  description: string;
  thumbnail: string;
  image: string;
  likes: number;
  comments: Comment[];
  position: number;
}

export interface Gallery {
  id: string;
  name: string;
  description: string;
  createdAt: number;
  artworks: Artwork[];
}

interface DataStoreShape {
  galleries: Gallery[];
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'data.json');

const sampleThumbnails = [
  'https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?w=400',
  'https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=400',
  'https://images.unsplash.com/photo-1578301978693-85fa9c0320b9?w=400',
  'https://images.unsplash.com/photo-1549887534-1541e9326642?w=400',
  'https://images.unsplash.com/photo-1579762715118-a6f1d4b934f1?w=400',
  'https://images.unsplash.com/photo-1582555172866-f73bb12a2ab3?w=400',
  'https://images.unsplash.com/photo-1541961017774-22349e4a1262?w=400',
  'https://images.unsplash.com/photo-1569172122301-bc5008bc09c5?w=400',
  'https://images.unsplash.com/photo-1578926288207-a90a5366759d?w=400',
];

const sampleImages = sampleThumbnails.map((t) => t.replace('w=400', 'w=1200'));

function generateSampleArtworks(galleryId: string): Artwork[] {
  const titles = ['星夜', '向日葵', '日出印象', '睡莲', '呐喊', '记忆的永恒', '格尔尼卡', '戴珍珠耳环的少女', '神奈川冲浪里'];
  const authors = ['梵高', '莫奈', '蒙克', '达利', '毕加索', '维米尔', '葛饰北斋', '雷诺阿', '塞尚'];
  const descriptions = [
    '这幅作品展现了艺术家对夜空的独特理解，漩涡般的星云充满动感。',
    '色彩鲜艳的花朵在阳光下绽放，充满生命力。',
    '清晨的港口在薄雾中若隐若现，光影交织出梦幻般的效果。',
    '水面上的荷花静静绽放，倒影与实景交相辉映。',
    '艺术家内心深处的焦虑与恐惧，通过夸张的形象表达出来。',
    '时间仿佛在这一刻融化，超现实主义的代表作。',
    '战争的残酷与痛苦在这幅巨作中展现得淋漓尽致。',
    '少女回眸的一瞬间，成为永恒的经典。',
    '巨浪滔天，人与自然的力量对比令人震撼。',
  ];

  return Array.from({ length: 9 }, (_, i) => ({
    id: uuidv4(),
    galleryId,
    title: titles[i],
    author: authors[i],
    description: descriptions[i],
    thumbnail: sampleThumbnails[i],
    image: sampleImages[i],
    likes: Math.floor(Math.random() * 100),
    comments: [
      {
        id: uuidv4(),
        artworkId: '',
        username: '艺术爱好者',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}a`,
        content: '太美了！色彩运用得非常精妙。',
        createdAt: Date.now() - 3600000,
      },
      {
        id: uuidv4(),
        artworkId: '',
        username: '收藏家小王',
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}b`,
        content: '有幸亲眼见过原作，令人难忘。',
        createdAt: Date.now() - 7200000,
      },
    ].map((c) => ({ ...c, artworkId: '' })),
    position: i,
  })).map((art) => ({
    ...art,
    comments: art.comments.map((c) => ({ ...c, artworkId: art.id })).sort((a, b) => b.createdAt - a.createdAt),
  }));
}

function createInitialData(): DataStoreShape {
  const galleryId1 = uuidv4();
  const galleryId2 = uuidv4();
  return {
    galleries: [
      {
        id: galleryId1,
        name: '经典印象派展厅',
        description: '汇集19世纪印象派大师的代表作，感受光影的魅力。',
        createdAt: Date.now() - 86400000,
        artworks: generateSampleArtworks(galleryId1),
      },
      {
        id: galleryId2,
        name: '现代艺术探索',
        description: '突破传统的边界，探索艺术的无限可能。',
        createdAt: Date.now() - 172800000,
        artworks: generateSampleArtworks(galleryId2),
      },
    ],
  };
}

function loadData(): DataStoreShape {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(raw) as DataStoreShape;
    }
  } catch (err) {
    console.error('Failed to load data, using initial data:', err);
  }
  const initial = createInitialData();
  saveData(initial);
  return initial;
}

function saveData(data: DataStoreShape): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to save data:', err);
  }
}

let store: DataStoreShape = loadData();

function sortComments(comments: Comment[]): Comment[] {
  return [...comments].sort((a, b) => b.createdAt - a.createdAt);
}

export const dataStore = {
  getGalleries(): Gallery[] {
    return store.galleries;
  },

  getGalleryById(id: string): Gallery | undefined {
    return store.galleries.find((g) => g.id === id);
  },

  createGallery(name: string, description: string): Gallery {
    const id = uuidv4();
    const gallery: Gallery = {
      id,
      name,
      description,
      createdAt: Date.now(),
      artworks: generateSampleArtworks(id),
    };
    store.galleries.unshift(gallery);
    saveData(store);
    return gallery;
  },

  deleteGallery(id: string): boolean {
    const index = store.galleries.findIndex((g) => g.id === id);
    if (index === -1) return false;
    store.galleries.splice(index, 1);
    saveData(store);
    return true;
  },

  getArtworkById(galleryId: string, artworkId: string): Artwork | undefined {
    const gallery = this.getGalleryById(galleryId);
    if (!gallery) return undefined;
    return gallery.artworks.find((a) => a.id === artworkId);
  },

  createArtwork(galleryId: string, artwork: Omit<Artwork, 'id' | 'galleryId' | 'likes' | 'comments' | 'position'>): Artwork | undefined {
    const gallery = this.getGalleryById(galleryId);
    if (!gallery) return undefined;
    const newArtwork: Artwork = {
      id: uuidv4(),
      galleryId,
      likes: 0,
      comments: [],
      position: gallery.artworks.length,
      ...artwork,
    };
    gallery.artworks.push(newArtwork);
    saveData(store);
    return newArtwork;
  },

  likeArtwork(galleryId: string, artworkId: string): Artwork | undefined {
    const artwork = this.getArtworkById(galleryId, artworkId);
    if (!artwork) return undefined;
    artwork.likes += 1;
    saveData(store);
    return artwork;
  },

  getComments(galleryId: string, artworkId: string): Comment[] | undefined {
    const artwork = this.getArtworkById(galleryId, artworkId);
    if (!artwork) return undefined;
    return sortComments(artwork.comments);
  },

  addComment(
    galleryId: string,
    artworkId: string,
    commentData: { username: string; avatar: string; content: string }
  ): Comment | undefined {
    const artwork = this.getArtworkById(galleryId, artworkId);
    if (!artwork) return undefined;
    const comment: Comment = {
      id: uuidv4(),
      artworkId,
      username: commentData.username,
      avatar: commentData.avatar,
      content: commentData.content,
      createdAt: Date.now(),
    };
    artwork.comments.push(comment);
    artwork.comments = sortComments(artwork.comments);
    saveData(store);
    return comment;
  },

  updateComment(
    galleryId: string,
    artworkId: string,
    commentId: string,
    content: string
  ): Comment | undefined {
    const artwork = this.getArtworkById(galleryId, artworkId);
    if (!artwork) return undefined;
    const comment = artwork.comments.find((c) => c.id === commentId);
    if (!comment) return undefined;
    comment.content = content;
    saveData(store);
    return comment;
  },

  deleteComment(galleryId: string, artworkId: string, commentId: string): boolean {
    const artwork = this.getArtworkById(galleryId, artworkId);
    if (!artwork) return false;
    const index = artwork.comments.findIndex((c) => c.id === commentId);
    if (index === -1) return false;
    artwork.comments.splice(index, 1);
    saveData(store);
    return true;
  },
};
