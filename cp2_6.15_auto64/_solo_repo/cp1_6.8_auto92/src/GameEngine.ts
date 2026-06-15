import { StarFragment } from './StarFragment';
import { ConstellationUnlocker, FRAGMENTS_PER_CONSTELLATION } from './ConstellationUnlocker';

interface TrailParticle {
  x: number;
  y: number;
  alpha: number;
  radius: number;
  vx: number;
  vy: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  radius: number;
  life: number;
}

interface BackgroundStar {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

export interface GameCallbacks {
  onCollect: (count: number) => void;
  onUnlock: (index: number) => void;
  onComplete: () => void;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  private fragments: StarFragment[] = [];
  private constellationUnlocker: ConstellationUnlocker;
  private collected = 0;
  private gameComplete = false;

  private playerX = 0;
  private playerY = 0;
  private targetX = 0;
  private targetY = 0;
  private mouseX = 0;
  private mouseY = 0;
  private mouseDown = false;

  private trail: TrailParticle[] = [];
  private bursts: BurstParticle[] = [];
  private bgStars: BackgroundStar[] = [];

  private lastTime = 0;
  private rafId = 0;
  private running = false;

  private spawnTimer = 0;
  private spawnInterval = 2000;

  private audioCtx: AudioContext | null = null;

  private callbacks: GameCallbacks;

  constructor(canvas: HTMLCanvasElement, callbacks: GameCallbacks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.callbacks = callbacks;
    this.constellationUnlocker = new ConstellationUnlocker();
    this.constellationUnlocker.onUnlock((idx) => {
      this.callbacks.onUnlock(idx);
    });
    this.constellationUnlocker.onComplete(() => {
      this.gameComplete = true;
      this.callbacks.onComplete();
    });

    this.handleResize();
    this.generateBgStars();
    this.playerX = this.width / 2;
    this.playerY = this.height / 2;
    this.mouseX = this.playerX;
    this.mouseY = this.playerY;
    this.targetX = this.playerX;
    this.targetY = this.playerY;
  }

  private handleResize = (): void => {
    this.dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.generateBgStars();
  };

  private generateBgStars(): void {
    this.bgStars = [];
    const count = Math.floor((this.width * this.height) / 3000);
    for (let i = 0; i < count; i++) {
      this.bgStars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        radius: 0.3 + Math.random() * 1.2,
        alpha: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener('resize', this.handleResize);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd);
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
    window.removeEventListener('resize', this.handleResize);
    this.canvas.removeEventListener('mousemove', this.onMouseMove);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    this.canvas.removeEventListener('mouseup', this.onMouseUp);
    this.canvas.removeEventListener('touchstart', this.onTouchStart);
    this.canvas.removeEventListener('touchmove', this.onTouchMove);
    this.canvas.removeEventListener('touchend', this.onTouchEnd);
  }

  reset(): void {
    this.fragments = [];
    this.trail = [];
    this.bursts = [];
    this.collected = 0;
    this.gameComplete = false;
    this.spawnTimer = 0;
    this.playerX = this.width / 2;
    this.playerY = this.height / 2;
    this.mouseX = this.playerX;
    this.mouseY = this.playerY;
    this.targetX = this.playerX;
    this.targetY = this.playerY;
    this.constellationUnlocker.reset();
    this.callbacks.onCollect(0);
  }

  getCollected(): number {
    return this.collected;
  }

  getUnlockCount(): number {
    return this.constellationUnlocker.getUnlockCount();
  }

  getCompletedCount(): number {
    return this.constellationUnlocker.getCompletedCount();
  }

  private onMouseMove = (e: MouseEvent): void => {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    this.checkHover(e.clientX, e.clientY);
  };

  private onMouseDown = (e: MouseEvent): void => {
    this.mouseDown = true;
    this.targetX = e.clientX;
    this.targetY = e.clientY;
    this.tryCollect(e.clientX, e.clientY);
  };

  private onMouseUp = (): void => {
    this.mouseDown = false;
  };

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.touches[0];
    this.mouseX = t.clientX;
    this.mouseY = t.clientY;
    this.targetX = t.clientX;
    this.targetY = t.clientY;
    this.tryCollect(t.clientX, t.clientY);
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const t = e.touches[0];
    this.mouseX = t.clientX;
    this.mouseY = t.clientY;
    this.targetX = t.clientX;
    this.targetY = t.clientY;
  };

  private onTouchEnd = (): void => {
  };

  private checkHover(mx: number, my: number): void {
    for (const frag of this.fragments) {
      frag.state.hovered = frag.hitTest(mx, my);
    }
  }

  private tryCollect(mx: number, my: number): void {
    for (const frag of this.fragments) {
      if (frag.hitTest(mx, my) && !frag.state.collected) {
        this.collectFragment(frag);
        break;
      }
    }
  }

  private collectFragment(frag: StarFragment): void {
    frag.state.collected = true;
    frag.state.collectTime = performance.now();
    this.collected++;
    this.spawnBurst(frag.state.x, frag.state.y, frag.state.colorStops);
    this.playCollectSound();
    this.callbacks.onCollect(this.collected);
    this.constellationUnlocker.tryUnlock(this.collected, performance.now());
  }

