import express from 'express';
import { createServer } from 'http';
import { Server, Socket } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';
import type { Request, Response } from 'express';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

type Fragment = {
  id: string;
  text: string;
  hue: number;
  posX: number;
  posY: number;
  corridorX: number;
  collectedBy: string[];
};

type PoemFragment = {
  id: string;
  text: string;
  row: number;
  col: number;
};

type Poem = {
  id: string;
  title: string;
  lines: string[];
  fragments: PoemFragment[];
  authorId: string;
  authorName: string;
  likes: number;
  comments: Comment[];
  createdAt: number;
  likedBy: string[];
};

type Comment = {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: number;
};

type OnlineUser = {
  id: string;
  name: string;
  socketId: string;
  position: { x: number; y: number };
  collectedCount: number;
  completedLines: number;
  lastActive: number;
};

const FRAGMENT_POOL = [
  '月光', '洒落', '清风', '拂过', '疏影', '横斜', '暗香', '浮动',
  '青山', '不老', '绿水', '长流', '孤帆', '远影', '碧空', '如洗',
  '桃花', '流水', '烟花', '三月', '江南', '烟雨', '杨柳', '依依',
  '小桥', '人家', '古道', '西风', '断肠', '天涯', '夕阳', '西下',
  '长河', '落日', '大漠', '孤烟', '黄河', '入海', '白日', '依山',
  '千山', '鸟飞', '万径', '人踪', '孤舟', '蓑笠', '独钓', '寒江',
  '两个', '黄鹂', '一行', '白鹭', '窗含', '西岭', '门泊', '东吴',
  '春眠', '不觉', '处处', '啼鸟', '夜来', '风雨', '花落', '多少',
  '床前', '明月', '疑是', '地上', '举头', '望月', '低头', '故乡',
  '红豆', '南国', '春来', '几枝', '愿君', '多采', '此物', '相思',
  '云想', '衣裳', '春风', '拂槛', '若非', '群玉', '会向', '瑶台',
  '飞流', '直下', '银河', '九天', '日照', '香炉', '遥看', '瀑布',
  '朝辞', '白帝', '千里', '江陵', '两岸', '猿声', '轻舟', '万山',
  '葡萄', '美酒', '夜光', '欲饮', '琵琶', '马上', '醉卧', '沙场',
  '秦时', '明月', '汉时', '长征', '但使', '龙城', '不教', '胡马'
];

const SUBJECTS = ['月光', '清风', '青山', '绿水', '孤帆', '桃花', '小桥', '古道', '长河', '大漠', '黄鹂', '白鹭', '春眠', '明月', '红豆', '春风', '飞流', '日照', '朝辞', '葡萄', '秦时'];
const VERBS = ['洒落', '拂过', '横斜', '浮动', '不老', '长流', '远影', '如洗', '流水', '三月', '烟雨', '依依', '人家', '西风', '落日', '孤烟', '入海', '依山', '鸟飞', '人踪'];
const OBJECTS = ['碧空', '江南', '天涯', '夕阳', '银河', '白帝', '夜光', '琵琶', '故乡', '相思', '衣裳', '瑶台', '香炉', '瀑布', '江陵', '猿声', '万山', '美酒', '胡马', '东吴'];

const fragments: Map<string, Fragment> = new Map();
const poems: Map<string, Poem> = new Map();
const onlineUsers: Map<string, OnlineUser> = new Map();
const userCorridorOffset: Map<string, number> = new Map();

function generateFragments(count: number = 20): Fragment[] {
  const result: Fragment[] = [];
  const usedIndices = new Set<number>();
  
  for (let i = 0; i < count; i++) {
    let poolIndex: number;
    do {
      poolIndex = Math.floor(Math.random() * FRAGMENT_POOL.length);
    } while (usedIndices.has(poolIndex) && usedIndices.size < FRAGMENT_POOL.length);
    usedIndices.add(poolIndex);
    
    const fragment: Fragment = {
      id: uuidv4(),
      text: FRAGMENT_POOL[poolIndex],
      hue: 40 + Math.random() * 20,
      posX: Math.random() * 600 + 100,
      posY: Math.random() * 300 + 200,
      corridorX: Math.floor(Math.random() * 10) * 1000 + Math.random() * 500,
      collectedBy: []
    };
    fragments.set(fragment.id, fragment);
    result.push(fragment);
  }
  
  return result;
}

