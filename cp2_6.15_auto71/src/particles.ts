import { checkCollision, getCollisionIsland, getIslands, type Island } from './islands';
import { getFlowAt } from './ocean';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  trail: { x: number; y: number }[];
  stuck: boolean;
  stuckIsland: Island | null;
  alpha: number;
}

const MAX_PARTICLES = 500;
const PARTICLE_RADIUS = 3;
const MAX_SPEED = 80;
const TRAIL_LENGTH = 15;
const FADE_START = 4;
const LIFETIME = 5;
const PILE_THRESHOLD = 10;
const BLINK_PERIOD = 0.5;

let particles: Particle[] = [];
let islandPileCounts: Map<Island, number> = new Map();

export function addParticles(x: number, y: number, count: number): void {
  for (let i = 0; i < count; i++) {
    const offsetX = (Math.random() - 0.5) * 6;
    const offsetY = (Math.random() - 0.5) * 6;
    const px = x + offsetX;
    const py = y + offsetY;

    if (particles.length >= MAX_PARTICLES) {
      particles.shift();
    }

    particles.push({
      x: px,
      y: py,
      vx: 0,
      vy: 0,
      age: 0,
      lifetime: LIFETIME,
      trail: [{ x: px, y: py }],
      stuck: false,
      stuckIsland: null,
      alpha: 1,
    });
  }
}

export function update(dt: number): void {
  islandPileCounts.clear();

  for (const island of getIslands()) {
    islandPileCounts.set(island, 0);
  }

  for (const particle of particles) {
    if (particle.stuck) {
      particle.age += dt;
      if (particle.stuckIsland) {
        const count = islandPileCounts.get(particle.stuckIsland) || 0;
        islandPileCounts.set(particle.stuckIsland, count + 1);
      }
      continue;
    }

    const flow = getFlowAt(particle.x, particle.y);
    let targetVx = flow.vx;
    let targetVy = flow.vy;

    const speed = Math.sqrt(targetVx * targetVx + targetVy * targetVy);
    if (speed > MAX_SPEED) {
      const scale = MAX_SPEED / speed;
      targetVx *= scale;
      targetVy *= scale;
    }

    const lerpFactor = 1 - Math.pow(0.05, dt);
    particle.vx += (targetVx - particle.vx) * lerpFactor;
    particle.vy += (targetVy - particle.vy) * lerpFactor;

    const newX = particle.x + particle.vx * dt;
    const newY = particle.y + particle.vy * dt;

    const clampedX = Math.max(0, Math.min(1200, newX));
    const clampedY = Math.max(0, Math.min(800, newY));

    if (clampedX !== newX || clampedY !== newY) {
      particle.stuck = true;
      particle.vx = 0;
      particle.vy = 0;
      particle.x = clampedX;
      particle.y = clampedY;
    } else if (checkCollision(newX, newY)) {
      const island = getCollisionIsland(newX, newY);
      particle.stuck = true;
      particle.stuckIsland = island;
      particle.vx = 0;
      particle.vy = 0;

      const dx = newX - (island?.x || 0);
      const dy = newY - (island?.y || 0);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0 && island) {
        const pushDist = Math.max(island.rx, island.ry) + 4;
        particle.x = (island?.x || 0) + (dx / dist) * pushDist;
        particle.y = (island?.y || 0) + (dy / dist) * pushDist;
      } else {
        particle.x = newX;
        particle.y = newY;
      }
    } else {
      particle.x = newX;
      particle.y = newY;
    }

    particle.trail.push({ x: particle.x, y: particle.y });
    let trailLen = 0;
    for (let i = particle.trail.length - 1; i > 0; i--) {
      const tdx = particle.trail[i].x - particle.trail[i - 1].x;
      const tdy = particle.trail[i].y - particle.trail[i - 1].y;
      trailLen += Math.sqrt(tdx * tdx + tdy * tdy);
      if (trailLen > TRAIL_LENGTH) {
        particle.trail = particle.trail.slice(i);
        break;
      }
    }

    particle.age += dt;

    if (particle.age >= particle.lifetime) {
      particle.alpha = 0;
    } else if (particle.age > particle.lifetime - FADE_START) {
      particle.alpha = (particle.lifetime - particle.age) / FADE_START;
    } else {
      particle.alpha = 1;
    }
  }

  particles = particles.filter((p) => p.alpha > 0.01);
}

export function render(ctx: CanvasRenderingContext2D): void {
  for (const particle of particles) {
    const isPiled =
      particle.stuck &&
      particle.stuckIsland &&
      (islandPileCounts.get(particle.stuckIsland!) || 0) > PILE_THRESHOLD;

    let color: string;
    let currentAlpha = particle.alpha;

    if (isPiled) {
      const blinkPhase = Math.sin((particle.age / BLINK_PERIOD) * Math.PI * 2);
      currentAlpha *= 0.5 + 0.5 * Math.abs(blinkPhase);
      color = `rgba(255,152,0,${currentAlpha})`;
    } else {
      color = `rgba(255,82,82,${currentAlpha})`;
    }

    if (particle.trail.length > 1) {
      ctx.strokeStyle = isPiled
        ? `rgba(255,152,0,${currentAlpha * 0.3})`
        : `rgba(255,82,82,${currentAlpha * 0.3})`;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(particle.trail[0].x, particle.trail[0].y);
      for (let i = 1; i < particle.trail.length; i++) {
        ctx.lineTo(particle.trail[i].x, particle.trail[i].y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(particle.x, particle.y, PARTICLE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function getParticleCount(): number {
  return particles.length;
}
