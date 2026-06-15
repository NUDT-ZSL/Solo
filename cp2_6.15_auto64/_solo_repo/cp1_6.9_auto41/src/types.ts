export type EmotionType =
  | 'happy'
  | 'sad'
  | 'angry'
  | 'calm'
  | 'anxious'
  | 'surprised';

export interface EmotionRecord {
  id: string;
  date: string;
  type: EmotionType;
  intensity: number;
  note: string;
  timestamp: number;
}

export const EMOTION_CONFIG: Record<
  EmotionType,
  { label: string; color: string; gradient: [string, string] }
> = {
  happy: {
    label: '快乐',
    color: '#FFD700',
    gradient: ['#FFE066', '#FFD700'],
  },
  sad: {
    label: '悲伤',
    color: '#4A90D9',
    gradient: ['#7AB4E8', '#4A90D9'],
  },
  angry: {
    label: '愤怒',
    color: '#FF6B6B',
    gradient: ['#FF9999', '#FF6B6B'],
  },
  calm: {
    label: '平静',
    color: '#2ECC71',
    gradient: ['#6EE3A0', '#2ECC71'],
  },
  anxious: {
    label: '焦虑',
    color: '#9B59B6',
    gradient: ['#BE87D4', '#9B59B6'],
  },
  surprised: {
    label: '惊喜',
    color: '#F39C12',
    gradient: ['#F7BA57', '#F39C12'],
  },
};

export const INTENSITY_LABELS = [
  '极弱',
  '轻微',
  '中等',
  '较强',
  '强烈',
  '极其强烈',
];

export const EMOTION_TYPES: EmotionType[] = [
  'happy',
  'sad',
  'angry',
  'calm',
  'anxious',
  'surprised',
];
