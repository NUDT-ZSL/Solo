export interface Vec2 {
  x: number;
  y: number;
}

export interface LightRay {
  start: Vec2;
  direction: number;
  length: number;
  intensity: number;
  color?: string;
}

export interface RaySegment {
  start: Vec2;
  end: Vec2;
  intensity: number;
  blocked?: boolean;
}

export interface LightSource {
  id: string;
  position: Vec2;
  angle: number;
  dragging?: boolean;
}

export interface Platform {
  id: string;
  position: Vec2;
  angle: number;
  length: number;
  width: number;
  color: string;
  movable?: boolean;
  moveDirection?: Vec2;
  moveDistance?: number;
  currentOffset?: number;
  linkedReceiverId?: string;
  isMoving?: boolean;
  targetOffset?: number;
}

export interface Reflector {
  id: string;
  position: Vec2;
  rotation: number;
  efficiency: number;
  type: 'mirror' | 'prism';
}

export interface Prism {
  id: string;
  position: Vec2;
  rotation: number;
  sideLength: number;
  refractiveIndex: number;
}

export interface Receiver {
  id: string;
  position: Vec2;
  radius: number;
  color: string;
  activated: boolean;
  activationProgress: number;
  requiredDuration: number;
  linkedPlatformId?: string;
}

export interface Portal {
  id: string;
  position: Vec2;
  radius: number;
  targetLevelId: string;
  active: boolean;
  requiredReceivers: string[];
}

export interface Particle {
  id: string;
  position: Vec2;
  velocity: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface LevelData {
  id: string;
  name: string;
  lightSources: LightSource[];
  platforms: Platform[];
  reflectors: Reflector[];
  prisms: Prism[];
  receivers: Receiver[];
  portal: Portal;
  bounds: { width: number; height: number };
}

export interface GameState {
  levelId: string;
  levelName: string;
  lightSources: LightSource[];
  raySegments: RaySegment[][];
  platforms: Platform[];
  reflectors: Reflector[];
  prisms: Prism[];
  receivers: Receiver[];
  portal: Portal;
  particles: Particle[];
  stepCount: number;
  levelComplete: boolean;
  completeAnimationTime: number;
  blockedFlashTime: number;
  blockedPosition?: Vec2;
}

export type EventType =
  | 'levelChange'
  | 'gameReset'
  | 'sourceDragStart'
  | 'sourceDragMove'
  | 'sourceDragEnd'
  | 'stepUpdate'
  | 'levelComplete'
  | 'receiverActivated'
  | 'platformMove';

export interface EventPayloadMap {
  levelChange: { levelId: string };
  gameReset: void;
  sourceDragStart: { sourceId: string };
  sourceDragMove: { sourceId: string; angle: number };
  sourceDragEnd: { sourceId: string };
  stepUpdate: { count: number };
  levelComplete: { levelId: string; steps: number };
  receiverActivated: { receiverId: string };
  platformMove: { platformId: string; offset: number };
}
