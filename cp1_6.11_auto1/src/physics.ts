import {
  Vec2,
  MutableVec2,
  BallState,
  OrbitState,
  PlanetState,
  BlackHoleState,
  ParticleState,
  CollisionEvent,
  CollisionEventType,
  PhysicsOutput,
  LaunchConfig
} from './types';

export { CANVAS_WIDTH, CANVAS_HEIGHT, LAUNCH_POS } from './types_internal';

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LAUNCH_POS
} from './types_internal';

export const FRICTION = 0.996;
export const G_CONSTANT = 8000;
const PARTICLE_POOL_SIZE = 140;
const MIN_R2 = 225;

interface MBall {
  pos: MutableVec2;
  vel: MutableVec2;
  radius: number;
  baseRadius: number;
  launched: boolean;
  boostTimer: number;
  goldTimer: number;
  absorbTimer: number;
  absorbing: boolean;
}

interface MOrbit {
  center: MutableVec2;
  radius: number;
  thickness: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  cooldown: number;
}

interface MPlanet {
  pos: MutableVec2;
  radius: number;
  color: string;
  pulseTimer: number;
  hitCooldown: number;
  gravityStrength: number;
  gravityRange: number;
}

interface MBlackHole {
  pos: MutableVec2;
  radius: number;
  gravityStrength: number;
  gravityRange: number;
}

interface MParticle {
  pos: MutableVec2;
  vel: MutableVec2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;
}

interface InternalState {
  ball: MBall;
  orbits: MOrbit[];
  planets: MPlanet[];
  blackHole: MBlackHole;
  particles: MParticle[];
  particlePool: MParticle[];
  borderFlashTimer: number;
  borderFlashColor: string;
  score: number;
  prevTier: 0 | 1 | 2;
  events: CollisionEvent[];
  elapsedTime: number;
  isBallPhysicsLocked: boolean;
}

function cloneVec(v: Vec2): MutableVec2 {
  return { x: v.x, y: v.y };
}

function createPool(size: number): MParticle[] {
  const arr: MParticle[] = [];
  for (let i = 0; i < size; i++) {
    arr.push({
      pos: { x: 0, y: 0 },
      vel: { x: 0, y: 0 },
      life: 0,
      maxLife: 1,
      size: 2,
      color: '#FFFFFF',
      active: false
    });
  }
  return arr;
}

export function createPhysicsState(): InternalState {
  return {
    ball: {
      pos: cloneVec(LAUNCH_POS),
      vel: { x: 0, y: 0 },
      radius: 10,
      baseRadius: 10,
      launched: false,
      boostTimer: 0,
      goldTimer: 0,
      absorbTimer: 0,
      absorbing: false
    },
    orbits: [
      {
        center: { x: 400, y: 280 },
        radius: 170,
        thickness: 10,
        rotation: 0,
        rotationSpeed: 0.9,
        color: '#FF6B9D',
        cooldown: 0
      },
      {
        center: { x: 520, y: 310 },
        radius: 120,
        thickness: 10,
        rotation: Math.PI / 3,
        rotationSpeed: -1.4,
        color: '#6BCB77',
        cooldown: 0
      },
      {
        center: { x: 340, y: 190 },
        radius: 75,
        thickness: 10,
        rotation: Math.PI / 2,
        rotationSpeed: 2.2,
        color: '#4D96FF',
        cooldown: 0
      }
    ],
    planets: [
      {
        pos: { x: 260, y: 400 },
        radius: 30,
        color: '#FFD93D',
        pulseTimer: 0,
        hitCooldown: 0,
        gravityStrength: 1.0,
        gravityRange: 180
      },
      {
        pos: { x: 620, y: 190 },
        radius: 30,
        color: '#FF8C42',
        pulseTimer: 0,
        hitCooldown: 0,
        gravityStrength: 1.0,
        gravityRange: 180
      }
    ],
    blackHole: {
      pos: { x: 660, y: 460 },
      radius: 26,
      gravityStrength: 3.2,
      gravityRange: 260
    },
    particles: [],
    particlePool: createPool(PARTICLE_POOL_SIZE),
    borderFlashTimer: 0,
    borderFlashColor: '',
    score: 0,
    prevTier: 0,
    events: [],
    elapsedTime: 0,
    isBallPhysicsLocked: false
  };
}

function distSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt(distSq(ax, ay, bx, by));
}

function pushEvent(
  s: InternalState,
  type: CollisionEventType,
  scoreDelta: number
): void {
  s.events.push({ type, timestamp: s.elapsedTime, scoreDelta });
}

