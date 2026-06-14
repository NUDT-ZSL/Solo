import type { PhysicsState } from './PhysicsEngine';
import type { OpponentState } from './NetworkManager';
import { TRACK_CONFIG } from './PhysicsEngine';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  alpha: number;
}

interface SkidMark {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  life: number;
  maxLife: number;
  alpha: number;
}

interface VisualEffect {
  type: 'flash' | 'shake' | 'tilt' | 'blur';
  startTime: number;
  duration: number;
  intensity: number;
  data?: any;
}

const MINIMAP_SIZE = 150;
const MINIMAP_SCALE = 0.25;
const BASE_WIDTH = 800;
const BASE_HEIGHT = 600;

export class GameRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;

  private particles: Particle[] = [];
  private skidMarks: SkidMark[] = [];
  private effects: VisualEffect[] = [];
  private opponents: OpponentState[] = [];

  private noiseCanvas: HTMLCanvasElement;
  private lastSkidPosition: { x: number; y: number; angle: number } | null = null;
  private lastMinimapUpdate: number = 0;
  private particleSpawnTimer: number = 0;
  private spawnsPerSecond: number = 10;
  private totalParticlesPerSecond: number = 20;
  private fps: number = 60;
  private frameCount: number = 0;
  private fpsTimer: number = 0;
  private shakeOffsetX: number = 0;
  private shakeOffsetY: number = 0;
  private tiltOffset: number = 0;
  private flashAlpha: number = 0;
  private blurIntensity: number = 0;
  private continuousBlurIntensity: number = 0;
  private scale: number = 1;
  private offsetX: number = 0;
  private offsetY: number = 0;
  private isBraking: boolean = false;
  private lastBrakeTime: number = 0;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private blurCanvas: HTMLCanvasElement;
  private blurCtx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.noiseCanvas = this.createNoiseTexture();
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCtx = this.offscreenCanvas.getContext('2d')!;
    this.blurCanvas = document.createElement('canvas');
    this.blurCtx = this.blurCanvas.getContext('2d')!;
    this.resize();
  }

  setMinimapCanvas(canvas: HTMLCanvasElement): void {
    this.minimapCanvas = canvas;
    this.minimapCtx = canvas.getContext('2d');
  }

  resize(): void {
    const parent = this.canvas.parentElement;
    if (!parent) return;

    const parentW = parent.clientWidth;
    const parentH = parent.clientHeight;

    this.scale = Math.min(parentW / BASE_WIDTH, parentH / BASE_HEIGHT);
    const newWidth = BASE_WIDTH * this.scale;
    const newHeight = BASE_HEIGHT * this.scale;

    this.offsetX = (parentW - newWidth) / 2;
    this.offsetY = (parentH - newHeight) / 2;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = BASE_WIDTH * dpr;
    this.canvas.height = BASE_HEIGHT * dpr;
    this.canvas.style.width = `${newWidth}px`;
    this.canvas.style.height = `${newHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    this.offscreenCanvas.width = BASE_WIDTH;
    this.offscreenCanvas.height = BASE_HEIGHT;
    this.blurCanvas.width = BASE_WIDTH;
    this.blurCanvas.height = BASE_HEIGHT;
  }

  private createNoiseTexture(): HTMLCanvasElement {
    const size = 256;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const imgData = ctx.createImageData(size, size);

    for (let i = 0; i < imgData.data.length; i += 4) {
      const val = Math.random() * 40 + 20;
      imgData.data[i] = val;
      imgData.data[i + 1] = val;
      imgData.data[i + 2] = val;
      imgData.data[i + 3] = 60;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  setOpponents(opponents: OpponentState[]): void {
    this.opponents = opponents;
  }

  triggerEffect(effect: Omit<VisualEffect, 'startTime'>): void {
    this.effects.push({
      ...effect,
      startTime: performance.now(),
    });
  }

  update(deltaTime: number, state: PhysicsState): void {
    this.frameCount++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1000) {
      this.fps = (this.frameCount * 1000) / this.fpsTimer;
      this.frameCount = 0;
      this.fpsTimer = 0;

      if (this.fps < 50) {
        this.totalParticlesPerSecond = Math.max(10, this.totalParticlesPerSecond - 2);
      } else if (this.fps > 55 && this.totalParticlesPerSecond < 20) {
        this.totalParticlesPerSecond = Math.min(20, this.totalParticlesPerSecond + 2);
      }
      this.spawnsPerSecond = this.totalParticlesPerSecond / 2;
    }

    this.updateParticles(deltaTime);
    this.updateSkidMarks(deltaTime);
    this.updateEffects(deltaTime, state);
    this.updateSkidTrail(state);

    if (state.isDrifting) {
      this.particleSpawnTimer += deltaTime;
      const spawnInterval = 1000 / this.spawnsPerSecond;
      while (this.particleSpawnTimer >= spawnInterval) {
        this.particleSpawnTimer -= spawnInterval;
        this.spawnDriftParticles(state);
      }
    } else {
      this.particleSpawnTimer = 0;
    }

    const now = performance.now();
    if (now - this.lastMinimapUpdate >= 100) {
      this.lastMinimapUpdate = now;
      this.renderMinimap(state);
    }
  }

  private updateParticles(deltaTime: number): void {
    const dt = deltaTime / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= deltaTime;
      p.alpha = Math.max(0, p.life / p.maxLife);
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private updateSkidMarks(deltaTime: number): void {
    for (let i = this.skidMarks.length - 1; i >= 0; i--) {
      const s = this.skidMarks[i];
      s.life -= deltaTime;
      s.alpha = Math.max(0, s.life / s.maxLife) * 0.5;
      if (s.life <= 0) {
        this.skidMarks.splice(i, 1);
      }
    }
  }

  private updateEffects(deltaTime: number, state: PhysicsState): void {
    const now = performance.now();

    this.shakeOffsetX = 0;
    this.shakeOffsetY = 0;
    this.tiltOffset = 0;
    this.flashAlpha = 0;
    this.blurIntensity = 0;

    const targetBlur = Math.min(1, state.speed / 80) * 8;
    this.continuousBlurIntensity += (targetBlur - this.continuousBlurIntensity) * 0.1;

    for (let i = this.effects.length - 1; i >= 0; i--) {
      const e = this.effects[i];
      const elapsed = now - e.startTime;
      const t = Math.min(1, elapsed / e.duration);
      const eased = this.easeOutCubic(t);

      switch (e.type) {
        case 'flash':
          if (t < 0.3) {
            this.flashAlpha = 0.3;
          } else {
            this.flashAlpha = 0.3 * (1 - (t - 0.3) / 0.7);
          }
          break;
        case 'shake':
          if (elapsed < e.duration) {
            this.shakeOffsetX = (Math.random() - 0.5) * e.intensity * 2 * (1 - eased);
            this.shakeOffsetY = (Math.random() - 0.5) * e.intensity * 2 * (1 - eased);
          }
          break;
        case 'tilt':
          this.tiltOffset = 20 * (1 - eased);
          break;
        case 'blur':
          this.blurIntensity = e.intensity * 8 * (1 - eased);
          break;
      }

      if (t >= 1) {
        this.effects.splice(i, 1);
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private updateSkidTrail(state: PhysicsState): void {
    if (Math.abs(state.speed) < 5) {
      this.lastSkidPosition = null;
      return;
    }

    const shouldLeaveMark = state.isDrifting || Math.abs(state.lateralSpeed) > 0.3;
    if (!shouldLeaveMark) {
      this.lastSkidPosition = null;
      return;
    }

    const rearOffset = 10;
    const rearX = state.x - Math.cos(state.angle) * rearOffset;
    const rearY = state.y - Math.sin(state.angle) * rearOffset;

    if (this.lastSkidPosition) {
      this.skidMarks.push({
        x1: this.lastSkidPosition.x,
        y1: this.lastSkidPosition.y,
        x2: rearX,
        y2: rearY,
        life: 2000,
        maxLife: 2000,
        alpha: 0.5,
      });
    }

    this.lastSkidPosition = { x: rearX, y: rearY, angle: state.angle };
  }

  private spawnDriftParticles(state: PhysicsState): void {
    const rearOffset = 10;
    const spread = 4;
    const baseX = state.x - Math.cos(state.angle) * rearOffset;
    const baseY = state.y - Math.sin(state.angle) * rearOffset;

    for (let side = -1; side <= 1; side += 2) {
      const px = baseX + Math.sin(state.angle) * spread * side;
      const py = baseY - Math.cos(state.angle) * spread * side;

      const backwardAngle = state.angle + Math.PI + (Math.random() - 0.5) * 0.5;
      const speed = 5 + Math.random() * 10;

      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(backwardAngle) * speed - state.speedX * 0.2,
        vy: Math.sin(backwardAngle) * speed - state.speedY * 0.2,
        life: 500,
        maxLife: 500,
        size: 2 + Math.random() * 2,
        alpha: 1,
      });
    }
  }

  render(state: PhysicsState): void {
    const ctx = this.ctx;
    const offCtx = this.offscreenCtx;

    offCtx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    offCtx.save();
    offCtx.translate(this.shakeOffsetX, this.shakeOffsetY - this.tiltOffset * 0.5);

    this.drawSky(offCtx);
    this.drawTrack(offCtx);
    this.drawSkidMarks(offCtx);
    this.drawStartLine(offCtx);
    this.drawOpponents(offCtx);
    this.drawCar(offCtx, state, '#FF4444', true);
    this.drawParticles(offCtx);
    this.drawHUD(offCtx, state);

    offCtx.restore();

    ctx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.drawImage(this.offscreenCanvas, 0, 0);

    const totalBlur = this.continuousBlurIntensity + this.blurIntensity;
    if (totalBlur > 0.5) {
      this.drawRadialBlur(ctx, totalBlur);
    }

    if (this.flashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    }
  }

  private drawRadialBlur(ctx: CanvasRenderingContext2D, intensity: number): void {
    const centerX = BASE_WIDTH / 2;
    const centerY = BASE_HEIGHT / 2;
    const maxRadius = Math.max(BASE_WIDTH, BASE_HEIGHT) * 0.6;

    const blurCtx = this.blurCtx;
    blurCtx.clearRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    const layers = Math.min(6, Math.max(2, Math.floor(intensity / 1.5)));
    const stepSize = intensity / layers / 2;

    for (let i = 1; i <= layers; i++) {
      const scale = 1 + (stepSize * i) / 50;
      const alpha = (1 - i / layers) * 0.12 * (intensity / 8);

      blurCtx.save();
      blurCtx.globalAlpha = alpha;
      blurCtx.translate(centerX, centerY);
      blurCtx.scale(scale, scale);
      blurCtx.translate(-centerX, -centerY);
      blurCtx.drawImage(this.offscreenCanvas, 0, 0);
      blurCtx.restore();
    }

    blurCtx.save();
    blurCtx.globalCompositeOperation = 'destination-in';
    const gradient = blurCtx.createRadialGradient(
      centerX, centerY, maxRadius * 0.15,
      centerX, centerY, maxRadius
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.3)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 1)');
    blurCtx.fillStyle = gradient;
    blurCtx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    blurCtx.restore();

    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.blurCanvas, 0, 0);
    ctx.restore();
  }

  private drawSky(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createLinearGradient(0, 0, 0, BASE_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);

    ctx.fillStyle = '#0d2137';
    ctx.beginPath();
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.outerRadiusX + 50,
      TRACK_CONFIG.outerRadiusY + 40,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    const grassGradient = ctx.createRadialGradient(
      TRACK_CONFIG.centerX, TRACK_CONFIG.centerY, TRACK_CONFIG.innerRadiusX * 0.8,
      TRACK_CONFIG.centerX, TRACK_CONFIG.centerY, TRACK_CONFIG.outerRadiusX + 60
    );
    grassGradient.addColorStop(0, '#1a4d1a');
    grassGradient.addColorStop(0.5, '#1e5a2a');
    grassGradient.addColorStop(1, '#0d330d');
    ctx.fillStyle = grassGradient;
    ctx.beginPath();
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.outerRadiusX + 45,
      TRACK_CONFIG.outerRadiusY + 35,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
  }

  private drawTrack(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    ctx.beginPath();
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.outerRadiusX,
      TRACK_CONFIG.outerRadiusY,
      0,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = '#333333';
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.innerRadiusX,
      TRACK_CONFIG.innerRadiusY,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.beginPath();
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.outerRadiusX - 1,
      TRACK_CONFIG.outerRadiusY - 1,
      0,
      0,
      Math.PI * 2
    );
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.innerRadiusX + 1,
      TRACK_CONFIG.innerRadiusY + 1,
      0,
      0,
      Math.PI * 2,
      true
    );
    ctx.clip('evenodd');

    ctx.globalAlpha = 0.15;
    const pattern = ctx.createPattern(this.noiseCanvas, 'repeat')!;
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.globalAlpha = 1;
    ctx.restore();

    this.drawCurb(ctx, TRACK_CONFIG.outerRadiusX, TRACK_CONFIG.outerRadiusY, true);
    this.drawCurb(ctx, TRACK_CONFIG.innerRadiusX, TRACK_CONFIG.innerRadiusY, false);

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.outerRadiusX - 6,
      TRACK_CONFIG.outerRadiusY - 6,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.innerRadiusX + 6,
      TRACK_CONFIG.innerRadiusY + 6,
      0,
      0,
      Math.PI * 2
    );
    ctx.stroke();
    ctx.globalAlpha = 1;

    ctx.restore();
  }

  private drawCurb(
    ctx: CanvasRenderingContext2D,
    rx: number,
    ry: number,
    isOuter: boolean
  ): void {
    const segments = 64;
    const curbWidth = 8;
    const patternLength = 8;

    for (let i = 0; i < segments; i++) {
      const t1 = (i / segments) * Math.PI * 2;
      const t2 = ((i + 1) / segments) * Math.PI * 2;

      const isRed = Math.floor(i / (segments / patternLength / 2)) % 2 === 0;
      ctx.fillStyle = isRed ? '#CC3333' : '#FFFFFF';

      const offset = isOuter ? -curbWidth : 0;
      const rx1 = rx + offset;
      const ry1 = ry + offset;
      const rx2 = isOuter ? rx : rx + curbWidth;
      const ry2 = isOuter ? ry : ry + curbWidth;

      ctx.beginPath();
      ctx.ellipse(
        TRACK_CONFIG.centerX,
        TRACK_CONFIG.centerY,
        Math.max(rx1, 5),
        Math.max(ry1, 5),
        0,
        t1,
        t2
      );
      ctx.ellipse(
        TRACK_CONFIG.centerX,
        TRACK_CONFIG.centerY,
        rx2,
        ry2,
        0,
        t2,
        t1,
        true
      );
      ctx.closePath();
      ctx.fill();
    }
  }

  private drawStartLine(ctx: CanvasRenderingContext2D): void {
    const lineX1 = TRACK_CONFIG.centerX - 8;
    const lineX2 = TRACK_CONFIG.centerX + 8;
    const yTop = TRACK_CONFIG.centerY - TRACK_CONFIG.outerRadiusY + 8;
    const yBottom = TRACK_CONFIG.centerY - TRACK_CONFIG.innerRadiusY - 8;

    const segments = 10;
    const segHeight = (yBottom - yTop) / segments;

    for (let i = 0; i < segments; i++) {
      const isWhite = i % 2 === 0;
      ctx.fillStyle = isWhite ? '#FFFFFF' : '#333333';
      ctx.fillRect(lineX1, yTop + i * segHeight, lineX2 - lineX1, segHeight);
    }
  }

  private drawSkidMarks(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = 3;

    for (const mark of this.skidMarks) {
      ctx.strokeStyle = `rgba(0, 0, 0, ${mark.alpha})`;
      ctx.beginPath();
      ctx.moveTo(mark.x1, mark.y1);
      ctx.lineTo(mark.x2, mark.y2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const p of this.particles) {
      ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.7})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawCar(
    ctx: CanvasRenderingContext2D,
    state: PhysicsState,
    color: string,
    isPlayer: boolean,
    hasLagOutline?: boolean
  ): void {
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.rotate(state.angle + state.driftAngle * 0.3);

    if (hasLagOutline) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
      ctx.lineWidth = 2;
      this.drawCarShape(ctx);
      ctx.stroke();
    }

    const gradient = ctx.createLinearGradient(-12, 0, 12, 0);
    gradient.addColorStop(0, this.darkenColor(color, 0.4));
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, this.darkenColor(color, 0.4));
    ctx.fillStyle = gradient;

    this.drawCarShape(ctx);
    ctx.fill();

    ctx.strokeStyle = this.darkenColor(color, 0.6);
    ctx.lineWidth = 1;
    this.drawCarShape(ctx);
    ctx.stroke();

    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.moveTo(14, -2);
    ctx.lineTo(18, 0);
    ctx.lineTo(14, 2);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  private drawCarShape(ctx: CanvasRenderingContext2D): void {
    ctx.beginPath();
    ctx.moveTo(14, 0);
    ctx.lineTo(-10, -9);
    ctx.lineTo(-7, 0);
    ctx.lineTo(-10, 9);
    ctx.closePath();
  }

  private darkenColor(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const dr = Math.floor(r * (1 - factor));
    const dg = Math.floor(g * (1 - factor));
    const db = Math.floor(b * (1 - factor));
    return `rgb(${dr}, ${dg}, ${db})`;
  }

  private drawOpponents(ctx: CanvasRenderingContext2D): void {
    for (const opp of this.opponents) {
      const hasLag = !opp.isLocal && Date.now() - opp.lastUpdate > 100;
      this.drawCar(ctx, opp, opp.color, false, hasLag);
    }
  }

  private drawHUD(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    ctx.save();

    const speedKmh = Math.round(state.speed * 3.6);
    this.drawGlassPanel(ctx, 12, 12, 180, 72);

    ctx.font = 'bold 24px Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#000000';
    ctx.shadowBlur = 2;
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;
    ctx.fillText(`${speedKmh}`, 24, 42);
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    ctx.font = '14px Arial, sans-serif';
    ctx.fillStyle = '#CCCCCC';
    ctx.fillText('km/h', 24 + ctx.measureText(`${speedKmh}`).width + 8, 42);

    ctx.font = 'bold 16px Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(`Lap ${state.lap}/${state.totalLaps}`, 24, 68);

    this.drawGlassPanel(ctx, BASE_WIDTH - 200, 12, 188, 72);

    ctx.font = '16px Arial, sans-serif';
    ctx.fillStyle = '#FFD700';
    const bestTimeText = state.bestLapTime
      ? `Best: ${this.formatTime(state.bestLapTime)}`
      : 'Best: --:--.--';
    ctx.fillText(bestTimeText, BASE_WIDTH - 190, 38);

    ctx.fillStyle = '#FFFFFF';
    const totalText = `Total: ${this.formatTime(state.totalTime)}`;
    ctx.fillText(totalText, BASE_WIDTH - 190, 62);

    if (this.opponents.length > 0) {
      this.drawPositionPanel(ctx, state);
    }

    ctx.restore();
  }

  private drawPositionPanel(ctx: CanvasRenderingContext2D, state: PhysicsState): void {
    const allDrivers = [
      { id: 'player', lap: state.lap, time: state.totalTime, name: 'You', color: '#FF4444' },
      ...this.opponents.map((o) => ({
        id: o.id,
        lap: o.lap,
        time: o.totalTime || 0,
        name: o.name,
        color: o.color,
      })),
    ].sort((a, b) => {
      if (b.lap !== a.lap) return b.lap - a.lap;
      return a.time - b.time;
    });

    const panelH = 30 + allDrivers.length * 22;
    this.drawGlassPanel(ctx, 12, 96, 200, panelH);

    ctx.font = 'bold 14px Arial, sans-serif';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('Positions', 24, 118);

    ctx.font = '12px Arial, sans-serif';
    allDrivers.forEach((d, i) => {
      const y = 138 + i * 22;
      ctx.fillStyle = d.color;
      ctx.fillRect(24, y - 10, 12, 12);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`${i + 1}. ${d.name} (Lap ${d.lap})`, 44, y);
    });
  }

  private drawGlassPanel(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number
  ): void {
    ctx.save();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    this.roundRect(ctx, x, y, w, h, 12);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  private formatTime(ms: number): string {
    const totalSec = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSec / 60);
    const seconds = totalSec % 60;
    const milliseconds = Math.floor((ms % 1000) / 10);
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(milliseconds).padStart(2, '0')}`;
  }

  private drawVignette(ctx: CanvasRenderingContext2D, intensity: number): void {
    ctx.save();
    const gradient = ctx.createRadialGradient(
      BASE_WIDTH / 2, BASE_HEIGHT / 2, 100,
      BASE_WIDTH / 2, BASE_HEIGHT / 2, Math.max(BASE_WIDTH, BASE_HEIGHT) * 0.7
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, `rgba(0, 0, 0, ${Math.min(0.6, intensity / 15)})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, BASE_WIDTH, BASE_HEIGHT);
    ctx.restore();
  }

  renderMinimap(state: PhysicsState): void {
    if (!this.minimapCanvas || !this.minimapCtx) return;
    const ctx = this.minimapCtx;
    const w = MINIMAP_SIZE;
    const h = MINIMAP_SIZE;
    const mapScale = MINIMAP_SCALE;
    const mapOffsetX = w / 2 - TRACK_CONFIG.centerX * mapScale;
    const mapOffsetY = h / 2 - TRACK_CONFIG.centerY * mapScale;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5;
    this.roundRect(ctx, 0, 0, w, h, 12);
    ctx.fill();
    ctx.stroke();

    ctx.save();
    ctx.beginPath();
    this.roundRect(ctx, 0, 0, w, h, 12);
    ctx.clip();

    ctx.translate(mapOffsetX, mapOffsetY);

    ctx.fillStyle = '#444444';
    ctx.beginPath();
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.outerRadiusX * mapScale,
      TRACK_CONFIG.outerRadiusY * mapScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.globalCompositeOperation = 'destination-out';
    ctx.beginPath();
    ctx.ellipse(
      TRACK_CONFIG.centerX,
      TRACK_CONFIG.centerY,
      TRACK_CONFIG.innerRadiusX * mapScale,
      TRACK_CONFIG.innerRadiusY * mapScale,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    for (const opp of this.opponents) {
      ctx.fillStyle = opp.color;
      ctx.beginPath();
      ctx.arc(opp.x * mapScale, opp.y * mapScale, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.save();
    ctx.fillStyle = '#00bfff';
    ctx.shadowColor = '#00bfff';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(state.x * mapScale, state.y * mapScale, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.restore();

    ctx.restore();
  }

  checkCollisions(state: PhysicsState, onCollision: (otherX: number, otherY: number) => void): void {
    const playerRadius = 12;
    for (const opp of this.opponents) {
      const dx = state.x - opp.x;
      const dy = state.y - opp.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < playerRadius * 2) {
        onCollision(opp.x, opp.y);
      }
    }
  }

  clearEffects(): void {
    this.effects = [];
    this.particles = [];
    this.skidMarks = [];
  }
}
