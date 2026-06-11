export type MarbleType = 'drum' | 'bass' | 'piano' | 'synth';

export interface Point {
  x: number;
  y: number;
}

export interface TrackNode {
  id: string;
  position: Point;
  noteIndex: number;
  triggered: boolean;
  triggerTime: number;
  triggerColor: string;
}

export interface Track {
  id: string;
  nodes: TrackNode[];
  startNote: number;
}

export interface Marble {
  id: string;
  type: MarbleType;
  trackId: string;
  currentNodeIndex: number;
  progress: number;
  velocity: number;
  position: Point;
  active: boolean;
  direction: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  angle: number;
}

export const CANVAS_WIDTH = 1280;
export const CANVAS_HEIGHT = 720;
export const EDIT_AREA_TOP = 200;
export const EDIT_AREA_BOTTOM = CANVAS_HEIGHT - 60;
export const EDIT_AREA_HEIGHT = EDIT_AREA_BOTTOM - EDIT_AREA_TOP;

export const COLORS = {
  bgDeep: '#1A1A2E',
  bgPurple: '#16213E',
  neonBlue: '#00D4FF',
  track: '#00D4FF',
  node: 'rgba(255, 255, 255, 0.35)',
  nodeActive: 'rgba(255, 255, 255, 0.9)',
  drum: '#FF3366',
  drumLight: '#FF6633',
  bass: '#00BFFF',
  bassLight: '#1E90FF',
  piano: '#00FF88',
  pianoLight: '#33FFAA',
  synth: '#FFD700',
  synthLight: '#FFA500',
};

export const MARBLE_COLORS: Record<MarbleType, { core: string; light: string; dark: string; glow: string }> = {
  drum:  { core: '#FF3366', light: '#FF99AA', dark: '#CC1144', glow: 'rgba(255, 51, 102, 0.6)' },
  bass:  { core: '#00BFFF', light: '#66DDFF', dark: '#0077BB', glow: 'rgba(0, 191, 255, 0.6)' },
  piano: { core: '#00FF88', light: '#99FFCC', dark: '#00AA55', glow: 'rgba(0, 255, 136, 0.6)' },
  synth: { core: '#FFD700', light: '#FFEE99', dark: '#CC9900', glow: 'rgba(255, 215, 0, 0.6)' },
};

export const MARBLE_NAMES: Record<MarbleType, string> = {
  drum:  'DRUM · 鼓',
  bass:  'BASS · 贝斯',
  piano: 'PIANO · 钢琴',
  synth: 'SYNTH · 合成器',
};

export const SCALE_FREQUENCIES: number[] = [
  261.63,
  293.66,
  329.63,
  349.23,
  392.00,
  440.00,
  493.88,
  523.25,
];

export const SCALE_NOTES: string[] = ['C4', 'D4', 'E4', 'F4', 'G4', 'A4', 'B4', 'C5'];

export const NOTE_DURATION = 0.05;
export const DEFAULT_NODE_INTERVAL = 0.5;
export const MIN_NODE_INTERVAL = 0.2;
export const MAX_NODE_INTERVAL = 1.5;
export const NODE_TRIGGER_FLASH = 200;
export const PARTICLE_COUNT_MIN = 5;
export const PARTICLE_COUNT_MAX = 10;
export const PARTICLE_LIFE = 150;
export const GRAVITY = 400;

export const MAX_TRACKS = 4;
export const MIN_NODES_PER_TRACK = 6;
export const MAX_NODES_PER_TRACK = 8;
export const MAX_MARBLES = 4;
export const NODE_RADIUS = 12;
export const MARBLE_RADIUS = 14;
export const COLLISION_DISTANCE = 36;
export const COLLISION_COOLDOWN = 500;

export function generateId(prefix = 'id'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function distance(a: Point, b: Point): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return {
    x: lerp(a.x, b.x, t),
    y: lerp(a.y, b.y, t),
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getMarbleColorHex(type: MarbleType): string {
  return MARBLE_COLORS[type].core;
}

export function segmentLength(a: Point, b: Point): number {
  return distance(a, b);
}

export function pointOnSegment(a: Point, b: Point, t: number): Point {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
  };
}
