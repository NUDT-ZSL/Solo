export interface HighDimPoint {
  id: number;
  features: number[];
  category: number;
}

export interface ReducedPoint {
  id: number;
  x: number;
  y: number;
  z: number;
  category: number;
  features: number[];
}

export const CATEGORY_COLORS: string[] = [
  '#ff5577',
  '#55ff99',
  '#5599ff',
  '#ffaa33',
  '#cc66ff',
];

export const CATEGORY_NAMES: string[] = [
  '类别A',
  '类别B',
  '类别C',
  '类别D',
  '类别E',
];
