import { v4 as uuidv4 } from 'uuid';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  hue: number;
  saturation: number;
  lightness: number;
  alpha: number;
  angle: number;
  distance: number;
  speed: number;
  baseX: number;
  baseY: number;
  active: boolean;
  inOverlap: boolean;
}

export interface FlowerData {
  id: string;
  x: number;
  y: number;
  text: string;
  particles: Particle[];
  maxRadius: number;
  currentRadius: number;
  bloomProgress: number;
  bloomDuration: number;
  fadeProgress: number;
  fadeDuration: number;
  hue: number;
  emotion: 'positive' | 'negative' | 'neutral';
  createdAt: number;
  connectedLines: { from: number; to: number; isOverlap: boolean; pulseTimer: number }[];
  isAlive: boolean;
}

export type EmotionType = 'positive' | 'negative' | 'neutral';

const POSITIVE_WORDS: [string, number][] = [
  ['爱', 0.95], ['喜欢', 0.85], ['快乐', 0.9], ['阳光', 0.88], ['温暖', 0.85],
  ['火焰', 0.92], ['希望', 0.9], ['梦想', 0.88], ['幸福', 0.93], ['美好', 0.87],
  ['自由', 0.86], ['勇气', 0.84], ['光芒', 0.9], ['星辰', 0.85], ['彩虹', 0.91],
  ['春天', 0.88], ['花朵', 0.86], ['微笑', 0.9], ['热情', 0.89], ['甜蜜', 0.92],
  ['浪漫', 0.9], ['温柔', 0.87], ['欢乐', 0.88], ['活力', 0.85], ['璀璨', 0.91],
  ['绚烂', 0.9], ['辉煌', 0.88], ['明媚', 0.86], ['欢喜', 0.89], ['愉悦', 0.87],
];

const NEGATIVE_WORDS: [string, number][] = [
  ['悲伤', 0.9], ['痛苦', 0.92], ['寒冷', 0.88], ['黑暗', 0.9], ['孤独', 0.87],
  ['绝望', 0.93], ['恐惧', 0.91], ['泪水', 0.86], ['忧伤', 0.88], ['寂寞', 0.85],
  ['忧郁', 0.87], ['失落', 0.86], ['心碎', 0.92], ['迷茫', 0.84], ['疲惫', 0.83],
  ['沉重', 0.85], ['深渊', 0.9], ['风暴', 0.87], ['凋零', 0.88], ['枯萎', 0.86],
  ['沉没', 0.87], ['冰冷', 0.89], ['阴霾', 0.88], ['惆怅', 0.85], ['落寞', 0.86],
  ['死寂', 0.91], ['空洞', 0.84], ['萧索', 0.86], ['怅惘', 0.85], ['酸楚', 0.88],
];

export const emotionWordMap: Map<string, { emotion: EmotionType; intensity: number }> = new Map();

POSITIVE_WORDS.forEach(([word, intensity]) => {
  emotionWordMap.set(word, { emotion: 'positive', intensity });
});

NEGATIVE_WORDS.forEach(([word, intensity]) => {
  emotionWordMap.set(word, { emotion: 'negative', intensity });
});

export function analyzeEmotion(text: string): { emotion: EmotionType; intensity: number } {
  const trimmed = text.trim();
  if (emotionWordMap.has(trimmed)) {
    return emotionWordMap.get(trimmed)!;
  }
  for (const [word, data] of emotionWordMap.entries()) {
    if (trimmed.includes(word)) {
      return data;
    }
  }
  const hash = simpleHash(trimmed);
  const isPositive = hash % 2 === 0;
  const intensity = 0.5 + ((hash >> 3) % 50) / 100;
  return {
    emotion: isPositive ? 'positive' : 'negative',
    intensity,
  };
}

