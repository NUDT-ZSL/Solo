export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface SculptureNode {
  id: string;
  position: Vector3;
  size: number;
  color: string;
  emissiveIntensity: number;
  velocity: Vector3;
  restPosition: Vector3;
}

export interface Connection {
  fromId: string;
  toId: string;
  strength: number;
  opacity: number;
  restLength: number;
}

export interface LightSculpture {
  id: string;
  name: string;
  nodes: SculptureNode[];
  connections: Connection[];
  colorSchemeId: string;
}

export interface Template {
  id: string;
  name: string;
  sculpture: LightSculpture;
  createdAt: string;
}

export interface ColorScheme {
  id: string;
  name: string;
  colors: string[];
}

export interface FrequencyData {
  low: number;
  mid: number;
  high: number;
}

export type TransitionState = 'idle' | 'transitioning';

export interface TemplateTransition {
  fromNodes: SculptureNode[];
  toNodes: SculptureNode[];
  fromConnections: Connection[];
  toConnections: Connection[];
  startTime: number;
  duration: number;
}

export const MAX_NODES = 30;
export const BOUNDS_RADIUS = 20;
export const SPRING_K = 0.1;
export const SPRING_DAMPING = 0.8;
export const MIN_NODE_SIZE = 0.5;
export const MAX_NODE_SIZE = 3;
export const MIN_CONNECTION_OPACITY = 0.3;
export const MAX_CONNECTION_OPACITY = 0.8;
export const TRANSITION_DURATION = 1500;
export const MAX_AUDIO_SIZE = 5 * 1024 * 1024;
