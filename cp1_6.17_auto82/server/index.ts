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
  device: string;
}

interface Report {
  topicId: string;
  voteTrend: { time: string; count: number }[];
  regionDistribution: { region: string; count: number }[];
  hotComments: { text: string; frequency: number }[];
  totalVotes: number;
}

interface DetailedReport extends Report {
  hourlyTrend: { hour: string; count: number }[];
  deviceDistribution: { device: string; count: number; percentage: number }[];
  commentKeywords: { keyword: string; frequency: number; sentiment: 'positive' | 'neutral' | 'negative' }[];
  optionPerformance: { optionId: string; text: string; votes: number; percentage: number; color: string }[];
  peakVotingTime: { time: string; count: number };
  averageVotesPerHour: number;
  engagementRate: number;
}

const OPTION_COLORS = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AAE3E2'];
const REGIONS = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安', '南京', '重庆'];
const DEVICES = ['iPhone', 'Android', 'Windows PC', 'Mac', 'iPad', '其他'];
const COMMENT_KEYWORDS = ['创意', '有趣', '支持', '期待', '精彩', '互动', '选择', '讨论', '参与', '设计', '活动', '投票', '话题', '结果', '分享'];
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
      region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
      device: DEVICES[Math.floor(Math.random() * DEVICES.length)]
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
    region: REGIONS[Math.floor(Math.random() * REGIONS.length)],
    device: DEVICES[Math.floor(Math.random() * DEVICES.length)]
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

const getDetailedReport = (topicId: string): DetailedReport | null => {
  const topic = topics.find(t => t.id === topicId);
  if (!topic) return null;

  const topicVotes = votes.filter(v => v.topicId === topicId);
  const totalVotes = topicVotes.length;

  const voteTrend: { time: string; count: number }[] = [];
  if (topicVotes.length > 0) {
    const sortedVotes = [...topicVotes].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const startTime = new Date(sortedVotes[0].timestamp).getTime();
    const endTime = new Date(sortedVotes[sortedVotes.length - 1].timestamp).getTime();
    const interval = Math.max((endTime - startTime) / 12, 3600000);

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

  const hourlyTrend: { hour: string; count: number }[] = [];
  const hourMap = new Map<string, number>();
  topicVotes.forEach(v => {
    const hour = new Date(v.timestamp).toLocaleString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit' });
    hourMap.set(hour, (hourMap.get(hour) || 0) + 1);
  });
  Array.from(hourMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .forEach(([hour, count]) => {
      hourlyTrend.push({ hour, count });
    });

  let peakVotingTime = { time: '', count: 0 };
  if (hourlyTrend.length > 0) {
    const peak = hourlyTrend.reduce((max, curr) => curr.count > max.count ? curr : max, hourlyTrend[0]);
    peakVotingTime = { time: peak.hour, count: peak.count };
  }

  const regionMap = new Map<string, number>();
  topicVotes.forEach(v => {
    regionMap.set(v.region, (regionMap.get(v.region) || 0) + 1);
  });
  const regionDistribution = Array.from(regionMap.entries())
    .map(([region, count]) => ({ region, count }))
    .sort((a, b) => b.count - a.count);

  const deviceMap = new Map<string, number>();
  topicVotes.forEach(v => {
    deviceMap.set(v.device, (deviceMap.get(v.device) || 0) + 1);
  });
  const deviceDistribution = Array.from(deviceMap.entries())
    .map(([device, count]) => ({
      device,
      count,
      percentage: totalVotes > 0 ? Math.round((count / totalVotes) * 100 * 10) / 10 : 0
    }))
    .sort((a, b) => b.count - a.count);

  const commentKeywords: { keyword: string; frequency: number; sentiment: 'positive' | 'neutral' | 'negative' }[] = [];
  const usedKeywords = new Set<string>();
  const sentimentPool: ('positive' | 'neutral' | 'negative')[] = ['positive', 'positive', 'positive', 'neutral', 'neutral', 'negative'];
  
  for (let i = 0; i < Math.min(12, COMMENT_KEYWORDS.length); i++) {
    let keyword: string;
    do {
      keyword = COMMENT_KEYWORDS[Math.floor(Math.random() * COMMENT_KEYWORDS.length)];
    } while (usedKeywords.has(keyword));
    usedKeywords.add(keyword);
    commentKeywords.push({
      keyword,
      frequency: Math.floor(Math.random() * 30) + 10,
      sentiment: sentimentPool[Math.floor(Math.random() * sentimentPool.length)]
    });
  }
  commentKeywords.sort((a, b) => b.frequency - a.frequency);

  const optionPerformance = topic.options.map(opt => {
    const optVotes = votes.filter(v => v.topicId === topicId && v.optionId === opt.id).length;
    return {
      optionId: opt.id,
      text: opt.text,
      votes: optVotes,
      percentage: totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100 * 10) / 10 : 0,
      color: opt.color
    };
  }).sort((a, b) => b.votes - a.votes);

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

  const topicDurationHours = (new Date(topic.deadline).getTime() - new Date(topic.createdAt).getTime()) / (1000 * 60 * 60);
  const averageVotesPerHour = topicDurationHours > 0 ? Math.round((totalVotes / topicDurationHours) * 10) / 10 : 0;

  const engagementRate = Math.min(100, Math.round((totalVotes / (Math.random() * 500 + 100)) * 100 * 10) / 10);

  return {
    topicId,
    voteTrend,
    hourlyTrend,
    regionDistribution,
    deviceDistribution,
    commentKeywords,
    hotComments,
    optionPerformance,
    peakVotingTime,
    averageVotesPerHour,
    engagementRate,
    totalVotes
  };
};

app.get('/api/detailed-report/:topicId', (req: Request, res: Response) => {
  const { topicId } = req.params;

  const report = getDetailedReport(topicId);
  if (!report) {
    return res.status(404).json({ error: '话题不存在' });
  }

  res.json(report);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
