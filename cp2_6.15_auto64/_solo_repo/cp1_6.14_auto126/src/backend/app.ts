import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

interface Comment {
  id: string;
  userName: string;
  avatar: string;
  content: string;
  timestamp: string;
  likes: number;
}

interface Work {
  id: string;
  title: string;
  cover: string;
  audio: string;
  lyrics: string[];
  plays: number;
  status: 'pending' | 'published';
  createdAt: string;
  averageDuration: number;
  comments: Comment[];
  dailyPlays: { date: string; plays: number }[];
  sourceDistribution: { name: string; value: number }[];
  interactions: { day: string; comments: number; likes: number; shares: number }[];
}

const sampleLyrics = [
  '在这个寂静的夜晚',
  '我独自坐在窗前',
  '望着远方的星辰',
  '思念着你的容颜',
  '时光匆匆流过',
  '带走了多少欢笑',
  '但那些美好的记忆',
  '永远留在我心间',
  '让我们一起追逐梦想',
  '不管前路有多艰难',
  '只要心中有爱',
  '就不会感到孤单',
];

const generateDailyPlays = () => {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    days.push({
      date: `${date.getMonth() + 1}/${date.getDate()}`,
      plays: Math.floor(Math.random() * 5000) + 1000,
    });
  }
  return days;
};

const generateInteractions = () => {
  const data = [];
  const days = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  for (let i = 0; i < 7; i++) {
    data.push({
      day: days[i],
      comments: Math.floor(Math.random() * 200) + 50,
      likes: Math.floor(Math.random() * 500) + 100,
      shares: Math.floor(Math.random() * 100) + 20,
    });
  }
  return data;
};

