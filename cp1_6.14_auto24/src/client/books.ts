import axios from 'axios';

export interface Book {
  _id: string;
  title: string;
  author: string;
  cover: string;
  pages: number;
  rating: number;
  description: string;
  addedAt: number;
}

export interface MemberStatus {
  userId: string;
  username: string;
  avatar: string;
  status: 'unread' | 'reading' | 'read';
  note: string;
  updatedAt: number;
}

export interface BookDetail extends Book {
  memberStatuses: MemberStatus[];
}

export const searchBooks = async (q?: string): Promise<Book[]> => {
  const params = q ? { q } : {};
  const res = await axios.get('/api/books', { params });
  return res.data;
};

export const getBookDetail = async (id: string): Promise<BookDetail> => {
  const res = await axios.get(`/api/books/${id}`);
  return res.data;
};

export const addBook = async (book: Partial<Book>, userId: string, username: string, avatar: string): Promise<Book> => {
  const res = await axios.post('/api/books', { ...book, userId, username, avatar });
  return res.data;
};

export const updateReadingStatus = async (
  userId: string,
  bookId: string,
  status: 'unread' | 'reading' | 'read',
  note: string,
  username: string,
  avatar: string
): Promise<void> => {
  await axios.put('/api/reading-status', { userId, bookId, status, note, username, avatar });
};
