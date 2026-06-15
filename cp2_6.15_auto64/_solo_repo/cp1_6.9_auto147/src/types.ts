export interface Vec2 {
  x: number;
  y: number;
}

export interface Color {
  hue: number;
  saturation: number;
  lightness: number;
}

export interface BaseColors {
  hex: string;
  hue: number;
}

export interface Creature {
  id: 'warm' | 'cool';
  position: Vec2;
  velocity: Vec2;
  acceleration: Vec2;
  radius: number;
  baseRadius: number;
  maxSpeed: number;
  currentSpeed: number;
  accelerationTime: number;
  isAccelerating: boolean;
  colorPool: number[];
  currentHue: number;
  currentSaturation: number;
  currentLightness: number;
  particles: CreatureParticle[];
  particleRotation: number;
  pulseAlpha: number;
  pulseColor: Color | null;
  pulseTime: number;
  eatenCount: number;
  trail: TrailParticle[];
  input: { up: boolean; down: boolean; left: boolean; right: boolean };
}

export interface CreatureParticle {
  offset: Vec2;
  radius: number;
  angle: number;
  distance: number;
}

export interface ColorBlob {
  id: number;
  position: Vec2;
  radius: number;
  hue: number;
  saturation: number;
  lightness: number;
  isFusion: boolean;
  lifetime: number;
  maxLifetime: number;
}

export interface SplashParticle {
  position: Vec2;
  velocity: Vec2;
  radius: number;
  hue: number;
  saturation: number;
  lightness: number;
  lifetime: number;
  maxLifetime: number;
  active: boolean;
}

export interface TrailParticle {
  position: Vec2;
  radius: number;
  alpha: number;
  hue: number;
  lifetime: number;
  maxLifetime: number;
}

export interface GameState {
  status: 'start' | 'playing' | 'ended';
  winner: 'warm' | 'cool' | null;
  totalBlobs: number;
  warmEaten: number;
  coolEaten: number;
  transitionAlpha: number;
  transitionTarget: 'start' | 'playing' | 'ended' | null;
  winRotation: number;
}

export interface InputState {
  warm: { up: boolean; down: boolean; left: boolean; right: boolean };
  cool: { up: boolean; down: boolean; left: boolean; right: boolean };
  space: boolean;
}
