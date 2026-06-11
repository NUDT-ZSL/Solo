import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { Capsule, MusicStyle } from '../../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

let capsules: Capsule[] = [];

interface CreateCapsuleBody {
  title: string;
  content: string;
  images: string[];
  musicStyle: MusicStyle;
  unlockAt: number;
}

function isValidCreateBody(body: unknown): body is CreateCapsuleBody {
  if (!body || typeof body !== 'object') return false;
  const b = body as Record<string, unknown>;
  const validStyles: MusicStyle[] = ['calm', 'joyful', 'nostalgic', 'passionate', 'mysterious'];
  return (
    typeof b.title === 'string' &&
    typeof b.content === 'string' &&
    Array.isArray(b.images) &&
    (b.images as unknown[]).every(img => typeof img === 'string') &&
    (b.images as string[]).length <= 3 &&
    typeof b.musicStyle === 'string' &&
    validStyles.includes(b.musicStyle as MusicStyle) &&
    typeof b.unlockAt === 'number' &&
    b.unlockAt > Date.now()
  );
}

app.get('/api/capsules', (_req: Request, res: Response<Capsule[]>) => {
  res.json(capsules.sort((a, b) => b.createdAt - a.createdAt));
});

app.get('/api/capsules/:id', (req: Request, res: Response<Capsule | { error: string }>) => {
  const capsule = capsules.find(c => c.id === req.params.id);
  if (!capsule) {
    res.status(404).json({ error: 'Capsule not found' });
    return;
  }
  res.json(capsule);
});

app.post('/api/capsules', (req: Request, res: Response<Capsule | { error: string }>) => {
  if (!isValidCreateBody(req.body)) {
    res.status(400).json({ error: 'Invalid request body' });
    return;
  }

  const now = Date.now();
  const minUnlock = now + 24 * 60 * 60 * 1000;
  const maxUnlock = now + 10 * 365 * 24 * 60 * 60 * 1000;

  if (req.body.unlockAt < minUnlock || req.body.unlockAt > maxUnlock) {
    res.status(400).json({ error: 'Unlock date must be between 1 day and 10 years from now' });
    return;
  }

  const newCapsule: Capsule = {
    id: uuidv4(),
    title: req.body.title,
    content: req.body.content,
    images: req.body.images,
    musicStyle: req.body.musicStyle,
    createdAt: now,
    unlockAt: req.body.unlockAt
  };

  capsules.push(newCapsule);
  res.status(201).json(newCapsule);
});

app.delete('/api/capsules/:id', (req: Request, res: Response<{ success: boolean } | { error: string }>) => {
  const idx = capsules.findIndex(c => c.id === req.params.id);
  if (idx === -1) {
    res.status(404).json({ error: 'Capsule not found' });
    return;
  }

  const capsule = capsules[idx];
  if (Date.now() >= capsule.unlockAt) {
    res.status(400).json({ error: 'Cannot delete an unlocked capsule' });
    return;
  }

  capsules.splice(idx, 1);
  res.json({ success: true });
});

app.listen(PORT, () => {
  console.log(`[Time Messenger] Server running on http://localhost:${PORT}`);
});
