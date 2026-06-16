export interface User {
  id: string;
  username: string;
  avatar: string;
  points: number;
  reputation: number;
  location: { lat: number; lng: number };
}

export interface ExchangeRecord {
  fromUserId: string;
  toUserId: string;
  time: string;
  message: string;
}

export interface Item {
  id: string;
  name: string;
  description: string;
  category: string;
  condition: string;
  points: number;
  image: string;
  ownerId: string;
  ownerName: string;
  createdAt: string;
  status: string;
  location: { lat: number; lng: number };
  exchangeHistory: ExchangeRecord[];
}

export interface Transaction {
  id: string;
  itemId: string;
  itemName: string;
  itemImage: string;
  fromUserId: string;
  toUserId: string;
  points: number;
  time: string;
  type: 'receive' | 'give';
  direction?: 'receive' | 'give';
  otherUserName?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
}
