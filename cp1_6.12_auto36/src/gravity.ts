import { CelestialBody, SimulationState, Vec2 } from './entities';

const SOFTENING = 5.0;
const STABLE_ORBIT_THRESHOLD = 0.08;
const STABLE_ORBIT_CHECK_TIME = 3.0;

export function computeGravity(bodies: CelestialBody[], G: number): Vec2[] {
  const accelerations: Vec2[] = bodies.map(() => ({ x: 0, y: 0 }));

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const a = bodies[i];
      const b = bodies[j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const distSq = dx * dx + dy * dy + SOFTENING * SOFTENING;
      const dist = Math.sqrt(distSq);
      const forceMag = (G * a.mass * b.mass) / distSq;
      const fx = forceMag * dx / dist;
      const fy = forceMag * dy / dist;

      accelerations[i].x += fx / a.mass;
      accelerations[i].y += fy / a.mass;
      accelerations[j].x -= fx / b.mass;
      accelerations[j].y -= fy / b.mass;
    }
  }

  return accelerations;
}

export function integrateEuler(
  bodies: CelestialBody[],
  accels: Vec2[],
  dt: number
): void {
  for (let i = 0; i < bodies.length; i++) {
    if (bodies[i].isStar) continue;
    bodies[i].vel.x += accels[i].x * dt;
    bodies[i].vel.y += accels[i].y * dt;
    bodies[i].pos.x += bodies[i].vel.x * dt;
    bodies[i].pos.y += bodies[i].vel.y * dt;
  }
}

export function detectCollisions(state: SimulationState): CelestialBody[] | null {
  const asteroids = state.bodies.filter((b) => b.isAsteroid);
  const others = state.bodies.filter((b) => !b.isAsteroid);

  for (const ast of asteroids) {
    for (const other of others) {
      if (ast === other) continue;
      const dx = ast.pos.x - other.pos.x;
      const dy = ast.pos.y - other.pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ast.collisionRadius + other.collisionRadius) {
        return [ast, other];
      }
    }
  }
  return null;
}

export function checkStableOrbit(
  asteroid: CelestialBody,
  star: CelestialBody,
  elapsedTime: number
): boolean {
  if (asteroid.orbitStartTime === 0) {
    asteroid.orbitStartTime = elapsedTime;
  }

  const currentAngle = Math.atan2(
    asteroid.pos.y - star.pos.y,
    asteroid.pos.x - star.pos.x
  );

  let deltaAngle = currentAngle - asteroid.lastAngle;
  if (deltaAngle > Math.PI) deltaAngle -= 2 * Math.PI;
  if (deltaAngle < -Math.PI) deltaAngle += 2 * Math.PI;

  asteroid.orbitAngleSum += deltaAngle;
  asteroid.lastAngle = currentAngle;

  const fullRotations = Math.abs(asteroid.orbitAngleSum) / (2 * Math.PI);
  if (fullRotations >= 1.0) {
    const timeSinceStart = elapsedTime - asteroid.orbitStartTime;
    if (timeSinceStart >= STABLE_ORBIT_CHECK_TIME) {
      asteroid.orbitPeriod = timeSinceStart / fullRotations;
      const dist = asteroid.distanceTo(star);
      const expectedV = Math.sqrt(state_G * star.mass / dist);
      const actualV = asteroid.speed();
      const ratio = Math.abs(actualV - expectedV) / expectedV;
      return ratio < STABLE_ORBIT_THRESHOLD * 5;
    }
  }

  return false;
}

let state_G = 1.0;

export function setStateG(g: number): void {
  state_G = g;
}

export function updatePhysics(state: SimulationState, dt: number, totalTime: number): void {
  const effectiveDt = dt * state.timeScale;

  const subSteps = Math.max(1, Math.ceil(state.timeScale));
  const subDt = effectiveDt / subSteps;

  state_G = state.G;

  for (let s = 0; s < subSteps; s++) {
    const accels = computeGravity(state.bodies, state.G);
    integrateEuler(state.bodies, accels, subDt);
  }

  for (const body of state.bodies) {
    if (!body.isStar && state.trailEnabled) {
      body.addTrailPoint();
    }
  }

  const star = state.bodies.find((b) => b.isStar);
  if (star) {
    for (const body of state.bodies) {
      if (body.isAsteroid && star) {
        const stable = checkStableOrbit(body, star, totalTime);
        if (stable && !body.isStableOrbit) {
          body.isStableOrbit = true;
          body.highlighted = true;
        }
      }
    }
  }

  const collision = detectCollisions(state);
  if (collision) {
    const [asteroid, other] = collision;
    state.spawnCollisionParticles(asteroid.pos, asteroid.color, 40);
    state.spawnCollisionParticles(other.pos, other.color, 15);
    state.bodies = state.bodies.filter((b) => b !== asteroid);
    if (state.selectedBody === asteroid) {
      state.selectedBody = null;
    }
    if (state.cameraTarget === asteroid) {
      state.cameraTarget = null;
    }
  }

  state.updateParticles(effectiveDt);
}

export function computeTotalEnergy(bodies: CelestialBody[], G: number): number {
  let kinetic = 0;
  let potential = 0;

  for (const b of bodies) {
    if (b.isStar) continue;
    kinetic += 0.5 * b.mass * (b.vel.x * b.vel.x + b.vel.y * b.vel.y);
  }

  for (let i = 0; i < bodies.length; i++) {
    for (let j = i + 1; j < bodies.length; j++) {
      const dx = bodies[j].pos.x - bodies[i].pos.x;
      const dy = bodies[j].pos.y - bodies[i].pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy + SOFTENING * SOFTENING);
      potential -= (G * bodies[i].mass * bodies[j].mass) / dist;
    }
  }

  return kinetic + potential;
}
