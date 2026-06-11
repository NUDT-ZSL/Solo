export interface Vec2 {
  readonly x: number;
  readonly y: number;
}

export interface MutableVec2 {
  x: number;
  y: number;
}

export interface AimData {
  readonly startPos: Vec2;
  readonly endPos: Vec2;
  readonly angleRad: number;
  readonly angleDeg: number;
  readonly power: number;
  readonly powerPercent: number;
  readonly isActive: boolean;
}

export interface BallState {
  readonly pos: Vec2;
  readonly vel: Vec2;
  readonly radius: number;
  readonly baseRadius: number;
  readonly launched: boolean;
  readonly boostTimer: number;
  readonly goldTimer: number;
  readonly absorbTimer: number;
  readonly absorbing: boolean;
}

export interface OrbitState {
  readonly center: Vec2;
  readonly radius: number;
  readonly thickness: number;
  readonly rotation: number;
  readonly rotationSpeed: number;
  readonly color: string;
  readonly cooldown: number;
}

export interface PlanetState {
  readonly pos: Vec2;
  readonly radius: number;
  readonly color: string;
  readonly pulseTimer: number;
  readonly gravityStrength: number;
}

export interface BlackHoleState {
  readonly pos: Vec2;
  readonly radius: number;
  readonly gravityStrength: number;
  readonly gravityRange: number;
}

export interface ParticleState {
  readonly pos: Vec2;
  readonly vel: Vec2;
  readonly life: number;
  readonly maxLife: number;
  readonly size: number;
  readonly color: string;
  readonly active: boolean;
}

export type CollisionEventType =
  | 'planet_hit'
  | 'orbit_pass'
  | 'blackhole_absorb'
  | 'score_milestone_gold'
  | 'score_milestone_silver';

export interface CollisionEvent {
  readonly type: CollisionEventType;
  readonly timestamp: number;
  readonly scoreDelta: number;
}

export interface PhysicsOutput {
  readonly ball: BallState;
  readonly orbits: ReadonlyArray<OrbitState>;
  readonly planets: ReadonlyArray<PlanetState>;
  readonly blackHole: BlackHoleState;
  readonly particles: ReadonlyArray<ParticleState>;
  readonly score: number;
  readonly scoreTier: 0 | 1 | 2;
  readonly borderFlashTimer: number;
  readonly borderFlashColor: string;
  readonly events: ReadonlyArray<CollisionEvent>;
  readonly elapsedTime: number;
  readonly isBallPhysicsLocked: boolean;
}

export interface LaunchConfig {
  readonly angleRad: number;
  readonly power: number;
}

export interface RenderInput {
  readonly physics: PhysicsOutput;
  readonly aim: AimData;
  readonly launchesRemaining: number;
  readonly gameOver: boolean;
  readonly dt: number;
}
