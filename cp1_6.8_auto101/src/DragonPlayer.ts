import { type Particle, TILE, type Torch } from './LavaCave';

export interface TalentDef {
  id: string;
  name: string;
  desc: string;
  maxLevel: number;
  costs: number[];
  icon: string;
}

export const TALENT_DEFS: TalentDef[] = [
  { id: 'swiftFlight', name: '疾风之翼', desc: '飞行速度 +20%', maxLevel: 3, costs: [3, 5, 8], icon: '🪶' },
  { id: 'dragonBreath', name: '龙息扩展', desc: '喷吐范围 +25%', maxLevel: 3, costs: [3, 5, 8], icon: '🔥' },
  { id: 'ironScales', name: '铁鳞护体', desc: '生命上限 +1', maxLevel: 3, costs: [4, 6, 10], icon: '🛡️' },
  { id: 'innerFire', name: '内焰之光', desc: '光照范围 +15%', maxLevel: 3, costs: [2, 4, 6], icon: '✨' },
];

export interface DragonState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  health: number;
  maxHealth: number;
  breathActive: boolean;
  breathTimer: number;
  scales: number;
  talents: Record<string, number>;
  invincibleTimer: number;
  breathParticles: Particle[];
  bodyGlowPhase: number;
}

const BASE_SPEED = 3.0;
const FRICTION = 0.88;
const BREATH_DURATION = 0.35;
const BREATH_COOLDOWN = 0.5;
const BREATH_RANGE_BASE = 4.5;
const BREATH_ANGLE = Math.PI / 3;
const BASE_LIGHT_RADIUS = 2.8;
const BASE_MAX_HEALTH = 5;

export function createDragon(tileX: number, tileY: number, talents: Record<string, number>, prevScales: number, prevMaxHealth: number): DragonState {
  const mh = getMaxHealth(talents, prevMaxHealth);
  return {
    x: tileX * TILE + TILE / 2,
    y: tileY * TILE + TILE / 2,
    vx: 0,
    vy: 0,
    angle: 0,
    health: mh,
    maxHealth: mh,
    breathActive: false,
    breathTimer: 0,
    scales: prevScales,
    talents: { ...talents },
    invincibleTimer: 0,
    breathParticles: [],
    bodyGlowPhase: 0,
  };
}

export function getMaxHealth(talents: Record<string, number>, baseMax: number): number {
  return baseMax + (talents.ironScales || 0);
}

export function getSpeed(talents: Record<string, number>): number {
  return BASE_SPEED * (1 + 0.2 * (talents.swiftFlight || 0));
}

export function getBreathRange(talents: Record<string, number>): number {
  return BREATH_RANGE_BASE * (1 + 0.25 * (talents.dragonBreath || 0));
}

export function getLightRadius(talents: Record<string, number>): number {
  return BASE_LIGHT_RADIUS * (1 + 0.15 * (talents.innerFire || 0));
}

export function updateDragon(dragon: DragonState, keys: Set<string>, dt: number): void {
  const speed = getSpeed(dragon.talents);

  let ax = 0;
  let ay = 0;
  if (keys.has('w') || keys.has('arrowup')) ay -= 1;
  if (keys.has('s') || keys.has('arrowdown')) ay += 1;
  if (keys.has('a') || keys.has('arrowleft')) ax -= 1;
  if (keys.has('d') || keys.has('arrowright')) ax += 1;

  if (ax !== 0 || ay !== 0) {
    const len = Math.sqrt(ax * ax + ay * ay);
    ax /= len;
    ay /= len;
    dragon.vx += ax * speed * 0.5;
    dragon.vy += ay * speed * 0.5;
    dragon.angle = Math.atan2(ay, ax);
  }

  dragon.vx *= FRICTION;
  dragon.vy *= FRICTION;

  const curSpeed = Math.sqrt(dragon.vx * dragon.vx + dragon.vy * dragon.vy);
  if (curSpeed > speed) {
    dragon.vx = (dragon.vx / curSpeed) * speed;
    dragon.vy = (dragon.vy / curSpeed) * speed;
  }

  dragon.x += dragon.vx * dt * 60;
  dragon.y += dragon.vy * dt * 60;

  dragon.invincibleTimer = Math.max(0, dragon.invincibleTimer - dt);
  dragon.bodyGlowPhase += dt * 3;

  if (dragon.breathTimer > 0) {
    dragon.breathTimer -= dt;
    if (dragon.breathTimer <= 0) {
      dragon.breathActive = false;
    }
  }

  if (dragon.breathActive) {
    spawnBreathParticles(dragon);
  }

  for (let i = dragon.breathParticles.length - 1; i >= 0; i--) {
    const p = dragon.breathParticles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt * 2.5;
    if (p.life <= 0) dragon.breathParticles.splice(i, 1);
  }
}

export function startBreath(dragon: DragonState): void {
  if (dragon.breathTimer > 0 && !dragon.breathActive) return;
  dragon.breathActive = true;
  dragon.breathTimer = BREATH_DURATION;
}

export function spawnBreathParticles(dragon: DragonState): void {
  const range = getBreathRange(dragon.talents) * TILE;
  const halfAngle = BREATH_ANGLE / 2;

  for (let i = 0; i < 3; i++) {
    const a = dragon.angle + (Math.random() - 0.5) * BREATH_ANGLE;
    const spd = 2 + Math.random() * 3;
    const dist = 8 + Math.random() * 12;
    dragon.breathParticles.push({
      x: dragon.x + Math.cos(a) * dist,
      y: dragon.y + Math.sin(a) * dist,
      vx: Math.cos(a) * spd,
      vy: Math.sin(a) * spd,
      life: 0.3 + Math.random() * 0.3,
      maxLife: 0.6,
      size: 3 + Math.random() * 4,
      r: 255,
      g: Math.floor(80 + Math.random() * 120),
      b: 0,
    });
  }
}

export function canLightTorch(dragon: DragonState, torch: Torch): boolean {
  if (!dragon.breathActive) return false;
  if (torch.lit) return false;

  const dx = torch.tileX * TILE + TILE / 2 - dragon.x;
  const dy = torch.tileY * TILE + TILE / 2 - dragon.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const range = getBreathRange(dragon.talents) * TILE;

  if (dist > range) return false;

  const angleToTorch = Math.atan2(dy, dx);
  let diff = angleToTorch - dragon.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;

  return Math.abs(diff) < BREATH_ANGLE / 2;
}

export function damageDragon(dragon: DragonState, amount: number): boolean {
  if (dragon.invincibleTimer > 0) return false;
  dragon.health = Math.max(0, dragon.health - amount);
  dragon.invincibleTimer = 0.8;
  return true;
}

export function isBreathOnCooldown(dragon: DragonState): boolean {
  return dragon.breathTimer > 0 && !dragon.breathActive;
}

export function unlockTalent(dragon: DragonState, talentId: string): boolean {
  const def = TALENT_DEFS.find(t => t.id === talentId);
  if (!def) return false;
  const curLevel = dragon.talents[talentId] || 0;
  if (curLevel >= def.maxLevel) return false;
  const cost = def.costs[curLevel];
  if (dragon.scales < cost) return false;
  dragon.scales -= cost;
  dragon.talents[talentId] = curLevel + 1;

  if (talentId === 'ironScales') {
    dragon.maxHealth = getMaxHealth(dragon.talents, BASE_MAX_HEALTH);
    dragon.health = Math.min(dragon.health + 1, dragon.maxHealth);
  }

  return true;
}
