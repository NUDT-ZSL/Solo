import { ParticleSystem, BrushMode } from './particles';
import { Renderer } from './renderer';

interface MouseState {
  isDown: boolean;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
  speed: number;
  lastSpeed: number;
  acceleration: number;
  direction: number;
  lastSpawnX: number;
  lastSpawnY: number;
  distanceSinceSpawn: number;
}

class InkApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private renderer: Renderer;
  private mouseState: MouseState;
  private animationId: number | null = null;
  private lastFrameTime: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private currentFps: number = 60;
  private particlesPerFrame: number = 10;
  private drawingStarted: boolean = false;

  private particleCountEl: HTMLElement | null = null;
  private fpsEl: HTMLElement | null = null;
  private btnClear: HTMLButtonElement | null = null;
  private btnSave: HTMLButtonElement | null = null;
  private btnUndo: HTMLButtonElement | null = null;
  private btnMode: HTMLButtonElement | null = null;

  constructor() {
    this.canvas = document.getElementById('inkCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('Canvas element not found');
    }

    this.setupCanvasSize();
    this.ctx = this.canvas.getContext('2d')!;
    this.particleSystem = new ParticleSystem();
    this.renderer = new Renderer(this.ctx, this.canvas.width, this.canvas.height);

    this.mouseState = {
      isDown: false,
      x: 0,
      y: 0,
      lastX: 0,
      lastY: 0,
      speed: 0,
      lastSpeed: 0,
      acceleration: 0,
      direction: 0,
      lastSpawnX: 0,
      lastSpawnY: 0,
      distanceSinceSpawn: 0
    };

    this.bindElements();
    this.bindEvents();
    this.renderer.clear();
  }

  private bindElements(): void {
    this.particleCountEl = document.getElementById('particleCount');
    this.fpsEl = document.getElementById('fps');
    this.btnClear = document.getElementById('btnClear') as HTMLButtonElement;
    this.btnSave = document.getElementById('btnSave') as HTMLButtonElement;
    this.btnUndo = document.getElementById('btnUndo') as HTMLButtonElement;
    this.btnMode = document.getElementById('btnMode') as HTMLButtonElement;
  }

  private setupCanvasSize(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const isMobile = window.innerWidth < 768;
    const dpr = window.devicePixelRatio || 1;

    const cssWidth = rect.width;
    const cssHeight = isMobile ? window.innerHeight * 0.6 : 600;

    this.canvas.style.width = cssWidth + 'px';
    this.canvas.style.height = cssHeight + 'px';
    this.canvas.width = Math.floor(cssWidth * dpr);
    this.canvas.height = Math.floor(cssHeight * dpr);

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.onTouchEnd.bind(this));
    this.canvas.addEventListener('touchcancel', this.onTouchEnd.bind(this));

    window.addEventListener('resize', this.onResize.bind(this));

    if (this.btnClear) {
      this.btnClear.addEventListener('click', this.onClear.bind(this));
    }
    if (this.btnSave) {
      this.btnSave.addEventListener('click', this.onSave.bind(this));
    }
    if (this.btnUndo) {
      this.btnUndo.addEventListener('click', this.onUndo.bind(this));
    }
    if (this.btnMode) {
      this.btnMode.addEventListener('click', this.onToggleMode.bind(this));
    }

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        this.onUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        this.onSave();
      }
    });
  }

  private onResize(): void {
    this.setupCanvasSize();

    const container = this.canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      const isMobile = window.innerWidth < 768;
      const cssWidth = rect.width;
      const cssHeight = isMobile ? window.innerHeight * 0.6 : 600;
      this.renderer.resize(cssWidth, cssHeight);
    }
    this.renderer.clear();
  }

  private onMouseDown(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.startDrawing(coords.x, coords.y);
  }

  private onMouseMove(e: MouseEvent): void {
    const coords = this.getCanvasCoords(e.clientX, e.clientY);
    this.updatePosition(coords.x, coords.y);
  }

  private onMouseUp(): void {
    this.stopDrawing();
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
    this.startDrawing(coords.x, coords.y);
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const touch = e.touches[0];
    const coords = this.getCanvasCoords(touch.clientX, touch.clientY);
    this.updatePosition(coords.x, coords.y);
  }

  private onTouchEnd(): void {
    this.stopDrawing();
  }

  private startDrawing(x: number, y: number): void {
    this.mouseState.isDown = true;
    this.mouseState.x = x;
    this.mouseState.y = y;
    this.mouseState.lastX = x;
    this.mouseState.lastY = y;
    this.mouseState.lastSpawnX = x;
    this.mouseState.lastSpawnY = y;
    this.mouseState.speed = 0;
    this.mouseState.lastSpeed = 0;
    this.mouseState.acceleration = 0;
    this.mouseState.direction = 0;
    this.mouseState.distanceSinceSpawn = 0;
    this.drawingStarted = false;
    this.particleSystem.saveState();
  }

  private updatePosition(x: number, y: number): void {
    const dx = x - this.mouseState.lastX;
    const dy = y - this.mouseState.lastY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.mouseState.direction = Math.atan2(dy, dx);
    this.mouseState.speed = dist;
    this.mouseState.acceleration = Math.abs(this.mouseState.speed - this.mouseState.lastSpeed);
    this.mouseState.lastSpeed = this.mouseState.speed;

    this.mouseState.lastX = this.mouseState.x;
    this.mouseState.lastY = this.mouseState.y;
    this.mouseState.x = x;
    this.mouseState.y = y;

    if (this.mouseState.isDown) {
      this.spawnAlongPath(x, y);

      if (this.mouseState.speed > 6) {
        const splashCount = Math.min(Math.floor(this.mouseState.speed / 3), 5);
        this.particleSystem.spawnSplashParticles(
          this.mouseState.lastX,
          this.mouseState.lastY,
          this.mouseState.direction + Math.PI,
          splashCount
        );
      }
    }
  }

  private spawnAlongPath(targetX: number, targetY: number): void {
    const dx = targetX - this.mouseState.lastSpawnX;
    const dy = targetY - this.mouseState.lastSpawnY;
    const totalDist = Math.sqrt(dx * dx + dy * dy);

    this.mouseState.distanceSinceSpawn += totalDist;

    const minSpacing = Math.max(2, this.mouseState.speed * 0.3);
    const spacing = this.mouseState.speed < 1 ? 2 : minSpacing;

    let spawnedThisFrame = 0;
    const maxPerFrame = this.particlesPerFrame * 2;

    while (this.mouseState.distanceSinceSpawn >= spacing && spawnedThisFrame < maxPerFrame) {
      const ratio = this.mouseState.distanceSinceSpawn / (totalDist > 0 ? totalDist : 1);
      const spawnX = this.mouseState.lastSpawnX + dx * ratio;
      const spawnY = this.mouseState.lastSpawnY + dy * ratio;

      this.doSpawn(spawnX, spawnY);

      this.mouseState.lastSpawnX = spawnX;
      this.mouseState.lastSpawnY = spawnY;
      this.mouseState.distanceSinceSpawn -= spacing;
      spawnedThisFrame++;
    }

    if (!this.drawingStarted && spawnedThisFrame === 0) {
      this.doSpawn(targetX, targetY);
      this.mouseState.lastSpawnX = targetX;
      this.mouseState.lastSpawnY = targetY;
      this.drawingStarted = true;
    }
  }

  private doSpawn(x: number, y: number): void {
    const normalizedAccel = Math.min(this.mouseState.acceleration / 8, 1);
    const pressureMultiplier = 1.0 + normalizedAccel;

    this.particleSystem.spawnParticles(
      x,
      y,
      this.particlesPerFrame,
      pressureMultiplier,
      this.mouseState.direction
    );
  }

  private stopDrawing(): void {
    if (this.mouseState.isDown) {
      this.mouseState.isDown = false;
    }
  }

  private onClear(): void {
    this.particleSystem.clear();
  }

  private onSave(): void {
    const dataUrl = this.renderer.exportPNG();
    const link = document.createElement('a');
    const date = new Date();
    const fileName = `墨韵流光_${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}.png`;
    link.download = fileName;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  private onUndo(): void {
    this.particleSystem.undo();
  }

  private onToggleMode(): void {
    const newMode = this.particleSystem.toggleMode();
    this.updateModeButton(newMode);
  }

  private updateModeButton(mode: BrushMode): void {
    if (!this.btnMode) return;
    if (mode === 'ink') {
      this.btnMode.textContent = '墨 韵';
      this.btnMode.classList.add('active');
    } else {
      this.btnMode.textContent = '彩 墨';
      this.btnMode.classList.add('active');
    }
  }

  start(): void {
    this.lastFrameTime = performance.now();
    this.fpsUpdateTime = this.lastFrameTime;
    this.loop();
  }

  private loop(): void {
    const now = performance.now();
    this.lastFrameTime = now;

    this.frameCount++;
    if (now - this.fpsUpdateTime >= 500) {
      this.currentFps = Math.round((this.frameCount * 1000) / (now - this.fpsUpdateTime));
      this.frameCount = 0;
      this.fpsUpdateTime = now;
      this.updateInfoPanel();
    }

    if (this.mouseState.isDown && this.mouseState.speed < 0.5) {
      this.mouseState.acceleration *= 0.9;
    }

    this.particleSystem.update();
    this.renderer.draw(this.particleSystem.getParticles());

    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }

  private updateInfoPanel(): void {
    if (this.particleCountEl) {
      this.particleCountEl.textContent = String(this.particleSystem.getCount());
    }
    if (this.fpsEl) {
      this.fpsEl.textContent = String(this.currentFps);
    }
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  try {
    const app = new InkApp();
    app.start();
  } catch (err) {
    console.error('Failed to initialize InkApp:', err);
  }
});
