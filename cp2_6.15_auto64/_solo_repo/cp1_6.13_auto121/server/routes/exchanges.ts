import { Router, Request, Response } from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { ExchangeDoc } from '../models/exchange';
import { skillsDb } from './skills';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', '..', '.data', 'exchanges.db');
const exchangesDb = Datastore.create({ filename: dbPath, autoload: true });

export async function seedExchangesIfEmpty() {
  const count = await exchangesDb.count({});
  if (count > 0) return;
  const skills: any[] = await skillsDb.find({});
  if (skills.length < 3) return;

  const guitar = skills.find((s) => s.title.includes('吉他'));
  const python = skills.find((s) => s.title.includes('Python'));
  const water = skills.find((s) => s.title.includes('水彩'));
  if (!guitar || !python || !water) return;

  const slot0 = guitar.availableSlots.find((s: any) => !s.booked);
  const slot1 = python.availableSlots.find((s: any) => !s.booked && s.id !== slot0?.id);
  const slot2 = water.availableSlots.find((s: any) => !s.booked && s.id !== slot0?.id && s.id !== slot1?.id);

  const seeds: ExchangeDoc[] = [
    {
      fromUserId: 'u3',
      fromUserName: '老王',
      fromUserAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=laowang&backgroundColor=dcfce7',
      toUserId: guitar.userId,
      toUserName: guitar.userName,
      skillId: guitar._id,
      skillTitle: guitar.title,
      offeredSkillTitle: 'Python 爬虫入门',
      description: '我用 Python 课和你换吉他课，都是初学者友好向。',
      slotId: slot0.id,
      slotDate: slot0.date,
      slotStart: slot0.start,
      slotEnd: slot0.end,
      status: 'completed',
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      fromUserId: 'u2',
      fromUserName: '阿May',
      fromUserAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amay&backgroundColor=fce7f3',
      toUserId: python.userId,
      toUserName: python.userName,
      skillId: python._id,
      skillTitle: python.title,
      offeredSkillTitle: '水彩风景速写',
      description: '想做一个爬虫自动存参考图，我用水彩课交换～',
      slotId: slot1.id,
      slotDate: slot1.date,
      slotStart: slot1.start,
      slotEnd: slot1.end,
      status: 'completed',
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      fromUserId: 'u1',
      fromUserName: '小林',
      fromUserAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaolin&backgroundColor=e0e7ff',
      toUserId: water.userId,
      toUserName: water.userName,
      skillId: water._id,
      skillTitle: water.title,
      offeredSkillTitle: '尤克里里速成',
      description: '想学水彩放松一下，尤克里里我可以教你简单弹唱。',
      slotId: slot2.id,
      slotDate: slot2.date,
      slotStart: slot2.start,
      slotEnd: slot2.end,
      status: 'confirmed',
      createdAt: Date.now() - 86400000 * 1,
    },
  ];

  for (const ex of seeds) {
    await exchangesDb.insert(ex);
    if (ex.status === 'confirmed' || ex.status === 'completed') {
      const skill = await skillsDb.findOne({ _id: ex.skillId });
      if (skill) {
        skill.availableSlots = skill.availableSlots.map((s: any) =>
          s.id === ex.slotId ? { ...s, booked: true } : s
        );
        await skillsDb.update({ _id: skill._id }, { $set: { availableSlots: skill.availableSlots } });
      }
    }
  }
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = req.query.userId as string;
    let query: any = {};
    if (userId) {
      query = { $or: [{ fromUserId: userId }, { toUserId: userId }] };
    }
    const list = await exchangesDb.find(query).sort({ createdAt: -1 });
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const skill = await skillsDb.findOne({ _id: body.skillId });
    if (!skill) return res.status(404).json({ error: '技能不存在' });

    const slot = skill.availableSlots.find((s: any) => s.id === body.slotId);
    if (!slot) return res.status(400).json({ error: '时段不存在' });
    if (slot.booked) return res.status(400).json({ error: '时段已被预约' });

    const doc: ExchangeDoc = {
      fromUserId: body.fromUserId,
      fromUserName: body.fromUserName,
      fromUserAvatar: body.fromUserAvatar,
      toUserId: skill.userId,
      toUserName: skill.userName,
      skillId: skill._id as string,
      skillTitle: skill.title,
      offeredSkillTitle: body.offeredSkillTitle,
      description: (body.description || '').slice(0, 50),
      slotId: slot.id,
      slotDate: slot.date,
      slotStart: slot.start,
      slotEnd: slot.end,
      status: 'pending',
      createdAt: Date.now(),
    };
    const inserted = await exchangesDb.insert(doc);
    res.json(inserted);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/confirm', async (req: Request, res: Response) => {
  try {
    const ex = await exchangesDb.findOne({ _id: req.params.id });
    if (!ex) return res.status(404).json({ error: '请求不存在' });

    const skill = await skillsDb.findOne({ _id: ex.skillId });
    if (skill) {
      skill.availableSlots = skill.availableSlots.map((s: any) =>
        s.id === ex.slotId ? { ...s, booked: true } : s
      );
      await skillsDb.update({ _id: skill._id }, { $set: { availableSlots: skill.availableSlots } });
    }
    const updated = await exchangesDb.update(
      { _id: req.params.id },
      { $set: { status: 'confirmed' } },
      { returnUpdatedDocs: true }
    );
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/reject', async (req: Request, res: Response) => {
  try {
    const updated = await exchangesDb.update(
      { _id: req.params.id },
      { $set: { status: 'rejected' } },
      { returnUpdatedDocs: true }
    );
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/:id/complete', async (req: Request, res: Response) => {
  try {
    const updated = await exchangesDb.update(
      { _id: req.params.id },
      { $set: { status: 'completed' } },
      { returnUpdatedDocs: true }
    );
    res.json(updated);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export { exchangesDb };
export default router;
