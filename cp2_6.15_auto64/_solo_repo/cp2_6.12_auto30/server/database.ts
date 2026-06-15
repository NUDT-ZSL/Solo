import initSqlJs from 'sql.js';
import path from 'path';
import fs from 'fs';

const DB_PATH = path.join(__dirname, '..', 'data.db');

let db: any;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

function saveDb() {
  if (!db) return;
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_PATH, buffer);
  } catch (e) {
    console.error('Failed to save database:', e);
  }
}

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDb, 500);
}

export async function getDb(): Promise<any> {
  if (!db) {
    const SQL = await initSqlJs();
    if (fs.existsSync(DB_PATH)) {
      const fileBuffer = fs.readFileSync(DB_PATH);
      db = new SQL.Database(fileBuffer);
    } else {
      db = new SQL.Database();
    }
    db.run('PRAGMA foreign_keys = ON');
    initTables();
  }
  return db;
}

function initTables() {
  db.run(`
    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      author TEXT NOT NULL DEFAULT '',
      cover_url TEXT NOT NULL DEFAULT '',
      reading_status TEXT NOT NULL DEFAULT 'unread',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      book_id TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'general',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS book_tags (
      note_id TEXT NOT NULL,
      tag_id TEXT NOT NULL,
      PRIMARY KEY (note_id, tag_id),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    )
  `);
  scheduleSave();
}

export interface Book {
  id: string;
  title: string;
  author: string;
  cover_url: string;
  reading_status: 'unread' | 'reading' | 'read';
  created_at: string;
  updated_at: string;
  note_count?: number;
}

export interface Note {
  id: string;
  book_id: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
}

export interface Tag {
  id: string;
  name: string;
  category: 'tech' | 'literature' | 'history' | 'philosophy' | 'art' | 'general';
  created_at: string;
  ref_count?: number;
}

function queryAll<T>(sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const results: T[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject() as T);
  }
  stmt.free();
  return results;
}

function queryOne<T>(sql: string, params: any[] = []): T | undefined {
  const results = queryAll<T>(sql, params);
  return results[0];
}

function run(sql: string, params: any[] = []): void {
  db.run(sql, params);
  scheduleSave();
}

export function getAllBooks(): Book[] {
  const books = queryAll<Book>('SELECT * FROM books ORDER BY updated_at DESC');
  for (const book of books) {
    const row = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM notes WHERE book_id = ?', [book.id]);
    book.note_count = row ? row.cnt : 0;
  }
  return books;
}

export function getBookById(id: string): Book | undefined {
  return queryOne<Book>('SELECT * FROM books WHERE id = ?', [id]);
}

export function createBook(book: Omit<Book, 'created_at' | 'updated_at' | 'note_count'>): Book {
  run('INSERT INTO books (id, title, author, cover_url, reading_status) VALUES (?, ?, ?, ?, ?)',
    [book.id, book.title, book.author, book.cover_url, book.reading_status]);
  return getBookById(book.id)!;
}

export function updateBook(id: string, data: Partial<Pick<Book, 'title' | 'author' | 'cover_url' | 'reading_status'>>): Book | undefined {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.title !== undefined) { fields.push('title = ?'); values.push(data.title); }
  if (data.author !== undefined) { fields.push('author = ?'); values.push(data.author); }
  if (data.cover_url !== undefined) { fields.push('cover_url = ?'); values.push(data.cover_url); }
  if (data.reading_status !== undefined) { fields.push('reading_status = ?'); values.push(data.reading_status); }
  if (fields.length === 0) return getBookById(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  run(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, values);
  return getBookById(id);
}

export function deleteBook(id: string): boolean {
  const before = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM books WHERE id = ?', [id]);
  if (!before || before.cnt === 0) return false;
  run('DELETE FROM book_tags WHERE note_id IN (SELECT id FROM notes WHERE book_id = ?)', [id]);
  run('DELETE FROM notes WHERE book_id = ?', [id]);
  run('DELETE FROM books WHERE id = ?', [id]);
  return true;
}

