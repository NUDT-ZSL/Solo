export type PlantStage = 'seed' | 'sprout' | 'stem' | 'bud' | 'bloom';
export type SoundType = 'none' | 'rain' | 'stream' | 'wind';

export interface PlantState {
  stage: PlantStage;
  growthPercent: number;
  waterLevel: number;
  lightLevel: number;
  stemHeight: number;
  leafCount: number;
  bloomProgress: number;
  saturation: number;
  mood: number;
  isWatering: boolean;
  waterTimer: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  opacity: number;
  rotation: number;
  rotationSpeed: number;
  color: string;
  life: number;
  maxLife: number;
  type: 'petal' | 'burst' | 'rain' | 'stream' | 'wind' | 'drip' | 'sparkle';
}

const MAX_PARTICLES = 300;

export class ParticleSystem {
  private particles: Particle[] = [];

  emit(x: number, y: number, count: number, type: Particle['type'], color: string, spread: number = 2) {
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        const idx = this.particles.findIndex(p => p.life <= 0);
        if (idx >= 0) this.particles.splice(idx, 1);
        else break;
      }
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * spread;
      const maxLife = type === 'drip' ? 300 : type === 'sparkle' ? 2000 : type === 'rain' ? 1500 : 2500;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: type === 'rain' ? 2 + Math.random() * 2 : type === 'drip' ? 3 : type === 'sparkle' ? 2 + Math.random() * 3 : 4 + Math.random() * 6,
        opacity: 0,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.05,
        color,
        life: maxLife,
        maxLife,
        type,
      });
    }
  }

  emitPetals(x: number, y: number, count: number) {
    this.emit(x, y, count, 'petal', '#f8bbd0', 1.5);
  }

  emitBurst(x: number, y: number, count: number) {
    this.emit(x, y, count, 'burst', '#a5d6a7', 3);
  }

  emitDrip(x: number, y: number) {
    for (let i = 0; i < 5; i++) {
      setTimeout(() => {
        this.emit(x + (Math.random() - 0.5) * 30, y, 1, 'drip', '#64b5f6', 0.5);
      }, i * 100);
    }
  }

  emitSparkle(x: number, y: number, count: number) {
    this.emit(x, y, count, 'sparkle', '#e3f2fd', 2);
  }

  emitSoundParticles(type: SoundType, canvasWidth: number, canvasHeight: number) {
    if (type === 'none') return;
    const colors: Record<string, string> = {
      rain: '#90caf9',
      stream: '#66bb6a',
      wind: '#ffd54f',
    };
    const color = colors[type] || '#ffffff';
    const count = type === 'rain' ? 8 : type === 'stream' ? 5 : 4;
    for (let i = 0; i < count; i++) {
      const x = Math.random() * canvasWidth;
      const y = type === 'rain' ? -10 : Math.random() * canvasHeight;
      this.emit(x, y, 1, type, color, type === 'stream' ? 1 : type === 'wind' ? 2 : 0.3);
    }
  }

  update(dt: number) {
    for (const p of this.particles) {
      p.life -= dt;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;

      if (p.type === 'petal') {
        p.vy += 0.01;
        p.vx += (Math.random() - 0.5) * 0.02;
      } else if (p.type === 'rain') {
        p.vy = 3 + Math.random();
        p.vx = -0.5;
      } else if (p.type === 'stream') {
        p.vx += 0.02;
        p.vy += Math.sin(p.x * 0.01) * 0.01;
      } else if (p.type === 'wind') {
        p.vx = 1 + Math.random() * 2;
        p.vy += (Math.random() - 0.5) * 0.05;
      } else if (p.type === 'drip') {
        p.vy += 0.08;
      } else if (p.type === 'burst') {
        p.vx *= 0.98;
        p.vy *= 0.98;
      }

      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio > 0.9) {
        p.opacity = (1 - lifeRatio) / 0.1;
      } else if (lifeRatio < 0.2) {
        p.opacity = lifeRatio / 0.2;
      } else {
        p.opacity = 1;
      }

      if (p.type === 'sparkle') {
        p.opacity *= 0.5 + 0.5 * Math.sin(Date.now() * 0.01 + p.x);
      }
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  draw(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      ctx.save();
      ctx.globalAlpha = p.opacity * 0.8;
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation);

      if (p.type === 'petal') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'drip') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(0, 0, p.size, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'sparkle') {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        const s = p.size;
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.3, -s * 0.3);
        ctx.lineTo(s, 0);
        ctx.lineTo(s * 0.3, s * 0.3);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.3, s * 0.3);
        ctx.lineTo(-s, 0);
        ctx.lineTo(-s * 0.3, -s * 0.3);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }
}

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  gradient.addColorStop(0, '#c8e6c9');
  gradient.addColorStop(1, '#fff8e1');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

