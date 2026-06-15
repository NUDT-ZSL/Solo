export type ParticlePhase = 'forming' | 'stable' | 'dispersing';

export interface Particle {
  originX: number;
  originY: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  trail: { x: number; y: number; alpha: number }[];
  phase: ParticlePhase;
  phaseProgress: number;
  shimmer: number;
  delay: number;
}

export interface ParticleSystemConfig {
  speed: number;
  dispersalIntensity: number;
  particleDensity: number;
  trailLength: number;
}

const PHASE_DURATIONS = {
  forming: 2.0,
  stable: 1.5,
  dispersing: 2.5,
};

function sampleTextPixels(
  text: string,
  width: number,
  height: number,
  density: number,
): { x: number; y: number }[] {
  const offscreen = document.createElement('canvas');
  offscreen.width = width;
  offscreen.height = height;
  const ctx = offscreen.getContext('2d')!;

  const fontSize = Math.min(width / (text.length * 0.8 + 1), height * 0.4, 120);
  ctx.font = `bold ${fontSize}px "Microsoft YaHei", "PingFang SC", "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#fff';
  ctx.fillText(text, width / 2, height / 2);

  const imageData = ctx.getImageData(0, 0, width, height);
  const pixels = imageData.data;
  const points: { x: number; y: number }[] = [];

  const step = Math.max(1, Math.round(4 / density));

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      const idx = (y * width + x) * 4;
      if (pixels[idx + 3] > 128) {
        points.push({ x, y });
      }
    }
  }

  return points;
}

export function createParticles(
  text: string,
  width: number,
  height: number,
  config: ParticleSystemConfig,
): Particle[] {
  const points = sampleTextPixels(text, width, height, config.particleDensity);

  return points.map((point, i) => {
    const angle = Math.random() * Math.PI * 2;
    const distance = config.dispersalIntensity * (50 + Math.random() * 150);
    const hue = 35 + Math.random() * 20;
    const saturation = 80 + Math.random() * 20;
    const lightness = 55 + Math.random() * 20;

    return {
      originX: point.x,
      originY: point.y,
      x: point.x + Math.cos(angle) * distance,
      y: point.y + Math.sin(angle) * distance,
      vx: 0,
      vy: 0,
      size: 1.2 + Math.random() * 1.8,
      hue,
      saturation,
      lightness,
      alpha: 0,
      trail: [],
      phase: 'forming' as ParticlePhase,
      phaseProgress: 0,
      shimmer: 0,
      delay: (i / points.length) * 0.5,
    };
  });
}

export function updateParticles(
  particles: Particle[],
  deltaTime: number,
  config: ParticleSystemConfig,
  elapsed: number,
): Particle[] {
  const speedMultiplier = config.speed;

  return particles.map((p) => {
    const particle = { ...p };
    const adjustedTime = elapsed - particle.delay;
    if (adjustedTime < 0) return particle;

    particle.phaseProgress += (deltaTime * speedMultiplier) / PHASE_DURATIONS[particle.phase];

    if (particle.phaseProgress >= 1) {
      particle.phaseProgress = 0;
      if (particle.phase === 'forming') {
        particle.phase = 'stable';
      } else if (particle.phase === 'stable') {
        particle.phase = 'dispersing';
      } else {
        particle.phase = 'forming';
      }
    }

    const t = easeInOutCubic(particle.phaseProgress);

    if (particle.phase === 'forming') {
      const startX = particle.originX + Math.cos(particle.delay * 10) * config.dispersalIntensity * 100;
      const startY = particle.originY + Math.sin(particle.delay * 10) * config.dispersalIntensity * 100;
      particle.x = startX + (particle.originX - startX) * t;
      particle.y = startY + (particle.originY - startY) * t;
      particle.alpha = Math.min(1, t * 1.5);
      particle.shimmer = (1 - t) * 0.8;

      if (particle.trail.length > 0) {
        particle.trail = particle.trail
          .map((tr) => ({ ...tr, alpha: tr.alpha * 0.85 }))
          .filter((tr) => tr.alpha > 0.02);
      }
    } else if (particle.phase === 'stable') {
      particle.x = particle.originX + (Math.random() - 0.5) * 0.5;
      particle.y = particle.originY + (Math.random() - 0.5) * 0.5;
      particle.alpha = 0.9 + Math.sin(adjustedTime * 3) * 0.1;
      particle.shimmer = 0;
      particle.trail = [];
    } else {
      const windAngle = Math.sin(adjustedTime * 0.7 + particle.originX * 0.01) * 0.5 + 0.3;
      const disperseX = particle.originX + Math.cos(windAngle) * config.dispersalIntensity * 150 * t;
      const disperseY = particle.originY + Math.sin(windAngle) * config.dispersalIntensity * 120 * t - config.dispersalIntensity * 30 * t;
      particle.x = disperseX + Math.sin(adjustedTime * 2 + particle.originX * 0.05) * 8;
      particle.y = disperseY + Math.cos(adjustedTime * 1.5 + particle.originY * 0.05) * 6;
      particle.alpha = 1 - t * 0.6;
      particle.shimmer = 0;

      if (config.trailLength > 0) {
        particle.trail = [
          { x: particle.x, y: particle.y, alpha: 0.4 },
          ...particle.trail.slice(0, config.trailLength),
        ].map((tr, idx) => ({
          ...tr,
          alpha: tr.alpha * (1 - idx / (config.trailLength + 1)) * 0.8,
        }));
      }
    }

    return particle;
  });
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function resetParticles(particles: Particle[]): Particle[] {
  return particles.map((p) => ({
    ...p,
    x: p.originX,
    y: p.originY,
    vx: 0,
    vy: 0,
    alpha: 1,
    trail: [],
    phase: 'stable' as ParticlePhase,
    phaseProgress: 0,
    shimmer: 0,
    delay: 0,
  }));
}

export function getParticleCount(width: number, height: number): number {
  const area = width * height;
  if (area < 200000) return 1500;
  if (area < 500000) return 3000;
  if (area < 1000000) return 5000;
  return 7000;
}

export function getParticleDensity(width: number, height: number): number {
  const area = width * height;
  if (area < 200000) return 0.5;
  if (area < 500000) return 0.8;
  if (area < 1000000) return 1.0;
  return 1.2;
}
