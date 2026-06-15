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

export function createParticles(count: number): WindParticle[] {
  const particles: WindParticle[] = [];
  const windDir = getWindDirection();

  for (let i = 0; i < count; i++) {
    particles.push(spawnParticle(windDir));
  }

  return particles;
}

function spawnParticle(windDir: THREE.Vector3): WindParticle {
  const offset = windDir.clone().multiplyScalar(-GRID_SIZE / 2);
  return {
    position: new THREE.Vector3(
      offset.x + (Math.random() - 0.5) * 2,
      1 + Math.random() * 20,
      offset.z + (Math.random() - 0.5) * GRID_SIZE
    ),
    velocity: windDir.clone().multiplyScalar(WIND_SPEED),
    age: Math.random() * PARTICLE_LIFESPAN,
    lifespan: PARTICLE_LIFESPAN,
    trail: []
  };
}

function isInsideBuilding(pos: THREE.Vector3, building: BuildingData): boolean {
  const hw = building.width / 2;
  const hd = building.depth / 2;
  return (
    pos.x >= building.x - hw && pos.x <= building.x + hw &&
    pos.z >= building.z - hd && pos.z <= building.z + hd &&
    pos.y >= 0 && pos.y <= building.height
  );
}

function isInWake(pos: THREE.Vector3, building: BuildingData, windDir: THREE.Vector3): boolean {
  const hw = building.width / 2;
  const hd = building.depth / 2;

  const toBuilding = new THREE.Vector3(building.x - pos.x, 0, building.z - pos.z);
  const proj = toBuilding.dot(windDir);
  if (proj < 0) return false;

  const perp = toBuilding.clone().addScaledVector(windDir, -proj);
  const perpDist = perp.length();
  const wakeWidth = hw + hd + proj * 0.3;

  return perpDist < wakeWidth && pos.y < building.height * 1.2;
}

export function updateParticles(
  particles: WindParticle[],
  buildings: BuildingData[],
  deltaTime: number
): { particles: WindParticle[]; trails: THREE.Vector3[][] } {
  const windDir = getWindDirection();
  const trails: THREE.Vector3[][] = [];

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    p.age += deltaTime;

    let speedMult = 1;
    for (const b of buildings) {
      if (b.isGreen) continue;
      if (isInWake(p.position, b, windDir)) {
        speedMult *= 0.4;
        break;
      }
    }

    const vel = windDir.clone().multiplyScalar(WIND_SPEED * speedMult);
    vel.y = (Math.random() - 0.5) * 0.1;
    p.velocity.lerp(vel, 0.3);

    const newPos = p.position.clone().addScaledVector(p.velocity, deltaTime);

    let blocked = false;
    for (const b of buildings) {
      if (b.isGreen) continue;
      if (isInsideBuilding(newPos, b)) {
        blocked = true;
        break;
      }
    }

    if (!blocked) {
      p.trail.push(p.position.clone());
      if (p.trail.length > 30) p.trail.shift();
      p.position.copy(newPos);
    } else {
      p.position.y += 2 * deltaTime;
    }

    if (
      p.age >= p.lifespan ||
      Math.abs(p.position.x) > GRID_SIZE / 2 + 5 ||
      Math.abs(p.position.z) > GRID_SIZE / 2 + 5 ||
      p.position.y > 35
    ) {
      particles[i] = spawnParticle(windDir);
      continue;
    }

    if (p.trail.length > 1) {
      trails.push([...p.trail]);
    }
  }

  return { particles, trails };
}

export function particleColor(age: number, lifespan: number): THREE.Color {
  const t = age / lifespan;
  const color = new THREE.Color();
  color.setRGB(
    33 / 255 * (1 - t) + 1,
    150 / 255 * (1 - t) + 1,
    243 / 255 * (1 - t) + 1
  );
  return color;
}
