import type { PlantState, PlantStage } from '../game/GameLogic';

export type { PlantState, PlantStage };

export type ParticleType = 'petal' | 'burst' | 'rain' | 'stream' | 'wind' | 'drip' | 'sparkle' | 'ambient';

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  targetOpacity: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  life: number;
  maxLife: number;
  type: ParticleType;
  fadeIn: number;
  fadeOut: number;
  born: number;
}

const MAX_PARTICLES = 300;
const MIN_PARTICLES = 150;

const SOUND_PARTICLE_COLORS: Record<string, string> = {
  rain: '#90caf9',
  stream: '#66bb6a',
  wind: '#ffd54f',
};

export { MAX_PARTICLES, MIN_PARTICLES, SOUND_PARTICLE_COLORS };

export class ParticleSystem {
  private particles: Particle[] = [];
  private time: number = 0;

  get count(): number {
    return this.particles.length;
  }

  private createParticle(cfg: Partial<Particle> & { x: number; y: number; type: ParticleType; color: string }): Particle {
    const maxLife = cfg.maxLife ?? this.defaultLife(cfg.type);
    const fadeIn = cfg.fadeIn ?? this.defaultFadeIn(cfg.type);
    const fadeOut = cfg.fadeOut ?? this.defaultFadeOut(cfg.type);
    return {
      x: cfg.x,
      y: cfg.y,
      vx: cfg.vx ?? 0,
      vy: cfg.vy ?? 0,
      size: cfg.size ?? this.defaultSize(cfg.type),
      opacity: 0,
      targetOpacity: cfg.targetOpacity ?? 0.85,
      rotation: cfg.rotation ?? Math.random() * Math.PI * 2,
      rotationSpeed: cfg.rotationSpeed ?? (Math.random() - 0.5) * 0.1,
      color: cfg.color,
      life: maxLife,
      maxLife,
      type: cfg.type,
      fadeIn,
      fadeOut,
      born: this.time,
    };
  }

  private defaultLife(type: ParticleType): number {
    switch (type) {
      case 'drip': return 350;
      case 'sparkle': return 1800;
      case 'rain': return 2200;
      case 'stream': return 2800;
      case 'wind': return 3200;
      case 'burst': return 900;
      case 'ambient': return 4500;
      case 'petal': return 3800;
      default: return 2000;
    }
  }

  private defaultFadeIn(type: ParticleType): number {
    switch (type) {
      case 'drip': return 60;
      case 'sparkle': return 250;
      case 'burst': return 120;
      case 'rain': return 300;
      default: return 450;
    }
  }

  private defaultFadeOut(type: ParticleType): number {
    switch (type) {
      case 'drip': return 120;
      case 'sparkle': return 350;
      case 'burst': return 350;
      case 'rain': return 400;
      default: return 550;
    }
  }

  private defaultSize(type: ParticleType): number {
    switch (type) {
      case 'rain': return 2.5 + Math.random() * 2;
      case 'drip': return 3 + Math.random() * 1.5;
      case 'sparkle': return 2.5 + Math.random() * 3.5;
      case 'wind': return 3.5 + Math.random() * 5;
      case 'stream': return 2.5 + Math.random() * 3;
      case 'ambient': return 2 + Math.random() * 2.5;
      case 'petal': return 5 + Math.random() * 6;
      case 'burst': return 3.5 + Math.random() * 4;
      default: return 4;
    }
  }

  private pushParticle(p: Particle): boolean {
    if (this.particles.length >= MAX_PARTICLES) {
      const deadIdx = this.particles.findIndex(pt => pt.life <= 0);
      if (deadIdx >= 0) {
        this.particles[deadIdx] = p;
        return true;
      }
      return false;
    }
    this.particles.push(p);
    return true;
  }

