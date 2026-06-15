export type Emotion = 'happy' | 'sad' | 'angry' | 'calm' | 'fear';

export interface BottleReactions {
  like: number;
  comfort: number;
  sigh: number;
}

export interface BottleData {
  id: string;
  emotion: Emotion;
  content: string;
  position: [number, number, number];
  reactions: BottleReactions;
  created_at: string;
}

export const EMOTION_CONFIG: Record<Emotion, { label: string; color: string; hex: number; particleColor: string; glowColor: string }> = {
  happy: { label: '快乐', color: '#F6C344', hex: 0xF6C344, particleColor: '#FFD700', glowColor: 'rgba(246,195,68,0.6)' },
  sad: { label: '忧伤', color: '#7EB8DA', hex: 0x7EB8DA, particleColor: '#4A90D9', glowColor: 'rgba(126,184,218,0.6)' },
  angry: { label: '愤怒', color: '#E8734A', hex: 0xE8734A, particleColor: '#FF6347', glowColor: 'rgba(232,115,74,0.6)' },
  calm: { label: '平静', color: '#48BB78', hex: 0x48BB78, particleColor: '#66CDAA', glowColor: 'rgba(72,187,120,0.6)' },
  fear: { label: '恐惧', color: '#8B7E9B', hex: 0x8B7E9B, particleColor: '#9370DB', glowColor: 'rgba(139,126,155,0.6)' },
};

export const EMOTIONS: Emotion[] = ['happy', 'sad', 'angry', 'calm', 'fear'];

export interface AnalysisResult {
  keywords: string[];
  poem: string;
  emotion: Emotion;
}
