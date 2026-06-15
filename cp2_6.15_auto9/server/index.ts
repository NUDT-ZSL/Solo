import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { initDatabase, getDb } from './database.js';
import type { Request, Response } from 'express';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });

interface WSMessage {
  type: string;
  data: unknown;
}

const clients = new Set<WebSocket>();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('New WebSocket client connected');

  ws.on('message', (message: Buffer) => {
    try {
      const parsed: WSMessage = JSON.parse(message.toString());
      console.log('Received WS message:', parsed.type);
    } catch (e) {
      console.error('Parse WS message error:', e);
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('WS client disconnected');
  });
});

function broadcast(type: string, data: unknown) {
  const msg = JSON.stringify({ type, data });
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  }
}

function formatUser(row: { id: number; name: string; avatar: string | null }) {
  return {
    id: row.id,
    name: row.name,
    avatar: row.avatar || undefined
  };
}

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return '刚刚';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}分钟前`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour}小时前`;
  const diffDay = Math.floor(diffHour / 24);
  return `${diffDay}天前`;
}

app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.get('/api/groups', async (req: Request, res: Response) => {
  try {
    const db = getDb();
    const search = (req.query.search as string) || '';
    let rows;
    if (search) {
      rows = await db.all(
        `SELECT g.*, COUNT(gm.id) as member_count
         FROM groups g
         LEFT JOIN group_members gm ON g.id = gm.group_id
         WHERE g.name LIKE ? OR g.description LIKE ?
         GROUP BY g.id
         ORDER BY member_count DESC`,
        [`%${search}%`, `%${search}%`]
      );
    } else {
      rows = await db.all(
        `SELECT g.*, COUNT(gm.id) as member_count
         FROM groups g
         LEFT JOIN group_members gm ON g.id = gm.group_id
         GROUP BY g.id
         ORDER BY g.created_at DESC`
      );
    }
    const groups = rows.map((r: { id: number; name: string; description: string; creator_id: number; member_count: number; created_at: string }) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      creatorId: r.creator_id,
      memberCount: r.member_count,
      createdAt: r.created_at
    }));
    res.json(groups);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get groups' });
  }
});

app.post('/api/groups', async (req: Request, res: Response) => {
  try {
    const { name, description, userId } = req.body;
    if (!name || !userId) return res.status(400).json({ error: 'Missing fields' });
    const db = getDb();
    const result = await db.run(
      'INSERT INTO groups (name, description, creator_id) VALUES (?, ?, ?)',
      name, description || '', userId
    );
    if (result.lastID) {
      await db.run(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        result.lastID, userId
      );
    }
    res.json({ id: result.lastID, name, description, creatorId: userId, memberCount: 1 });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create group' });
  }
});

app.post('/api/groups/:id/join', async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.id);
    const { userId } = req.body;
    const db = getDb();
    try {
      await db.run(
        'INSERT INTO group_members (group_id, user_id) VALUES (?, ?)',
        groupId, userId
      );
    } catch {
      return res.json({ joined: false, message: '已在小组中' });
    }
    res.json({ joined: true });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to join group' });
  }
});

app.get('/api/groups/:id', async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.id);
    const db = getDb();
    const groupRow = await db.get(
      `SELECT g.*, COUNT(gm.id) as member_count
       FROM groups g
       LEFT JOIN group_members gm ON g.id = gm.group_id
       WHERE g.id = ?
       GROUP BY g.id`,
      groupId
    );
    if (!groupRow) return res.status(404).json({ error: 'Group not found' });

    const memberRows = await db.all(
      `SELECT u.id, u.name, u.avatar, gm.joined_at
       FROM group_members gm
       JOIN users u ON gm.user_id = u.id
       WHERE gm.group_id = ?
       ORDER BY gm.joined_at ASC
       LIMIT 20`,
      groupId
    );

    const hotPostRows = await db.all(
      `SELECT p.*, u.name as user_name, u.avatar as user_avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.group_id = ?
       AND p.created_at >= datetime('now', '-7 days')
       ORDER BY p.reply_count DESC, p.created_at DESC
       LIMIT 5`,
      groupId
    );

    const group = {
      id: groupRow.id,
      name: groupRow.name,
      description: groupRow.description,
      creatorId: groupRow.creator_id,
      memberCount: groupRow.member_count,
      createdAt: groupRow.created_at
    };
    const members = memberRows.map((r: { id: number; name: string; avatar: string | null; joined_at: string }) => ({
      id: r.id,
      name: r.name,
      avatar: r.avatar || undefined,
      joinedAt: r.joined_at
    }));
    const hotPosts = hotPostRows.map((r: { id: number; group_id: number; user_id: number; chapter: string; title: string; content: string; reply_count: number; created_at: string; user_name: string; user_avatar: string | null }) => ({
      id: r.id,
      groupId: r.group_id,
      userId: r.user_id,
      chapter: r.chapter,
      title: r.title,
      content: r.content,
      replyCount: r.reply_count,
      createdAt: r.created_at,
      author: { id: r.user_id, name: r.user_name, avatar: r.user_avatar || undefined },
      isHot: r.reply_count >= 2
    }));

    res.json({ group, members, hotPosts });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get group detail' });
  }
});

