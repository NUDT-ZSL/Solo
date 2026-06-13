export type PlantStage = 'seed' | 'sprout' | 'stem' | 'bud' | 'bloom';
export type SoundType = 'none' | 'rain' | 'stream' | 'wind';

export interface PlantState {
  stage: PlantStage;
  growthPercent: number;
  waterLevel: number;
  lightLevel: number;
  stemDrawHeight: number;
  leafCount: number;
  leafUnfurlProgress: number[];
  bloomProgress: number;
  saturation: number;
  mood: number;
  isWatering: boolean;
  waterTimer: number;
}

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
  fadeInDuration: number;
  fadeOutDuration: number;
  born: number;
}

const MAX_PARTICLES = 300;
const MIN_PARTICLES = 150;

const SOUND_COLORS: Record<string, string> = {
  rain: '#90caf9',
  stream: '#66bb6a',
  wind: '#ffd54f',
};

export class ParticleSystem {
  private particles: Particle[] = [];
  private time: number = 0;
  private ambientTimer: number = 0;

  get count(): number {
    return this.particles.length;
  }

  private createParticle(cfg: Partial<Particle> & { x: number; y: number; type: ParticleType; color: string }): Particle {
    const maxLife = cfg.maxLife ?? this.defaultLifeForType(cfg.type);
    const fadeIn = cfg.fadeInDuration ?? this.defaultFadeIn(cfg.type);
    const fadeOut = cfg.fadeOutDuration ?? this.defaultFadeOut(cfg.type);
    return {
      x: cfg.x,
      y: cfg.y,
      vx: cfg.vx ?? 0,
      vy: cfg.vy ?? 0,
      size: cfg.size ?? this.defaultSize(cfg.type),
      opacity: 0,
      targetOpacity: cfg.targetOpacity ?? 0.8,
      rotation: cfg.rotation ?? Math.random() * Math.PI * 2,
      rotationSpeed: cfg.rotationSpeed ?? (Math.random() - 0.5) * 0.08,
      color: cfg.color,
      life: maxLife,
      maxLife,
      type: cfg.type,
      fadeInDuration: fadeIn,
      fadeOutDuration: fadeOut,
      born: this.time,
    };
  }

  private defaultLifeForType(type: ParticleType): number {
    switch (type) {
      case 'drip': return 300;
      case 'sparkle': return 2000;
      case 'rain': return 2000;
      case 'stream': return 2500;
      case 'wind': return 3000;
      case 'burst': return 1200;
      case 'ambient': return 4000;
      case 'petal': return 3500;
      default: return 2000;
    }
  }

  private defaultFadeIn(type: ParticleType): number {
    switch (type) {
      case 'sparkle': return 200;
      case 'drip': return 50;
      case 'burst': return 100;
      default: return 400;
    }
  }

  private defaultFadeOut(type: ParticleType): number {
    switch (type) {
      case 'sparkle': return 300;
      case 'drip': return 100;
      case 'burst': return 300;
      default: return 500;
    }
  }

  private defaultSize(type: ParticleType): number {
    switch (type) {
      case 'rain': return 2 + Math.random() * 2;
      case 'drip': return 2.5 + Math.random();
      case 'sparkle': return 2 + Math.random() * 3;
      case 'wind': return 3 + Math.random() * 4;
      case 'stream': return 2 + Math.random() * 3;
      case 'ambient': return 2 + Math.random() * 3;
      case 'petal': return 5 + Math.random() * 5;
      case 'burst': return 3 + Math.random() * 4;
      default: return 4;
    }
  }

  private addParticle(p: Particle) {
    if (this.particles.length >= MAX_PARTICLES) {
      const oldest = this.particles.findIndex(pt => pt.life <= 0);
      if (oldest >= 0) {
        this.particles[oldest] = p;
      } else if (this.particles.length < MAX_PARTICLES + 10) {
        this.particles.push(p);
      }
    } else {
      this.particles.push(p);
    }
  }

