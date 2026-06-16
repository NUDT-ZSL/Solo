import express, { Request, Response } from 'express';
import cors from 'cors';

interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  fadeIn: number;
  fadeOut: number;
  url: string;
  albumCover?: string;
}

interface Mixtape {
  id: string;
  title: string;
  description: string;
  songs: Song[];
  theme: 'classic' | 'neon' | 'minimal';
  createdAt: string;
  totalDuration: number;
  coverUrl?: string;
}

interface Comment {
  id: string;
  mixtapeId: string;
  timestamp: number;
  content: string;
  createdAt: string;
}

type StickerType = 'heart' | 'fire' | 'lightning' | 'star' | 'moon' | 'note';

interface Sticker {
  id: string;
  type: StickerType;
  timestamp: number;
  position: { x: number; y: number };
  count: number;
}

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const generateId = (): string => Math.random().toString(36).substring(2, 11);

const mockSongs: Song[] = [
  {
    id: 's1',
    title: '夜空中最亮的星',
    artist: '逃跑计划',
    duration: 245,
    fadeIn: 1,
    fadeOut: 1,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    albumCover: 'https://picsum.photos/300/300?random=1'
  },
  {
    id: 's2',
    title: '海阔天空',
    artist: 'Beyond',
    duration: 326,
    fadeIn: 1.5,
    fadeOut: 2,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    albumCover: 'https://picsum.photos/300/300?random=2'
  },
  {
    id: 's3',
    title: '平凡之路',
    artist: '朴树',
    duration: 298,
    fadeIn: 1,
    fadeOut: 1.5,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    albumCover: 'https://picsum.photos/300/300?random=3'
  },
  {
    id: 's4',
    title: '晴天',
    artist: '周杰伦',
    duration: 269,
    fadeIn: 0.5,
    fadeOut: 1,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    albumCover: 'https://picsum.photos/300/300?random=4'
  },
  {
    id: 's5',
    title: '光年之外',
    artist: '邓紫棋',
    duration: 235,
    fadeIn: 1,
    fadeOut: 1,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3',
    albumCover: 'https://picsum.photos/300/300?random=5'
  },
  {
    id: 's6',
    title: '起风了',
    artist: '买辣椒也用券',
    duration: 318,
    fadeIn: 2,
    fadeOut: 2,
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-6.mp3',
    albumCover: 'https://picsum.photos/300/300?random=6'
  }
];

const mockMixtapes: Mixtape[] = [
  {
    id: 'm1',
    title: '深夜独处时光',
    description: '适合夜晚独自聆听的治愈系歌单，让音乐陪伴你度过每一个安静的夜晚。',
    songs: [mockSongs[0], mockSongs[1], mockSongs[2]],
    theme: 'classic',
    createdAt: '2024-01-15T10:30:00Z',
    totalDuration: 869,
    coverUrl: 'https://picsum.photos/400/400?random=11'
  },
  {
    id: 'm2',
    title: '公路旅行必备',
    description: '开车时最适合听的节奏明快的歌曲，让旅途充满能量与欢乐。',
    songs: [mockSongs[3], mockSongs[4], mockSongs[5], mockSongs[0]],
    theme: 'neon',
    createdAt: '2024-01-20T14:20:00Z',
    totalDuration: 1067,
    coverUrl: 'https://picsum.photos/400/400?random=12'
  },
  {
    id: 'm3',
    title: '怀旧金曲精选',
    description: '那些年我们一起听过的经典歌曲，每一首都是青春的回忆。',
    songs: [mockSongs[1], mockSongs[2], mockSongs[3]],
    theme: 'minimal',
    createdAt: '2024-02-01T09:15:00Z',
    totalDuration: 893,
    coverUrl: 'https://picsum.photos/400/400?random=13'
  },
  {
    id: 'm4',
    title: '晨间活力唤醒',
    description: '用充满活力的音乐开启美好的一天，让清晨充满正能量。',
    songs: [mockSongs[4], mockSongs[5], mockSongs[0], mockSongs[1], mockSongs[2]],
    theme: 'neon',
    createdAt: '2024-02-10T08:00:00Z',
    totalDuration: 1322,
    coverUrl: 'https://picsum.photos/400/400?random=14'
  },
  {
    id: 'm5',
    title: '雨天咖啡馆',
    description: '适合在咖啡馆静坐一下午的轻音乐，配着雨声别有风味。',
    songs: [mockSongs[2], mockSongs[3], mockSongs[4]],
    theme: 'classic',
    createdAt: '2024-02-15T16:45:00Z',
    totalDuration: 802,
    coverUrl: 'https://picsum.photos/400/400?random=15'
  },
  {
    id: 'm6',
    title: '运动健身节拍',
    description: '节奏强劲的运动音乐，帮助你在健身时保持最佳状态。',
    songs: [mockSongs[5], mockSongs[0], mockSongs[1], mockSongs[3]],
    theme: 'neon',
    createdAt: '2024-02-20T12:30:00Z',
    totalDuration: 1158,
    coverUrl: 'https://picsum.photos/400/400?random=16'
  }
];

const mockComments: Record<string, Comment[]> = {
  m1: [
    {
      id: 'c1',
      mixtapeId: 'm1',
      timestamp: 45,
      content: '这段吉他solo太治愈了，每次听到都会静下心来',
      createdAt: '2024-01-16T20:30:00Z'
    },
    {
      id: 'c2',
      mixtapeId: 'm1',
      timestamp: 180,
      content: '这首歌陪我度过了最难的日子，感谢分享',
      createdAt: '2024-01-17T15:20:00Z'
    },
    {
      id: 'c3',
      mixtapeId: 'm1',
      timestamp: 320,
      content: '副歌部分简直是神来之笔！',
      createdAt: '2024-01-18T09:10:00Z'
    }
  ],
  m2: [
    {
      id: 'c4',
      mixtapeId: 'm2',
      timestamp: 60,
      content: '开车听这首太带感了！',
      createdAt: '2024-01-21T18:45:00Z'
    }
  ]
};

