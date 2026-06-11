import { MoodResult, blendColors } from './moodEngine';

interface ColorBlob {
  x: number;
  y: number;
  originX: number;
  originY: number;
  radius: number;
  color: string;
  alpha: number;
  vx: number;
  vy: number;
  rotation: number;
  rotationSpeed: number;
  pushOffset: { x: number; y: number };
  pushVelocity: { x: number; y: number };
}

interface ArcLine {
  blob1: ColorBlob;
  blob2: ColorBlob;
  color: string;
  alpha: number;
  targetAlpha: number;
  alphaVelocity: number;
  highlightUntil: number;
}

interface WaveLayer {
  amplitude: number;
  period: number;
  phase: number;
  speed: number;
  y: number;
  color: string;
  alpha: number;
}

interface PulseWave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  startTime: number;
  duration: number;
}

interface MouseState {
  x: number;
  y: number;
  isInCanvas: boolean;
}

interface RendererOptions {
  blobCount: number;
  arcCount: number;
  waveLayerCount: number;
}

const DEFAULT_OPTIONS: RendererOptions = {
  blobCount: 14,
  arcCount: 40,
  waveLayerCount: 3
};

export class ArtRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private blobs: ColorBlob[] = [];
  private arcs: ArcLine[] = [];
  private waves: WaveLayer[] = [];
  private pulses: PulseWave[] = [];
  private mouse: MouseState = { x: -1000, y: -1000, isInCanvas: false };
  private moodResult: MoodResult | null = null;
  private width: number = 0;
  private height: number = 0;
  private animationId: number = 0;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;
  private currentFps: number = 0;
  private fpsElement: HTMLElement | null = null;
  private options: RendererOptions;
  private time: number = 0;

  constructor(canvas: HTMLCanvasElement, fpsElementId?: string) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.options = { ...DEFAULT_OPTIONS };

    if (fpsElementId) {
      this.fpsElement = document.getElementById(fpsElementId);
    }

    this.resize();
    this.bindEvents();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = (e.clientX - rect.left) * (this.width / rect.width);
      this.mouse.y = (e.clientY - rect.top) * (this.height / rect.height);
      this.mouse.isInCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isInCanvas = false;
      this.mouse.x = -1000;
      this.mouse.y = -1000;
    });

    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.width / rect.width);
      const y = (e.clientY - rect.top) * (this.height / rect.height);
      this.createPulse(x, y);
    });

    window.addEventListener('resize', () => {
      this.resize();
      if (this.moodResult) {
        this.regenerate();
      }
    });
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.width = rect.width * dpr;
    this.height = rect.height * dpr;

    this.canvas.width = this.width;
    this.canvas.height = this.height;

    this.ctx.scale(dpr, dpr);
  }

  public setMood(moodResult: MoodResult): void {
    this.moodResult = moodResult;
    this.regenerate();
  }

  private regenerate(): void {
    if (!this.moodResult) return;

    this.generateBlobs();
    this.generateArcs();
    this.generateWaves();
  }

  private generateBlobs(): void {
    if (!this.moodResult) return;

    this.blobs = [];
    const { palette, mood } = this.moodResult;
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const alphaMap: Record<string, [number, number]> = {
      joy: [0.25, 0.45],
      peace: [0.2, 0.4],
      sadness: [0.3, 0.5],
      anxiety: [0.35, 0.55]
    };

    const [minAlpha, maxAlpha] = alphaMap[mood];

    for (let i = 0; i < this.options.blobCount; i++) {
      const radius = 10 + Math.random() * 40;
      const x = radius + Math.random() * (w - radius * 2);
      const y = radius + Math.random() * (h - radius * 2);
      const colorRatio = Math.random();
      const color = blendColors(palette.startColor, palette.endColor, colorRatio);

      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;

      this.blobs.push({
        x,
        y,
        originX: x,
        originY: y,
        radius,
        color,
        alpha: minAlpha + Math.random() * (maxAlpha - minAlpha),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.02,
        pushOffset: { x: 0, y: 0 },
        pushVelocity: { x: 0, y: 0 }
      });
    }
  }

  private generateArcs(): void {
    this.arcs = [];

    if (this.blobs.length < 2) return;

    for (let i = 0; i < this.options.arcCount; i++) {
      const idx1 = Math.floor(Math.random() * this.blobs.length);
      let idx2 = Math.floor(Math.random() * this.blobs.length);
      while (idx2 === idx1 && this.blobs.length > 1) {
        idx2 = Math.floor(Math.random() * this.blobs.length);
      }

      const blob1 = this.blobs[idx1];
      const blob2 = this.blobs[idx2];

      this.arcs.push({
        blob1,
        blob2,
        color: blendColors(blob1.color, blob2.color, 0.5),
        alpha: 0.2 + Math.random() * 0.2,
        targetAlpha: 0.2 + Math.random() * 0.2,
        alphaVelocity: 0,
        highlightUntil: 0
      });
    }
  }

  private generateWaves(): void {
    if (!this.moodResult) return;

    this.waves = [];
    const { palette } = this.moodResult;
    const rect = this.canvas.getBoundingClientRect();
    const h = rect.height;

    for (let i = 0; i < this.options.waveLayerCount; i++) {
      const layerRatio = i / this.options.waveLayerCount;
      this.waves.push({
        amplitude: 8 + Math.random() * 7,
        period: 200 + Math.random() * 200,
        phase: Math.random() * Math.PI * 2,
        speed: 0.005 + Math.random() * 0.01,
        y: h * (0.6 + layerRatio * 0.3),
        color: blendColors(palette.startColor, palette.endColor, layerRatio),
        alpha: 0.2 - layerRatio * 0.05
      });
    }
  }

  private createPulse(x: number, y: number): void {
    this.pulses.push({
      x,
      y,
      radius: 0,
      maxRadius: 200,
      alpha: 0.6,
      startTime: performance.now(),
      duration: 1000
    });
  }

  public start(): void {
    this.lastFpsUpdate = performance.now();
    this.animate();
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private animate = (): void => {
    const now = performance.now();
    this.time += 0.016;

    this.frameCount++;
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;
      if (this.fpsElement) {
        this.fpsElement.textContent = `${this.currentFps} FPS`;
      }
    }

    this.update();
    this.render();

    this.animationId = requestAnimationFrame(this.animate);
  };

  private update(): void {
    this.updateBlobs();
    this.updateArcs();
    this.updateWaves();
    this.updatePulses();
  }

  private updateBlobs(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const mouseBlobs: { blob: ColorBlob; dist: number }[] = [];

    for (let i = 0; i < this.blobs.length; i++) {
      const blob = this.blobs[i];
      blob.rotation += blob.rotationSpeed;

      blob.x += blob.vx;
      blob.y += blob.vy;

      const effectiveLeft = blob.radius;
      const effectiveRight = w - blob.radius;
      const effectiveTop = blob.radius;
      const effectiveBottom = h - blob.radius;

      if (blob.x < effectiveLeft) {
        blob.vx = Math.abs(blob.vx);
        blob.x = effectiveLeft;
      } else if (blob.x > effectiveRight) {
        blob.vx = -Math.abs(blob.vx);
        blob.x = effectiveRight;
      }

      if (blob.y < effectiveTop) {
        blob.vy = Math.abs(blob.vy);
        blob.y = effectiveTop;
      } else if (blob.y > effectiveBottom) {
        blob.vy = -Math.abs(blob.vy);
        blob.y = effectiveBottom;
      }

      if (this.mouse.isInCanvas) {
        const dx = blob.x - this.mouse.x;
        const dy = blob.y - this.mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        mouseBlobs.push({ blob, dist });
      }

      const springStiffness = 0.12;
      const damping = 0.82;
      blob.pushVelocity.x += -blob.pushOffset.x * springStiffness;
      blob.pushVelocity.y += -blob.pushOffset.y * springStiffness;
      blob.pushVelocity.x *= damping;
      blob.pushVelocity.y *= damping;
      blob.pushOffset.x += blob.pushVelocity.x;
      blob.pushOffset.y += blob.pushVelocity.y;

      const drawX = blob.x + blob.pushOffset.x;
      const drawY = blob.y + blob.pushOffset.y;
      if (drawX < blob.radius) {
        blob.pushOffset.x = blob.radius - blob.x;
        blob.pushVelocity.x = Math.abs(blob.pushVelocity.x) * 0.3;
      } else if (drawX > w - blob.radius) {
        blob.pushOffset.x = w - blob.radius - blob.x;
        blob.pushVelocity.x = -Math.abs(blob.pushVelocity.x) * 0.3;
      }
      if (drawY < blob.radius) {
        blob.pushOffset.y = blob.radius - blob.y;
        blob.pushVelocity.y = Math.abs(blob.pushVelocity.y) * 0.3;
      } else if (drawY > h - blob.radius) {
        blob.pushOffset.y = h - blob.radius - blob.y;
        blob.pushVelocity.y = -Math.abs(blob.pushVelocity.y) * 0.3;
      }
    }

    this.resolveBlobCollisions();

    if (this.mouse.isInCanvas) {
      mouseBlobs.sort((a, b) => a.dist - b.dist);
      const closest = mouseBlobs.slice(0, 10);

      for (const { blob, dist } of closest) {
        if (dist < 200 && dist > 0) {
          const normalizedDist = dist / 200;
          const force = Math.pow(1 - normalizedDist, 2) * 35;
          const dx = blob.x - this.mouse.x;
          const dy = blob.y - this.mouse.y;
          const nx = dx / dist;
          const ny = dy / dist;
          blob.pushVelocity.x += nx * force * 0.3;
          blob.pushVelocity.y += ny * force * 0.3;
        }
      }
    }
  }

  private resolveBlobCollisions(): void {
    const blobs = this.blobs;
    const count = blobs.length;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const blobA = blobs[i];
        const blobB = blobs[j];

        const ax = blobA.x + blobA.pushOffset.x;
        const ay = blobA.y + blobA.pushOffset.y;
        const bx = blobB.x + blobB.pushOffset.x;
        const by = blobB.y + blobB.pushOffset.y;

        const dx = bx - ax;
        const dy = by - ay;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const minDist = (blobA.radius + blobB.radius) * 0.6;

        if (dist < minDist && dist > 0) {
          const overlap = minDist - dist;
          const nx = dx / dist;
          const ny = dy / dist;

          const separation = overlap * 0.5;
          blobA.pushOffset.x -= nx * separation;
          blobA.pushOffset.y -= ny * separation;
          blobB.pushOffset.x += nx * separation;
          blobB.pushOffset.y += ny * separation;
        }
      }
    }
  }

  private updateArcs(): void {
    const now = performance.now();

    for (const arc of this.arcs) {
      const midX = (arc.blob1.x + arc.blob2.x) / 2;
      const midY = (arc.blob1.y + arc.blob2.y) / 2;
      const dx = midX - this.mouse.x;
      const dy = midY - this.mouse.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 100 && this.mouse.isInCanvas) {
        arc.highlightUntil = now + 300;
      }

      const targetAlpha = now < arc.highlightUntil ? 0.8 : arc.targetAlpha;
      arc.alpha += (targetAlpha - arc.alpha) * 0.1;
    }
  }

  private updateWaves(): void {
    for (const wave of this.waves) {
      wave.phase += wave.speed;
    }
  }

  private updatePulses(): void {
    const now = performance.now();
    this.pulses = this.pulses.filter(pulse => {
      const elapsed = now - pulse.startTime;
      if (elapsed >= pulse.duration) return false;

      const progress = elapsed / pulse.duration;
      pulse.radius = pulse.maxRadius * (1 - Math.pow(1 - progress, 1.5));
      pulse.alpha = 0.6 * Math.exp(-progress * 3);
      return true;
    });
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.ctx.clearRect(0, 0, w, h);

    this.renderWaves(w, h);
    this.renderArcs();
    this.renderBlobs();
    this.renderPulses();
  }

  private renderWaves(w: number, h: number): void {
    for (const wave of this.waves) {
      this.ctx.beginPath();
      this.ctx.moveTo(0, h);

      for (let x = 0; x <= w; x += 2) {
        const y = wave.y + Math.sin(x / wave.period * Math.PI * 2 + wave.phase) * wave.amplitude
          + Math.sin(x / (wave.period * 0.5) * Math.PI * 2 + wave.phase * 1.5) * wave.amplitude * 0.3;
        this.ctx.lineTo(x, y);
      }

      this.ctx.lineTo(w, h);
      this.ctx.closePath();

      const gradient = this.ctx.createLinearGradient(0, wave.y - wave.amplitude, 0, h);
      gradient.addColorStop(0, this.hexToRgba(wave.color, wave.alpha));
      gradient.addColorStop(1, this.hexToRgba(wave.color, 0));
      this.ctx.fillStyle = gradient;
      this.ctx.fill();
    }
  }

  private renderArcs(): void {
    for (const arc of this.arcs) {
      const x1 = arc.blob1.x + arc.blob1.pushOffset.x;
      const y1 = arc.blob1.y + arc.blob1.pushOffset.y;
      const x2 = arc.blob2.x + arc.blob2.pushOffset.x;
      const y2 = arc.blob2.y + arc.blob2.pushOffset.y;

      const midX = (x1 + x2) / 2;
      const midY = (y1 + y2) / 2;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 10) continue;

      const perpX = -dy / dist;
      const perpY = dx / dist;
      const curveHeight = dist * 0.2;
      const cpX = midX + perpX * curveHeight;
      const cpY = midY + perpY * curveHeight;

      this.ctx.beginPath();
      this.ctx.moveTo(x1, y1);
      this.ctx.quadraticCurveTo(cpX, cpY, x2, y2);
      this.ctx.strokeStyle = this.hexToRgba(arc.color, arc.alpha);
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    }
  }

  private renderBlobs(): void {
    for (const blob of this.blobs) {
      const drawX = blob.x + blob.pushOffset.x;
      const drawY = blob.y + blob.pushOffset.y;

      this.ctx.save();
      this.ctx.translate(drawX, drawY);
      this.ctx.rotate(blob.rotation);

      const gradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, blob.radius);
      gradient.addColorStop(0, this.hexToRgba(blob.color, blob.alpha));
      gradient.addColorStop(0.7, this.hexToRgba(blob.color, blob.alpha * 0.6));
      gradient.addColorStop(1, this.hexToRgba(blob.color, 0));

      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(0, 0, blob.radius, 0, Math.PI * 2);
      this.ctx.fill();

      this.ctx.restore();
    }
  }

  private renderPulses(): void {
    for (const pulse of this.pulses) {
      this.ctx.beginPath();
      this.ctx.arc(pulse.x, pulse.y, pulse.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${pulse.alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return `rgba(255, 255, 255, ${alpha})`;
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
