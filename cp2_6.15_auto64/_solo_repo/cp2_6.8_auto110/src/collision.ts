import { RocketState } from './physics';

export interface PlatformState {
  x: number;
  y: number;
  width: number;
  height: number;
  baseX: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export type LandingStatus = 'flying' | 'success' | 'crashed';

export function checkLanding(
  rocket: RocketState,
  platform: PlatformState
): LandingStatus {
  const rocketBottom = rocket.y + 30;
  const platformTop = platform.y - 6;
  const platformLeft = platform.x - platform.width / 2;
  const platformRight = platform.x + platform.width / 2;

  if (
    rocketBottom >= platformTop &&
    rocketBottom <= platform.y + 20 &&
    rocket.x >= platformLeft &&
    rocket.x <= platformRight
  ) {
    if (Math.abs(rocket.angle) < 15 && Math.abs(rocket.vy) < 3) {
      return 'success';
    } else {
      return 'crashed';
    }
  }

  if (rocket.y > platform.y + 100) {
    return 'crashed';
  }

  return 'flying';
}

const PARTICLE_COLORS = ['#EF5350', '#42A5F5', '#FFCA28', '#66BB6A', '#FF6F00', '#B0BEC5'];

export function createExplosionParticles(x: number, y: number): Particle[] {
  const count = 10 + Math.floor(Math.random() * 6);
  const particles: Particle[] = [];

  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 1 + Math.random() * 4;
    particles.push({
      x: x,
      y: y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 1,
      color: PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)],
      life: 60,
      maxLife: 60,
      size: 4
    });
  }

  return particles;
}

export function updateParticles(particles: Particle[]): Particle[] {
  return particles
    .map((p) => ({
      ...p,
      x: p.x + p.vx,
      y: p.y + p.vy,
      vy: p.vy + 0.15,
      vx: p.vx * 0.99,
      life: p.life - 1
    }))
    .filter((p) => p.life > 0);
}
