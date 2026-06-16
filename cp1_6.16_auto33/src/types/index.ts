export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  price: number;
  quantity: number;
  status: 'available' | 'borrowed';
  borrowedCount: number;
}

export interface Member {
  id: string;
  name: string;
  phone: string;
  creditScore: number;
  currentBorrows: number;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  memberId: string;
  borrowDate: string;
  dueDate: string;
  returnDate: string | null;
  status: 'borrowed' | 'returned' | 'overdue';
}

export interface BookDetail extends Book {
  borrowHistory: BorrowRecord[];
}
