import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Inspiration, TagDictionary, InspirationType, Priority } from '../types/inspiration';

const app = express();
const PORT = 3001;

app.use(express.json());

let inspirations: Inspiration[] = [
  {
    id: uuidv4(),
    title: '时空穿越的代价',
    description: '主角发现每次穿越时空都会消耗自己的一段记忆，直到最后忘记自己是谁。',
    project: '时间三部曲',
    type: 'plot-twist',
    priority: 'P1',
    tags: ['时间旅行', '记忆', '科幻'],
    isFavorite: true,
    favoriteCount: 12,
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '双面侦探林默',
    description: '白天是警队顾问，夜晚是地下情报贩子，用两种身份游走在黑白两道之间。',
    project: '暗影系列',
    type: 'character',
    priority: 'P2',
    tags: ['侦探', '双重身份', '悬疑'],
    isFavorite: false,
    favoriteCount: 8,
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '悬浮城市艾瑞斯',
    description: '建立在巨型浮空石上的魔法都市，底部生长着发光的水晶矿脉，居民通过飞行魔法出行。',
    project: '苍穹大陆',
    type: 'worldbuilding',
    priority: 'P3',
    tags: ['奇幻', '城市', '魔法'],
    isFavorite: true,
    favoriteCount: 15,
    createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '咖啡馆的相遇',
    description: '"你知道吗，这家店的拿铁会讲故事。" 她抬头，眼中映着窗外的雨。',
    project: '城市短篇',
    type: 'dialogue',
    priority: 'P2',
    tags: ['爱情', '都市', '治愈'],
    isFavorite: false,
    favoriteCount: 5,
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '废土世界的最后图书馆',
    description: '核战争后，一群守书人用生命保护着人类最后的知识殿堂，每本书都承载着一个文明的记忆。',
    project: '灰烬纪元',
    type: 'story-outline',
    priority: 'P1',
    tags: ['末日', '废土', '知识', '希望'],
    isFavorite: true,
    favoriteCount: 20,
    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '雨夜追凶',
    description: '闪电照亮的瞬间，凶手的脸映在窗户上——但那是一张已经死去十年的脸。',
    project: '暗影系列',
    type: 'scene',
    priority: 'P1',
    tags: ['悬疑', '惊悚', '雨夜'],
    isFavorite: false,
    favoriteCount: 7,
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '机械心',
    description: '一个拥有机械心脏的男孩，每一次心跳都在倒计时，他必须在心脏停摆前找到活下去的意义。',
    project: '钢铁之歌',
    type: 'story-outline',
    priority: 'P2',
    tags: ['科幻', '成长', '生命'],
    isFavorite: false,
    favoriteCount: 3,
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '龙族公主的人类朋友',
    description: '化为人形的龙族公主在人类世界遇到了第一个真心朋友，但她的真实身份是两国和平的关键。',
    project: '苍穹大陆',
    type: 'character',
    priority: 'P3',
    tags: ['奇幻', '龙族', '友情'],
    isFavorite: false,
    favoriteCount: 2,
    createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
  },
];

let tagDictionary: TagDictionary = {
  tags: [
    '时间旅行', '记忆', '科幻', '侦探', '双重身份', '悬疑',
    '奇幻', '城市', '魔法', '爱情', '都市', '治愈',
    '末日', '废土', '知识', '希望', '惊悚', '雨夜',
    '成长', '生命', '龙族', '友情',
  ],
  projects: ['时间三部曲', '暗影系列', '苍穹大陆', '城市短篇', '灰烬纪元', '钢铁之歌'],
};

app.get('/api/inspirations', (_req, res) => {
  setTimeout(() => {
    res.json(inspirations);
  }, 50);
});

app.post('/api/inspirations', (req, res) => {
  const { title, description, project, type, priority, tags } = req.body;

  if (!title || !description || !project || !type || !priority) {
    return res.status(400).json({ error: '缺少必填字段' });
  }

  const newInspiration: Inspiration = {
    id: uuidv4(),
    title,
    description,
    project,
    type: type as InspirationType,
    priority: priority as Priority,
    tags: tags || [],
    isFavorite: false,
    favoriteCount: 0,
    createdAt: new Date().toISOString(),
  };

  inspirations.unshift(newInspiration);

  if (!tagDictionary.projects.includes(project)) {
    tagDictionary.projects.push(project);
  }
  tags?.forEach((tag: string) => {
    if (!tagDictionary.tags.includes(tag)) {
      tagDictionary.tags.push(tag);
    }
  });

  setTimeout(() => {
    res.status(201).json(newInspiration);
  }, 50);
});

app.put('/api/inspirations/:id/favorite', (req, res) => {
  const { id } = req.params;
  const inspiration = inspirations.find((i) => i.id === id);

  if (!inspiration) {
    return res.status(404).json({ error: '灵感不存在' });
  }

  inspiration.isFavorite = !inspiration.isFavorite;
  inspiration.favoriteCount += inspiration.isFavorite ? 1 : -1;

  setTimeout(() => {
    res.json(inspiration);
  }, 50);
});

app.get('/api/tags', (_req, res) => {
  setTimeout(() => {
    res.json(tagDictionary);
  }, 50);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
