export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
  userId: string;
  status: 'available' | 'exchanged';
  description?: string;
  createdAt: string;
}

export interface ExchangeRequest {
  id: string;
  fromUserId: string;
  toUserId: string;
  bookId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'cancelled';
  createdAt: string;
  book?: Book;
}

export interface User {
  id: string;
  name: string;
}

export const USERS: User[] = [
  { id: 'user-1', name: 'Alice' },
  { id: 'user-2', name: 'Bob' },
  { id: 'user-3', name: 'Charlie' },
];
