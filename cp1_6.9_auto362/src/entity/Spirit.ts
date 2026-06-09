export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseAngle: number;
  baseRadius: number;
  size: number;
  colorOffset: number;
  phase: number;
}

export interface IncomingParticle {
  x: number;
  y: number;
  startX: number;
  startY: number;
  targetX: number;
  targetY: number;
  progress: number;
  duration: number;
  arcHeight: number;
  size: number;
  color: string;
}

export interface ExplosionParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface TrailFrame {
  x: number;
  y: number;
  particles: Array<{ x: number; y: number; size: number; color: string; alpha: number }>;
}

export interface Form {
  name: string;
  colorStart: [number, number, number];
  colorEnd: [number, number, number];
  threshold: number;
}

export const FORMS: Form[] = [
  { name: '星灵·初始', colorStart: [74, 0, 224], colorEnd: [255, 77, 77], threshold: 0 },
  { name: '星灵·碧海', colorStart: [0, 191, 255], colorEnd: [50, 205, 50], threshold: 10 },
  { name: '星灵·绯霞', colorStart: [255, 20, 147], colorEnd: [255, 105, 180], threshold: 20 },
];

export class Spirit {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  vx: number;
  vy: number;
  speed: number;
  maxSpeed: number;
  particles: Particle[];
  particleCount: number;
  maxParticles: number;
  minParticleDistance: number;
  alpha: number;
  stretchFactor: number;
  angle: number;
  followFactor: number;
  boosting: boolean;
  boostTime: number;
  boostDuration: number;
  boostMultiplier: number;
  trails: TrailFrame[];
  maxTrails: number;
  incomingParticles: IncomingParticle[];
  explosionParticles: ExplosionParticle[];
  currentForm: number;
  targetForm: number;
  formTransitionProgress: number;
  formTransitionDuration: number;
  formTransitioning: boolean;
  currentColorStart: [number, number, number];
  currentColorEnd: [number, number, number];
  tempColorStart: [number, number, number];
  tempColorEnd: [number, number, number];

  constructor(canvasWidth: number, canvasHeight: number) {
    this.x = canvasWidth / 2;
    this.y = canvasHeight / 2;
    this.targetX = this.x;
    this.targetY = this.y;
    this.vx = 0;
    this.vy = 0;
    this.speed = 0;
    this.maxSpeed = 8;
    this.particleCount = 128;
    this.maxParticles = 512;
    this.minParticleDistance = 1.5;
    this.alpha = 0.4;
    this.stretchFactor = 1;
    this.angle = 0;
    this.followFactor = 0.05;
    this.boosting = false;
    this.boostTime = 0;
    this.boostDuration = 0.3 * 60;
    this.boostMultiplier = 2;
    this.trails = [];
    this.maxTrails = 3;
    this.incomingParticles = [];
    this.explosionParticles = [];
    this.currentForm = 0;
    this.targetForm = 0;
    this.formTransitionProgress = 0;
    this.formTransitionDuration = 3 * 60;
    this.formTransitioning = false;
    this.currentColorStart = [...FORMS[0].colorStart] as [number, number, number];
    this.currentColorEnd = [...FORMS[0].colorEnd] as [number, number, number];
    this.tempColorStart = [...FORMS[0].colorStart] as [number, number, number];
    this.tempColorEnd = [...FORMS[0].colorEnd] as [number, number, number];
    this.particles = [];
    this.initParticles();
  }

  private initParticles(): void {
    this.particles = [];
    for (let i = 0; i < this.particleCount; i++) {
      this.particles.push(this.createParticle());
    }
  }

  private createParticle(): Particle {
    const angle = Math.random() * Math.PI * 2;
    const radius = 20 + Math.random() * 40;
    return {
      x: 0,
      y: 0,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      baseAngle: angle,
      baseRadius: radius,
      size: 1.5 + Math.random() * 2,
      colorOffset: Math.random(),
      phase: Math.random() * Math.PI * 2,
    };
  }

