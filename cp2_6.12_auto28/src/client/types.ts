export interface Player {
  id: string;
  name: string;
  avatar: string;
  score: number;
  isHost: boolean;
  isAnswered: boolean;
  lastAnswerCorrect: boolean | null;
}

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: string;
}

export interface RankingEntry {
  playerId: string;
  playerName: string;
  avatar: string;
  score: number;
  rank: number;
}

export type Category = 'tech' | 'history' | 'entertainment';
export type TimeLimit = 10 | 15 | 20;
export type QuestionCount = 5 | 10 | 15;
export type GamePhase = 'waiting' | 'playing' | 'intermission' | 'ended';

export interface RoomConfig {
  roomName: string;
  category: Category;
  questionCount: QuestionCount;
  timeLimit: TimeLimit;
}

export const CATEGORY_LABELS: Record<Category, string> = {
  tech: '科技',
  history: '历史',
  entertainment: '娱乐',
};

export const AVATARS = [
  '🦊', '🐼', '🦁', '🐯', '🐸', '🦄', '🐙', '🦋',
  '🐲', '🦅', '🐺', '🦊', '🐻', '🐨', '🐵', '🐷',
];
