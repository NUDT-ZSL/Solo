import * as THREE from 'three';
import { BuildingData, WindParticle } from '../types';

const GRID_SIZE = 30;
const PARTICLE_LIFESPAN = 3;
const WIND_SPEED = 0.5;
const WIND_ANGLE = 15 * (Math.PI / 180);

export function getWindDirection(): THREE.Vector3 {
  return new THREE.Vector3(
    Math.sin(WIND_ANGLE),
    0,
    Math.cos(WIND_ANGLE)
  ).normalize();
}

function getBuildingWakeInfluence(
  pos: THREE.Vector3,
  building: BuildingData,
  windDir: THREE.Vector3
): { speedMult: number; verticalPush: number; densityFactor: number } {
  const hw = building.width / 2;
  const hd = building.depth / 2;

  const toBuilding = new THREE.Vector3(building.x - pos.x, 0, building.z - pos.z);
  const projAlongWind = toBuilding.dot(windDir);

  if (projAlongWind < -hw) {
    return { speedMult: 1, verticalPush: 0, densityFactor: 1 };
  }

  const perpDir = new THREE.Vector3(-windDir.z, 0, windDir.x);
  const perpDist = Math.abs(toBuilding.dot(perpDir));

  const wakeStart = -hw;
  const wakeEnd = building.height * 1.5;
  const normalizedDist = Math.max(0, (projAlongWind - wakeStart) / (wakeEnd - wakeStart));

  const wakeWidth = (hw + hd) * (1 + normalizedDist * 0.5);
  const insideWake = perpDist < wakeWidth && pos.y < building.height * 1.3;

  if (!insideWake) {
    return { speedMult: 1, verticalPush: 0, densityFactor: 1 };
  }

  const heightFactor = Math.max(0, 1 - pos.y / (building.height * 1.2));

  const heightInfluence = Math.min(1, building.height / 20);
  const speedMult = 0.3 + 0.7 * (1 - heightFactor * 0.6 * heightFactor);

  const verticalPush = heightInfluence * heightFactor * 0.8;

  const densityFactor = 0.3 + 0.7 * normalizedDist;

  return { speedMult, verticalPush, densityFactor };
}

function isInsideBuilding(pos: THREE.Vector3, building: BuildingData): boolean {
  const hw = building.width / 2;
  const hd = building.depth / 2;
  const margin = 0.1;
  return (
    pos.x >= building.x - hw - margin && pos.x <= building.x + hw + margin &&
    pos.z >= building.z - hd - margin && pos.z <= building.z + hd + margin &&
    pos.y >= 0 && pos.y <= building.height + margin
  );
}

function getSideWindDeflection(
  pos: THREE.Vector3,
  building: BuildingData,
  windDir: THREE.Vector3
): THREE.Vector3 {
  const deflection = new THREE.Vector3(0, 0, 0);
  const hw = building.width / 2;
  const hd = building.depth / 2;

  const perpDir = new THREE.Vector3(-windDir.z, 0, windDir.x);
  const toBuilding = new THREE.Vector3(building.x - pos.x, 0, building.z - pos.z);
  const perpDist = toBuilding.dot(perpDir);
  const alongDist = toBuilding.dot(windDir);

  const sideRadius = hw + hd + 2;
  const dist = Math.sqrt(perpDist * perpDist + alongDist * alongDist);

  if (dist < sideRadius && pos.y < building.height * 0.8) {
    const strength = (1 - dist / sideRadius) * 0.5;
    const sign = perpDist > 0 ? 1 : -1;
    deflection.copy(perpDir).multiplyScalar(sign * strength);
  }

  return deflection;
}

