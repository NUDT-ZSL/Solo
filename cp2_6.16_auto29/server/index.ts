import express from 'express';
import cors from 'cors';
import initSqlJs from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const DB_PATH = path.join(__dirname, 'bookstore.db');

async function startServer() {
  const SQL = await initSqlJs();

  let db: any;
  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  const saveDb = () => {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  };

  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL,
      cover TEXT NOT NULL,
      description TEXT DEFAULT ''
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS chapters (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      chapter_order INTEGER DEFAULT 0,
      claimed_by TEXT DEFAULT NULL
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS annotations (
      id TEXT PRIMARY KEY,
      chapter_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_avatar TEXT DEFAULT '',
      selected_text TEXT NOT NULL,
      start_offset INTEGER DEFAULT 0,
      end_offset INTEGER DEFAULT 0,
      highlight_color TEXT DEFAULT '#fff59d',
      body TEXT NOT NULL,
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      annotation_id TEXT NOT NULL,
      parent_id TEXT DEFAULT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      user_avatar TEXT DEFAULT '',
      body TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS likes (
      id TEXT PRIMARY KEY,
      annotation_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      UNIQUE(annotation_id, user_id)
    )
  `);

  const countResult = db.exec('SELECT COUNT(*) as count FROM books');
  const count = countResult.length > 0 ? countResult[0].values[0][0] : 0;

  if (count === 0) {
    const seedBooks = [
      { id: 'b1', title: '百年孤独', author: '加西亚·马尔克斯', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=vintage%20book%20cover%20magical%20realism%20surreal%20jungle%20village&image_size=portrait_4_3', description: '魔幻现实主义文学的代表作，讲述了布恩迪亚家族七代人的传奇故事。' },
      { id: 'b2', title: '追风筝的人', author: '卡勒德·胡赛尼', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=kite%20flying%20over%20kabul%20afghanistan%20cityscape%20warm%20sunset&image_size=portrait_4_3', description: '关于友谊、背叛与救赎的动人故事。' },
      { id: 'b3', title: '小王子', author: '安托万·德·圣埃克苏佩里', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=little%20prince%20on%20planet%20stars%20night%20sky%20watercolor&image_size=portrait_4_3', description: '一部写给大人的童话，关于爱与责任的寓言。' },
      { id: 'b4', title: '活着', author: '余华', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20countryside%20farmer%20field%20sunset%20melancholic&image_size=portrait_4_3', description: '一个人和他命运之间的友情，讲述了人如何去承受巨大的苦难。' },
      { id: 'b5', title: '挪威的森林', author: '村上春树', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=norwegian%20forest%20trees%20mist%20japanese%20countryside%20moody&image_size=portrait_4_3', description: '关于青春、爱情与失去的动人叙事。' },
      { id: 'b6', title: '围城', author: '钱钟书', cover: 'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=chinese%20old%20city%20gate%20wall%20traditional%20architecture%20ink%20style&image_size=portrait_4_3', description: '一部以留学归来为背景的讽刺小说，描写了知识分子的生活百态。' },
    ];
    const seedChapters = [
      { id: 'c1', book_id: 'b1', title: '第一章 冰块与磁铁', content: '多年以后，面对行刑队，奥雷里亚诺·布恩迪亚上校将会回想起父亲带他去见识冰块的那个遥远的下午。那时的马孔多是一个二十户人家的村落，泥巴和芦苇盖成的屋子沿河岸排开，湍急的河水清澈见底，河床里卵石洁白光滑宛如史前巨蛋。那时的世界太新，许多东西还没有名字，提到的时候尚需用手指指点点。每年三月前后，一家衣衫褴褛的吉卜赛人都会来到村边扎下帐篷，在笛鼓的喧嚣中，向马孔多的居民介绍科学家们的最新发明。他们先是带来了磁铁。一个身材高大的吉卜赛人，自称梅尔基亚德斯，满脸络腮胡子，手指瘦得像鸟的爪子，向观众出色地表演了他所谓的马其顿炼金术士的第八奇迹。他挨家挨户地拖着两块磁铁，大家惊异地看着铁锅、铁盆、铁钳、小铁炉纷纷从原地落下，木板因铁钉和螺钉没命地挣脱出来而嘎嘎作响，甚至连那些丢失很久的东西也从找过多次的地方兀然出现。', chapter_order: 1, claimed_by: null },
      { id: 'c2', book_id: 'b1', title: '第二章 炼金术', content: '何塞·阿尔卡蒂奥·布恩迪亚是个极富进取心的人，他精力过剩，不甘心于平凡的生活。他意识到吉卜赛人的科学有着无穷的潜力，于是开始了一段痴迷的探索之旅。他把家里的金子拿去换取那些看似无用的仪器——星盘、罗盘、望远镜。他把自己关在小房间里，计算着星球的运行轨迹，试图找到炼金术的秘密。他的妻子乌尔苏拉看着丈夫日渐消瘦，心中充满了忧虑。然而布恩迪亚完全沉浸在自己的世界里，他对现实生活的关心越来越少，对炼金术的痴迷却越来越深。他甚至相信可以用某种神秘的方法将铅变成金子。', chapter_order: 2, claimed_by: null },
      { id: 'c3', book_id: 'b1', title: '第三章 失眠症', content: '马孔多突然被一种奇怪的疾病侵袭——失眠症。最初，人们并不在意这种无法入睡的状况，甚至因为多了许多清醒的时间而感到高兴。他们利用这些额外的时间工作、生活，似乎一切都变得更好了。然而，失眠症最可怕的并非无法入睡，而是它带来的后遗症——失忆。渐渐地，人们开始忘记事物的名称和用途。为了对抗遗忘，何塞·阿尔卡蒂奥·布恩迪亚想出了一个办法：他在每样东西上贴上标签，写明名称和用途。他在牛的身上写上"这是牛，每天要挤奶"之类的话。', chapter_order: 3, claimed_by: null },
      { id: 'c4', book_id: 'b2', title: '第一章 喀布尔的风筝', content: '我成为今天的我，是在一九七五年某个阴云密布的寒冷冬日，那年我十二岁。我清楚地记得当时自己趴在一堵坍塌的泥墙后面，窥视着那条小巷，旁边是结冰的小溪。许多年过去了，人们说陈年旧事可以被埋葬。然而我终于明白这是错的，因为往事会自行爬上来。回首前尘，我意识到在过去二十六年里，自己始终在窥视着那荒芜的小径。拉米尔和哈桑，喀布尔的两个少年，在风筝比赛中结下了深厚的友谊。那个冬天的风筝比赛改变了一切。', chapter_order: 1, claimed_by: null },
      { id: 'c5', book_id: 'b2', title: '第二章 背叛', content: '那条小巷是我记忆中最黑暗的角落。我站在那里，看着发生的一切，却什么也没有做。我的嘴唇动了动，但声音像被什么东西堵住了。我转身跑开了，一路跑回了家。风筝的蓝色在冬日的天空中飘荡，那是我为哈桑追回来的最后一只风筝。从那天起，一切都变了。我再也无法直视哈桑的眼睛，他的忠诚让我感到羞耻。我开始疏远他，找各种借口避开他。最终，我设计了一个阴谋，将哈桑和他的父亲赶出了我们的家。', chapter_order: 2, claimed_by: null },
      { id: 'c6', book_id: 'b3', title: '第一章 献给莱昂·维尔特', content: '我请孩子们原谅我把这本书献给了一个大人。我有一个正当的理由：这个大人是我在世界上最好的朋友。我还有另一个理由：这个大人他什么都能懂，甚至给孩子们写的书他也能懂。我还有第三个理由：这个大人住在法国，他在那里忍冻挨饿，很需要有人安慰。要是这些理由还不够的话，我很愿意把这本书献给小时候的他。所有的大人都曾经是小孩子，虽然只有少数人记得。所以我把我的献词修改为：献给小时候的莱昂·维尔特。', chapter_order: 1, claimed_by: null },
      { id: 'c7', book_id: 'b3', title: '第二章 B612小行星', content: '我就这样孤独地生活着，没有一个能真正聊得来的人，直到六年前在撒哈拉沙漠上发生了那次故障。我的发动机里有个什么东西损坏了，既没有机械师也没有旅客，我只好独自尝试完成一次困难的修理。这对我来说是生与死的问题。我随身带的水只够喝一个星期。第一天晚上我就睡在远离人烟的大沙漠上。黎明时分，一个奇怪的小声音把我叫醒。你可以想象，我当时有多惊讶。那个声音说：请你给我画一只绵羊好吗？我猛地睁开眼睛，定睛一看，只见一个十分奇怪的小家伙正认真地望着我。', chapter_order: 2, claimed_by: null },
      { id: 'c8', book_id: 'b4', title: '第一章 少年福贵', content: '我比现在年轻十岁的时候，获得了一个游手好闲的职业，去乡间收集民间歌谣。那一年的整个夏天，我如同一只乱飞的麻雀，游荡在知了和阳光充斥的村舍田野。我戴着草帽穿着拖鞋走在田间的小路上，两边的稻子绿油油的，阳光照在上面，像是在燃烧。那天下午我走了很远的路，来到一个叫做南门的地方。我看见一个老人正在犁田，他的脊背弯成了一张弓。那就是福贵。', chapter_order: 1, claimed_by: null },
      { id: 'c9', book_id: 'b5', title: '第一章 风与草地', content: '我在三十七岁那年的春天，搭乘波音747飞机到达汉堡机场。那是四月间一个阴雨绵绵的早晨，细密的雨丝斜斜地打在窗玻璃上，整个城市笼罩在灰蒙蒙的雾气中。身着雨衣的地勤人员、随风飘扬的候机楼旗帜、远处模糊的建筑轮廓，一切都显得那样虚无飘渺。我仿佛置身于另一个世界，一个不属于我的世界。巴士驶入高速公路时，雨势更大了，车窗外的景色变得愈发模糊。我闭上眼睛，耳边响起了那首旋律——挪威的森林。', chapter_order: 1, claimed_by: null },
      { id: 'c10', book_id: 'b6', title: '第一章 归国', content: '红海早过了，船在印度洋面上开驶着。但是太阳依然不饶人地迟落早起，侵占去大部分的夜。夜仿佛纸浸了油，变成半透明体，它给太阳拥抱住了，分不出身来，也许是给太阳陶醉了，所以夕照晚霞隐退后的夜色也带着酡红。方鸿渐到了欧洲，既不抄敦煌卷子，也不访永乐大典，也不找太平天国文献，更不学蒙古文、西藏文或梵文。四年中倒换了三个大学，随便听了几门课，但是什么学位也没拿到。', chapter_order: 1, claimed_by: null },
    ];
    const seedAnnotations = [
      { id: 'a1', chapter_id: 'c1', user_id: 'u2', user_name: '阅读者小林', user_avatar: '', selected_text: '那时的世界太新，许多东西还没有名字，提到的时候尚需用手指指点点', start_offset: 150, end_offset: 180, highlight_color: '#a5d6a7', body: '这句话太美了，"世界太新"这个意象贯穿了整部小说，暗示着一切都是开端，一切都在被命名和定义的过程中。', likes: 3, created_at: '2026-06-15T10:30:00' },
      { id: 'a2', chapter_id: 'c1', user_id: 'u3', user_name: '书虫阿明', user_avatar: '', selected_text: '铁锅、铁盆、铁钳、小铁炉纷纷从原地落下', start_offset: 380, end_offset: 400, highlight_color: '#fff59d', body: '磁铁的场景描写极具画面感，物质世界的秩序被外来力量打乱，隐喻了马孔多即将面临的巨大变革。', likes: 1, created_at: '2026-06-16T08:15:00' },
    ];
    const seedComments = [
      { id: 'cm1', annotation_id: 'a1', parent_id: null, user_id: 'u3', user_name: '书虫阿明', user_avatar: '', body: '同意！马尔克斯的这种写法让读者感到自己仿佛也是那个新世界的见证者。', created_at: '2026-06-15T11:00:00' },
      { id: 'cm2', annotation_id: 'a1', parent_id: 'cm1', user_id: 'u2', user_name: '阅读者小林', user_avatar: '', body: '是的，"用手指指点点"也暗示了语言和认知的局限，很深刻的开篇。', created_at: '2026-06-15T11:30:00' },
    ];

    for (const b of seedBooks) {
      db.run('INSERT OR IGNORE INTO books (id, title, author, cover, description) VALUES (?, ?, ?, ?, ?)', [b.id, b.title, b.author, b.cover, b.description]);
    }
    for (const c of seedChapters) {
      db.run('INSERT OR IGNORE INTO chapters (id, book_id, title, content, chapter_order, claimed_by) VALUES (?, ?, ?, ?, ?, ?)', [c.id, c.book_id, c.title, c.content, c.chapter_order, c.claimed_by]);
    }
    for (const a of seedAnnotations) {
      db.run('INSERT OR IGNORE INTO annotations (id, chapter_id, user_id, user_name, user_avatar, selected_text, start_offset, end_offset, highlight_color, body, likes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [a.id, a.chapter_id, a.user_id, a.user_name, a.user_avatar, a.selected_text, a.start_offset, a.end_offset, a.highlight_color, a.body, a.likes, a.created_at]);
    }
    for (const c of seedComments) {
      db.run('INSERT OR IGNORE INTO comments (id, annotation_id, parent_id, user_id, user_name, user_avatar, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [c.id, c.annotation_id, c.parent_id, c.user_id, c.user_name, c.user_avatar, c.body, c.created_at]);
    }
    saveDb();
    console.log('Seed data inserted.');
  }

  function queryAll(sql: string, params: any[] = []): any[] {
    const result = db.exec(sql, params);
    if (result.length === 0) return [];
    const columns = result[0].columns;
    return result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
  }

  function queryOne(sql: string, params: any[] = []): any | null {
    const rows = queryAll(sql, params);
    return rows.length > 0 ? rows[0] : null;
  }

  app.get('/api/books', (req, res) => {
    res.json(queryAll('SELECT * FROM books'));
  });

  app.get('/api/chapters/:bookId', (req, res) => {
    res.json(queryAll('SELECT id, title, chapter_order, claimed_by FROM chapters WHERE book_id = ? ORDER BY chapter_order', [req.params.bookId]));
  });

  app.get('/api/chapter/:id', (req, res) => {
    const chapter = queryOne('SELECT * FROM chapters WHERE id = ?', [req.params.id]);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    const annotations = queryAll('SELECT * FROM annotations WHERE chapter_id = ? ORDER BY created_at DESC', [req.params.id]);
    res.json({ ...chapter, annotations });
  });

  app.post('/api/claim-chapter', (req, res) => {
    const { chapterId, userId, userName } = req.body;
    const chapter = queryOne('SELECT claimed_by FROM chapters WHERE id = ?', [chapterId]);
    if (!chapter) return res.status(404).json({ error: 'Chapter not found' });
    if (chapter.claimed_by) return res.status(400).json({ error: 'Chapter already claimed' });
    db.run('UPDATE chapters SET claimed_by = ? WHERE id = ?', [userName, chapterId]);
    saveDb();
    res.json({ success: true, claimed_by: userName });
  });

  app.post('/api/annotations', (req, res) => {
    const { chapterId, userId, userName, userAvatar, selectedText, startOffset, endOffset, highlightColor, body } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO annotations (id, chapter_id, user_id, user_name, user_avatar, selected_text, start_offset, end_offset, highlight_color, body, likes, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?)',
      [id, chapterId, userId, userName, userAvatar || '', selectedText, startOffset, endOffset, highlightColor || '#fff59d', body, now]
    );
    saveDb();
    res.json({
      id, chapter_id: chapterId, user_id: userId, user_name: userName, user_avatar: userAvatar || '',
      selected_text: selectedText, start_offset: startOffset, end_offset: endOffset,
      highlight_color: highlightColor || '#fff59d', body, likes: 0, created_at: now,
    });
  });

  app.post('/api/annotations/like', (req, res) => {
    const { annotationId, userId } = req.body;
    const existing = queryOne('SELECT * FROM likes WHERE annotation_id = ? AND user_id = ?', [annotationId, userId]);
    if (existing) {
      db.run('DELETE FROM likes WHERE id = ?', [existing.id]);
      db.run('UPDATE annotations SET likes = likes - 1 WHERE id = ?', [annotationId]);
      saveDb();
      res.json({ liked: false });
    } else {
      db.run('INSERT INTO likes (id, annotation_id, user_id) VALUES (?, ?, ?)', [uuidv4(), annotationId, userId]);
      db.run('UPDATE annotations SET likes = likes + 1 WHERE id = ?', [annotationId]);
      saveDb();
      res.json({ liked: true });
    }
  });

  app.get('/api/comments/:annotationId', (req, res) => {
    res.json(queryAll('SELECT * FROM comments WHERE annotation_id = ? ORDER BY created_at ASC', [req.params.annotationId]));
  });

  app.post('/api/comments', (req, res) => {
    const { annotationId, parentId, userId, userName, userAvatar, body } = req.body;
    const id = uuidv4();
    const now = new Date().toISOString();
    db.run(
      'INSERT INTO comments (id, annotation_id, parent_id, user_id, user_name, user_avatar, body, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [id, annotationId, parentId || null, userId, userName, userAvatar || '', body, now]
    );
    saveDb();
    res.json({
      id, annotation_id: annotationId, parent_id: parentId || null,
      user_id: userId, user_name: userName, user_avatar: userAvatar || '',
      body, created_at: now,
    });
  });

  const PORT = 3001;
  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
