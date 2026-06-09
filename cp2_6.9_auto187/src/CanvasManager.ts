import { FragmentEngine, Fragment } from './FragmentEngine';
import { ArtGenerator } from './ArtGenerator';
// ArtGenerator is used via this.artGenerator

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private artGenerator: ArtGenerator;
  private fragmentEngine: FragmentEngine | null = null;
  private lastTime: number = 0;
  private animationId: number = 0;
  private running: boolean = false;
  private gameState: 'idle' | 'scattered' | 'reassembled' = 'idle';
  private draggingFragment: Fragment | null = null;
  private lastMousePos: { x: number; y: number } = { x: 0, y: 0 };
  private flashAlpha: number = 0;
  private onStateChange?: (collected: number, total: number) => void;
  private onReassembled?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2d context');
    this.ctx = ctx;
    this.artGenerator = new ArtGenerator(800, 600);
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.bindEvents();
  }

  setOnStateChange(callback: (collected: number, total: number) => void): void {
    this.onStateChange = callback;
  }

  setOnReassembled(callback: () => void): void {
    this.onReassembled = callback;
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (this.fragmentEngine) {
      this.fragmentEngine.setCanvasSize(this.width, this.height);
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  private onMouseDown(e: MouseEvent): void {
    if (this.gameState !== 'scattered' || !this.fragmentEngine) return;
    const pos = this.getMousePos(e);
    this.lastMousePos = pos;
    const fragment = this.fragmentEngine.getFragmentAt(pos.x, pos.y);
    if (fragment) {
      this.draggingFragment = fragment;
      fragment.dragging = true;
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.draggingFragment || !this.fragmentEngine) return;
    const pos = this.getMousePos(e);
    const dx = pos.x - this.lastMousePos.x;
    const dy = pos.y - this.lastMousePos.y;
    this.draggingFragment.position.x = pos.x;
    this.draggingFragment.position.y = pos.y;
    if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
      this.draggingFragment.rotation = Math.atan2(dy, dx);
    }
    this.lastMousePos = pos;
  }

  private onMouseUp(_e: MouseEvent): void {
    if (!this.draggingFragment || !this.fragmentEngine) return;
    this.draggingFragment.dragging = false;
    if (this.draggingFragment.position.y > this.fragmentEngine.getCollectionZoneY()) {
      this.fragmentEngine.collect(this.draggingFragment);
    } else {
      this.draggingFragment.startPosition = { ...this.draggingFragment.position };
      this.draggingFragment.targetPosition = { ...this.draggingFragment.position };
      this.draggingFragment.animationProgress = 1;
      this.draggingFragment.animationType = 'none';
    }
    this.draggingFragment = null;
  }

  generateNewArt(): void {
    this.stop();
    this.flashAlpha = 0;
    const source = this.artGenerator.generate();
    this.fragmentEngine = new FragmentEngine(source, this.width, this.height);
    this.fragmentEngine.setOnCollect((c, t) => {
      if (this.onStateChange) this.onStateChange(c, t);
    });
    this.fragmentEngine.setOnReassembleComplete(() => {
      this.gameState = 'reassembled';
      this.flashAlpha = 1;
      if (this.onReassembled) this.onReassembled();
    });
    const count = 80 + Math.floor(Math.random() * 41);
    this.fragmentEngine.generateFragments(count);
    const total = this.fragmentEngine.getTotalCount();
    this.gameState = 'idle';
    if (this.onStateChange) this.onStateChange(0, total);
    this.start();
  }

  startScattering(): void {
    if (!this.fragmentEngine || this.gameState !== 'idle') return;
    this.fragmentEngine.scatter();
    this.gameState = 'scattered';
  }

  regenerate(): void {
    this.generateNewArt();
    this.startScattering();
  }

  collectAllForTesting(): void {
    if (this.fragmentEngine && this.gameState === 'scattered') {
      this.fragmentEngine.collectAllForTesting();
    }
  }

  getState(): 'idle' | 'scattered' | 'reassembled' { return this.gameState; }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }

  private loop(): void {
    if (!this.running) return;
    const now = performance.now();
    const delta = Math.min(33, now - this.lastTime);
    this.lastTime = now;
    this.update(delta);
    this.render(now);
    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(deltaTime: number): void {
    if (this.fragmentEngine) {
      this.fragmentEngine.update(deltaTime);
    }
    if (this.flashAlpha > 0) {
      this.flashAlpha -= deltaTime / 200;
      if (this.flashAlpha < 0) this.flashAlpha = 0;
    }
  }

  private render(time: number): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);
    this.drawBackground();
    if (this.fragmentEngine) {
      this.fragmentEngine.renderCollectionZone(ctx, time);
      if (this.gameState === 'idle') {
        this.drawOriginalImage();
      } else {
        this.fragmentEngine.render(ctx, time);
      }
    }
    if (this.flashAlpha > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${this.flashAlpha})`;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, this.height);
    gradient.addColorStop(0, '#0A0A2E');
    gradient.addColorStop(1, '#1A1A3E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawOriginalImage(): void {
    if (!this.fragmentEngine) return;
    const ctx = this.ctx;
    const source = this.fragmentEngine.getSourceCanvas();
    const x = (this.width - source.width) / 2;
    const y = (this.height - source.height) / 2;
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 30;
    ctx.drawImage(source, x, y);
    ctx.restore();
  }
}
