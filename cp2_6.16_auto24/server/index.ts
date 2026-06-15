import express from 'express';
import cors from 'cors';
import sqlite3 from 'sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { Request, Response, NextFunction } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const JWT_SECRET = 'your-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

const getDbPath = (): string => {
  const serverDir = path.join(process.cwd(), 'server');
  if (fs.existsSync(serverDir)) {
    return path.join(serverDir, 'data.db');
  }
  return path.join(__dirname, 'data.db');
};

const dbPath = getDbPath();

interface Element {
  id: string;
  type: 'photo' | 'text';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  content: string;
  fontSize?: number;
  color?: string;
  fontFamily?: string;
  fontWeight?: string;
  textAlign?: string;
  borderRadius?: number;
  rotation?: number;
  opacity?: number;
  [key: string]: any;
}

interface Effects {
  isSparkleEnabled: boolean;
  isPetalEnabled: boolean;
  isGlowEnabled: boolean;
  isRotateEnabled: boolean;
  isTextBlinkEnabled: boolean;
}

interface User {
  id: number;
  email: string;
  nickname: string;
  password: string;
  created_at: string;
}

interface Card {
  id: number;
  user_id: number;
  template_id: number;
  elements: Element[];
  effects: Effects;
  created_at: string;
  updated_at: string;
}

interface Send {
  id: number;
  card_id: number;
  sender_id: number;
  receiver_email: string;
  send_time: string;
  link_token: string;
  is_viewed: number;
}

interface Contact {
  id: number;
  user_id: number;
  name: string;
  email: string;
  avatar: string;
}

interface Favorite {
  id: number;
  user_id: number;
  card_id: number;
  created_at: string;
}

interface AuthRequest extends Request {
  userId?: number;
}

const db = new sqlite3.Database(dbPath);

