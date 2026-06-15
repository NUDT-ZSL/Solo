export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  latitude: number;
  longitude: number;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  tags: string[];
  condition: '全新' | '九成新' | '有笔记';
  image?: string;
  ownerId: string;
  ownerName: string;
  ownerAvatar?: string;
  latitude: number;
  longitude: number;
  description?: string;
  createdAt: string;
}

export interface Match {
  id: string;
  book1: Book;
  book2: Book;
  matchScore: number;
  userId1: string;
  userId2: string;
}

export interface Exchange {
  id: string;
  bookId: string;
  matchedBookId: string;
  requesterId: string;
  receiverId: string;
  status: 'pending' | 'accepted' | 'rejected' | 'completed';
  createdAt: string;
}

export interface Notification {
  id: string;
  type: 'match' | 'exchange_request' | 'exchange_status';
  userId: string;
  title: string;
  content: string;
  read: boolean;
  createdAt: string;
  relatedId?: string;
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  unreadCount: number;
}

export type BookCondition = '全新' | '九成新' | '有笔记';
