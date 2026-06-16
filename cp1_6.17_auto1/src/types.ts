export interface Character {
  id: string;
  name: string;
  type: 'vocal' | 'guitar' | 'drum' | 'bass';
  color: string;
  key: string;
  icon: string;
}

export interface StagePosition {
  id: string;
  name: string;
  x: number;
  y: number;
  character: Character | null;
}

export interface Note {
  id: string;
  key: string;
  timestamp: number;
  trackIndex: number;
  duration?: number;
  type?: 'normal' | 'sharp' | 'flat' | 'dotted' | 'syncopated';
  hit?: boolean;
  missed?: boolean;
}

export interface Song {
  id: string;
  name: string;
  bpm: number;
  duration: number;
  difficulty: 'easy' | 'normal' | 'hard';
}

export interface HitResult {
  judgement: 'Perfect' | 'Good' | 'OK' | 'Miss';
  score: number;
  timeDiff: number;
}

export interface ScoreRecord {
  id?: string;
  playerName: string;
  songId: string;
  songName: string;
  totalScore: number;
  rating: 'S' | 'A' | 'B' | 'C';
  accuracy: number;
  perfectCount: number;
  goodCount: number;
  okCount: number;
  missCount: number;
  createdAt?: Date;
}

export type GameView = 'stage' | 'select' | 'game' | 'result';

export interface GameState {
  notes: Note[];
  currentTime: number;
  score: number;
  combo: number;
  maxCombo: number;
  perfectCount: number;
  goodCount: number;
  okCount: number;
  missCount: number;
  isPlaying: boolean;
  currentSong: Song | null;
}
