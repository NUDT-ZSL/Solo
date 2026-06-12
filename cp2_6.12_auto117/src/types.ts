export interface Exhibit {
  id: string;
  roomId: string;
  name: string;
  artist: string;
  year: string;
  material: string;
  description: string;
  thumbnail: string;
  gridX: number | null;
  gridY: number | null;
  rotation: number;
  spacing: number;
  isPlaced: boolean;
}

export interface DragState {
  isDragging: boolean;
  exhibitId: string | null;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
}

export type ViewMode = 'home' | 'room';
