import type { FragmentType, RuneActivateEvent } from './Grid';
import type { Monster, MonsterDamageEvent, MonsterSpawnEvent } from './Monster';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  type: 'explosion' | 'spark' | 'fire' | 'ice' | 'life' | 'trail';
}

export interface ScreenShake {
  magnitude: number;
  duration: number;
  timer: number;
}

export interface LandingBounce {
  x: number;
  y: number;
  type: FragmentType;
  timer: number;
  duration: number;
  bounces: number;
}

export interface RuneActivationFx {
  cells: { x: number; y: number }[];
  type: FragmentType;
  timer: number;
  duration: number;
}

export class Animator {
  particles: Particle[] = [];
  readonly maxParticles = 500;
  screenShake: ScreenShake | null = null;
  landingBounces: LandingBounce[] = [];
  runeActivations: RuneActivationFx[] = [];
  connectionAnimationTime = 0;
  lavaTextureOffset = 0;
  waveShakeTimer = 0;
  warningFlashTimer = 0;
  warningFlashActive = false;

  triggerShake(magnitude: number, duration: number): void {
    if (!this.screenShake || this.screenShake.magnitude