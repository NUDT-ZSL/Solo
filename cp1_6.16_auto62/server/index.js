import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

const categories = [
  '文学小说',
  '历史传记',
  '科学技术',
  '艺术设计',
  '商业管理',
  '心理学',
  '哲学思想',
  '生活方式',
  '儿童读物'
];

const mockBooks = [
  {
    id: uuidv4(),
    title: '百年孤独',
    author: '加西亚·马尔克斯',
    publisher: '南海出版公司',
    price: 55.0,
    category: '文学小说',
    stock: 8,
    description: '魔幻现实主义文学的代表作，讲述布恩迪亚家族七代人的传奇故事。'
  },
  {
    id: uuidv4(),
    title: '人类简史',
    author: '尤瓦尔·赫拉利',
    publisher: '中信出版社',
    price: 68.0,
    category: '历史传记',
    stock: 5,
    description: '从认知革命、农业革命到科学革命，讲述人类如何登上食物链顶端。'
  },
  {
    id: uuidv4(),
    title: '三体',
    author: '刘慈欣',
    publisher: '重庆出版社',
    price: 93.0,
    category: '科学技术',
    stock: 12,
    description: '中国科幻文学的里程碑之作，展现宇宙级别的文明冲突。'
  },
  {
    id: uuidv4(),
    title: '设计心理学',
    author: '唐纳德·诺曼',
    publisher: '中信出版社',
    price: 58.0,
    category: '艺术设计',
    stock: 3,
    description: '揭示日常物品设计背后的心理学原理，以人为本的设计理念。'
  },
  {
    id: uuidv4(),
    title: '穷查理宝典',
    author: '彼得·考夫曼',
    publisher: '中信出版社',
    price: 108.0,
    category: '商业管理',
    stock: 6,
    description: '查理·芒格的智慧箴言录，多元思维模型的实用指南。'
  },
  {
    id: uuidv4(),
    title: '思考，快与慢',
    author: '丹尼尔·卡尼曼',
    publisher: '中信出版社',
    price: 69.0,
    category: '心理学',
    stock: 2,
    description: '诺贝尔经济学奖得主的思考力作，揭示人类思维的两种模式。'
  },
  {
    id: uuidv4(),
    title: '苏菲的世界',
    author: '乔斯坦·贾德',
    publisher: '作家出版社',
    price: 45.0,
    category: '哲学思想',
    stock: 7,
    description: '一本关于哲学史的小说，带你走进西方哲学的殿堂。'
  },
  {
    id: uuidv4(),
    title: '中国食谱',
    author: '杨步伟',
    publisher: '生活·读书·新知三联书店',
    price: 49.0,
    category: '生活方式',
    stock: 0,
    description: '经典的中国美食书籍，教你制作地道的中国菜肴。'
  },
  {
    id: uuidv4(),
    title: '小王子',
    author: '安托万·德·圣-埃克苏佩里',
    publisher: '人民文学出版社',
    price: 32.0,
    category: '儿童读物',
    stock: 15,
    description: '一本写给大人的童话，关于爱与责任的永恒寓言。'
  },
  {
    id: uuidv4(),
    title: '活着',
    author: '余华',
    publisher: '作家出版社',
    price: 35.0,
    category: '文学小说',
    stock: 10,
    description: '讲述福贵坎坷一生的故事，展现生命的韧性与力量。'
  },
  {
    id: uuidv4(),
    title: '明朝那些事儿',
    author: '当年明月',
    publisher: '浙江人民出版社',
    price: 298.0,
    category: '历史传记',
    stock: 4,
    description: '用通俗的语言讲述明朝三百年历史，让历史变得生动有趣。'
  },
  {
    id: uuidv4(),
    title: '时间简史',
    author: '史蒂芬·霍金',
    publisher: '湖南科学技术出版社',
    price: 45.0,
    category: '科学技术',
    stock: 1,
    description: '探索时间和空间的奥秘，科普宇宙学的经典之作。'
  }
];

let books = [...mockBooks];

