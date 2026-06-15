import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { v4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

app.use((req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (token) {
    try {
      const decoded = atob(token);
      const [username] = decoded.split(':');
      if (username) {
        (req as any).user = { username, token };
      }
    } catch {
      // Invalid token, proceed without user
    }
  }
  next();
});

app.get('/api/polls', (req: Request, res: Response) => {
  const polls: Map<string, any> = app.get('polls');
  const allPolls = Array.from(polls.values());
  res.json(allPolls);
});

app.get('/api/polls/:id', (req: Request, res: Response) => {
  const polls: Map<string, any> = app.get('polls');
  const poll = polls.get(req.params.id);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  res.json(poll);
});

app.post('/api/polls', (req: Request, res: Response) => {
  const polls: Map<string, any> = app.get('polls');
  const { title, description, options, createdBy, duration } = req.body;

  if (!title || typeof title !== 'string') {
    res.status(400).json({ error: '标题是必填项' });
    return;
  }

  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) {
    res.status(400).json({ error: '标题不能为空' });
    return;
  }
  if (trimmedTitle.length > 100) {
    res.status(400).json({ error: '标题不能超过100字' });
    return;
  }

  if (description !== undefined && description !== null) {
    if (typeof description !== 'string') {
      res.status(400).json({ error: '描述格式不正确' });
      return;
    }
    if (description.length > 500) {
      res.status(400).json({ error: '描述不能超过500字' });
      return;
    }
  }

  if (!options || !Array.isArray(options)) {
    res.status(400).json({ error: '选项列表是必填项' });
    return;
  }

  const trimmedOptions = options
    .map((o) => (typeof o === 'string' ? o.trim() : ''))
    .filter(Boolean);

  if (trimmedOptions.length < 2) {
    res.status(400).json({ error: '至少需要2个有效选项' });
    return;
  }
  if (trimmedOptions.length > 6) {
    res.status(400).json({ error: '最多只能有6个选项' });
    return;
  }

  if (trimmedOptions.some((o) => o.length > 100)) {
    res.status(400).json({ error: '每个选项不能超过100字' });
    return;
  }

  const newPoll = {
    id: v4(),
    title: trimmedTitle,
    description: (description || '').trim(),
    options: trimmedOptions,
    votes: new Array(trimmedOptions.length).fill(0),
    createdBy: createdBy || 'anonymous',
    createdAt: Date.now(),
    duration: typeof duration === 'number' && duration >= 1 && duration <= 7 ? duration : 1,
    closed: false,
  };

  polls.set(newPoll.id, newPoll);
  const io = app.get('io');
  if (io) io.emit('pollCreated', newPoll);
  res.status(201).json(newPoll);
});

app.post('/api/polls/:id/close', (req: Request, res: Response) => {
  const polls: Map<string, any> = app.get('polls');
  const poll = polls.get(req.params.id);
  if (!poll) {
    res.status(404).json({ error: 'Poll not found' });
    return;
  }
  poll.closed = true;
  const io = app.get('io');
  if (io) {
    io.emit('pollClosed', { pollId: poll.id });
    io.emit('pollUpdated', poll);
  }
  res.json(poll);
});

app.get('/api/polls/:id/comments', (req: Request, res: Response) => {
  const comments: Map<string, any[]> = app.get('comments');
  const pollComments = comments.get(req.params.id) || [];
  const offset = parseInt(req.query.offset as string, 10) || 0;
  const limit = parseInt(req.query.limit as string, 10) || 20;
  const paginatedComments = pollComments.slice(offset, offset + limit);
  res.json({
    comments: paginatedComments,
    hasMore: offset + limit < pollComments.length,
    total: pollComments.length,
  });
});

app.get('/api/favorites/:userId', (req: Request, res: Response) => {
  const polls: Map<string, any> = app.get('polls');
  const favorites: Map<string, Set<string>> = app.get('favorites');
  const userFavorites = favorites.get(req.params.userId);
  if (!userFavorites) {
    res.json([]);
    return;
  }
  const favoritePolls = Array.from(userFavorites)
    .map((pollId) => polls.get(pollId))
    .filter(Boolean);
  res.json(favoritePolls);
});

app.post('/api/favorites', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: '请先登录' });
    return;
  }

  const favorites: Map<string, Set<string>> = app.get('favorites');
  const { userId, pollId } = req.body;

  if (!userId || !pollId) {
    res.status(400).json({ error: 'userId and pollId are required' });
    return;
  }

  if (!favorites.has(userId)) {
    favorites.set(userId, new Set<string>());
  }
  favorites.get(userId)!.add(pollId);

  const io = app.get('io');
  if (io) {
    io.emit('favoriteUpdated', { userId, pollId, action: 'add' });
  }

  res.json({ success: true });
});

app.delete('/api/favorites', (req: Request, res: Response) => {
  const user = (req as any).user;
  if (!user) {
    res.status(401).json({ error: '请先登录' });
    return;
  }

  const favorites: Map<string, Set<string>> = app.get('favorites');
  const { userId, pollId } = req.body;

  if (!userId || !pollId) {
    res.status(400).json({ error: 'userId and pollId are required' });
    return;
  }

  const userFavorites = favorites.get(userId);
  if (userFavorites) {
    userFavorites.delete(pollId);
  }

  const io = app.get('io');
  if (io) {
    io.emit('favoriteUpdated', { userId, pollId, action: 'remove' });
  }

  res.json({ success: true });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Server error:', error);
  res.status(500).json({ success: false, error: 'Server internal error' });
});

export default app;
