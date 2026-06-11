import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface Comment {
  id: string;
  cardId: string;
  username: string;
  avatar: string;
  content: string;
  createdAt: string;
}

interface Card {
  id: string;
  title: string;
  content: string;
  group: string;
  likes: number;
  likedBy: string[];
  createdAt: string;
}

const cards: Card[] = [
  {
    id: uuidv4(),
    title: 'AI驱动的个性化推荐',
    content: '利用机器学习算法分析用户行为数据，构建个性化推荐系统。通过协同过滤和深度学习模型，为用户提供更精准的内容推荐，提升用户留存率和转化率。关键指标包括推荐点击率和用户满意度评分。',
    group: '技术',
    likes: 12,
    likedBy: [],
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: uuidv4(),
    title: '极简主义设计语言',
    content: '重新定义产品的视觉设计语言，采用极简主义风格。减少视觉噪音，突出核心功能，通过留白和微动效提升用户体验。色彩系统以深色为主基调，辅以渐变色点缀，营造沉浸式体验。',
    group: '设计',
    likes: 8,
    likedBy: [],
    createdAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: uuidv4(),
    title: '订阅制会员体系',
    content: '设计分层订阅制会员体系，包含免费版、专业版和企业版三个层级。免费版提供基础功能，专业版解锁高级特性，企业版提供定制化服务。通过差异化定价策略，实现用户价值的最大化挖掘。',
    group: '产品',
    likes: 15,
    likedBy: [],
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: uuidv4(),
    title: 'WebAssembly性能优化',
    content: '将核心计算模块用Rust重写并编译为WebAssembly，在浏览器端实现接近原生的执行性能。重点关注图像处理和数据计算场景，预期性能提升5-10倍，为复杂Web应用提供更强的计算能力。',
    group: '技术',
    likes: 20,
    likedBy: [],
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: uuidv4(),
    title: '情感化交互设计',
    content: '在产品交互中融入情感化设计元素，通过微动画、趣味反馈和个性化问候，让用户感受到产品的温度。研究表明，情感化设计可以显著提升用户满意度和品牌忠诚度，降低用户流失率。',
    group: '设计',
    likes: 6,
    likedBy: [],
    createdAt: new Date(Date.now() - 86400000 * 1.5).toISOString(),
  },
  {
    id: uuidv4(),
    title: '社区驱动的内容生态',
    content: '构建UGC内容生态，让用户成为内容创作者。通过积分激励、优质内容推荐和创作者认证体系，培养核心用户群体。目标是实现用户生成内容占总内容量的60%以上，形成自运转的内容生态。',
    group: '产品',
    likes: 10,
    likedBy: [],
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
  },
  {
    id: uuidv4(),
    title: '微前端架构迁移',
    content: '将现有单体前端应用拆分为微前端架构，使用Module Federation实现模块共享。各团队独立开发、独立部署，提升开发效率和发布速度。预计可将发布周期从2周缩短至2天。',
    group: '技术',
    likes: 18,
    likedBy: [],
    createdAt: new Date(Date.now() - 86400000 * 6).toISOString(),
  },
  {
    id: uuidv4(),
    title: '无障碍设计标准',
    content: '全面推行WCAG 2.1 AA级无障碍设计标准，确保视障、听障和运动障碍用户都能顺畅使用产品。包括屏幕阅读器适配、键盘导航优化、色彩对比度提升等，覆盖100%的核心功能页面。',
    group: '设计',
    likes: 4,
    likedBy: [],
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
  },
];

const comments: Comment[] = [
  {
    id: uuidv4(),
    cardId: cards[0].id,
    username: '张明',
    avatar: '',
    content: '这个方向很好，我们可以先从用户行为数据收集开始',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: uuidv4(),
    cardId: cards[0].id,
    username: '李薇',
    avatar: '',
    content: '推荐算法的冷启动问题需要考虑',
    createdAt: new Date(Date.now() - 1800000).toISOString(),
  },
  {
    id: uuidv4(),
    cardId: cards[2].id,
    username: '王强',
    avatar: '',
    content: '定价策略需要做A/B测试验证',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: uuidv4(),
    cardId: cards[3].id,
    username: '赵雪',
    avatar: '',
    content: 'Rust的学习曲线需要考虑团队能力',
    createdAt: new Date(Date.now() - 5400000).toISOString(),
  },
];

app.get('/api/cards', (_req, res) => {
  res.json(cards);
});

app.get('/api/cards/:id', (req, res) => {
  const card = cards.find((c) => c.id === req.params.id);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  res.json(card);
});

app.post('/api/cards', (req, res) => {
  const { title, content, group } = req.body;
  if (!title || !content || !group) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const card: Card = {
    id: uuidv4(),
    title,
    content,
    group,
    likes: 0,
    likedBy: [],
    createdAt: new Date().toISOString(),
  };
  cards.unshift(card);
  res.status(201).json(card);
});

app.post('/api/cards/:id/like', (req, res) => {
  const card = cards.find((c) => c.id === req.params.id);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  const userId = req.body.userId || 'anonymous';
  const idx = card.likedBy.indexOf(userId);
  if (idx >= 0) {
    card.likedBy.splice(idx, 1);
    card.likes = Math.max(0, card.likes - 1);
  } else {
    card.likedBy.push(userId);
    card.likes += 1;
  }
  res.json(card);
});

app.get('/api/cards/:id/comments', (req, res) => {
  const cardComments = comments
    .filter((c) => c.cardId === req.params.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(cardComments);
});

app.post('/api/cards/:id/comments', (req, res) => {
  const { username, content } = req.body;
  if (!username || !content) {
    res.status(400).json({ error: 'Missing required fields' });
    return;
  }
  const card = cards.find((c) => c.id === req.params.id);
  if (!card) {
    res.status(404).json({ error: 'Card not found' });
    return;
  }
  const comment: Comment = {
    id: uuidv4(),
    cardId: req.params.id,
    username,
    content,
    avatar: '',
    createdAt: new Date().toISOString(),
  };
  comments.unshift(comment);
  res.status(201).json(comment);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