  emitPetals(x: number, y: number, count: number) {
    const colors = ['#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#fce4ec', '#fbcfe8'];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 1.5;
      this.pushParticle(this.createParticle({
        x: x + (Math.random() - 0.5) * 35,
        y: y + (Math.random() - 0.5) * 18,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.8,
        type: 'petal',
        color: colors[Math.floor(Math.random() * colors.length)],
        rotationSpeed: (Math.random() - 0.5) * 0.12,
        size: 5 + Math.random() * 7,
      }));
    }
  }

  emitBurst(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 3.5;
      this.pushParticle(this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: 'burst',
        color: '#a5d6a7',
        maxLife: 700 + Math.random() * 500,
      }));
    }
  }

  emitDrip(x: number, y: number, count: number = 5) {
    for (let i = 0; i < count; i++) {
      const delay = i * 80;
      setTimeout(() => {
        this.pushParticle(this.createParticle({
          x: x + (Math.random() - 0.5) * 28,
          y,
          vx: (Math.random() - 0.5) * 0.4,
          vy: 0.6,
          type: 'drip',
          color: '#64b5f6',
          maxLife: 350,
        }));
      }, delay);
    }
  }

  emitSparkle(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.pushParticle(this.createParticle({
        x: x + (Math.random() - 0.5) * 50,
        y: y + (Math.random() - 0.5) * 35,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2 - 0.3,
        type: 'sparkle',
        color: '#e3f2fd',
        maxLife: 1200 + Math.random() * 800,
      }));
    }
  }

  emitSoundParticles(type: string, canvasW: number, canvasH: number) {
    if (type === 'none') return;
    const color = SOUND_PARTICLE_COLORS[type] || '#ffffff';
    const emitCount = type === 'rain' ? 8 : type === 'stream' ? 5 : 4;

    for (let i = 0; i < emitCount; i++) {
      let x: number, y: number, vx: number, vy: number;
      if (type === 'rain') {
        x = Math.random() * canvasW;
        y = -15 - Math.random() * 60;
        vx = -0.4 - Math.random() * 0.6;
        vy = 4 + Math.random() * 2.5;
      } else if (type === 'stream') {
        x = -15;
        y = canvasH * 0.45 + (Math.random() - 0.5) * canvasH * 0.5;
        vx = 1.2 + Math.random() * 2;
        vy = (Math.random() - 0.5) * 0.4;
      } else {
        x = -20 - Math.random() * 40;
        y = Math.random() * canvasH * 0.65;
        vx = 2.5 + Math.random() * 3.5;
        vy = (Math.random() - 0.5) * 1;
      }
      this.pushParticle(this.createParticle({
        x, y, vx, vy,
        type: type as ParticleType,
        color,
      }));
    }
  }

  maintainAmbient(canvasW: number, canvasH: number) {
    const deficit = MIN_PARTICLES - this.particles.length;
    if (deficit <= 0) return;
    const spawn = Math.min(deficit, 6);
    for (let i = 0; i < spawn; i++) {
      this.pushParticle(this.createParticle({
        x: Math.random() * canvasW,
        y: Math.random() * canvasH,
        vx: (Math.random() - 0.5) * 0.35,
        vy: -0.15 - Math.random() * 0.35,
        type: 'ambient',
        color: '#b9e0bc',
        targetOpacity: 0.35,
        maxLife: 4000 + Math.random() * 2000,
      }));
    }
  }

  update(dt: number) {
    this.time += dt;

    for (const p of this.particles) {
      if (p.life <= 0) continue;
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      this.applyPhysics(p);
      this.computeOpacity(p);
    }

    this.particles = this.particles.filter(p => p.life > 0);
  }

  private applyPhysics(p: Particle) {
    switch (p.type) {
      case 'petal':
        p.vy += 0.007;
        p.vx += Math.sin(this.time * 0.002 + p.x * 0.012) * 0.012;
        p.vx *= 0.995;
        break;
      case 'rain':
        p.vy = 4.5 + Math.random() * 0.5;
        p.vx = -0.4;
        break;
      case 'stream':
        p.vx += 0.006;
        p.vy += Math.sin(p.x * 0.009 + this.time * 0.0015) * 0.01;
        break;
      case 'wind':
        p.vx = 2.8 + Math.random() * 0.4;
        p.vy += Math.sin(this.time * 0.004 + p.x * 0.006) * 0.015;
        break;
      case 'drip':
        p.vy += 0.07;
        break;
      case 'burst':
        p.vx *= 0.965;
        p.vy *= 0.965;
        break;
      case 'sparkle':
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.vy -= 0.005;
        break;
      case 'ambient':
        p.vy -= 0.0015;
        p.vx += Math.sin(this.time * 0.0012 + p.y * 0.012) * 0.0025;
        break;
    }
  }

  private computeOpacity(p: Particle) {
    const age = this.time - p.born;
    const lifeRatio = p.life / p.maxLife;

    if (age < p.fadeIn) {
      p.opacity = p.targetOpacity * (age / p.fadeIn);
    } else if (lifeRatio < p.fadeOut / p.maxLife) {
      p.opacity = p.targetOpacity * (lifeRatio / (p.fadeOut / p.maxLife));
    } else {
      p.opacity = p.targetOpacity;
    }

    if (p.type === 'sparkle') {
      const shimmer = 0.5 + 0.5 * Math.sin(this.time * 0.01 + p.x * 0.08 + p.y * 0.06);
      p.opacity *= shimmer;
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (p.opacity <= 0.02) continue;
      ctx.save();
      ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.type) {
        case 'petal': this.drawPetal(ctx, p); break;
        case 'drip': this.drawDrip(ctx, p); break;
        case 'sparkle': this.drawSparkle(ctx, p); break;
        case 'rain': this.drawRain(ctx, p); break;
        case 'stream': this.drawStream(ctx, p); break;
        case 'wind': this.drawWind(ctx, p); break;
        default: this.drawDot(ctx, p); break;
      }

      ctx.restore();
    }
  }

  private drawPetal(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.size * 0.2, -p.size * 0.1, p.size * 0.35, p.size * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDrip(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.quadraticCurveTo(p.size * 0.8, 0, 0, p.size * 0.6);
    ctx.quadraticCurveTo(-p.size * 0.8, 0, 0, -p.size);
    ctx.fill();
  }

  private drawSparkle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    const s = p.size;
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.25, -s * 0.25);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.25, s * 0.25);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.25, s * 0.25);
    ctx.lineTo(-s, 0);
    ctx.lineTo(-s * 0.25, -s * 0.25);
    ctx.closePath();
    ctx.fill();
  }

  private drawRain(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.strokeStyle = p.color;
    ctx.lineWidth = 1.5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(0, -p.size * 2);
    ctx.lineTo(p.vx * 0.5, p.size * 2);
    ctx.stroke();
  }

  private drawStream(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 1.8, p.size * 0.45, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWind(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    const w = p.size * 2.5;
    const h = p.size * 0.35;
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDot(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#c8e6c9');
  gradient.addColorStop(1, '#fff8e1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

export function drawMeditationBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, w, h);
}

export function drawPlant(
  ctx: CanvasRenderingContext2D,
  state: PlantState,
  centerX: number,
  groundY: number,
  isMeditating: boolean,
) {
  const { stage, stemHeight, leafUnfurl, bloomProgress, saturation } = state;
  const sat = saturation;

  ctx.save();

  const sway = Math.sin(Date.now() * 0.0008) * (1.5 + stemHeight * 0.012);

  if (stage === 'seed') {
    drawSeed(ctx, centerX, groundY, sat, isMeditating);
  }

  if (stage !== 'seed' && stemHeight > 0.5) {
    drawStem(ctx, centerX, groundY, stemHeight, sway, sat, isMeditating);
  }

  const topX = centerX + sway;
  const topY = groundY - stemHeight;

  const leafPositions = [0.3, 0.5, 0.7, 0.88];
  const leafDirs = [-1, 1, -1, 1];

  for (let i = 0; i < 4; i++) {
    const unfurl = leafUnfurl[i] ?? 0;
    if (unfurl <= 0.01) continue;
    const t = leafPositions[i];
    const dir = leafDirs[i];
    const lx = centerX + sway * t;
    const ly = groundY - stemHeight * t;
    drawLeafParabolic(ctx, lx, ly, dir, sat, isMeditating, stemHeight, unfurl);
  }

  if (stage === 'bud' && bloomProgress < 0.1) {
    drawBud(ctx, topX, topY, sat, isMeditating);
  }

  if (stage === 'bloom') {
    drawFlower(ctx, topX, topY - 5, bloomProgress, sat, isMeditating);
  } else if (stage === 'bud' && bloomProgress >= 0) {
    drawBud(ctx, topX, topY, sat, isMeditating);
  }

  ctx.restore();
}

function drawSeed(ctx: CanvasRenderingContext2D, cx: number, gy: number, sat: number, med: boolean) {
  const seedColor = med ? '#ffffff' : `hsl(32, ${sat * 45}%, 42%)`;
  if (med) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = seedColor;
  ctx.beginPath();
  ctx.ellipse(cx, gy - 6, 9, 5.5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!med) {
    ctx.fillStyle = `hsl(28, ${sat * 35}%, 32%)`;
    ctx.beginPath();
    ctx.ellipse(cx, gy - 6, 5.5, 3.2, 0.25, 0, Math.PI * 2);
    ctx.fill();
  }
  if (med) ctx.shadowBlur = 0;
}

function drawStem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  gy: number,
  height: number,
  sway: number,
  sat: number,
  med: boolean
) {
  const stemColor = med ? '#ffffff' : `hsl(118, ${sat * 65}%, 30%)`;

  if (med) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }

  ctx.strokeStyle = stemColor;
  ctx.lineWidth = Math.max(1.5, 2.5 + height * 0.006);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(cx, gy);

  const segments = Math.max(2, Math.floor(height / 2));
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const xOffset = sway * t * t;
    const py = gy - height * t;
    const px = cx + xOffset;
    ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (med) ctx.shadowBlur = 0;
}

