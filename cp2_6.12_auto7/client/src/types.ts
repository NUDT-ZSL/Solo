export type CardColor = 'red' | 'orange' | 'yellow' | 'green' | 'blue' | 'purple';

export interface CardVotes {
  up: string[];
  down: string[];
}

export interface Card {
  id: string;
  title: string;
  description: string;
  color: CardColor;
  x: number;
  y: number;
  votes: CardVotes;
  createdAt: number;
  updatedAt: number;
  createdBy: string;
}

export interface OnlineUser {
  id: string;
  name: string;
  avatarColor: string;
  cursor?: { x: number; y: number };
  editingCardId?: string | null;
}

export type SortMode = 'color' | 'heat' | 'time';

export type ConnectionStatus = 'connecting' | 'connected' | 'reconnecting' | 'disconnected';
