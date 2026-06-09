import { Firefly } from './firefly';

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
}

export interface SimulationParams {
  brightness: number;
  attractRadius: number;
  fireflyCount: number;
}

export class Simulation {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  fireflies: Firefly[];
  targetFireflyCount: number;
  shockwaves: Shockwave[];

  mouseX: number;
  mouseY: number;
  isMouseInCanvas: boolean;
  attractRadius: number;
  attractStrength: number;

  brightness: number;

  swarmActive: boolean;
  swarmPhase: number;
  swarmTimer: number;
  swarmProgress: number;
  swarmCheckTimer: number;
  swarmCenterX: number;
  swarmCenterY: number;

  fps: number;
  frameCount: number;
  fpsTimer: number;
  lastFrameTime: number;

  baseCanvasArea: number;
  baseFireflyCount: number;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.fireflies = [];
    this.targetFireflyCount = 150;
    this.shockwaves = [];

    this.mouseX = 0;
    this.mouseY = 0;
    this.isMouseInCanvas = false;
    this.attractRadius = 120;
    this.attractStrength = 0.05;

    this.brightness = 1.0;

    this.swarmActive = false;
    this.swarmPhase = 0;
    this.swarmTimer = 0;
    this.swarmProgress = 0;
    this.swarmCheckTimer = 0;
    this.swarmCenterX = 0;
    this.swarmCenterY = 0;

    this.fps = 60;
    this.frameCount = 0;
    this.fpsTimer = 0;
    this.lastFrameTime = performance.now();

    this.baseCanvasArea = canvas.width * canvas.height;
    this.baseFireflyCount = 150;

