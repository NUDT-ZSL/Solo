export type EmotionType = 'happy' | 'calm' | 'bored' | 'irritated' | 'crying';

export type EmotionLevel = 1 | 2 | 3 | 4 | 5;

export type BookCategory = 'adventure' | 'interactive' | 'classic';

export interface Book {
  id: string;
  title: string;
  category: BookCategory;
  coverGradient: string;
}

export interface DiaryRecord {
  id?: number;
  bookId: string;
  duration: number;
  emotion: EmotionType;
  date: string;
  createdAt?: string;
}

export interface DailyStats {
  date: string;
  emotionLevel: EmotionLevel;
  duration: number;
  emotion: EmotionType;
}

export interface Recommendation {
  books: Book[];
  reason: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
