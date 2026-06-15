import { v4 as uuidv4 } from 'uuid';
import { Book, Customer, BorrowRecord, CustomerStats, BookCategory, BorrowStatus } from './types';
import { mockBooks, mockCustomers, mockBorrowRecords } from './data';

let books: Book[] = [...mockBooks];
let customers: Customer[] = [...mockCustomers];
let borrowRecords: BorrowRecord[] = [...mockBorrowRecords];

export const getAllBooks = (): Book[] => {
  return [...books];
};

export const getAllCustomers = (): Customer[] => {
  return [...customers];
};

export const getAllBorrowRecords = (): BorrowRecord[] => {
  return [...borrowRecords];
};

export const getBookById = (id: string): Book | undefined => {
  return books.find(book => book.id === id);
};

export const getCustomerById = (id: string): Customer | undefined => {
  return customers.find(customer => customer.id === id);
};

export const searchBooks = (keyword: string, category?: BookCategory | 'all'): Book[] => {
  const lowerKeyword = keyword.toLowerCase().trim();
  
  let result = books.filter(book => {
    if (category && category !== 'all' && book.category !== category) {
      return false;
    }
    if (!lowerKeyword) {
      return true;
    }
    return (
      book.title.toLowerCase().includes(lowerKeyword) ||
      book.author.toLowerCase().includes(lowerKeyword) ||
      book.isbn.includes(lowerKeyword)
    );
  });
  
  return result;
};

export const getRecommendations = (bookId: string, count: number = 3): Book[] => {
  const currentBook = books.find(b => b.id === bookId);
  if (!currentBook) {
    return books.slice(0, count);
  }
  
  const currentTags = new Set(currentBook.tags);
  
  const scoredBooks = books
    .filter(book => book.id !== bookId)
    .map(book => {
      const commonTags = book.tags.filter(tag => currentTags.has(tag)).length;
      const tagScore = commonTags / Math.max(currentTags.size, 1);
      const popularityScore = book.borrowCount / 100;
      const totalScore = tagScore * 0.7 + popularityScore * 0.3;
      return { book, score: totalScore };
    })
    .sort((a, b) => b.score - a.score);
  
  return scoredBooks.slice(0, count).map(item => item.book);
};

export const getRecommendationsByTags = (tags: string[], count: number = 3): Book[] => {
  if (tags.length === 0) {
    return books.slice(0, count);
  }
  
  const tagSet = new Set(tags);
  
  const scoredBooks = books.map(book => {
    const commonTags = book.tags.filter(tag => tagSet.has(tag)).length;
    const tagScore = commonTags / Math.max(tagSet.size, 1);
    const popularityScore = book.borrowCount / 100;
    const totalScore = tagScore * 0.7 + popularityScore * 0.3;
    return { book, score: totalScore };
  })
  .sort((a, b) => b.score - a.score);
  
  return scoredBooks.slice(0, count).map(item => item.book);
};

export const addBorrowRecord = (bookId: string, customerId: string, dueDate: string): BorrowRecord | null => {
  const book = books.find(b => b.id === bookId);
  const customer = customers.find(c => c.id === customerId);
  
  if (!book || !customer || book.stock <= 0) {
    return null;
  }
  
  const newRecord: BorrowRecord = {
    id: uuidv4(),
    bookId,
    customerId,
    borrowDate: new Date().toISOString().split('T')[0],
    dueDate,
    status: 'borrowing'
  };
  
  borrowRecords.push(newRecord);
  book.stock -= 1;
  book.borrowCount += 1;
  
  return newRecord;
};

export const returnBook = (recordId: string): BorrowRecord | null => {
  const record = borrowRecords.find(r => r.id === recordId);
  
  if (!record || record.status === 'returned') {
    return null;
  }
  
  record.returnDate = new Date().toISOString().split('T')[0];
  record.status = 'returned';
  
  const book = books.find(b => b.id === record.bookId);
  if (book) {
    book.stock += 1;
  }
  
  return record;
};

export const searchBorrowRecords = (keyword: string = ''): BorrowRecord[] => {
  if (!keyword.trim()) {
    return [...borrowRecords];
  }
  
  const lowerKeyword = keyword.toLowerCase().trim();
  
  return borrowRecords.filter(record => {
    const customer = customers.find(c => c.id === record.customerId);
    if (!customer) return false;
    
    return (
      customer.name.toLowerCase().includes(lowerKeyword) ||
      customer.memberNo.toLowerCase().includes(lowerKeyword)
    );
  });
};

export const getBorrowRecordsByCustomer = (customerId: string): BorrowRecord[] => {
  return borrowRecords.filter(record => record.customerId === customerId);
};

export const getCustomerStats = (customerId: string): CustomerStats | null => {
  const customer = customers.find(c => c.id === customerId);
  if (!customer) return null;
  
  const customerRecords = borrowRecords.filter(r => r.customerId === customerId);
  
  const totalBorrows = customerRecords.length;
  const currentBorrows = customerRecords.filter(r => r.status === 'borrowing' || r.status === 'overdue').length;
  
  const categoryCount: Record<string, number> = {};
  customerRecords.forEach(record => {
    const book = books.find(b => b.id === record.bookId);
    if (book) {
      categoryCount[book.category] = (categoryCount[book.category] || 0) + 1;
    }
  });
  
  let favoriteCategory = '暂无';
  let maxCount = 0;
  Object.entries(categoryCount).forEach(([category, count]) => {
    if (count > maxCount) {
      maxCount = count;
      favoriteCategory = category;
    }
  });
  
  return {
    totalBorrows,
    currentBorrows,
    favoriteCategory
  };
};

export const getBookBorrowHistory = (bookId: string): BorrowRecord[] => {
  return borrowRecords
    .filter(record => record.bookId === bookId)
    .sort((a, b) => new Date(b.borrowDate).getTime() - new Date(a.borrowDate).getTime());
};

export const getStatusLabel = (status: BorrowStatus): string => {
  const labels: Record<BorrowStatus, string> = {
    borrowing: '在借',
    returned: '已还',
    overdue: '逾期'
  };
  return labels[status];
};
