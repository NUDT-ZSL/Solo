export interface FlowerVariety {
  index: number;
  name: string;
  description: string;
  color1: string;
  color2: string;
  glowColor: string;
  unlocked: boolean;
  x: number;
  y: number;
  particles: FlowerParticle[];
  appearTimer: number;
  pulsePhase: number;
}

interface FlowerParticle {
  angle: number;
  distance: number;
  size: number;
  phase: number;
  orbitSpeed: number;
}

export interface ButterflyState {
  x: number;
  y: number;
  time: number;
  wingPhase: number;
  trail: { x: number; y: number; alpha: number }[];
  active: boolean;
  fadeIn: number;
}

const VARIETY_DATA: {
  name: string;
  description: string;
  color1: string;
  color2: string;
  glowColor: string;
}[] = [
  {
    name: '月白',
    description: '如月华倾泻的清冷光辉，带着夜露的静谧与温柔',
    color1: '#e8e8ff',
    color2: '#b0b0ff',
    glowColor: 'rgba(200,200,255,0.4)',
  },
  {
    name: '星蓝',
    description: '宛如遥远星辰的蓝色光芒，深邃而宁静',
    color1: '#6090ff',
    color2: '#3060e0',
    glowColor: 'rgba(80,120,255,0.4)',
  },
  {
    name: '晨曦粉',
    description: '破晓时分天际的温柔粉色，充满希望与新生',
    color1: '#ff90b0',
    color2: '#ff6090',
    glowColor: 'rgba(255,120,160,0.4)',
  },
  {
    name: '暮光紫',
    description: '黄昏与黑夜交界的神秘紫光，朦胧迷离',
    color1: '#b060ff',
    color2: '#8030d0',
    glowColor: 'rgba(160,80,255,0.4)',
  },
  {
    name: '琥珀金',
    description: '凝固时光般的温暖金光，沉稳而珍贵',
    color1: '#ffcc40',
    color2: '#e09010',
    glowColor: 'rgba(255,180,40,0.4)',
  },
  {
    name: '翡翠绿',
    description: '森林深处精灵的绿色光芒，生机盎然',
    color1: '#40e080',
    color2: '#10b060',
    glowColor: 'rgba(40,220,100,0.4)',
  },
];

