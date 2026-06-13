import express, { Request, Response } from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const db = {
  users: Datastore.create({ filename: './data/users.db', autoload: true }),
  meetings: Datastore.create({ filename: './data/meetings.db', autoload: true }),
  proposals: Datastore.create({ filename: './data/proposals.db', autoload: true }),
  votes: Datastore.create({ filename: './data/votes.db', autoload: true }),
  comments: Datastore.create({ filename: './data/comments.db', autoload: true }),
  meetingNotes: Datastore.create({ filename: './data/meetingNotes.db', autoload: true }),
};

interface User {
  _id?: string;
  id: string;
  name: string;
  avatar: string;
}

interface Meeting {
  _id?: string;
  id: string;
  title: string;
  date: string;
  status: 'in_progress' | 'ended';
  participants: string[];
  unreadComments: number;
}

interface Proposal {
  _id?: string;
  id: string;
  meetingId: string;
  title: string;
  summary: string;
  coverImage: string;
  createdAt: string;
}

interface Vote {
  _id?: string;
  id: string;
  proposalId: string;
  userId: string;
  voteType: 'approve' | 'reject' | 'abstain';
  createdAt: string;
}

interface Comment {
  _id?: string;
  id: string;
  proposalId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  parentId: string | null;
  createdAt: string;
}

