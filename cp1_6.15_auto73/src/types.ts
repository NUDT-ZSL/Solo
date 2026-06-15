export type BookCategory = '文学' | '社科' | '科普' | '少儿';

export type BorrowStatus = 'borrowing' | 'returned' | 'overdue';

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  category: BookCategory;
  cover?: string;
  stock: number;
  tags: string[];
  description: string;
  borrowCount: number;
}

export interface Customer {
  id: string;
  name: string;
  memberNo: string;
  phone: string;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  customerId: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  status: BorrowStatus;
}

export interface CustomerStats {
  totalBorrows: number;
  currentBorrows: number;
  favoriteCategory: string;
}
