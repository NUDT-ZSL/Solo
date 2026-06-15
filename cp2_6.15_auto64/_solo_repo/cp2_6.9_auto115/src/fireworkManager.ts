import { ParticlePool, Particle, CollisionHalo } from './particle.js';

export interface FireworkCallbacks {
  onKeySequenceUpdate: (keys: string[]) => void;
  onScoreUpdate: (score: number) => void;
  onMiss: () => void;
}

export interface Config {
  particleCount: number;
  particleSpeed: number;
  colorTheme: number;
}

const COLOR_THEMES: string[][] = [
  [
    '#FF3366', '#FF9933', '#FFD700', '#33CC66',
    '#33CCCC', '#3366FF', '#9933FF', '#FF66B2'
  ],
  [
    '#FF6B9D', '#FFA07A', '#F0E68C', '#98FB98',
    '#87CEEB', '#B0E0E6', '#DDA0DD', '#FFB6C1'
  ],
  [
    '#00FF87', '#00D4AA', '#00B4D8', '#0077B6',
    '#023E8A', '#48CAE4', '#5E60CE', '#7400B8'
  ]
];

const COLLISION_INTERVAL = 0.8;

interface KeyPressRecord {
  key: number;
  time: number;
  x: number;
  y: number;
  color: string;
}

export class FireworkManager {
  private particlePool: ParticlePool;
  private halos: CollisionHalo[] = [];
  private keySequence: string[] = [];
  private keyPressHistory: KeyPressRecord[] = [];
  private score: number = 0;
  private consecutiveHits: number = 0;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private callbacks: FireworkCallbacks;
  private config: Config;
  private skyline: { x: number; w: number; h: number; glow: number }[] = [];
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  constructor(callbacks: FireworkCallbacks, config: Config) {
    this.particlePool = new ParticlePool(300);
    this.callbacks = callbacks;
    this.config = config;
  }

  setConfig(config: Partial<Config>): void {
    Object.assign(this.config, config);
  }

  setCanvasSize(w: number, h: number): void {
    this.canvasWidth = w;
    this.canvasHeight = h;
    this.generateSkyline();
  }

  setMousePosition(x: number, y: number): void {
    this.mouseX = x;
    this.mouseY = y;
  }

  private generateSkyline(): void {
    this.skyline = [];
    const buildingCount = 25;
    const baseY = this.canvasHeight;
    for (let i = 0; i < buildingCount; i++) {
      const w = 20 + Math.random() * 60;
      const x = (i / buildingCount) * this.canvasWidth + (Math.random() - 0.5) * 20;
      const h = 30 + Math.random() * 120;
      this.skyline.push({ x, w, h, glow: 0 });
    }
  }

  getColorForKey(keyNum: number): string {
    return COLOR_THEMES[this.config.colorTheme][keyNum - 1];
  }

  triggerKey(keyStr: string, currentTime: number): void {
    const keyNum = parseInt(keyStr, 10);
    if (isNaN(keyNum) || keyNum < 1 || keyNum > 8) return;

    const color = this.getColorForKey(keyNum);
    const x = this.mouseX;
    const y = this.mouseY;

    this.keyPressHistory.push({ key: keyNum, time: currentTime, x, y, color });

    this.keySequence.push(keyStr);
    if (this.keySequence.length > 5) {
      this.keySequence.shift();
    }
    this.callbacks.onKeySequenceUpdate([...this.keySequence]);

    let interval = -1;
    if (this.keyPressHistory.length >= 2) {
      const prev = this.keyPressHistory[this.keyPressHistory.length - 2];
      interval = currentTime - prev.time;
    }

    this.spawnExplosion(x, y, keyNum, color, interval);

    if (this.keyPressHistory.length >= 2) {
      const prev = this.keyPressHistory[this.keyPressHistory.length - 2];
      if (interval < COLLISION_INTERVAL) {
        this.consecutiveHits++;
        this.score += 10;
        this.callbacks.onScoreUpdate(this.score);
        this.createCollisionHalo(prev, { key: keyNum, time: currentTime, x, y, color });
      } else {
        if (this.consecutiveHits > 0) {
          this.callbacks.onMiss();
        }
        this.consecutiveHits = 0;
      }
    }
  }

