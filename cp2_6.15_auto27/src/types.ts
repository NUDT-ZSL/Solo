export interface CharacterConfig {
  id?: number;
  name: string;
  skinColor: string;
  clothingColor: string;
  hairstyle: number;
  eyeStyle: number;
  createdAt?: string;
}

export interface Keyframe {
  time: number;
  headY: number;
  eyeScale: number;
  bodyRotate: number;
  backgroundColor: string;
}

export interface AnimationSequence {
  id?: number;
  name: string;
  emotion: string;
  duration: number;
  keyframes: Keyframe[];
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface AnimationState {
  isPlaying: boolean;
  currentEmotion: string | null;
  currentFrame: number;
  totalFrames: number;
  progress: number;
}

export const SKIN_COLORS = [
  '#ffdbac',
  '#f1c27d',
  '#e0ac69',
  '#c68642',
  '#8d5524',
  '#5c3317'
];

export const CLOTHING_COLORS = [
  '#e74c3c',
  '#3498db',
  '#2ecc71',
  '#f39c12',
  '#9b59b6'
];

export const HAIRSTYLES = ['短发', '长发', '卷发', '莫西干'];
export const EYE_STYLES = ['微笑', '愤怒', '悲伤', '惊讶'];

export const EMOTIONS = [
  { key: 'happy', name: '开心', emoji: '😊' },
  { key: 'sad', name: '悲伤', emoji: '😢' },
  { key: 'angry', name: '愤怒', emoji: '😠' },
  { key: 'surprised', name: '惊讶', emoji: '😮' },
  { key: 'scared', name: '恐惧', emoji: '😨' },
  { key: 'bored', name: '无聊', emoji: '😴' }
];