function simpleHash(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

export function calculateHue(emotion: EmotionType, text: string): number {
  const hash = simpleHash(text);
  if (emotion === 'positive') {
    return hash % 60;
  } else if (emotion === 'negative') {
    return 180 + (hash % 60);
  }
  return hash % 360;
}

export const easeOutBack = (t: number): number => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export class ParticlePool {
  private pool: Particle[] = [];
  private maxSize: number;

  constructor(maxSize: number = 6000) {
    this.maxSize = maxSize;
  }

  acquire(): Particle {
    if (this.pool.length > 0) {
      const p = this.pool.pop()!;
      p.active = true;
      p.inOverlap = false;
      return p;
    }
    return {
      x: 0, y: 0, vx: 0, vy: 0,
      life: 1, maxLife: 1, size: 0,
      hue: 0, saturation: 70, lightness: 60, alpha: 1,
      angle: 0, distance: 0, speed: 0,
      baseX: 0, baseY: 0, active: true, inOverlap: false,
    };
  }

  release(particle: Particle): void {
    if (!particle.active) return;
    particle.active = false;
    if (this.pool.length < this.maxSize) {
      this.pool.push(particle);
    }
  }

  releaseMany(particles: Particle[]): void {
    for (const p of particles) {
      this.release(p);
    }
  }

  get size(): number {
    return this.pool.length;
  }

  clear(): void {
    this.pool = [];
  }
}

export const globalParticlePool = new ParticlePool(6000);

export function createFlower(
  x: number,
  y: number,
  text: string,
  particleCount: number,
  fadeDuration: number,
): FlowerData {
  const { emotion, intensity } = analyzeEmotion(text);
  const baseHue = calculateHue(emotion, text);
  const particles: Particle[] = [];

  const finalCount = Math.max(60, Math.min(150, particleCount));

  for (let i = 0; i < finalCount; i++) {
    const p = globalParticlePool.acquire();
    const angle = (i / finalCount) * Math.PI * 2 + (Math.random() - 0.5) * 0.3;
    const distance = 30 + Math.random() * 70;
    const speed = 0.5 + Math.random() * 1.5;

    p.x = x;
    p.y = y;
    p.baseX = x;
    p.baseY = y;
    p.vx = Math.cos(angle) * speed * 0.3;
    p.vy = Math.sin(angle) * speed * 0.3;
    p.angle = angle;
    p.distance = distance;
    p.speed = speed;
    p.size = 1.5 + Math.random() * 2.5;
    p.hue = baseHue + (Math.random() - 0.5) * 30;
    p.saturation = 65 + Math.random() * 25;
    p.lightness = 50 + Math.random() * 25;
    p.alpha = 0.9;
    p.life = 1;
    p.maxLife = fadeDuration;
    p.active = true;
    p.inOverlap = false;

    particles.push(p);
  }

  const connectedLines: { from: number; to: number; isOverlap: boolean; pulseTimer: number }[] = [];
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].distance * Math.cos(particles[i].angle) -
                 particles[j].distance * Math.cos(particles[j].angle);
      const dy = particles[i].distance * Math.sin(particles[i].angle) -
                 particles[j].distance * Math.sin(particles[j].angle);
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 25 && Math.random() < 0.4) {
        connectedLines.push({ from: i, to: j, isOverlap: false, pulseTimer: 0 });
      }
    }
  }

  return {
    id: uuidv4(),
    x,
    y,
    text,
    particles,
    maxRadius: 100,
    currentRadius: 0,
    bloomProgress: 0,
    bloomDuration: 0.6,
    fadeProgress: 0,
    fadeDuration,
    hue: baseHue,
    emotion,
    createdAt: performance.now(),
    connectedLines,
    isAlive: true,
  };
}

export function updateFlower(
  flower: FlowerData,
  deltaTime: number,
  currentTime: number,
): void {
  if (!flower.isAlive) return;

  const elapsed = (currentTime - flower.createdAt) / 1000;

  if (elapsed < flower.bloomDuration) {
    flower.bloomProgress = elapsed / flower.bloomDuration;
    flower.currentRadius = flower.maxRadius * easeOutBack(flower.bloomProgress);
  } else {
    flower.bloomProgress = 1;
    flower.currentRadius = flower.maxRadius;
  }

  const fadeStart = flower.bloomDuration + 1;
  if (elapsed > fadeStart) {
    const fadeElapsed = elapsed - fadeStart;
    flower.fadeProgress = Math.min(1, fadeElapsed / (flower.fadeDuration - flower.bloomDuration - 1));
  }

  const bloomFactor = Math.min(1, flower.bloomProgress);
  const fadeFactor = 1 - flower.fadeProgress;

  for (const p of flower.particles) {
    if (!p.active) continue;

    p.x = flower.x + Math.cos(p.angle) * p.distance * bloomFactor + p.vx * elapsed * 10;
    p.y = flower.y + Math.sin(p.angle) * p.distance * bloomFactor + p.vy * elapsed * 10;

    const driftX = Math.sin(currentTime / 1000 + p.angle * 3) * 2;
    const driftY = Math.cos(currentTime / 1000 + p.angle * 2) * 2;
    p.x += driftX;
    p.y += driftY;

    if (p.inOverlap) {
      const decayRate = 0.05;
      p.alpha = Math.max(0, p.alpha * (1 - decayRate * deltaTime));
      p.life = p.alpha;
    } else {
      p.alpha = 0.9 * fadeFactor;
    }

    if (p.alpha <= 0.01) {
      p.active = false;
    }
  }

  for (const line of flower.connectedLines) {
    if (line.pulseTimer > 0) {
      line.pulseTimer = Math.max(0, line.pulseTimer - deltaTime);
      if (line.pulseTimer <= 0) {
        line.isOverlap = false;
      }
    }
  }

  const activeParticles = flower.particles.filter(p => p.active).length;
  if (flower.fadeProgress >= 1 && activeParticles === 0) {
    flower.isAlive = false;
  }
}

