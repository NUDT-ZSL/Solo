import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const db = new Database('bookclub.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS book_clubs (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    date TEXT,
    time TEXT,
    location TEXT,
    cover_bg TEXT,
    cover_icon TEXT,
    registered_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    avatar TEXT,
    avatar_border TEXT
  );

  CREATE TABLE IF NOT EXISTS registrations (
    id TEXT PRIMARY KEY,
    book_club_id TEXT,
    user_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_club_id) REFERENCES book_clubs(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS reviews (
    id TEXT PRIMARY KEY,
    book_club_id TEXT,
    user_id TEXT,
    user_name TEXT,
    user_avatar TEXT,
    rating INTEGER,
    content TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_club_id) REFERENCES book_clubs(id)
  );

  CREATE TABLE IF NOT EXISTS book_candidates (
    id TEXT PRIMARY KEY,
    book_club_id TEXT,
    title TEXT,
    author TEXT,
    cover_bg TEXT,
    votes INTEGER DEFAULT 0,
    FOREIGN KEY (book_club_id) REFERENCES book_clubs(id)
  );

  CREATE TABLE IF NOT EXISTS votes (
    id TEXT PRIMARY KEY,
    book_club_id TEXT,
    user_id TEXT,
    candidate_id TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_club_id) REFERENCES book_clubs(id),
    FOREIGN KEY (candidate_id) REFERENCES book_candidates(id)
  );