let works: Work[] = [
  {
    id: uuidv4(),
    title: '星空下的约定',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=beautiful%20night%20sky%20with%20stars%20and%20moon%20music%20album%20cover%20artistic&image_size=square_hd',
    audio: '',
    lyrics: sampleLyrics,
    plays: 12580,
    status: 'published',
    createdAt: '2024-01-15',
    averageDuration: 3.5,
    comments: [
      {
        id: uuidv4(),
        userName: '音乐爱好者',
        avatar: 'https://i.pravatar.cc/100?img=1',
        content: '这首歌太好听了！旋律优美，歌词动人。',
        timestamp: '2小时前',
        likes: 24,
      },
      {
        id: uuidv4(),
        userName: '星辰大海',
        avatar: 'https://i.pravatar.cc/100?img=2',
        content: '单曲循环了一整天，期待更多作品！',
        timestamp: '5小时前',
        likes: 18,
      },
    ],
    dailyPlays: generateDailyPlays(),
    sourceDistribution: [
      { name: '直接播放', value: 45 },
      { name: '歌单推荐', value: 25 },
      { name: '搜索', value: 20 },
      { name: '分享', value: 10 },
    ],
    interactions: generateInteractions(),
  },
  {
    id: uuidv4(),
    title: '城市夜归人',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=city%20night%20lights%20urban%20atmosphere%20music%20album%20cover&image_size=square_hd',
    audio: '',
    lyrics: sampleLyrics,
    plays: 8930,
    status: 'published',
    createdAt: '2024-01-20',
    averageDuration: 2.8,
    comments: [
      {
        id: uuidv4(),
        userName: '夜猫子',
        avatar: 'https://i.pravatar.cc/100?img=3',
        content: '深夜听这首特别有感觉。',
        timestamp: '1天前',
        likes: 42,
      },
    ],
    dailyPlays: generateDailyPlays(),
    sourceDistribution: [
      { name: '直接播放', value: 38 },
      { name: '歌单推荐', value: 30 },
      { name: '搜索', value: 18 },
      { name: '分享', value: 14 },
    ],
    interactions: generateInteractions(),
  },
  {
    id: uuidv4(),
    title: '夏日海风',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=summer%20ocean%20beach%20sunset%20palm%20trees%20music%20album%20cover&image_size=square_hd',
    audio: '',
    lyrics: sampleLyrics,
    plays: 15420,
    status: 'published',
    createdAt: '2024-02-01',
    averageDuration: 4.2,
    comments: [
      {
        id: uuidv4(),
        userName: '沙滩漫步',
        avatar: 'https://i.pravatar.cc/100?img=4',
        content: '听着就想去海边！',
        timestamp: '3天前',
        likes: 56,
      },
      {
        id: uuidv4(),
        userName: '阳光少年',
        avatar: 'https://i.pravatar.cc/100?img=5',
        content: '节奏太棒了，夏天的感觉！',
        timestamp: '4天前',
        likes: 33,
      },
    ],
    dailyPlays: generateDailyPlays(),
    sourceDistribution: [
      { name: '直接播放', value: 50 },
      { name: '歌单推荐', value: 22 },
      { name: '搜索', value: 15 },
      { name: '分享', value: 13 },
    ],
    interactions: generateInteractions(),
  },
  {
    id: uuidv4(),
    title: '雨中漫步',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=rainy%20day%20city%20street%20umbrella%20melancholic%20music%20album%20cover&image_size=square_hd',
    audio: '',
    lyrics: sampleLyrics,
    plays: 6780,
    status: 'published',
    createdAt: '2024-02-10',
    averageDuration: 3.1,
    comments: [],
    dailyPlays: generateDailyPlays(),
    sourceDistribution: [
      { name: '直接播放', value: 40 },
      { name: '歌单推荐', value: 28 },
      { name: '搜索', value: 22 },
      { name: '分享', value: 10 },
    ],
    interactions: generateInteractions(),
  },
  {
    id: uuidv4(),
    title: '追梦少年',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=dream%20chasing%20youth%20inspirational%20sunrise%20mountain%20music%20album%20cover&image_size=square_hd',
    audio: '',
    lyrics: sampleLyrics,
    plays: 21300,
    status: 'published',
    createdAt: '2024-02-15',
    averageDuration: 3.8,
    comments: [
      {
        id: uuidv4(),
        userName: '追光者',
        avatar: 'https://i.pravatar.cc/100?img=6',
        content: '这首歌给了我很多力量，谢谢你！',
        timestamp: '6小时前',
        likes: 89,
      },
    ],
    dailyPlays: generateDailyPlays(),
    sourceDistribution: [
      { name: '直接播放', value: 55 },
      { name: '歌单推荐', value: 20 },
      { name: '搜索', value: 18 },
      { name: '分享', value: 7 },
    ],
    interactions: generateInteractions(),
  },
  {
    id: uuidv4(),
    title: '时光倒流',
    cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20clock%20time%20retro%20nostalgia%20music%20album%20cover%20artistic&image_size=square_hd',
    audio: '',
    lyrics: sampleLyrics,
    plays: 0,
    status: 'pending',
    createdAt: '2024-02-20',
    averageDuration: 0,
    comments: [],
    dailyPlays: generateDailyPlays(),
    sourceDistribution: [
      { name: '直接播放', value: 0 },
      { name: '歌单推荐', value: 0 },
      { name: '搜索', value: 0 },
      { name: '分享', value: 0 },
    ],
    interactions: generateInteractions(),
  },
];

app.get('/api/works', (_req, res) => {
  res.json(works);
});

app.get('/api/works/:id', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }
  res.json(work);
});

app.post('/api/works/:id/comments', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }
  const newComment: Comment = {
    id: uuidv4(),
    userName: req.body.userName || '匿名用户',
    avatar: `https://i.pravatar.cc/100?img=${Math.floor(Math.random() * 70)}`,
    content: req.body.content,
    timestamp: '刚刚',
    likes: 0,
  };
  work.comments.unshift(newComment);
  res.status(201).json(newComment);
});

app.get('/api/works/:id/stats', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }
  res.json({
    totalPlays: work.plays,
    averageDuration: work.averageDuration,
    dailyPlays: work.dailyPlays,
    sourceDistribution: work.sourceDistribution,
    interactions: work.interactions,
  });
});

app.post('/api/works/:id/approve', (req, res) => {
  const work = works.find((w) => w.id === req.params.id);
  if (!work) {
    res.status(404).json({ error: '作品不存在' });
    return;
  }
  work.status = 'published';
  work.plays = Math.floor(Math.random() * 1000) + 100;
  res.json({ success: true, message: '作品已发布', work });
});

app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
