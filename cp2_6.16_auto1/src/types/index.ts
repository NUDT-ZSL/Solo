export type {
  EmotionType,
  EmotionLevel,
  BookCategory,
  Book,
  DiaryRecord,
  DailyStats,
  Recommendation,
  ApiResponse,
} from '../../shared/types';

export interface EmotionConfig {
  emoji: string;
  label: string;
  level: number;
  color: string;
}

export type PageType = 'home' | 'entry' | 'stats';