function drawLeafParabolic(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  sat: number,
  med: boolean,
  stemH: number,
  unfurl: number
) {
  if (unfurl <= 0.01) return;

  const leafColor = med ? 'rgba(255,255,255,0.45)' : `hsl(122, ${sat * 62}%, 38%)`;
  const maxLeafLen = Math.min(stemH * 0.13, 24);
  const leafLen = maxLeafLen * unfurl;

  if (med) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  const startAngle = -0.8 * (1 - unfurl) - 0.2;
  ctx.rotate(startAngle);

  ctx.fillStyle = leafColor;
  ctx.beginPath();
  ctx.moveTo(0, 0);

  const tipX = leafLen;
  const tipY = 0;
  const width = leafLen * 0.42;

  ctx.quadraticCurveTo(
    leafLen * 0.5,
    -width,
    tipX,
    tipY
  );
  ctx.quadraticCurveTo(
    leafLen * 0.5,
    width * 0.6,
    0,
    0
  );
  ctx.fill();

  if (!med) {
    ctx.strokeStyle = `hsl(120, ${sat * 45}%, 28%)`;
    ctx.lineWidth = 0.7;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(leafLen * 0.7, 0);
    ctx.stroke();
  }

  ctx.restore();
  if (med) ctx.shadowBlur = 0;
}

