import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3002;

app.use(cors());
app.use(express.json());

type EmotionType = 'joy' | 'sadness' | 'nostalgia' | 'confusion' | 'surprise';

interface Story {
  id: string;
  title: string;
  content: string;
  emotion: EmotionType;
  createdAt: string;
  replyCount: number;
}

interface Reply {
  id: string;
  storyId: string;
  content: string;
  type: 'text' | 'voice';
  emotion: EmotionType;
  createdAt: string;
}

interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total: number;
  page: number;
}

const EMOTIONS: EmotionType[] = ['joy', 'sadness', 'nostalgia', 'confusion', 'surprise'];

const SAMPLE_TITLES = [
  '那个夏日的午后', '深夜食堂的偶遇', '雨中的告别', '第一次独自旅行',
  '图书馆里的秘密', '旧照片里的人', '地铁上的陌生人', '月光下的对话',
  '一封未寄出的信', '那年冬天的雪', '海边的清晨', '阁楼里的老盒子',
  '毕业季的约定', '街角咖啡店', '最后一班公交', '童年的星空'
];

const SAMPLE_CONTENTS = [
  '记忆里那个夏日的午后，阳光透过梧桐树叶洒在地面上，形成斑驳的光影。我坐在公园的长椅上，手里拿着一本翻旧的书，耳边是蝉鸣声和远处孩子们的笑声。那时候的我们以为时间会永远停留在那一刻，却不知有些美好只能成为回忆。后来我去过很多地方，见过更美的风景，却再也找不到那天下午的宁静。',
  '深夜十一点，我走进那家24小时营业的小店，只有我一个客人。老板是个和蔼的中年人，他默默给我端上一碗热汤面，说"年轻人，这么晚了还没休息？"我坐在靠窗的位置，看着外面空荡荡的街道，突然觉得这个城市其实也没有那么冷漠。有时候陌生人的一句关心，就能温暖整个冬天。',
  '那天的雨下得很大，你说"就送到这里吧"。我站在雨中，看着你的背影渐渐消失在街角，没有追上去，也没有说再见。我们都知道这是最好的选择，可为什么眼泪还是止不住地流。后来我学会了带伞，却再也没有遇到过那场雨。',
  '22岁那年，我第一次一个人坐上了去远方的火车。窗外的风景不停变换，从城市到乡村，从平原到山川。我在火车上遇到了很多有趣的人，听到了很多不同的故事。那趟旅行让我明白，原来世界这么大，而我那些自以为是的烦恼，其实都不算什么。',
  '图书馆三楼靠窗的位置，我总是能在同一时间遇到你。我们从未说过话，却默契地各自阅读。有一天你突然递过来一张纸条，上面写着"你也喜欢这本书吗？"从那以后，每个下午都变得值得期待。后来图书馆翻新了，那个位置换了新的桌子，可我总觉得那里还留着你的气息。'
];

const stories: Story[] = [];
const replies: Reply[] = [];

function randomEmotion(): EmotionType {
  return EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];
}

function randomDate(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - Math.floor(Math.random() * daysAgo));
  date.setHours(Math.floor(Math.random() * 24));
  date.setMinutes(Math.floor(Math.random() * 60));
  date.setSeconds(Math.floor(Math.random() * 60));
  return date.toISOString();
}

function generateMockData() {
  for (let i = 0; i < 55; i++) {
    const story: Story = {
      id: uuidv4(),
      title: SAMPLE_TITLES[i % SAMPLE_TITLES.length],
      content: SAMPLE_CONTENTS[i % SAMPLE_CONTENTS.length],
      emotion: randomEmotion(),
      createdAt: randomDate(28),
      replyCount: Math.floor(Math.random() * 6)
    };
    stories.push(story);

    for (let j = 0; j < story.replyCount; j++) {
      replies.push({
        id: uuidv4(),
        storyId: story.id,
        content: ['感同身受，谢谢你的分享。', '这个故事让我想起了很多往事。', '希望你一切都好。', '加油，未来会更好的！', '你的文字真的很温暖。'][Math.floor(Math.random() * 5)],
        type: 'text',
        emotion: randomEmotion(),
        createdAt: randomDate(28)
      });
    }
  }
  stories.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

generateMockData();

app.get('/api/stories', (req, res) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 20;
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginated = stories.slice(start, end);
  
  const response: PaginatedResponse<Story> = {
    data: paginated,
    hasMore: end < stories.length,
    total: stories.length,
    page
  };
  res.json(response);
});

