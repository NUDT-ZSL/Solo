export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  totalCopies: number;
  availableCopies: number;
}

export interface Reader {
  readerId: string;
  name: string;
  phone: string;
}

export interface BorrowRecord {
  id: string;
  bookId: string;
  bookTitle: string;
  bookIsbn: string;
  readerId: string;
  readerName: string;
  readerPhone: string;
  borrowDate: string;
  dueDate: string;
  returnDate?: string;
  fineAmount?: number;
}

export interface FineStats {
  totalFines: number;
  totalBooks: number;
  currentlyBorrowed: number;
  monthlyBorrows: number;
  weeklyTrend: { date: string; count: number }[];
}