function drawBud(ctx: CanvasRenderingContext2D, x: number, y: number, sat: number, med: boolean) {
  const budColor = med ? '#ffffff' : `hsl(345, ${sat * 72}%, 60%)`;
  if (med) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = budColor;
  ctx.beginPath();
  ctx.ellipse(x, y - 9, 7, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!med) {
    ctx.fillStyle = `hsl(120, ${sat * 55}%, 32%)`;
    ctx.beginPath();
    ctx.ellipse(x - 5.5, y - 2, 4.5, 8, -0.35, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 5.5, y - 2, 4.5, 8, 0.35, 0, Math.PI * 2);
    ctx.fill();
  }

  if (med) ctx.shadowBlur = 0;
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  sat: number,
  med: boolean
) {
  const petalCount = 8;
  const petalSize = 16 * progress;
  const wobble = Math.sin(Date.now() * 0.0006) * 0.04;

  if (med) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }

  for (let i = 0; i < petalCount; i++) {
    const angle = (Math.PI * 2 / petalCount) * i + wobble;
    const hue = 340 + (i % 2) * 8;
    const petalColor = med
      ? 'rgba(255,255,255,0.55)'
      : `hsl(${hue}, ${sat * 75}%, ${70 + i * 1.5}%)`;
    ctx.fillStyle = petalColor;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(petalSize * 0.5, 0, petalSize, petalSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const centerColor = med ? '#ffffff' : `hsl(48, ${sat * 95}%, 60%)`;
  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(x, y, 5.5 * progress, 0, Math.PI * 2);
  ctx.fill();

  if (med) ctx.shadowBlur = 0;
}

export function drawBreathCircle(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  phase: number
) {
  const minR = 50;
  const maxR = 70;
  const t = 0.5 + 0.5 * Math.sin(phase);
  const radius = minR + (maxR - minR) * t;

  ctx.save();
  ctx.globalAlpha = 0.6;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.55)');
  gradient.addColorStop(0.55, 'rgba(255, 255, 255, 0.18)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBase(ctx: CanvasRenderingContext2D, centerX: number, groundY: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(0,0,0,0.15)';
  ctx.beginPath();
  ctx.ellipse(centerX, groundY + 5, 60, 12, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawGrowthPercent(ctx: CanvasRenderingContext2D, x: number, y: number, percent: number) {
  ctx.save();
  ctx.fillStyle = 'rgba(55, 65, 81, 0.75)';
  ctx.font = '13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${Math.round(percent)}%`, x, y);
  ctx.restore();
}

export function drawWaterEffect(
  ctx: CanvasRenderingContext2D,
  state: PlantState,
  centerX: number,
  groundY: number
) {
  if (!state.isWatering || state.waterEffectTimer <= 0) return;
  const progress = state.waterEffectTimer / 2000;
  ctx.save();
  ctx.globalAlpha = progress * 0.75;
  const sparkleCount = 9;
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (Math.PI * 2 / sparkleCount) * i + Date.now() * 0.0025;
    const dist = 20 + Math.sin(Date.now() * 0.004 + i * 0.8) * 10;
    const sx = centerX + Math.cos(angle) * dist;
    const sy = groundY - state.stemHeight * 0.45 + Math.sin(angle) * dist * 0.5;
    ctx.fillStyle = '#bbdefb';
    const s = 3 + (1 - progress) * 2;
    ctx.beginPath();
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx + s * 0.25, sy - s * 0.25);
    ctx.lineTo(sx + s, sy);
    ctx.lineTo(sx + s * 0.25, sy + s * 0.25);
    ctx.lineTo(sx, sy + s);
    ctx.lineTo(sx - s * 0.25, sy + s * 0.25);
    ctx.lineTo(sx - s, sy);
    ctx.lineTo(sx - s * 0.25, sy - s * 0.25);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}
