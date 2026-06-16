export type RoastLevel = 'light' | 'medium' | 'dark';
export type ProcessMethod = 'washed' | 'natural' | 'honey';
export type FlavorCategory = 'floral' | 'fruity' | 'nutty' | 'chocolate' | 'spicy';
export type TargetType = 'gesha' | 'mandheling';

export interface User {
  id: string;
  username: string;
  avatar: string;
  score: number;
  lastChallengeTime: number;
  password?: string;
}

export interface FlavorTag {
  id: string;
  name: string;
  category: FlavorCategory;
  color: string;
}

export interface CoffeeLog {
  id: string;
  userId: string;
  origin: string;
  roastLevel: RoastLevel;
  processMethod: ProcessMethod;
  flavors: string[];
  photoUrl?: string;
  waterTemp?: number;
  grindSize?: string;
  brewTime?: number;
  note?: string;
  likes: number;
  comments: number;
  createdAt: number;
  isChallengeTarget?: boolean;
  targetType?: TargetType;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  score: number;
}

export interface ChallengeQuestion {
  optionA: CoffeeLog;
  optionB: CoffeeLog;
  correctAnswer: 'A' | 'B';
}

export interface GuessResult {
  isCorrect: boolean;
  score: number;
  newStreak: number;
}

export type StatsPeriod = '30d' | '90d' | 'all';

export interface FlavorStats {
  floral: number;
  fruity: number;
  nutty: number;
  chocolate: number;
  spicy: number;
}