let recommendations = [
  {
    id: uuidv4(),
    bookTitle: '百年孤独',
    recommenderName: '书香满溢',
    reason: '这本书的叙事手法太震撼了，马尔克斯用魔幻现实主义的笔法写出了整个拉丁美洲的历史缩影。布恩迪亚家族的兴衰让人唏嘘，每一个人物都栩栩如生。强烈推荐给所有喜欢文学的朋友！',
    submittedAt: new Date(Date.now() - 86400000).toISOString()
  },
  {
    id: uuidv4(),
    bookTitle: '三体',
    recommenderName: '星空漫步者',
    reason: '中国科幻的巅峰之作！刘慈欣的想象力太惊人了，黑暗森林法则让人细思极恐。读完之后对宇宙、对人类文明有了全新的认识。',
    submittedAt: new Date(Date.now() - 172800000).toISOString()
  },
  {
    id: uuidv4(),
    bookTitle: '小王子',
    recommenderName: '童心未泯',
    reason: '虽然是童话，但每次读都有不同的感悟。"真正重要的东西，眼睛是看不见的。"这句话让我思考了很久。适合所有年龄段的读者。',
    submittedAt: new Date(Date.now() - 259200000).toISOString()
  }
];

app.get('/api/books', (req, res) => {
  const delay = Math.floor(Math.random() * 200) + 300;
  setTimeout(() => {
    res.json(books);
  }, delay);
});

app.get('/api/books/search', (req, res) => {
  const q = (req.query.q || '').toString().toLowerCase();
  const delay = Math.floor(Math.random() * 200) + 300;

  setTimeout(() => {
    if (!q) {
      return res.json([]);
    }

    const results = books.filter(
      (book) =>
        book.title.toLowerCase().includes(q) ||
        book.author.toLowerCase().includes(q) ||
        book.publisher.toLowerCase().includes(q)
    );

    if (results.length === 0 && q.length >= 3) {
      const simulatedBook = {
        id: uuidv4(),
        title: q.charAt(0).toUpperCase() + q.slice(1),
        author: '未知作者',
        publisher: '模拟出版社',
        price: Math.floor(Math.random() * 50) + 20,
        category: categories[Math.floor(Math.random() * categories.length)],
        stock: 0,
        description: '这是一本通过搜索模拟生成的书籍。'
      };
      return res.json([simulatedBook]);
    }

    res.json(results.slice(0, 10));
  }, delay);
});

app.post('/api/books', (req, res) => {
  const { title, author, publisher, price, category, stock, description } = req.body;

  if (!title || !author) {
    return res.status(400).json({ error: '书名和作者不能为空' });
  }

  const newBook = {
    id: uuidv4(),
    title,
    author,
    publisher: publisher || '未知出版社',
    price: price || 0,
    category: category || '未分类',
    stock: stock || 0,
    description: description || '暂无描述'
  };

  books.push(newBook);
  res.status(201).json(newBook);
});

app.get('/api/recommendations', (req, res) => {
  const delay = Math.floor(Math.random() * 200) + 300;
  setTimeout(() => {
    res.json(recommendations);
  }, delay);
});

app.post('/api/recommendations', (req, res) => {
  const { bookTitle, recommenderName, reason } = req.body;

  if (!bookTitle || !recommenderName || !reason) {
    return res.status(400).json({ error: '请填写完整的推荐信息' });
  }

  const newRecommendation = {
    id: uuidv4(),
    bookTitle,
    recommenderName,
    reason,
    submittedAt: new Date().toISOString()
  };

  recommendations.unshift(newRecommendation);
  recommendations = recommendations.slice(0, 100);
  res.status(201).json(newRecommendation);
});

app.get('/api/layout-recommendation', (req, res) => {
  const delay = Math.floor(Math.random() * 200) + 300;

  setTimeout(() => {
    const categoryRecommendCount = {};
    recommendations.forEach((rec) => {
      const book = books.find((b) => b.title === rec.bookTitle);
      if (book) {
        categoryRecommendCount[book.category] = (categoryRecommendCount[book.category] || 0) + 1;
      }
    });

    const categoryStockCount = {};
    books.forEach((book) => {
      categoryStockCount[book.category] = (categoryStockCount[book.category] || 0) + book.stock;
    });

    const sortedByRecommendations = Object.entries(categoryRecommendCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    const sortedByStock = Object.entries(categoryStockCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([category]) => category);

    const selectedCategories = [...new Set([...sortedByRecommendations, ...sortedByStock])].slice(0, 9);

    while (selectedCategories.length < 9) {
      const unusedCategory = categories.find((c) => !selectedCategories.includes(c));
      if (unusedCategory) {
        selectedCategories.push(unusedCategory);
      } else {
        break;
      }
    }

    const layout = selectedCategories.slice(0, 9).map((category) => {
      const categoryBooks = books.filter((b) => b.category === category);
      return {
        category,
        bookCount: categoryBooks.length,
        books: categoryBooks
      };
    });

    res.json(layout);
  }, delay);
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
