import { Router, Request, Response } from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import { SkillDoc, TimeSlot } from '../models/skill';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbPath = path.join(__dirname, '..', '..', '.data', 'skills.db');
const skillsDb = Datastore.create({ filename: dbPath, autoload: true });

function generateSlotsForDays(startDate: Date, days: number, hours: number[]): TimeSlot[] {
  const slots: TimeSlot[] = [];
  for (let d = 0; d < days; d++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + d);
    if (date.getDay() === 0) continue;
    const dateStr = date.toISOString().slice(0, 10);
    for (const h of hours) {
      slots.push({
        id: uuidv4(),
        date: dateStr,
        start: `${h.toString().padStart(2, '0')}:00`,
        end: `${h.toString().padStart(2, '0')}:30`,
        booked: false,
      });
      slots.push({
        id: uuidv4(),
        date: dateStr,
        start: `${h.toString().padStart(2, '0')}:30`,
        end: `${(h + 1).toString().padStart(2, '0')}:00`,
        booked: false,
      });
    }
  }
  return slots;
}

export async function seedSkillsIfEmpty() {
  const count = await skillsDb.count({});
  if (count > 0) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const hours = [10, 14, 15, 19, 20];

  const seed: SkillDoc[] = [
    {
      userId: 'u1',
      userName: '小林',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaolin&backgroundColor=e0e7ff',
      title: '民谣吉他入门教学',
      description: '从零基础开始，教你识谱、和弦转换、简单弹唱，30分钟学会一首小星星。自备吉他或使用我的练习琴。',
      availableSlots: generateSlotsForDays(today, 14, hours),
      createdAt: Date.now() - 86400000 * 5,
    },
    {
      userId: 'u1',
      userName: '小林',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=xiaolin&backgroundColor=e0e7ff',
      title: '尤克里里速成',
      description: '四根弦的快乐小乐器，适合孩子和忙碌的上班族。一节课掌握四个和弦就能弹唱《小手拉大手》。',
      availableSlots: generateSlotsForDays(today, 10, [9, 11, 16, 18]),
      createdAt: Date.now() - 86400000 * 3,
    },
    {
      userId: 'u2',
      userName: '阿May',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amay&backgroundColor=fce7f3',
      title: '水彩风景速写',
      description: '教你控水、调色、简单构图，半小时画出一张清新明信片感的小风景。画材我可以免费提供。',
      availableSlots: generateSlotsForDays(today, 14, [10, 13, 15, 17]),
      createdAt: Date.now() - 86400000 * 7,
    },
    {
      userId: 'u2',
      userName: '阿May',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amay&backgroundColor=fce7f3',
      title: 'Procreate 插画基础',
      description: 'iPad 绘画入门，笔刷设置、图层管理、配色思路，带你完成一张头像插画。需自备 iPad 和 Apple Pencil。',
      availableSlots: generateSlotsForDays(today, 12, [11, 14, 19, 20]),
      createdAt: Date.now() - 86400000 * 4,
    },
    {
      userId: 'u3',
      userName: '老王',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=laowang&backgroundColor=dcfce7',
      title: 'Python 爬虫入门',
      description: '从零写一个简单的网页爬虫，了解 requests、BeautifulSoup，爬取豆瓣电影 TOP250。电脑需已安装 Python。',
      availableSlots: generateSlotsForDays(today, 14, [19, 20, 21]),
      createdAt: Date.now() - 86400000 * 10,
    },
    {
      userId: 'u3',
      userName: '老王',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=laowang&backgroundColor=dcfce7',
      title: '前端 React 实战',
      description: '带你搭建第一个 React 项目，理解组件、Props、State，完成一个 TodoList 应用。适合有一定 HTML/CSS 基础。',
      availableSlots: generateSlotsForDays(today, 14, [20, 21, 22]),
      createdAt: Date.now() - 86400000 * 2,
    },
    {
      userId: 'u2',
      userName: '阿May',
      userAvatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=amay&backgroundColor=fce7f3',
      title: '手账排版与装饰',
      description: '教你日系、盐系、复古三种手账风格排版，以及基础胶带拼贴技巧。我提供素材和示范本。',
      availableSlots: generateSlotsForDays(today, 8, [14, 15, 16]),
      createdAt: Date.now() - 86400000 * 6,
    },
  ];

  for (const s of seed) {
    await skillsDb.insert(s);
  }
}

router.get('/', async (_req: Request, res: Response) => {
  try {
    const list = await skillsDb.find({}).sort({ createdAt: -1 });
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/:id', async (req: Request, res: Response) => {
  try {
    const skill = await skillsDb.findOne({ _id: req.params.id });
    if (!skill) return res.status(404).json({ error: '技能不存在' });
    res.json(skill);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const list = await skillsDb.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<SkillDoc>;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const doc: SkillDoc = {
      userId: body.userId || 'u0',
      userName: body.userName || '我',
      userAvatar: body.userAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=me',
      title: body.title || '新技能',
      description: body.description || '',
      availableSlots: body.availableSlots || generateSlotsForDays(today, 14, [19, 20]),
      createdAt: Date.now(),
    };
    const inserted = await skillsDb.insert(doc);
    res.json(inserted);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

export { skillsDb };
export default router;