export function getNotesByBookId(bookId: string): Note[] {
  const notes = queryAll<Note>('SELECT * FROM notes WHERE book_id = ? ORDER BY created_at DESC', [bookId]);
  for (const note of notes) {
    note.tags = getTagsByNoteId(note.id);
  }
  return notes;
}

export function getNoteById(id: string): Note | undefined {
  const note = queryOne<Note>('SELECT * FROM notes WHERE id = ?', [id]);
  if (note) {
    note.tags = getTagsByNoteId(note.id);
  }
  return note;
}

export function createNote(note: { id: string; book_id: string; content: string; tag_ids?: string[] }): Note {
  run('INSERT INTO notes (id, book_id, content) VALUES (?, ?, ?)', [note.id, note.book_id, note.content]);
  if (note.tag_ids) {
    for (const tagId of note.tag_ids) {
      run('INSERT OR IGNORE INTO book_tags (note_id, tag_id) VALUES (?, ?)', [note.id, tagId]);
    }
  }
  return getNoteById(note.id)!;
}

export function updateNote(id: string, data: { content?: string; tag_ids?: string[] }): Note | undefined {
  if (data.content !== undefined) {
    run("UPDATE notes SET content = ?, updated_at = datetime('now') WHERE id = ?", [data.content, id]);
  }
  if (data.tag_ids !== undefined) {
    run('DELETE FROM book_tags WHERE note_id = ?', [id]);
    for (const tagId of data.tag_ids) {
      run('INSERT OR IGNORE INTO book_tags (note_id, tag_id) VALUES (?, ?)', [id, tagId]);
    }
  }
  return getNoteById(id);
}

export function deleteNote(id: string): boolean {
  const before = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM notes WHERE id = ?', [id]);
  if (!before || before.cnt === 0) return false;
  run('DELETE FROM book_tags WHERE note_id = ?', [id]);
  run('DELETE FROM notes WHERE id = ?', [id]);
  return true;
}

export function getTagsByNoteId(noteId: string): Tag[] {
  return queryAll<Tag>(
    'SELECT t.* FROM tags t JOIN book_tags bt ON t.id = bt.tag_id WHERE bt.note_id = ?',
    [noteId]
  );
}

export function getAllTags(): Tag[] {
  const tags = queryAll<Tag>('SELECT * FROM tags ORDER BY name');
  for (const tag of tags) {
    tag.ref_count = getTagRefCount(tag.id);
  }
  return tags;
}

export function getTagRefCount(tagId: string): number {
  const row = queryOne<{ cnt: number }>('SELECT COUNT(DISTINCT note_id) as cnt FROM book_tags WHERE tag_id = ?', [tagId]);
  return row ? row.cnt : 0;
}

export function createTag(tag: { id: string; name: string; category: Tag['category'] }): Tag {
  run('INSERT INTO tags (id, name, category) VALUES (?, ?, ?)', [tag.id, tag.name, tag.category]);
  return queryOne<Tag>('SELECT * FROM tags WHERE id = ?', [tag.id])!;
}

export function updateTag(id: string, data: Partial<Pick<Tag, 'name' | 'category'>>): Tag | undefined {
  const fields: string[] = [];
  const values: any[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.category !== undefined) { fields.push('category = ?'); values.push(data.category); }
  if (fields.length === 0) return queryOne<Tag>('SELECT * FROM tags WHERE id = ?', [id]);
  values.push(id);
  run(`UPDATE tags SET ${fields.join(', ')} WHERE id = ?`, values);
  return queryOne<Tag>('SELECT * FROM tags WHERE id = ?', [id]);
}

export function deleteTag(id: string): boolean {
  const before = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tags WHERE id = ?', [id]);
  if (!before || before.cnt === 0) return false;
  run('DELETE FROM book_tags WHERE tag_id = ?', [id]);
  run('DELETE FROM tags WHERE id = ?', [id]);
  return true;
}

export function getTagCount(): number {
  const row = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM tags');
  return row ? row.cnt : 0;
}