export class BloomCollector {
  private flowers: FlowerVariety[] = [];
  private width: number;
  private height: number;
  private time = 0;
  butterfly: ButterflyState | null = null;
  private unlockRing: { x: number; y: number; radius: number; alpha: number; color: string } | null = null;
  onUnlockRing: ((ring: { x: number; y: number; radius: number; alpha: number; color: string }) => void) | null = null;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initFlowers();
  }

  private initFlowers(): void {
    this.flowers = VARIETY_DATA.map((data, i) => {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
      const rx = this.width * 0.28;
      const ry = this.height * 0.18;
      const cx = this.width * 0.5;
      const cy = this.height * 0.55;

      const particles: FlowerParticle[] = [];
      for (let p = 0; p < 7; p++) {
        particles.push({
          angle: (p / 7) * Math.PI * 2,
          distance: 18 + Math.random() * 8,
          size: 2 + Math.random() * 2,
          phase: Math.random() * Math.PI * 2,
          orbitSpeed: 0.3 + Math.random() * 0.4,
        });
      }

      return {
        index: i,
        name: data.name,
        description: data.description,
        color1: data.color1,
        color2: data.color2,
        glowColor: data.glowColor,
        unlocked: false,
        x: cx + Math.cos(angle) * rx,
        y: cy + Math.sin(angle) * ry,
        particles,
        appearTimer: 0,
        pulsePhase: Math.random() * Math.PI * 2,
      };
    });
  }

  update(dt: number): void {
    this.time += dt;

    for (const f of this.flowers) {
      if (f.unlocked && f.appearTimer < 1) {
        f.appearTimer = Math.min(1, f.appearTimer + dt * 1.5);
      }
    }

    if (this.unlockRing) {
      this.unlockRing.radius += 180 * dt;
      this.unlockRing.alpha -= 1.2 * dt;
      if (this.unlockRing.alpha <= 0) {
        this.unlockRing = null;
      }
    }

    if (this.butterfly && this.butterfly.active) {
      this.butterfly.time += dt;
      this.butterfly.wingPhase += dt * 6;
      this.butterfly.fadeIn = Math.min(1, this.butterfly.fadeIn + dt * 0.8);

      this.butterfly.x = this.width / 2 + Math.sin(this.butterfly.time * 0.6) * this.width * 0.2;
      this.butterfly.y = this.height / 2 + Math.sin(this.butterfly.time * 1.2) * this.height * 0.1;

      this.butterfly.trail.unshift({
        x: this.butterfly.x,
        y: this.butterfly.y,
        alpha: 1,
      });
      for (const t of this.butterfly.trail) {
        t.alpha -= dt * 2;
      }
      this.butterfly.trail = this.butterfly.trail.filter(t => t.alpha > 0);
      if (this.butterfly.trail.length > 30) {
        this.butterfly.trail.length = 30;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const f of this.flowers) {
      if (!f.unlocked) continue;
      this.renderFlower(ctx, f);
    }

    if (this.unlockRing) {
      this.renderUnlockRing(ctx);
    }

    if (this.butterfly && this.butterfly.active) {
      this.renderButterfly(ctx);
    }
  }

  private renderFlower(ctx: CanvasRenderingContext2D, f: FlowerVariety): void {
    const appear = f.appearTimer;
    const pulse = 0.85 + 0.15 * Math.sin(f.pulsePhase + this.time * 2);
    const scale = appear * pulse;

    ctx.save();
    ctx.globalAlpha = appear;
    ctx.translate(f.x, f.y);

    const outerGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 35 * scale);
    outerGlow.addColorStop(0, f.glowColor);
    outerGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(0, 0, 35 * scale, 0, Math.PI * 2);
    ctx.fill();

    for (const p of f.particles) {
      const a = p.angle + this.time * p.orbitSpeed;
      const d = p.distance * scale + Math.sin(p.phase + this.time * 2) * 3;
      const px = Math.cos(a) * d;
      const py = Math.sin(a) * d;
      const pSize = p.size * scale;

      const pg = ctx.createRadialGradient(px, py, 0, px, py, pSize * 2);
      pg.addColorStop(0, f.color1);
      pg.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(px, py, pSize * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    const coreR = 8 * scale;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreR);
    coreGrad.addColorStop(0, f.color1);
    coreGrad.addColorStop(0.7, f.color2);
    coreGrad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreR, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private renderUnlockRing(ctx: CanvasRenderingContext2D): void {
    if (!this.unlockRing) return;
    const r = this.unlockRing;
    ctx.save();
    ctx.strokeStyle = r.color.replace(/[\d.]+\)$/, `${r.alpha * 0.6})`);
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.stroke();

    const grad = ctx.createRadialGradient(r.x, r.y, r.radius * 0.8, r.x, r.y, r.radius);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, r.color.replace(/[\d.]+\)$/, `${r.alpha * 0.15})`));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderButterfly(ctx: CanvasRenderingContext2D): void {
    if (!this.butterfly) return;
    const b = this.butterfly;
    const alpha = b.fadeIn;

    for (const t of b.trail) {
      ctx.save();
      ctx.globalAlpha = t.alpha * 0.3 * alpha;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(b.x, b.y);

    const wingFlap = Math.sin(b.wingPhase) * 0.4;

    const wingColors = [
      'rgba(200,200,255,0.6)',
      'rgba(255,180,220,0.5)',
      'rgba(180,120,255,0.5)',
      'rgba(100,220,180,0.4)',
    ];

    for (let side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.scale(side * (1 + wingFlap), 1);

      const wingGrad = ctx.createRadialGradient(0, -5, 0, 15, -10, 30);
      wingGrad.addColorStop(0, wingColors[0]);
      wingGrad.addColorStop(0.3, wingColors[1]);
      wingGrad.addColorStop(0.7, wingColors[2]);
      wingGrad.addColorStop(1, wingColors[3]);
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(15, -10, 25, 18, -0.3, 0, Math.PI * 2);
      ctx.fill();

      const wingGrad2 = ctx.createRadialGradient(0, 8, 0, 10, 10, 18);
      wingGrad2.addColorStop(0, wingColors[1]);
      wingGrad2.addColorStop(1, 'rgba(100,150,255,0.1)');
      ctx.fillStyle = wingGrad2;
      ctx.beginPath();
      ctx.ellipse(10, 10, 16, 12, 0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    ctx.fillStyle = `rgba(255,255,255,${0.8 * alpha})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, 3, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    const headGlow = ctx.createRadialGradient(0, -10, 0, 0, -10, 6);
    headGlow.addColorStop(0, `rgba(255,255,255,${0.9 * alpha})`);
    headGlow.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = headGlow;
    ctx.beginPath();
    ctx.arc(0, -10, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  unlockNext(): FlowerVariety | null {
    for (const f of this.flowers) {
      if (!f.unlocked) {
        f.unlocked = true;
        f.appearTimer = 0;

        this.unlockRing = {
          x: f.x,
          y: f.y,
          radius: 10,
          alpha: 1,
          color: f.glowColor,
        };

        return f;
      }
    }
    return null;
  }

  checkClick(x: number, y: number): FlowerVariety | null {
    for (const f of this.flowers) {
      if (!f.unlocked) continue;
      const dx = f.x - x;
      const dy = f.y - y;
      if (Math.sqrt(dx * dx + dy * dy) < 30) {
        return f;
      }
    }
    return null;
  }

  getFlowers(): FlowerVariety[] {
    return this.flowers;
  }

  getUnlockedCount(): number {
    return this.flowers.filter(f => f.unlocked).length;
  }

  isAllUnlocked(): boolean {
    return this.flowers.every(f => f.unlocked);
  }

  summonButterfly(): void {
    if (this.butterfly) return;
    this.butterfly = {
      x: this.width / 2,
      y: this.height / 2,
      time: 0,
      wingPhase: 0,
      trail: [],
      active: true,
      fadeIn: 0,
    };
  }

  reset(): void {
    this.initFlowers();
    this.time = 0;
    this.unlockRing = null;
    this.butterfly = null;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.initFlowers();
  }
}
