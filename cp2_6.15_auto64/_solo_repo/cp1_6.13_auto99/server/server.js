import express from 'express';
import Datastore from 'nedb-promises';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

const dbDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });

const booksDB = Datastore.create({ filename: path.join(dbDir, 'books.db'), autoload: true });
const cartDB = Datastore.create({ filename: path.join(dbDir, 'cart.db'), autoload: true });
const shareDB = Datastore.create({ filename: path.join(dbDir, 'share.db'), autoload: true });

const seedBooks = [
  { id: '1', title: '三体', author: '刘慈欣', category: '科幻', price: 68.00, isbn: '9787536692930', publishDate: '2008-01-01', pages: 302, stock: 25, cover: 'https://picsum.photos/seed/santi/400/560', description: '文化大革命如火如荼进行的同时，军方探寻外星文明的绝秘计划"红岸工程"取得了突破性进展。', authorIntro: '刘慈欣，中国科幻小说代表作家，《三体》三部曲作者，亚洲首位雨果奖得主。' },
  { id: '2', title: '球状闪电', author: '刘慈欣', category: '科幻', price: 45.00, isbn: '9787536459731', publishDate: '2005-06-01', pages: 281, stock: 18, cover: 'https://picsum.photos/seed/qiuzhuang/400/560', description: '一个离奇的雨夜，球状闪电像一只暗红色的巨眼，将少年的父母在瞬间化为灰烬。', authorIntro: '刘慈欣，中国科幻小说代表作家。' },
  { id: '3', title: '活着', author: '余华', category: '文学', price: 35.00, isbn: '9787506365437', publishDate: '2012-08-01', pages: 191, stock: 42, cover: 'https://picsum.photos/seed/huozhe/400/560', description: '讲述了农村人福贵悲惨的人生遭遇。', authorIntro: '余华，1960年4月3日生于浙江杭州，当代作家。' },
  { id: '4', title: '百年孤独', author: '加西亚·马尔克斯', category: '文学', price: 55.00, isbn: '9787544253994', publishDate: '2011-06-01', pages: 360, stock: 30, cover: 'https://picsum.photos/seed/bngd/400/560', description: '布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰。', authorIntro: '加夫列尔·加西亚·马尔克斯，哥伦比亚作家，1982年诺贝尔文学奖得主。' },
  { id: '5', title: '明朝那些事儿', author: '当年明月', category: '历史', price: 328.00, isbn: '9787213048425', publishDate: '2011-05-01', pages: 2160, stock: 15, cover: 'https://picsum.photos/seed/mc/400/560', description: '讲述从1344年到1644年这三百年间关于明朝的一些事情。', authorIntro: '当年明月，本名石悦，广东顺德海关公务员。' },
  { id: '6', title: '人类简史', author: '尤瓦尔·赫拉利', category: '历史', price: 68.00, isbn: '9787508647357', publishDate: '2014-11-01', pages: 440, stock: 35, cover: 'https://picsum.photos/seed/rljs/400/560', description: '从十万年前有生命迹象开始到21世纪资本、科技交织的人类发展史。', authorIntro: '尤瓦尔·赫拉利，牛津大学历史学博士，耶路撒冷希伯来大学历史系教授。' },
  { id: '7', title: '流浪地球', author: '刘慈欣', category: '科幻', price: 38.00, isbn: '9787535265227', publishDate: '2016-06-01', pages: 240, stock: 50, cover: 'https://picsum.photos/seed/lldq/400/560', description: '科学家们发现太阳将膨胀为一颗红巨星，期间地球表面上的一切都将被毁灭。', authorIntro: '刘慈欣，中国科幻小说代表作家。' },
  { id: '8', title: '红楼梦', author: '曹雪芹', category: '文学', price: 59.80, isbn: '9787020002207', publishDate: '2008-07-01', pages: 1606, stock: 22, cover: 'https://picsum.photos/seed/hlm/400/560', description: '以贾宝玉、林黛玉、薛宝钗的爱情婚姻悲剧为主线，展现了封建社会的全景图。', authorIntro: '曹雪芹，清代小说家，名沾，字梦阮，号雪芹。' },
  { id: '9', title: '万历十五年', author: '黄仁宇', category: '历史', price: 39.00, isbn: '9787101054491', publishDate: '2006-08-01', pages: 288, stock: 28, cover: 'https://picsum.photos/seed/wl15/400/560', description: '1587年，是为万历十五年，表面上似乎是四海升平，无事可记，实际上我们的大明帝国却已经走到了它发展的尽头。', authorIntro: '黄仁宇，1918年生于湖南长沙，1979年执教于美国纽约州立大学。' },
  { id: '10', title: '平凡的世界', author: '路遥', category: '文学', price: 128.00, isbn: '9787530212004', publishDate: '2012-03-01', pages: 1628, stock: 20, cover: 'https://picsum.photos/seed/pfdsj/400/560', description: '以孙少安和孙少平两兄弟为中心，通过复杂的矛盾纠葛，刻画了当时社会各阶层众多普通人的形象。', authorIntro: '路遥，原名王卫国，陕西清涧人。' },
  { id: '11', title: '2001太空漫游', author: '阿瑟·克拉克', category: '科幻', price: 42.00, isbn: '9787536452992', publishDate: '2007-11-01', pages: 275, stock: 16, cover: 'https://picsum.photos/seed/2001space/400/560', description: '一块神秘的黑色石板，穿越时空，连接起人类的过去与未来。', authorIntro: '阿瑟·克拉克，英国科幻小说家。' },
  { id: '12', title: '挪威的森林', author: '村上春树', category: '文学', price: 36.00, isbn: '9787532747177', publishDate: '2007-07-01', pages: 384, stock: 38, cover: 'https://picsum.photos/seed/nwsl/400/560', description: '以第一人称视角讲述主角渡边的两段爱情故事。', authorIntro: '村上春树，日本现代小说家。' },
  { id: '13', title: '史记', author: '司马迁', category: '历史', price: 98.00, isbn: '9787101057645', publishDate: '2010-01-01', pages: 2480, stock: 10, cover: 'https://picsum.photos/seed/shiji/400/560', description: '中国第一部纪传体通史，记载了上自黄帝下至汉武帝共3000多年的历史。', authorIntro: '司马迁，字子长，西汉夏阳人，中国古代伟大的史学家、思想家、文学家。' },
  { id: '14', title: '沙丘', author: '弗兰克·赫伯特', category: '科幻', price: 78.00, isbn: '9787539956268', publishDate: '2012-05-01', pages: 620, stock: 12, cover: 'https://picsum.photos/seed/shaqiu/400/560', description: '在遥远的未来，一颗名叫厄拉科斯的沙漠行星成为各方势力争夺的焦点。', authorIntro: '弗兰克·赫伯特，美国科幻小说家。' },
  { id: '15', title: '追风筝的人', author: '卡勒德·胡赛尼', category: '文学', price: 45.00, isbn: '9787208061644', publishDate: '2006-05-01', pages: 362, stock: 45, cover: 'https://picsum.photos/seed/zkfzdr/400/560', description: '关于友谊、背叛、救赎的故事，讲述了12岁的阿富汗富家少爷阿米尔与仆人哈桑之间的故事。', authorIntro: '卡勒德·胡赛尼，1965年生于阿富汗喀布尔市，后随父亲迁往美国。' },
  { id: '16', title: '丝绸之路', author: '彼得·弗兰科潘', category: '历史', price: 78.00, isbn: '9787308161459', publishDate: '2016-12-01', pages: 640, stock: 24, cover: 'https://picsum.photos/seed/scczl/400/560', description: '一部全新的世界史，让你像看侦探小说一样上瘾。', authorIntro: '彼得·弗兰科潘，牛津大学伍斯特学院高级研究员。' },
  { id: '17', title: '基地', author: '艾萨克·阿西莫夫', category: '科幻', price: 45.00, isbn: '9787539949802', publishDate: '2012-03-01', pages: 278, stock: 19, cover: 'https://picsum.photos/seed/jidi/400/560', description: '心理史学预言了银河帝国的覆灭，一场关于人类文明存续的宏大计划就此展开。', authorIntro: '艾萨克·阿西莫夫，美国著名科幻作家。' },
  { id: '18', title: '傲慢与偏见', author: '简·奥斯汀', category: '文学', price: 32.00, isbn: '9787020031184', publishDate: '2003-01-01', pages: 406, stock: 30, cover: 'https://picsum.photos/seed/amypj/400/560', description: '班纳特一家五个女儿的爱情与婚姻故事。', authorIntro: '简·奥斯汀，英国著名女性小说家。' },
  { id: '19', title: '枪炮、病菌与钢铁', author: '贾雷德·戴蒙德', category: '历史', price: 72.00, isbn: '9787208061354', publishDate: '2006-04-01', pages: 479, stock: 17, cover: 'https://picsum.photos/seed/qpbjgt/400/560', description: '探讨了为什么是欧洲人征服了美洲，而不是相反。', authorIntro: '贾雷德·戴蒙德，美国加利福尼亚大学洛杉矶分校医学院生理学教授。' },
  { id: '20', title: '银河帝国1：基地', author: '艾萨克·阿西莫夫', category: '科幻', price: 35.00, isbn: '9787539949826', publishDate: '2012-06-01', pages: 293, stock: 14, cover: 'https://picsum.photos/seed/yhdg/400/560', description: '人类蜗居在银河系的一个小角落——太阳系，在围绕太阳旋转的第三颗行星上生活。', authorIntro: '艾萨克·阿西莫夫，美国著名科幻作家。' }
];

