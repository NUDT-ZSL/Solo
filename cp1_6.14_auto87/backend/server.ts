import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { FitnessClass, User, CompletedClass } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const classTypes = ['瑜伽', '力量训练', 'HIIT', '普拉提', '动感单车', '拳击'];
const coachNames = ['张伟', '李娜', '王强', '陈静'];
const coachIds = ['coach-001', 'coach-002', 'coach-003', 'coach-004'];
const classNames: Record<string, string[]> = {
  '瑜伽': ['流瑜伽', '阴瑜伽', '阿斯汤加', '修复瑜伽'],
  '力量训练': ['上肢力量', '下肢力量', '核心训练', '全身力量'],
  'HIIT': ['燃脂HIIT', 'Tabata挑战', '间歇训练', '心肺爆发'],
  '普拉提': ['垫上普拉提', '核心普拉提', '塑形普拉提'],
  '动感单车': ['节奏单车', '爬坡训练', '燃脂骑行'],
  '拳击': ['搏击有氧', '拳击基础', '沙袋训练'],
};

const timeSlots = ['07:00', '09:00', '11:00', '14:00', '16:00', '19:00'];

function getDateString(daysFromNow: number): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

const classes: FitnessClass[] = [];

for (let day = 0; day < 7; day++) {
  const date = getDateString(day);
  for (let i = 0; i < 6; i++) {
    const typeIndex = (day + i) % classTypes.length;
    const type = classTypes[typeIndex];
    const nameOptions = classNames[type];
    const name = nameOptions[(day * 2 + i) % nameOptions.length];
    const coachIndex = (day + i * 2) % coachNames.length;
    const calories = 200 + Math.floor(Math.random() * 400);
    const capacity = 8 + Math.floor(Math.random() * 12);
    const participants: string[] = [];
    
    const participantCount = Math.floor(Math.random() * (capacity - 2));
    for (let p = 0; p < participantCount; p++) {
      participants.push(`user-${100 + p}`);
    }

    classes.push({
      id: uuidv4(),
      name,
      type,
      coach: coachNames[coachIndex],
      coachId: coachIds[coachIndex],
      date,
      time: timeSlots[i],
      duration: 45 + (i % 3) * 15,
      capacity,
      participants,
      calories,
    });
  }
}

const generateCompletedClasses = (): CompletedClass[] => {
  const result: CompletedClass[] = [];
  const types = ['瑜伽', '力量训练', 'HIIT', '普拉提'];
  const coaches = ['张伟', '李娜', '王强'];
  
  for (let i = 0; i < 12; i++) {
    const date = new Date();
    date.setDate(date.getDate() - (i + 1) * 2 - Math.floor(Math.random() * 2));
    const type = types[i % types.length];
    const names = classNames[type];
    
    result.push({
      classId: uuidv4(),
      className: names[i % names.length],
      coach: coaches[i % coaches.length],
      date: date.toISOString().split('T')[0],
      calories: 200 + Math.floor(Math.random() * 400),
    });
  }
  return result.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
};

const users: User[] = [
  {
    id: 'user-001',
    name: '小明',
    role: 'member',
    bookings: [],
    completedClasses: generateCompletedClasses(),
  },
  {
    id: 'user-002',
    name: '小红',
    role: 'member',
    bookings: [],
    completedClasses: [],
  },
  {
    id: 'user-100',
    name: '测试会员A',
    role: 'member',
    bookings: [],
    completedClasses: [],
  },
];

const coaches: User[] = coachNames.map((name, i) => ({
  id: coachIds[i],
  name,
  role: 'coach' as const,
  bookings: [],
  completedClasses: [],
}));

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

app.get('/api/classes', async (req: Request, res: Response) => {
  await delay(50);
  const { type, coach } = req.query;
  
  let filtered = [...classes];
  
  if (type && type !== 'all') {
    filtered = filtered.filter(c => c.type === type);
  }
  if (coach && coach !== 'all') {
    filtered = filtered.filter(c => c.coachId === coach);
  }
  
  filtered.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return a.time.localeCompare(b.time);
  });
  
  res.json(filtered);
});

app.post('/api/classes', async (req: Request, res: Response) => {
  await delay(50);
  const { name, type, coachId, date, time, duration, capacity, calories } = req.body;
  
  const coach = coaches.find(c => c.id === coachId);
  if (!coach) {
    return res.status(400).json({ success: false, message: '教练不存在' });
  }
  
  const newClass: FitnessClass = {
    id: uuidv4(),
    name,
    type,
    coach: coach.name,
    coachId,
    date,
    time,
    duration: Number(duration),
    capacity: Number(capacity),
    participants: [],
    calories: Number(calories),
  };
  
  classes.push(newClass);
  res.status(201).json(newClass);
});

