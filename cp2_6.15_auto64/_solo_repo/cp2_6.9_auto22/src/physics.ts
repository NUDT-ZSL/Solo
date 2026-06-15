import type { CelestialBody, Vec2, Particle } from './entities';
import { createExplosionParticles } from './entities';

export const G = 0.5;
const TRAIL_MAX = 10;
const MIN_DISTANCE = 2;
const DELETE_DURATION = 250;

export interface PhysicsResult {
  bodies: CelestialBody[];
  newParticles: Particle[];
}

export function stepPhysics(
  bodies: CelestialBody[],
  dt: number,
  speedMultiplier: number
): PhysicsResult {
  const newParticles: Particle[] = [];
  const adjustedDt = dt * speedMultiplier;

  const activeBodies = bodies.filter(b => !b.isDeleting);

  updateDeletingBodies(bodies, dt);

  const accelerations = computeGravity(activeBodies);

  for (let i = 0; i < activeBodies.length; i++) {
    const body = activeBodies[i];
    const acc = accelerations[i];
    body.velocity.x += acc.x * adjustedDt;
    body.velocity.y += acc.y * adjustedDt;
    body.position.x += body.velocity.x * adjustedDt;
    body.position.y += body.velocity.y * adjustedDt;

    body.trail.push({ x: body.position.x, y: body.position.y });
    if (body.trail.length > TRAIL_MAX) {
      body.trail.shift();
    }
  }

  const merged = resolveCollisions(activeBodies, newParticles);

  const remaining = bodies.filter(b => !merged.removedIds.has(b.id));

  return {
    bodies: remaining,
    newParticles,
  };
}

function updateDeletingBodies(bodies: CelestialBody[], dt: number): void {
  for (const body of bodies) {
    if (body.isDeleting) {
      body.deleteProgress += dt / DELETE_DURATION;
      if (body.deleteProgress > 1) {
        body.deleteProgress = 1;
      }
    }
  }
}

function computeGravity(bodies: CelestialBody[]): Vec2[] {
  const n = bodies.length;
  const accelerations: Vec2[] = [];
  for (let i = 0; i < n; i++) {
    accelerations.push({ x: 0, y: 0 });
  }

  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      let distSq = dx * dx + dy * dy;

      if (distSq < MIN_DISTANCE * MIN_DISTANCE) {
        distSq = MIN_DISTANCE * MIN_DISTANCE;
      }

      const dist = Math.sqrt(distSq);
      const force = (G * a.mass * b.mass) / distSq;
      const fx = (force * dx) / dist;
      const fy = (force * dy) / dist;

      accelerations[i].x += fx / a.mass;
      accelerations[i].y += fy / a.mass;
      accelerations[j].x -= fx / b.mass;
      accelerations[j].y -= fy / b.mass;
    }
  }

  return accelerations;
}

interface CollisionResult {
  removedIds: Set<number>;
}

function resolveCollisions(
  bodies: CelestialBody[],
  outParticles: Particle[]
): CollisionResult {
  const removedIds = new Set<number>();
  const n = bodies.length;

  for (let i = 0; i < n; i++) {
    const a = bodies[i];
    if (removedIds.has(a.id)) continue;

    for (let j = i + 1; j < n; j++) {
      const b = bodies[j];
      if (removedIds.has(b.id)) continue;

      const dx = b.position.x - a.position.x;
      const dy = b.position.y - a.position.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = a.radius + b.radius;

      if (dist < minDist) {
        const bigger = a.mass >= b.mass ? a : b;
        const smaller = a.mass >= b.mass ? b : a;

        const totalMass = a.mass + b.mass;
        const comX = (a.position.x * a.mass + b.position.x * b.mass) / totalMass;
        const comY = (a.position.y * a.mass + b.position.y * b.mass) / totalMass;
        const newVx = (a.velocity.x * a.mass + b.velocity.x * b.mass) / totalMass;
        const newVy = (a.velocity.y * a.mass + b.velocity.y * b.mass) / totalMass;

        bigger.mass = totalMass;
        bigger.position.x = comX;
        bigger.position.y = comY;
        bigger.velocity.x = newVx;
        bigger.velocity.y = newVy;
        bigger.radius = Math.cbrt(totalMass) * (bigger.isStar ? 1.8 : 2.2);
        bigger.trail = [];
        bigger.spawnTime = performance.now();

        const center: Vec2 = { x: comX, y: comY };
        const explosionColor = bigger.isStar ? bigger.color : smaller.color;
        const particles = createExplosionParticles(center, smaller.mass, explosionColor);
        for (const p of particles) {
          outParticles.push(p);
        }

        removedIds.add(smaller.id);
        break;
      }
    }
  }

  return { removedIds };
}

export function computeKineticEnergy(bodies: CelestialBody[]): number {
  let ke = 0;
  for (const body of bodies) {
    if (body.isDeleting) continue;
    const v2 = body.velocity.x * body.velocity.x + body.velocity.y * body.velocity.y;
    ke += 0.5 * body.mass * v2;
  }
  return ke;
}

export function updateParticles(particles: Particle[], dt: number): Particle[] {
  const result: Particle[] = [];
  for (const p of particles) {
    p.life -= dt * 1000;
    if (p.life <= 0) continue;
    p.position.x += p.velocity.x * dt;
    p.position.y += p.velocity.y * dt;
    p.velocity.x *= 0.96;
    p.velocity.y *= 0.96;
    result.push(p);
  }
  return result;
}
