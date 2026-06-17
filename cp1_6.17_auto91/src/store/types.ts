export type PipelineType = 'water' | 'drainage' | 'gas' | 'power' | 'communication';

export interface PipelineConfig {
  color: string;
  radius: number;
  label: string;
}

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface PipelineSegment {
  id: string;
  start: Point3D;
  end: Point3D;
}

export interface Pipeline {
  id: string;
  type: PipelineType;
  segments: PipelineSegment[];
  nodes: Point3D[];
  depth: number;
  visible?: boolean;
}

export interface CollisionPoint {
  id: string;
  position: Point3D;
  pipelineA: string;
  pipelineB: string;
  typeA: PipelineType;
  typeB: PipelineType;
  collisionType: 'horizontal' | 'vertical';
  resolved: boolean;
  distance: number;
}

export interface PresetScheme {
  id: 'A' | 'B' | 'C';
  name: string;
  description: string;
  pipelines: Pipeline[];
}

export const PIPELINE_CONFIGS: Record<PipelineType, PipelineConfig> = {
  water: { color: '#2196F3', radius: 0.12, label: '给水' },
  drainage: { color: '#0D47A1', radius: 0.15, label: '排水' },
  gas: { color: '#FFEB3B', radius: 0.10, label: '燃气' },
  power: { color: '#F44336', radius: 0.08, label: '电力' },
  communication: { color: '#4CAF50', radius: 0.06, label: '通信' },
};

export const SAFE_DISTANCE = 0.3;
