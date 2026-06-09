export interface NodeData {
  id: string;
  text: string;
  x: number;
  y: number;
  hue: number;
  createdAt?: number;
}

export interface EdgeData {
  id: string;
  from: string;
  to: string;
  spark: string;
  likes: number;
  curvature: number;
  createdAt?: number;
}

export interface TopSpark {
  id: string;
  spark: string;
  likes: number;
  fromText: string;
  toText: string;
  fromHue: number;
  toHue: number;
}

export interface Network {
  id: string;
  nodes: NodeData[];
  edges: EdgeData[];
  creator: string;
  createdAt: number;
}

export interface Particle {
  id: number;
  progress: number;
  edgeId: string;
  size: number;
  opacity: number;
  duration: number;
  startTime: number;
}

export type ViewMode = 'normal' | 'heat';
