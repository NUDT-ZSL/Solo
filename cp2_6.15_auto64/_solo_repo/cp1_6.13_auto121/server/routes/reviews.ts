import { Router, Request, Response } from 'express';
import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { ReviewDoc } from '../models/review';
import { exchangesDb } from './exchanges';
import { skillsDb } from './skills';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', '..', '.data', 'reviews.db');
const reviewsDb = Datastore.create({ filename: dbPath, autoload: true });

export async function seedReviewsIfEmpty() {
  const count = await reviewsDb.count({});
  if (count > 0) return;
  const exchanges: any[] = await exchangesDb.find({ status: 'completed' });
  if (exchanges.length === 0) return;

  const seeds: ReviewDoc[] = [];
  const users: Record<string, { name: string; avatar: string }> = {
    u3: {
      name: '老王',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=laowang&backgroundColor=dcfce7',
    },
    u1: {
      name: '小林',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaolin&backgroundColor=e0e7ff',
    },
    u2: {
      name: '阿May',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amay&backgroundColor=fce7f3',
    },
  };

  const comments = [
    '老师超有耐心！零基础也完全跟得上，推荐～',
    '内容安排紧凑，收获满满，下次还想约进阶！',
    '氛围很轻松，知识点讲得很清楚，体验极佳。',
    '准备得很充分，有问必答，物超所值。',
  ];

  let idx = 0;
  for (const ex of exchanges) {
    const fromU = users[ex.fromUserId];
    const toU = users[ex.toUserId];
    if (fromU) {
      seeds.push({
        exchangeId: ex._id,
        skillId: ex.skillId,
        fromUserId: ex.fromUserId,
        fromUserName: fromU.name,
        fromUserAvatar: fromU.avatar,
        toUserId: ex.toUserId,
        rating: 5,
        comment: comments[idx % comments.length],
        anonymous: idx % 3 === 0,
        createdAt: Date.now() - 86400000 + idx * 3600_000,
      });
      idx++;
    }
    if (toU) {
      seeds.push({
        exchangeId: ex._id,
        skillId: ex.skillId,
        fromUserId: ex.toUserId,
        fromUserName: toU.name,
        fromUserAvatar: toU.avatar,
        toUserId: ex.fromUserId,
        rating: 4 + (idx % 2),
        comment: comments[idx % comments.length],
        anonymous: false,
        createdAt: Date.now() - 86400000 + idx * 3600_000,
      });
      idx++;
    }
  }
  for (const r of seeds) await reviewsDb.insert(r);
}

router.get('/', async (req: Request, res: Response) => {
  try {
    const { skillId, userId } = req.query;
    let query: any = {};
    if (skillId) query.skillId = skillId as string;
    if (userId) query.toUserId = userId as string;
    const list = await reviewsDb.find(query).sort({ createdAt: -1 });
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<ReviewDoc>;
    const doc: ReviewDoc = {
      exchangeId: body.exchangeId || '',
      skillId: body.skillId || '',
      fromUserId: body.fromUserId || 'u0',
      fromUserName: body.anonymous ? undefined : body.fromUserName,
      fromUserAvatar: body.anonymous ? undefined : body.fromUserAvatar,
      toUserId: body.toUserId || 'u0',
      rating: Math.max(1, Math.min(5, Number(body.rating) || 5)),
      comment: (body.comment || '').slice(0, 200),
      anonymous: !!body.anonymous,
      createdAt: Date.now(),
    };
    const inserted = await reviewsDb.insert(doc);
    res.json(inserted);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