function scoreTier(score: number): 0 | 1 | 2 {
  if (score >= 100) return 2;
  if (score >= 50) return 1;
  return 0;
}

function checkTierFlash(s: InternalState): void {
  const newTier = scoreTier(s.score);
  if (s.prevTier !== newTier) {
    if (s.prevTier < 1 && newTier >= 1) {
      s.borderFlashTimer = 0.9;
      s.borderFlashColor = '#FFD700';
      pushEvent(s, 'score_milestone_gold', 0);
    }
    if (s.prevTier < 2 && newTier >= 2) {
      s.borderFlashTimer = 0.9;
      s.borderFlashColor = '#C0C0C0';
      pushEvent(s, 'score_milestone_silver', 0);
    }
    s.prevTier = newTier;
  }
}

function spawnParticles(
  s: InternalState,
  x: number,
  y: number,
  count: number,
  color: string,
  speed: number,
  life: number
): void {
  for (let i = 0; i < count; i++) {
    let p: MParticle | null = null;
    for (const cand of s.particlePool) {
      if (!cand.active) {
        p = cand;
        break;
      }
    }
    if (!p) {
      p = {
        pos: { x: 0, y: 0 },
        vel: { x: 0, y: 0 },
        life: 0,
        maxLife: 1,
        size: 2,
        color: '',
        active: false
      };
      s.particlePool.push(p);
    }
    const a = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const sp = speed * (0.4 + Math.random() * 0.9);
    p.pos.x = x;
    p.pos.y = y;
    p.vel.x = Math.cos(a) * sp;
    p.vel.y = Math.sin(a) * sp;
    p.life = life;
    p.maxLife = life;
    p.size = 1.5 + Math.random() * 2.5;
    p.color = color;
    p.active = true;
    s.particles.push(p);
  }
}

function updateParticlesOnly(s: InternalState, dt: number): void {
  const alive: MParticle[] = [];
  for (const p of s.particles) {
    p.life -= dt;
    if (p.life > 0) {
      p.pos.x += p.vel.x * dt * 60;
      p.pos.y += p.vel.y * dt * 60;
      p.vel.x *= 0.955;
      p.vel.y *= 0.955;
      alive.push(p);
    } else {
      p.active = false;
    }
  }
  s.particles = alive;
}

function applyInverseSquareGravity(s: InternalState, dt: number): void {
  const ball = s.ball;
  let ax = 0;
  let ay = 0;

  for (const planet of s.planets) {
    const dx = planet.pos.x - ball.pos.x;
    const dy = planet.pos.y - ball.pos.y;
    const r2 = Math.max(MIN_R2, dx * dx + dy * dy);
    const r = Math.sqrt(r2);
    if (r < planet.gravityRange) {
      const force = (G_CONSTANT * planet.gravityStrength) / r2;
      ax += (dx / r) * force;
      ay += (dy / r) * force;
    }
  }

  const bh = s.blackHole;
  const bdx = bh.pos.x - ball.pos.x;
  const bdy = bh.pos.y - ball.pos.y;
  const br2 = Math.max(MIN_R2, bdx * bdx + bdy * bdy);
  const br = Math.sqrt(br2);
  if (br < bh.gravityRange) {
    const force = (G_CONSTANT * bh.gravityStrength) / br2;
    ax += (bdx / br) * force;
    ay += (bdy / br) * force;
  }

  ball.vel.x += ax * dt * 60;
  ball.vel.y += ay * dt * 60;
}

function checkOrbit(b: MBall, o: MOrbit): boolean {
  const d = dist(b.pos.x, b.pos.y, o.center.x, o.center.y);
  const inner = o.radius - o.thickness / 2 - b.radius;
  const outer = o.radius + o.thickness / 2 + b.radius;
  return d > inner && d < outer;
}

function checkPlanet(b: MBall, p: MPlanet): boolean {
  const r = b.radius + p.radius;
  return distSq(b.pos.x, b.pos.y, p.pos.x, p.pos.y) < r * r;
}

function checkBlackHole(b: MBall, bh: MBlackHole): boolean {
  const r = b.radius + bh.radius * 0.55;
  return distSq(b.pos.x, b.pos.y, bh.pos.x, bh.pos.y) < r * r;
}