const initDatabase = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        nickname TEXT NOT NULL,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS cards (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        template_id INTEGER NOT NULL,
        elements TEXT NOT NULL,
        effects TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS sends (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        card_id INTEGER NOT NULL,
        sender_id INTEGER NOT NULL,
        receiver_email TEXT NOT NULL,
        send_time DATETIME DEFAULT CURRENT_TIMESTAMP,
        link_token TEXT UNIQUE NOT NULL,
        is_viewed INTEGER DEFAULT 0,
        FOREIGN KEY (card_id) REFERENCES cards(id),
        FOREIGN KEY (sender_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        avatar TEXT,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS favorites (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        card_id INTEGER NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id),
        FOREIGN KEY (card_id) REFERENCES cards(id),
        UNIQUE(user_id, card_id)
      )`, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  });
};

const seedContacts = (userId: number): Promise<void> => {
  return new Promise((resolve, reject) => {
    const mockContacts = [
      { name: '张三', email: 'zhangsan@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhangsan' },
      { name: '李四', email: 'lisi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=lisi' },
      { name: '王五', email: 'wangwu@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=wangwu' },
      { name: '赵六', email: 'zhaoliu@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=zhaoliu' },
      { name: '陈七', email: 'chenqi@example.com', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=chenqi' },
    ];

    let completed = 0;
    mockContacts.forEach((contact) => {
      db.run(
        'INSERT OR IGNORE INTO contacts (user_id, name, email, avatar) VALUES (?, ?, ?, ?)',
        [userId, contact.name, contact.email, contact.avatar],
        (err) => {
          if (err) reject(err);
          completed++;
          if (completed === mockContacts.length) resolve();
        }
      );
    });
  });
};

const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
      return;
    }
    req.userId = user.userId;
    next();
  });
};

app.post('/api/auth/register', async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, nickname, password } = req.body;

    if (!email || !nickname || !password) {
      res.status(400).json({ error: 'Email, nickname and password are required' });
      return;
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (email, nickname, password) VALUES (?, ?, ?)',
      [email, nickname, hashedPassword],
      function (err: Error | null) {
        if (err) {
          if ((err as any).code === 'SQLITE_CONSTRAINT') {
            res.status(409).json({ error: 'Email already exists' });
          } else {
            res.status(500).json({ error: 'Database error' });
          }
          return;
        }

        const userId = this.lastID;
        seedContacts(userId).catch(console.error);

        const token = jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: '7d' });
        res.status(201).json({
          token,
          user: {
            id: userId,
            email,
            nickname,
          },
        });
      }
    );
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', (req: Request, res: Response): void => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({ error: 'Email and password are required' });
    return;
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], async (err: Error | null, row: User | undefined) => {
    if (err) {
      res.status(500).json({ error: 'Database error' });
      return;
    }

    if (!row) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const validPassword = await bcrypt.compare(password, row.password);
    if (!validPassword) {
      res.status(401).json({ error: 'Invalid email or password' });
      return;
    }

    const token = jwt.sign({ userId: row.id, email: row.email }, JWT_SECRET, { expiresIn: '7d' });
    res.json({
      token,
      user: {
        id: row.id,
        email: row.email,
        nickname: row.nickname,
      },
    });
  });
});

app.get('/api/cards', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;

  db.all(
    'SELECT * FROM cards WHERE user_id = ? ORDER BY updated_at DESC',
    [userId],
    (err: Error | null, rows: any[]) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      const cards = rows.map((row) => ({
        ...row,
        elements: JSON.parse(row.elements),
        effects: JSON.parse(row.effects),
      }));

      res.json(cards);
    }
  );
});

app.post('/api/cards', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;
  const { templateId, elements, effects } = req.body;

  if (!templateId || !elements || !effects) {
    res.status(400).json({ error: 'templateId, elements and effects are required' });
    return;
  }

  const elementsJson = JSON.stringify(elements);
  const effectsJson = JSON.stringify(effects);

  db.run(
    'INSERT INTO cards (user_id, template_id, elements, effects) VALUES (?, ?, ?, ?)',
    [userId, templateId, elementsJson, effectsJson],
    function (err: Error | null) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      const cardId = this.lastID;
      db.get('SELECT * FROM cards WHERE id = ?', [cardId], (err: Error | null, row: any) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }

        const card = {
          ...row,
          elements: JSON.parse(row.elements),
          effects: JSON.parse(row.effects),
        };

        res.status(201).json(card);
      });
    }
  );
});

app.get('/api/cards/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;
  const cardId = req.params.id;

  db.get(
    'SELECT * FROM cards WHERE id = ? AND user_id = ?',
    [cardId, userId],
    (err: Error | null, row: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (!row) {
        res.status(404).json({ error: 'Card not found' });
        return;
      }

      const card = {
        ...row,
        elements: JSON.parse(row.elements),
        effects: JSON.parse(row.effects),
      };

      res.json(card);
    }
  );
});

app.put('/api/cards/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;
  const cardId = req.params.id;
  const { templateId, elements, effects } = req.body;

  db.get(
    'SELECT * FROM cards WHERE id = ? AND user_id = ?',
    [cardId, userId],
    (err: Error | null, row: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (!row) {
        res.status(404).json({ error: 'Card not found' });
        return;
      }

      const updatedTemplateId = templateId ?? row.template_id;
      const updatedElements = elements ? JSON.stringify(elements) : row.elements;
      const updatedEffects = effects ? JSON.stringify(effects) : row.effects;

      db.run(
        'UPDATE cards SET template_id = ?, elements = ?, effects = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [updatedTemplateId, updatedElements, updatedEffects, cardId],
        function (err: Error | null) {
          if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
          }

          db.get('SELECT * FROM cards WHERE id = ?', [cardId], (err: Error | null, updatedRow: any) => {
            if (err) {
              res.status(500).json({ error: 'Database error' });
              return;
            }

            const card = {
              ...updatedRow,
              elements: JSON.parse(updatedRow.elements),
              effects: JSON.parse(updatedRow.effects),
            };

            res.json(card);
          });
        }
      );
    }
  );
});

app.delete('/api/cards/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;
  const cardId = req.params.id;

  db.run(
    'DELETE FROM cards WHERE id = ? AND user_id = ?',
    [cardId, userId],
    function (err: Error | null) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Card not found' });
        return;
      }

      res.json({ message: 'Card deleted successfully' });
    }
  );
});

app.get('/api/contacts', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;

  db.all(
    'SELECT * FROM contacts WHERE user_id = ? ORDER BY name',
    [userId],
    (err: Error | null, rows: Contact[]) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (rows.length === 0) {
        seedContacts(userId as number)
          .then(() => {
            db.all(
              'SELECT * FROM contacts WHERE user_id = ? ORDER BY name',
              [userId],
              (err: Error | null, newRows: Contact[]) => {
                if (err) {
                  res.status(500).json({ error: 'Database error' });
                  return;
                }
                res.json(newRows);
              }
            );
          })
          .catch(() => {
            res.status(500).json({ error: 'Database error' });
          });
        return;
      }

      res.json(rows);
    }
  );
});

app.post('/api/sends', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;
  const { cardId, receiverEmail } = req.body;

  if (!cardId || !receiverEmail) {
    res.status(400).json({ error: 'cardId and receiverEmail are required' });
    return;
  }

  db.get(
    'SELECT * FROM cards WHERE id = ? AND user_id = ?',
    [cardId, userId],
    (err: Error | null, cardRow: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (!cardRow) {
        res.status(404).json({ error: 'Card not found' });
        return;
      }

      const linkToken = uuidv4();

      db.run(
        'INSERT INTO sends (card_id, sender_id, receiver_email, link_token) VALUES (?, ?, ?, ?)',
        [cardId, userId, receiverEmail, linkToken],
        function (err: Error | null) {
          if (err) {
            res.status(500).json({ error: 'Database error' });
            return;
          }

          const sendId = this.lastID;
          db.get('SELECT * FROM sends WHERE id = ?', [sendId], (err: Error | null, row: any) => {
            if (err) {
              res.status(500).json({ error: 'Database error' });
              return;
            }

            res.status(201).json({
              ...row,
              is_viewed: row.is_viewed === 1,
            });
          });
        }
      );
    }
  );
});

app.get('/api/sends/:token', (req: Request, res: Response): void => {
  const { token } = req.params;

  db.get(
    `SELECT sends.*, cards.template_id, cards.elements, cards.effects, users.nickname as sender_name
     FROM sends
     INNER JOIN cards ON sends.card_id = cards.id
     INNER JOIN users ON sends.sender_id = users.id
     WHERE sends.link_token = ?`,
    [token],
    (err: Error | null, row: any) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (!row) {
        res.status(404).json({ error: 'Send not found' });
        return;
      }

      if (row.is_viewed === 0) {
        db.run('UPDATE sends SET is_viewed = 1 WHERE id = ?', [row.id]);
      }

      const result = {
        id: row.id,
        cardId: row.card_id,
        senderId: row.sender_id,
        senderName: row.sender_name,
        receiverEmail: row.receiver_email,
        sendTime: row.send_time,
        linkToken: row.link_token,
        isViewed: true,
        card: {
          id: row.card_id,
          template_id: row.template_id,
          elements: JSON.parse(row.elements),
          effects: JSON.parse(row.effects),
        },
      };

      res.json(result);
    }
  );
});

app.post('/api/favorites', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;
  const { cardId } = req.body;

  if (!cardId) {
    res.status(400).json({ error: 'cardId is required' });
    return;
  }

  db.run(
    'INSERT OR IGNORE INTO favorites (user_id, card_id) VALUES (?, ?)',
    [userId, cardId],
    function (err: Error | null) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (this.changes === 0) {
        res.status(409).json({ error: 'Already favorited' });
        return;
      }

      db.get('SELECT * FROM favorites WHERE id = ?', [this.lastID], (err: Error | null, row: any) => {
        if (err) {
          res.status(500).json({ error: 'Database error' });
          return;
        }

        res.status(201).json(row);
      });
    }
  );
});

app.get('/api/favorites', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;

  db.all(
    `SELECT favorites.*, cards.template_id, cards.elements, cards.effects
     FROM favorites
     INNER JOIN cards ON favorites.card_id = cards.id
     WHERE favorites.user_id = ?
     ORDER BY favorites.created_at DESC`,
    [userId],
    (err: Error | null, rows: any[]) => {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      const favorites = rows.map((row) => ({
        id: row.id,
        userId: row.user_id,
        cardId: row.card_id,
        createdAt: row.created_at,
        card: {
          id: row.card_id,
          template_id: row.template_id,
          elements: JSON.parse(row.elements),
          effects: JSON.parse(row.effects),
        },
      }));

      res.json(favorites);
    }
  );
});

app.delete('/api/favorites/:id', authenticateToken, (req: AuthRequest, res: Response): void => {
  const userId = req.userId;
  const favoriteId = req.params.id;

  db.run(
    'DELETE FROM favorites WHERE id = ? AND user_id = ?',
    [favoriteId, userId],
    function (err: Error | null) {
      if (err) {
        res.status(500).json({ error: 'Database error' });
        return;
      }

      if (this.changes === 0) {
        res.status(404).json({ error: 'Favorite not found' });
        return;
      }

      res.json({ message: 'Favorite removed successfully' });
    }
  );
});

const startServer = async (): Promise<void> => {
  try {
    await initDatabase();
    console.log('Database initialized');

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('Failed to initialize database:', error);
    process.exit(1);
  }
};

startServer();

export default app;
