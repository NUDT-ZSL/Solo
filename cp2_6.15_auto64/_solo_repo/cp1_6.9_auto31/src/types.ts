export interface Emotion {
  color: string;
  label: string;
  key: string;
}

export interface Bottle {
  id: string;
  color: string;
  text: string;
  createdAt: number;
  emojis: string[];
  emojiCount?: number;
}

export interface FloatingBottle extends Bottle {
  x: number;
  startTime: number;
}

export const EMOTIONS: Emotion[] = [
  { key: 'happy', color: '#FFD93D', label: '愉快' },
  { key: 'calm', color: '#6BCB77', label: '平静' },
  { key: 'sad', color: '#4D96FF', label: '忧伤' },
  { key: 'angry', color: '#FF6B6B', label: '愤怒' },
  { key: 'anxious', color: '#C084FC', label: '焦虑' },
  { key: 'tired', color: '#A5A5A5', label: '疲惫' },
  { key: 'surprised', color: '#FF8E53', label: '惊喜' },
  { key: 'miss', color: '#FF6B8A', label: '思念' }
];

export const REACTION_EMOJIS = ['😊', '😔', '😡', '😢', '😍', '🤔', '😌', '😄'];
