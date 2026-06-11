export interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  active: boolean;
  baseAngle: number;
  baseDistance: number;
}

export interface FlowerData {
  id: string;
  x: number;
  y: number;
  word: string;
  baseHue: number;
  saturation: number;
  lightness: number;
  maxRadius: number;
  currentRadius: number;
  birthTime: number;
  bloomDuration: number;
  fadeStartTime: number;
  fadeDuration: number;
  isFading: boolean;
  isDead: boolean;
  bloomProgress: number;
  particles: Particle[];
  connections: [number, number][];
  overlappingFlowers: Set<string>;
  overlapPulsePhase: number;
}

export interface FlowerSettings {
  particleDensity: number;
  fadeDuration: number;
}

const POSITIVE_WORDS = new Set([
  '爱', '喜', '乐', '欢', '美', '好', '光', '阳', '火', '焰', '热', '暖',
  '花', '春', '夏', '笑', '甜', '蜜', '梦', '星', '月', '云', '风', '诗',
  '心', '情', '思', '念', '真', '善', '和', '平', '自', '由', '希', '望',
  '快乐', '幸福', '美好', '温暖', '阳光', '火焰', '热情', '爱情', '甜蜜',
  '希望', '梦想', '星光', '灿烂', '绚丽', '辉煌', '青春', '活力', '微笑'
]);

const NEGATIVE_WORDS = new Set([
  '悲', '伤', '痛', '苦', '泪', '寒', '冷', '冰', '雪', '冬', '秋', '雨',
  '夜', '暗', '黑', '愁', '恨', '怒', '怕', '惧', '忧', '闷', '烦', '哀',
  '孤独', '悲伤', '痛苦', '寒冷', '冰雪', '黑暗', '忧愁', '愤怒', '恐惧',
  '绝望', '失落', '寂寞', '冷清', '凄凉', '忧郁', '烦恼', '苦闷', '哀伤'
]);

const PATTERN_WORDS: Record<string, { type: string; hue: number }> = {
  '火焰': { type: 'radial', hue: 15 },
  '火': { type: 'radial', hue: 10 },
  '阳光': { type: 'radial', hue: 45 },
  '太阳': { type: 'radial', hue: 50 },
  '海洋': { type: 'vortex', hue: 200 },
  '海': { type: 'vortex', hue: 195 },
  '水': { type: 'vortex', hue: 190 },
  '森林': { type: 'radial', hue: 120 },
  '树': { type: 'radial', hue: 100 },
  '花': { type: 'petal', hue: 330 },
  '玫瑰': { type: 'petal', hue: 350 },
  '星空': { type: 'scatter', hue: 250 },
  '星': { type: 'scatter', hue: 240 },
  '冰雪': { type: 'crystal', hue: 210 },
  '冰': { type: 'crystal', hue: 200 },
  '雪': { type: 'crystal', hue: 195 },
};

class ParticlePool {
  private pool: Particle[] = [];
  private maxSize: number = 5000;

  acquire(): Particle {
    if (this.pool.length > 0) {
      const p = this.pool.pop()!;
      p.active = true;
      return p;
    }
    return {
      x: 0, y: 0, targetX: 0, targetY: 0,
      vx: 0, vy: 0, radius: 0, color: '',
      alpha: 0, life: 0, maxLife: 0,
      active: true, baseAngle: 0, baseDistance: 0
    };
  }

