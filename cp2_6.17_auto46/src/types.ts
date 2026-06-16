export interface Plant {
  id: string;
  name: string;
  latinName: string;
  avatar: string;
  healthStatus: 'healthy' | 'warning' | 'danger';
  light: number;
  moisture: number;
  temperature: number;
  createdAt: string;
  description?: string;
}

export interface CareRecord {
  id: string;
  plantId: string;
  type: 'water' | 'fertilize' | 'repot' | 'prune' | 'other';
  description: string;
  time: string;
  note?: string;
  likes: number;
  liked: boolean;
}

export interface FeedItem extends CareRecord {
  plantName: string;
  plantAvatar: string;
}

export interface ExchangeItem {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  title: string;
  description: string;
  images: string[];
  location: { lat: number; lng: number; address: string };
  type: 'give' | 'want' | 'exchange';
  createdAt: string;
}

export interface Message {
  id: string;
  exchangeId: string;
  fromUserId: string;
  fromUserName: string;
  content: string;
  createdAt: string;
}
