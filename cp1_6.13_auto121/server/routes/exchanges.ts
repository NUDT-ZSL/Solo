import { Router, Request, Response } from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { ExchangeDoc } from '../models/exchange';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const db = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'exchanges.db'),
  autoload: true,
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req.query.userId as string) || 'u-current';
    const docs = await db.find<ExchangeDoc>({
      $or: [{ fromUserId: userId }, { toUserId: userId }],
    }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const p = req.body as Partial<ExchangeDoc>;
    const doc: ExchangeDoc = {
      _id: uuidv4(),
      fromUserId: p.fromUserId || 'u-current',
      fromUserName: p.fromUserName || '我',
      fromUserAvatar: p.fromUserAvatar || '🙂',
      toUserId: p.toUserId || '',
      toUserName: p.toUserName || '',
      skillId: p.skillId || '',
      skillTitle: p.skillTitle || '',
      offeredSkillTitle: p.offeredSkillTitle || '',
      description: (p.description || '').slice(0, 50),
      slotId: p.slotId || '',
      slotDate: p.slotDate || '',
      slotStart: p.slotStart || '',
      slotEnd: p.slotEnd || '',
      status: 'pending',
      createdAt: Date.now(),
    };
    const inserted = await db.insert(doc);
    res.status(201).json(inserted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const numReplaced = await db.update(
      { _id: req.params.id },
      { $set: { status: 'confirmed' } }
    );
    if (!numReplaced) return res.status(404).json({ error: 'Exchange not found' });
    const doc = await db.findOne<ExchangeDoc>({ _id: req.params.id });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const numReplaced = await db.update(
      { _id: req.params.id },
      { $set: { status: 'rejected' } }
    );
    if (!numReplaced) return res.status(404).json({ error: 'Exchange not found' });
    const doc = await db.findOne<ExchangeDoc>({ _id: req.params.id });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const numReplaced = await db.update(
      { _id: req.params.id },
      { $set: { status: 'completed' } }
    );
    if (!numReplaced) return res.status(404).json({ error: 'Exchange not found' });
    const doc = await db.findOne<ExchangeDoc>({ _id: req.params.id });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
