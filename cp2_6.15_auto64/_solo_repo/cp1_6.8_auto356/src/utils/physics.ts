export interface Vec2 {
  x: number;
  y: number;
}

export function vec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function vecAdd(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function vecSub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function vecScale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function vecLen(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

export function vecNorm(v: Vec2): Vec2 {
  const l = vecLen(v);
  if (l < 1e-8) return { x: 0, y: 0 };
  return { x: v.x / l, y: v.y / l };
}

export function vecDist(a: Vec2, b: Vec2): number {
  return vecLen(vecSub(a, b));
}

export function vecDot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function vecRotate(v: Vec2, angle: number): Vec2 {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c };
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export interface GravityLinePoint {
  pos: Vec2;
  time: number;
}

export interface GravityLine {
  id: string;
  points: GravityLinePoint[];
  maxCurvature: number;
  maxLength: number;
  energyCost: number;
}

export interface Asteroid {
  id: string;
  pos: Vec2;
  vel: Vec2;
  radius: number;
  rotation: number;
  rotSpeed: number;
  active: boolean;
  onGravityLine: boolean;
  gravityLineId: string | null;
  gravityLineProgress: number;
  speed: number;
  trail: Vec2[];
  texture: number[];
}

export type StarGateType = 'normal' | 'rare' | 'hidden';

export interface StarGate {
  id: string;
  pos: Vec2;
  radius: number;
  type: StarGateType;
  hitsRequired: number;
  hits: number;
  unlocked: boolean;
  hiddenOrbitType: 'circular' | 'curved' | null;
  glowPhase: number;
}

export type HazardType = 'gravity_interference' | 'blackhole' | 'boost_star';

export interface Hazard {
  id: string;
  pos: Vec2;
  radius: number;
  type: HazardType;
  strength: number;
  active: boolean;
}

export interface StarFragment {
  id: string;
  pos: Vec2;
  radius: number;
  collected: boolean;
  glowPhase: number;
  pulseSpeed: number;
}

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export const MAX_GRAVITY_LINE_LENGTH = 350;
export const MAX_GRAVITY_LINE_CURVATURE = 0.8;
export const GRAVITY_LINE_ENERGY_COST = 15;
export const ENERGY_MAX = 100;
export const ENERGY_REGEN_RATE = 5;
export const ASTEROID_BASE_SPEED = 120;
export const BLACKHOLE_PULL_STRENGTH = 200;
export const BOOST_STAR_MULTIPLIER = 2.0;
export const GRAVITY_INTERFERENCE_STRENGTH = 0.4;

export function calculateCurvature(p0: Vec2, p1: Vec2, p2: Vec2): number {
  const d1 = vecSub(p1, p0);
  const d2 = vecSub(p2, p1);
  const cross = d1.x * d2.y - d1.y * d2.x;
  const l1 = vecLen(d1);
  const l2 = vecLen(d2);
  if (l1 < 1e-8 || l2 < 1e-8) return 0;
  return Math.abs(cross) / (l1 * l2);
}

export function smoothGravityLine(rawPoints: Vec2[], segmentLength: number = 8): Vec2[] {
  if (rawPoints.length < 3) return rawPoints;
  const smoothed: Vec2[] = [rawPoints[0]];
  let accumulated = vec2(0, 0);
  let count = 0;
  for (let i = 1; i < rawPoints.length - 1; i++) {
    accumulated = vecAdd(accumulated, rawPoints[i]);
    count++;
    if (count >= 3) {
      const avg = vecScale(accumulated, 1 / count);
      const prev = smoothed[smoothed.length - 1];
      if (vecDist(prev, avg) >= segmentLength) {
        smoothed.push(avg);
      }
      accumulated = vec2(0, 0);
      count = 0;
    }
  }
  smoothed.push(rawPoints[rawPoints.length - 1]);
  return smoothed;
}

export function validateGravityLine(points: Vec2[]): { valid: boolean; reason?: string } {
  if (points.length < 2) return { valid: false, reason: 'TOO_SHORT' };
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    totalLen += vecDist(points[i - 1], points[i]);
  }
  if (totalLen > MAX_GRAVITY_LINE_LENGTH) return { valid: false, reason: 'TOO_LONG' };
  for (let i = 2; i < points.length; i++) {
    const curv = calculateCurvature(points[i - 2], points[i - 1], points[i]);
    if (curv > MAX_GRAVITY_LINE_CURVATURE) return { valid: false, reason: 'TOO_CURVED' };
  }
  return { valid: true };
}

export function getPointOnPath(points: Vec2[], progress: number): Vec2 {
  if (points.length === 0) return vec2(0, 0);
  if (points.length === 1) return points[0];
  const clampedProgress = clamp(progress, 0, 1);
  let totalLen = 0;
  const segLens: number[] = [];
  for (let i = 1; i < points.length; i++) {
    const d = vecDist(points[i - 1], points[i]);
    segLens.push(d);
    totalLen += d;
  }
  if (totalLen < 1e-8) return points[0];
  let targetDist = clampedProgress * totalLen;
  for (let i = 0; i < segLens.length; i++) {
    if (targetDist <= segLens[i]) {
      const t = segLens[i] > 1e-8 ? targetDist / segLens[i] : 0;
      return {
        x: lerp(points[i].x, points[i + 1].x, t),
        y: lerp(points[i].y, points[i + 1].y, t),
      };
    }
    targetDist -= segLens[i];
  }
  return points[points.length - 1];
}

export function getDirectionOnPath(points: Vec2[], progress: number): Vec2 {
  const p1 = getPointOnPath(points, clamp(progress - 0.01, 0, 1));
  const p2 = getPointOnPath(points, clamp(progress + 0.01, 0, 1));
  return vecNorm(vecSub(p2, p1));
}

export function pathLength(points: Vec2[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += vecDist(points[i - 1], points[i]);
  }
  return total;
}

export function moveAsteroidAlongPath(
  asteroid: Asteroid,
  points: Vec2[],
  dt: number,
): Asteroid {
  if (points.length < 2) return asteroid;
  const totalLen = pathLength(points);
  const progressPerSec = totalLen > 0 ? asteroid.speed / totalLen : 0;
  const newProgress = clamp(asteroid.gravityLineProgress + progressPerSec * dt, 0, 1);
  const newPos = getPointOnPath(points, newProgress);
  const newDir = getDirectionOnPath(points, newProgress);
  const newTrail = [...asteroid.trail, { ...newPos }];
  if (newTrail.length > 20) newTrail.shift();
  return {
    ...asteroid,
    pos: newPos,
    vel: vecScale(newDir, asteroid.speed),
    gravityLineProgress: newProgress,
    rotation: asteroid.rotation + asteroid.rotSpeed * dt,
    trail: newTrail,
  };
}

export function moveAsteroidFree(asteroid: Asteroid, dt: number): Asteroid {
  const newPos = vecAdd(asteroid.pos, vecScale(asteroid.vel, dt));
  const newTrail = [...asteroid.trail, { ...newPos }];
  if (newTrail.length > 20) newTrail.shift();
  return {
    ...asteroid,
    pos: newPos,
    rotation: asteroid.rotation + asteroid.rotSpeed * dt,
    trail: newTrail,
  };
}

export function applyHazardToAsteroid(asteroid: Asteroid, hazard: Hazard, dt: number): Asteroid {
  if (!hazard.active || !asteroid.active) return asteroid;
  const dist = vecDist(asteroid.pos, hazard.pos);
  switch (hazard.type) {
    case 'blackhole': {
      if (dist < hazard.radius * 0.3) {
        return { ...asteroid, active: false, vel: vec2(0, 0) };
      }
      const pull = vecNorm(vecSub(hazard.pos, asteroid.pos));
      const force = BLACKHOLE_PULL_STRENGTH * hazard.strength / Math.max(dist, 20);
      const newVel = vecAdd(asteroid.vel, vecScale(pull, force * dt));
      return { ...asteroid, vel: newVel };
    }
    case 'gravity_interference': {
      if (dist < hazard.radius) {
        const angle = Math.atan2(asteroid.vel.y, asteroid.vel.x);
        const offset = GRAVITY_INTERFERENCE_STRENGTH * hazard.strength * Math.sin(Date.now() * 0.003);
        const speed = vecLen(asteroid.vel);
        const newAngle = angle + offset * dt;
        return { ...asteroid, vel: vec2(Math.cos(newAngle) * speed, Math.sin(newAngle) * speed) };
      }
      return asteroid;
    }
    case 'boost_star': {
      if (dist < hazard.radius) {
        const newVel = vecScale(vecNorm(asteroid.vel), vecLen(asteroid.vel) * BOOST_STAR_MULTIPLIER);
        return { ...asteroid, vel: newVel, speed: asteroid.speed * BOOST_STAR_MULTIPLIER };
      }
      return asteroid;
    }
    default:
      return asteroid;
  }
}

export function checkAsteroidGateCollision(asteroid: Asteroid, gate: StarGate): boolean {
  if (!asteroid.active || gate.unlocked) return false;
  return vecDist(asteroid.pos, gate.pos) < asteroid.radius + gate.radius;
}

export function checkOrbitTypeForHiddenGate(
  positions: Vec2[],
  gate: StarGate,
): boolean {
  if (gate.type !== 'hidden' || !gate.hiddenOrbitType) return true;
  if (positions.length < 5) return false;
  const center = gate.pos;
  const distances = positions.map((p) => vecDist(p, center));
  const avgDist = distances.reduce((a, b) => a + b, 0) / distances.length;
  const variance = distances.reduce((a, d) => a + (d - avgDist) ** 2, 0) / distances.length;
  if (gate.hiddenOrbitType === 'circular') {
    return Math.sqrt(variance) < avgDist * 0.15;
  }
  if (gate.hiddenOrbitType === 'curved') {
    const curvaturePoints = positions.slice(0, Math.min(8, positions.length));
    let hasCurve = false;
    for (let i = 2; i < curvaturePoints.length; i++) {
      if (calculateCurvature(curvaturePoints[i - 2], curvaturePoints[i - 1], curvaturePoints[i]) > 0.1) {
        hasCurve = true;
        break;
      }
    }
    return hasCurve;
  }
  return true;
}

export function checkFragmentCollection(asteroid: Asteroid, fragment: StarFragment): boolean {
  if (!asteroid.active || fragment.collected) return false;
  return vecDist(asteroid.pos, fragment.pos) < asteroid.radius + fragment.radius;
}

export function createAsteroid(id: string, pos: Vec2, radius: number = 12): Asteroid {
  const texture: number[] = [];
  const segments = 8;
  for (let i = 0; i < segments; i++) {
    texture.push(0.7 + Math.random() * 0.6);
  }
  return {
    id,
    pos: { ...pos },
    vel: vec2(0, 0),
    radius,
    rotation: Math.random() * Math.PI * 2,
    rotSpeed: (Math.random() - 0.5) * 2,
    active: true,
    onGravityLine: false,
    gravityLineId: null,
    gravityLineProgress: 0,
    speed: ASTEROID_BASE_SPEED,
    trail: [],
    texture,
  };
}

export function spawnParticles(
  pos: Vec2,
  count: number,
  color: string,
  speed: number = 50,
): Particle[] {
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const spd = speed * (0.3 + Math.random() * 0.7);
    particles.push({
      pos: { ...pos },
      vel: vec2(Math.cos(angle) * spd, Math.sin(angle) * spd),
      life: 1,
      maxLife: 0.5 + Math.random() * 0.8,
      color,
      size: 2 + Math.random() * 3,
    });
  }
  return particles;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      pos: vecAdd(p.pos, vecScale(p.vel, dt)),
      life: p.life - dt / p.maxLife,
      size: p.size * (1 - dt * 0.5),
    }))
    .filter((p) => p.life > 0 && p.size > 0.3);
}

export function isPointNearGravityLine(point: Vec2, linePoints: Vec2[], threshold: number): boolean {
  for (let i = 1; i < linePoints.length; i++) {
    const a = linePoints[i - 1];
    const b = linePoints[i];
    const ab = vecSub(b, a);
    const ap = vecSub(point, a);
    const abLen = vecLen(ab);
    if (abLen < 1e-8) continue;
    const t = clamp(vecDot(ap, ab) / (abLen * abLen), 0, 1);
    const closest = vecAdd(a, vecScale(ab, t));
    if (vecDist(point, closest) < threshold) return true;
  }
  return false;
}
