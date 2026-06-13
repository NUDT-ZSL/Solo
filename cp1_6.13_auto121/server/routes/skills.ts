import { Router, Request, Response } from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { SkillDoc } from '../models/skill';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = Router();
const db = Datastore.create({
  filename: path.join(__dirname, '..', 'data', 'skills.db'),
  autoload: true,
});

router.get('/', async (_req: Request, res: Response) => {
  try {
    const docs = await db.find<SkillDoc>({}).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const doc = await db.findOne<SkillDoc>({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Skill not found' });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const docs = await db.find<SkillDoc>({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(docs);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const payload = req.body as Partial<SkillDoc>;
    const doc: SkillDoc = {
      userId: payload.userId || 'u-demo',
      userName: payload.userName || '我',
      userAvatar: payload.userAvatar || '😀',
      title: payload.title || '未命名技能',
      description: payload.description || '',
      availableSlots: payload.availableSlots || [],
      createdAt: Date.now(),
    };
    const inserted = await db.insert(doc);
    res.status(201).json(inserted);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/slot/:slotId', async (req: Request, res: Response) => {
  try {
    const doc = await db.findOne<SkillDoc>({ _id: req.params.id });
    if (!doc) return res.status(404).json({ error: 'Skill not found' });
    const slot = doc.availableSlots.find(s => s.id === req.params.slotId);
    if (!slot) return res.status(404).json({ error: 'Slot not found' });
    slot.booked = req.body.booked ?? true;
    await db.update({ _id: doc._id }, { $set: { availableSlots: doc.availableSlots } });
    res.json(doc);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
