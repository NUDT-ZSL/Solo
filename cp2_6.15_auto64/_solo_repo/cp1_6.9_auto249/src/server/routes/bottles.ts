import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Bottle, Emotion, Relay } from '../../utils/api';

const router = Router();

const MAX_BOTTLES = 100;
const VALID_EMOTIONS: Emotion[] = ['happy', 'sad', 'calm', 'wild'];

export const bottleStore: {
  bottles: Bottle[];
  listeners: Set<(msg: { type: string; payload: any }) => void>;
} = {
  bottles: [],
  listeners: new Set(),
};

function broadcast(type: string, payload: any) {
  bottleStore.listeners.forEach((l) => {
    try {
      l({ type, payload });
    } catch {}
  });
}

function isValidEmotion(e: unknown): e is Emotion {
  return typeof e === 'string' && VALID_EMOTIONS.includes(e as Emotion);
}

router.get('/', (_req, res) => {
  res.json(bottleStore.bottles);
});

router.get('/search', (req, res) => {
  const q = (req.query.q as string)?.toLowerCase() || '';
  const emotion = req.query.emotion as string;
  let results = bottleStore.bottles;
  if (emotion && isValidEmotion(emotion)) {
    results = results.filter((b) => b.emotion === emotion);
  }
  if (q) {
    results = results.filter(
      (b) =>
        b.content.toLowerCase().includes(q) ||
        b.relays.some((r) => r.content.toLowerCase().includes(q))
    );
  }
  res.json(results);
});

router.get('/:id', (req, res) => {
  const bottle = bottleStore.bottles.find((b) => b.id === req.params.id);
  if (!bottle) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  res.json(bottle);
});

router.post('/', (req, res) => {
  const { content, emotion } = req.body as { content: unknown; emotion: unknown };
  if (typeof content !== 'string' || !content.trim() || content.length > 140) {
    res.status(400).json({ error: 'Invalid content (must be 1-140 characters)' });
    return;
  }
  if (!isValidEmotion(emotion)) {
    res.status(400).json({ error: 'Invalid emotion' });
    return;
  }
  const bottle: Bottle = {
    id: uuidv4(),
    content: content.trim(),
    emotion,
    relays: [],
    createdAt: Date.now(),
  };
  bottleStore.bottles.unshift(bottle);
  if (bottleStore.bottles.length > MAX_BOTTLES) {
    bottleStore.bottles.pop();
  }
  broadcast('NEW_BOTTLE', bottle);
  res.status(201).json(bottle);
});

router.post('/:id/relays', (req, res) => {
  const bottle = bottleStore.bottles.find((b) => b.id === req.params.id);
  if (!bottle) {
    res.status(404).json({ error: 'Bottle not found' });
    return;
  }
  const { content, emotion } = req.body as { content: unknown; emotion: unknown };
  if (typeof content !== 'string' || !content.trim() || content.length > 140) {
    res.status(400).json({ error: 'Invalid content (must be 1-140 characters)' });
    return;
  }
  if (!isValidEmotion(emotion)) {
    res.status(400).json({ error: 'Invalid emotion' });
    return;
  }
  const relay: Relay = {
    id: uuidv4(),
    content: content.trim(),
    emotion,
    createdAt: Date.now(),
  };
  bottle.relays.push(relay);
  broadcast('NEW_RELAY', { bottleId: bottle.id, relay });
  res.json(bottle);
});

export default router;
