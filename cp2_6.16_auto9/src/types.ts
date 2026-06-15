export enum BrickType {
  Cube = 'cube',
  Cuboid = 'cuboid',
  TriangularPrism = 'triangular_prism',
  Cylinder = 'cylinder',
  Sphere = 'sphere'
}

export interface BrickInfo {
  type: BrickType;
  name: string;
  color: string;
}

export interface BrickData {
  id: string;
  type: BrickType;
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number; z: number };
}

export interface UndoAction {
  type: 'add' | 'remove';
  brickData: BrickData;
}

export const BRICK_LIBRARY: BrickInfo[] = [
  { type: BrickType.Cube, name: '1x1立方体', color: '#e74c3c' },
  { type: BrickType.Cuboid, name: '1x2长方体', color: '#3498db' },
  { type: BrickType.TriangularPrism, name: '1x1三角柱', color: '#2ecc71' },
  { type: BrickType.Cylinder, name: '1x1圆柱', color: '#f1c40f' },
  { type: BrickType.Sphere, name: '1x1球体', color: '#9b59b6' }
];

export const MAX_BRICKS = 150;
export const WARNING_THRESHOLD = 120;
export const MAX_UNDO_STEPS = 50;
