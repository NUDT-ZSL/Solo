export type EmotionType = 'joy' | 'sadness' | 'nostalgia' | 'confusion' | 'surprise';

export const EMOTION_COLORS: Record<EmotionType, string> = {
  joy: '#FFD700',
  sadness: '#4A90D9',
  nostalgia: '#E67E22',
  confusion: '#9B59B6',
  surprise: '#2ECC71'
};

export const EMOTION_LABELS: Record<EmotionType, string> = {
  joy: '喜悦',
  sadness: '忧伤',
  nostalgia: '怀念',
  confusion: '困惑',
  surprise: '惊喜'
};

export const EMOTION_EMOJIS: Record<EmotionType, string> = {
  joy: '😊',
  sadness: '😢',
  nostalgia: '🍂',
  confusion: '🤔',
  surprise: '✨'
};

export interface Story {
  id: string;
  title: string;
  content: string;
  emotion: EmotionType;
  createdAt: string;
  replyCount: number;
}

export interface Reply {
  id: string;
  storyId: string;
  content: string;
  type: 'text' | 'voice';
  emotion: EmotionType;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  hasMore: boolean;
  total: number;
  page: number;
}

export interface UserStats {
  totalStories: number;
  totalReplies: number;
  mostCommonEmotion: EmotionType;
  streakDays: number;
}

export interface CalendarDayData {
  count: number;
  emotions: Record<string, number>;
}

export type CalendarData = Record<string, CalendarDayData>;
