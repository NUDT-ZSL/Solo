export interface Stage {
  id: string;
  name: string;
  artistName: string;
  artistAvatar: string;
  performanceTime: string;
  audioUrl: string;
  backgroundColor: string;
  particlePreset: string;
  createdAt: string;
}

export interface Ticket {
  id: string;
  userId: string;
  stageId: string;
  nickname: string;
  hash: string;
  seatNumber: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  nickname: string;
  avatar: string;
  content: string;
  timestamp: string;
  stageId: string;
}

export interface WebSocketMessage {
  type: 'join' | 'leave' | 'chat' | 'onlineCount';
  data: {
    stageId?: string;
    userId?: string;
    nickname?: string;
    avatar?: string;
    content?: string;
    timestamp?: string;
    count?: number;
    message?: ChatMessage;
  };
}
