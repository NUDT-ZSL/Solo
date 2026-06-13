import express from 'express';
import cors from 'cors';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const dataDir = path.join(__dirname, 'data');
const usersDB = Datastore.create(path.join(dataDir, 'users.db'));
const skillsDB = Datastore.create(path.join(dataDir, 'skills.db'));
const messagesDB = Datastore.create(path.join(dataDir, 'messages.db'));
const reviewsDB = Datastore.create(path.join(dataDir, 'reviews.db'));

function hashPassword(pwd) {
  return crypto.createHash('sha256').update(pwd).digest('hex');
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) { req.userId = null; return next(); }
  usersDB.findOne({ token }).then(user => { req.userId = user ? user._id : null; next(); });
}

app.use(authMiddleware);

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=',
  'https://api.dicebear.com/7.x/bottts/svg?seed=',
];
function avatar(seed) {
  return AVATARS[0] + encodeURIComponent(seed);
}

const COLORS = ['#e94560', '#0f3460', '#533483', '#f0a500'];
function randomColor(i) {
  return COLORS[i % COLORS.length];
}

function genSlots() {
  const times = ['09:00', '10:00', '14:00', '15:00', '19:00', '20:00'];
  const slots = [];
  for (let d = 1; d <= 5; d++) {
    times.forEach((t, i) => {
      slots.push({
        id: uuidv4(),
        dayOfWeek: d,
        time: t,
        booked: Math.random() < 0.25,
      });
    });
  }
  return slots;
}