app.get('/api/stories/:id', (req, res) => {
  const story = stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: '故事不存在' });
  res.json(story);
});

app.post('/api/stories', (req, res) => {
  const { title, content, emotion } = req.body;
  if (!title || !content || !emotion) return res.status(400).json({ error: '必填项缺失' });
  if (title.length > 30) return res.status(400).json({ error: '标题不能超过30字' });
  if (content.length > 500) return res.status(400).json({ error: '内容不能超过500字' });
  
  const story: Story = {
    id: uuidv4(),
    title: title.trim(),
    content: content.trim(),
    emotion: emotion as EmotionType,
    createdAt: new Date().toISOString(),
    replyCount: 0
  };
  stories.unshift(story);
  res.status(201).json(story);
});

app.get('/api/stories/user/:date', (req, res) => {
  const targetDate = new Date(req.params.date);
  const dayStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const dayStories = stories.filter(s => {
    const d = new Date(s.createdAt);
    return d >= dayStart && d < dayEnd;
  });
  res.json(dayStories);
});

app.get('/api/replies', (req, res) => {
  const { storyId } = req.query;
  const result = storyId ? replies.filter(r => r.storyId === storyId) : replies;
  res.json(result);
});

app.post('/api/replies', (req, res) => {
  const { storyId, content, type = 'text', emotion = 'joy' } = req.body;
  if (!storyId || !content) return res.status(400).json({ error: '必填项缺失' });
  if (content.length > 200) return res.status(400).json({ error: '回响不能超过200字' });
  
  const reply: Reply = {
    id: uuidv4(),
    storyId,
    content: content.trim(),
    type: type as 'text' | 'voice',
    emotion: emotion as EmotionType,
    createdAt: new Date().toISOString()
  };
  replies.push(reply);
  
  const story = stories.find(s => s.id === storyId);
  if (story) story.replyCount++;
  
  res.status(201).json(reply);
});

app.get('/api/stats/user', (req, res) => {
  const now = new Date();
  let streak = 0;
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    const hasStory = stories.some(s => {
      const d = new Date(s.createdAt);
      return d >= dayStart && d < dayEnd;
    });
    if (hasStory) streak++;
    else if (i > 0) break;
  }
  
  const emotionCounts: Record<string, number> = {};
  stories.forEach(s => { emotionCounts[s.emotion] = (emotionCounts[s.emotion] || 0) + 1; });
  
  let mostCommon: EmotionType = 'joy';
  let maxCount = 0;
  Object.entries(emotionCounts).forEach(([e, c]) => {
    if (c > maxCount) { maxCount = c; mostCommon = e as EmotionType; }
  });
  
  res.json({
    totalStories: stories.length,
    totalReplies: replies.length,
    mostCommonEmotion: mostCommon,
    streakDays: streak
  });
});

app.get('/api/stats/calendar', (req, res) => {
  const weeks = parseInt(req.query.weeks as string) || 4;
  const result: Record<string, { count: number; emotions: Record<string, number> }> = {};
  const now = new Date();
  
  for (let i = 0; i < weeks * 7; i++) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const dateStr = date.toISOString().split('T')[0];
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const dayStories = stories.filter(s => {
      const d = new Date(s.createdAt);
      return d >= dayStart && d < dayEnd;
    });
    
    const emotions: Record<string, number> = {};
    dayStories.forEach(s => { emotions[s.emotion] = (emotions[s.emotion] || 0) + 1; });
    
    result[dateStr] = { count: dayStories.length, emotions };
  }
  
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`时光树洞后端运行在 http://localhost:${PORT}`);
});