function reflect(b: MBall, p: MPlanet): void {
  const nx = b.pos.x - p.pos.x;
  const ny = b.pos.y - p.pos.y;
  const nlen = Math.sqrt(nx * nx + ny * ny) || 1;
  const ux = nx / nlen;
  const uy = ny / nlen;
  const dot = b.vel.x * ux + b.vel.y * uy;
  b.vel.x -= 2 * dot * ux;
  b.vel.y -= 2 * dot * uy;
  const overlap = b.radius + p.radius - nlen;
  if (overlap > 0) {
    b.pos.x += ux * overlap;
    b.pos.y += uy * overlap;
  }
  b.vel.x *= 0.88;
  b.vel.y *= 0.88;
}

function clampBall(s: InternalState): void {
  const b = s.ball;
  if (b.pos.x - b.radius < 0) {
    b.pos.x = b.radius;
    b.vel.x = Math.abs(b.vel.x) * 0.82;
  }
  if (b.pos.x + b.radius > CANVAS_WIDTH) {
    b.pos.x = CANVAS_WIDTH - b.radius;
    b.vel.x = -Math.abs(b.vel.x) * 0.82;
  }
  if (b.pos.y - b.radius < 0) {
    b.pos.y = b.radius;
    b.vel.y = Math.abs(b.vel.y) * 0.82;
  }
  if (b.pos.y + b.radius > CANVAS_HEIGHT) {
    b.pos.y = CANVAS_HEIGHT - b.radius;
    b.vel.y = -Math.abs(b.vel.y) * 0.82;
  }
}

export function updatePhysicsState(s: InternalState, dt: number): void {
  s.elapsedTime += dt;

  for (const o of s.orbits) {
    o.rotation += o.rotationSpeed * dt;
    if (o.cooldown > 0) o.cooldown -= dt;
  }

  for (const p of s.planets) {
    if (p.pulseTimer > 0) p.pulseTimer -= dt;
    if (p.hitCooldown > 0) p.hitCooldown -= dt;
  }

  if (s.borderFlashTimer > 0) s.borderFlashTimer -= dt;

  if (s.ball.absorbing) {
    s.isBallPhysicsLocked = true;
    s.ball.absorbTimer -= dt;
    const t = Math.max(0, s.ball.absorbTimer / 0.5);
    s.ball.radius = s.ball.baseRadius * t;
    const dx = s.blackHole.pos.x - s.ball.pos.x;
    const dy = s.blackHole.pos.y - s.ball.pos.y;
    s.ball.pos.x += dx * dt * 4;
    s.ball.pos.y += dy * dt * 4;
    if (s.ball.absorbTimer <= 0) {
      spawnParticles(s, s.blackHole.pos.x, s.blackHole.pos.y, 20, '#4A0E4E', 3.5, 0.4);
      s.ball.pos.x = LAUNCH_POS.x;
      s.ball.pos.y = LAUNCH_POS.y;
      s.ball.vel.x = 0;
      s.ball.vel.y = 0;
      s.ball.radius = s.ball.baseRadius;
      s.ball.launched = false;
      s.ball.absorbing = false;
      s.ball.boostTimer = 0;
      s.ball.goldTimer = 0;
      s.isBallPhysicsLocked = false;
      for (const o of s.orbits) o.cooldown = 0;
    }
    updateParticlesOnly(s, dt);
    return;
  }

  s.isBallPhysicsLocked = false;

  if (!s.ball.launched) {
    updateParticlesOnly(s, dt);
    return;
  }

  if (s.ball.boostTimer > 0) s.ball.boostTimer -= dt;
  if (s.ball.goldTimer > 0) s.ball.goldTimer -= dt;

  applyInverseSquareGravity(s, dt);

  const speedMul = s.ball.boostTimer > 0 ? 1.015 : 1;
  s.ball.pos.x += s.ball.vel.x * dt * 60 * speedMul;
  s.ball.pos.y += s.ball.vel.y * dt * 60 * speedMul;

  const fricPerFrame = Math.pow(FRICTION, dt * 60);
  s.ball.vel.x *= fricPerFrame;
  s.ball.vel.y *= fricPerFrame;

  clampBall(s);

  for (const o of s.orbits) {
    if (o.cooldown <= 0 && checkOrbit(s.ball, o)) {
      s.ball.boostTimer = 1.0;
      o.cooldown = 1.5;
      s.borderFlashTimer = 0.55;
      s.borderFlashColor = '#9B59B6';
      const sp2 = s.ball.vel.x * s.ball.vel.x + s.ball.vel.y * s.ball.vel.y;
      if (sp2 > 0.0001) {
        s.ball.vel.x *= 1.6;
        s.ball.vel.y *= 1.6;
      }
      spawnParticles(s, s.ball.pos.x, s.ball.pos.y, 10, o.color, 2.5, 0.3);
      pushEvent(s, 'orbit_pass', 0);
    }
  }

  const scoreBefore = s.score;
  s.planets.forEach((planet, idx) => {
    void idx;
    if (planet.hitCooldown <= 0 && checkPlanet(s.ball, planet)) {
      reflect(s.ball, planet);
      planet.pulseTimer = 0.3;
      planet.hitCooldown = 0.18;
      s.score += 10;
      s.ball.goldTimer = 0.22;
      spawnParticles(s, s.ball.pos.x, s.ball.pos.y, 14, '#FFD700', 4.2, 0.25);
      pushEvent(s, 'planet_hit', 10);
    }
  });

  if (checkBlackHole(s.ball, s.blackHole)) {
    s.score -= 20;
    checkTierFlash(s);
    s.ball.absorbing = true;
    s.ball.absorbTimer = 0.5;
    s.ball.vel.x = 0;
    s.ball.vel.y = 0;
    s.isBallPhysicsLocked = true;
    pushEvent(s, 'blackhole_absorb', -20);
    updateParticlesOnly(s, dt);
    return;
  }

  if (s.score !== scoreBefore) {
    checkTierFlash(s);
  }

  updateParticlesOnly(s, dt);
}

