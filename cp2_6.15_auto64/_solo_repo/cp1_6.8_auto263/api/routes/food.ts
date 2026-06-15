import { Router, type Request, type Response } from 'express';
import { flavorProfiles } from '../data/mockData.js';
import { findSimilarFoods, generateNetworkData } from '../utils/analysis.js';

const router = Router();

router.get('/foods', (req: Request, res: Response): void => {
  const { search = '', tag = '', mood = '', page = '1', limit = '20' } = req.query;

  let filtered = [...flavorProfiles];

  if (search && typeof search === 'string') {
    const q = search.toLowerCase();
    filtered = filtered.filter(
      p => p.foodName.toLowerCase().includes(q) || p.description.toLowerCase().includes(q)
    );
  }

  if (tag && typeof tag === 'string') {
    filtered = filtered.filter(p => p.tags.includes(tag));
  }

  if (mood && typeof mood === 'string') {
    filtered = filtered.filter(p => p.moodType === mood);
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const start = (pageNum - 1) * limitNum;
  const paginated = filtered.slice(start, start + limitNum);

  res.json({
    data: paginated,
    total: filtered.length,
    page: pageNum,
  });
});

router.get('/foods/network', (req: Request, res: Response): void => {
  const result = generateNetworkData(flavorProfiles);
  res.json(result);
});

router.get('/foods/:id', (req: Request, res: Response): void => {
  const profile = flavorProfiles.find(p => p.id === req.params.id);
  if (!profile) {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  res.json(profile);
});

router.get('/foods/:id/similar', (req: Request, res: Response): void => {
  const similar = findSimilarFoods(flavorProfiles, req.params.id);
  res.json(similar);
});

router.post('/foods', (req: Request, res: Response): void => {
  const newProfile = {
    id: `f${Date.now()}`,
    ...req.body,
    likes: 0,
    liked: false,
    saved: false,
    comments: [],
    createdAt: new Date().toISOString(),
    author: {
      id: 'u1',
      name: '小味',
      avatar: 'https://i.pravatar.cc/150?img=1',
    },
  };
  flavorProfiles.unshift(newProfile);
  res.status(201).json(newProfile);
});

router.post('/foods/:id/like', (req: Request, res: Response): void => {
  const profile = flavorProfiles.find(p => p.id === req.params.id);
  if (!profile) {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  profile.liked = !profile.liked;
  profile.likes += profile.liked ? 1 : -1;
  res.json({ likes: profile.likes, liked: profile.liked });
});

router.post('/foods/:id/save', (req: Request, res: Response): void => {
  const profile = flavorProfiles.find(p => p.id === req.params.id);
  if (!profile) {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  profile.saved = !profile.saved;
  res.json({ saved: profile.saved });
});

router.post('/foods/:id/comments', (req: Request, res: Response): void => {
  const profile = flavorProfiles.find(p => p.id === req.params.id);
  if (!profile) {
    res.status(404).json({ success: false, error: 'Not found' });
    return;
  }
  const comment = {
    id: `c${Date.now()}`,
    authorId: 'u1',
    authorName: '小味',
    authorAvatar: 'https://i.pravatar.cc/150?img=1',
    content: req.body.content || '',
    createdAt: new Date().toISOString(),
  };
  profile.comments.push(comment);
  res.status(201).json(comment);
});

export default router;