  private spawnBurst(x: number, y: number, colors: [string, string, string]): void {
    const count = 16;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.3;
      const speed = 60 + Math.random() * 100;
      this.bursts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        alpha: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: 2 + Math.random() * 3,
        life: 600 + Math.random() * 400,
      });
    }
  }

  private playCollectSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new AudioContext();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      const baseFreq = 600 + this.collected * 20;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.08);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } catch {
    }
  }

  private loop = (now: number): void => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(now, dt);
    this.draw(now);
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(now: number, dt: number): void {
    const ease = 1 - Math.pow(0.001, dt);
    this.playerX += (this.targetX - this.playerX) * ease;
    this.playerY += (this.targetY - this.playerY) * ease;

    if (dt > 0) {
      const dx = this.targetX - this.playerX;
      const dy = this.targetY - this.playerY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 2) {
        for (let i = 0; i < 2; i++) {
          this.trail.push({
            x: this.playerX + (Math.random() - 0.5) * 6,
            y: this.playerY + (Math.random() - 0.5) * 6,
            alpha: 0.8,
            radius: 2 + Math.random() * 2,
            vx: (Math.random() - 0.5) * 20 - dx * 0.1,
            vy: (Math.random() - 0.5) * 20 - dy * 0.1,
          });
        }
      }
    }

    for (let i = this.trail.length - 1; i >= 0; i--) {
      const p = this.trail[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.alpha -= dt * 2.5;
      p.radius -= dt * 3;
      if (p.alpha <= 0 || p.radius <= 0) {
        this.trail.splice(i, 1);
      }
    }

    for (let i = this.bursts.length - 1; i >= 0; i--) {
      const b = this.bursts[i];
      b.x += b.vx * dt;
      b.y += b.vy * dt;
      b.vx *= 1 - dt * 3;
      b.vy *= 1 - dt * 3;
      b.alpha -= dt / (b.life / 1000);
      if (b.alpha <= 0) {
        this.bursts.splice(i, 1);
      }
    }

    this.spawnTimer += dt * 1000;
    if (this.spawnTimer >= this.spawnInterval && this.fragments.filter(f => !f.state.collected).length < 8) {
      this.spawnTimer = 0;
      this.fragments.push(new StarFragment(this.width, this.height, now));
    }

    for (const frag of this.fragments) {
      frag.update(now, dt);
    }

    this.fragments = this.fragments.filter(f => !f.isDead());

    if (this.mouseDown) {
      this.targetX = this.mouseX;
      this.targetY = this.mouseY;
    }

    if (!this.gameComplete) {
      for (const frag of this.fragments) {
        if (frag.state.collected) continue;
        const dx = this.playerX - frag.state.x;
        const dy = this.playerY - frag.state.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < frag.state.radius * 2.5) {
          this.collectFragment(frag);
        }
      }
    }

    this.constellationUnlocker.update(now, dt);
  }

  private draw(now: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, '#0a0a2e');
    bgGrad.addColorStop(0.5, '#0d0d3a');
    bgGrad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    for (const star of this.bgStars) {
      const twinkle = 0.5 + 0.5 * Math.sin(now * 0.001 * star.twinkleSpeed + star.phase);
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    this.constellationUnlocker.draw(ctx, now, this.width, this.height);

    for (const frag of this.fragments) {
      frag.draw(ctx, now);
    }

    for (const p of this.trail) {
      ctx.globalAlpha = p.alpha * 0.6;
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      grad.addColorStop(0, 'rgba(150, 200, 255, 0.8)');
      grad.addColorStop(1, 'rgba(100, 150, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    for (const b of this.bursts) {
      ctx.globalAlpha = b.alpha;
      ctx.fillStyle = b.color;
      ctx.shadowColor = b.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;

    this.drawPlayer(ctx, now);

    if (this.gameComplete) {
      ctx.save();
      ctx.globalAlpha = 0.6 + 0.4 * Math.sin(now * 0.002);
      ctx.fillStyle = '#e0d0ff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.shadowColor = 'rgba(180, 160, 255, 0.8)';
      ctx.shadowBlur = 20;
      ctx.fillText('✨ 星图完成 ✨', this.width / 2, this.height / 2 - 60);
      ctx.font = '18px sans-serif';
      ctx.fillText('你已拼出完整的星图', this.width / 2, this.height / 2 - 20);
      ctx.restore();
    }
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, now: number): void {
    const px = this.playerX;
    const py = this.playerY;
    const breathe = 0.8 + 0.2 * Math.sin(now * 0.004);
    const r = 6 * breathe;

    const outerGlow = ctx.createRadialGradient(px, py, 0, px, py, r * 5);
    outerGlow.addColorStop(0, 'rgba(180, 200, 255, 0.3)');
    outerGlow.addColorStop(0.5, 'rgba(120, 150, 255, 0.1)');
    outerGlow.addColorStop(1, 'rgba(100, 120, 255, 0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(px, py, r * 5, 0, Math.PI * 2);
    ctx.fill();

    const innerGlow = ctx.createRadialGradient(px, py, 0, px, py, r * 2);
    innerGlow.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    innerGlow.addColorStop(0.4, 'rgba(180, 200, 255, 0.6)');
    innerGlow.addColorStop(1, 'rgba(120, 150, 255, 0)');
    ctx.fillStyle = innerGlow;
    ctx.beginPath();
    ctx.arc(px, py, r * 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(150, 180, 255, 0.8)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }
}