export function launchPhysicsBall(
  s: InternalState,
  config: LaunchConfig
): void {
  const speed = config.power * 1.8;
  s.ball.vel.x = Math.cos(config.angleRad) * speed;
  s.ball.vel.y = Math.sin(config.angleRad) * speed;
  s.ball.launched = true;
  s.ball.absorbing = false;
}

export function resetPhysicsBall(s: InternalState): void {
  s.ball.pos.x = LAUNCH_POS.x;
  s.ball.pos.y = LAUNCH_POS.y;
  s.ball.vel.x = 0;
  s.ball.vel.y = 0;
  s.ball.radius = s.ball.baseRadius;
  s.ball.launched = false;
  s.ball.absorbing = false;
  s.ball.absorbTimer = 0;
  s.ball.boostTimer = 0;
  s.ball.goldTimer = 0;
  s.isBallPhysicsLocked = false;
}

export function drainPhysicsEvents(s: InternalState): CollisionEvent[] {
  const e = s.events;
  s.events = [];
  return e;
}

function ballOut(b: MBall): BallState {
  return {
    pos: { x: b.pos.x, y: b.pos.y },
    vel: { x: b.vel.x, y: b.vel.y },
    radius: b.radius,
    baseRadius: b.baseRadius,
    launched: b.launched,
    boostTimer: b.boostTimer,
    goldTimer: b.goldTimer,
    absorbTimer: b.absorbTimer,
    absorbing: b.absorbing
  };
}

export function getPhysicsOutput(s: InternalState): PhysicsOutput {
  return {
    ball: ballOut(s.ball),
    orbits: s.orbits.map<OrbitState>(o => ({
      center: { x: o.center.x, y: o.center.y },
      radius: o.radius,
      thickness: o.thickness,
      rotation: o.rotation,
      rotationSpeed: o.rotationSpeed,
      color: o.color,
      cooldown: o.cooldown
    })),
    planets: s.planets.map<PlanetState>(p => ({
      pos: { x: p.pos.x, y: p.pos.y },
      radius: p.radius,
      color: p.color,
      pulseTimer: p.pulseTimer,
      gravityStrength: p.gravityStrength
    })),
    blackHole: {
      pos: { x: s.blackHole.pos.x, y: s.blackHole.pos.y },
      radius: s.blackHole.radius,
      gravityStrength: s.blackHole.gravityStrength,
      gravityRange: s.blackHole.gravityRange
    },
    particles: s.particles.map<ParticleState>(p => ({
      pos: { x: p.pos.x, y: p.pos.y },
      vel: { x: p.vel.x, y: p.vel.y },
      life: p.life,
      maxLife: p.maxLife,
      size: p.size,
      color: p.color,
      active: p.active
    })),
    score: s.score,
    scoreTier: scoreTier(s.score),
    borderFlashTimer: s.borderFlashTimer,
    borderFlashColor: s.borderFlashColor,
    events: s.events.slice(),
    elapsedTime: s.elapsedTime,
    isBallPhysicsLocked: s.isBallPhysicsLocked
  };
}

export type { InternalState as PhysicsInternalState };