export interface GraphNode {
  id: string;
  name: string;
  category: Tag['category'];
  refCount: number;
}

export interface GraphLink {
  source: string;
  target: string;
  weight: number;
}

export function getGraphData(): { nodes: GraphNode[]; links: GraphLink[] } {
  const tags = queryAll<Tag>('SELECT * FROM tags');
  const nodes: GraphNode[] = tags.map(t => ({
    id: t.id,
    name: t.name,
    category: t.category,
    refCount: getTagRefCount(t.id),
  }));

  const cooccurrence = new Map<string, number>();
  const notes = queryAll<{ id: string }>('SELECT id FROM notes');

  for (const note of notes) {
    const noteTags = queryAll<{ tag_id: string }>('SELECT tag_id FROM book_tags WHERE note_id = ?', [note.id]);
    const tagIds = noteTags.map(nt => nt.tag_id);
    for (let i = 0; i < tagIds.length; i++) {
      for (let j = i + 1; j < tagIds.length; j++) {
        const key = [tagIds[i], tagIds[j]].sort().join('|');
        cooccurrence.set(key, (cooccurrence.get(key) || 0) + 1);
      }
    }
  }

  const bookTagsRows = queryAll<{ book_id: string; tag_id: string }>(
    'SELECT n.book_id, bt.tag_id FROM notes n JOIN book_tags bt ON n.id = bt.note_id'
  );
  const bookTagMap = new Map<string, Set<string>>();
  for (const bt of bookTagsRows) {
    if (!bookTagMap.has(bt.book_id)) bookTagMap.set(bt.book_id, new Set());
    bookTagMap.get(bt.book_id)!.add(bt.tag_id);
  }

  for (const [, tagSet] of bookTagMap) {
    const tagArr = Array.from(tagSet);
    for (let i = 0; i < tagArr.length; i++) {
      for (let j = i + 1; j < tagArr.length; j++) {
        const key = [tagArr[i], tagArr[j]].sort().join('|');
        if (!cooccurrence.has(key)) {
          cooccurrence.set(key, 1);
        }
      }
    }
  }

  const links: GraphLink[] = [];
  for (const [key, weight] of cooccurrence) {
    const [source, target] = key.split('|');
    links.push({ source, target, weight });
  }

  return { nodes, links };
}

export function getNotesByTagId(tagId: string): { id: string; content: string; book_title: string; created_at: string }[] {
  return queryAll<{ id: string; content: string; book_title: string; created_at: string }>(
    `SELECT n.id, n.content, n.created_at, b.title as book_title
     FROM notes n
     JOIN book_tags bt ON n.id = bt.note_id
     JOIN books b ON n.book_id = b.id
     WHERE bt.tag_id = ?
     ORDER BY n.created_at DESC`,
    [tagId]
  );
}

export function searchBooks(query: string): Book[] {
  const like = `%${query}%`;
  const books = queryAll<Book>(
    'SELECT * FROM books WHERE title LIKE ? OR author LIKE ? ORDER BY updated_at DESC',
    [like, like]
  );
  for (const book of books) {
    const row = queryOne<{ cnt: number }>('SELECT COUNT(*) as cnt FROM notes WHERE book_id = ?', [book.id]);
    book.note_count = row ? row.cnt : 0;
  }
  return books;
}

export function searchNotes(query: string): (Note & { book_title: string })[] {
  const like = `%${query}%`;
  const notes = queryAll<Note & { book_title: string }>(
    `SELECT n.*, b.title as book_title
     FROM notes n
     JOIN books b ON n.book_id = b.id
     WHERE n.content LIKE ?
     ORDER BY n.updated_at DESC`,
    [like]
  );
  for (const note of notes) {
    note.tags = getTagsByNoteId(note.id);
  }
  return notes;
}

export function exportAllNotes(): { book: Book; notes: Note[] }[] {
  const books = queryAll<Book>('SELECT * FROM books ORDER BY title');
  return books.map(book => ({
    book,
    notes: getNotesByBookId(book.id),
  }));
}
