import {
  Vec2,
  randomRange,
  randomHSL,
  hslComponents,
  componentsToHSL,
  vecAdd,
  vecSub,
  vecScale,
  vecDistance,
  vecNormalize,
  fbmNoise,
  easeOut,
} from './utils';

export interface Particle {
  pos: Vec2;
  vel: Vec2;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
  expanding: boolean;
}

export interface GlowEffect {
  pos: Vec2;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface GalaxyConfig {
  particleCount: number;
  armCount: number;
  centerX: number;
  centerY: number;
}

type StatsCallback = (particleCount: number, fps: number) => void;

export class GalaxyEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private glowEffects: GlowEffect[] = [];
  private rotationAngle: number = 0;
  private center: Vec2 = { x: 0, y: 0 };

  private scale: number = 1;
  private targetScale: number = 1;
  private scaleAnimStart: number = 1;
  private scaleAnimTarget: number = 1;
  private scaleAnimTime: number = 0;
  private readonly SCALE_ANIM_DURATION = 500;

  private offset: Vec2 = { x: 0, y: 0 };
  private isDragging: boolean = false;
  private isPanning: boolean = false;
  private lastMousePos: Vec2 = { x: 0, y: 0 };
  private dragTimer: number = 0;

  private animationId: number = 0;
  private lastFrameTime: number = 0;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;