    this.resize();
    this.initFireflies();
    this.bindEvents();
  }

  resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const area = rect.width * rect.height;
    const densityFactor = area / this.baseCanvasArea;
    const newCount = Math.max(100, Math.min(300, Math.round(this.baseFireflyCount * densityFactor)));
    this.targetFireflyCount = newCount;
  }

  initFireflies(): void {
    const rect = this.canvas.getBoundingClientRect();
    const count = this.targetFireflyCount;
    for (let i = 0; i < count; i++) {
      const f = Firefly.createRandom(rect.width, rect.height);
      f.setGlobalBrightness(this.brightness);
      this.fireflies.push(f);
    }
  }

  addFireflies(targetCount: number): void {
    this.targetFireflyCount = targetCount;
    this.baseFireflyCount = targetCount;
  }

  bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => this.handleMouseLeave());
    this.canvas.addEventListener('mouseenter', () => { this.isMouseInCanvas = true; });
    this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        this.handleMouseMove({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      }
    }, { passive: false });
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        this.handleClick({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
      }
    }, { passive: false });
    this.canvas.addEventListener('touchend', () => this.handleMouseLeave());

    window.addEventListener('resize', () => this.resize());
  }

  handleMouseMove(e: MouseEvent | { clientX: number; clientY: number }): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouseX = e.clientX - rect.left;
    this.mouseY = e.clientY - rect.top;
    this.isMouseInCanvas = true;
  }

  handleMouseLeave(): void {
    this.isMouseInCanvas = false;
    for (const f of this.fireflies) {
      f.setAttractTarget(null, null);
    }
  }

  handleClick(e: MouseEvent | { clientX: number; clientY: number }): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    this.shockwaves.push({
      x,
      y,
      radius: 0,
      maxRadius: 200,
      speed: 2,
      alpha: 0.6,
    });

    for (const f of this.fireflies) {
      f.applyRepel(x, y, 0);
    }
  }

  setBrightness(value: number): void {
    this.brightness = value;
    for (const f of this.fireflies) {
      f.setGlobalBrightness(value);
    }
  }

  setAttractRadius(value: number): void {
    this.attractRadius = value;
  }

  getParams(): SimulationParams {
    return {
      brightness: this.brightness,
      attractRadius: this.attractRadius,
      fireflyCount: this.fireflies.length,
    };
  }

  getCount(): number {
    return this.fireflies.length;
  }

  getAverageBrightness(): number {
    if (this.fireflies.length === 0) return 0;
    let sum = 0;
    for (const f of this.fireflies) {
      sum += f.getBrightness();
    }
    return sum / this.fireflies.length;
  }

  getFPS(): number {
    return this.fps;
  }

  triggerSwarm(): void {
    if (this.swarmActive) return;
    const rect = this.canvas.getBoundingClientRect();
    this.swarmCenterX = rect.width / 2;
    this.swarmCenterY = rect.height / 2;
    this.swarmActive = true;
    this.swarmPhase = 0;
    this.swarmTimer = 0;
    this.swarmProgress = 0;
  }

  update(time: number): void {
    const now = performance.now();
    this.frameCount++;
    this.fpsTimer += now - this.lastFrameTime;
    if (this.fpsTimer >= 1000) {
      this.fps = Math.round(this.frameCount * 1000 / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }
    this.lastFrameTime = now;

    const rect = this.canvas.getBoundingClientRect();

    this.swarmCheckTimer += 1 / 60;
    if (this.swarmCheckTimer >= 30 && !this.swarmActive) {
      this.swarmCheckTimer = 0;
      if (Math.random() < 0.05) {
        this.triggerSwarm();
      }
    }

    if (this.swarmActive) {
      this.swarmTimer += 1 / 60;
      if (this.swarmPhase === 0) {
        this.swarmProgress = Math.min(1, this.swarmTimer / 10);
        if (this.swarmTimer >= 10) {
          this.swarmPhase = 1;
          this.swarmTimer = 0;
        }
      } else if (this.swarmPhase === 1) {
        this.swarmProgress = 1;
        if (this.swarmTimer >= 8) {
          this.swarmPhase = 2;
          this.swarmTimer = 0;
        }
      } else if (this.swarmPhase === 2) {
        this.swarmProgress = Math.max(0, 1 - this.swarmTimer / 10);
        if (this.swarmTimer >= 10) {
          this.swarmActive = false;
          this.swarmProgress = 0;
        }
      }
    }

    const countDiff = this.targetFireflyCount - this.fireflies.length;
    if (countDiff > 0) {
      const addCount = Math.min(Math.ceil(countDiff / 60), countDiff);
      for (let i = 0; i < addCount; i++) {
        const f = Firefly.createRandom(rect.width, rect.height);
        f.setGlobalBrightness(this.brightness);
        this.fireflies.push(f);
      }
    } else if (countDiff < 0) {
      const removeCount = Math.min(Math.ceil(-countDiff / 60), -countDiff);
      this.fireflies.splice(this.fireflies.length - removeCount, removeCount);
    }

    for (const f of this.fireflies) {
      if (this.isMouseInCanvas) {
        const dx = this.mouseX - f.x;
        const dy = this.mouseY - f.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < this.attractRadius) {
          f.setAttractTarget(this.mouseX, this.mouseY, this.attractStrength);
        } else {
          f.setAttractTarget(null, null);
        }
      }

      if (this.swarmActive && this.swarmProgress > 0) {
        const angle = Math.random() * Math.PI * 2;
        const dist = Math.random() * 200 * this.swarmProgress;
        const targetX = this.swarmCenterX + Math.cos(angle) * dist;
        const targetY = this.swarmCenterY + Math.sin(angle) * dist;
        f.setSwarmTarget(targetX, targetY, this.swarmProgress * 0.6);
      } else {
        f.setSwarmTarget(null, null, 0);
      }

      f.update(rect.width, rect.height, time);
    }

    for (let i = this.shockwaves.length - 1; i >= 0; i--) {
      const sw = this.shockwaves[i];
      sw.radius += sw.speed;
      sw.alpha = 0.6 * (1 - sw.radius / sw.maxRadius);

      for (const f of this.fireflies) {
        f.applyRepel(sw.x, sw.y, sw.radius);
      }

      if (sw.radius >= sw.maxRadius || sw.alpha <= 0) {
        this.shockwaves.splice(i, 1);
      }
    }
  }

  render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    const bgGradient = this.ctx.createLinearGradient(0, 0, 0, h);
    bgGradient.addColorStop(0, '#0A0E1A');
    bgGradient.addColorStop(1, '#1A2A4A');
    this.ctx.fillStyle = bgGradient;
    this.ctx.fillRect(0, 0, w, h);

    if (this.swarmActive && this.swarmProgress > 0.3) {
      const dimAlpha = (this.swarmProgress - 0.3) / 0.7 * 0.4;
      this.ctx.fillStyle = `rgba(10, 14, 26, ${dimAlpha})`;
      this.ctx.fillRect(0, 0, w, h);

      const centerGrad = this.ctx.createRadialGradient(
        this.swarmCenterX, this.swarmCenterY, 0,
        this.swarmCenterX, this.swarmCenterY, 300
      );
      centerGrad.addColorStop(0, `rgba(200, 255, 112, ${0.08 * this.swarmProgress})`);
      centerGrad.addColorStop(1, 'rgba(200, 255, 112, 0)');
      this.ctx.globalCompositeOperation = 'lighter';
      this.ctx.fillStyle = centerGrad;
      this.ctx.fillRect(0, 0, w, h);
      this.ctx.globalCompositeOperation = 'source-over';
    }

    for (const f of this.fireflies) {
      f.draw(this.ctx);
    }

    this.ctx.globalCompositeOperation = 'source-over';
    for (const sw of this.shockwaves) {
      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha})`;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(sw.x, sw.y, sw.radius - 3, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha * 0.3})`;
      this.ctx.lineWidth = 6;
      this.ctx.stroke();
    }
  }
}
