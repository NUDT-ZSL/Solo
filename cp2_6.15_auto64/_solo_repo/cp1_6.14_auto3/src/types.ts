import * as THREE from 'three';

export interface Intersection {
  id: string;
  gridX: number;
  gridY: number;
  x: number;
  z: number;
  lat: number;
  lng: number;
}

export interface StreetSegment {
  id: string;
  from: string;
  to: string;
  fromIntersection: Intersection;
  toIntersection: Intersection;
  pathPoints: THREE.Vector3[];
  isHorizontal: boolean;
  length: number;
}

export interface TrafficDataPoint {
  intersectionId: string;
  flow: number;
  speed: number;
}

export interface TrafficFrame {
  timestamp: number;
  hour: number;
  data: Map<string, TrafficDataPoint>;
  totalFlow: number;
  avgSpeed: number;
}

export interface ParticleData {
  segmentId: string;
  progress: number;
  speed: number;
  baseSpeed: number;
  active: boolean;
  reverse: boolean;
}

export interface HeatmapPoint {
  x: number;
  y: number;
  intensity: number;
  radius: number;
}

export type PlaybackSpeed = 'normal' | 'fast' | 'paused';

export interface UIState {
  currentHour: number;
  playbackSpeed: PlaybackSpeed;
  totalFlow: number;
  avgSpeed: number;
  isDragging: boolean;
}

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  particleUpdateTime: number;
  heatmapUpdateTime: number;
  uiUpdateTime: number;
}

export interface TransitionState {
  isActive: boolean;
  startHour: number;
  targetHour: number;
  startTime: number;
  duration: number;
}

export function validateTrafficFrame(frame: unknown): frame is TrafficFrame {
  if (!frame || typeof frame !== 'object') return false;
  const f = frame as TrafficFrame;
  return (
    typeof f.timestamp === 'number' &&
    typeof f.hour === 'number' &&
    f.hour >= 0 &&
    f.hour < 24 &&
    f.data instanceof Map &&
    typeof f.totalFlow === 'number' &&
    typeof f.avgSpeed === 'number'
  );
}

export function validateIntersection(int: unknown): int is Intersection {
  if (!int || typeof int !== 'object') return false;
  const i = int as Intersection;
  return (
    typeof i.id === 'string' &&
    typeof i.gridX === 'number' &&
    typeof i.gridY === 'number' &&
    typeof i.x === 'number' &&
    typeof i.z === 'number'
  );
}

export function validateStreetSegment(seg: unknown): seg is StreetSegment {
  if (!seg || typeof seg !== 'object') return false;
  const s = seg as StreetSegment;
  return (
    typeof s.id === 'string' &&
    typeof s.from === 'string' &&
    typeof s.to === 'string' &&
    validateIntersection(s.fromIntersection) &&
    validateIntersection(s.toIntersection) &&
    Array.isArray(s.pathPoints) &&
    typeof s.length === 'number'
  );
}
