import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface TopicOption {
  id: string;
  text: string;
  votes: number;
  color: string;
}

interface Topic {
  id: string;
  title: string;
  options: TopicOption[];
  deadline: string;
  createdAt: string;
  status: 'pending' | 'active' | 'ended';
}

interface Vote {
  id: string;
  topicId: string;
  optionId: string;
  voterId: string;
  timestamp: string;
  region: string;
}

interface Report {
  topicId: string;
  voteTrend: { time: string; count: number }[];
  regionDistribution: { region: string; count: number }[];
  hotComments: { text: string; frequency: number }[];
  totalVotes: number;
}

const OPTION_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AAE3E2'];
const REGIONS = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆'];
const HOT_COMMENTS_POOL = [
  '非常有创意的话题',
  '这个选项最棒了',
  '期待更多这样的活动',
  '互动性很强',
  '支持一下',
  '很有意思的投票',
  '我觉得都不错',
  '太难选择了',
  '这个话题很有讨论价值',
  '继续加油',
  '精彩的活动',
  '期待结果',
  '参与感很强',
  '设计得很好',
  '下次还会参加'
];

const topics: Topic[] = [];
const votes: Vote[] = [];

const generateMockVotes = (topicId: string, count: number): Vote[] => {
  const mockVotes: Vote[] = [];
  const topic = topics.find(t => t.id === topicId);
  if (!topic) return mockVotes;

  const startTime = new Date(topic.createdAt).getTime();
  const endTime = Math.min(Date.now(), new Date(topic.deadline).getTime());

  for (let i = 0; i < count; i++) {
    const randomTime = startTime + Math.random() * (endTime - startTime);
    mockVotes.push({
      id: uuidv4(),
      topicId,
      optionId: topic.options[Math.floor(Math.random() * topic.options.length)].id,
      voterId: uuidv4(),
      timestamp: new Date(randomTime).toISOString(),
      region: REGIONS[Math.floor(Math.random() * REGIONS.length)]
    });
  }
  return mockVotes;
};

const updateTopicStatus = (topic: Topic): Topic => {
  const now = new Date();
  const deadline = new Date(topic.deadline);
  const createdAt = new Date(topic.createdAt);

  if (now < createdAt) {
    return { ...topic, status: 'pending' };
  } else if (now > deadline) {
    return { ...topic, status: 'ended' };
  } else {
    return { ...topic, status: 'active' };
  }
};

const getTopicWithVoteCount = (topic: Topic): Topic & { totalVotes: number } => {
  const updatedTopic = updateTopicStatus(topic);
  const totalVotes = votes
    .filter(v => v.topicId === topic.id)
    .reduce((acc, v) => acc + 1, 0);

  const options = updatedTopic.options.map(opt => ({
    ...opt,
    votes: votes.filter(v => v.topicId === topic.id && v.optionId === opt.id).length
  }));

  return { ...updatedTopic, options, totalVotes };
};

app.get('/api/topics', (_req: Request, res: Response) => {
  const result = topics
    .map(getTopicWithVoteCount)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(result);
});

app.post('/api/topics', (req: Request, res: Response) => {
  const { title, options, deadline } = req.body;

  if (!title || !Array.isArray(options) || options.length < 4 || options.length > 6) {
    return res.status(400).json({ error: '标题不能为空，选项数量需在4-6个之间' });
  }

  const newTopic: Topic = {
    id: uuidv4(),
    title,
    options: options.map((text: string, index: number) => ({
      id: uuidv4(),
      text,
      votes: 0,
      color: OPTION_COLORS[index % OPTION_COLORS.length]
    })),
    deadline: new Date(deadline).toISOString(),
    createdAt: new Date().toISOString(),
    status: 'active'
  };

  topics.push(newTopic);

  const mockVoteCount = Math.floor(Math.random() * 50) + 20;
  const mockVotes = generateMockVotes(newTopic.id, mockVoteCount);
  votes.push(...mockVotes);

  res.json(getTopicWithVoteCount(newTopic));
});