  reset(): void {
    this.particlePool.clear();
    this.halos = [];
    this.keySequence = [];
    this.keyPressHistory = [];
    this.score = 0;
    this.consecutiveHits = 0;
    this.callbacks.onKeySequenceUpdate([]);
    this.callbacks.onScoreUpdate(0);
    for (const b of this.skyline) {
      b.glow = 0;
    }
  }

  private spawnExplosion(x: number, y: number, keyNum: number, color: string, interval: number): void {
    const baseCount = 20 + (keyNum - 1) * ((80 - 20) / 7);
    const count = Math.min(80, Math.round(baseCount * (this.config.particleCount / 30)));

    let speedScale = 1.0;
    let lifeScale = 1.0;
    let radiusScale = 1.0;

    if (interval > 0) {
      if (interval < 0.2) {
        speedScale = 1.5;
        lifeScale = 0.7;
        radiusScale = 0.6;
      } else if (interval > 0.5) {
        speedScale = 0.6;
        lifeScale = 1.6;
        radiusScale = 1.4;
      }
    }

    const baseSpeed = 2 + Math.random() * 3;
    const baseLife = 1.2 + Math.random() * 1.3;

    for (let i = 0; i < count; i++) {
      const p = this.particlePool.acquire();
      const angle = Math.random() * Math.PI * 2;
      const speed = (baseSpeed + Math.random() * 2) * speedScale;
      const life = baseLife * lifeScale;
      p.init({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life,
        size: 2 + Math.random() * 2
      });
    }

    for (const b of this.skyline) {
      const buildingCenterX = b.x + b.w / 2;
      const dist = Math.abs(buildingCenterX - x);
      if (dist < 200) {
        b.glow = Math.min(b.glow + 0.6 * (1 - dist / 200), 1);
      }
    }
  }

  private createCollisionHalo(a: KeyPressRecord, b: KeyPressRecord): void {
    const cx = (a.x + b.x) / 2;
    const cy = (a.y + b.y) / 2;
    this.halos.push(new CollisionHalo(cx, cy, a.color, b.color));
  }

  update(deltaTime: number): void {
    this.particlePool.update(deltaTime, this.config.particleSpeed);

    for (let i = this.halos.length - 1; i >= 0; i--) {
      if (!this.halos[i].update(deltaTime)) {
        this.halos.splice(i, 1);
      }
    }

    for (const b of this.skyline) {
      if (b.glow > 0) {
        b.glow = Math.max(0, b.glow - deltaTime * 20);
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.drawBackground(ctx);
    this.drawSkyline(ctx);
    this.particlePool.draw(ctx);
    for (const halo of this.halos) {
      halo.draw(ctx);
    }
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, this.canvasHeight);
    gradient.addColorStop(0, '#05051a');
    gradient.addColorStop(0.6, '#0a0a2e');
    gradient.addColorStop(1, '#151540');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    for (let i = 0; i < 100; i++) {
      const sx = (i * 97) % this.canvasWidth;
      const sy = (i * 53) % (this.canvasHeight * 0.7);
      const sr = ((i % 3) + 1) * 0.5;
      ctx.globalAlpha = 0.3 + (i % 5) * 0.1;
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawSkyline(ctx: CanvasRenderingContext2D): void {
    const baseY = this.canvasHeight;
    for (const b of this.skyline) {
      const glowAmount = b.glow;
      if (glowAmount > 0) {
        ctx.shadowBlur = 20 * glowAmount;
        ctx.shadowColor = '#9933ff';
      }

      const r = 0x2D + Math.round(glowAmount * 30);
      const g = 0x1B + Math.round(glowAmount * 25);
      const bl = 0x4E + Math.round(glowAmount * 40);
      ctx.fillStyle = `rgb(${r}, ${g}, ${bl})`;
      ctx.fillRect(b.x, baseY - b.h, b.w, b.h);

      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(150, 120, 200, ${0.3 + glowAmount * 0.4})`;
      const windowRows = Math.floor(b.h / 18);
      const windowCols = Math.floor(b.w / 14);
      for (let rIdx = 0; rIdx < windowRows; rIdx++) {
        for (let cIdx = 0; cIdx < windowCols; cIdx++) {
          if ((rIdx + cIdx + b.x) % 3 === 0) {
            ctx.fillRect(
              b.x + 4 + cIdx * 14,
              baseY - b.h + 6 + rIdx * 18,
              6, 9
            );
          }
        }
      }
    }
    ctx.shadowBlur = 0;
  }
}