app.get('/api/groups/:id/posts', async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.id);
    const db = getDb();
    const rows = await db.all(
      `SELECT p.*, u.name as user_name, u.avatar as user_avatar
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.group_id = ?
       ORDER BY p.created_at DESC`,
      groupId
    );
    const posts = rows.map((r: { id: number; group_id: number; user_id: number; chapter: string; title: string; content: string; reply_count: number; created_at: string; user_name: string; user_avatar: string | null }) => ({
      id: r.id,
      groupId: r.group_id,
      userId: r.user_id,
      chapter: r.chapter,
      title: r.title,
      content: r.content,
      replyCount: r.reply_count,
      createdAt: r.created_at,
      relativeTime: relativeTime(r.created_at),
      author: { id: r.user_id, name: r.user_name, avatar: r.user_avatar || undefined }
    }));
    res.json(posts);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get posts' });
  }
});

app.post('/api/groups/:id/posts', async (req: Request, res: Response) => {
  try {
    const groupId = Number(req.params.id);
    const { userId, chapter, title, content } = req.body;
    if (!userId || !title || !content) return res.status(400).json({ error: 'Missing fields' });
    if (title.length > 80) return res.status(400).json({ error: 'Title too long' });
    const db = getDb();
    const result = await db.run(
      'INSERT INTO posts (group_id, user_id, chapter, title, content) VALUES (?, ?, ?, ?, ?)',
      groupId, userId, chapter || '', title, content
    );
    const userRow = await db.get('SELECT * FROM users WHERE id = ?', userId);
    const newPost = {
      id: result.lastID,
      groupId,
      userId,
      chapter: chapter || '',
      title,
      content,
      replyCount: 0,
      createdAt: new Date().toISOString(),
      relativeTime: '刚刚',
      author: formatUser(userRow as { id: number; name: string; avatar: string | null })
    };
    broadcast('new_post', { groupId, post: newPost });
    res.json(newPost);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

app.get('/api/posts/:id/replies', async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.id);
    const db = getDb();
    const rows = await db.all(
      `SELECT r.*, u.name as user_name, u.avatar as user_avatar
       FROM replies r
       JOIN users u ON r.user_id = u.id
       WHERE r.post_id = ?
       ORDER BY r.created_at ASC`,
      postId
    );
    const replies = rows.map((r: { id: number; post_id: number; user_id: number; content: string; created_at: string; user_name: string; user_avatar: string | null }, idx: number) => ({
      id: r.id,
      postId: r.post_id,
      userId: r.user_id,
      content: r.content,
      createdAt: r.created_at,
      relativeTime: relativeTime(r.created_at),
      floor: idx + 1,
      author: { id: r.user_id, name: r.user_name, avatar: r.user_avatar || undefined }
    }));
    res.json(replies);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get replies' });
  }
});

app.post('/api/posts/:id/replies', async (req: Request, res: Response) => {
  try {
    const postId = Number(req.params.id);
    const { userId, content } = req.body;
    if (!userId || !content) return res.status(400).json({ error: 'Missing fields' });
    const db = getDb();
    const result = await db.run(
      'INSERT INTO replies (post_id, user_id, content) VALUES (?, ?, ?)',
      postId, userId, content
    );
    await db.run('UPDATE posts SET reply_count = reply_count + 1 WHERE id = ?', postId);
    const userRow = await db.get('SELECT * FROM users WHERE id = ?', userId);
    const countRow = await db.get('SELECT COUNT(*) as cnt FROM replies WHERE post_id = ?', postId);
    const newReply = {
      id: result.lastID,
      postId,
      userId,
      content,
      createdAt: new Date().toISOString(),
      relativeTime: '刚刚',
      floor: countRow.cnt as number,
      author: formatUser(userRow as { id: number; name: string; avatar: string | null })
    };
    broadcast('new_reply', { postId, reply: newReply });
    res.json(newReply);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to create reply' });
  }
});