app.put('/api/topics/:id', (req: Request, res: Response) => {
  const { id } = req.params;
  const { title, options, deadline } = req.body;

  const topicIndex = topics.findIndex(t => t.id === id);
  if (topicIndex === -1) {
    return res.status(404).json({ error: '话题不存在' });
  }

  const topic = topics[topicIndex];
  const updatedTopic = updateTopicStatus(topic);

  if (updatedTopic.status !== 'pending') {
    return res.status(400).json({ error: '只能编辑未开始的话题' });
  }

  if (title) updatedTopic.title = title;
  if (deadline) updatedTopic.deadline = new Date(deadline).toISOString();
  if (Array.isArray(options) && options.length >= 4 && options.length <= 6) {
    updatedTopic.options = options.map((text: string, index: number) => ({
      id: uuidv4(),
      text,
      votes: 0,
      color: OPTION_COLORS[index % OPTION_COLORS.length]
    }));
  }

  topics[topicIndex] = updatedTopic;
  res.json(getTopicWithVoteCount(updatedTopic));
});

app.delete('/api/topics/:id', (req: Request, res: Response) => {
  const { id } = req.params;

  const topicIndex = topics.findIndex(t => t.id === id);
  if (topicIndex === -1) {
    return res.status(404).json({ error: '话题不存在' });
  }

  const topic = topics[topicIndex];
  const updatedTopic = updateTopicStatus(topic);

  if (updatedTopic.status !== 'pending') {
    return res.status(400).json({ error: '只能删除未开始的话题' });
  }

  topics.splice(topicIndex, 1);
  res.json({ success: true });
});

app.post('/api/vote', (req: Request, res: Response) => {
  const { topicId, optionId, voterId } = req.body;

  if (!topicId || !optionId || !voterId) {
    return res.status(400).json({ error: '缺少必要参数' });
  }

  const topic = topics.find(t => t.id === topicId);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }

  const updatedTopic = updateTopicStatus(topic);
  if (updatedTopic.status === 'ended') {
    return res.status(400).json({ error: '投票已截止' });
  }

  const existingVote = votes.find(v => v.topicId === topicId && v.voterId === voterId);
  if (existingVote) {
    return res.status(400).json({ error: '您已投过票' });
  }

  const optionExists = topic.options.some(o => o.id === optionId);
  if (!optionExists) {
    return res.status(400).json({ error: '选项不存在' });
  }

  const newVote: Vote = {
    id: uuidv4(),
    topicId,
    optionId,
    voterId,
    timestamp: new Date().toISOString(),
    region: REGIONS[Math.floor(Math.random() * REGIONS.length)]
  };

  votes.push(newVote);

  res.json({ success: true, topic: getTopicWithVoteCount(topic) });
});

app.get('/api/report/:topicId', (req: Request, res: Response) => {
  const { topicId } = req.params;

  const topic = topics.find(t => t.id === topicId);
  if (!topic) {
    return res.status(404).json({ error: '话题不存在' });
  }

  const topicVotes = votes.filter(v => v.topicId === topicId);
  const totalVotes = topicVotes.length;

  const voteTrend: { time: string; count: number }[] = [];
  if (topicVotes.length > 0) {
    const sortedVotes = [...topicVotes].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startTime = new Date(sortedVotes[0].timestamp).getTime();
    const endTime = new Date(sortedVotes[sortedVotes.length - 1].timestamp).getTime();
    const interval = Math.max((endTime - startTime) / 10, 3600000);

    let currentTime = startTime;
    let count = 0;
    let voteIndex = 0;

    while (currentTime <= endTime + interval) {
      while (voteIndex < sortedVotes.length && new Date(sortedVotes[voteIndex].timestamp).getTime() <= currentTime) {
        count++;
        voteIndex++;
      }
      voteTrend.push({
        time: new Date(currentTime).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit' }),
        count
      });
      currentTime += interval;
    }
  }

  const regionMap = new Map<string, number>();
  topicVotes.forEach(v => {
    regionMap.set(v.region, (regionMap.get(v.region) || 0) + 1);
  });
  const regionDistribution = Array.from(regionMap.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);

  const commentCount = Math.min(15, Math.floor(totalVotes / 5) + 5);
  const hotComments: { text: string; frequency: number }[] = [];
  const usedComments = new Set<string>();

  for (let i = 0; i < commentCount; i++) {
    let comment: string;
    do {
      comment = HOT_COMMENTS_POOL[Math.floor(Math.random() * HOT_COMMENTS_POOL.length)];
    } while (usedComments.has(comment) && usedComments.size < HOT_COMMENTS_POOL.length);
    usedComments.add(comment);
    hotComments.push({
      text: comment,
      frequency: Math.floor(Math.random() * 20) + 5
    });
  }
  hotComments.sort((a, b) => b.frequency - a.frequency);

  const report: Report = {
    topicId,
    voteTrend,
    regionDistribution,
    hotComments,
    totalVotes
  };

  res.json(report);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