export function checkOverlapAndFade(
  flowers: FlowerData[],
  deltaTime: number,
): void {
  for (let i = 0; i < flowers.length; i++) {
    for (let j = i + 1; j < flowers.length; j++) {
      const f1 = flowers[i];
      const f2 = flowers[j];
      if (!f1.isAlive || !f2.isAlive) continue;

      const dx = f2.x - f1.x;
      const dy = f2.y - f1.y;
      const centerDist = Math.sqrt(dx * dx + dy * dy);
      const overlapThreshold = f1.currentRadius + f2.currentRadius;

      if (centerDist < overlapThreshold && f1.bloomProgress > 0.3 && f2.bloomProgress > 0.3) {
        const overlapAmount = overlapThreshold - centerDist;

        for (let li = 0; li < f1.connectedLines.length; li++) {
          if (!f1.connectedLines[li].isOverlap) {
            f1.connectedLines[li].isOverlap = true;
            f1.connectedLines[li].pulseTimer = 0.3;
          }
        }
        for (let li = 0; li < f2.connectedLines.length; li++) {
          if (!f2.connectedLines[li].isOverlap) {
            f2.connectedLines[li].isOverlap = true;
            f2.connectedLines[li].pulseTimer = 0.3;
          }
        }

        for (const p of f1.particles) {
          if (!p.active) continue;
          const pdx = p.x - f2.x;
          const pdy = p.y - f2.y;
          const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pDist < f2.currentRadius * 0.8) {
            p.inOverlap = true;
          }
        }
        for (const p of f2.particles) {
          if (!p.active) continue;
          const pdx = p.x - f1.x;
          const pdy = p.y - f1.y;
          const pDist = Math.sqrt(pdx * pdx + pdy * pdy);
          if (pDist < f1.currentRadius * 0.8) {
            p.inOverlap = true;
          }
        }
      }
    }
  }
}

export function renderFlowers(
  ctx: CanvasRenderingContext2D,
  flowers: FlowerData[],
  showConnectionLines: boolean,
): void {
  for (const flower of flowers) {
    if (!flower.isAlive) continue;

    if (showConnectionLines && flower.connectedLines.length > 0) {
      ctx.lineWidth = 0.2;
      for (const line of flower.connectedLines) {
        const p1 = flower.particles[line.from];
        const p2 = flower.particles[line.to];
        if (!p1.active || !p2.active) continue;

        if (line.isOverlap && line.pulseTimer > 0) {
          const pulseIntensity = line.pulseTimer / 0.3;
          ctx.strokeStyle = `rgba(255, 215, 0, ${0.8 * pulseIntensity * Math.min(p1.alpha, p2.alpha)})`;
          ctx.shadowColor = '#FFD700';
          ctx.shadowBlur = 8 * pulseIntensity;
        } else {
          ctx.strokeStyle = `hsla(${flower.hue}, 70%, 70%, ${0.15 * Math.min(p1.alpha, p2.alpha)})`;
          ctx.shadowBlur = 0;
        }

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.shadowBlur = 0;
    }

    for (const p of flower.particles) {
      if (!p.active || p.alpha <= 0) continue;

      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
      gradient.addColorStop(0, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, ${p.alpha})`);
      gradient.addColorStop(0.5, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness + 10}%, ${p.alpha * 0.6})`);
      gradient.addColorStop(1, `hsla(${p.hue}, ${p.saturation}%, ${p.lightness}%, 0)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

export function cleanupFlowers(flowers: FlowerData[]): FlowerData[] {
  const alive: FlowerData[] = [];
  for (const f of flowers) {
    if (f.isAlive) {
      alive.push(f);
    } else {
      globalParticlePool.releaseMany(f.particles);
    }
  }
  return alive;
}

export function reduceParticleCount(flowers: FlowerData[], ratio: number): void {
  for (const flower of flowers) {
    const targetCount = Math.floor(flower.particles.length * ratio);
    let removed = 0;
    for (let i = flower.particles.length - 1; i >= 0 && removed < targetCount; i--) {
      if (flower.particles[i].active) {
        globalParticlePool.release(flower.particles[i]);
        removed++;
      }
    }
  }
}
