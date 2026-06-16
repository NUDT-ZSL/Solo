export interface User {
  id: string;
  nickname: string;
  email: string;
  avatar: string;
  points: number;
  isAdmin: boolean;
  createdAt: string;
}

export interface Book {
  id: string;
  title: string;
  author: string;
  isbn: string;
  coverUrl: string;
  condition: string;
  ownerId: string;
  createdAt: string;
}

export interface ExchangeRequest {
  id: string;
  bookId: string;
  requesterId: string;
  ownerId: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
}

export interface TransferNode {
  fromUserId: string;
  toUserId: string;
  timestamp: string;
  note: string;
}

export interface ExchangeRecord {
  id: string;
  bookId: string;
  currentHolderId: string;
  previousHolderId: string;
  lentAt: string;
  expectedReturnAt: string;
  returnedAt: string | null;
  status: 'active' | 'completed' | 'closed';
  chain: TransferNode[];
}

export interface AdminStats {
  totalBooks: number;
  activeExchanges: number;
  completedExchanges: number;
}
