export type ExhibitCategory = '绘画' | '雕塑' | '装置';

export type Rotation = 0 | 90 | 180 | 270;

export interface Wall {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: Rotation;
  isSnapping: boolean;
}

export interface ExhibitItem {
  id: string;
  name: string;
  thumbnail: string;
  physicalWidth: number;
  physicalHeight: number;
  colorTag: string;
  category: ExhibitCategory;
}

export interface PlacedExhibit {
  id: string;
  exhibitId: string;
  name: string;
  colorTag: string;
  physicalWidth: number;
  physicalHeight: number;
  x: number;
  y: number;
}

export interface LightSource {
  id: string;
  x: number;
  y: number;
  intensity: number;
}

export type ElementType = 'wall' | 'exhibit' | 'light';

export interface SelectedElement {
  type: ElementType;
  id: string;
}

export interface SnapResult {
  snapped: boolean;
  x: number;
  y: number;
  snapAxis: 'x' | 'y' | 'both' | null;
}

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