  setTarget(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  boost(): void {
    this.boosting = true;
    this.boostTime = this.boostDuration;
  }

  addParticles(count: number, fromX: number, fromY: number): void {
    const actualCount = Math.min(count, this.maxParticles - this.particleCount);
    if (actualCount <= 0) return;
    this.particleCount += actualCount;

    for (let i = 0; i < actualCount; i++) {
      this.incomingParticles.push({
        x: fromX,
        y: fromY,
        startX: fromX,
        startY: fromY,
        targetX: this.x,
        targetY: this.y,
        progress: 0,
        duration: 0.4 * 60,
        arcHeight: 50 + Math.random() * 80,
        size: 1.5 + Math.random() * 2,
        color: this.interpolateColor(
          this.currentColorStart,
          this.currentColorEnd,
          Math.random()
        ),
      });
    }
  }

  checkFormTransition(fragmentCount: number): void {
    let newTargetForm = 0;
    for (let i = FORMS.length - 1; i >= 0; i--) {
      if (fragmentCount >= FORMS[i].threshold) {
        newTargetForm = i;
        break;
      }
    }
    if (newTargetForm !== this.currentForm && !this.formTransitioning) {
      this.targetForm = newTargetForm;
      this.formTransitioning = true;
      this.formTransitionProgress = 0;
      this.tempColorStart = [...this.currentColorStart] as [number, number, number];
      this.tempColorEnd = [...this.currentColorEnd] as [number, number, number];
      this.triggerExplosion();
    }
  }

  private triggerExplosion(): void {
    const color = this.interpolateColor(
      FORMS[this.targetForm].colorStart,
      FORMS[this.targetForm].colorEnd,
      0.5
    );
    for (let i = 0; i < 300; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      this.explosionParticles.push({
        x: this.x,
        y: this.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.8 * 60,
        maxLife: 0.8 * 60,
        size: 1 + Math.random() * 2,
        color: color,
      });
    }
  }

  getCurrentFormName(): string {
    return FORMS[this.currentForm].name;
  }

  getCurrentFormColor(): string {
    return this.interpolateColor(this.currentColorStart, this.currentColorEnd, 0.5);
  }

  private interpolateColor(
    start: [number, number, number],
    end: [number, number, number],
    t: number
  ): string {
    const r = Math.round(start[0] + (end[0] - start[0]) * t);
    const g = Math.round(start[1] + (end[1] - start[1]) * t);
    const b = Math.round(start[2] + (end[2] - start[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private interpolateColorRGB(
    start: [number, number, number],
    end: [number, number, number],
    t: number
  ): [number, number, number] {
    return [
      start[0] + (end[0] - start[0]) * t,
      start[1] + (end[1] - start[1]) * t,
      start[2] + (end[2] - start[2]) * t,
    ];
  }

  update(canvasWidth: number, canvasHeight: number): void {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    let speedMult = 1;
    if (this.boosting) {
      speedMult = this.boostMultiplier;
      this.boostTime--;
      if (this.boostTime <= 0) {
        this.boosting = false;
      }
    }
    this.vx = dx * this.followFactor * speedMult;
    this.vy = dy * this.followFactor * speedMult;
    this.x += this.vx;
    this.y += this.vy;
    this.speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const speedRatio = Math.min(this.speed / this.maxSpeed, 1);
    this.alpha = 0.4 + speedRatio * 0.5;
    this.stretchFactor = 1 + speedRatio * 0.3;
    if (this.speed > 0.01) {
      this.angle = Math.atan2(this.vy, this.vx);
    }
    this.x = Math.max(40, Math.min(canvasWidth - 40, this.x));
    this.y = Math.max(40, Math.min(canvasHeight - 40, this.y));

    if (this.formTransitioning) {
      this.formTransitionProgress++;
      const t = this.formTransitionProgress / this.formTransitionDuration;
      this.currentColorStart = this.interpolateColorRGB(
        this.tempColorStart,
        FORMS[this.targetForm].colorStart,
        t
      );
      this.currentColorEnd = this.interpolateColorRGB(
        this.tempColorEnd,
        FORMS[this.targetForm].colorEnd,
        t
      );
      if (this.formTransitionProgress >= this.formTransitionDuration) {
        this.formTransitioning = false;
        this.currentForm = this.targetForm;
      }
    }

    this.updateParticles();

    if (this.boosting || speedRatio > 0.5) {
      const trailParticles: TrailFrame['particles'] = [];
      for (let i = 0; i < Math.min(30, this.particles.length); i += 4) {
        const p = this.particles[i];
        trailParticles.push({
          x: p.x,
          y: p.y,
          size: p.size * 0.8,
          color: this.interpolateColor(
            this.currentColorStart,
            this.currentColorEnd,
            p.colorOffset
          ),
          alpha: 0.2,
        });
      }
      this.trails.push({ x: this.x, y: this.y, particles: trailParticles });
      if (this.trails.length > this.maxTrails) {
        this.trails.shift();
      }
    } else if (this.trails.length > 0) {
      this.trails.shift();
    }

    this.updateIncomingParticles();
    this.updateExplosionParticles();
  }

  private updateParticles(): void {
    const time = Date.now() * 0.001;
    while (this.particles.length < this.particleCount) {
      this.particles.push(this.createParticle());
    }

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const speedRatio = Math.min(this.speed / this.maxSpeed, 1);
      const wobbleAmount = 0.5 + speedRatio * 1.5;
      p.baseAngle += (p.vx + p.vy) * 0.02;
      const radiusVariation = Math.sin(time * 2 + p.phase) * 5;
      const currentRadius = p.baseRadius + radiusVariation;
      const angleOffset = Math.sin(time * 1.5 + p.phase * 2) * 0.2;
      let px = Math.cos(p.baseAngle + angleOffset) * currentRadius;
      let py = Math.sin(p.baseAngle + angleOffset) * currentRadius;
      const stretchX = this.stretchFactor;
      const stretchY = 2 - this.stretchFactor;
      const cos = Math.cos(this.angle);
      const sin = Math.sin(this.angle);
      px = px * stretchX;
      py = py * stretchY;
      const rotatedX = px * cos - py * sin;
      const rotatedY = px * sin + py * cos;
      p.x = this.x + rotatedX + (Math.random() - 0.5) * wobbleAmount;
      p.y = this.y + rotatedY + (Math.random() - 0.5) * wobbleAmount;
    }

    this.resolveParticleOverlaps();
  }

  private resolveParticleOverlaps(): void {
    const minDist = this.minParticleDistance;
    const minDistSq = minDist * minDist;
    for (let i = 0; i < this.particles.length; i++) {
      for (let j = i + 1; j < this.particles.length; j++) {
        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const distSq = dx * dx + dy * dy;
        if (distSq < minDistSq && distSq > 0.0001) {
          const dist = Math.sqrt(distSq);
          const overlap = (minDist - dist) / 2;
          const nx = dx / dist;
          const ny = dy / dist;
          p1.x -= nx * overlap;
          p1.y -= ny * overlap;
          p2.x += nx * overlap;
          p2.y += ny * overlap;
        }
      }
    }
  }

  private updateIncomingParticles(): void {
    for (let i = this.incomingParticles.length - 1; i >= 0; i--) {
      const ip = this.incomingParticles[i];
      ip.progress++;
      const t = ip.progress / ip.duration;
      if (t >= 1) {
        this.incomingParticles.splice(i, 1);
        continue;
      }
      ip.targetX = this.x;
      ip.targetY = this.y;
      const straightX = ip.startX + (ip.targetX - ip.startX) * t;
      const straightY = ip.startY + (ip.targetY - ip.startY) * t;
      const midX = (ip.startX + ip.targetX) / 2;
      const midY = (ip.startY + ip.targetY) / 2 - ip.arcHeight;
      const bx = (1 - t) * (1 - t) * ip.startX + 2 * (1 - t) * t * midX + t * t * ip.targetX;
      const by = (1 - t) * (1 - t) * ip.startY + 2 * (1 - t) * t * midY + t * t * ip.targetY;
      ip.x = bx;
      ip.y = by;
    }
  }

  private updateExplosionParticles(): void {
    for (let i = this.explosionParticles.length - 1; i >= 0; i--) {
      const ep = this.explosionParticles[i];
      ep.x += ep.vx;
      ep.y += ep.vy;
      ep.vx *= 0.98;
      ep.vy *= 0.98;
      ep.life--;
      if (ep.life <= 0) {
        this.explosionParticles.splice(i, 1);
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.trails.length; i++) {
      const trail = this.trails[i];
      const alpha = (0.2 * (i + 1)) / this.trails.length;
      for (const tp of trail.particles) {
        ctx.beginPath();
        ctx.fillStyle = tp.color;
        ctx.globalAlpha = alpha * 0.5;
        ctx.arc(tp.x, tp.y, tp.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const p of this.particles) {
      const color = this.interpolateColor(
        this.currentColorStart,
        this.currentColorEnd,
        p.colorOffset
      );
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, 'transparent');
      ctx.beginPath();
      ctx.fillStyle = gradient;
      ctx.globalAlpha = this.alpha;
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = color;
      ctx.globalAlpha = this.alpha;
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const ip of this.incomingParticles) {
      const t = ip.progress / ip.duration;
      const size = ip.size * (1 - t * 0.5);
      ctx.beginPath();
      ctx.fillStyle = ip.color;
      ctx.globalAlpha = 1 - t * 0.3;
      ctx.arc(ip.x, ip.y, size * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.globalAlpha = (1 - t) * 0.8;
      ctx.arc(ip.x, ip.y, size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const ep of this.explosionParticles) {
      const t = ep.life / ep.maxLife;
      ctx.beginPath();
      ctx.fillStyle = ep.color;
      ctx.globalAlpha = t * 0.9;
      ctx.arc(ep.x, ep.y, ep.size * t, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
