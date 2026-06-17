import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type {
  User,
  Activity,
  Registration,
  Review,
  TrendPoint,
  ActivityWordPoint,
  UserRank,
  SummaryStats,
  ActivityDetail,
  PaginatedResponse,
} from '../../shared/types.js';

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const users = new Map<string, User>();
const activities = new Map<string, Activity>();
const registrations = new Map<string, Registration>();
const reviews = new Map<string, Review>();

const AVATAR_COLORS = [
  '#EF5350', '#EC407A', '#AB47BC', '#7E57C2', '#5C6BC0',
  '#42A5F5', '#26C6DA', '#26A69A', '#66BB6A', '#9CCC65',
  '#FFA726', '#FF7043', '#8D6E63', '#78909C',
];

const randomColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];
const toDateKey = (d: Date | string) => new Date(d).toISOString().slice(0, 10);
const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

const success = <T>(data: T) => ({ success: true, data });
const error = (msg: string) => ({ success: false, error: msg });

const countWords = (text: string) => {
  const zh = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  const en = (text.match(/[a-zA-Z]+/g) || []).length;
  return zh + en;
};

function seedMockData() {
  const nicknames = ['林小雨', '张子墨', '王思远', '陈静怡', '赵晨阳', '刘书涵', '周逸凡', '吴清风'];
  const mockUsers: User[] = nicknames.map((name, i) => ({
    id: uuidv4(),
    nickname: name,
    createdAt: daysAgo(30 - i * 3).toISOString(),
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
  mockUsers.forEach((u) => users.set(u.id, u));

  const activityTemplates = [
    { name: '《百年孤独》深度共读', loc: '墨香书屋·二楼阅读区', desc: '一起走进马尔克斯的魔幻现实主义世界，探讨布恩迪亚家族七代人的兴衰。请提前阅读第一章至第五章。\n\n本次读书会将提供免费茶点和作者生平资料。' },
    { name: '东野圭吾推理之夜', loc: '社区文化中心·3号厅', desc: '精选《白夜行》《嫌疑人X的献身》两部代表作，分享你最爱的推理瞬间。\n\n现场设有抽书环节，参与即有机会获得新书一本。' },
    { name: '古典诗词雅集', loc: '城市公园·听雨亭', desc: '在初夏的荷香中品味唐诗宋词。每人准备一首自己最爱的诗词，朗诵并分享背后的故事。\n\n建议穿着汉服或素雅服饰出席。' },
    { name: '科幻文学沙龙', loc: '未来书店·星辰厅', desc: '探讨《三体》《沙丘》等经典科幻作品中的科技与人性。\n\n特邀科幻作家云来先生担任嘉宾主持。' },
    { name: '儿童绘本故事会', loc: '童趣图书馆·彩虹房', desc: '面向4-8岁小朋友的绘本共读活动。本期主题：勇气与友谊。\n\n请家长陪同参加，现场提供手工制作环节。' },
    { name: '女性作家作品研读', loc: '阳光咖啡馆·VIP包间', desc: '聚焦伍尔夫、张爱玲、毕淑敏等女性作家笔下的世界。\n\n仅限女性书友报名参加，场地有限先到先得。' },
    { name: '哲学入门茶话会', loc: '静心书斋·明德厅', desc: '从《苏菲的世界》《柏拉图和鸭嘴兽一起去酒吧》开始，轻松聊聊西方哲学。\n\n无需哲学基础，带着好奇心即可。' },
    { name: '历史纪实读书会', loc: '市图书馆·会议室A', desc: '本月主题：《万历十五年》与明朝的衰落。\n\n特邀历史系李教授担任导读嘉宾。' },
    { name: '旅行文学分享会', loc: '背包客青年旅舍·公共区', desc: '从《瓦尔登湖》到《不去会死》，在文字中环游世界。\n\n欢迎分享你自己的旅行故事。' },
    { name: '经济思维读书会', loc: '财经书店·报告厅', desc: '共读《国富论》《薛兆丰经济学讲义》，用经济学视角看日常。\n\n本期话题：为什么咖啡越来越贵？' },
    { name: '诗集朗诵会', loc: '海边书店·听涛台', desc: '面朝大海，以诗会友。现场提供诗集，也可自带。\n\n傍晚时分海边晚霞最佳，欢迎摄影爱好者参加。' },
    { name: '漫画文化沙龙', loc: '漫研社·活动室', desc: '从手冢治虫到井上雄彦，探讨日本漫画的黄金时代。\n\n现场设漫画交换角，欢迎带旧书来交换。' },
  ];

  const mockActivities: Activity[] = activityTemplates.map((t, i) => ({
    id: uuidv4(),
    name: t.name,
    date: daysAgo(i % 15).toISOString(),
    location: t.loc,
    description: t.desc,
    createdAt: daysAgo(20 - i).toISOString(),
  }));
  mockActivities.forEach((a) => activities.set(a.id, a));

  const activityIds = Array.from(activities.keys());
  const userIds = Array.from(users.keys());
  activityIds.forEach((aid, ai) => {
    const num = 2 + (ai % 5);
    for (let i = 0; i < num; i++) {
      const uid = userIds[(ai + i) % userIds.length];
      const exists = Array.from(registrations.values()).some(
        (r) => r.activityId === aid && r.userId === uid
      );
      if (!exists) {
        registrations.set(uuidv4(), {
          id: uuidv4(),
          activityId: aid,
          userId: uid,
          registeredAt: daysAgo(ai + 1).toISOString(),
        });
      }
    }
  });

  const bookTitles = [
    '《百年孤独》', '《白夜行》', '《三体》', '《苏菲的世界》', '《万历十五年》',
    '《瓦尔登湖》', '《红楼梦》', '《小王子》', '《活着》', '《围城》',
    '《平凡的世界》', '《挪威的森林》', '《追风筝的人》', '《解忧杂货店》',
  ];
  const reviewContents = [
    '这本书让我感受到了时间的魔力。作者用细腻的笔触描绘了一个家族的百年沧桑，每一个人物都鲜活地跃然纸上。最让我印象深刻的是那种宿命般的轮回感，仿佛一切都在重复，而又永远不会重来。\n\n读完之后我沉思了很久，我们每个人不都是在自己的孤独中寻找意义吗？马尔克斯用魔幻现实主义的手法，道出了全人类共通的情感。',
    '这是一部需要耐心阅读的作品，但回报也是巨大的。推理小说的外壳下包裹着深刻的人性探讨。作者对人物心理的刻画入木三分，每一个细节都可能是解开谜团的钥匙。\n\n我特别喜欢结尾的处理，它没有给出简单的善恶审判，而是留给读者无尽的思考空间。强烈推荐给所有喜欢深度阅读的朋友！',
    '作为硬科幻的代表作品，这本书在科学设定和故事叙事之间取得了完美的平衡。黑暗森林法则的提出令人震撼，它不仅是宇宙文明的生存法则，也映射了现实社会中的许多现象。\n\n作者宏大的想象力让人叹服，从三体游戏到二维化打击，每一个概念都让人耳目一新。读完之后仰望星空，不禁会想：茫茫宇宙中，我们真的是孤独的吗？',
    '作为哲学入门书籍再合适不过了。作者用童话故事的方式串联起整个西方哲学史，从苏格拉底到萨特，每一位哲学家的思想都用生动的例子加以说明。\n\n阅读过程就像经历了一场奇妙的思想旅行。它不会让你成为哲学家，但会点燃你对智慧的渴望。每一章结束后我都会停下来，思考那些看似简单却深刻的问题。',
    '黄仁宇先生用一个看似平淡的年份，勾勒出整个明朝由盛转衰的必然轨迹。全书最精彩的地方在于揭示了制度性困局——不是因为皇帝懒惰，不是因为大臣贪婪，而是整个文官制度已经僵化到无法自我革新。\n\n历史的魅力就在于此，它不只是帝王将相的故事，更是制度、文化、经济等多重因素交织下的必然走向。强烈推荐给所有喜欢历史的朋友。',
  ];

  let ri = 0;
  for (let r = 0; r < 35; r++) {
    const uid = userIds[r % userIds.length];
    const aid = activityIds[r % activityIds.length];
    const book = bookTitles[r % bookTitles.length];
    const template = reviewContents[r % reviewContents.length];
    const variant = template + (r % 3 === 0 ? '\n\n感谢读书会组织这样的活动，和大家的讨论让我获得了很多新视角！' : '');
    const days = daysAgo(r % 8);
    reviews.set(uuidv4(), {
      id: uuidv4(),
      userId: uid,
      activityId: aid,
      bookTitle: book,
      content: variant,
      rating: 3 + (ri++ % 3),
      wordCount: countWords(variant),
      createdAt: days.toISOString(),
      updatedAt: days.toISOString(),
    });
  }
}

seedMockData();

function getActivityDetail(activityId: string): ActivityDetail | null {
  const activity = activities.get(activityId);
  if (!activity) return null;
  const regs = Array.from(registrations.values()).filter((r) => r.activityId === activityId);
  const regUsers = regs
    .map((r) => users.get(r.userId))
    .filter((u): u is User => !!u);
  const revs = Array.from(reviews.values())
    .filter((r) => r.activityId === activityId)
    .map((r) => ({ ...r, user: users.get(r.userId)! }))
    .filter((r) => !!r.user)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return {
    ...activity,
    registrationCount: regs.length,
    registeredUsers: regUsers,
    reviews: revs as (Review & { user: User })[],
  };
}

app.get('/api/activities', (req, res) => {
  const page = Math.max(1, parseInt(String(req.query.page || '1')));
  const size = Math.min(50, Math.max(1, parseInt(String(req.query.size || '10'))));
  const all = Array.from(activities.values()).sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );
  const total = all.length;
  const start = (page - 1) * size;
  const items = all.slice(start, start + size);
  res.json(success<PaginatedResponse<Activity>>({ items, total, page, size }));
});

app.get('/api/activities/:id', (req, res) => {
  const detail = getActivityDetail(req.params.id);
  if (!detail) return res.status(404).json(error('活动不存在'));
  res.json(success(detail));
});

app.post('/api/activities', (req, res) => {
  const { name, date, location, description } = req.body || {};
  if (!name || !date || !location) return res.status(400).json(error('缺少必填字段'));
  if (location.length > 200) return res.status(400).json(error('地点不能超过200字符'));
  const activity: Activity = {
    id: uuidv4(),
    name: String(name).trim(),
    date: new Date(date).toISOString(),
    location: String(location).trim(),
    description: String(description || ''),
    createdAt: new Date().toISOString(),
  };
  activities.set(activity.id, activity);
  res.json(success(activity));
});

app.post('/api/activities/:id/register', (req, res) => {
  const { nickname } = req.body || {};
  if (!nickname || String(nickname).trim().length < 2 || String(nickname).trim().length > 20) {
    return res.status(400).json(error('昵称需2-20字符'));
  }
  const activity = activities.get(req.params.id);
  if (!activity) return res.status(404).json(error('活动不存在'));
  const nick = String(nickname).trim();
  let user = Array.from(users.values()).find((u) => u.nickname === nick);
  if (!user) {
    user = { id: uuidv4(), nickname: nick, createdAt: new Date().toISOString(), avatarColor: randomColor() };
    users.set(user.id, user);
  }
  const existing = Array.from(registrations.values()).find(
    (r) => r.activityId === activity.id && r.userId === user!.id
  );
  if (existing) return res.json(success({ user, already: true }));
  const reg: Registration = {
    id: uuidv4(),
    activityId: activity.id,
    userId: user.id,
    registeredAt: new Date().toISOString(),
  };
  registrations.set(reg.id, reg);
  res.json(success({ user, already: false }));
});

app.delete('/api/activities/:id/register', (req, res) => {
  const { userId } = req.body || {};
  if (!userId) return res.status(400).json(error('缺少userId'));
  const reg = Array.from(registrations.values()).find(
    (r) => r.activityId === req.params.id && r.userId === userId
  );
  if (!reg) return res.status(404).json(error('未报名该活动'));
  registrations.delete(reg.id);
  res.json(success(true));
});

app.get('/api/reviews', (req, res) => {
  const { activityId, userId } = req.query;
  let list = Array.from(reviews.values());
  if (activityId) list = list.filter((r) => r.activityId === activityId);
  if (userId) list = list.filter((r) => r.userId === userId);
  list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  res.json(success(list));
});

app.post('/api/reviews', (req, res) => {
  const { userId, activityId, bookTitle, content, rating } = req.body || {};
  if (!userId || !activityId || !bookTitle || !content) {
    return res.status(400).json(error('缺少必填字段'));
  }
  const wc = countWords(String(content));
  if (wc < 50) return res.status(400).json(error(`书评至少50字（当前${wc}字）`));
  if (wc > 500) return res.status(400).json(error(`书评最多500字（当前${wc}字）`));
  const r = Number(rating);
  if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json(error('评分需1-5分'));
  if (!users.has(userId)) return res.status(404).json(error('用户不存在'));
  if (!activities.has(activityId)) return res.status(404).json(error('活动不存在'));
  const now = new Date().toISOString();
  const review: Review = {
    id: uuidv4(),
    userId: String(userId),
    activityId: String(activityId),
    bookTitle: String(bookTitle).trim(),
    content: String(content),
    rating: r,
    wordCount: wc,
    createdAt: now,
    updatedAt: now,
  };
  reviews.set(review.id, review);
  res.json(success(review));
});

app.put('/api/reviews/:id', (req, res) => {
  const review = reviews.get(req.params.id);
  if (!review) return res.status(404).json(error('书评不存在'));
  const { bookTitle, content, rating } = req.body || {};
  if (content) {
    const wc = countWords(String(content));
    if (wc < 50) return res.status(400).json(error(`书评至少50字（当前${wc}字）`));
    if (wc > 500) return res.status(400).json(error(`书评最多500字（当前${wc}字）`));
    review.content = String(content);
    review.wordCount = wc;
  }
  if (bookTitle) review.bookTitle = String(bookTitle).trim();
  if (rating !== undefined) {
    const r = Number(rating);
    if (!Number.isFinite(r) || r < 1 || r > 5) return res.status(400).json(error('评分需1-5分'));
    review.rating = r;
  }
  review.updatedAt = new Date().toISOString();
  res.json(success(review));
});

app.get('/api/users/:id', (req, res) => {
  const u = users.get(req.params.id);
  if (!u) return res.status(404).json(error('用户不存在'));
  res.json(success(u));
});

app.post('/api/users', (req, res) => {
  const { nickname } = req.body || {};
  if (!nickname || String(nickname).trim().length < 2 || String(nickname).trim().length > 20) {
    return res.status(400).json(error('昵称需2-20字符'));
  }
  const nick = String(nickname).trim();
  let user = Array.from(users.values()).find((u) => u.nickname === nick);
  if (!user) {
    user = { id: uuidv4(), nickname: nick, createdAt: new Date().toISOString(), avatarColor: randomColor() };
    users.set(user.id, user);
  }
  res.json(success(user));
});

function buildTrend(days: number, extractDate: (item: any) => string, source: any[]): TrendPoint[] {
  const counts = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    counts.set(toDateKey(d), 0);
  }
  source.forEach((item) => {
    const key = toDateKey(extractDate(item));
    if (counts.has(key)) counts.set(key, counts.get(key)! + 1);
  });
  return Array.from(counts.entries()).map(([date, count]) => ({ date, count }));
}

app.get('/api/stats/activity-trend', (req, res) => {
  const days = Math.max(1, Math.min(365, parseInt(String(req.query.days || '30'))));
  const result = buildTrend(days, (a) => a.createdAt, Array.from(activities.values()));
  res.json(success(result));
});

app.get('/api/stats/review-trend', (req, res) => {
  const days = Math.max(1, Math.min(365, parseInt(String(req.query.days || '30'))));
  const result = buildTrend(days, (r) => r.createdAt, Array.from(reviews.values()));
  res.json(success(result));
});

app.get('/api/stats/summary', (_req, res) => {
  const totalActivities = activities.size;
  const totalRegistrations = registrations.size;
  const reviewArr = Array.from(reviews.values());
  const avg = reviewArr.length
    ? Number((reviewArr.reduce((s, r) => s + r.rating, 0) / reviewArr.length).toFixed(1))
    : 0;
  const result: SummaryStats = { totalActivities, totalRegistrations, avgReviewRating: avg };
  res.json(success(result));
});

app.get('/api/stats/user-activity/:userId', (req, res) => {
  const { userId } = req.params;
  const days = Math.max(1, Math.min(365, parseInt(String(req.query.days || '7'))));
  const counts = new Map<string, number>();
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    counts.set(toDateKey(d), 0);
  }
  const userReviews = Array.from(reviews.values()).filter((r) => r.userId === userId);
  userReviews.forEach((r) => {
    const key = toDateKey(r.createdAt);
    if (counts.has(key)) counts.set(key, counts.get(key)! + r.wordCount);
  });
  const result: ActivityWordPoint[] = Array.from(counts.entries()).map(([date, words]) => ({ date, words }));
  res.json(success(result));
});

