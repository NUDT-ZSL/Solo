export interface Histogram {
  r: number;
  g: number;
  b: number;
}

export interface Composition {
  centerX: number;
  centerY: number;
  symmetry: number;
  density: number;
}

export interface Features {
  histogram: Histogram;
  composition: Composition;
  dominantColor: string;
}

export interface ImageItem {
  id: string;
  title: string;
  filename: string;
  originalName: string;
  mimetype: string;
  size: number;
  url: string;
  thumbnail: string;
  author: string;
  createdAt: string;
  features: Features;
}

export interface NetworkNode {
  id: string;
  isCenter?: boolean;
  similarity?: number;
  title: string;
  thumbnail: string;
  url: string;
  createdAt: string;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface NetworkLink {
  source: string;
  target: string;
  similarity: number;
}

export interface NetworkData {
  nodes: NetworkNode[];
  links: NetworkLink[];
}

export type SortOption = 'newest' | 'oldest';
export type ColorOption = 'all' | 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'cyan';
