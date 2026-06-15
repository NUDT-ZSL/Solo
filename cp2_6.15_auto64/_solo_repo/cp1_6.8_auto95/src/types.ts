export interface Letter {
  id: string;
  title: string;
  content?: string;
  encrypted_content?: string;
  emotion: EmotionType;
  deliver_at: string;
  status: LetterStatus;
  created_at: string;
  delivered_at?: string | null;
  remaining_days?: number;
  owner_token?: string;
  email?: string;
  notified?: boolean;
}

export type EmotionType = 'happy' | 'sad' | 'calm' | 'hope' | 'love' | 'nostalgic';

export type LetterStatus = 'sealed' | 'delivered' | 'opened';

export const EMOTION_LABELS: Record<EmotionType, string> = {
  happy: '快乐',
  sad: '忧伤',
  calm: '平静',
  hope: '希望',
  love: '爱意',
  nostalgic: '怀念',
};

export const EMOTION_ICONS: Record<EmotionType, string> = {
  happy: '☀️',
  sad: '🌧️',
  calm: '🍃',
  hope: '🌟',
  love: '💕',
  nostalgic: '📖',
};

export const EMOTION_COLORS: Record<EmotionType, string> = {
  happy: '#D4A843',
  sad: '#7B8FA1',
  calm: '#8FBC8F',
  hope: '#E8B94A',
  love: '#C97B84',
  nostalgic: '#A0826D',
};