  release(p: Particle): void {
    p.active = false;
    if (this.pool.length < this.maxSize) {
      this.pool.push(p);
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
}

export const particlePool = new ParticlePool();

export function cubicBezierEaseOut(t: number): number {
  const p1 = 0.25, p2 = 0.46, p3 = 0.45, p4 = 0.94;
  if (t <= 0) return 0;
  if (t >= 1) return 1;
  const cx = 3 * p1;
  const bx = 3 * (p3 - p1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p2;
  const by = 3 * (p4 - p2) - cy;
  const ay = 1 - cy - by;
  let tSample = t;
  for (let i = 0; i < 8; i++) {
    const x = ((ax * tSample + bx) * tSample + cx) * tSample - t;
    if (Math.abs(x) < 1e-3) break;
    const d = (3 * ax * tSample + 2 * bx) * tSample + cx;
    if (Math.abs(d) < 1e-6) break;
    tSample -= x / d;
  }
  return ((ay * tSample + by) * tSample + cy) * tSample;
}

export function calculateSentiment(word: string): { value: number; hue: number; pattern: string } {
  let pattern = 'petal';
  let baseHue = -1;
  
  for (const [key, info] of Object.entries(PATTERN_WORDS)) {
    if (word.includes(key)) {
      pattern = info.type;
      baseHue = info.hue;
      break;
    }
  }

  let score = 0;
  let matchCount = 0;
  for (const w of POSITIVE_WORDS) {
    if (word.includes(w)) {
      score += 1;
      matchCount++;
    }
  }
  for (const w of NEGATIVE_WORDS) {
    if (word.includes(w)) {
      score -= 1;
      matchCount++;
    }
  }

  let hue: number;
  if (baseHue >= 0) {
    hue = baseHue + (Math.random() - 0.5) * 20;
  } else if (score > 0) {
    hue = Math.random() * 60;
  } else if (score < 0) {
    hue = 180 + Math.random() * 60;
  } else {
    hue = Math.random() * 360;
  }

  return { value: score, hue: hue % 360, pattern };
}

function generateParticles(
  count: number,
  centerX: number,
  centerY: number,
  maxRadius: number,
  baseHue: number,
  pattern: string
): { particles: Particle[]; connections: [number, number][] } {
  const particles: Particle[] = [];
  const connections: [number, number][] = [];
  const petals = pattern === 'vortex' ? 8 : pattern === 'radial' ? 12 : 6;

  for (let i = 0; i < count; i++) {
    const p = particlePool.acquire();
    const petalIndex = i % petals;
    const layer = Math.floor(i / petals);
    const layerRatio = layer / Math.ceil(count / petals);
    const angleOffset = (petalIndex / petals) * Math.PI * 2;
    const jitter = (Math.random() - 0.5) * 0.4;
    const angle = angleOffset + jitter * layerRatio;
    const distanceRatio = 0.2 + layerRatio * 0.8 + (Math.random() - 0.5) * 0.15;
    const distance = maxRadius * Math.pow(distanceRatio, pattern === 'vortex' ? 0.7 : 1);

    p.x = centerX;
    p.y = centerY;
    p.baseAngle = angle;
    p.baseDistance = distance;

    if (pattern === 'vortex') {
      const spiralT = distanceRatio * Math.PI * 3;
      p.targetX = centerX + Math.cos(angle + spiralT) * distance;
      p.targetY = centerY + Math.sin(angle + spiralT) * distance;
    } else if (pattern === 'crystal') {
      const crystalAngle = Math.round(angle / (Math.PI / 6)) * (Math.PI / 6);
      p.targetX = centerX + Math.cos(crystalAngle) * distance;
      p.targetY = centerY + Math.sin(crystalAngle) * distance;
    } else if (pattern === 'scatter') {
      const randomAngle = Math.random() * Math.PI * 2;
      const randomDist = maxRadius * (0.3 + Math.random() * 0.7);
      p.targetX = centerX + Math.cos(randomAngle) * randomDist;
      p.targetY = centerY + Math.sin(randomAngle) * randomDist;
    } else {
      p.targetX = centerX + Math.cos(angle) * distance;
      p.targetY = centerY + Math.sin(angle) * distance;
    }

    const hueVar = (Math.random() - 0.5) * 40;
    const sat = 70 + Math.random() * 25;
    const light = 55 + Math.random() * 20;
    const hue = (baseHue + hueVar + 360) % 360;
    p.color = `hsl(${hue}, ${sat}%, ${light}%)`;
    p.radius = 1.5 + Math.random() * 2.5;
    p.alpha = 0.7 + Math.random() * 0.3;
    p.life = 1;
    p.maxLife = 1;
    p.vx = (Math.random() - 0.5) * 0.15;
    p.vy = (Math.random() - 0.5) * 0.15;

    particles.push(p);
  }

  const particlePerLayer = petals;
  const layers = Math.ceil(count / petals);
  for (let layer = 0; layer < layers; layer++) {
    for (let p = 0; p < petals; p++) {
      const idx1 = layer * particlePerLayer + p;
      const idx2 = layer * particlePerLayer + ((p + 1) % petals);
      if (idx1 < count && idx2 < count) {
        connections.push([idx1, idx2]);
      }
      if (layer > 0) {
        const prevIdx = (layer - 1) * particlePerLayer + p;
        if (prevIdx < count && idx1 < count) {
          connections.push([prevIdx, idx1]);
        }
      }
    }
  }

  return { particles, connections };
}

export function createFlower(
  id: string,
  x: number,
  y: number,
  word: string,
  settings: FlowerSettings
): FlowerData {
  const sentiment = calculateSentiment(word);
  const count = Math.max(
    60,
    Math.min(150, Math.floor(settings.particleDensity * (0.8 + Math.random() * 0.4)))
  );
  const maxRadius = 80 + Math.min(word.length * 15, 80) + Math.random() * 40;

  const { particles, connections } = generateParticles(
    count, x, y, maxRadius, sentiment.hue, sentiment.pattern
  );

  return {
    id,
    x,
    y,
    word,
    baseHue: sentiment.hue,
    saturation: 75,
    lightness: 60,
    maxRadius,
    currentRadius: 0,
    birthTime: performance.now(),
    bloomDuration: 600,
    fadeStartTime: 0,
    fadeDuration: settings.fadeDuration * 1000,
    isFading: false,
    isDead: false,
    bloomProgress: 0,
    particles,
    connections,
    overlappingFlowers: new Set(),
    overlapPulsePhase: 0
  };
}

export function updateFlower(
  flower: FlowerData,
  now: number,
  dt: number,
  allFlowers: FlowerData[]
): void {
  if (flower.isDead) return;

  const bloomElapsed = now - flower.birthTime;
  if (bloomElapsed < flower.bloomDuration) {
    const rawProgress = bloomElapsed / flower.bloomDuration;
    flower.bloomProgress = cubicBezierEaseOut(rawProgress);
  } else {
    flower.bloomProgress = 1;
  }
  flower.currentRadius = flower.maxRadius * flower.bloomProgress;

  const fadeStart = flower.birthTime + flower.bloomDuration + 1000;
  if (!flower.isFading && now >= fadeStart) {
    flower.isFading = true;
    flower.fadeStartTime = fadeStart;
  }

  if (flower.isFading) {
    const fadeElapsed = now - flower.fadeStartTime;
    const fadeProgress = Math.min(1, fadeElapsed / flower.fadeDuration);
    for (const p of flower.particles) {
      if (p.active) {
        p.life = Math.max(0, 1 - fadeProgress);
        p.alpha = p.life * (0.7 + Math.random() * 0.1);
      }
    }
    if (fadeProgress >= 1) {
      flower.isDead = true;
      return;
    }
  }

  const timeOffset = now * 0.0003;
  for (let i = 0; i < flower.particles.length; i++) {
    const p = flower.particles[i];
    if (!p.active) continue;

    const lerp = flower.bloomProgress;
    const wobble = Math.sin(timeOffset * 10 + i * 0.5) * 0.5;
    const flowOffsetX = Math.sin(timeOffset * 2 + p.baseAngle * 3) * 2 * lerp;
    const flowOffsetY = Math.cos(timeOffset * 1.5 + p.baseAngle * 2) * 2 * lerp;

    const dx = p.targetX - flower.x + flowOffsetX;
    const dy = p.targetY - flower.y + flowOffsetY;
    p.x = flower.x + dx * lerp + wobble * (1 - lerp);
    p.y = flower.y + dy * lerp + wobble * (1 - lerp);

    p.x += p.vx * dt * 0.06;
    p.y += p.vy * dt * 0.06;
  }

  flower.overlappingFlowers.clear();
  for (const other of allFlowers) {
    if (other.id === flower.id || other.isDead) continue;
    const d = Math.hypot(other.x - flower.x, other.y - flower.y);
    const minDist = flower.currentRadius + other.currentRadius;
    if (d < minDist && flower.bloomProgress > 0.5 && other.bloomProgress > 0.5) {
      flower.overlappingFlowers.add(other.id);
      const overlapRatio = (minDist - d) / Math.max(flower.currentRadius, other.currentRadius);
      const decayPerFrame = 0.05 * (dt / 1000) * Math.min(1, overlapRatio * 2);

      for (const p of flower.particles) {
        if (!p.active || p.life <= 0) continue;
        const distFromFlower = Math.hypot(p.x - other.x, p.y - other.y);
        if (distFromFlower < other.currentRadius) {
          p.life = Math.max(0, p.life - decayPerFrame);
          p.alpha = p.life * 0.8;
          if (p.life <= 0.01) {
            p.active = false;
          }
        }
      }
    }
  }
  flower.overlapPulsePhase = (flower.overlapPulsePhase + dt * 0.012) % (Math.PI * 2);
}

export function renderFlower(
  ctx: CanvasRenderingContext2D,
  flower: FlowerData,
  allFlowers: Map<string, FlowerData>
): void {
  if (flower.isDead || flower.bloomProgress < 0.01) return;

  const hasOverlap = flower.overlappingFlowers.size > 0;
  const pulseIntensity = hasOverlap ? 0.5 + Math.sin(flower.overlapPulsePhase) * 0.5 : 0;

  ctx.lineWidth = 0.2;
  ctx.strokeStyle = hasOverlap
    ? `rgba(255, 215, 0, ${0.35 + pulseIntensity * 0.4})`
    : `hsla(${flower.baseHue}, 70%, 70%, 0.18)`;

  ctx.beginPath();
  for (const [i, j] of flower.connections) {
    const p1 = flower.particles[i];
    const p2 = flower.particles[j];
    if (!p1 || !p2 || !p1.active || !p2.active) continue;
    if (p1.life <= 0 || p2.life <= 0) continue;
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
  }
  ctx.stroke();

  if (hasOverlap && pulseIntensity > 0.25) {
    ctx.save();
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 12 * pulseIntensity;
    ctx.strokeStyle = `rgba(255, 215, 0, ${pulseIntensity * 0.6})`;
    ctx.lineWidth = 0.6;
    ctx.stroke();
    ctx.restore();
  }

  for (const p of flower.particles) {
    if (!p.active || p.life <= 0) continue;
    const a = p.alpha * p.life;
    if (a < 0.02) continue;

    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (0.8 + flower.bloomProgress * 0.2), 0, Math.PI * 2);
    ctx.fillStyle = p.color.replace('hsl(', 'hsla(').replace(')', `, ${a})`);
    ctx.fill();

    if (a > 0.5) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 1.8, 0, Math.PI * 2);
      const glowColor = p.color.replace('hsl(', 'hsla(').replace(')', `, ${a * 0.15})`);
      ctx.fillStyle = glowColor;
      ctx.fill();
    }
  }
}

export function destroyFlower(flower: FlowerData): void {
  particlePool.releaseMany(flower.particles);
  flower.particles = [];
  flower.connections = [];
  flower.overlappingFlowers.clear();
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const to255 = (x: number) => Math.round(255 * x).toString(16).padStart(2, '0');
  return `#${to255(f(0))}${to255(f(8))}${to255(f(4))}`;
}
