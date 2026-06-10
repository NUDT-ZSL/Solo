export type NoteShape = 'circle' | 'triangle' | 'diamond';

export type HitType = 'perfect' | 'good' | 'miss';

export type GameState = 'menu' | 'loading' | 'playing' | 'paused' | 'ended' | 'replay';

export interface Note {
  id: number;
  shape: NoteShape;
  x: number;
  y: number;
  speed: number;
  color: string;
  size: number;
  spawnTime: number;
  hit?: boolean;
  missed?: boolean;
  falling?: boolean;
  fallVelocity?: { vx: number; vy: number };
}

export interface HitResult {
  note: Note;
  type: HitType;
  position: { x: number; y: number };
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'ring' | 'star' | 'fall' | 'sparkle';
  rotation?: number;
  rotationSpeed?: number;
}

export interface Track {
  id: string;
  name: string;
  bpm: number;
  duration: number;
  themeColor: string;
  difficulty: number;
  color: 'warm' | 'cool' | 'dark';
}

export interface ReplayRecord {
  timestamp: number;
  shape?: NoteShape;
  hitResult?: HitType;
  noteId?: number;
}

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  totalNotes: number;
  hitNotes: number;
  perfectNotes: number;
  goodNotes: number;
  missedNotes: number;
}

export const NOTE_COLORS: Record<NoteShape, string> = {
  circle: '#FF6B6B',
  triangle: '#4ECDC4',
  diamond: '#FFD93D'
};

export const TRACKS: Track[] = [
  {
    id: 'waltz',
    name: '快乐圆舞曲',
    bpm: 120,
    duration: 45,
    themeColor: '#FF8C42',
    difficulty: 1,
    color: 'warm'
  },
  {
    id: 'electronic',
    name: '迷幻电子',
    bpm: 140,
    duration: 50,
    themeColor: '#845EC2',
    difficulty: 2,
    color: 'cool'
  },
  {
    id: 'battle',
    name: '战斗进行曲',
    bpm: 160,
    duration: 40,
    themeColor: '#D65A5A',
    difficulty: 3,
    color: 'dark'
  }
];