export function drawPlant(
  ctx: CanvasRenderingContext2D,
  state: PlantState,
  centerX: number,
  groundY: number,
  isMeditating: boolean,
  breathPhase: number
) {
  const { stage, stemHeight, leafCount, bloomProgress, saturation } = state;

  ctx.save();

  if (isMeditating) {
    ctx.shadowColor = '#ffffff';
    ctx.shadowBlur = 8;
    ctx.strokeStyle = '#ffffff';
    ctx.fillStyle = 'rgba(255,255,255,0.1)';
  }

  const sat = saturation;

  if (stage === 'seed') {
    const seedColor = isMeditating ? '#ffffff' : `hsl(30, ${sat * 40}%, 45%)`;
    ctx.fillStyle = seedColor;
    ctx.beginPath();
    ctx.ellipse(centerX, groundY - 6, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    if (!isMeditating) {
      ctx.fillStyle = `hsl(30, ${sat * 30}%, 35%)`;
      ctx.beginPath();
      ctx.ellipse(centerX, groundY - 6, 5, 3, 0.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  if (stage === 'sprout' || stage === 'stem' || stage === 'bud' || stage === 'bloom') {
    const stemColor = isMeditating ? '#ffffff' : `hsl(120, ${sat * 60}%, 35%)`;
    ctx.strokeStyle = stemColor;
    ctx.lineWidth = stage === 'sprout' ? 2 : 3;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(centerX, groundY);
    const sway = Math.sin(Date.now() * 0.001) * 3;
    ctx.quadraticCurveTo(
      centerX + sway * 0.5,
      groundY - stemHeight * 0.5,
      centerX + sway,
      groundY - stemHeight
    );
    ctx.stroke();

    const topX = centerX + sway;
    const topY = groundY - stemHeight;

    if (leafCount >= 1) {
      drawLeaf(ctx, centerX + sway * 0.3, groundY - stemHeight * 0.4, -1, sat, isMeditating, stemHeight);
    }
    if (leafCount >= 2) {
      drawLeaf(ctx, centerX + sway * 0.6, groundY - stemHeight * 0.6, 1, sat, isMeditating, stemHeight);
    }
    if (leafCount >= 3) {
      drawLeaf(ctx, centerX + sway * 0.2, groundY - stemHeight * 0.75, -1, sat, isMeditating, stemHeight);
    }
    if (leafCount >= 4) {
      drawLeaf(ctx, centerX + sway * 0.7, groundY - stemHeight * 0.85, 1, sat, isMeditating, stemHeight);
    }

    if (stage === 'bud') {
      const budColor = isMeditating ? '#ffffff' : `hsl(340, ${sat * 70}%, 65%)`;
      ctx.fillStyle = budColor;
      ctx.beginPath();
      ctx.ellipse(topX, topY - 8, 6, 10, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (stage === 'bloom') {
      drawFlower(ctx, topX, topY - 10, bloomProgress, sat, isMeditating);
    }
  }

  ctx.restore();

  if (isMeditating) {
    drawBreathCircle(ctx, ctx.canvas.width / 2, ctx.canvas.height / 2, breathPhase);
  }
}

function drawLeaf(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  dir: number,
  sat: number,
  isMeditating: boolean,
  stemH: number
) {
  const leafColor = isMeditating ? 'rgba(255,255,255,0.3)' : `hsl(120, ${sat * 60}%, 45%)`;
  const size = Math.min(stemH * 0.15, 20);
  ctx.fillStyle = leafColor;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(dir, 1);
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.quadraticCurveTo(size * 0.8, -size * 0.4, size, 0);
  ctx.quadraticCurveTo(size * 0.8, size * 0.4, 0, 0);
  ctx.fill();
  ctx.restore();
}

function drawFlower(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  progress: number,
  sat: number,
  isMeditating: boolean
) {
  const petalCount = 6;
  const petalSize = 12 * progress;
  const petalColor = isMeditating ? 'rgba(255,255,255,0.5)' : `hsl(340, ${sat * 70}%, 75%)`;
  ctx.fillStyle = petalColor;

  for (let i = 0; i < petalCount; i++) {
    const angle = (Math.PI * 2 / petalCount) * i + Math.sin(Date.now() * 0.001) * 0.1;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.ellipse(petalSize * 0.6, 0, petalSize, petalSize * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  const centerColor = isMeditating ? '#ffffff' : `hsl(45, ${sat * 90}%, 65%)`;
  ctx.fillStyle = centerColor;
  ctx.beginPath();
  ctx.arc(x, y, 5 * progress, 0, Math.PI * 2);
  ctx.fill();
}

function drawBreathCircle(
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
  gradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
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

export function drawWaterSparkle(ctx: CanvasRenderingContext2D, state: PlantState, centerX: number, groundY: number) {
  if (!state.isWatering || state.waterTimer <= 0) return;
  const progress = state.waterTimer / 2000;
  ctx.save();
  ctx.globalAlpha = progress * 0.6;
  const sparkleCount = 6;
  const stemTop = groundY - state.stemHeight;
  for (let i = 0; i < sparkleCount; i++) {
    const angle = (Math.PI * 2 / sparkleCount) * i + Date.now() * 0.003;
    const dist = 15 + Math.sin(Date.now() * 0.005 + i) * 8;
    const sx = centerX + Math.cos(angle) * dist;
    const sy = stemTop + state.stemHeight * 0.3 + Math.sin(angle) * dist * 0.5;
    ctx.fillStyle = '#e3f2fd';
    ctx.beginPath();
    const s = 3;
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
