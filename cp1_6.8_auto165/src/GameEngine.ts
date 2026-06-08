import { ParticleSystem } from './ParticleSystem';
import { BlackHoleManager } from './BlackHoleManager';

export interface GameState {
  score: number;
  timeLeft: number;
  energyBalls: number;
  maxEnergyBalls: number;
  isGameOver: boolean;
  isStarted: boolean;
}

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private particleSystem: ParticleSystem;
  private blackHoleManager: BlackHoleManager;
  private animationFrameId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  private arenaCx: number = 0;
  private arenaCy: number = 0;
  private arenaRadius: number = 0;

  private energyBall = { x: 0, y: 0, radius: 18, pulsePhase: 0 };
  private isDragging: boolean = false;
  private dragStart: { x: number; y: number } | null = null;
  private dragCurrent: { x: number; y: number } | null = null;

  private score: number = 0;
  private timeLeft: number = 90;
  private maxTime: number = 90;
  private energyBalls: number = 15;
  private maxEnergyBalls: number = 15;
  private isGameOver: boolean = false;
  private isStarted: boolean = false;

  private stateCallback: ((state: GameState) => void) | null = null;
  private backgroundStars: Array<{ x: number; y: number; size: number; alpha: number; twinkleSpeed: number }> = [];

  constructor() {
    this.particleSystem = new ParticleSystem(0, 0, 0);
    this.blackHoleManager = new BlackHoleManager(0, 0, 0);
    this.blackHoleManager.onScore((count) => {
      this.score += count * 10;
      this.notifyState();
    });
  }

  onStateChange(cb: (state: GameState) => void) {
    this.stateCallback = cb;
  }

  private notifyState() {
    if (this.stateCallback) {
      this.stateCallback({
        score: this.score,
        timeLeft: this.timeLeft,
        energyBalls: this.energyBalls,
        maxEnergyBalls: this.maxEnergyBalls,
        isGameOver: this.isGameOver,
        isStarted: this.isStarted,
      });
    }
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.generateStars();
    this.setupInput();
  }

  private generateStars() {
    this.backgroundStars = [];
    for (let i = 0; i < 120; i++) {
      this.backgroundStars.push({
        x: Math.random() * (this.canvas?.width || 800),
        y: Math.random() * (this.canvas?.height || 600),
        size: 0.5 + Math.random() * 1.5,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
      });
    }
  }

  resize() {
    if (!this.canvas) return;
    const rect = this.canvas.parentElement!.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + 'px';
    this.canvas.style.height = rect.height + 'px';
    this.ctx!.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    this.arenaCx = w / 2;
    this.arenaCy = h / 2;
    this.arenaRadius = Math.min(w, h) * 0.42;

    this.energyBall.x = this.arenaCx;
    this.energyBall.y = this.arenaCy;

    this.particleSystem.resize(this.arenaCx, this.arenaCy, this.arenaRadius);
    this.blackHoleManager.resize(this.arenaCx, this.arenaCy, this.arenaRadius);
    this.generateStars();
  }

  private setupInput() {
    if (!this.canvas) return;
    const el = this.canvas;

    const getPos = (e: MouseEvent | Touch) => {
      const rect = el.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const onStart = (pos: { x: number; y: number }) => {
      if (this.isGameOver) return;
      if (!this.isStarted) {
        this.isStarted = true;
        this.notifyState();
      }
      if (this.energyBalls <= 0) return;

      const dx = pos.x - this.energyBall.x;
      const dy = pos.y - this.energyBall.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < this.energyBall.radius + 30) {
        this.isDragging = true;
        this.dragStart = { x: this.energyBall.x, y: this.energyBall.y };
        this.dragCurrent = pos;
      }
    };

    const onMove = (pos: { x: number; y: number }) => {
      if (this.isDragging) {
        this.dragCurrent = pos;
      }
    };

    const onEnd = () => {
      if (!this.isDragging || !this.dragStart || !this.dragCurrent) {
        this.isDragging = false;
        return;
      }

      const dx = this.dragStart.x - this.dragCurrent.x;
      const dy = this.dragStart.y - this.dragCurrent.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 15) {
        const speed = Math.min(dist * 3, 500);
        const nx = dx / dist;
        const ny = dy / dist;

        const spawnX = this.energyBall.x + nx * (this.energyBall.radius + 10);
        const spawnY = this.energyBall.y + ny * (this.energyBall.radius + 10);
        const spawnDist = Math.sqrt(
          (spawnX - this.arenaCx) ** 2 + (spawnY - this.arenaCy) ** 2
        );

        if (spawnDist < this.arenaRadius - 25) {
          this.blackHoleManager.createBlackHole(spawnX, spawnY, nx * speed, ny * speed);
          this.energyBalls--;
          this.notifyState();
        }
      }

      this.isDragging = false;
      this.dragStart = null;
      this.dragCurrent = null;
    };

    el.addEventListener('mousedown', (e) => onStart(getPos(e)));
    el.addEventListener('mousemove', (e) => onMove(getPos(e)));
    el.addEventListener('mouseup', () => onEnd());
    el.addEventListener('mouseleave', () => onEnd());

    el.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) onStart(getPos(e.touches[0]));
    }, { passive: false });
    el.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) onMove(getPos(e.touches[0]));
    }, { passive: false });
    el.addEventListener('touchend', (e) => {
      e.preventDefault();
      onEnd();
    }, { passive: false });
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  reset() {
    this.score = 0;
    this.timeLeft = this.maxTime;
    this.energyBalls = this.maxEnergyBalls;
    this.isGameOver = false;
    this.isStarted = false;
    this.isDragging = false;
    this.dragStart = null;
    this.dragCurrent = null;
    this.energyBall.x = this.arenaCx;
    this.energyBall.y = this.arenaCy;
    this.particleSystem.reset();
    this.blackHoleManager.reset();
    this.notifyState();
  }

  private loop = () => {
    if (!this.running) return;

    const now = performance.now();
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 1 / 30);
    this.lastTime = now;

    if (this.isStarted && !this.isGameOver) {
      this.timeLeft -= dt;
      if (this.timeLeft <= 0) {
        this.timeLeft = 0;
        this.isGameOver = true;
      }
      this.notifyState();
    }

    this.update(dt);
    this.render();

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.energyBall.pulsePhase += dt * 3;

    if (this.isStarted && !this.isGameOver) {
      const { attractors, shockwaves } = this.blackHoleManager.update(dt);

      this.particleSystem.update(dt, attractors);

      for (const sw of shockwaves) {
        this.particleSystem.applyShockwave(sw.x, sw.y, sw.radius, sw.force * dt);
      }

      for (const bh of this.blackHoleManager.getBlackHoles()) {
        if (bh.state === 'active' || bh.state === 'collapsing') {
          const collected = this.particleSystem.collectNear(bh.x, bh.y, bh.radius * 1.5);
          bh.collectedParticles += collected;
        }
      }

      for (const sw of this.blackHoleManager.getShockwaves()) {
        const dx = this.energyBall.x - sw.x;
        const dy = this.energyBall.y - sw.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (Math.abs(dist - sw.radius) < 40) {
          const strength = sw.force * sw.alpha * dt * 0.3;
          this.energyBall.x += (dx / dist) * strength;
          this.energyBall.y += (dy / dist) * strength;
        }
      }

      const dx = this.energyBall.x - this.arenaCx;
      const dy = this.energyBall.y - this.arenaCy;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      if (distFromCenter + this.energyBall.radius > this.arenaRadius - 5) {
        const nx = dx / distFromCenter;
        const ny = dy / distFromCenter;
        this.energyBall.x = this.arenaCx + nx * (this.arenaRadius - this.energyBall.radius - 5);
        this.energyBall.y = this.arenaCy + ny * (this.arenaRadius - this.energyBall.radius - 5);
      }
    }
  }

  private render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);

    this.renderStars(ctx);

    this.renderArena(ctx);

    this.particleSystem.render(ctx);
    this.blackHoleManager.render(ctx);

    this.renderEnergyBall(ctx);

    if (this.isDragging && this.dragStart && this.dragCurrent) {
      this.renderDragIndicator(ctx);
    }

    if (this.isGameOver) {
      this.renderGameOver(ctx, w, h);
    }
  }

  private renderStars(ctx: CanvasRenderingContext2D) {
    const time = performance.now() / 1000;
    for (const star of this.backgroundStars) {
      const alpha = star.alpha * (0.5 + 0.5 * Math.sin(time * star.twinkleSpeed));
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 200, 255, ${alpha})`;
      ctx.fill();
    }
  }

  private renderArena(ctx: CanvasRenderingContext2D) {
    const gradient = ctx.createRadialGradient(
      this.arenaCx, this.arenaCy, this.arenaRadius - 5,
      this.arenaCx, this.arenaCy, this.arenaRadius + 5
    );
    gradient.addColorStop(0, 'rgba(80, 50, 160, 0.3)');
    gradient.addColorStop(0.5, 'rgba(60, 30, 120, 0.6)');
    gradient.addColorStop(1, 'rgba(30, 10, 60, 0)');

    ctx.beginPath();
    ctx.arc(this.arenaCx, this.arenaCy, this.arenaRadius, 0, Math.PI * 2);
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 4;
    ctx.stroke();

    const arenaBg = ctx.createRadialGradient(
      this.arenaCx, this.arenaCy, 0,
      this.arenaCx, this.arenaCy, this.arenaRadius
    );
    arenaBg.addColorStop(0, 'rgba(10, 5, 30, 0.3)');
    arenaBg.addColorStop(1, 'rgba(5, 2, 15, 0.5)');
    ctx.beginPath();
    ctx.arc(this.arenaCx, this.arenaCy, this.arenaRadius, 0, Math.PI * 2);
    ctx.fillStyle = arenaBg;
    ctx.fill();
  }

  private renderEnergyBall(ctx: CanvasRenderingContext2D) {
    const { x, y, radius, pulsePhase } = this.energyBall;
    const pulse = 1 + Math.sin(pulsePhase) * 0.1;
    const r = radius * pulse;

    const outerGlow = ctx.createRadialGradient(x, y, r, x, y, r * 3);
    outerGlow.addColorStop(0, 'rgba(60, 100, 255, 0.4)');
    outerGlow.addColorStop(0.5, 'rgba(80, 60, 220, 0.15)');
    outerGlow.addColorStop(1, 'rgba(60, 40, 180, 0)');
    ctx.beginPath();
    ctx.arc(x, y, r * 3, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    const coreGrad = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
    coreGrad.addColorStop(0, 'rgba(140, 180, 255, 1)');
    coreGrad.addColorStop(0.5, 'rgba(80, 100, 255, 0.95)');
    coreGrad.addColorStop(1, 'rgba(60, 50, 200, 0.8)');
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = coreGrad;
    ctx.fill();

    const ringGrad = ctx.createRadialGradient(x, y, r - 2, x, y, r + 6);
    ringGrad.addColorStop(0, 'rgba(100, 140, 255, 0)');
    ringGrad.addColorStop(0.5, 'rgba(100, 140, 255, 0.5)');
    ringGrad.addColorStop(1, 'rgba(100, 140, 255, 0)');
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(120, 160, 255, 0.7)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  private renderDragIndicator(ctx: CanvasRenderingContext2D) {
    if (!this.dragStart || !this.dragCurrent) return;

    const dx = this.dragStart.x - this.dragCurrent.x;
    const dy = this.dragStart.y - this.dragCurrent.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 10) return;

    const nx = dx / dist;
    const ny = dy / dist;
    const arrowLen = Math.min(dist * 0.8, 80);

    const startX = this.energyBall.x;
    const startY = this.energyBall.y;
    const endX = startX + nx * arrowLen;
    const endY = startY + ny * arrowLen;

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.strokeStyle = 'rgba(120, 160, 255, 0.6)';
    ctx.lineWidth = 3;
    ctx.setLineDash([8, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    const headLen = 12;
    const angle = Math.atan2(ny, nx);
    ctx.beginPath();
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle - 0.4), endY - headLen * Math.sin(angle - 0.4));
    ctx.moveTo(endX, endY);
    ctx.lineTo(endX - headLen * Math.cos(angle + 0.4), endY - headLen * Math.sin(angle + 0.4));
    ctx.strokeStyle = 'rgba(120, 160, 255, 0.8)';
    ctx.lineWidth = 3;
    ctx.stroke();

    const power = Math.min(dist / 100, 1);
    ctx.beginPath();
    ctx.arc(endX, endY, 6, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(120, 160, 255, ${0.3 + power * 0.5})`;
    ctx.fill();
  }

  private renderGameOver(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#a080ff';
    ctx.fillText('时间到!', w / 2, h / 2 - 40);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = '#8070cc';
    ctx.fillText(`最终得分: ${this.score}`, w / 2, h / 2 + 20);

    ctx.font = '18px sans-serif';
    ctx.fillStyle = 'rgba(160, 140, 220, 0.7)';
    ctx.fillText('点击重置按钮重新开始', w / 2, h / 2 + 60);
  }

  destroy() {
    this.stop();
  }
}