const seedData = async () => {
  const usersCount = await db.users.count({});
  if (usersCount === 0) {
    const users: User[] = [
      { id: 'user1', name: '张编辑', avatar: '#fef3c7' },
      { id: 'user2', name: '李主编', avatar: '#dbeafe' },
      { id: 'user3', name: '王策划', avatar: '#dcfce7' },
      { id: 'user4', name: '赵设计', avatar: '#fce7f3' },
      { id: 'user5', name: '刘发行', avatar: '#e0e7ff' },
    ];
    await db.users.insert(users);

    const meetings: Meeting[] = [
      { id: 'meeting1', title: '2024春季新书选题会', date: '2024-03-15', status: 'in_progress', participants: ['user1', 'user2', 'user3'], unreadComments: 3 },
      { id: 'meeting2', title: '科技类丛书规划会', date: '2024-03-10', status: 'in_progress', participants: ['user1', 'user3', 'user4'], unreadComments: 5 },
      { id: 'meeting3', title: '文学作品评审会', date: '2024-03-05', status: 'ended', participants: ['user2', 'user3', 'user5'], unreadComments: 0 },
      { id: 'meeting4', title: '儿童读物策划会', date: '2024-02-28', status: 'ended', participants: ['user1', 'user4', 'user5'], unreadComments: 2 },
    ];
    await db.meetings.insert(meetings);

    const proposals: Proposal[] = [
      { id: 'prop1', meetingId: 'meeting1', title: '《人工智能时代的教育变革》', summary: '<p>探讨<strong>人工智能</strong>技术对传统教育模式的冲击与机遇，分析未来教育的发展方向。</p><p>本书将结合最新的<em>AI技术</em>案例，为教育工作者提供实用的指导建议。</p>', coverImage: '', createdAt: '2024-03-15T09:00:00Z' },
      { id: 'prop2', meetingId: 'meeting1', title: '《深海探险手记》', summary: '<p>跟随海洋生物学家的脚步，探索神秘的深海世界。</p><p>书中包含大量<strong>珍贵照片</strong>和<em>第一手资料</em>。</p>', coverImage: '', createdAt: '2024-03-15T09:30:00Z' },
      { id: 'prop3', meetingId: 'meeting1', title: '《极简生活哲学》', summary: '<p>在繁忙的现代生活中寻找内心的宁静。</p><p>通过<strong>简约的生活方式</strong>，实现<em>精神的富足</em>。</p>', coverImage: '', createdAt: '2024-03-15T10:00:00Z' },
      { id: 'prop4', meetingId: 'meeting2', title: '《量子计算入门》', summary: '<p>用通俗易懂的语言解释量子计算的基本原理。</p>', coverImage: '', createdAt: '2024-03-10T14:00:00Z' },
      { id: 'prop5', meetingId: 'meeting2', title: '《区块链应用实战》', summary: '<p>从技术到应用，全面解析区块链。</p>', coverImage: '', createdAt: '2024-03-10T14:30:00Z' },
    ];
    await db.proposals.insert(proposals);

    const votes: Vote[] = [
      { id: 'vote1', proposalId: 'prop1', userId: 'user1', voteType: 'approve', createdAt: '2024-03-15T09:15:00Z' },
      { id: 'vote2', proposalId: 'prop1', userId: 'user2', voteType: 'approve', createdAt: '2024-03-15T09:16:00Z' },
      { id: 'vote3', proposalId: 'prop1', userId: 'user3', voteType: 'reject', createdAt: '2024-03-15T09:17:00Z' },
      { id: 'vote4', proposalId: 'prop2', userId: 'user1', voteType: 'approve', createdAt: '2024-03-15T09:45:00Z' },
      { id: 'vote5', proposalId: 'prop2', userId: 'user2', voteType: 'approve', createdAt: '2024-03-15T09:46:00Z' },
      { id: 'vote6', proposalId: 'prop2', userId: 'user3', voteType: 'approve', createdAt: '2024-03-15T09:47:00Z' },
      { id: 'vote7', proposalId: 'prop3', userId: 'user1', voteType: 'abstain', createdAt: '2024-03-15T10:15:00Z' },
      { id: 'vote8', proposalId: 'prop3', userId: 'user2', voteType: 'reject', createdAt: '2024-03-15T10:16:00Z' },
      { id: 'vote9', proposalId: 'prop3', userId: 'user3', voteType: 'reject', createdAt: '2024-03-15T10:17:00Z' },
    ];
    await db.votes.insert(votes);

    const comments: Comment[] = [
      { id: 'comm1', proposalId: 'prop1', userId: 'user1', userName: '张编辑', userAvatar: '#fef3c7', content: '这个选题很有前景，符合当前热点！👍', parentId: null, createdAt: '2024-03-15T09:20:00Z' },
      { id: 'comm2', proposalId: 'prop1', userId: 'user2', userName: '李主编', userAvatar: '#dbeafe', content: '我也觉得不错，但需要更深入的案例分析。', parentId: null, createdAt: '2024-03-15T09:22:00Z' },
      { id: 'comm3', proposalId: 'prop1', userId: 'user3', userName: '王策划', userAvatar: '#dcfce7', content: '市场上类似书籍太多，需要突出差异化。', parentId: 'comm2', createdAt: '2024-03-15T09:25:00Z' },
      { id: 'comm4', proposalId: 'prop2', userId: 'user1', userName: '张编辑', userAvatar: '#fef3c7', content: '封面设计可以更大胆一些，用深海蓝色调🌊', parentId: null, createdAt: '2024-03-15T09:50:00Z' },
      { id: 'comm5', proposalId: 'prop2', userId: 'user4', userName: '赵设计', userAvatar: '#fce7f3', content: '同意，可以加入一些荧光元素增加神秘感。', parentId: 'comm4', createdAt: '2024-03-15T09:52:00Z' },
    ];
    await db.comments.insert(comments);

    for (let i = 6; i <= 55; i++) {
      const comment: Comment = {
        id: `comm${i}`,
        proposalId: 'prop1',
        userId: `user${(i % 5) + 1}`,
        userName: ['张编辑', '李主编', '王策划', '赵设计', '刘发行'][i % 5],
        userAvatar: ['#fef3c7', '#dbeafe', '#dcfce7', '#fce7f3', '#e0e7ff'][i % 5],
        content: `这是第 ${i - 5} 条评论，讨论内容非常精彩！📚`,
        parentId: null,
        createdAt: new Date(Date.now() - (55 - i) * 60000).toISOString(),
      };
      await db.comments.insert(comment);
    }
  }
};

seedData();

app.get('/api/users', async (req: Request, res: Response) => {
  try {
    const users = await db.users.find({});
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: '获取用户列表失败' });
  }
});

app.get('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const user = await db.users.findOne({ id: req.params.id });
    if (!user) {
      return res.status(404).json({ error: '用户不存在' });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ error: '获取用户信息失败' });
  }
});

app.get('/api/meetings', async (req: Request, res: Response) => {
  try {
    const { userId } = req.query;
    let query = {};
    if (userId) {
      query = { participants: userId as string };
    }
    const meetings = await db.meetings.find(query).sort({ date: -1 });
    res.json(meetings);
  } catch (error) {
    res.status(500).json({ error: '获取会议列表失败' });
  }
});

app.get('/api/meetings/:id', async (req: Request, res: Response) => {
  try {
    const meeting = await db.meetings.findOne({ id: req.params.id });
    if (!meeting) {
      return res.status(404).json({ error: '会议不存在' });
    }
    res.json(meeting);
  } catch (error) {
    res.status(500).json({ error: '获取会议信息失败' });
  }
});

