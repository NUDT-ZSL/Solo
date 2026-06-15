import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import initSqlJs, { Database } from 'sql.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import http from 'http';
import { Server } from 'socket.io';
import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const JWT_SECRET = 'your-secret-key-change-in-production';
const PORT = 3001;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(bodyParser.json());

let db: Database;
const dbPath = path.join(__dirname, '../../data.db');

const saveDatabase = () => {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
};

const initDatabase = async () => {
  const SQL = await initSqlJs();

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS timelines (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      title TEXT NOT NULL,
      themeColor TEXT NOT NULL,
      shareHash TEXT UNIQUE NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      timelineId TEXT NOT NULL,
      date TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      coverImage TEXT,
      sortOrder INTEGER NOT NULL DEFAULT 0,
      likes INTEGER NOT NULL DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (timelineId) REFERENCES timelines(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id TEXT PRIMARY KEY,
      eventId TEXT NOT NULL,
      nickname TEXT NOT NULL,
      content TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (eventId) REFERENCES events(id) ON DELETE CASCADE
    );
  `);

  saveDatabase();
};

const query = (sql: string, params: any[] = []): any[] => {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};

const run = (sql: string, params: any[] = []) => {
  db.run(sql, params);
  saveDatabase();
};

const authenticate = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: '未授权' });
  }

  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'token无效' });
  }
};

app.post('/api/auth/register', (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: '请填写所有字段' });
    }

    const existingUser = query('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: '邮箱已被注册' });
    }

    const hashedPassword = bcrypt.hashSync(password, 10);
    const id = uuidv4();

    run(
      'INSERT INTO users (id, username, email, password) VALUES (?, ?, ?, ?)',
      [id, username, email, hashedPassword]
    );

    const user = { id, username, email };
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: '30d' });

    res.json({ user, token });
  } catch (err) {
    console.error('注册错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: '请填写邮箱和密码' });
    }

    const users = query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(400).json({ message: '邮箱或密码错误' });
    }

    const user = users[0];
    const validPassword = bcrypt.compareSync(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: '邮箱或密码错误' });
    }

    const userData = { id: user.id, username: user.username, email: user.email };
    const token = jwt.sign(userData, JWT_SECRET, { expiresIn: '30d' });

    res.json({ user: userData, token });
  } catch (err) {
    console.error('登录错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.get('/api/timelines', authenticate, (req, res) => {
  try {
    const userId = (req as any).user.id;
    const timelines = query(
      'SELECT * FROM timelines WHERE userId = ? ORDER BY updatedAt DESC',
      [userId]
    );
    res.json(timelines);
  } catch (err) {
    console.error('获取时间线错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.get('/api/timelines/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const timelines = query(
      'SELECT * FROM timelines WHERE id = ? AND userId = ?',
      [id, userId]
    );

    if (timelines.length === 0) {
      return res.status(404).json({ message: '时间线不存在' });
    }

    res.json(timelines[0]);
  } catch (err) {
    console.error('获取时间线错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.post('/api/timelines', authenticate, (req, res) => {
  try {
    const userId = (req as any).user.id;
    const { title, themeColor } = req.body;

    if (!title || !themeColor) {
      return res.status(400).json({ message: '请填写标题和主题色' });
    }

    const id = uuidv4();
    const shareHash = uuidv4().replace(/-/g, '').slice(0, 12);

    run(
      'INSERT INTO timelines (id, userId, title, themeColor, shareHash) VALUES (?, ?, ?, ?, ?)',
      [id, userId, title, themeColor, shareHash]
    );

    const timelines = query('SELECT * FROM timelines WHERE id = ?', [id]);
    res.status(201).json(timelines[0]);
  } catch (err) {
    console.error('创建时间线错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.put('/api/timelines/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { title, themeColor } = req.body;

    const existing = query(
      'SELECT * FROM timelines WHERE id = ? AND userId = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: '时间线不存在' });
    }

    const current = existing[0];
    const newTitle = title || current.title;
    const newThemeColor = themeColor || current.themeColor;

    run(
      'UPDATE timelines SET title = ?, themeColor = ?, updatedAt = CURRENT_TIMESTAMP WHERE id = ?',
      [newTitle, newThemeColor, id]
    );

    const timelines = query('SELECT * FROM timelines WHERE id = ?', [id]);
    res.json(timelines[0]);
  } catch (err) {
    console.error('更新时间线错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.delete('/api/timelines/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const existing = query(
      'SELECT * FROM timelines WHERE id = ? AND userId = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ message: '时间线不存在' });
    }

    run('DELETE FROM comments WHERE eventId IN (SELECT id FROM events WHERE timelineId = ?)', [id]);
    run('DELETE FROM events WHERE timelineId = ?', [id]);
    run('DELETE FROM timelines WHERE id = ?', [id]);

    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除时间线错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.get('/api/timelines/:id/events', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const timeline = query(
      'SELECT id FROM timelines WHERE id = ? AND userId = ?',
      [id, userId]
    );

    if (timeline.length === 0) {
      return res.status(404).json({ message: '时间线不存在' });
    }

    const events = query(
      'SELECT * FROM events WHERE timelineId = ? ORDER BY sortOrder ASC, date ASC',
      [id]
    );

    res.json(events);
  } catch (err) {
    console.error('获取事件错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.post('/api/timelines/:id/events', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { date, title, description, coverImage, sortOrder } = req.body;

    const timeline = query(
      'SELECT id FROM timelines WHERE id = ? AND userId = ?',
      [id, userId]
    );

    if (timeline.length === 0) {
      return res.status(404).json({ message: '时间线不存在' });
    }

    if (!date || !title) {
      return res.status(400).json({ message: '请填写日期和标题' });
    }

    const eventId = uuidv4();
    const order = sortOrder !== undefined ? sortOrder : 0;

    run(
      'INSERT INTO events (id, timelineId, date, title, description, coverImage, sortOrder) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [eventId, id, date, title, description || '', coverImage || null, order]
    );

    const events = query('SELECT * FROM events WHERE id = ?', [eventId]);
    res.status(201).json(events[0]);
  } catch (err) {
    console.error('创建事件错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.put('/api/events/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;
    const { date, title, description, coverImage, sortOrder } = req.body;

    const events = query(`
      SELECT e.* FROM events e
      JOIN timelines t ON e.timelineId = t.id
      WHERE e.id = ? AND t.userId = ?
    `, [id, userId]);

    if (events.length === 0) {
      return res.status(404).json({ message: '事件不存在' });
    }

    const current = events[0];
    const newDate = date !== undefined ? date : current.date;
    const newTitle = title !== undefined ? title : current.title;
    const newDescription = description !== undefined ? description : current.description;
    const newCoverImage = coverImage !== undefined ? coverImage : current.coverImage;
    const newSortOrder = sortOrder !== undefined ? sortOrder : current.sortOrder;

    run(`
      UPDATE events SET
        date = ?,
        title = ?,
        description = ?,
        coverImage = ?,
        sortOrder = ?
      WHERE id = ?
    `, [newDate, newTitle, newDescription, newCoverImage, newSortOrder, id]);

    const updatedEvents = query('SELECT * FROM events WHERE id = ?', [id]);
    res.json(updatedEvents[0]);
  } catch (err) {
    console.error('更新事件错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.delete('/api/events/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const userId = (req as any).user.id;

    const events = query(`
      SELECT e.id FROM events e
      JOIN timelines t ON e.timelineId = t.id
      WHERE e.id = ? AND t.userId = ?
    `, [id, userId]);

    if (events.length === 0) {
      return res.status(404).json({ message: '事件不存在' });
    }

    run('DELETE FROM comments WHERE eventId = ?', [id]);
    run('DELETE FROM events WHERE id = ?', [id]);
    res.json({ message: '删除成功' });
  } catch (err) {
    console.error('删除事件错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.post('/api/events/:id/like', (req, res) => {
  try {
    const { id } = req.params;

    const events = query('SELECT * FROM events WHERE id = ?', [id]);
    if (events.length === 0) {
      return res.status(404).json({ message: '事件不存在' });
    }

    const event = events[0];
    const newLikes = event.likes + 1;
    run('UPDATE events SET likes = ? WHERE id = ?', [newLikes, id]);

    const timelines = query(
      'SELECT timelineId FROM events WHERE id = ?',
      [id]
    );

    if (timelines.length > 0) {
      io.to(`timeline_${timelines[0].timelineId}`).emit('likeUpdate', {
        eventId: id,
        likes: newLikes
      });
    }

    res.json({ likes: newLikes });
  } catch (err) {
    console.error('点赞错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.get('/api/events/:id/comments', (req, res) => {
  try {
    const { id } = req.params;

    const events = query('SELECT id FROM events WHERE id = ?', [id]);
    if (events.length === 0) {
      return res.status(404).json({ message: '事件不存在' });
    }

    const comments = query(
      'SELECT * FROM comments WHERE eventId = ? ORDER BY createdAt ASC',
      [id]
    );

    res.json(comments);
  } catch (err) {
    console.error('获取评论错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.post('/api/events/:id/comments', (req, res) => {
  try {
    const { id } = req.params;
    const { nickname, content } = req.body;

    if (!nickname || !content) {
      return res.status(400).json({ message: '请填写昵称和评论内容' });
    }

    if (content.length > 150) {
      return res.status(400).json({ message: '评论不能超过150字' });
    }

    const events = query('SELECT * FROM events WHERE id = ?', [id]);
    if (events.length === 0) {
      return res.status(404).json({ message: '事件不存在' });
    }

    const commentId = uuidv4();
    run(
      'INSERT INTO comments (id, eventId, nickname, content) VALUES (?, ?, ?, ?)',
      [commentId, id, nickname.trim(), content.trim()]
    );

    const comments = query('SELECT * FROM comments WHERE id = ?', [commentId]);

    const timelines = query(
      'SELECT timelineId FROM events WHERE id = ?',
      [id]
    );

    if (timelines.length > 0) {
      io.to(`timeline_${timelines[0].timelineId}`).emit('commentUpdate', {
        eventId: id
      });
    }

    res.status(201).json(comments[0]);
  } catch (err) {
    console.error('添加评论错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.get('/api/share/:hash', (req, res) => {
  try {
    const { hash } = req.params;

    const timelines = query(
      'SELECT * FROM timelines WHERE shareHash = ?',
      [hash]
    );

    if (timelines.length === 0) {
      return res.status(404).json({ message: '时间线不存在' });
    }

    const timeline = timelines[0];
    const events = query(
      'SELECT * FROM events WHERE timelineId = ? ORDER BY sortOrder ASC, date ASC',
      [timeline.id]
    );

    res.json({ timeline, events });
  } catch (err) {
    console.error('获取分享时间线错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

app.get('/api/download/:id', (req, res) => {
  try {
    const { id } = req.params;

    let timeline: any = null;
    let events: any[] = [];

    if (id.length <= 12) {
      const timelines = query('SELECT * FROM timelines WHERE shareHash = ?', [id]);
      if (timelines.length > 0) {
        timeline = timelines[0];
      }
    } else {
      const timelines = query('SELECT * FROM timelines WHERE id = ?', [id]);
      if (timelines.length > 0) {
        timeline = timelines[0];
      }
    }

    if (!timeline) {
      return res.status(404).json({ message: '时间线不存在' });
    }

    events = query(
      'SELECT * FROM events WHERE timelineId = ? ORDER BY sortOrder ASC, date ASC',
      [timeline.id]
    );

    const doc = new PDFDocument({
      size: 'A4',
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    const buffers: Buffer[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
      const pdfData = Buffer.concat(buffers);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${encodeURIComponent(timeline.title)}.pdf"`
      );
      res.setHeader('Content-Length', pdfData.length);
      res.send(pdfData);
    });

    doc.fontSize(24).fillColor(timeline.themeColor || '#3b82f6').text(timeline.title, {
      align: 'center'
    });
    doc.moveDown(1);
    doc.fontSize(12).fillColor('#888').text(`共 ${events.length} 个事件`, {
      align: 'center'
    });
    doc.moveDown(2);

    const pageWidth = doc.page.width - 100;
    const centerX = pageWidth / 2 + 50;

    events.forEach((event, index) => {
      const yPos = doc.y;

      doc.strokeColor(timeline.themeColor || '#3b82f6')
        .lineWidth(2)
        .moveTo(centerX, yPos - 5)
        .lineTo(centerX, yPos + 30)
        .stroke();

      doc.fillColor(timeline.themeColor || '#3b82f6')
        .circle(centerX, yPos + 12, 5)
        .fill();

      const isLeft = index % 2 === 0;
      const cardWidth = pageWidth * 0.42;
      const cardX = isLeft ? 50 : centerX + 15;
      const cardY = yPos;

      doc.fillColor('#f8f9fa')
        .roundedRect(cardX, cardY, cardWidth, 100, 8)
        .fill();

      doc.fillColor(timeline.themeColor || '#3b82f6')
        .fontSize(10)
        .text(event.date, cardX + 12, cardY + 10, { width: cardWidth - 24 });

      doc.fillColor('#333')
        .fontSize(14)
        .text(event.title, cardX + 12, cardY + 28, { width: cardWidth - 24 });

      doc.fillColor('#666')
        .fontSize(10)
        .text(event.description.substring(0, 100) + (event.description.length > 100 ? '...' : ''),
          cardX + 12, cardY + 50, { width: cardWidth - 24, height: 40 });

      doc.moveDown(4);

      if (doc.y > doc.page.height - 120 && index < events.length - 1) {
        doc.addPage();
      }
    });

    doc.end();
  } catch (err) {
    console.error('生成PDF错误:', err);
    res.status(500).json({ message: '服务器错误' });
  }
});

io.on('connection', (socket) => {
  console.log('用户连接:', socket.id);

  socket.on('joinTimeline', (timelineId: string) => {
    socket.join(`timeline_${timelineId}`);
    console.log(`用户加入时间线: ${timelineId}`);
  });

  socket.on('leaveTimeline', (timelineId: string) => {
    socket.leave(`timeline_${timelineId}`);
    console.log(`用户离开时间线: ${timelineId}`);
  });

  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
  });
});

initDatabase().then(() => {
  server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('数据库初始化失败:', err);
});
