export interface Point {
  x: number;
  y: number;
  pressure: number;
  timestamp: number;
}

export interface Stroke {
  id: string;
  points: Point[];
  brushSize: number;
  opacity: number;
  color: string;
}

export interface Rubbing {
  id: string;
  name: string;
  imageUrl: string;
  uploadedAt: number;
  isExample?: boolean;
}

export interface CharacterClip {
  id: string;
  rubbingId: string;
  imageDataUrl: string;
  char?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  scale: number;
}

export interface ScoreResult {
  score: number;
  angleDeviation: number;
  pressureSimilarity: number;
  pixelOverlap: number;
  highlighAreas: HighlightArea[];
}

export interface HighlightArea {
  x: number;
  y: number;
  radius: number;
  deviation: number;
}

export interface HistoryState {
  strokes: Stroke[];
  characters: CharacterClip[];
  timestamp: number;
}

export type Mode = 'copy' | 'creation';
