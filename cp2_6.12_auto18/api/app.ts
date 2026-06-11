import express, { type Request, type Response, type NextFunction } from 'express';
import cors from 'cors';
import { v4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

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

  if (!title || !options || !Array.isArray(options) || options.length === 0) {
    res.status(400).json({ error: 'Title and options are required' });
    return;
  }

  const newPoll = {
    id: v4(),
    title,
    description: description || '',
    options,
    votes: new Array(options.length).fill(0),
    createdBy: createdBy || 'anonymous',
    createdAt: Date.now(),
    duration: duration || 1,
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
  if (io) io.emit('pollClosed', { pollId: poll.id });
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
  res.json({ success: true });
});

app.delete('/api/favorites', (req: Request, res: Response) => {
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
  res.json({ success: true });
});

app.get('/api/health', (req: Request, res: Response) => {
  res.json({ success: true, message: 'ok' });
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ success: false, error: 'API not found' });
});

app.use((error: Error, req: Request, res: Response, next: NextFunction) => {
  res.status(500).json({ success: false, error: 'Server internal error' });
});

export default app;