`);

const bookClubCount = db.prepare('SELECT COUNT(*) as count FROM book_clubs').get();

if (bookClubCount.count === 0) {
  const insertBookClub = db.prepare(`
    INSERT INTO book_clubs (id, name, description, date, time, location, cover_bg, cover_icon, registered_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertUser = db.prepare(`
    INSERT INTO users (id, name, avatar, avatar_border)
    VALUES (?, ?, ?, ?)
  `);

  const insertRegistration = db.prepare(`
    INSERT INTO registrations (id, book_club_id, user_id)
    VALUES (?, ?, ?)
  `);

  const insertReview = db.prepare(`
    INSERT INTO reviews (id, book_club_id, user_id, user_name, user_avatar, rating, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertCandidate = db.prepare(`
    INSERT INTO book_candidates (id, book_club_id, title, author, cover_bg, votes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const bookClubs = [
    {
      id: 'bc1',
      name: '春日读书分享会',
      description: '春暖花开，让我们一起分享最近读过的好书。无论你喜欢小说、散文还是诗歌，都欢迎来参加这场温馨的读书聚会。我们将一起讨论书中的精彩片段，分享阅读心得，结识志同道合的朋友。',
      date: '2026年6月20日',
      time: '周六下午 2:00 - 5:00',
      location: '城市书房·二楼活动室',
      cover_bg: 'linear-gradient(135deg, #FFE5D9 0%, #FFB5A7 100%)',
      cover_icon: '🌸',
      registered_count: 12
    },
    {
      id: 'bc2',
      name: '悬疑之夜·推理小说共读',
      description: '喜欢推理小说的朋友们注意啦！本月我们将一起共读阿加莎·克里斯蒂的经典作品《无人生还》。在这个夜晚，让我们一起剖析案件，寻找线索，看看谁能最先猜出真相。',
      date: '2026年6月28日',
      time: '周日晚上 7:00 - 9:30',
      location: '静谧咖啡·三楼包厢',
      cover_bg: 'linear-gradient(135deg, #CDB4DB 0%, #A2D2FF 100%)',
      cover_icon: '🔍',
      registered_count: 8
    },
    {
      id: 'bc3',
      name: '诗与远方·现代诗歌品读',
      description: '在忙碌的生活中，给自己留一点诗意的空间。本期诗会我们将一起品读海子、顾城、余秀华等现代诗人的作品，感受文字的力量与美感，分享那些触动心灵的诗句。',
      date: '2026年7月5日',
      time: '周三晚上 7:30 - 9:00',
      location: '月光书店·文学区',
      cover_bg: 'linear-gradient(135deg, #B8E0D2 0%, #95D5B2 100%)',
      cover_icon: '📜',
      registered_count: 6
    },
    {
      id: 'bc4',
      name: '科幻未来·三体主题沙龙',
      description: '宇宙很大，生活更大。本期科幻读书沙龙，让我们一起走进刘慈欣的《三体》世界，探讨黑暗森林法则、降维打击等经典概念，畅想人类文明的未来。',
      date: '2026年7月12日',
      time: '周六下午 3:00 - 6:00',
      location: '星空书屋·科幻专区',
      cover_bg: 'linear-gradient(135deg, #D0D1FF 0%, #C4B5FD 100%)',
      cover_icon: '🚀',
      registered_count: 15
    },
    {
      id: 'bc5',
      name: '美食与书·饮食文学',
      description: '美食与文字，都是生活的调味剂。本期书会我们将一起阅读那些关于美食的文学作品，从汪曾祺的《人间滋味》到蔡澜的随笔，聊聊饮食文化，分享各自的拿手菜。',
      date: '2026年7月18日',
      time: '周六上午 10:00 - 12:00',
      location: '味道书房·一楼大厅',
      cover_bg: 'linear-gradient(135deg, #FFD6A5 0%, #FDFFB6 100%)',
      cover_icon: '🍜',
      registered_count: 10
    },
    {
      id: 'bc6',
      name: '成长之路·青年读书分享',
      description: '在成长的道路上，书籍是我们最好的伙伴。本期青年读书分享会，欢迎大家带来影响自己最深的那本书，分享它如何陪伴你度过迷茫与困惑，见证你的成长。',
      date: '2026年7月25日',
      time: '周日下午 2:00 - 5:00',
      location: '青春书店·多功能厅',
      cover_bg: 'linear-gradient(135deg, #A8DADC 0%, #457B9D 100%)',
      cover_icon: '🌱',
      registered_count: 9
    }
  ];

  const users = [
    { id: 'u1', name: '小明', avatar: '😀', avatar_border: '#FFB5A7' },
    { id: 'u2', name: '小红', avatar: '👧', avatar_border: '#CDB4DB' },
    { id: 'u3', name: '阿强', avatar: '🧑', avatar_border: '#B8E0D2' },
    { id: 'u4', name: '晓琳', avatar: '👩', avatar_border: '#FFD6A5' },
    { id: 'u5', name: '大伟', avatar: '👨', avatar_border: '#A8DADC' },
    { id: 'u6', name: '美美', avatar: '👱‍♀️', avatar_border: '#D0D1FF' },
    { id: 'u7', name: '小林', avatar: '🧒', avatar_border: '#95D5B2' },
    { id: 'u8', name: '阿珍', avatar: '👩‍🦰', avatar_border: '#FDFFB6' },
    { id: 'u9', name: '建国', avatar: '👴', avatar_border: '#C4B5FD' },
    { id: 'u10', name: '小花', avatar: '👧', avatar_border: '#FFE5D9' },
    { id: 'u11', name: '志明', avatar: '👨‍🦱', avatar_border: '#A2D2FF' },
    { id: 'u12', name: '春娇', avatar: '👩‍🦳', avatar_border: '#FFB5A7' },
    { id: 'u13', name: '小龙', avatar: '🧑', avatar_border: '#B8E0D2' },
    { id: 'u14', name: '秋月', avatar: '👩', avatar_border: '#CDB4DB' },
    { id: 'u15', name: '大海', avatar: '👨', avatar_border: '#FFD6A5' }
  ];

  const reviews = [
    { id: 'r1', bookClubId: 'bc1', userId: 'u1', userName: '小明', userAvatar: '😀', rating: 5, content: '太棒了！第一次参加书会就遇到了这么多志同道合的朋友，分享了很多好书。期待下一次！', createdAt: '2026-06-10T10:30:00Z' },
    { id: 'r2', bookClubId: 'bc1', userId: 'u2', userName: '小红', userAvatar: '👧', rating: 4, content: '环境很温馨，主持人也很专业。就是时间有点短，感觉没聊够。希望下次可以延长一些。', createdAt: '2026-06-11T14:20:00Z' },
    { id: 'r3', bookClubId: 'bc1', userId: 'u3', userName: '阿强', userAvatar: '🧑', rating: 5, content: '参加过好几次书会了，每次都有新收获。这次认识了一位同样喜欢村上春树的朋友，聊得很投机！', createdAt: '2026-06-09T09:15:00Z' },
    { id: 'r4', bookClubId: 'bc1', userId: 'u4', userName: '晓琳', userAvatar: '👩', rating: 4, content: '氛围很好，茶点也不错。建议下次可以准备一些书单推荐，方便大家回去找书看。', createdAt: '2026-06-08T16:45:00Z' },
    { id: 'r5', bookClubId: 'bc1', userId: 'u5', userName: '大伟', userAvatar: '👨', rating: 5, content: '作为一个内向的人，本来还有点担心会尴尬，结果大家都很友善，聊得很开心。强烈推荐！', createdAt: '2026-06-07T11:00:00Z' },
    { id: 'r6', bookClubId: 'bc1', userId: 'u6', userName: '美美', userAvatar: '👱‍♀️', rating: 3, content: '整体还行吧，就是讨论的书我不太感兴趣。希望以后的主题能更多元一些。', createdAt: '2026-06-06T13:30:00Z' },
    { id: 'r7', bookClubId: 'bc1', userId: 'u7', userName: '小林', userAvatar: '🧒', rating: 5, content: '超棒的体验！分享了一本我很喜欢的小众书，没想到有人也读过，太惊喜了！', createdAt: '2026-06-05T15:00:00Z' },
    { id: 'r8', bookClubId: 'bc1', userId: 'u8', userName: '阿珍', userAvatar: '👩‍🦰', rating: 4, content: '读书会的地点很文艺，适合拍照。内容也不错，给四星鼓励一下~', createdAt: '2026-06-04T10:00:00Z' },
    { id: 'r9', bookClubId: 'bc1', userId: 'u9', userName: '建国', userAvatar: '👴', rating: 5, content: '活到老学到老，退休后参加书会是我最开心的事。年轻人的想法让我也开阔了眼界。', createdAt: '2026-06-03T08:30:00Z' },
    { id: 'r10', bookClubId: 'bc1', userId: 'u10', userName: '小花', userAvatar: '👧', rating: 5, content: '书会组织得很好，每个人都有发言的机会。下次还要来！', createdAt: '2026-06-02T17:20:00Z' },
    { id: 'r11', bookClubId: 'bc1', userId: 'u11', userName: '志明', userAvatar: '👨‍🦱', rating: 4, content: '挺好的，就是人有点多，希望能控制一下人数，让每个人都能多说几句。', createdAt: '2026-06-01T12:00:00Z' },
    { id: 'r12', bookClubId: 'bc1', userId: 'u12', userName: '春娇', userAvatar: '👩‍🦳', rating: 5, content: '邂逅了一本好书，认识了几位好友，这就是我理想中的周末！', createdAt: '2026-05-31T19:45:00Z' },
    { id: 'r13', bookClubId: 'bc2', userId: 'u3', userName: '阿强', userAvatar: '🧑', rating: 5, content: '推理爱好者的天堂！一起讨论案情太有意思了，期待下一期。', createdAt: '2026-06-10T22:00:00Z' },
    { id: 'r14', bookClubId: 'bc2', userId: 'u5', userName: '大伟', userAvatar: '👨', rating: 4, content: '气氛很好，主持人很会带动节奏。就是剧透有点多，对没看完的人不太友好。', createdAt: '2026-06-09T21:30:00Z' },
    { id: 'r15', bookClubId: 'bc4', userId: 'u13', userName: '小龙', userAvatar: '🧑', rating: 5, content: '三体！永远的神！和大家一起讨论二向箔、黑暗森林，太燃了！', createdAt: '2026-06-08T18:00:00Z' }
  ];

  const candidates = [
    { id: 'c1', bookClubId: 'bc1', title: '百年孤独', author: '加西亚·马尔克斯', cover_bg: 'linear-gradient(135deg, #FFE5D9 0%, #FFB5A7 100%)', votes: 8 },
    { id: 'c2', bookClubId: 'bc1', title: '小王子', author: '安托万·德·圣-埃克苏佩里', cover_bg: 'linear-gradient(135deg, #B8E0D2 0%, #95D5B2 100%)', votes: 6 },
    { id: 'c3', bookClubId: 'bc1', title: '追风筝的人', author: '卡勒德·胡赛尼', cover_bg: 'linear-gradient(135deg, #D0D1FF 0%, #C4B5FD 100%)', votes: 4 }
  ];

  bookClubs.forEach(bc => {
    insertBookClub.run(bc.id, bc.name, bc.description, bc.date, bc.time, bc.location, bc.cover_bg, bc.cover_icon, bc.registered_count);
  });

  users.forEach(u => {
    insertUser.run(u.id, u.name, u.avatar, u.avatar_border);
  });

  let regId = 1;
  bookClubs.forEach(bc => {
    for (let i = 1; i <= bc.registered_count && i <= users.length; i++) {
      insertRegistration.run(`reg${regId++}`, bc.id, users[i - 1].id);
    }
  });

  reviews.forEach(r => {
    insertReview.run(r.id, r.bookClubId, r.userId, r.userName, r.userAvatar, r.rating, r.content, r.createdAt);
  });

  candidates.forEach(c => {
    insertCandidate.run(c.id, c.bookClubId, c.title, c.author, c.cover_bg, c.votes);
  });
}

app.get('/api/bookclubs', (req, res) => {
  try {
    const bookClubs = db.prepare('SELECT * FROM book_clubs').all();
    const result = bookClubs.map(bc => ({
      id: bc.id,
      name: bc.name,
      date: bc.date,
      time: bc.time,
      location: bc.location,
      coverBg: bc.cover_bg,
      coverIcon: bc.cover_icon,
      registeredCount: bc.registered_count
    }));
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookclubs/:id', (req, res) => {
  try {
    const { id } = req.params;
    const bookClub = db.prepare('SELECT * FROM book_clubs WHERE id = ?').get(id);
    if (!bookClub) {
      return res.status(404).json({ error: '书会不存在' });
    }

    const registrations = db.prepare(`
      SELECT users.* FROM registrations
      JOIN users ON registrations.user_id = users.id
      WHERE registrations.book_club_id = ?
      LIMIT 8
    `).all(id);

    const registeredUsers = registrations.map(r => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar,
      avatarBorder: r.avatar_border
    }));

    const result = {
      id: bookClub.id,
      name: bookClub.name,
      description: bookClub.description,
      date: bookClub.date,
      time: bookClub.time,
      location: bookClub.location,
      coverBg: bookClub.cover_bg,
      coverIcon: bookClub.cover_icon,
      registeredCount: bookClub.registered_count,
      registeredUsers
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookclubs/:id/register', (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const existing = db.prepare('SELECT * FROM registrations WHERE book_club_id = ? AND user_id = ?').get(id, userId);
    if (existing) {
      return res.status(400).json({ error: '已报名参加该书会' });
    }

    const regId = uuidv4();
    db.prepare('INSERT INTO registrations (id, book_club_id, user_id) VALUES (?, ?, ?)').run(regId, id, userId);
    db.prepare('UPDATE book_clubs SET registered_count = registered_count + 1 WHERE id = ?').run(id);

    const bookClub = db.prepare('SELECT * FROM book_clubs WHERE id = ?').get(id);
    res.json({ success: true, registeredCount: bookClub.registered_count });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookclubs/:id/reviews', (req, res) => {
  try {
    const { id } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const reviews = db.prepare(`
      SELECT * FROM reviews 
      WHERE book_club_id = ? 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `).all(id, limit, offset);

    const total = db.prepare('SELECT COUNT(*) as count FROM reviews WHERE book_club_id = ?').get(id).count;

    const result = {
      reviews: reviews.map(r => ({
        id: r.id,
        userId: r.user_id,
        userName: r.user_name,
        userAvatar: r.user_avatar,
        rating: r.rating,
        content: r.content,
        createdAt: r.created_at
      })),
      total,
      page,
      limit,
      hasMore: offset + reviews.length < total,
      isLoading: false
    };

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookclubs/:id/reviews', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, userName, userAvatar, rating, content } = req.body;

    const reviewId = uuidv4();
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO reviews (id, book_club_id, user_id, user_name, user_avatar, rating, content, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(reviewId, id, userId, userName, userAvatar, rating, content, now);

    const review = {
      id: reviewId,
      userId,
      userName,
      userAvatar,
      rating,
      content,
      createdAt: now
    };

    res.json(review);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/bookclubs/:id/candidates', (req, res) => {
  try {
    const { id } = req.params;
    const candidates = db.prepare('SELECT * FROM book_candidates WHERE book_club_id = ?').all(id);

    const result = candidates.map(c => ({
      id: c.id,
      title: c.title,
      author: c.author,
      coverBg: c.cover_bg,
      votes: c.votes
    }));

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/bookclubs/:id/vote', (req, res) => {
  try {
    const { id } = req.params;
    const { userId, candidateId } = req.body;

    const existingVote = db.prepare('SELECT * FROM votes WHERE book_club_id = ? AND user_id = ?').get(id, userId);
    if (existingVote) {
      return res.status(400).json({ error: '已经投过票了' });
    }

    const voteId = uuidv4();
    const now = new Date().toISOString();

    db.prepare('INSERT INTO votes (id, book_club_id, user_id, candidate_id, created_at) VALUES (?, ?, ?, ?, ?)')
      .run(voteId, id, userId, candidateId, now);
    db.prepare('UPDATE book_candidates SET votes = votes + 1 WHERE id = ?').run(candidateId);

    const candidate = db.prepare('SELECT * FROM book_candidates WHERE id = ?').get(candidateId);
    res.json({ success: true, candidateId: candidate.id, votes: candidate.votes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