async function seed() {
  const [uc, sc, mc, rc] = await Promise.all([
    usersDB.count({}), skillsDB.count({}), messagesDB.count({}), reviewsDB.count({})
  ]);

  if (uc > 0 && sc > 0) return;

  const now = Date.now();

  const userSeeds = [
    { nickname: '林吉他', email: 'lin@example.com', password: '123456', rating: 4.8,
      bio: '## 关于我\n\n🎸 10年民谣吉他教学经验，曾在酒吧驻唱3年。\n\n> 喜欢和学生做朋友，零基础轻松入门！\n\n- 擅长：指弹、弹唱、乐理\n- 课程：`每节60分钟`',
      canTeach: ['吉他', '乐理', '弹唱'], wantLearn: ['编程', '摄影'] },
    { nickname: '王大厨', email: 'wang@example.com', password: '123456', rating: 4.6,
      bio: '## 米其林二星副厨\n\n10年法餐与中式融合菜经验，擅长**家常快手菜**和节日大餐。',
      canTeach: ['烹饪', '烘焙', '西餐'], wantLearn: ['英语', '吉他'] },
    { nickname: 'CodeMaster', email: 'chen@example.com', password: '123456', rating: 4.9,
      bio: '## 全栈工程师\n\n```js\n// 带你写出优雅的代码\nfunction learn() { return "practice"; }\n```\n\nReact / Node.js / Python 均可。',
      canTeach: ['编程', 'React', 'Python'], wantLearn: ['瑜伽', '烹饪'] },
    { nickname: '张画家', email: 'zhang@example.com', password: '123456', rating: 4.5,
      bio: '## 美院硕士\n\n素描、水彩、油画，从握笔开始带你走进艺术世界。',
      canTeach: ['绘画', '水彩', '素描'], wantLearn: ['编程', '书法'] },
    { nickname: 'EnglishPro', email: 'liu@example.com', password: '123456', rating: 4.7,
      bio: '## 雅思8分\n\n5年英语教学经验，商务英语与日常口语皆可。',
      canTeach: ['英语', '雅思', '商务英语'], wantLearn: ['烹饪', '吉他'] },
    { nickname: '瑜伽Lily', email: 'lily@example.com', password: '123456', rating: 4.8,
      bio: '## 哈他瑜伽教练\n\nRYT200小时认证，带你感受身心合一的力量。',
      canTeach: ['瑜伽', '冥想', '普拉提'], wantLearn: ['摄影', '英语'] },
  ];

  const createdUsers = [];
  for (const u of userSeeds) {
    const user = await usersDB.insert({
      _id: uuidv4(),
      nickname: u.nickname,
      email: u.email,
      password: hashPassword(u.password),
      avatar: avatar(u.nickname),
      rating: u.rating,
      bio: u.bio,
      canTeach: u.canTeach,
      wantLearn: u.wantLearn,
      token: generateToken(),
      createdAt: now,
    });
    createdUsers.push(user);
  }

  const skillSeeds = [
    { title: '民谣吉他零基础入门', category: '吉他', teacher: 0,
      desc: '# 民谣吉他入门课\n\n## 课程内容\n\n1. 持琴与拨弦\n2. **基础和弦** C/G/Am/F\n3. 第一首歌《小星星》\n\n```\nE|--0--| 简单吧！\n```\n\n适合完全零基础的同学，一节课就能弹出第一首歌！' },
    { title: '法式烘焙：可颂与马卡龙', category: '烘焙', teacher: 1,
      desc: '# 精品烘焙课\n\n从揉面到烘烤，手把手教你做出层次分明的可颂。\n\n> 马卡龙的裙边，是少女的裙摆。' },
    { title: 'React 18 从入门到实战', category: '编程', teacher: 2,
      desc: '# React 18 实战\n\n```tsx\nfunction App() {\n  const [count, setCount] = useState(0);\n  return <button onClick={() => setCount(c => c + 1)}>{count}</button>;\n}\n```\n\nHooks、状态管理、性能优化一网打尽。' },
    { title: '水彩风景速写', category: '绘画', teacher: 3,
      desc: '# 水彩风景画\n\n从调色到晕染，画一幅你心中的风景。' },
    { title: '商务英语口语300句', category: '英语', teacher: 4,
      desc: '# 商务英语\n\n会议、邮件、谈判，职场英语全覆盖。' },
    { title: '办公室肩颈放松瑜伽', category: '瑜伽', teacher: 5,
      desc: '# 办公族瑜伽\n\n每天15分钟，告别肩颈酸痛。' },
    { title: 'Python 数据分析入门', category: '编程', teacher: 2,
      desc: '# Python 数据分析\n\nNumPy、Pandas、Matplotlib三件套。\n\n```python\nimport pandas as pd\ndf = pd.read_csv("data.csv")\nprint(df.describe())\n```' },
    { title: '家常粤菜10道经典', category: '烹饪', teacher: 1,
      desc: '# 粤菜家常\n\n白切鸡、清蒸鱼、老火靓汤，粤菜精华。' },
  ];

  for (let i = 0; i < skillSeeds.length; i++) {
    const s = skillSeeds[i];
    const teacher = createdUsers[s.teacher];
    await skillsDB.insert({
      _id: uuidv4(),
      title: s.title,
      category: s.category,
      description: s.desc,
      coverColor: randomColor(i),
      teacherId: teacher._id,
      teacherName: teacher.nickname,
      teacherAvatar: teacher.avatar,
      availableSlots: genSlots(),
      createdAt: now,
    });
  }

  const allSkills = await skillsDB.find({});
  const reviewTexts = [
    { s: 0, u: 2, r: 5, c: '林老师超有耐心，一节课就学会了小星星！' },
    { s: 0, u: 4, r: 4, c: '非常专业，会推荐朋友来。' },
    { s: 2, u: 0, r: 5, c: '陈老师的React讲得特别清楚！' },
    { s: 2, u: 3, r: 5, c: '代码质量很高，受益匪浅。' },
    { s: 1, u: 5, r: 4, c: '可颂做得很成功！' },
    { s: 4, u: 1, r: 5, c: '英语口语提升很快！' },
  ];
  for (const rv of reviewTexts) {
    const sk = allSkills[rv.s];
    const us = createdUsers[rv.u];
    await reviewsDB.insert({
      _id: uuidv4(),
      skillId: sk._id,
      userId: us._id,
      userName: us.nickname,
      userAvatar: us.avatar,
      rating: rv.r,
      content: rv.c,
      createdAt: now,
    });
  }

  const msgSeeds = [
    [0, 2, '你好，我想约你的吉他课～'],
    [2, 0, '欢迎！周几方便？'],
    [1, 4, '英语课什么时候开课呀？'],
  ];
  for (const m of msgSeeds) {
    const [f, t, c] = m;
    await messagesDB.insert({
      _id: uuidv4(),
      from: createdUsers[f]._id,
      to: createdUsers[t]._id,
      content: c,
      read: false,
      createdAt: now,
    });
  }

  console.log('[DB] Seed data initialized.');
}

