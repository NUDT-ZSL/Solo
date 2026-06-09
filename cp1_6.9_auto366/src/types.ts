export type Mood = 'happy' | 'sad' | 'angry' | 'calm' | 'surprised';

export interface MoodInfo {
  label: string;
  color: string;
  emoji: string;
}

export const MOOD_MAP: Record<Mood, MoodInfo> = {
  happy: { label: '快乐', color: '#FFD700', emoji: '😊' },
  sad: { label: '忧伤', color: '#6A5ACD', emoji: '😢' },
  angry: { label: '愤怒', color: '#FF4500', emoji: '😠' },
  calm: { label: '平静', color: '#2E8B57', emoji: '😌' },
  surprised: { label: '惊喜', color: '#FF69B4', emoji: '🎉' },
};

export interface Capsule {
  id: string;
  user_id: string;
  title: string;
  content: string;
  mood: Mood;
  created_at: string;
  unlock_at: string;
  is_read: boolean;
  is_notified?: boolean;
}

export interface CreateCapsuleRequest {
  user_id: string;
  title: string;
  content: string;
  mood: Mood;
  unlock_at: string;
}

export interface CapsuleSummary {
  id: string;
  title: string;
  summary: string;
  mood: Mood;
  created_at: string;
  unlock_at: string;
  is_unlocked: boolean;
  is_read: boolean;
}

export interface Notification {
  capsule_id: string;
  title: string;
  message: string;
}

export interface TimeRange {
  min: Date;
  max: Date;
}
