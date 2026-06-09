import type { Vec2, GridPos, FireflyState, LandingEffect, SilkPlacementRipple, StepRipple, InputState } from './types';
import { GRID_SIZE, GRID_COLS, GRID_ROWS, SPEEDS, TIMINGS, LIMITS, DIMENSIONS, COLORS } from './constants';

let ENTITY_ID_SEQ = 1;
const nextId = (): number => ENTITY_ID_SEQ++;

export class Particle {
  id: number;
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  colorStart: string;
  colorEnd: string;
  size: number;

  constructor(pos: Vec2, vel: Vec2, maxLife: number, colorStart: string, colorEnd: string, size: number) {
    this.id = nextId();
    this.pos = { x: pos.x, y: pos.y };
    this.vel = { x: vel.x, y: vel.y };
    this.life = maxLife;
    this.maxLife = maxLife;
    this.colorStart = colorStart;
    this.colorEnd = colorEnd;
    this.size = size;
  }

  update(dt: number): void {
    this.life -= dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.vel.y += 18 * dt;
    this.vel.x *= 1 - 0.8 * dt;
  }

  get alive(): boolean {
    return this.life > 0;
  }
}

export class PickupPoint {
  id: number;
  pos: Vec2;
  gridPos: GridPos;
  collected: boolean;
  pulse: number;

  constructor(gridPos: GridPos) {
    this.id = nextId();
    this.gridPos = gridPos;
    this.pos = {
      x: gridPos.gx * GRID_SIZE + GRID_SIZE / 2,
      y: gridPos.gy * GRID_SIZE + GRID_SIZE / 2,
    };
    this.collected = false;
    this.pulse = 0;
  }

  update(dt: number): void {
    this.pulse += dt;
  }

  get alive(): boolean {
    return !this.collected;
  }
}

export class ExitPoint {
  id: number;
  pos: Vec2;
  gridPos: GridPos;
  pulsePhase: number;
  activated: boolean;

  constructor(gridPos: GridPos) {
    this.id = nextId();
    this.gridPos = gridPos;
    this.pos = {
      x: gridPos.gx * GRID_SIZE + GRID_SIZE / 2,
      y: gridPos.gy * GRID_SIZE + GRID_SIZE / 2,
    };
    this.pulsePhase = 0;
    this.activated = false;
  }

  update(dt: number): void {
    this.pulsePhase += dt;
  }

  get alive(): boolean {
    return !this.activated;
  }
}

export class SilkThread {
  id: number;
  start: Vec2;
  end: Vec2;
  originalLen: number;
  controlOffset: Vec2;
  deformAmount: number;
  lifeTime: number;
  steppedThisFrame: boolean;
  placeRipple: SilkPlacementRipple | null;
  stepRipples: StepRipple[];
  broken: boolean;
  startDir: Vec2;

  constructor(startPos: Vec2, direction: Vec2) {
    this.id = nextId();
    const len = LIMITS.SILK_LENGTH_CELLS * GRID_SIZE;
    const dx = direction.x === 0 && direction.y === 0 ? 1 : direction.x;
    const dy = direction.x === 0 && direction.y === 0 ? 0 : direction.y;
    const mag = Math.hypot(dx, dy) || 1;
    this.startDir = { x: dx / mag, y: dy / mag };
    this.start = { x: startPos.x, y: startPos.y };
    this.end = {
      x: startPos.x + this.startDir.x * len,
      y: startPos.y + this.startDir.y * len,
    };
    this.originalLen = len;
    this.controlOffset = { x: 0, y: 0 };
    this.deformAmount = 0;
    this.lifeTime = TIMINGS.SILK_LIFETIME;
    this.steppedThisFrame = false;
    this.placeRipple = {
      startTime: performance.now(),
      duration: TIMINGS.SILK_PLACE_RIPPLE * 1000,
      pos: { x: startPos.x, y: startPos.y },
    };
    this.stepRipples = [];
    this.broken = false;
  }

  midpoint(): Vec2 {
    return {
      x: (this.start.x + this.end.x) / 2,
      y: (this.start.y + this.end.y) / 2,
    };
  }

  currentLen(): number {
    return Math.hypot(this.end.x - this.start.x, this.end.y - this.start.y);
  }

  applyDeform(pct: number): void {
    const clamped = Math.max(-LIMITS.SILK_DEFORM_MAX_PCT, Math.min(LIMITS.SILK_DEFORM_MAX_PCT, pct));
    this.deformAmount = clamped;
  }

  update(dt: number, nowMs: number): void {
    this.lifeTime -= dt;
    this.steppedThisFrame = false;
    this.controlOffset.x *= 1 - 3 * dt;
    this.controlOffset.y *= 1 - 3 * dt;
    this.deformAmount *= 1 - 2 * dt;
    this.stepRipples = this.stepRipples.filter(
      (r) => nowMs - r.startTime < r.duration,
    );
  }

