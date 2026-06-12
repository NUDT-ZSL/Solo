import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { v4 as uuidv4 } from 'uuid';
import {
  getDb,
  getAllBooks,
  getBookById,
  createBook,
  updateBook,
  deleteBook,
  getNotesByBookId,
  getNoteById,
  createNote,
  updateNote,
  deleteNote,
  getAllTags,
  createTag,
  updateTag,
  deleteTag,
  getTagCount,
  getGraphData,
  getNotesByTagId,
  searchBooks,
  searchNotes,
  exportAllNotes,
} from './database';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(bodyParser.json());

let dbReady = false;
const pending: ((value: void) => void)[] = [];

function onReady(): Promise<void> {
  if (dbReady) return Promise.resolve();
  return new Promise(resolve => pending.push(resolve));
}

getDb().then(() => {
  dbReady = true;
  pending.forEach(p => p());
  pending.length = 0;
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

app.get('/api/books', async (_req, res) => {
  await onReady();
  try { res.json(getAllBooks()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/books/:id', async (req, res) => {
  await onReady();
  try {
    const book = getBookById(req.params.id);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/books', async (req, res) => {
  await onReady();
  try {
    const { title, author, cover_url, reading_status } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });
    const id = uuidv4();
    const book = createBook({ id, title, author: author || '', cover_url: cover_url || '', reading_status: reading_status || 'unread' });
    res.status(201).json(book);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put('/api/books/:id', async (req, res) => {
  await onReady();
  try {
    const book = updateBook(req.params.id, req.body);
    if (!book) return res.status(404).json({ error: 'Book not found' });
    res.json(book);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/books/:id', async (req, res) => {
  await onReady();
  try {
    const ok = deleteBook(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Book not found' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/books/:id/notes', async (req, res) => {
  await onReady();
  try { res.json(getNotesByBookId(req.params.id)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/notes', async (req, res) => {
  await onReady();
  try {
    const { book_id, content, tag_ids } = req.body;
    if (!book_id) return res.status(400).json({ error: 'book_id is required' });
    const id = uuidv4();
    const note = createNote({ id, book_id, content: content || '', tag_ids: tag_ids || [] });
    res.status(201).json(note);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.put('/api/notes/:id', async (req, res) => {
  await onReady();
  try {
    const note = updateNote(req.params.id, req.body);
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/notes/:id', async (req, res) => {
  await onReady();
  try {
    const ok = deleteNote(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Note not found' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tags', async (_req, res) => {
  await onReady();
  try { res.json(getAllTags()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.post('/api/tags', async (req, res) => {
  await onReady();
  try {
    const { name, category } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });
    const count = getTagCount();
    if (count >= 50) return res.status(400).json({ error: 'Maximum 50 tags allowed' });
    const id = uuidv4();
    const tag = createTag({ id, name, category: category || 'general' });
    res.status(201).json(tag);
  } catch (e: any) {
    if (e.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Tag name already exists' });
    }
    res.status(500).json({ error: e.message });
  }
});

app.put('/api/tags/:id', async (req, res) => {
  await onReady();
  try {
    const tag = updateTag(req.params.id, req.body);
    if (!tag) return res.status(404).json({ error: 'Tag not found' });
    res.json(tag);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.delete('/api/tags/:id', async (req, res) => {
  await onReady();
  try {
    const ok = deleteTag(req.params.id);
    if (!ok) return res.status(404).json({ error: 'Tag not found' });
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/graph', async (_req, res) => {
  await onReady();
  try { res.json(getGraphData()); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/tags/:id/notes', async (req, res) => {
  await onReady();
  try { res.json(getNotesByTagId(req.params.id)); } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/search', async (req, res) => {
  await onReady();
  try {
    const q = req.query.q as string;
    if (!q) return res.json({ books: [], notes: [] });
    const books = searchBooks(q);
    const notes = searchNotes(q);
    res.json({ books, notes });
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.get('/api/export', async (_req, res) => {
  await onReady();
  try {
    const data = exportAllNotes();
    let md = '# 阅读笔记导出\n\n';
    for (const { book, notes } of data) {
      if (notes.length === 0) continue;
      md += `## 《${book.title}》 - ${book.author}\n\n`;
      for (const note of notes) {
        md += `### 笔记 (${note.created_at})\n\n`;
        if (note.tags && note.tags.length > 0) {
          md += `标签: ${note.tags.map(t => t.name).join(', ')}\n\n`;
        }
        const plain = note.content
          .replace(/<br\s*\/?>/gi, '\n')
          .replace(/<\/p>/gi, '\n\n')
          .replace(/<li>/gi, '- ')
          .replace(/<\/li>/gi, '\n')
          .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
          .replace(/<em>(.*?)<\/em>/gi, '*$1*')
          .replace(/<code>(.*?)<\/code>/gi, '`$1`')
          .replace(/<pre><code>(.*?)<\/code><\/pre>/gis, '```\n$1\n```')
          .replace(/<[^>]+>/g, '')
          .trim();
        md += `${plain}\n\n---\n\n`;
      }
    }
    res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=notes_export.md');
    res.send(md);
  } catch (e: any) { res.status(500).json({ error: e.message }); }
});

app.listen(PORT, async () => {
  await getDb();
  console.log(`Server running on http://localhost:${PORT}`);
});
