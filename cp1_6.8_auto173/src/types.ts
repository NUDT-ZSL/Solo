export type PosType = 'noun' | 'verb' | 'adj' | 'other';

export interface WordAssociation {
  word: string;
  pos: PosType;
  strength: number;
}

export interface WordData {
  word: string;
  pos: PosType;
  definition: string;
  examples: string[];
  associations: WordAssociation[];
}

export interface GraphNode {
  id: string;
  word: string;
  pos: PosType;
  x: number;
  y: number;
  radius: number;
  isCenter: boolean;
  definition: string;
  examples: string[];
  glowIntensity: number;
  targetGlow: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  strength: number;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerWord: string;
}

export interface HistoryEntry {
  word: string;
  graphData: GraphData;
  timestamp: number;
}

export interface StarParticle {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
  angle: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

export interface RippleEffect {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  color: string;
}
