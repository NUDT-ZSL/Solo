export interface Character {
  id: string;
  name: string;
  role: string;
  color: string;
  key: string;
  icon: string;
}

export interface Song {
  id: string;
  name: string;
  bpm: number;
  duration: number;
  difficulty: string;
}

export interface ScoreEntry {
  id: string;
  playerName: string;
  songId: string;
  songName: string;
  totalScore: number;
  grade: string;
  hitRate: number;
  timestamp: number;
}

export interface StagePosition {
  id: string;
  name: string;
  x: number;
  y: number;
}

export interface PlacedCharacter {
  characterId: string;
  positionId: string;
  character: Character;
}

export type GameView = 'stage' | 'songSelect' | 'game' | 'result';
