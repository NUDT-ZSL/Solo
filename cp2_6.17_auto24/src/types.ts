export interface User {
  id: string;
  username: string;
  password: string;
  phone: string;
  createdAt: string;
}

export interface Station {
  id: string;
  name: string;
  line: string;
  x: number;
  y: number;
}

export type ItemType = 'lost' | 'found';
export type ItemStatus = 'open' | 'matched' | 'claimed';

export interface Item {
  id: string;
  type: ItemType;
  title: string;
  description: string;
  stationId: string;
  stationName: string;
  location: string;
  time: string;
  contact: string;
  imageUrl: string;
  userId: string;
  username: string;
  status: ItemStatus;
  createdAt: string;
  keywords: string[];
}

export type MessageType = 'match_success' | 'match_possible' | 'system';

export interface Message {
  id: string;
  type: MessageType;
  userId: string;
  title: string;
  content: string;
  itemId?: string;
  matchedItemId?: string;
  read: boolean;
  createdAt: string;
}

export interface MatchResult {
  item: Item;
  matchedItem: Item;
  score: number;
  type: 'success' | 'possible';
}
