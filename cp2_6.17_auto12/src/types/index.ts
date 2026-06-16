export interface Comment {
  id: string;
  userId: string;
  nickname: string;
  content: string;
  createdAt: string;
}

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  stock: number;
  shelf: string;
  description: string;
  doubanRating: number;
  reserveCount: number;
  createdAt: string;
  comments: Comment[];
}

export interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  createdAt: string;
  expireAt: string;
}

export interface BorrowedBook {
  id: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  borrowDate: string;
  dueDate: string;
}

export interface BorrowStats {
  reserved: number;
  borrowed: number;
  total: number;
}

export interface User {
  id: string;
  nickname: string;
  email: string;
  isAdmin?: boolean;
  registeredAt: string;
  borrowStats: BorrowStats;
  reservations: Reservation[];
  borrowed: BorrowedBook[];
}

export interface Activity {
  id: string;
  name: string;
  description: string;
  poster: string;
  date: string;
  location: string;
  totalSlots: number;
  registeredUsers: string[];
  createdAt: string;
}
