export interface Point {
  x: number;
  y: number;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface Region {
  id: number;
  seedPoint: Point;
  bounds: Bounds;
  pixelCount: number;
  color: string;
  pixels: Point[];
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSV {
  h: number;
  s: number;
  v: number;
}

export interface ColorScheme {
  name: string;
  colors: string[];
}

export interface SavedSchemeRegion {
  id: number;
  hex: string;
  seedPoint: Point;
}

export interface SavedScheme {
  regions: SavedSchemeRegion[];
  timestamp: number;
}
