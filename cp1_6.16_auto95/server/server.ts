import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
app.use(cors());
app.use(express.json());

interface Participant {
  id: string;
  name: string;
  phone: string;
  registeredAt: string;
  checkedIn: boolean;
  checkedInAt: string | null;
}

interface EventItem {
  id: string;
  title: string;
  date: string;
  description: string;
  maxParticipants: number;
  participants: Participant[];
}

const events = new Map<string, EventItem>();

const seedEvents = () => {
  const today = new Date();
  const fmt = (d: Date) => d.toISOString().split('T')[0];

  const addDays = (days: number) => {
    const d = new Date(today);
    d.setDate(d.getDate() + days);
    return fmt(d);
  };

  const e1: EventItem = {
    id: uuidv4(),
    title: '张炜《独药师》签售会',
    date: addDays(3),
    description: '茅盾文学奖得主张炜携新作《独药师》亲临书店，与读者分享创作历程，现场签售限量精装版。',
    maxParticipants: 30,
    participants: [
      { id: uuidv4(), name: '李明', phone: '13800138001', registeredAt: new Date().toISOString(), checkedIn: false, checkedInAt: null },
      { id: uuidv4(), name: '王芳', phone: '13800138002', registeredAt: new Date().toISOString(), checkedIn: false, checkedInAt: null },
      { id: uuidv4(), name: '赵强', phone: '13800138003', registeredAt: new Date().toISOString(), checkedIn: false, checkedInAt: null },
    ],
  };

  const e2: EventItem = {
    id: uuidv4(),
    title: '周末读书俱乐部',
    date: addDays(7),
    description: '本周共读《百年孤独》，欢迎带上你的读书笔记，与同好交流心得体会。',
    maxParticipants: 15,
    participants: [
      { id: uuidv4(), name: '陈静', phone: '13900139001', registeredAt: new Date().toISOString(), checkedIn: false, checkedInAt: null },
      { id: uuidv4(), name: '刘洋', phone: '13900139002', registeredAt: new Date().toISOString(), checkedIn: false, checkedInAt: null },
    ],
  };

  const e3: EventItem = {
    id: uuidv4(),
    title: '儿童故事会：奇妙的动物世界',
    date: addDays(5),
    description: '适合3-8岁儿童，由专业故事老师带领小朋友们走进奇妙的动物世界，还有互动手工环节。',
    maxParticipants: 20,
    participants: [
      { id: uuidv4(), name: '张小红', phone: '13700137001', registeredAt: new Date().toISOString(), checkedIn: false, checkedInAt: null },
    ],
  };

  const e4: EventItem = {
    id: uuidv4(),
    title: '余华《文城》读书沙龙',
    date: addDays(10),
    description: '深度解读余华最新长篇小说《文城》，探讨命运、信仰与爱。',
    maxParticipants: 25,
    participants: [],
  };

  [e1, e2, e3, e4].forEach(e => events.set(e.id, e));
};

seedEvents();

app.get('/api/events', (_req, res) => {
  const list = Array.from(events.values());
  res.json(list);
});

app.get('/api/events/stats', (_req, res) => {
  const list = Array.from(events.values());
  const stats = list.map(e => ({
    id: e.id,
    title: e.title,
    date: e.date,
    maxParticipants: e.maxParticipants,
    registeredCount: e.participants.length,
    checkedInCount: e.participants.filter(p => p.checkedIn).length,
    registrationRate: e.maxParticipants > 0
      ? Math.round((e.participants.length / e.maxParticipants) * 100)
      : 0,
    checkInRate: e.participants.length > 0
      ? Math.round((e.participants.filter(p => p.checkedIn).length / e.participants.length) * 100)
      : 0,
  }));
  res.json(stats);
});

app.get('/api/events/:id', (req, res) => {
  const ev = events.get(req.params.id);
  if (!ev) {
    return res.status(404).json({ error: '活动不存在' });
  }
  res.json(ev);
});

app.post('/api/events', (req, res) => {
  const { title, date, description, maxParticipants } = req.body;
  if (!title || !date || !maxParticipants) {
    return res.status(400).json({ error: '缺少必要字段' });
  }
  const ev: EventItem = {
    id: uuidv4(),
    title,
    date,
    description: description || '',
    maxParticipants: Number(maxParticipants),
    participants: [],
  };
  events.set(ev.id, ev);
  res.status(201).json(ev);
});

app.put('/api/events/:id', (req, res) => {
  const ev = events.get(req.params.id);
  if (!ev) {
    return res.status(404).json({ error: '活动不存在' });
  }
  const { title, date, description, maxParticipants } = req.body;
  if (title !== undefined) ev.title = title;
  if (date !== undefined) ev.date = date;
  if (description !== undefined) ev.description = description;
  if (maxParticipants !== undefined) ev.maxParticipants = Number(maxParticipants);
  res.json(ev);
});

app.delete('/api/events/:id', (req, res) => {
  const ev = events.get(req.params.id);
  if (!ev) {
    return res.status(404).json({ error: '活动不存在' });
  }
  events.delete(req.params.id);
  res.json({ success: true });
});

app.post('/api/events/:id/register', (req, res) => {
  const ev = events.get(req.params.id);
  if (!ev) {
    return res.status(404).json({ error: '活动不存在' });
  }
  if (ev.participants.length >= ev.maxParticipants) {
    return res.status(400).json({ error: '很抱歉，该活动报名人数已满' });
  }
  const { name, phone } = req.body;
  if (!name || !phone) {
    return res.status(400).json({ error: '请提供姓名和联系电话' });
  }
  const existing = ev.participants.find(p => p.phone === phone);
  if (existing) {
    return res.status(400).json({ error: '您已报名该活动' });
  }
  const participant: Participant = {
    id: uuidv4(),
    name,
    phone,
    registeredAt: new Date().toISOString(),
    checkedIn: false,
    checkedInAt: null,
  };
  ev.participants.push(participant);
  res.json({ success: true, participant });
});

app.post('/api/events/:id/checkin', (req, res) => {
  const ev = events.get(req.params.id);
  if (!ev) {
    return res.status(404).json({ error: '活动不存在' });
  }
  const today = new Date().toISOString().split('T')[0];
  if (ev.date !== today) {
    return res.status(400).json({ error: '只能在活动当天签到' });
  }
  const { phone } = req.body;
  if (!phone) {
    return res.status(400).json({ error: '请提供联系电话' });
  }
  const participant = ev.participants.find(p => p.phone === phone);
  if (!participant) {
    return res.status(400).json({ error: '您未报名该活动' });
  }
  if (participant.checkedIn) {
    return res.status(400).json({ error: '您已签到' });
  }
  participant.checkedIn = true;
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  participant.checkedInAt = `${now.toISOString().split('T')[0]} ${hh}:${mm}`;
  res.json({ success: true, participant });
});

app.get('/api/events/:id/export', (req, res) => {
  const ev = events.get(req.params.id);
  if (!ev) {
    return res.status(404).json({ error: '活动不存在' });
  }
  const header = '报名时间,姓名,联系电话,是否签到,签到时间';
  const rows = ev.participants.map(p => {
    const regTime = new Date(p.registeredAt).toLocaleString('zh-CN');
    const checkedStr = p.checkedIn ? '是' : '否';
    const checkInTime = p.checkedInAt || '';
    return `${regTime},${p.name},${p.phone},${checkedStr},${checkInTime}`;
  });
  const csvContent = '\uFEFF' + [header, ...rows].join('\n');
  const filename = encodeURIComponent(`${ev.title}_${ev.date}.csv`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.send(csvContent);
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`BookEvents server running on http://localhost:${PORT}`);
});
