import { v4 as uuidv4 } from 'uuid';
import { getDb, rowToBook } from '../database';
import type { Book } from '../types';

export function getAllBooks(search?: string, category?: string): Book[] {
  const db = getDb();
  let query = `SELECT id, isbn, title, author, category, coverUrl, totalCopies, availableCopies, borrowCount, description
               FROM books WHERE 1=1`;
  const params: any[] = [];

  if (search) {
    query += ` AND (title LIKE ? OR author LIKE ? OR category LIKE ? OR isbn LIKE ?)`;
    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm);
  }

  if (category) {
    query += ` AND category = ?`;
    params.push(category);
  }

  query += ` ORDER BY borrowCount DESC`;

  const result = db.exec(query, params);

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(rowToBook);
}

export function getPopularBooks(limit: number = 6): Book[] {
  const db = getDb();

  const result = db.exec(
    `SELECT id, isbn, title, author, category, coverUrl, totalCopies, availableCopies, borrowCount, description
     FROM books ORDER BY borrowCount DESC LIMIT ?`,
    [limit]
  );

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(rowToBook);
}

export function getBookById(id: string): Book | null {
  const db = getDb();

  const result = db.exec(
    `SELECT id, isbn, title, author, category, coverUrl, totalCopies, availableCopies, borrowCount, description
     FROM books WHERE id = ?`,
    [id]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToBook(result[0].values[0]);
}

export function getBookByIsbn(isbn: string): Book | null {
  const db = getDb();

  const result = db.exec(
    `SELECT id, isbn, title, author, category, coverUrl, totalCopies, availableCopies, borrowCount, description
     FROM books WHERE isbn = ?`,
    [isbn]
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return rowToBook(result[0].values[0]);
}

export function addBook(data: {
  isbn: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  coverUrl?: string;
  description?: string;
}): Book {
  const db = getDb();

  const existing = db.exec('SELECT id FROM books WHERE isbn = ?', [data.isbn]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    throw new Error('该ISBN的图书已存在');
  }

  const id = uuidv4();
  const coverUrl = data.coverUrl || `https://picsum.photos/seed/${data.isbn}/200/280`;
  const description = data.description || '';

  db.run(
    `INSERT INTO books (id, isbn, title, author, category, coverUrl, totalCopies, availableCopies, borrowCount, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?)`,
    [id, data.isbn, data.title, data.author, data.category, coverUrl, data.totalCopies, data.totalCopies, description]
  );

  const book = getBookById(id);
  if (!book) {
    throw new Error('添加图书失败');
  }

  return book;
}

export function updateBook(id: string, data: Partial<{
  isbn: string;
  title: string;
  author: string;
  category: string;
  totalCopies: number;
  coverUrl: string;
  description: string;
}>): Book {
  const db = getDb();

  const existing = getBookById(id);
  if (!existing) {
    throw new Error('图书不存在');
  }

  const fields: string[] = [];
  const params: any[] = [];

  if (data.isbn !== undefined) { fields.push('isbn = ?'); params.push(data.isbn); }
  if (data.title !== undefined) { fields.push('title = ?'); params.push(data.title); }
  if (data.author !== undefined) { fields.push('author = ?'); params.push(data.author); }
  if (data.category !== undefined) { fields.push('category = ?'); params.push(data.category); }
  if (data.totalCopies !== undefined) {
    fields.push('totalCopies = ?');
    params.push(data.totalCopies);
    const diff = data.totalCopies - existing.totalCopies;
    fields.push('availableCopies = availableCopies + ?');
    params.push(diff);
  }
  if (data.coverUrl !== undefined) { fields.push('coverUrl = ?'); params.push(data.coverUrl); }
  if (data.description !== undefined) { fields.push('description = ?'); params.push(data.description); }

  if (fields.length === 0) {
    return existing;
  }

  params.push(id);
  db.run(`UPDATE books SET ${fields.join(', ')} WHERE id = ?`, params);

  const updated = getBookById(id);
  if (!updated) {
    throw new Error('更新图书失败');
  }

  return updated;
}

export function deleteBook(id: string): void {
  const db = getDb();

  const existing = getBookById(id);
  if (!existing) {
    throw new Error('图书不存在');
  }

  db.run('DELETE FROM books WHERE id = ?', [id]);
}

export function getAllCategories(): string[] {
  const db = getDb();

  const result = db.exec('SELECT DISTINCT category FROM books ORDER BY category');

  if (result.length === 0) {
    return [];
  }

  return result[0].values.map(row => row[0] as string);
}
