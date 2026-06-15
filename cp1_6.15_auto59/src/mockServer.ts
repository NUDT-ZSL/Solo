import express, { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

interface VoteOption {
  id: string;
  title: string;
  imageUrl?: string;
  order: number;
}

interface Poll {
  id: string;
  name: string;
  deadline: string;
  options: VoteOption[];
  votes: Record<string, string[]>;
  createdAt: string;
  votedUsers: string[];
}

const polls: Poll[] = [
  {
    id: 'demo-poll-1',
    name: '最佳团建活动评选',
    deadline: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    options: [
      { id: 'opt-1', title: '户外拓展', imageUrl: '', order: 0 },
      { id: 'opt-2', title: '密室逃脱', imageUrl: '', order: 1 },
      { id: 'opt-3', title: '剧本杀', imageUrl: '', order: 2 },
    ],
    votes: { 'opt-1': ['user-a', 'user-b'], 'opt-2': ['user-c', 'user-d', 'user-e'], 'opt-3': ['user-f'] },
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    votedUsers: ['user-a', 'user-b', 'user-c', 'user-d', 'user-e', 'user-f'],
  },
  {
    id: 'demo-poll-2',
    name: '年度最佳电影投票',
    deadline: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    options: [
      { id: 'opt-4', title: '科幻片', order: 0 },
      { id: 'opt-5', title: '动作片', order: 1 },
      { id: 'opt-6', title: '喜剧片', order: 2 },
      { id: 'opt-7', title: '文艺片', order: 3 },
    ],
    votes: { 'opt-4': ['u1', 'u2', 'u3'], 'opt-5': ['u4', 'u5'], 'opt-6': ['u6', 'u7', 'u8', 'u9'], 'opt-7': ['u10'] },
    createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    votedUsers: ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7', 'u8', 'u9', 'u10'],
  },
];

app.get('/api/polls', (_req: Request, res: Response) => {
  res.json(polls);
});

app.post('/api/vote', (req: Request, res: Response) => {
  const { action } = req.body;

  if (action === 'create') {
    const { name, deadline, options } = req.body;
    if (!name || !deadline || !options || options.length < 2) {
      res.status(400).json({ error: '参数不完整' });
      return;
    }
    const newPoll: Poll = {
      id: uuidv4(),
      name,
      deadline,
      options: options.map((opt: { title: string; imageUrl?: string }, idx: number) => ({
        id: uuidv4(),
        title: opt.title,
        imageUrl: opt.imageUrl || undefined,
        order: idx,
      })),
      votes: {},
      createdAt: new Date().toISOString(),
      votedUsers: [],
    };
    newPoll.options.forEach((opt) => {
      newPoll.votes[opt.id] = [];
    });
    polls.push(newPoll);
    res.json({ success: true, poll: newPoll });
    return;
  }

  if (action === 'submit') {
    const { pollId, optionId, userId } = req.body;
    const poll = polls.find((p) => p.id === pollId);
    if (!poll) {
      res.status(404).json({ error: '投票不存在' });
      return;
    }
    if (new Date(poll.deadline).getTime() <= Date.now()) {
      res.status(400).json({ error: '投票已截止' });
      return;
    }
    if (poll.votedUsers.includes(userId)) {
      res.status(400).json({ error: '您已经投过票了' });
      return;
    }
    const option = poll.options.find((o) => o.id === optionId);
    if (!option) {
      res.status(400).json({ error: '无效的选项' });
      return;
    }
    poll.votes[optionId] = [...(poll.votes[optionId] || []), userId];
    poll.votedUsers.push(userId);
    res.json({ success: true, poll });
    return;
  }

  res.status(400).json({ error: '未知操作' });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
});
