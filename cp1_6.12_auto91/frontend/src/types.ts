export type EmotionType = 'joy' | 'surprise' | 'sadness' | 'anger' | 'fear' | 'all';

export interface TimelinePoint {
  time: string;
  timestamp: number;
  avg_sentiment: number;
  comment_count: number;
  emotion_distribution: Record<Exclude<EmotionType, 'all'>, number>;
}

export interface Comment {
  id: string;
  text: string;
  time: string;
  timestamp: number;
  emotion: Exclude<EmotionType, 'all'>;
  emotion_label: string;
  score: number;
  user: string;
}

export interface MediaItem {
  id: string;
  image_url: string;
  thumbnail_url: string;
  caption: string;
  time: string;
  timestamp: number;
  emotion: Exclude<EmotionType, 'all'>;
  emotion_label: string;
  likes: number;
  user: string;
  related_comment_id: string | null;
}

export interface EmotionSummary {
  count: number;
  ratio: number;
  score: number;
}

export interface Stats {
  total_comments: number;
  total_media: number;
  avg_sentiment: number;
}

export interface InitialData {
  event_name: string;
  event_date: string;
  event_duration: string;
  stats: Stats;
  timeline: TimelinePoint[];
  comments: Comment[];
  media: MediaItem[];
  emotion_summary: Record<Exclude<EmotionType, 'all'>, EmotionSummary>;
}

export interface SentimentResult {
  text: string;
  emotion: Exclude<EmotionType, 'all'>;
  emotion_label: string;
  score: number;
  emotion_scores: Record<Exclude<EmotionType, 'all'>, number>;
}

export const EMOTION_LABELS_CN: Record<Exclude<EmotionType, 'all'>, string> = {
  joy: '喜悦',
  surprise: '惊讶',
  sadness: '悲伤',
  anger: '愤怒',
  fear: '恐惧',
};

export const EMOTION_COLORS: Record<Exclude<EmotionType, 'all'>, string> = {
  joy: '#4caf50',
  surprise: '#ffc107',
  sadness: '#2196f3',
  anger: '#f44336',
  fear: '#9c27b0',
};

export const EMOTION_EMOJI: Record<Exclude<EmotionType, 'all'>, string> = {
  joy: '😊',
  surprise: '😲',
  sadness: '😢',
  anger: '😠',
  fear: '😨',
};