  emitPetals(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1.2;
      this.addParticle(this.createParticle({
        x: x + (Math.random() - 0.5) * 30,
        y: y + (Math.random() - 0.5) * 15,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 0.5,
        type: 'petal',
        color: this.randomPetalColor(),
        rotationSpeed: (Math.random() - 0.5) * 0.1,
      }));
    }
  }

  private randomPetalColor(): string {
    const colors = ['#f8bbd0', '#f48fb1', '#f06292', '#ec407a', '#fce4ec'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  emitBurst(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.addParticle(this.createParticle({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        type: 'burst',
        color: '#a5d6a7',
        maxLife: 800 + Math.random() * 400,
      }));
    }
  }

  emitDrip(x: number, y: number, count: number = 5) {
    for (let i = 0; i < count; i++) {
      const delay = i * 80;
      setTimeout(() => {
        this.addParticle(this.createParticle({
          x: x + (Math.random() - 0.5) * 24,
          y,
          vx: (Math.random() - 0.5) * 0.3,
          vy: 0.5,
          type: 'drip',
          color: '#64b5f6',
          maxLife: 300,
        }));
      }, delay);
    }
  }

  emitSparkle(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      this.addParticle(this.createParticle({
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 30,
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        type: 'sparkle',
        color: '#e3f2fd',
        maxLife: 1500 + Math.random() * 500,
      }));
    }
  }

  emitSoundParticles(type: SoundType, canvasWidth: number, canvasHeight: number) {
    if (type === 'none') return;
    const color = SOUND_COLORS[type] || '#ffffff';
    const count = type === 'rain' ? 6 : type === 'stream' ? 4 : 3;
    for (let i = 0; i < count; i++) {
      let x: number, y: number, vx: number, vy: number;
      if (type === 'rain') {
        x = Math.random() * canvasWidth;
        y = -10 - Math.random() * 50;
        vx = -0.3 - Math.random() * 0.5;
        vy = 3 + Math.random() * 2;
      } else if (type === 'stream') {
        x = -10;
        y = canvasHeight * 0.5 + (Math.random() - 0.5) * canvasHeight * 0.6;
        vx = 1 + Math.random() * 1.5;
        vy = (Math.random() - 0.5) * 0.3;
      } else {
        x = -10 - Math.random() * 30;
        y = Math.random() * canvasHeight * 0.7;
        vx = 2 + Math.random() * 3;
        vy = (Math.random() - 0.5) * 0.8;
      }
      this.addParticle(this.createParticle({
        x, y, vx, vy,
        type: type as ParticleType,
        color,
      }));
    }
  }

  emitAmbient(canvasWidth: number, canvasHeight: number) {
    if (this.particles.length < MIN_PARTICLES) {
      const deficit = MIN_PARTICLES - this.particles.length;
      const count = Math.min(deficit, 5);
      for (let i = 0; i < count; i++) {
        this.addParticle(this.createParticle({
          x: Math.random() * canvasWidth,
          y: Math.random() * canvasHeight,
          vx: (Math.random() - 0.5) * 0.3,
          vy: -0.1 - Math.random() * 0.3,
          type: 'ambient',
          color: '#c8e6c9',
          targetOpacity: 0.3,
        }));
      }
    }
  }

  update(dt: number) {
    this.time += dt;
    this.ambientTimer += dt;

    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      this.applyPhysics(p, dt);
      this.computeOpacity(p);
    }

    this.particles = this.particles.filter(p => p.life > 0);
  }

  private applyPhysics(p: Particle, _dt: number) {
    switch (p.type) {
      case 'petal':
        p.vy += 0.008;
        p.vx += Math.sin(this.time * 0.002 + p.x * 0.01) * 0.01;
        p.vx *= 0.99;
        break;
      case 'rain':
        p.vy = 4 + Math.random() * 0.5;
        p.vx = -0.3;
        break;
      case 'stream':
        p.vx += 0.005;
        p.vy += Math.sin(p.x * 0.008 + this.time * 0.001) * 0.008;
        break;
      case 'wind':
        p.vx = 2 + Math.random() * 0.3;
        p.vy += Math.sin(this.time * 0.003 + p.x * 0.005) * 0.01;
        break;
      case 'drip':
        p.vy += 0.06;
        break;
      case 'burst':
        p.vx *= 0.97;
        p.vy *= 0.97;
        break;
      case 'sparkle':
        p.vx *= 0.98;
        p.vy *= 0.98;
        break;
      case 'ambient':
        p.vy -= 0.001;
        p.vx += Math.sin(this.time * 0.001 + p.y * 0.01) * 0.002;
        break;
    }
  }

  private computeOpacity(p: Particle) {
    const age = this.time - p.born;
    const lifeRatio = p.life / p.maxLife;

    if (age < p.fadeInDuration) {
      p.opacity = p.targetOpacity * (age / p.fadeInDuration);
    } else if (lifeRatio < p.fadeOutDuration / p.maxLife) {
      p.opacity = p.targetOpacity * (lifeRatio / (p.fadeOutDuration / p.maxLife));
    } else {
      p.opacity = p.targetOpacity;
    }

    if (p.type === 'sparkle') {
      p.opacity *= 0.5 + 0.5 * Math.sin(this.time * 0.008 + p.x * 0.1);
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (p.opacity <= 0.01) continue;
      ctx.save();
      ctx.globalAlpha = p.opacity;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      switch (p.type) {
        case 'petal':
          this.drawPetal(ctx, p);
          break;
        case 'drip':
          this.drawDrip(ctx, p);
          break;
        case 'sparkle':
          this.drawSparkle(ctx, p);
          break;
        case 'rain':
          this.drawRain(ctx, p);
          break;
        case 'stream':
          this.drawStream(ctx, p);
          break;
        case 'wind':
          this.drawWind(ctx, p);
          break;
        default:
          this.drawGeneric(ctx, p);
          break;
      }

      ctx.restore();
    }
  }

  private drawPetal(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.beginPath();
    ctx.ellipse(p.size * 0.2, -p.size * 0.1, p.size * 0.4, p.size * 0.2, -0.3, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawDrip(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.size, 0, Math.PI * 2);
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
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(p.vx * 2, p.vy * 2);
    ctx.stroke();
  }

  private drawStream(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 1.5, p.size * 0.5, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
    ctx.fill();
  }

  private drawWind(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    const w = p.size * 2;
    const h = p.size * 0.4;
    ctx.ellipse(0, 0, w, h, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  private drawGeneric(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.size * 0.5, 0, Math.PI * 2);
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
  const { stage, stemDrawHeight, leafCount, leafUnfurlProgress, bloomProgress, saturation } = state;
  const sat = saturation;

  ctx.save();

  if (stage === 'seed') {
    drawSeed(ctx, centerX, groundY, sat, isMeditating);
  }

  if (stage !== 'seed') {
    drawStem(ctx, centerX, groundY, stemDrawHeight, sat, isMeditating);
    const sway = Math.sin(Date.now() * 0.0008) * (2 + stemDrawHeight * 0.01);
    const topX = centerX + sway;
    const topY = groundY - stemDrawHeight;

    const leafDefs = [
      { t: 0.35, dir: -1, idx: 0 },
      { t: 0.55, dir: 1, idx: 1 },
      { t: 0.72, dir: -1, idx: 2 },
      { t: 0.88, dir: 1, idx: 3 },
    ];

    for (let i = 0; i < Math.min(Math.floor(leafCount), leafDefs.length); i++) {
      const def = leafDefs[i];
      const lx = centerX + sway * def.t;
      const ly = groundY - stemDrawHeight * def.t;
      const unfurl = leafUnfurlProgress[i] ?? 0;
      drawLeaf(ctx, lx, ly, def.dir, sat, isMeditating, stemDrawHeight, unfurl);
    }

    if (stage === 'bud') {
      drawBud(ctx, topX, topY, sat, isMeditating);
    }

    if (stage === 'bloom') {
      drawFlower(ctx, topX, topY - 5, bloomProgress, sat, isMeditating);
    }
  }

  ctx.restore();
}

function drawSeed(ctx: CanvasRenderingContext2D, cx: number, gy: number, sat: number, med: boolean) {
  const seedColor = med ? '#ffffff' : `hsl(30, ${sat * 40}%, 45%)`;
  ctx.fillStyle = seedColor;
  ctx.beginPath();
  ctx.ellipse(cx, gy - 6, 8, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (!med) {
    ctx.fillStyle = `hsl(30, ${sat * 30}%, 35%)`;
    ctx.beginPath();
    ctx.ellipse(cx, gy - 6, 5, 3, 0.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawStem(
  ctx: CanvasRenderingContext2D,
  cx: number,
  gy: number,
  height: number,
  sat: number,
  med: boolean
) {
  const stemColor = med ? '#ffffff' : `hsl(120, ${sat * 60}%, 32%)`;
  const sway = Math.sin(Date.now() * 0.0008) * (2 + height * 0.01);

  if (med) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }

  ctx.strokeStyle = stemColor;
  ctx.lineWidth = Math.max(2, 3 + height * 0.005);
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(cx, gy);

  const segments = Math.max(1, Math.floor(height / 2));
  for (let i = 1; i <= segments; i++) {
    const t = i / segments;
    const py = gy - height * t;
    const px = cx + sway * t * t;
    ctx.lineTo(px, py);
  }
  ctx.stroke();

  if (med) {
    ctx.shadowBlur = 0;
  }
}

function drawLeaf(
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

  const leafColor = med ? 'rgba(255,255,255,0.4)' : `hsl(120, ${sat * 60}%, 42%)`;
  const leafSize = Math.min(stemH * 0.12, 22) * unfurl;
  const openAngle = unfurl * 0.6;

  if (med) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }

  ctx.fillStyle = leafColor;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);

  ctx.beginPath();
  ctx.moveTo(0, 0);

  const tipX = leafSize * Math.cos(-openAngle);
  const tipY = -leafSize * Math.sin(openAngle);
  const cp1x = leafSize * 0.4;
  const cp1y = -leafSize * 0.8 * unfurl;
  const cp2x = leafSize * 0.9;
  const cp2y = -leafSize * 0.2 * unfurl;

  ctx.quadraticCurveTo(cp1x, cp1y, tipX, tipY);
  ctx.quadraticCurveTo(cp2x, cp2y, leafSize, 0);
  const cp3x = leafSize * 0.9;
  const cp3y = leafSize * 0.2 * unfurl;
  const cp4x = leafSize * 0.4;
  const cp4y = leafSize * 0.8 * unfurl;
  ctx.quadraticCurveTo(cp3x, cp3y, cp4x, cp4y);
  ctx.quadraticCurveTo(cp4x * 0.5, cp4y * 0.3, 0, 0);
  ctx.fill();

  ctx.strokeStyle = med ? 'rgba(255,255,255,0.2)' : `hsl(120, ${sat * 40}%, 30%)`;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(tipX * 0.8, tipY * 0.8);
  ctx.stroke();

  ctx.restore();

  if (med) {
    ctx.shadowBlur = 0;
  }
}

function drawBud(ctx: CanvasRenderingContext2D, x: number, y: number, sat: number, med: boolean) {
  const budColor = med ? '#ffffff' : `hsl(340, ${sat * 70}%, 62%)`;
  if (med) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }
  ctx.fillStyle = budColor;
  ctx.beginPath();
  ctx.ellipse(x, y - 8, 6, 10, 0, 0, Math.PI * 2);
  ctx.fill();

  if (!med) {
    ctx.fillStyle = `hsl(120, ${sat * 50}%, 35%)`;
    ctx.beginPath();
    ctx.ellipse(x - 5, y - 2, 4, 7, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(x + 5, y - 2, 4, 7, 0.3, 0, Math.PI * 2);
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
  const petalSize = 14 * progress;

  if (med) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
  }

  for (let i = 0; i < petalCount; i++) {
    const angle = (Math.PI * 2 / petalCount) * i + Math.sin(Date.now() * 0.0005) * 0.05;
    const petalColor = med ? 'rgba(255,255,255,0.5)' : `hsl(340, ${sat * 70}%, ${70 + i * 2}%)`;
    ctx.fillStyle = petalColor;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(petalSize * 0.55, 0, petalSize, petalSize * 0.38, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const centerColor = med ? '#ffffff' : `hsl(45, ${sat * 90}%, 62%)`;
  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(x, y, 5 * progress, 0, Math.PI * 2);
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
  const radius = minR + (maxR - minR) * (0.5 + 0.5 * Math.sin(phase));
  ctx.save();
  ctx.globalAlpha = 0.6;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
  gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.15)');
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
  ctx.fillStyle = 'rgba(55, 65, 81, 0.7)';
  ctx.font = '13px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(percent)}%`, x, y);
  ctx.restore();
}

export function drawWaterSparkle(
  ctx: CanvasRenderingContext2D,
  state: PlantState,
  centerX: number,
  groundY: number
) {
  if (!state.isWatering || state.waterTimer <= 0) return;
  const progress = state.waterTimer / 2000;
  ctx.save();
  ctx.globalAlpha = progress * 0.7;
  const sparkleCount = 8;
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (Math.PI * 2 / sparkleCount) * i + Date.now() * 0.003;
    const dist = 18 + Math.sin(Date.now() * 0.004 + i) * 10;
    const sx = centerX + Math.cos(angle) * dist;
    const sy = groundY - state.stemDrawHeight * 0.4 + Math.sin(angle) * dist * 0.5;
    ctx.fillStyle = '#bbdefb';
    const s = 3;
    ctx.beginPath();
    ctx.moveTo(sx, sy - s);
    ctx.lineTo(sx + s * 0.3, sy - s * 0.3);
    ctx.lineTo(sx + s, sy);
    ctx.lineTo(sx + s * 0.3, sy + s * 0.3);
    ctx.lineTo(sx, sy + s);
    ctx.lineTo(sx - s * 0.3, sy + s * 0.3);
    ctx.lineTo(sx - s, sy);
    ctx.lineTo(sx - s * 0.3, sy - s * 0.3);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

export { MAX_PARTICLES, MIN_PARTICLES, SOUND_COLORS };
