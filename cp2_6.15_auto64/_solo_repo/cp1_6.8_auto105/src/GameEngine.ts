import { FireflyManager } from './Firefly';
import { BloomCollector, FlowerVariety } from './BloomCollector';

export interface GameState {
  fireflyCount: number;
  cycleCount: number;
  unlockedCount: number;
  totalFlowers: number;
  flowers: FlowerVariety[];
  newlyUnlocked: FlowerVariety | null;
  showUnlock: boolean;
  showButterfly: boolean;
  selectedFlower: FlowerVariety | null;
  score: number;
}

interface StarData {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinklePhase: number;
}

interface SpriteData {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  trail: { x: number; y: number; alpha: number }[];
  wingPhase: number;
  glowPhase: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private sprite: SpriteData;
  private fireflyManager: FireflyManager;
  private bloomCollector: BloomCollector;
  private stars: StarData[] = [];
  private running = false;
  private animFrameId = 0;
  private lastTime = 0;
  private fireflyCount = 0;
  private cycleCount = 0;
  private score = 0;
  private audioCtx: AudioContext | null = null;
  private time = 0;
  private newlyUnlocked: FlowerVariety | null = null;
  private showUnlock = false;
  private unlockTimer = 0;
  private showButterfly = false;
  private selectedFlower: FlowerVariety | null = null;
  private collectEffects: { x: number; y: number; timer: number; size: number }[] = [];
  private onStateChange: ((state: GameState) => void) | null = null;
  private grassBlades: { x: number; height: number; phase: number; speed: number }[] = [];
  private dpr = 1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.fireflyManager = new FireflyManager(0, 0);
    this.bloomCollector = new BloomCollector(0, 0);
    this.sprite = {
      x: 0, y: 0,
      targetX: 0, targetY: 0,
      trail: [],
      wingPhase: 0,
      glowPhase: 0,
    };
  }

  init(): void {
    this.dpr = window.devicePixelRatio || 1;
    this.resize();
    this.sprite.x = this.width / 2;
    this.sprite.y = this.height / 2;
    this.sprite.targetX = this.width / 2;
    this.sprite.targetY = this.height / 2;
    this.generateStars();
    this.generateGrass();
    this.emitState();
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.bindEvents();
    this.gameLoop(this.lastTime);
  }

  stop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.unbindEvents();
  }

  reset(): void {
    this.fireflyCount = 0;
    this.cycleCount = 0;
    this.score = 0;
    this.newlyUnlocked = null;
    this.showUnlock = false;
    this.unlockTimer = 0;
    this.showButterfly = false;
    this.selectedFlower = null;
    this.collectEffects = [];
    this.time = 0;
    this.fireflyManager.reset();
    this.bloomCollector.reset();
    this.bloomCollector.resize(this.width, this.height);
    this.sprite.x = this.width / 2;
    this.sprite.y = this.height / 2;
    this.sprite.targetX = this.width / 2;
    this.sprite.targetY = this.height / 2;
    this.sprite.trail = [];
    this.emitState();
  }

  setOnStateChange(cb: (state: GameState) => void): void {
    this.onStateChange = cb;
  }

  selectFlower(flower: FlowerVariety | null): void {
    this.selectedFlower = flower;
    this.emitState();
  }

  resize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.fireflyManager.resize(this.width, this.height);
    this.bloomCollector.resize(this.width, this.height);
    this.generateStars();
    this.generateGrass();
  }

  private generateStars(): void {
    this.stars = [];
    const count = Math.floor((this.width * this.height) / 4000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height * 0.7,
        size: 0.5 + Math.random() * 1.5,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleSpeed: 0.5 + Math.random() * 2,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  private generateGrass(): void {
    this.grassBlades = [];
    const count = Math.floor(this.width / 8);
    for (let i = 0; i < count; i++) {
      this.grassBlades.push({
        x: Math.random() * this.width,
        height: 20 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 1,
      });
    }
  }

  private gameLoop = (timestamp: number): void => {
    if (!this.running) return;

    const dt = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.gameLoop);
  };

  private update(dt: number): void {
    this.time += dt;

    this.sprite.x += (this.sprite.targetX - this.sprite.x) * 6 * dt;
    this.sprite.y += (this.sprite.targetY - this.sprite.y) * 6 * dt;
    this.sprite.wingPhase += dt * 8;
    this.sprite.glowPhase += dt * 3;

    this.sprite.trail.unshift({ x: this.sprite.x, y: this.sprite.y, alpha: 0.6 });
    for (const t of this.sprite.trail) {
      t.alpha -= dt * 2.5;
    }
    this.sprite.trail = this.sprite.trail.filter(t => t.alpha > 0);
    if (this.sprite.trail.length > 15) this.sprite.trail.length = 15;

    this.fireflyManager.update(dt, this.sprite.x, this.sprite.y);
    this.bloomCollector.update(dt);

    this.checkCollisions();

    for (const e of this.collectEffects) {
      e.timer += dt;
      e.size += 60 * dt;
    }
    this.collectEffects = this.collectEffects.filter(e => e.timer < 0.5);

    if (this.showUnlock) {
      this.unlockTimer += dt;
      if (this.unlockTimer > 3) {
        this.showUnlock = false;
        this.newlyUnlocked = null;
        this.emitState();
      }
    }
  }

  private checkCollisions(): void {
    const collisionRadius = 28;
    const hit = this.fireflyManager.checkCollision(
      this.sprite.x,
      this.sprite.y,
      collisionRadius
    );
    if (hit) {
      this.fireflyManager.collectFirefly(hit);
      this.fireflyCount++;
      this.cycleCount++;
      this.score += 10;
      this.playCollectSound();
      this.collectEffects.push({
        x: hit.x,
        y: hit.y,
        timer: 0,
        size: 10,
      });

      if (this.cycleCount >= 10 && !this.bloomCollector.isAllUnlocked()) {
        this.cycleCount = 0;
        const flower = this.bloomCollector.unlockNext();
        if (flower) {
          this.newlyUnlocked = flower;
          this.showUnlock = true;
          this.unlockTimer = 0;
          this.playUnlockSound();

          if (this.bloomCollector.isAllUnlocked() && !this.showButterfly) {
            this.showButterfly = true;
            this.bloomCollector.summonButterfly();
          }
        }
      }

      this.emitState();
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.renderBackground();
    this.renderGrass();
    this.renderStarsLayer();
    this.bloomCollector.render(ctx);
    this.fireflyManager.render(ctx);
    this.renderCollectEffects();
    this.renderSprite();
  }

  private renderBackground(): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, this.height);
    grad.addColorStop(0, '#0a0a2e');
    grad.addColorStop(0.4, '#0d0d3a');
    grad.addColorStop(0.7, '#12082e');
    grad.addColorStop(1, '#1a0a2e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    const ambientGlow = ctx.createRadialGradient(
      this.width * 0.5, this.height * 0.6, 0,
      this.width * 0.5, this.height * 0.6, this.height * 0.5
    );
    ambientGlow.addColorStop(0, 'rgba(30,20,60,0.3)');
    ambientGlow.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = ambientGlow;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private renderStarsLayer(): void {
    const ctx = this.ctx;
    for (const s of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(s.twinklePhase + this.time * s.twinkleSpeed);
      const alpha = s.brightness * twinkle;
      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private renderGrass(): void {
    const ctx = this.ctx;
    for (const g of this.grassBlades) {
      const sway = Math.sin(g.phase + this.time * g.speed) * 5;
      const baseY = this.height;
      const tipX = g.x + sway;
      const tipY = baseY - g.height;

      ctx.save();
      ctx.strokeStyle = `rgba(20,60,30,${0.3 + (g.height / 60) * 0.3})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(g.x, baseY);
      ctx.quadraticCurveTo(g.x + sway * 0.5, baseY - g.height * 0.5, tipX, tipY);
      ctx.stroke();

      const glowAlpha = 0.15 + 0.1 * Math.sin(g.phase + this.time * 1.5);
      ctx.strokeStyle = `rgba(60,180,80,${glowAlpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(g.x, baseY);
      ctx.quadraticCurveTo(g.x + sway * 0.5, baseY - g.height * 0.5, tipX, tipY);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderSprite(): void {
    const ctx = this.ctx;
    const s = this.sprite;

    for (const t of s.trail) {
      ctx.fillStyle = `rgba(180,200,255,${t.alpha * 0.3})`;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    const glowPulse = 0.8 + 0.2 * Math.sin(s.glowPhase);
    const outerGlow = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 40 * glowPulse);
    outerGlow.addColorStop(0, 'rgba(180,200,255,0.3)');
    outerGlow.addColorStop(0.5, 'rgba(140,160,255,0.1)');
    outerGlow.addColorStop(1, 'rgba(100,120,255,0)');
    ctx.fillStyle = outerGlow;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 40 * glowPulse, 0, Math.PI * 2);
    ctx.fill();

    const wingFlap = Math.sin(s.wingPhase) * 0.6;
    for (let side = -1; side <= 1; side += 2) {
      ctx.save();
      ctx.translate(s.x, s.y);
      ctx.scale(side * (0.6 + wingFlap * 0.3), 1);

      const wingGrad = ctx.createRadialGradient(0, -2, 0, 8, -5, 14);
      wingGrad.addColorStop(0, 'rgba(200,220,255,0.7)');
      wingGrad.addColorStop(0.5, 'rgba(150,170,255,0.3)');
      wingGrad.addColorStop(1, 'rgba(120,140,255,0)');
      ctx.fillStyle = wingGrad;
      ctx.beginPath();
      ctx.ellipse(8, -5, 14, 10, -0.2, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }

    const bodyGrad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, 7);
    bodyGrad.addColorStop(0, 'rgba(255,255,255,0.95)');
    bodyGrad.addColorStop(0.5, 'rgba(200,220,255,0.8)');
    bodyGrad.addColorStop(1, 'rgba(150,180,255,0)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(s.x, s.y, 7, 0, Math.PI * 2);
    ctx.fill();
  }

  private renderCollectEffects(): void {
    const ctx = this.ctx;
    for (const e of this.collectEffects) {
      const progress = e.timer / 0.5;
      const alpha = 1 - progress;
      ctx.save();
      ctx.strokeStyle = `rgba(255,230,100,${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.stroke();

      const glow = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.size);
      glow.addColorStop(0, `rgba(255,230,100,${alpha * 0.2})`);
      glow.addColorStop(1, 'rgba(255,230,100,0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private playCollectSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.25);
    } catch {
      // audio not supported
    }
  }

  private playUnlockSound(): void {
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = this.audioCtx;
      const freqs = [523.25, 659.25, 783.99];
      freqs.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        const startTime = ctx.currentTime + i * 0.12;
        osc.frequency.setValueAtTime(freq, startTime);
        gain.gain.setValueAtTime(0.08, startTime);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.7);
        osc.start(startTime);
        osc.stop(startTime + 0.7);
      });
    } catch {
      // audio not supported
    }
  }

  private emitState(): void {
    if (!this.onStateChange) return;
    this.onStateChange({
      fireflyCount: this.fireflyCount,
      cycleCount: this.cycleCount,
      unlockedCount: this.bloomCollector.getUnlockedCount(),
      totalFlowers: 6,
      flowers: this.bloomCollector.getFlowers(),
      newlyUnlocked: this.newlyUnlocked,
      showUnlock: this.showUnlock,
      showButterfly: this.showButterfly,
      selectedFlower: this.selectedFlower,
      score: this.score,
    });
  }

  private handleMouseMove = (e: MouseEvent): void => {
    this.sprite.targetX = e.clientX;
    this.sprite.targetY = e.clientY;
  };

  private handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const touch = e.touches[0];
    this.sprite.targetX = touch.clientX;
    this.sprite.targetY = touch.clientY;
  };

  private handleTouchStart = (e: TouchEvent): void => {
    const touch = e.touches[0];
    this.sprite.targetX = touch.clientX;
    this.sprite.targetY = touch.clientY;
  };

  private handleClick = (e: MouseEvent): void => {
    const flower = this.bloomCollector.checkClick(e.clientX, e.clientY);
    if (flower) {
      this.selectedFlower = flower;
    } else {
      this.selectedFlower = null;
    }
    this.emitState();
  };

  private handleResize = (): void => {
    this.resize();
  };

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('touchmove', this.handleTouchMove, { passive: false });
    this.canvas.addEventListener('touchstart', this.handleTouchStart);
    this.canvas.addEventListener('click', this.handleClick);
    window.addEventListener('resize', this.handleResize);
  }

  private unbindEvents(): void {
    this.canvas.removeEventListener('mousemove', this.handleMouseMove);
    this.canvas.removeEventListener('touchmove', this.handleTouchMove);
    this.canvas.removeEventListener('touchstart', this.handleTouchStart);
    this.canvas.removeEventListener('click', this.handleClick);
    window.removeEventListener('resize', this.handleResize);
  }
}