function validatePoemLine(line: string): { valid: boolean; score: number } {
  const chars = line.replace(/\s/g, '');
  if (chars.length < 5 || chars.length > 7) {
    return { valid: false, score: 0 };
  }
  
  let hasSubject = false;
  let hasVerb = false;
  let hasObject = false;
  let score = 0;
  
  for (const s of SUBJECTS) {
    if (line.includes(s)) {
      hasSubject = true;
      score += 30;
      break;
    }
  }
  
  for (const v of VERBS) {
    if (line.includes(v)) {
      hasVerb = true;
      score += 30;
      break;
    }
  }
  
  for (const o of OBJECTS) {
    if (line.includes(o)) {
      hasObject = true;
      score += 30;
      break;
    }
  }
  
  if (chars.length === 5) score += 5;
  if (chars.length === 7) score += 10;
  
  const structureScore = (hasSubject ? 1 : 0) + (hasVerb ? 1 : 0) + (hasObject ? 1 : 0);
  if (structureScore >= 2) {
    score += structureScore * 10;
  }
  
  const valid = structureScore >= 2 && score >= 50;
  return { valid, score: Math.min(score, 100) };
}

function validateLineCombination(fragments: PoemFragment[]): { valid: boolean; line: string; score: number } {
  const line = fragments.map(f => f.text).join('');
  return { ...validatePoemLine(line), line };
}

app.get('/api/fragments', (_req: Request, res: Response) => {
  const fragList = Array.from(fragments.values());
  if (fragList.length === 0) {
    generateFragments(20);
  }
  res.json(Array.from(fragments.values()));
});

app.post('/api/fragments/regenerate', (_req: Request, res: Response) => {
  fragments.clear();
  const newFragments = generateFragments(20);
  io.emit('fragments:regenerated', newFragments);
  res.json(newFragments);
});

app.get('/api/poems', (_req: Request, res: Response) => {
  res.json(Array.from(poems.values()).sort((a, b) => b.createdAt - a.createdAt));
});

app.get('/api/poems/:id', (req: Request, res: Response) => {
  const poem = poems.get(req.params.id);
  if (!poem) {
    return res.status(404).json({ error: '诗歌不存在' });
  }
  res.json(poem);
});

app.post('/api/poems', (req: Request, res: Response) => {
  const { title, lines, fragments: poemFragments, authorId, authorName } = req.body;
  
  if (!lines || lines.length < 4) {
    return res.status(400).json({ error: '至少需要4句完整诗句' });
  }
  
  for (const line of lines) {
    const validation = validatePoemLine(line);
    if (!validation.valid) {
      return res.status(400).json({ error: `诗句 "${line}" 不符合诗歌规则` });
    }
  }
  
  const poem: Poem = {
    id: uuidv4(),
    title: (title || '无题').slice(0, 10),
    lines,
    fragments: poemFragments || [],
    authorId: authorId || 'anonymous',
    authorName: authorName || '无名诗人',
    likes: 0,
    comments: [],
    createdAt: Date.now(),
    likedBy: []
  };
  
  poems.set(poem.id, poem);
  io.emit('poem:published', poem);
  
  res.json(poem);
});