  private statsCallback?: StatsCallback;
  private running: boolean = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.resize();
    this.center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
  }

  setStatsCallback(callback: StatsCallback): void {
    this.statsCallback = callback;
  }

  resize(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    this.center = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    const now = performance.now();
    this.lastFrameTime = now;
    this.fpsUpdateTime = now;
    this.loop();
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.animationId);
  }

  generateGalaxy(config?: Partial<GalaxyConfig>): void {
    const particleCount = config?.particleCount ?? 800;
    const armCount = config?.armCount ?? 4;

    this.particles = [];
    this.glowEffects = [];

    for (let i = 0; i < particleCount; i++) {
      const armIndex = i % armCount;
      const armAngle = (armIndex / armCount) * Math.PI * 2;
      const t = i / particleCount;
      const logSpiralT = Math.pow(t, 0.5) * 350;
      const angle = armAngle + logSpiralT * 0.018 + randomRange(-0.15, 0.15);
      const radius = logSpiralT + randomRange(-25, 25);

      const pos: Vec2 = {
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      };

      const radiusFromCenter = Math.sqrt(pos.x * pos.x + pos.y * pos.y);
      const orbitalAngle = Math.atan2(pos.y, pos.x);
      const orbitalSpeed = 0.003 * (1 / (radiusFromCenter / 200 + 0.5));

      this.particles.push({
        pos,
        vel: {
          x: -Math.sin(orbitalAngle) * orbitalSpeed * 10,
          y: Math.cos(orbitalAngle) * orbitalSpeed * 10,
        },
        radius: randomRange(2, 5),
        color: randomHSL(240, 320, 80, 60),
        life: 0,
        maxLife: 0,
        expanding: false,
      });
    }
  }

  randomizeGalaxy(): void {
    const particleCount = Math.floor(randomRange(500, 1200));
    const armCount = Math.floor(randomRange(2, 6));
    this.generateGalaxy({ particleCount, armCount });
  }

  resetView(): void {
    this.animateScale(1);
    this.offset = { x: 0, y: 0 };
  }

  private animateScale(target: number): void {
    this.scaleAnimStart = this.scale;
    this.scaleAnimTarget = target;
    this.scaleAnimTime = 0;
  }

  handleMouseDown(e: MouseEvent): void {
    if (e.button === 0) {
      this.isDragging = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
      this.dragTimer = 0;
    } else if (e.button === 1 || e.button === 2) {
      this.isPanning = true;
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    }
  }

  handleMouseMove(e: MouseEvent): void {
    if (this.isPanning) {
      const dx = e.clientX - this.lastMousePos.x;
      const dy = e.clientY - this.lastMousePos.y;
      this.offset = vecAdd(this.offset, { x: dx, y: dy });
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    } else if (this.isDragging) {
      this.dragTimer++;
      if (this.dragTimer % 3 === 0) {
        this.spawnParticleCluster({ x: e.clientX, y: e.clientY });
      }
      this.lastMousePos = { x: e.clientX, y: e.clientY };
    }
  }

  handleMouseUp(e: MouseEvent): void {
    if (this.isDragging && this.dragTimer < 5) {
      this.spawnParticleCluster({ x: e.clientX, y: e.clientY });
    }
    this.isDragging = false;
    this.isPanning = false;
    this.dragTimer = 0;
  }

  handleWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.max(0.1, Math.min(5, this.targetScale * delta));
    this.targetScale = newScale;
    this.animateScale(newScale);
  }

  private screenToWorld(screenPos: Vec2): Vec2 {
    return {
      x: (screenPos.x - this.center.x - this.offset.x) / this.scale,
      y: (screenPos.y - this.center.y - this.offset.y) / this.scale,
    };
  }

  private spawnParticleCluster(worldPosInput: Vec2): void {
    const worldPos = this.screenToWorld(worldPosInput);
    const particleCount = 50;

    for (let i = 0; i < particleCount; i++) {
      const angle = randomRange(0, Math.PI * 2);
      const noiseVal = fbmNoise(
        worldPos.x * 0.01 + i * 0.1,
        worldPos.y * 0.01 + i * 0.1,
        3
      );
      const distance = (noiseVal + 1) * 40 + randomRange(10, 30);

      const colorT = i / particleCount;
      const hue = colorT < 0.5
        ? randomRange(0, 30)
        : randomRange(200, 260);

      const pos: Vec2 = {
        x: worldPos.x + Math.cos(angle) * distance,
        y: worldPos.y + Math.sin(angle) * distance,
      };

      const dir = vecNormalize(vecSub(pos, worldPos));
      const speed = randomRange(1.5, 2.5);

      this.particles.push({
        pos,
        vel: vecScale(dir, speed),
        radius: randomRange(2, 4),
        color: componentsToHSL(hue, 80, 60),
        life: 0,
        maxLife: 2000,
        expanding: true,
      });
    }
  }

  private updateParticles(dt: number): void {
    for (const p of this.particles) {
      if (p.expanding) {
        p.life += dt;
        p.vel = vecScale(p.vel, 0.98);
        if (p.life >= p.maxLife) {
          p.expanding = false;
          p.vel = { x: 0, y: 0 };
        }
      }
      p.pos = vecAdd(p.pos, vecScale(p.vel, dt / 16.67));
    }

    if (this.particles.length > 2000) {
      this.particles = this.particles.slice(-2000);
    }
  }

  private handleCollisions(): void {
    const toRemove = new Set<number>();
    const newParticles: Particle[] = [];

    for (let i = 0; i < this.particles.length; i++) {
      if (toRemove.has(i)) continue;
      for (let j = i + 1; j < this.particles.length; j++) {
        if (toRemove.has(j)) continue;

        const p1 = this.particles[i];
        const p2 = this.particles[j];
        const dist = vecDistance(p1.pos, p2.pos);

        if (dist < 8) {
          const c1 = hslComponents(p1.color);
          const c2 = hslComponents(p2.color);
          const newHue = (c1.h + c2.h) / 2;
          const newColor = componentsToHSL(newHue, 80, 60);
          const newRadius = Math.min(12, p1.radius + p2.radius);

          toRemove.add(i);
          toRemove.add(j);

          const merged: Particle = {
            pos: {
              x: (p1.pos.x + p2.pos.x) / 2,
              y: (p1.pos.y + p2.pos.y) / 2,
            },
            vel: {
              x: (p1.vel.x + p2.vel.x) / 2,
              y: (p1.vel.y + p2.vel.y) / 2,
            },
            radius: newRadius,
            color: newColor,
            life: 0,
            maxLife: 0,
            expanding: false,
          };

          newParticles.push(merged);
          this.glowEffects.push({
            pos: { ...merged.pos },
            radius: 10,
            maxRadius: 30,
            alpha: 0.8,
            color: newColor,
            life: 0,
            maxLife: 200,
          });

          break;
        }
      }
    }

    this.particles = this.particles.filter((_, idx) => !toRemove.has(idx));
    this.particles.push(...newParticles);
  }

  private updateGlowEffects(dt: number): void {
    for (const g of this.glowEffects) {
      g.life += dt;
      const t = g.life / g.maxLife;
      g.radius = 10 + (30 - 10) * t;
      g.alpha = 0.8 * (1 - t);
    }
    this.glowEffects = this.glowEffects.filter((g) => g.life < g.maxLife);
  }

  private updateScaleAnimation(dt: number): void {
    if (this.scaleAnimTime < this.SCALE_ANIM_DURATION) {
      this.scaleAnimTime += dt;
      const t = Math.min(1, this.scaleAnimTime / this.SCALE_ANIM_DURATION);
      const easedT = easeOut(t);
      this.scale =
        this.scaleAnimStart + (this.scaleAnimTarget - this.scaleAnimStart) * easedT;
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      0,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height)
    );
    gradient.addColorStop(0, '#0a0a1a');
    gradient.addColorStop(1, '#000005');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(
      this.center.x + this.offset.x,
      this.center.y + this.offset.y
    );
    ctx.scale(this.scale, this.scale);

    ctx.shadowBlur = 4;

    for (const p of this.particles) {
      ctx.shadowColor = p.color;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  private drawGlowEffects(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(
      this.center.x + this.offset.x,
      this.center.y + this.offset.y
    );
    ctx.scale(this.scale, this.scale);

    for (const g of this.glowEffects) {
      ctx.globalAlpha = g.alpha;
      const gradient = ctx.createRadialGradient(
        g.pos.x, g.pos.y, 0,
        g.pos.x, g.pos.y, g.radius
      );
      gradient.addColorStop(0, g.color);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(g.pos.x, g.pos.y, g.radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private updateFPS(dt: number, now: number): void {
    this.frameCount++;
    if (now - this.fpsUpdateTime >= 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
      this.statsCallback?.(this.particles.length, this.fps);
    }
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min(32, now - this.lastFrameTime);
    this.lastFrameTime = now;

    this.updateFPS(dt, now);
    this.updateScaleAnimation(dt);
    this.updateParticles(dt);
    this.handleCollisions();
    this.updateGlowEffects(dt);

    this.drawBackground();
    this.drawGlowEffects();
    this.drawParticles();

    this.animationId = requestAnimationFrame(this.loop);
  };

  getParticleCount(): number {
    return this.particles.length;
  }

  getFPS(): number {
    return this.fps;
  }
}
