export interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: string;
  image: string;
  description: string;
}

export interface Hall {
  id: string;
  name: string;
  theme: string;
  thumbnail: string;
  gradientFrom: string;
  gradientTo: string;
  particleType: 'dots' | 'petals' | 'pixels';
  artworks: Artwork[];
}

export interface ChatMessage {
  type: 'chat' | 'system';
  userName: string;
  userColor: string;
  content: string;
  timestamp: number;
}

export interface OnlineUsersMessage {
  type: 'online';
  count: number;
  userName?: string;
  action?: 'join' | 'leave';
}

export type WebSocketMessage = ChatMessage | OnlineUsersMessage;