app.get('/api/stats/user-rank/:userId', (_req, res) => {
  const { userId } = _req.params;
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthStartMs = monthStart.getTime();
  const userWordTotals = new Map<string, number>();
  users.forEach((_, id) => userWordTotals.set(id, 0));
  Array.from(reviews.values()).forEach((r) => {
    if (new Date(r.createdAt).getTime() >= monthStartMs) {
      userWordTotals.set(r.userId, (userWordTotals.get(r.userId) || 0) + r.wordCount);
    }
  });
  const sorted = Array.from(userWordTotals.entries())
    .map(([id, words]) => ({ id, words }))
    .sort((a, b) => b.words - a.words);
  const rank = sorted.findIndex((x) => x.id === userId) + 1;
  const total = sorted.length;
  const totalWords = userWordTotals.get(userId) || 0;
  const percent = total > 1 ? Math.max(0, Math.round(((total - rank) / (total - 1)) * 100)) : 0;
  const result: UserRank = { rank, totalUsers: total, percent, totalWords };
  res.json(success(result));
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.listen(PORT, () => {
  console.log(`[读书会后端] 服务已启动: http://localhost:${PORT}`);
  console.log(`Mock数据: 活动${activities.size}条, 用户${users.size}条, 报名${registrations.size}条, 书评${reviews.size}条`);
});