app.post('/api/register', async (req, res) => {
  try {
    const { nickname, email, password } = req.body;
    if (!nickname || !email || !password) return res.status(400).json({ error: '缺少字段' });
    const exists = await usersDB.findOne({ email });
    if (exists) return res.status(400).json({ error: '邮箱已注册' });
    const token = generateToken();
    const user = await usersDB.insert({
      _id: uuidv4(),
      nickname, email,
      password: hashPassword(password),
      avatar: avatar(nickname),
      rating: 5.0,
      bio: '',
      canTeach: [],
      wantLearn: [],
      token,
      createdAt: Date.now(),
    });
    delete user.password;
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await usersDB.findOne({ email, password: hashPassword(password) });
    if (!user) return res.status(401).json({ error: '邮箱或密码错误' });
    const token = generateToken();
    await usersDB.update({ _id: user._id }, { $set: { token } });
    user.token = token;
    delete user.password;
    res.json({ token, user });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/skills', async (req, res) => {
  try {
    const { q } = req.query;
    let query = {};
    if (q) {
      const re = new RegExp(String(q), 'i');
      query = { $or: [{ title: re }, { category: re }, { teacherName: re }] };
    }
    const skills = await skillsDB.find(query).sort({ createdAt: -1 });
    res.json(skills);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/skills/:id', async (req, res) => {
  try {
    const skill = await skillsDB.findOne({ _id: req.params.id });
    if (!skill) return res.status(404).json({ error: '技能不存在' });
    const teacher = await usersDB.findOne({ _id: skill.teacherId });
    if (teacher) delete teacher.password;
    const reviews = await reviewsDB.find({ skillId: skill._id }).sort({ createdAt: -1 });
    res.json({ ...skill, teacher, reviews });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/skills/:id/book', async (req, res) => {
  try {
    const { slotId } = req.body;
    const skill = await skillsDB.findOne({ _id: req.params.id });
    if (!skill) return res.status(404).json({ error: '技能不存在' });
    const slots = skill.availableSlots.map(s =>
      s.id === slotId ? { ...s, booked: true, bookedBy: req.userId } : s
    );
    await skillsDB.update({ _id: req.params.id }, { $set: { availableSlots: slots } });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users', async (req, res) => {
  try {
    const users = await usersDB.find({});
    users.forEach(u => delete u.password);
    res.json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/users/:id', async (req, res) => {
  try {
    const user = await usersDB.findOne({ _id: req.params.id });
    if (!user) return res.status(404).json({ error: '用户不存在' });
    delete user.password;
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

function jaccard(a, b) {
  const sa = new Set(a);
  const sb = new Set(b);
  let inter = 0;
  sa.forEach(x => { if (sb.has(x)) inter++; });
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

app.get('/api/match', async (req, res) => {
  try {
    let canTeach = req.query.canTeach;
    let wantLearn = req.query.wantLearn;
    if (!Array.isArray(canTeach)) canTeach = canTeach ? [canTeach] : [];
    if (!Array.isArray(wantLearn)) wantLearn = wantLearn ? [wantLearn] : [];
    const myCanTeach = canTeach.filter(Boolean);
    const myWantLearn = wantLearn.filter(Boolean);

    if (myCanTeach.length === 0 && myWantLearn.length === 0) {
      return res.json([]);
    }

    const users = await usersDB.find({});
    const results = [];
    for (const u of users) {
      if (req.userId && u._id === req.userId) continue;
      const commonCanTeach = u.canTeach.filter(s => myWantLearn.includes(s));
      const commonWantLearn = u.wantLearn.filter(s => myCanTeach.includes(s));
      const all = [...myCanTeach, ...myWantLearn, ...u.canTeach, ...u.wantLearn];
      const union = new Set(all).size;
      const inter = commonCanTeach.length + commonWantLearn.length;
      const similarity = union === 0 ? 0 : inter / union;
      if (similarity >= 0.3) {
        delete u.password;
        results.push({
          user: u,
          similarity: Math.round(similarity * 100) / 100,
          commonCanTeach,
          commonWantLearn,
        });
      }
    }
    results.sort((a, b) => b.similarity - a.similarity);
    res.json(results);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/messages/:peerId', async (req, res) => {
  try {
    const peerId = req.params.peerId;
    const me = req.userId;
    const msgs = await messagesDB.find({
      $or: [
        { from: me, to: peerId },
        { from: peerId, to: me },
      ],
    }).sort({ createdAt: 1 });
    res.json(msgs);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/messages', async (req, res) => {
  try {
    const me = req.userId;
    if (!me) return res.json([]);
    const all = await messagesDB.find({
      $or: [{ from: me }, { to: me }],
    }).sort({ createdAt: -1 });
    const map = new Map();
    for (const m of all) {
      const peer = m.from === me ? m.to : m.from;
      if (!map.has(peer)) map.set(peer, { peerId: peer, lastMessage: m });
    }
    const result = [];
    for (const [peerId, info] of map) {
      const peer = await usersDB.findOne({ _id: peerId });
      if (peer) delete peer.password;
      result.push({ ...info, peer });
    }
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.post('/api/messages', async (req, res) => {
  try {
    const { to, content } = req.body;
    const from = req.userId;
    if (!from) return res.status(401).json({ error: '未登录' });
    const msg = await messagesDB.insert({
      _id: uuidv4(),
      from, to, content,
      read: false,
      createdAt: Date.now(),
    });
    res.json(msg);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/reviews/:skillId', async (req, res) => {
  try {
    const reviews = await reviewsDB.find({ skillId: req.params.skillId }).sort({ createdAt: -1 });
    res.json(reviews);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

seed().then(() => {
  app.listen(PORT, () => {
    console.log(`[SkillSwap] API server listening on http://localhost:${PORT}`);
  });
});
