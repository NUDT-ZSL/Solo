export interface VoteHistoryItem {
  type: 'up' | 'down';
  timestamp: string;
  score: number;
}

export interface Card {
  id: string;
  title: string;
  description: string;
  color: string;
  upvotes: number;
  downvotes: number;
  voteHistory: VoteHistoryItem[];
}

export type AvailableColor = '#FF6B6B' | '#4ECDC4' | '#45B7D1' | '#96CEB4' | '#FFEAA7';

export const AVAILABLE_COLORS: AvailableColor[] = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
];
