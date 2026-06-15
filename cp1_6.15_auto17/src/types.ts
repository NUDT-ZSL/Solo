export type Genre = 'impressionism' | 'modern' | 'sculpture';
export type ArtworkType = 'painting' | 'sculpture';

export interface Artwork {
  id: string;
  title: string;
  artist: string;
  year: number;
  genre: Genre;
  type: ArtworkType;
  width: number;
  height: number;
  color: string;
}

export interface PlacedItem {
  id: string;
  artworkId: string;
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface FilterState {
  genre: 'all' | Genre;
  yearRange: [number, number];
}

export interface DragPreview {
  artwork: Artwork;
  x: number;
  y: number;
  visible: boolean;
}

export interface AnimatingItem {
  id: string;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  startTime: number;
  duration: number;
}