  addStepRipple(pos: Vec2): void {
    this.stepRipples.push({
      startTime: performance.now(),
      duration: TIMINGS.STEP_RIPPLE * 1000,
      pos: { x: pos.x, y: pos.y },
    });
  }

  get alive(): boolean {
    return !this.broken && this.lifeTime > 0;
  }
}

export class Spider {
  id: number;
  pos: Vec2;
  gridPos: GridPos;
  velocity: Vec2;
  attached: boolean;
  attachSurface: 'none' | 'wall' | 'ceiling' | 'floor' | 'silk';
  facing: Vec2;
  silkCount: number;
  legPhase: number;
  invincibleTime: number;
  landingEffect: LandingEffect | null;
  lastPlaceDir: Vec2;
  wasAttached: boolean;
  prevY: number;

  constructor(spawnGrid: GridPos) {
    this.id = nextId();
    this.gridPos = { gx: spawnGrid.gx, gy: spawnGrid.gy };
    this.pos = {
      x: spawnGrid.gx * GRID_SIZE + GRID_SIZE / 2,
      y: spawnGrid.gy * GRID_SIZE + GRID_SIZE / 2,
    };
    this.velocity = { x: 0, y: 0 };
    this.attached = true;
    this.attachSurface = 'wall';
    this.facing = { x: 1, y: 0 };
    this.silkCount = LIMITS.INITIAL_SILK;
    this.legPhase = 0;
    this.invincibleTime = 0;
    this.landingEffect = null;
    this.lastPlaceDir = { x: 1, y: 0 };
    this.wasAttached = true;
    this.prevY = this.pos.y;
  }

  get alive(): boolean {
    return true;
  }

  setSilkCount(n: number): void {
    this.silkCount = Math.max(0, Math.min(10, n));
  }

  grantInvincible(): void {
    this.invincibleTime = TIMINGS.INVINCIBLE_DURATION;
  }

  addSilkPickup(): void {
    this.silkCount = Math.min(10, this.silkCount + 1);
  }

  triggerLandingEffect(pos: Vec2): void {
    this.landingEffect = {
      startTime: performance.now(),
      duration: TIMINGS.LANDING_EFFECT * 1000,
      pos: { x: pos.x, y: pos.y },
    };
  }
}

export class Firefly {
  id: number;
  pos: Vec2;
  patrolPath: Vec2[];
  patrolGridPath: GridPos[];
  patrolIndex: number;
  patrolProgress: number;
  patrolSpeed: number;
  state: FireflyState;
  alertTime: number;
  stunnedTime: number;
  wingPhase: number;
  glowPulse: number;
  stunFlash: number;
  alertCooldown: number;
  alertPlayed: boolean;

  constructor(gridPath: GridPos[], speed: number = SPEEDS.FIREFLY_PATROL) {
    this.id = nextId();
    this.patrolGridPath = gridPath;
    this.patrolPath = gridPath.map((g) => ({
      x: g.gx * GRID_SIZE + GRID_SIZE / 2,
      y: g.gy * GRID_SIZE + GRID_SIZE / 2,
    }));
    this.patrolIndex = 0;
    this.patrolProgress = 0;
    this.patrolSpeed = speed;
    this.pos = {
      x: this.patrolPath[0].x,
      y: this.patrolPath[0].y,
    };
    this.state = 'patrol';
    this.alertTime = 0;
    this.stunnedTime = 0;
    this.wingPhase = 0;
    this.glowPulse = 0;
    this.stunFlash = 0;
    this.alertCooldown = 0;
    this.alertPlayed = false;
  }

  get alive(): boolean {
    return true;
  }

  stun(): void {
    if (this.state === 'stunned') return;
    this.state = 'stunned';
    this.stunnedTime = TIMINGS.STUN_DURATION;
    this.stunFlash = 0;
  }

  triggerAlert(): void {
    if (this.state === 'stunned') return;
    if (this.state !== 'alert') {
      this.state = 'alert';
      this.alertTime = 0;
      this.alertPlayed = false;
    }
  }

  currentSegmentLen(): number {
    const a = this.patrolPath[this.patrolIndex];
    const b = this.patrolPath[(this.patrolIndex + 1) % this.patrolPath.length];
    return Math.hypot(b.x - a.x, b.y - a.y);
  }
}

export interface EngineAPI {
  isWallAt(gx: number, gy: number): boolean;
  inBounds(gx: number, gy: number): boolean;
  spawnParticle(p: Particle): void;
  playAlert(): void;
  playStep(): void;
  playSilk(): void;
  playWin(): void;
  playStun(): void;
  getGridWidth(): number;
  getGridHeight(): number;
}