const mockStickers: Record<string, Sticker[]> = {
  m1: [
    { id: 'st1', type: 'heart', timestamp: 30, position: { x: 10, y: 50 }, count: 12 },
    { id: 'st2', type: 'fire', timestamp: 150, position: { x: 45, y: 30 }, count: 8 },
    { id: 'st3', type: 'star', timestamp: 280, position: { x: 75, y: 60 }, count: 15 },
    { id: 'st4', type: 'note', timestamp: 400, position: { x: 90, y: 40 }, count: 5 }
  ],
  m2: [
    { id: 'st5', type: 'lightning', timestamp: 80, position: { x: 20, y: 45 }, count: 20 },
    { id: 'st6', type: 'moon', timestamp: 200, position: { x: 55, y: 55 }, count: 7 }
  ]
};

app.get('/api/mixtapes', (_req: Request, res: Response<Mixtape[]>) => {
  res.json(mockMixtapes);
});

app.get('/api/mixtapes/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const mixtape = mockMixtapes.find(m => m.id === id);

  if (!mixtape) {
    res.status(404).json({ error: 'Mixtape not found' });
    return;
  }

  const comments = mockComments[id] || [];
  const stickers = mockStickers[id] || [];

  res.json({ mixtape, comments, stickers });
});

app.post('/api/mixtapes/:id/comments', (req: Request, res: Response) => {
  const { id } = req.params;
  const { timestamp, content } = req.body;

  if (!timestamp || !content || content.length > 140) {
    res.status(400).json({ error: 'Invalid comment data' });
    return;
  }

  const mixtape = mockMixtapes.find(m => m.id === id);
  if (!mixtape) {
    res.status(404).json({ error: 'Mixtape not found' });
    return;
  }

  const newComment: Comment = {
    id: generateId(),
    mixtapeId: id,
    timestamp: Number(timestamp),
    content: String(content),
    createdAt: new Date().toISOString()
  };

  if (!mockComments[id]) {
    mockComments[id] = [];
  }
  mockComments[id].push(newComment);

  res.json(mockComments[id]);
});

app.post('/api/mixtapes/:id/stickers', (req: Request, res: Response) => {
    const { id } = req.params;
    const { type, timestamp, position } = req.body;

    const validTypes: StickerType[] = ['heart', 'fire', 'lightning', 'star', 'moon', 'note'];
    if (!type || !validTypes.includes(type as StickerType) || timestamp === undefined) {
      res.status(400).json({ error: 'Invalid sticker data' });
      return;
    }

    const mixtape = mockMixtapes.find(m => m.id === id);
    if (!mixtape) {
      res.status(404).json({ error: 'Mixtape not found' });
      return;
    }

    if (!mockStickers[id]) {
      mockStickers[id] = [];
    }

    const existingSticker = mockStickers[id].find(
      s => s.type === type && Math.abs(s.timestamp - Number(timestamp)) < 5
    );

    if (existingSticker) {
      existingSticker.count += 1;
    } else {
      const defaultPosition = { x: Math.random() * 80 + 10, y: Math.random() * 60 + 20 };
      const newSticker: Sticker = {
        id: generateId(),
        type: type as StickerType,
        timestamp: Number(timestamp),
        position: position && position.x !== undefined && position.y !== undefined
          ? { x: Number(position.x), y: Number(position.y) }
          : defaultPosition,
        count: 1
      };
      mockStickers[id].push(newSticker);
    }

    res.json(mockStickers[id]);
  });

app.post('/api/mixtapes', (req: Request, res: Response) => {
  const { title, description, songs, theme } = req.body;

  if (!title || !songs || !Array.isArray(songs) || songs.length < 5 || songs.length > 10) {
    res.status(400).json({ error: 'Invalid mixtape data. Need 5-10 songs.' });
    return;
  }

  const totalDuration = songs.reduce((acc: number, song: Song) => acc + (song.duration || 0), 0);

  const newMixtape: Mixtape = {
    id: generateId(),
    title: String(title),
    description: description ? String(description) : '',
    songs: songs.map((s: Partial<Song>, index: number) => ({
      id: s.id || generateId(),
      title: s.title || `歌曲 ${index + 1}`,
      artist: s.artist || '未知艺术家',
      duration: s.duration || 180,
      fadeIn: s.fadeIn || 1,
      fadeOut: s.fadeOut || 1,
      url: s.url || '',
      albumCover: s.albumCover
    })),
    theme: (theme as Mixtape['theme']) || 'classic',
    createdAt: new Date().toISOString(),
    totalDuration,
    coverUrl: songs[0]?.albumCover
  };

  mockMixtapes.unshift(newMixtape);
  mockComments[newMixtape.id] = [];
  mockStickers[newMixtape.id] = [];

  res.status(201).json(newMixtape);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API endpoints:`);
  console.log(`  GET    /api/mixtapes`);
  console.log(`  GET    /api/mixtapes/:id`);
  console.log(`  POST   /api/mixtapes/:id/comments`);
  console.log(`  POST   /api/mixtapes/:id/stickers`);
  console.log(`  POST   /api/mixtapes`);
});