function extractKeywords(text: string): string[] {
  const tagPattern = /#(\S+)/g;
  const tags: string[] = [];
  let match;
  while ((match = tagPattern.exec(text)) !== null) {
    tags.push(match[1]);
  }
  const cleanText = text.replace(/#\S+/g, ' ').replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s]/g, ' ');
  const chineseWords: string[] = [];
  for (let i = 0; i < cleanText.length - 1; i++) {
    if (/[\u4e00-\u9fa5]/.test(cleanText[i]) && /[\u4e00-\u9fa5]/.test(cleanText[i + 1])) {
      chineseWords.push(cleanText.slice(i, i + 2));
    }
  }
  const englishWords = cleanText.match(/[a-zA-Z]{3,}/g) || [];
  return [...tags, ...chineseWords.slice(0, 50), ...englishWords.slice(0, 30)];
}

function computeTF(tokens: string[]): Map<string, number> {
  const tf = new Map<string, number>();
  const total = tokens.length || 1;
  for (const t of tokens) {
    tf.set(t, (tf.get(t) || 0) + 1);
  }
  for (const [k, v] of tf.entries()) {
    tf.set(k, v / total);
  }
  return tf;
}

function cosineSimilarity(a: Map<string, number>, b: Map<string, number>): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [k, v] of a.entries()) {
    normA += v * v;
    if (b.has(k)) dot += v * (b.get(k) as number);
  }
  for (const v of b.values()) {
    normB += v * v;
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function generateRecommendations(userId: number) {
  const db = getDb();
  const posts = await db.all(
    `SELECT p.title, p.content, p.created_at FROM posts p
     WHERE p.user_id = ? ORDER BY p.created_at DESC LIMIT 50`,
    userId
  );
  const replies = await db.all(
    `SELECT r.content, r.created_at FROM replies r
     WHERE r.user_id = ? ORDER BY r.created_at DESC LIMIT 100`,
    userId
  );
  const allTokens: string[] = [];
  for (const p of posts) {
    allTokens.push(...extractKeywords((p.title as string) + ' ' + (p.content as string)));
  }
  for (const r of replies) {
    allTokens.push(...extractKeywords(r.content as string));
  }
  const userVector = computeTF(allTokens);

  const books = await db.all('SELECT * FROM books');
  const scoredBooks: { book: { id: string; title: string; author: string; cover: string; description: string }; tags: string[]; score: number }[] = [];

  for (const b of books) {
    const tags: string[] = JSON.parse(b.tags as string);
    const tagTokens: string[] = [];
    for (const t of tags) {
      tagTokens.push(t, ...extractKeywords(t));
    }
    tagTokens.push(...extractKeywords((b.description as string) || ''));
    const bookVector = computeTF(tagTokens);
    const score = cosineSimilarity(userVector, bookVector);
    if (score > 0) {
      scoredBooks.push({ book: b as { id: string; title: string; author: string; cover: string; description: string }, tags, score });
    }
  }

  const hotWords: { word: string; count: number }[] = [];
  const wordCount = new Map<string, number>();
  for (const t of allTokens) {
    wordCount.set(t, (wordCount.get(t) || 0) + 1);
  }
  for (const [w, c] of wordCount.entries()) {
    if (c >= 2) hotWords.push({ word: w, count: c });
  }
  hotWords.sort((a, b) => b.count - a.count);
  const topWords = hotWords.slice(0, 5).map(w => w.word);

  scoredBooks.sort((a, b) => b.score - a.score);
  const topBooks = scoredBooks.slice(0, 5);

  await db.run('DELETE FROM recommendations WHERE user_id = ?', userId);
  for (let i = 0; i < topBooks.length; i++) {
    const { book, score, tags } = topBooks[i];
    const matchedTags = tags.filter(t => topWords.some(w => t.includes(w) || w.includes(t)));
    const reason = matchedTags.length > 0
      ? `根据你对${matchedTags.slice(0, 3).join('、')}的讨论，这本书可能很适合你`
      : `基于你的阅读兴趣推荐，${book.description || '值得一读'}`;
    await db.run(
      'INSERT INTO recommendations (user_id, book_title, book_author, book_cover, reason, score) VALUES (?, ?, ?, ?, ?, ?)',
      userId, book.title, book.author, book.cover || '', reason, score
    );
  }
  return { topWords, topBooks: topBooks.map(b => b.book) };
}

app.get('/api/recommendations/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    const db = getDb();
    let rows = await db.all(
      'SELECT * FROM recommendations WHERE user_id = ? ORDER BY score DESC LIMIT 5',
      userId
    );
    let topWords: string[] = [];
    if (rows.length === 0) {
      const result = await generateRecommendations(userId);
      topWords = result.topWords;
      rows = await db.all(
        'SELECT * FROM recommendations WHERE user_id = ? ORDER BY score DESC LIMIT 5',
        userId
      );
    } else {
      const posts = await db.all('SELECT title, content FROM posts WHERE user_id = ? LIMIT 20', userId);
      const replies = await db.all('SELECT content FROM replies WHERE user_id = ? LIMIT 50', userId);
      const tokens: string[] = [];
      for (const p of posts) tokens.push(...extractKeywords((p.title as string) + ' ' + (p.content as string)));
      for (const r of replies) tokens.push(...extractKeywords(r.content as string));
      const wc = new Map<string, number>();
      for (const t of tokens) wc.set(t, (wc.get(t) || 0) + 1);
      const arr: { word: string; count: number }[] = [];
      for (const [w, c] of wc.entries()) if (c >= 2) arr.push({ word: w, count: c });
      arr.sort((a, b) => b.count - a.count);
      topWords = arr.slice(0, 5).map(w => w.word);
    }
    const recs = rows.map((r: { id: number; user_id: number; book_title: string; book_author: string; book_cover: string; reason: string; score: number; created_at: string }) => ({
      id: r.id,
      userId: r.user_id,
      bookTitle: r.book_title,
      bookAuthor: r.book_author,
      bookCover: r.book_cover || undefined,
      reason: r.reason,
      score: r.score,
      createdAt: r.created_at
    }));
    const greetingWords = topWords.length > 0 ? topWords.join('和') : '各种话题';
    const greetings = [
      `根据你最近对${greetingWords}的讨论，推荐以下书籍给热爱探索的你`,
      `基于你近期在${greetingWords}方面的活跃，为你精心挑选了这些好书`,
      `发现你对${greetingWords}很感兴趣，为你准备了一份专属书单`
    ];
    const greeting = greetings[Math.floor(Math.random() * greetings.length)];
    res.json({ greeting, recommendations: recs, topWords });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get recommendations' });
  }
});

