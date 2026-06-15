export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  category: string;
  coverUrl: string;
  totalCopies: number;
  availableCopies: number;
  borrowCount: number;
  description: string;
}

export interface User {
  id: string;
  username: string;
  password: string;
  role: 'reader' | 'admin';
  token: string | null;
}

export interface Loan {
  id: string;
  userId: string;
  bookId: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  overdue: boolean;
  fine: number;
  lost: boolean;
  userName?: string;
  bookTitle?: string;
}

export interface Reservation {
  id: string;
  userId: string;
  bookId: string;
  position: number;
  status: 'active' | 'fulfilled' | 'cancelled';
  createdAt: string;
  bookTitle?: string;
}

export interface LoanStats {
  byYear: { year: string; count: number; category: string }[];
  byCategory: { category: string; count: number }[];
}
