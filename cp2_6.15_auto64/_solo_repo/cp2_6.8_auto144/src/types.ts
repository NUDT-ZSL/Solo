export type ShapeType = 'circle' | 'rectangle' | 'triangle' | 'hexagon';

export interface ShapeData {
  id: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
}

export interface TargetShape {
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  color: string;
  tolerance?: {
    position?: number;
    rotation?: number;
    color?: boolean;
  };
}

export interface PuzzleConfig {
  name: string;
  targetShapes: TargetShape[];
  availableShapes: ShapeType[];
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export const NORDIC_COLORS: { name: string; value: string }[] = [
  { name: '烟灰', value: '#A8A9AD' },
  { name: '薄荷', value: '#7EC8B1' },
  { name: '粉晶', value: '#F4B9C2' },
  { name: '鹅黄', value: '#F3DFA2' },
  { name: '雾蓝', value: '#9BB7D4' },
  { name: '珊瑚', value: '#E8A87C' },
  { name: '淡紫', value: '#C5B9D2' },
  { name: '青绿', value: '#5D9C88' },
  { name: '陶土', value: '#C87A5A' },
  { name: '奶白', value: '#FDF6E3' },
  { name: '鼠尾草', value: '#9CAF88' },
  { name: '天空', value: '#87CEEB' },
];