app.post('/api/poems/:id/like', (req: Request, res: Response) => {
  const poem = poems.get(req.params.id);
  if (!poem) {
    return res.status(404).json({ error: '诗歌不存在' });
  }
  
  const { userId } = req.body;
  if (poem.likedBy.includes(userId)) {
    return res.json({ ...poem, alreadyLiked: true });
  }
  
  poem.likes++;
  poem.likedBy.push(userId);
  
  io.emit('poem:liked', { id: poem.id, likes: poem.likes, userId });
  
  if (poem.likes >= 10) {
    io.emit('effect:petals', { poemId: poem.id, count: 50, duration: 3000 });
  }
  
  res.json(poem);
});

app.post('/api/poems/:id/comments', (req: Request, res: Response) => {
  const poem = poems.get(req.params.id);
  if (!poem) {
    return res.status(404).json({ error: '诗歌不存在' });
  }
  
  const { userId, userName, text } = req.body;
  const comment: Comment = {
    id: uuidv4(),
    userId: userId || 'anonymous',
    userName: userName || '游客',
    text: text.slice(0, 200),
    createdAt: Date.now()
  };
  
  poem.comments.push(comment);
  io.emit('poem:comment', { id: poem.id, comment });
  
  res.json(comment);
});

app.post('/api/validate-line', (req: Request, res: Response) => {
  const { fragments: lineFragments } = req.body;
  const result = validateLineCombination(lineFragments || []);
  res.json(result);
});

io.on('connection', (socket: Socket) => {
  console.log('用户连接:', socket.id);
  
  const userId = uuidv4();
  const user: OnlineUser = {
    id: userId,
    name: `诗人${Math.floor(Math.random() * 9000 + 1000)}`,
    socketId: socket.id,
    position: { x: 0, y: 0 },
    collectedCount: 0,
    completedLines: 0,
    lastActive: Date.now()
  };
  onlineUsers.set(userId, user);
  userCorridorOffset.set(userId, 0);
  
  socket.emit('user:init', { userId, user });
  io.emit('users:update', Array.from(onlineUsers.values()));
  
  if (fragments.size === 0) {
    generateFragments(20);
  }
  
  socket.on('corridor:move', (data: { position: { x: number; y: number }; offset: number }) => {
    const currentUser = onlineUsers.get(userId);
    if (currentUser) {
      currentUser.position = data.position;
      currentUser.lastActive = Date.now();
      userCorridorOffset.set(userId, data.offset || 0);
    }
  });
  
  socket.on('fragment:hover', (fragmentId: string) => {
    io.emit('fragment:activity', { fragmentId, userId, type: 'hover' });
  });
  
  socket.on('fragment:collect', (fragmentId: string) => {
    const fragment = fragments.get(fragmentId);
    const currentUser = onlineUsers.get(userId);
    
    if (fragment && currentUser) {
      if (!fragment.collectedBy.includes(userId)) {
        fragment.collectedBy.push(userId);
        currentUser.collectedCount++;
        currentUser.lastActive = Date.now();
      }
      
      if (fragment.collectedBy.length > 1) {
        io.emit('fragment:split', { fragmentId, collectedBy: fragment.collectedBy });
      }
      
      socket.emit('fragment:collected', fragment);
      io.emit('users:update', Array.from(onlineUsers.values()));
    }
  });
  
  socket.on('puzzle:completeLine', (data: { line: string; score: number }) => {
    const currentUser = onlineUsers.get(userId);
    if (currentUser) {
      currentUser.completedLines++;
      currentUser.lastActive = Date.now();
      io.emit('puzzle:lineComplete', { userId, user: currentUser, line: data.line });
      io.emit('users:update', Array.from(onlineUsers.values()));
    }
  });
  
  socket.on('user:activity', () => {
    const currentUser = onlineUsers.get(userId);
    if (currentUser) {
      currentUser.lastActive = Date.now();
    }
  });
  
  socket.on('disconnect', () => {
    console.log('用户断开:', socket.id);
    onlineUsers.delete(userId);
    userCorridorOffset.delete(userId);
    io.emit('users:update', Array.from(onlineUsers.values()));
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(PORT, () => {
  console.log(`回声诗廊服务器运行在 http://localhost:${PORT}`);
  generateFragments(20);
});