async function initDB() {
  try {
    const count = await booksDB.count({});
    if (count === 0) {
      console.log('正在初始化书籍数据库...');
      await booksDB.insertMany(seedBooks);
      console.log(`✅ 已插入 ${seedBooks.length} 本种子书籍数据`);
    } else {
      console.log(`📖 数据库已有 ${count} 本书，跳过初始化`);
    }
  } catch (err) {
    console.error('❌ 数据库初始化失败:', err.message);
  }
}

initDB();

function getCart(userId) {
  return cartDB.findOne({ userId });
}

async function ensureCart(userId) {
  let cart = await cartDB.findOne({ userId });
  if (!cart) {
    cart = { userId, items: [], createdAt: new Date(), updatedAt: new Date() };
    await cartDB.insert(cart);
  }
  return cart;
}

app.get('/api/books', async (req, res) => {
  try {
    const books = await booksDB.find({});
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await booksDB.findOne({ id: req.params.id });
    if (!book) return res.status(404).json({ error: '书籍不存在' });
    res.json(book);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/books/category/:category', async (req, res) => {
  try {
    const books = await booksDB.find({ category: req.params.category });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/cart/:userId', async (req, res) => {
  try {
    const cart = await getCart(req.params.userId);
    res.json(cart ? cart.items : []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart/add', async (req, res) => {
  try {
    const { userId, bookId, title, author, price, cover } = req.body;
    const cart = await ensureCart(userId);
    const idx = cart.items.findIndex(i => i.id === bookId);
    if (idx >= 0) {
      cart.items[idx].quantity += 1;
    } else {
      cart.items.push({ id: bookId, title, author, price, cover, quantity: 1 });
    }
    await cartDB.update({ userId }, { $set: { items: cart.items, updatedAt: new Date() } });
    res.json({ success: true, items: cart.items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/cart/:userId/:bookId', async (req, res) => {
  try {
    const { userId, bookId } = req.params;
    const cart = await getCart(userId);
    if (!cart) return res.json({ success: true, items: [] });
    const items = cart.items.filter(i => i.id !== bookId);
    await cartDB.update({ userId }, { $set: { items, updatedAt: new Date() } });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/cart/:userId/:bookId', async (req, res) => {
  try {
    const { userId, bookId } = req.params;
    const { quantity } = req.body;
    const cart = await getCart(userId);
    if (!cart) return res.json({ success: true, items: [] });
    let items;
    if (quantity <= 0) {
      items = cart.items.filter(i => i.id !== bookId);
    } else {
      items = cart.items.map(i => i.id === bookId ? { ...i, quantity } : i);
    }
    await cartDB.update({ userId }, { $set: { items, updatedAt: new Date() } });
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cart', async (req, res) => {
  try {
    const { userId, items } = req.body;
    const existing = await cartDB.findOne({ userId });
    if (existing) {
      await cartDB.update({ userId }, { $set: { items, updatedAt: new Date() } });
    } else {
      await cartDB.insert({ userId, items, createdAt: new Date(), updatedAt: new Date() });
    }
    res.json({ success: true, items });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/share', async (req, res) => {
  try {
    const { userId, items, name } = req.body;
    const shareId = uuidv4();
    const booksData = [];
    for (const item of items) {
      const book = await booksDB.findOne({ id: item.id });
      if (book) {
        booksData.push({
          id: book.id,
          title: book.title,
          author: book.author,
          price: book.price,
          cover: book.cover,
          quantity: item.quantity
        });
      }
    }
    const totalPrice = booksData.reduce((sum, b) => sum + b.price * b.quantity, 0);
    const totalCount = booksData.reduce((sum, b) => sum + b.quantity, 0);
    const share = {
      id: shareId,
      name: name || '我的书单',
      userId,
      items: booksData,
      totalPrice,
      totalCount,
      createdAt: new Date().toISOString()
    };
    await shareDB.insert(share);
    res.json({
      id: shareId,
      name: share.name,
      items: booksData,
      totalPrice,
      totalCount,
      createdAt: share.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/share/:id', async (req, res) => {
  try {
    const share = await shareDB.findOne({ id: req.params.id });
    if (!share) return res.status(404).json({ error: '分享链接不存在或已过期' });
    res.json({
      id: share.id,
      name: share.name,
      items: share.items,
      totalPrice: share.totalPrice,
      totalCount: share.totalCount || share.items.reduce((s, i) => s + i.quantity, 0),
      createdAt: share.createdAt
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 BookShelf 后端服务已启动: http://localhost:${PORT}`);
  console.log(`📖 API 地址: http://localhost:${PORT}/api/books`);
});
