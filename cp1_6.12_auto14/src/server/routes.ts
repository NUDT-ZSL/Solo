import { Router, Request, Response } from 'express';
import database from './database';
import { generateDiscussionQuestions } from './aiService';

const router = Router();

interface AuthRequest extends Request {
  body: {
    username: string;
    nickname?: string;
  };
}

router.post('/auth/login', (req: AuthRequest, res: Response) => {
  const { username, nickname } = req.body;
  
  if (!username) {
    return res.status(400).json({ error: '用户名不能为空' });
  }
  
  let user = database.findUserByUsername(username);
  
  if (!user) {
    if (!nickname) {
      return res.status(400).json({ error: '新用户需要提供昵称' });
    }
    user = database.createUser(username, nickname);
  }
  
  res.json({ user });
});

router.get('/bookclubs', (_req: Request, res: Response) => {
  const clubs = database.getAllBookClubs();
  const clubsWithHost = clubs.map(club => {
    const host = database.findUserById(club.hostId);
    return {
      ...club,
      hostName: host?.nickname || '未知',
      memberCount: club.memberIds.length
    };
  });
  res.json({ bookClubs: clubsWithHost });
});

router.get('/bookclubs/:id', (req: Request, res: Response) => {
  const club = database.getBookClubById(req.params.id);
  if (!club) {
    return res.status(404).json({ error: '读书会不存在' });
  }
  
  const host = database.findUserById(club.hostId);
  const members = database.getClubMembers(club.id);
  
  res.json({
    bookClub: {
      ...club,
      hostName: host?.nickname || '未知',
      members: members.map(m => ({ id: m.id, nickname: m.nickname }))
    }
  });
});

interface CreateClubRequest extends Request {
  body: {
    name: string;
    bookTitle: string;
    bookAuthor: string;
    description: string;
    userId: string;
  };
}

router.post('/bookclubs', (req: CreateClubRequest, res: Response) => {
  const { name, bookTitle, bookAuthor, description, userId } = req.body;
  
  if (!name || !bookTitle || !bookAuthor || !userId) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  
  const user = database.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }
  
  const club = database.createBookClub(name, bookTitle, bookAuthor, description, userId);
  
  res.status(201).json({
    bookClub: {
      ...club,
      hostName: user.nickname,
      memberCount: 1
    }
  });
});

interface JoinClubRequest extends Request {
  body: {
    userId: string;
  };
}

router.post('/bookclubs/:id/join', (req: JoinClubRequest, res: Response) => {
  const { userId } = req.body;
  const clubId = req.params.id;
  
  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' });
  }
  
  const user = database.findUserById(userId);
  if (!user) {
    return res.status(401).json({ error: '用户不存在' });
  }
  
  const club = database.joinBookClub(clubId, userId);
  if (!club) {
    return res.status(404).json({ error: '读书会不存在' });
  }
  
  const host = database.findUserById(club.hostId);
  const members = database.getClubMembers(club.id);
  
  res.json({
    bookClub: {
      ...club,
      hostName: host?.nickname || '未知',
      members: members.map(m => ({ id: m.id, nickname: m.nickname }))
    }
  });
});

router.post('/bookclubs/:id/leave', (req: JoinClubRequest, res: Response) => {
  const { userId } = req.body;
  const clubId = req.params.id;
  
  if (!userId) {
    return res.status(400).json({ error: '缺少用户ID' });
  }
  
  const club = database.leaveBookClub(clubId, userId);
  if (!club) {
    return res.status(404).json({ error: '读书会不存在' });
  }
  
  const host = database.findUserById(club.hostId);
  const members = database.getClubMembers(club.id);
  
  res.json({
    bookClub: {
      ...club,
      hostName: host?.nickname || '未知',
      members: members.map(m => ({ id: m.id, nickname: m.nickname }))
    }
  });
});

interface RemoveMemberRequest extends Request {
  body: {
    removerId: string;
    memberId: string;
  };
}