app.get('/api/meetings/:id/proposals', async (req: Request, res: Response) => {
  try {
    const proposals = await db.proposals.find({ meetingId: req.params.id }).sort({ createdAt: 1 });
    const proposalsWithVotes = await Promise.all(
      proposals.map(async (proposal) => {
        const votes = await db.votes.find({ proposalId: proposal.id });
        return { ...proposal, votes };
      })
    );
    res.json(proposalsWithVotes);
  } catch (error) {
    res.status(500).json({ error: '获取选题列表失败' });
  }
});

app.post('/api/proposals', async (req: Request, res: Response) => {
  try {
    const { meetingId, title, summary } = req.body;
    const proposal: Proposal = {
      id: uuidv4(),
      meetingId,
      title,
      summary,
      coverImage: '',
      createdAt: new Date().toISOString(),
    };
    const newProposal = await db.proposals.insert(proposal);
    res.status(201).json(newProposal);
  } catch (error) {
    res.status(500).json({ error: '创建选题失败' });
  }
});

app.put('/api/proposals/:id', async (req: Request, res: Response) => {
  try {
    const { title, summary } = req.body;
    const updated = await db.proposals.update({ id: req.params.id }, { $set: { title, summary } }, { returnUpdatedDocs: true });
    if (!updated) {
      return res.status(404).json({ error: '选题不存在' });
    }
    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: '更新选题失败' });
  }
});

app.post('/api/votes', async (req: Request, res: Response) => {
  try {
    const { proposalId, userId, voteType } = req.body;
    const existingVote = await db.votes.findOne({ proposalId, userId });
    if (existingVote) {
      await db.votes.update({ id: existingVote.id }, { $set: { voteType, createdAt: new Date().toISOString() } });
      const updated = await db.votes.findOne({ id: existingVote.id });
      res.json(updated);
    } else {
      const vote: Vote = {
        id: uuidv4(),
        proposalId,
        userId,
        voteType,
        createdAt: new Date().toISOString(),
      };
      const newVote = await db.votes.insert(vote);
      res.status(201).json(newVote);
    }
  } catch (error) {
    res.status(500).json({ error: '提交投票失败' });
  }
});

app.get('/api/proposals/:id/votes', async (req: Request, res: Response) => {
  try {
    const votes = await db.votes.find({ proposalId: req.params.id });
    res.json(votes);
  } catch (error) {
    res.status(500).json({ error: '获取投票数据失败' });
  }
});

app.get('/api/proposals/:id/comments', async (req: Request, res: Response) => {
  try {
    const { limit = 50 } = req.query;
    const comments = await db.comments
      .find({ proposalId: req.params.id })
      .sort({ createdAt: -1 })
      .limit(Number(limit));
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: '获取评论失败' });
  }
});

app.post('/api/comments', async (req: Request, res: Response) => {
  try {
    const { proposalId, userId, userName, userAvatar, content, parentId } = req.body;
    const comment: Comment = {
      id: uuidv4(),
      proposalId,
      userId,
      userName,
      userAvatar,
      content,
      parentId: parentId || null,
      createdAt: new Date().toISOString(),
    };
    const newComment = await db.comments.insert(comment);
    res.status(201).json(newComment);
  } catch (error) {
    res.status(500).json({ error: '发表评论失败' });
  }
});

app.post('/api/meeting-notes', async (req: Request, res: Response) => {
  try {
    const { meetingId, content } = req.body;
    const note = {
      id: uuidv4(),
      meetingId,
      content,
      createdAt: new Date().toISOString(),
    };
    const newNote = await db.meetingNotes.insert(note);
    res.status(201).json(newNote);
  } catch (error) {
    res.status(500).json({ error: '保存会议纪要失败' });
  }
});

app.get('/api/meetings/:id/summary', async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const proposals = await db.proposals.find({ meetingId });
    const summaryData = await Promise.all(
      proposals.map(async (proposal) => {
        const votes = await db.votes.find({ proposalId: proposal.id });
        const comments = await db.comments.find({ proposalId: proposal.id });
        const approveCount = votes.filter(v => v.voteType === 'approve').length;
        const rejectCount = votes.filter(v => v.voteType === 'reject').length;
        const abstainCount = votes.filter(v => v.voteType === 'abstain').length;
        return {
          proposalId: proposal.id,
          title: proposal.title,
          votes: { approve: approveCount, reject: rejectCount, abstain: abstainCount },
          commentCount: comments.length,
        };
      })
    );
    res.json(summaryData);
  } catch (error) {
    res.status(500).json({ error: '获取会议摘要失败' });
  }
});

app.listen(PORT, () => {
  console.log(`后端服务运行在 http://localhost:${PORT}`);
});