app.put('/api/classes/:id', async (req: Request, res: Response) => {
  await delay(50);
  const { id } = req.params;
  const classIndex = classes.findIndex(c => c.id === id);
  
  if (classIndex === -1) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }
  
  const existing = classes[classIndex];
  const { name, type, date, time, duration, capacity, calories } = req.body;
  
  classes[classIndex] = {
    ...existing,
    name: name || existing.name,
    type: type || existing.type,
    date: date || existing.date,
    time: time || existing.time,
    duration: duration !== undefined ? Number(duration) : existing.duration,
    capacity: capacity !== undefined ? Number(capacity) : existing.capacity,
    calories: calories !== undefined ? Number(calories) : existing.calories,
  };
  
  res.json(classes[classIndex]);
});

app.delete('/api/classes/:id', async (req: Request, res: Response) => {
  await delay(50);
  const { id } = req.params;
  const classIndex = classes.findIndex(c => c.id === id);
  
  if (classIndex === -1) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }
  
  classes.splice(classIndex, 1);
  
  users.forEach(user => {
    user.bookings = user.bookings.filter(b => b !== id);
  });
  
  res.json({ success: true });
});

app.post('/api/classes/:id/book', async (req: Request, res: Response) => {
  await delay(50);
  const { id } = req.params;
  const { userId } = req.body;
  
  const fitnessClass = classes.find(c => c.id === id);
  if (!fitnessClass) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }
  
  if (fitnessClass.participants.includes(userId)) {
    return res.status(400).json({ success: false, message: '您已预约该课程' });
  }
  
  if (fitnessClass.participants.length >= fitnessClass.capacity) {
    return res.status(400).json({ success: false, message: '名额已满' });
  }
  
  fitnessClass.participants.push(userId);
  
  const user = users.find(u => u.id === userId);
  if (user && !user.bookings.includes(id)) {
    user.bookings.push(id);
  }
  
  res.json({ success: true, message: '预约成功', remaining: fitnessClass.capacity - fitnessClass.participants.length });
});

app.post('/api/classes/:id/cancel', async (req: Request, res: Response) => {
  await delay(50);
  const { id } = req.params;
  const { userId } = req.body;
  
  const fitnessClass = classes.find(c => c.id === id);
  if (!fitnessClass) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }
  
  const participantIndex = fitnessClass.participants.indexOf(userId);
  if (participantIndex === -1) {
    return res.status(400).json({ success: false, message: '您未预约该课程' });
  }
  
  fitnessClass.participants.splice(participantIndex, 1);
  
  const user = users.find(u => u.id === userId);
  if (user) {
    user.bookings = user.bookings.filter(b => b !== id);
  }
  
  res.json({ success: true, message: '取消成功' });
});

app.get('/api/classes/:id/participants', async (req: Request, res: Response) => {
  await delay(50);
  const { id } = req.params;
  
  const fitnessClass = classes.find(c => c.id === id);
  if (!fitnessClass) {
    return res.status(404).json({ success: false, message: '课程不存在' });
  }
  
  const participantUsers = fitnessClass.participants
    .map(pid => users.find(u => u.id === pid))
    .filter(Boolean) as User[];
  
  res.json({ participants: participantUsers });
});

app.get('/api/profile', async (req: Request, res: Response) => {
  await delay(50);
  const { userId } = req.query;
  
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ success: false, message: '用户不存在' });
  }
  
  const bookedClasses = classes
    .filter(c => user.bookings.includes(c.id))
    .sort((a, b) => {
      const dateCompare = a.date.localeCompare(b.date);
      if (dateCompare !== 0) return dateCompare;
      return a.time.localeCompare(b.time);
    });
  
  const recentCompleted = user.completedClasses.filter(c => {
    const classDate = new Date(c.date);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return classDate >= thirtyDaysAgo;
  });
  
  res.json({
    ...user,
    bookedClasses,
    completedClasses: recentCompleted,
  });
});

app.get('/api/coaches', async (req: Request, res: Response) => {
  await delay(50);
  res.json(coaches);
});

app.get('/api/class-types', async (req: Request, res: Response) => {
  await delay(50);
  res.json(classTypes);
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
