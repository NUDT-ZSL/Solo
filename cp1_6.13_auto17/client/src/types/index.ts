export interface User {
  _id: string;
  nickname: string;
  email: string;
  createdAt: number;
  avatar?: string;
}

export interface Skill {
  _id: string;
  userId: string;
  userNickname: string;
  name: string;
  description: string;
  tags: string[];
  createdAt: number;
}

export interface ExchangeRequest {
  _id: string;
  fromUserId: string;
  toUserId: string;
  skillId: string;
  skillName: string;
  status: 'pending' | 'confirmed' | 'completed';
  createdAt: number;
  fromUser?: User;
  toUser?: User;
  skill?: Skill;
}

export interface Message {
  _id: string;
  exchangeId: string;
  fromUserId: string;
  toUserId: string;
  content: string;
  read: boolean;
  createdAt: number;
}

export interface AppContextType {
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  ws: WebSocket | null;
  unreadCount: number;
  setUnreadCount: (count: number) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
}

export interface ToastItem {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}
