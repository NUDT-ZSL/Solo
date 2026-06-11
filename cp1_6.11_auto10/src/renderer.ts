export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  offsetX: number;
  offsetY: number;
  angularVelocity?: number;
  angle?: number;
}

export interface PixelData {
  pixels: Uint8ClampedArray;
  width: number;
  height: number;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: Particle[] = [];
  private baseWidth: number;
  private baseHeight: number;
  private scale: number = 1;
  private drawCallCount: number = 0;
  private imageDataCache: Map<string, ImageData> = new Map();

  constructor(canvas: HTMLCanvasElement, baseWidth: number, baseHeight: number) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.baseWidth = baseWidth;
    this.baseHeight = baseHeight;
    this.ctx.imageSmoothingEnabled = false;
    this.setupScaling();
    window.addEventListener('resize', () => this.setupScaling());
  }

  private setupScaling(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const scaleX = containerRect.width / this.baseWidth;
    const scaleY = containerRect.height / this.baseHeight;
    this.scale = Math.min(scaleX, scaleY, 1);

    const cssWidth = Math.floor(this.baseWidth * this.scale);
    const cssHeight = Math.floor(this.baseHeight * this.scale);

    this.canvas.style.width = cssWidth + 'px';
    this.canvas.style.height = cssHeight + 'px';

    this.canvas.width = this.baseWidth;
    this.canvas.height = this.baseHeight;
    this.ctx.imageSmoothingEnabled = false;
  }

  getScale(): number {
    return this.scale;
  }

  clear(color: string = '#1B2838'): void {
    this.drawCallCount = 0;
    this.ctx.fillStyle = color;
    this.ctx.fillRect(0, 0, this.baseWidth, this.baseHeight);
    this.drawCallCount++;
  }

  drawPixel(x: number, y: number, color: string, size: number = 1): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), size, size);
    this.drawCallCount++;
  }

  drawRect(x: number, y: number, w: number, h: number, color: string): void {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(Math.floor(x), Math.floor(y), w, h);
    this.drawCallCount++;
  }

  drawOutlineRect(x: number, y: number, w: number, h: number, color: string, thickness: number = 1): void {
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = thickness;
    this.ctx.strokeRect(Math.floor(x), Math.floor(y), w, h);
    this.drawCallCount++;
  }

  drawPixelMatrix(
    matrix: (string | null)[][],
    x: number,
    y: number,
    pixelSize: number = 1
  ): void {
    const cacheKey = `matrix_${matrix.length}x${matrix[0]?.length || 0}_${pixelSize}`;
    let imageData = this.imageDataCache.get(cacheKey);

    if (!imageData) {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = matrix[0].length * pixelSize;
      offCanvas.height = matrix.length * pixelSize;
      const offCtx = offCanvas.getContext('2d')!;

      for (let row = 0; row < matrix.length; row++) {
        for (let col = 0; col < matrix[row].length; col++) {
          const color = matrix[row][col];
          if (color) {
            offCtx.fillStyle = color;
            offCtx.fillRect(col * pixelSize, row * pixelSize, pixelSize, pixelSize);
          }
        }
      }

      imageData = offCtx.getImageData(0, 0, offCanvas.width, offCanvas.height);
      this.imageDataCache.set(cacheKey, imageData);
    }

    const targetCanvas = document.createElement('canvas');
    targetCanvas.width = imageData.width;
    targetCanvas.height = imageData.height;
    const targetCtx = targetCanvas.getContext('2d')!;
    targetCtx.putImageData(imageData, 0, 0);

    this.ctx.drawImage(targetCanvas, Math.floor(x), Math.floor(y));
    this.drawCallCount++;
  }

  spawnParticles(
    x: number,
    y: number,
    count: number,
    colors: string[],
    options: Partial<Particle> = {}
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      const maxLife = options.maxLife ?? (0.5 + Math.random() * 0.5);

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2,
        offsetX: (Math.random() - 0.5) * 2,
        offsetY: (Math.random() - 0.5) * 2,
        angularVelocity: options.angularVelocity,
        angle: options.angle,
        ...options,
      });
    }
  }

  spawnBurstParticles(
    x: number,
    y: number,
    count: number,
    colors: string[]
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 5;
      const maxLife = 1 + Math.random() * 0.5;

      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: maxLife,
        maxLife,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.floor(Math.random() * 3),
        offsetX: 0,
        offsetY: 0,
      });
    }
  }

  spawnSwirlParticles(
    x: number,
    y: number,
    count: number,
    colors: string[],
    duration: number = 2
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 20 + Math.random() * 60;
      const spiralTightness = 0.5 + Math.random() * 0.5;

      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: -Math.sin(angle) * spiralTightness,
        vy: Math.cos(angle) * spiralTightness,
        life: duration,
        maxLife: duration,
        color: colors[i % colors.length],
        size: 2 + Math.floor(Math.random() * 3),
        offsetX: (Math.random() - 0.5) * 4,
        offsetY: (Math.random() - 0.5) * 4,
        angularVelocity: 2 + Math.random() * 3,
        angle,
      });
    }
  }

  updateParticles(deltaTime: number): void {
    const startTime = performance.now();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.angularVelocity !== undefined && p.angle !== undefined) {
        p.angle += p.angularVelocity * deltaTime;
        const radius = Math.sqrt(
          Math.pow(p.x - p.x + p.vx * 10, 2) + Math.pow(p.y - p.y + p.vy * 10, 2)
        );
        const centerX = p.x - p.vx * 10;
        const centerY = p.y - p.vy * 10;
        p.x = centerX + Math.cos(p.angle) * (20 + p.life * 30);
        p.y = centerY + Math.sin(p.angle) * (20 + p.life * 30);
      } else {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.05;
      }

      if (performance.now() - startTime > 0.1 * this.particles.length) {
        break;
      }
    }
  }

  drawParticles(): void {
    if (this.particles.length === 0) return;

    for (const p of this.particles) {
      const alpha = Math.max(0, p.life / p.maxLife);
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(
        Math.floor(p.x + p.offsetX),
        Math.floor(p.y + p.offsetY),
        p.size,
        p.size
      );
    }
    this.ctx.globalAlpha = 1;
    this.drawCallCount++;
  }

  drawText(
    text: string,
    x: number,
    y: number,
    color: string = '#F5D442',
    fontSize: number = 12
  ): void {
    this.ctx.font = `${fontSize}px "Press Start 2P", monospace`;
    this.ctx.fillStyle = color;
    this.ctx.fillText(text, x, y);
    this.drawCallCount++;
  }

  getDrawCallCount(): number {
    return this.drawCallCount;
  }

  toScreenCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) / this.scale,
      y: (clientY - rect.top) / this.scale,
    };
  }

  getBaseDimensions(): { width: number; height: number } {
    return { width: this.baseWidth, height: this.baseHeight };
  }

  getParticleCount(): number {
    return this.particles.length;
  }

  clearParticles(): void {
    this.particles = [];
  }
}