app.get('/api/reading-list/:userId', async (req: Request, res: Response) => {
  try {
    const userId = Number(req.params.userId);
    const db = getDb();
    const rows = await db.all(
      'SELECT * FROM reading_list WHERE user_id = ? ORDER BY added_at DESC',
      userId
    );
    const items = rows.map((r: { id: number; user_id: number; book_title: string; book_author: string; douban_url: string; added_at: string }) => ({
      id: r.id,
      userId: r.user_id,
      bookTitle: r.book_title,
      bookAuthor: r.book_author,
      doubanUrl: r.douban_url || `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent(r.book_title)}`,
      addedAt: r.added_at
    }));
    res.json(items);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get reading list' });
  }
});

app.post('/api/reading-list', async (req: Request, res: Response) => {
  try {
    const { userId, bookTitle, bookAuthor } = req.body;
    if (!userId || !bookTitle || !bookAuthor) return res.status(400).json({ error: 'Missing fields' });
    const db = getDb();
    const doubanUrl = `https://search.douban.com/book/subject_search?search_text=${encodeURIComponent(bookTitle)}`;
    let id: number | undefined;
    try {
      const result = await db.run(
        'INSERT INTO reading_list (user_id, book_title, book_author, douban_url) VALUES (?, ?, ?, ?)',
        userId, bookTitle, bookAuthor, doubanUrl
      );
      id = result.lastID;
    } catch {
      const existing = await db.get(
        'SELECT id FROM reading_list WHERE user_id = ? AND book_title = ? AND book_author = ?',
        userId, bookTitle, bookAuthor
      );
      if (existing) {
        await db.run('DELETE FROM reading_list WHERE id = ?', existing.id);
        return res.json({ added: false, removed: true, id: existing.id });
      }
      throw new Error('Unknown error');
    }
    res.json({ added: true, id, doubanUrl });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to update reading list' });
  }
});

app.get('/api/users/current', async (_req: Request, res: Response) => {
  try {
    const db = getDb();
    const row = await db.get('SELECT * FROM users ORDER BY id ASC LIMIT 1');
    if (row) {
      res.json(formatUser(row as { id: number; name: string; avatar: string | null }));
    } else {
      res.status(404).json({ error: 'No users' });
    }
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

async function start() {
  try {
    await initDatabase();
    console.log('Database initialized');

    setInterval(async () => {
      try {
        const db = getDb();
        const users = await db.all('SELECT id FROM users');
        for (const u of users) {
          await generateRecommendations(u.id as number);
        }
        console.log('Batch recommendation generation complete');
      } catch (e) {
        console.error('Recommendation batch error:', e);
      }
    }, 30 * 60 * 1000);

    const PORT = process.env.PORT || 3001;
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`WebSocket endpoint: ws://localhost:${PORT}/ws`);
    });
  } catch (e) {
    console.error('Startup error:', e);
    process.exit(1);
  }
}

start();
