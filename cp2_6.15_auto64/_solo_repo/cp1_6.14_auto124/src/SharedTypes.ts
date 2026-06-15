export interface Vector2 {
  x: number;
  y: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export type NodeType = 'junction' | 'endpoint' | 'mineral' | 'danger';

export interface Node {
  id: string;
  position: Vector3;
  type: NodeType;
  connections: string[];
  label?: string;
}

export interface Connection {
  id: string;
  from: string;
  to: string;
  depth: number;
  pathPoints?: Vector3[];
}

export interface MineralDeposit {
  id: string;
  position: Vector3;
  size: number;
  type: string;
}

export interface DangerZone {
  id: string;
  position: Vector3;
  radius: number;
  severity: 'low' | 'medium' | 'high';
}

export interface SceneConfig {
  tubeRadius: number;
  tubeSegments: number;
  nodeRadius: number;
  mineralSize: number;
  dangerConeHeight: number;
  dangerConeRadius: number;
  depthColorMin: string;
  depthColorMax: string;
  nodeColor: string;
  mineralPulsePeriod: number;
  dangerRotationSpeed: number;
  useInstancing: boolean;
  instancingThreshold: number;
}

export interface ProcessedImageData {
  nodes: Node[];
  connections: Connection[];
  minerals: MineralDeposit[];
  dangers: DangerZone[];
  bounds: {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
    minDepth: number;
    maxDepth: number;
  };
}

export interface LineSegment {
  start: Vector2;
  end: Vector2;
  angle: number;
  length: number;
}

export const DEFAULT_SCENE_CONFIG: SceneConfig = {
  tubeRadius: 0.08,
  tubeSegments: 12,
  nodeRadius: 0.2,
  mineralSize: 0.3,
  dangerConeHeight: 0.5,
  dangerConeRadius: 0.2,
  depthColorMin: '#fbbf24',
  depthColorMax: '#ef4444',
  nodeColor: '#a78bfa',
  mineralPulsePeriod: 1.5,
  dangerRotationSpeed: 0.5,
  useInstancing: true,
  instancingThreshold: 300,
};
