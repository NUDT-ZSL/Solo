import express, { Request, Response } from 'express';
import { User, Skill, ExchangeRequest, Review, ExchangeRecord, SkillLevel } from './types';

const app = express();
const PORT = 3001;

app.use(express.json());

const generateId = () => Math.random().toString(36).substring(2, 11);

const skillNames = [
  '吉他', '钢琴', '摄影', '绘画', '编程', '英语', '日语', '法语',
  '瑜伽', '健身', '烹饪', '烘焙', '书法', '围棋', '象棋', '游泳',
  '跑步', '写作', '演讲', '心理学', '设计', '剪辑', '动画', '3D建模'
];

const levels: SkillLevel[] = ['初级', '中级', '高级'];
const nicknames = ['小明', '小红', '阿杰', '小美', '大壮', '小雨', '阿飞', '小雪',
  '老王', '小李', '阿强', '小芳', '大伟', '小琳', '阿华', '小燕',
  '大龙', '小凤', '阿东', '小茜', '大牛', '小娟', '阿文', '小武',
  '大明', '小霞', '阿龙', '小云', '大海', '小敏'];

const generateAvatar = (seed: number) => {
  const colors = ['#3b82f6', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];
  return `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
};

const generateAvailableSlots = (): boolean[][] => {
  const slots: boolean[][] = [];
  for (let day = 0; day < 7; day++) {
    const daySlots: boolean[] = [];
    for (let hour = 0; hour < 24; hour++) {
      daySlots.push(Math.random() > 0.6 && hour >= 8 && hour <= 22);
    }
    slots.push(daySlots);
  }
  return slots;
};

const users: User[] = [];
const requests: ExchangeRequest[] = [];
const reviews: Review[] = [];
const records: ExchangeRecord[] = [];

for (let i = 0; i < 30; i++) {
  const userId = generateId();
  const userSkills: Skill[] = [];
  const skillCount = Math.floor(Math.random() * 3) + 1;
  const usedSkills = new Set<string>();
  
  for (let j = 0; j < skillCount; j++) {
    let skillName: string;
    do {
      skillName = skillNames[Math.floor(Math.random() * skillNames.length)];
    } while (usedSkills.has(skillName));
    usedSkills.add(skillName);
    
    userSkills.push({
      id: generateId(),
      name: skillName,
      level: levels[Math.floor(Math.random() * levels.length)],
      description: `擅长${skillName}教学，有${Math.floor(Math.random() * 5) + 1}年经验，耐心细致，欢迎交流学习。`,
      userId,
      availableSlots: generateAvailableSlots(),
      avgRating: +(3 + Math.random() * 2).toFixed(1),
      reviewCount: Math.floor(Math.random() * 20) + 1,
    });
  }
  
  users.push({
    id: userId,
    nickname: nicknames[i],
    avatar: generateAvatar(i + 1),
    skills: userSkills,
  });
}

for (let i = 0; i < 50; i++) {
  const fromUser = users[Math.floor(Math.random() * users.length)];
  let toUser = users[Math.floor(Math.random() * users.length)];
  while (toUser.id === fromUser.id) {
    toUser = users[Math.floor(Math.random() * users.length)];
  }
  
  const fromSkill = fromUser.skills[Math.floor(Math.random() * fromUser.skills.length)];
  const toSkill = toUser.skills[Math.floor(Math.random() * toUser.skills.length)];
  
  const statuses: ExchangeRequest['status'][] = ['pending', 'accepted', 'rejected', 'confirmed', 'completed'];
  const status = statuses[Math.floor(Math.random() * statuses.length)];
  
  requests.push({
    id: generateId(),
    fromUserId: fromUser.id,
    toUserId: toUser.id,
    fromSkillId: fromSkill.id,
    toSkillId: toSkill.id,
    proposedHours: Math.floor(Math.random() * 4) + 1,
    status,
    message: `想和你交换${toSkill.name}技能，我可以教你${fromSkill.name}，怎么样？`,
    createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

for (let i = 0; i < 80; i++) {
  const fromUser = users[Math.floor(Math.random() * users.length)];
  let toUser = users[Math.floor(Math.random() * users.length)];
  while (toUser.id === fromUser.id) {
    toUser = users[Math.floor(Math.random() * users.length)];
  }
  
  const toSkill = toUser.skills[Math.floor(Math.random() * toUser.skills.length)];
  
  const commentTemplates = [
    '老师讲得很清楚，学到了很多，推荐！',
    '非常专业的技能分享，收获满满，期待下次交流。',
    '人很nice，教学耐心，推荐给想学的朋友。',
    '体验很棒，讲解细致，值得学习！',
    '超级赞，学到了真东西，太感谢了！',
    '很好的一次技能交换，互相学习共同进步。',
    '老师很厉害，思路清晰，很有启发。',
    '交流愉快，干货满满，强烈推荐！',
  ];
  
  reviews.push({
    id: generateId(),
    fromUserId: fromUser.id,
    toUserId: toUser.id,
    skillId: toSkill.id,
    rating: Math.floor(Math.random() * 3) + 3,
    comment: commentTemplates[Math.floor(Math.random() * commentTemplates.length)],
    createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
  });
}

for (const user of users) {
  for (const skill of user.skills) {
    const skillReviews = reviews.filter(r => r.skillId === skill.id);
    if (skillReviews.length > 0) {
      skill.reviewCount = skillReviews.length;
      skill.avgRating = +(skillReviews.reduce((sum, r) => sum + r.rating, 0) / skillReviews.length).toFixed(1);
    }
  }
}

const currentUserId = users[0].id;

app.get('/api/user/current', (req: Request, res: Response) => {
  const user = users.find(u => u.id === currentUserId);
  res.json(user);
});

app.get('/api/users', (req: Request, res: Response) => {
  const { search } = req.query;
  let result = users;
  
  if (search && typeof search === 'string') {
    const keyword = search.toLowerCase();
    result = users.filter(user => 
      user.nickname.toLowerCase().includes(keyword) ||
      user.skills.some(s => s.name.toLowerCase().includes(keyword))
    );
  }
  
  res.json(result);
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json(user);
});

app.get('/api/skills', (req: Request, res: Response) => {
  const { search } = req.query;
  let allSkills = users.flatMap(u => u.skills.map(s => ({ ...s, user: u })));
  
  if (search && typeof search === 'string') {
    const keyword = search.toLowerCase();
    allSkills = allSkills.filter(s =>
      s.name.toLowerCase().includes(keyword) ||
      s.user.nickname.toLowerCase().includes(keyword)
    );
  }
  
  res.json(allSkills);
});

app.get('/api/skills/:id', (req: Request, res: Response) => {
  for (const user of users) {
    const skill = user.skills.find(s => s.id === req.params.id);
    if (skill) {
      return res.json({ ...skill, user });
    }
  }
  res.status(404).json({ error: 'Skill not found' });
});

app.get('/api/requests', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  let result = requests;
  
  if (userId) {
    result = requests.filter(r => r.fromUserId === userId || r.toUserId === userId);
  }
  
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const enriched = result.map(r => {
    const fromUser = users.find(u => u.id === r.fromUserId);
    const toUser = users.find(u => u.id === r.toUserId);
    const fromSkill = fromUser?.skills.find(s => s.id === r.fromSkillId);
    const toSkill = toUser?.skills.find(s => s.id === r.toSkillId);
    return { ...r, fromUser, toUser, fromSkill, toSkill };
  });
  
  res.json(enriched);
});

app.post('/api/requests', (req: Request, res: Response) => {
  const { fromUserId, toUserId, fromSkillId, toSkillId, proposedHours, message } = req.body;
  
  const newRequest: ExchangeRequest = {
    id: generateId(),
    fromUserId,
    toUserId,
    fromSkillId,
    toSkillId,
    proposedHours,
    status: 'pending',
    message: message || '',
    createdAt: new Date().toISOString(),
  };
  
  requests.unshift(newRequest);
  res.status(201).json(newRequest);
});

app.put('/api/requests/:id', (req: Request, res: Response) => {
  const request = requests.find(r => r.id === req.params.id);
  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }
  
  const { status, proposedHours, message } = req.body;
  
  if (status) request.status = status;
  if (proposedHours) request.proposedHours = proposedHours;
  if (message) request.message = message;
  
  if (status === 'confirmed') {
    const record: ExchangeRecord = {
      id: generateId(),
      requestId: request.id,
      fromUserId: request.fromUserId,
      toUserId: request.toUserId,
      fromSkillId: request.fromSkillId,
      toSkillId: request.toSkillId,
      hours: request.proposedHours,
      status: 'scheduled',
      scheduledTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    };
    records.push(record);
  }
  
  res.json(request);
});

app.get('/api/reviews', (req: Request, res: Response) => {
  const { skillId, userId } = req.query;
  let result = reviews;
  
  if (skillId) {
    result = reviews.filter(r => r.skillId === skillId);
  }
  if (userId) {
    result = reviews.filter(r => r.toUserId === userId);
  }
  
  result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  
  const enriched = result.map(r => {
    const fromUser = users.find(u => u.id === r.fromUserId);
    return { ...r, fromUser };
  });
  
  res.json(enriched);
});

app.post('/api/reviews', (req: Request, res: Response) => {
  const { fromUserId, toUserId, skillId, rating, comment } = req.body;
  
  const review: Review = {
    id: generateId(),
    fromUserId,
    toUserId,
    skillId,
    rating,
    comment,
    createdAt: new Date().toISOString(),
  };
  
  reviews.push(review);
  
  for (const user of users) {
    const skill = user.skills.find(s => s.id === skillId);
    if (skill) {
      const skillReviews = reviews.filter(r => r.skillId === skillId);
      skill.reviewCount = skillReviews.length;
      skill.avgRating = +(skillReviews.reduce((sum, r) => sum + r.rating, 0) / skillReviews.length).toFixed(1);
      break;
    }
  }
  
  res.status(201).json(review);
});

app.get('/api/records', (req: Request, res: Response) => {
  const userId = req.query.userId as string;
  let result = records;
  
  if (userId) {
    result = records.filter(r => r.fromUserId === userId || r.toUserId === userId);
  }
  
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
