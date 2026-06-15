export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export interface VoicePart {
  id: string;
  name: string;
  difficulty: Difficulty;
  pdfUrl?: string;
  progress: number;
  targetRange: string;
  color: string;
}

export interface Piece {
  id: string;
  title: string;
  composer: string;
  key: string;
  voiceParts: VoicePart[];
  createdAt: string;
  updatedAt: string;
}

export interface DailyProgress {
  date: string;
  voicePartId: string;
  pieceId: string;
  progress: number;
}

export interface AppState {
  pieces: Piece[];
  historyData: DailyProgress[];
}

export type AppAction =
  | { type: 'ADD_PIECE'; payload: Piece }
  | { type: 'UPDATE_PIECE'; payload: Piece }
  | { type: 'DELETE_PIECE'; payload: string }
  | { type: 'UPDATE_VOICE_PROGRESS'; payload: { pieceId: string; voicePartId: string; increment: number } }
  | { type: 'UPDATE_TARGET_RANGE'; payload: { pieceId: string; voicePartId: string; targetRange: string } }
  | { type: 'LOAD_INITIAL_DATA'; payload: { pieces: Piece[]; historyData: DailyProgress[] } };
