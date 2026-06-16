import express from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  price: number;
  quantity: number;
  status: 'available' | 'borrowed';
  borrowedCount: number;
}

interface Member {
  id: string;
  name: string;
  phone: string;
  creditScore: number;
  currentBorrows: number;
}

interface BorrowRecord {
  id: string;
  bookId: string;
  memberId: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  status: 'borrowed' | 'returned' | 'overdue';
}

const books: Book[] = [
  { id: uuidv4(), isbn: '9787020002207', title: '红楼梦', author: '曹雪芹', publisher: '人民文学出版社', price: 59.8, quantity: 8, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787020008735', title: '西游记', author: '吴承恩', publisher: '人民文学出版社', price: 48.5, quantity: 6, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787020008742', title: '三国演义', author: '罗贯中', publisher: '人民文学出版社', price: 52.0, quantity: 7, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787020008759', title: '水浒传', author: '施耐庵', publisher: '人民文学出版社', price: 46.8, quantity: 5, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787544270878', title: '百年孤独', author: '加西亚·马尔克斯', publisher: '南海出版公司', price: 39.5, quantity: 4, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787532736072', title: '追风筝的人', author: '卡勒德·胡赛尼', publisher: '上海译文出版社', price: 29.0, quantity: 3, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787506356947', title: '活着', author: '余华', publisher: '作家出版社', price: 25.0, quantity: 6, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787544280907', title: '解忧杂货店', author: '东野圭吾', publisher: '南海出版公司', price: 39.5, quantity: 5, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787544253994', title: '白夜行', author: '东野圭吾', publisher: '南海出版公司', price: 39.5, quantity: 4, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787020103256', title: '平凡的世界', author: '路遥', publisher: '人民文学出版社', price: 68.0, quantity: 3, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787530209448', title: '挪威的森林', author: '村上春树', publisher: '北京十月文艺出版社', price: 28.0, quantity: 5, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787544245623', title: '嫌疑人X的献身', author: '东野圭吾', publisher: '南海出版公司', price: 28.0, quantity: 4, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787020042180', title: '围城', author: '钱钟书', publisher: '人民文学出版社', price: 32.0, quantity: 2, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787508635576', title: '人类简史', author: '尤瓦尔·赫拉利', publisher: '中信出版社', price: 68.0, quantity: 4, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787532748686', title: '小王子', author: '圣埃克苏佩里', publisher: '上海译文出版社', price: 22.0, quantity: 10, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787544260046', title: '从你的全世界路过', author: '张嘉佳', publisher: '南海出版公司', price: 36.0, quantity: 6, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787530211211', title: '三体', author: '刘慈欣', publisher: '重庆出版社', price: 23.0, quantity: 8, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787536692930', title: '三体Ⅱ：黑暗森林', author: '刘慈欣', publisher: '重庆出版社', price: 32.0, quantity: 7, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787540439477', title: '三体Ⅲ：死神永生', author: '刘慈欣', publisher: '重庆出版社', price: 38.0, quantity: 1, status: 'available', borrowedCount: 0 },
  { id: uuidv4(), isbn: '9787544291224', title: '云边有个小卖部', author: '张嘉佳', publisher: '南海出版公司', price: 45.0, quantity: 5, status: 'available', borrowedCount: 0 },
];

const members: Member[] = [
  { id: uuidv4(), name: '张三', phone: '13800138001', creditScore: 100, currentBorrows: 0 },
  { id: uuidv4(), name: '李四', phone: '13800138002', creditScore: 95, currentBorrows: 0 },
  { id: uuidv4(), name: '王五', phone: '13800138003', creditScore: 88, currentBorrows: 0 },
  { id: uuidv4(), name: '赵六', phone: '13800138004', creditScore: 76, currentBorrows: 0 },
  { id: uuidv4(), name: '钱七', phone: '13800138005', creditScore: 92, currentBorrows: 0 },
  { id: uuidv4(), name: '孙八', phone: '13800138006', creditScore: 55, currentBorrows: 0 },
  { id: uuidv4(), name: '周九', phone: '13800138007', creditScore: 80, currentBorrows: 0 },
  { id: uuidv4(), name: '吴十', phone: '13800138008', creditScore: 68, currentBorrows: 0 },
  { id: uuidv4(), name: '郑十一', phone: '13800138009', creditScore: 100, currentBorrows: 0 },
  { id: uuidv4(), name: '王十二', phone: '13800138010', creditScore: 45, currentBorrows: 0 },
];

const borrowRecords: BorrowRecord[] = [];

app.get('/api/books', (req, res) => {
  res.json(books);
});

app.get('/api/members', (req, res) => {
  res.json(members);
});

app.get('/api/borrowRecords', (req, res) => {
  res.json(borrowRecords);
});

app.post('/api/borrow', (req, res) => {
  const { bookId, memberId } = req.body;

  const book = books.find(b => b.id === bookId);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }
  if (book.quantity <= 0) {
    return res.status(400).json({ error: '图书库存不足' });
  }

  const member = members.find(m => m.id === memberId);
  if (!member) {
    return res.status(404).json({ error: '会员不存在' });
  }

  const borrowDate = new Date();
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  const record: BorrowRecord = {
    id: uuidv4(),
    bookId,
    memberId,
    borrowDate: borrowDate.toISOString(),
    dueDate: dueDate.toISOString(),
    returnDate: null,
    status: 'borrowed',
  };

  borrowRecords.push(record);
  book.quantity -= 1;
  book.borrowedCount += 1;
  if (book.quantity <= 0) {
    book.status = 'borrowed';
  }
  member.currentBorrows += 1;

  res.json({ success: true, record, book, member });
});

app.post('/api/return', (req, res) => {
  const { recordId } = req.body;

  const record = borrowRecords.find(r => r.id === recordId);
  if (!record) {
    return res.status(404).json({ error: '借阅记录不存在' });
  }
  if (record.status === 'returned') {
    return res.status(400).json({ error: '该图书已归还' });
  }

  const book = books.find(b => b.id === record.bookId);
  const member = members.find(m => m.id === record.memberId);

  if (book) {
    book.quantity += 1;
    if (book.quantity > 0) {
      book.status = 'available';
    }
  }

  if (member) {
    member.currentBorrows -= 1;
    if (member.currentBorrows < 0) member.currentBorrows = 0;
  }

  record.returnDate = new Date().toISOString();
  record.status = 'returned';

  res.json({ success: true, record, book, member });
});

app.post('/api/members', (req, res) => {
  const { name, phone } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: '姓名和电话为必填项' });
  }

  const phoneRegex = /^1[3-9]\d{9}$/;
  if (!phoneRegex.test(phone)) {
    return res.status(400).json({ error: '电话号码格式不正确' });
  }

  const newMember: Member = {
    id: uuidv4(),
    name,
    phone,
    creditScore: 100,
    currentBorrows: 0,
  };

  members.push(newMember);
  res.status(201).json(newMember);
});

app.get('/api/books/:id', (req, res) => {
  const book = books.find(b => b.id === req.params.id);
  if (!book) {
    return res.status(404).json({ error: '图书不存在' });
  }

  const bookRecords = borrowRecords.filter(r => r.bookId === req.params.id);
  res.json({ ...book, borrowHistory: bookRecords });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
