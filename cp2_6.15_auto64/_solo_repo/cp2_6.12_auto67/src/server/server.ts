import express from 'express';
import cors from 'cors';
import db from './database';
import authRoutes from './routes/auth';
import collectionRoutes from './routes/collections';
import reviewRoutes from './routes/reviews';
import recommendationRoutes from './routes/recommendations';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/collections', collectionRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/recommendations', recommendationRoutes);

const seedDatabase = () => {
  const demoUser = db.prepare('SELECT * FROM users WHERE username = ?').get('demo');
  if (!demoUser) {
    const userId = uuidv4();
    const hashedPassword = bcrypt.hashSync('123456', 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=demo`;
    db.prepare(`
      INSERT INTO users (id, username, password, avatar, created_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(userId, 'demo', hashedPassword, avatar, Date.now());

    const demoCollections = [
      { title: '三体', type: 'book', creator: '刘慈欣', rating: 5, coverUrl: 'https://picsum.photos/seed/book1/320/450' },
      { title: '星际穿越', type: 'movie', creator: '诺兰', rating: 5, coverUrl: 'https://picsum.photos/seed/movie1/320/450' },
      { title: '月之暗面', type: 'music', creator: 'Pink Floyd', rating: 5, coverUrl: 'https://picsum.photos/seed/music1/320/320' },
      { title: '百年孤独', type: 'book', creator: '马尔克斯', rating: 4, coverUrl: 'https://picsum.photos/seed/book2/320/450' },
      { title: '盗梦空间', type: 'movie', creator: '诺兰', rating: 5, coverUrl: 'https://picsum.photos/seed/movie2/320/450' },
      { title: 'OK Computer', type: 'music', creator: 'Radiohead', rating: 5, coverUrl: 'https://picsum.photos/seed/music2/320/320' },
      { title: '活着', type: 'book', creator: '余华', rating: 4, coverUrl: 'https://picsum.photos/seed/book3/320/450' },
      { title: '千与千寻', type: 'movie', creator: '宫崎骏', rating: 5, coverUrl: 'https://picsum.photos/seed/movie3/320/450' },
      { title: 'Abbey Road', type: 'music', creator: 'The Beatles', rating: 4, coverUrl: 'https://picsum.photos/seed/music3/320/320' },
      { title: '围城', type: 'book', creator: '钱钟书', rating: 4, coverUrl: 'https://picsum.photos/seed/book4/320/450' },
      { title: '肖申克的救赎', type: 'movie', creator: '弗兰克·德拉邦特', rating: 5, coverUrl: 'https://picsum.photos/seed/movie4/320/450' },
      { title: 'Dark Side of the Moon', type: 'music', creator: 'Pink Floyd', rating: 5, coverUrl: 'https://picsum.photos/seed/music4/320/320' },
    ];

    demoCollections.forEach((item, index) => {
      const id = uuidv4();
      db.prepare(`
        INSERT INTO collections (id, user_id, title, type, creator, cover_url, rating, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, userId, item.title, item.type, item.creator, item.coverUrl, item.rating, Date.now() - index * 3600000);
    });

    console.log('演示数据已创建，用户名: demo, 密码: 123456');
  }
};

seedDatabase();

app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
});
