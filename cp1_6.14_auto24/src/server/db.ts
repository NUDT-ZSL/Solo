import Datastore from 'nedb-promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbDir = path.join(__dirname, '..', '..', 'data');

export interface User {
  _id?: string;
  username: string;
  password: string;
  avatar: string;
  isAdmin: boolean;
  createdAt: number;
}

export interface Book {
  _id?: string;
  title: string;
  author: string;
  cover: string;
  pages: number;
  rating: number;
  description: string;
  addedAt: number;
}

export interface ReadingStatus {
  _id?: string;
  userId: string;
  bookId: string;
  status: 'unread' | 'reading' | 'read';
  note: string;
  updatedAt: number;
}

export interface Vote {
  _id?: string;
  title: string;
  bookIds: string[];
  createdAt: number;
  endsAt: number;
  closed: boolean;
}

export interface VoteRecord {
  _id?: string;
  voteId: string;
  userId: string;
  bookId: string;
  createdAt: number;
}

export interface Activity {
  _id?: string;
  type: 'complete_book' | 'vote_book' | 'announcement' | 'add_book' | 'new_vote';
  userId: string;
  username: string;
  avatar: string;
  bookId?: string;
  bookTitle?: string;
  content?: string;
  createdAt: number;
}

export interface ReadingLog {
  _id?: string;
  userId: string;
  date: string;
  pages: number;
  minutes: number;
  note: string;
  createdAt: number;
}

const users = Datastore.create({ filename: path.join(dbDir, 'users.db'), autoload: true });
const books = Datastore.create({ filename: path.join(dbDir, 'books.db'), autoload: true });
const readingStatuses = Datastore.create({ filename: path.join(dbDir, 'readingStatuses.db'), autoload: true });
const votes = Datastore.create({ filename: path.join(dbDir, 'votes.db'), autoload: true });
const voteRecords = Datastore.create({ filename: path.join(dbDir, 'voteRecords.db'), autoload: true });
const activities = Datastore.create({ filename: path.join(dbDir, 'activities.db'), autoload: true });
const readingLogs = Datastore.create({ filename: path.join(dbDir, 'readingLogs.db'), autoload: true });

export const db = {
  users,
  books,
  readingStatuses,
  votes,
  voteRecords,
  activities,
  readingLogs,
};

const seedData = async () => {
  const userCount = await users.count({});
  if (userCount === 0) {
    await users.insertMany([
      { username: 'admin', password: '123456', avatar: 'https://i.pravatar.cc/100?img=1', isAdmin: true, createdAt: Date.now() },
      { username: 'alice', password: '123456', avatar: 'https://i.pravatar.cc/100?img=5', isAdmin: false, createdAt: Date.now() },
      { username: 'bob', password: '123456', avatar: 'https://i.pravatar.cc/100?img=12', isAdmin: false, createdAt: Date.now() },
      { username: 'carol', password: '123456', avatar: 'https://i.pravatar.cc/100?img=20', isAdmin: false, createdAt: Date.now() },
    ] as User[]);
  }

  const bookCount = await books.count({});
  if (bookCount === 0) {
    await books.insertMany([
      { title: '百年孤独', author: '加西亚·马尔克斯', cover: 'https://picsum.photos/seed/book1/200/300', pages: 360, rating: 9.3, description: '魔幻现实主义文学的代表作，描写了布恩迪亚家族七代人的传奇故事，以及加勒比海沿岸小镇马孔多的百年兴衰。', addedAt: Date.now() },
      { title: '小王子', author: '安托万·德·圣-埃克苏佩里', cover: 'https://picsum.photos/seed/book2/200/300', pages: 97, rating: 9.0, description: '一部写给大人的童话，通过小王子的星际旅行，探讨了爱、责任与人生的意义。', addedAt: Date.now() },
      { title: '三体', author: '刘慈欣', cover: 'https://picsum.photos/seed/book3/200/300', pages: 302, rating: 9.4, description: '中国科幻文学的里程碑之作，讲述了地球文明与三体文明的宇宙博弈。', addedAt: Date.now() },
      { title: '活着', author: '余华', cover: 'https://picsum.photos/seed/book4/200/300', pages: 191, rating: 9.4, description: '讲述了农村人福贵悲惨的人生遭遇，展现了生命的张力与韧性。', addedAt: Date.now() },
      { title: '围城', author: '钱钟书', cover: 'https://picsum.photos/seed/book5/200/300', pages: 359, rating: 9.0, description: '一部新"儒林外史"，以方鸿渐的生活道路为主线，描写了抗战初期知识分子群相。', addedAt: Date.now() },
      { title: '挪威的森林', author: '村上春树', cover: 'https://picsum.photos/seed/book6/200/300', pages: 384, rating: 8.6, description: '一部感伤的青春恋爱小说，讲述了渡边与直子、绿子之间的情感纠葛。', addedAt: Date.now() },
    ] as Book[]);
  }

  const activityCount = await activities.count({});
  if (activityCount === 0) {
    const allUsers = await users.find<User>({});
    const allBooks = await books.find<Book>({});
    const sampleActivities: Activity[] = [
      { type: 'complete_book', userId: allUsers[1]._id!, username: 'alice', avatar: allUsers[1].avatar, bookId: allBooks[1]._id!, bookTitle: '小王子', createdAt: Date.now() - 3 * 60 * 1000 },
      { type: 'add_book', userId: allUsers[0]._id!, username: 'admin', avatar: allUsers[0].avatar, bookId: allBooks[2]._id!, bookTitle: '三体', createdAt: Date.now() - 30 * 60 * 1000 },
      { type: 'announcement', userId: allUsers[0]._id!, username: 'admin', avatar: allUsers[0].avatar, content: '本周六下午3点将举办线下读书会，请大家准时参加！', createdAt: Date.now() - 2 * 60 * 60 * 1000 },
      { type: 'new_vote', userId: allUsers[0]._id!, username: 'admin', avatar: allUsers[0].avatar, content: '下个月共读投票已开启', createdAt: Date.now() - 5 * 60 * 60 * 1000 },
    ];
    await activities.insertMany(sampleActivities);
  }

  const logCount = await readingLogs.count({});
  if (logCount === 0) {
    const allUsers = await users.find<User>({});
    const logs: ReadingLog[] = [];
    for (let i = 0; i < 30; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      allUsers.forEach((user, idx) => {
        if (Math.random() > 0.3) {
          logs.push({
            userId: user._id!,
            date: dateStr,
            pages: Math.floor(Math.random() * 50) + 10,
            minutes: Math.floor(Math.random() * 90) + 15,
            note: '',
            createdAt: Date.now() - i * 24 * 60 * 60 * 1000,
          });
        }
      });
    }
    await readingLogs.insertMany(logs);
  }
};

seedData().catch(console.error);