router.post('/bookclubs/:id/remove-member', (req: RemoveMemberRequest, res: Response) => {
  const { removerId, memberId } = req.body;
  const clubId = req.params.id;
  
  if (!removerId || !memberId) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  
  const club = database.removeMember(clubId, memberId, removerId);
  if (!club) {
    return res.status(404).json({ error: '读书会不存在或无权操作' });
  }
  
  const host = database.findUserById(club.hostId);
  const members = database.getClubMembers(club.id);
  
  res.json({
    bookClub: {
      ...club,
      hostName: host?.nickname || '未知',
      members: members.map(m => ({ id: m.id, nickname: m.nickname }))
    }
  });
});

router.get('/bookclubs/:id/topics', (req: Request, res: Response) => {
  const clubId = req.params.id;
  const topics = database.getTopicsByClubId(clubId);
  
  const topicsWithCreator = topics.map(topic => {
    const creator = database.findUserById(topic.creatorId);
    return {
      ...topic,
      creatorName: creator?.nickname || '未知'
    };
  });
  
  res.json({ topics: topicsWithCreator });
});

interface CreateTopicRequest extends Request {
  body: {
    title: string;
    content: string;
    userId: string;
  };
}

router.post('/bookclubs/:id/topics', (req: CreateTopicRequest, res: Response) => {
  const { title, content, userId } = req.body;
  const clubId = req.params.id;
  
  if (!title || !content || !userId) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  
  const topic = database.createTopic(clubId, userId, title, content);
  if (!topic) {
    return res.status(404).json({ error: '读书会不存在或用户不是成员' });
  }
  
  const creator = database.findUserById(topic.creatorId);
  
  res.status(201).json({
    topic: {
      ...topic,
      creatorName: creator?.nickname || '未知'
    }
  });
});

router.get('/topics/:id', (req: Request, res: Response) => {
  const topic = database.getTopicById(req.params.id);
  if (!topic) {
    return res.status(404).json({ error: '讨论主题不存在' });
  }
  
  const creator = database.findUserById(topic.creatorId);
  
  res.json({
    topic: {
      ...topic,
      creatorName: creator?.nickname || '未知'
    }
  });
});

router.get('/topics/:id/replies', (req: Request, res: Response) => {
  const topicId = req.params.id;
  const replies = database.getRepliesByTopicId(topicId);
  
  const repliesWithAuthor = replies.map(reply => {
    const author = database.findUserById(reply.authorId);
    return {
      ...reply,
      authorName: author?.nickname || '未知'
    };
  });
  
  res.json({ replies: repliesWithAuthor });
});

interface CreateReplyRequest extends Request {
  body: {
    content: string;
    userId: string;
  };
}

router.post('/topics/:id/replies', (req: CreateReplyRequest, res: Response) => {
  const { content, userId } = req.body;
  const topicId = req.params.id;
  
  if (!content || !userId) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  
  const reply = database.createReply(topicId, userId, content);
  if (!reply) {
    return res.status(404).json({ error: '讨论主题不存在或用户不是成员' });
  }
  
  const author = database.findUserById(reply.authorId);
  
  res.status(201).json({
    reply: {
      ...reply,
      authorName: author?.nickname || '未知'
    }
  });
});

interface AIQuestionRequest extends Request {
  body: {
    userId: string;
  };
}

router.post('/topics/:id/ai-questions', async (req: AIQuestionRequest, res: Response) => {
  const topicId = req.params.id;
  const { userId } = req.body;
  
  const topic = database.getTopicById(topicId);
  if (!topic) {
    return res.status(404).json({ error: '讨论主题不存在' });
  }
  
  const club = database.getBookClubById(topic.clubId);
  if (!club) {
    return res.status(404).json({ error: '读书会不存在' });
  }
  
  const isHost = club.hostId === userId;
  const isCreator = topic.creatorId === userId;
  
  if (!isHost && !isCreator) {
    return res.status(403).json({ error: '只有主持人或主题创建者可以生成AI问题' });
  }
  
  const replies = database.getRepliesByTopicId(topicId);
  const repliesWithAuthor = replies.map(reply => {
    const author = database.findUserById(reply.authorId);
    return {
      author: author?.nickname || '未知',
      content: reply.content
    };
  });
  
  try {
    const questions = await generateDiscussionQuestions(
      topic.title,
      topic.content,
      repliesWithAuthor
    );
    
    res.json({ questions });
  } catch (error) {
    console.error('生成AI问题失败:', error);
    res.status(500).json({ error: '生成AI问题失败' });
  }
});

export default router;
