export interface Mood {
  id: string;
  mood: string;
  note: string;
  tags: string[];
  createdAt: number;
}

export interface MoodConfig {
  emoji: string;
  label: string;
  value: number;
  color: string;
}

export interface TrendDataPoint {
  date: string;
  value: number | null;
  count: number;
  moodCounts: Record<string, number>;
}

export interface TrendResponse {
  trendData: TrendDataPoint[];
  totalRecords: number;
  period: string;
}

export const moodConfigs: Record<string, MoodConfig> = {
  happy: { emoji: '😊', label: '开心', value: 5, color: '#ffeaa7' },
  calm: { emoji: '😌', label: '平静', value: 4, color: '#81ecec' },
  sad: { emoji: '😢', label: '悲伤', value: 2, color: '#74b9ff' },
  angry: { emoji: '😠', label: '愤怒', value: 1, color: '#ff7675' },
  anxious: { emoji: '😰', label: '焦虑', value: 2, color: '#a29bfe' },
  tired: { emoji: '😴', label: '疲惫', value: 3, color: '#b2bec3' }
};

export const moodList = ['happy', 'calm', 'sad', 'angry', 'anxious', 'tired'];