function calculateWindVelocity(
  pos: THREE.Vector3,
  buildings: BuildingData[],
  windDir: THREE.Vector3
): { velocity: THREE.Vector3; densityFactor: number } {
  let baseSpeed = WIND_SPEED;
  let verticalVel = 0;
  let totalDensityFactor = 1;
  const sideDeflection = new THREE.Vector3(0, 0, 0);

  for (const b of buildings) {
    if (b.isGreen) continue;

    const influence = getBuildingWakeInfluence(pos, b, windDir);
    baseSpeed *= influence.speedMult;
    verticalVel += influence.verticalPush;
    totalDensityFactor = Math.min(totalDensityFactor, influence.densityFactor);

    const deflection = getSideWindDeflection(pos, b, windDir);
    sideDeflection.add(deflection);
  }

  const velocity = windDir.clone().multiplyScalar(baseSpeed);
  velocity.y = verticalVel + (Math.random() - 0.5) * 0.05;
  velocity.add(sideDeflection);

  return { velocity, densityFactor: totalDensityFactor };
}

export function createParticles(count: number): WindParticle[] {
  const particles: WindParticle[] = [];
  const windDir = getWindDirection();

  for (let i = 0; i < count; i++) {
    particles.push(spawnParticle(windDir, true));
  }

  return particles;
}

function spawnParticle(windDir: THREE.Vector3, randomAge = false): WindParticle {
  const startOffset = windDir.clone().multiplyScalar(-GRID_SIZE / 2 - 2);
  const perpDir = new THREE.Vector3(-windDir.z, 0, windDir.x);

  const perpOffset = (Math.random() - 0.5) * GRID_SIZE * 1.2;

  return {
    position: new THREE.Vector3(
      startOffset.x + perpOffset * perpDir.x,
      0.5 + Math.random() * 25,
      startOffset.z + perpOffset * perpDir.z
    ),
    velocity: windDir.clone().multiplyScalar(WIND_SPEED),
    age: randomAge ? Math.random() * PARTICLE_LIFESPAN : 0,
    lifespan: PARTICLE_LIFESPAN + Math.random() * 1,
    trail: []
  };
}

export function updateParticles(
  particles: WindParticle[],
  buildings: BuildingData[],
  deltaTime: number
): { particles: WindParticle[]; trails: THREE.Vector3[][] } {
  const windDir = getWindDirection();
  const trails: THREE.Vector3[][] = [];
  const newParticles: WindParticle[] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.age += deltaTime;

    const { velocity, densityFactor } = calculateWindVelocity(p.position, buildings, windDir);
    p.velocity.lerp(velocity, 0.2);

    const newPos = p.position.clone().addScaledVector(p.velocity, deltaTime);

    let blocked = false;
    for (const b of buildings) {
      if (b.isGreen) continue;
      if (isInsideBuilding(newPos, b)) {
        blocked = true;
        break;
      }
    }

    if (blocked) {
      p.position.y += 3 * deltaTime;
      p.position.addScaledVector(windDir, 0.1 * deltaTime);
    } else {
      if (p.position.y < 0.3) {
        p.position.y = 0.3;
        p.velocity.y = Math.abs(p.velocity.y) * 0.5;
      }

      if (Math.random() > densityFactor * 0.5) {
        p.trail.push(p.position.clone());
        if (p.trail.length > 25) p.trail.shift();
      }
      p.position.copy(newPos);
    }

    const outOfBounds =
      Math.abs(p.position.x) > GRID_SIZE / 2 + 10 ||
      Math.abs(p.position.z) > GRID_SIZE / 2 + 10 ||
      p.position.y > 35 ||
      p.age >= p.lifespan;

    if (outOfBounds) {
      newParticles.push(spawnParticle(windDir, false));
      continue;
    }

    if (p.trail.length > 2) {
      trails.push([...p.trail]);
    }

    newParticles.push(p);
  }

  return { particles: newParticles, trails };
}

export function particleColor(age: number, lifespan: number): THREE.Color {
  const t = age / lifespan;
  const color = new THREE.Color();
  color.setRGB(
    33 / 255 * (1 - t) + 1 * t,
    150 / 255 * (1 - t) + 1 * t,
    243 / 255 * (1 - t) + 1 * t
  );
  return color;
}

export function getParticleOpacity(age: number, lifespan: number): number {
  const t = age / lifespan;
  if (t < 0.1) return t * 10;
  if (t > 0.8) return (1 - t) * 5;
  return 1;
}
