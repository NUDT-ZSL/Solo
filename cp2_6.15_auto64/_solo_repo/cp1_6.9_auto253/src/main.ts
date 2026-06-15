import { ParticleSystem } from './particles';
import { WordManager } from './words';

const BASE_WIDTH = 1600;
const BASE_HEIGHT = 900;

class Application {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles!: ParticleSystem;
  private words!: WordManager;
  private width = BASE_WIDTH;
  private height = BASE_HEIGHT;
  private dpr = 1;
  private lastTime = 0;
  private running = true;

  constructor() {
    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;

    this.init();
    this.bindEvents();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  private init(): void {
    this.resize();
    this.particles = new ParticleSystem(this.width, this.height);
    this.words = new WordManager(this.width, this.height);
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cssWidth = window.innerWidth;
    const cssHeight = window.innerHeight;

    this.canvas.width = Math.floor(cssWidth * this.dpr);
    this.canvas.height = Math.floor(cssHeight * this.dpr);

    this.width = BASE_WIDTH;
    this.height = BASE_HEIGHT;

    if (this.particles) {
      this.particles.resize(this.width, this.height);
    }
    if (this.words) {
      this.words.resize(this.width, this.height);
    }
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const relX = (clientX - rect.left) / rect.width;
    const relY = (clientY - rect.top) / rect.height;
    return {
      x: relX * this.width,
      y: relY * this.height
    };
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
      this.words.handlePointerDown(x, y);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
      this.words.handlePointerMove(x, y);
    });

    window.addEventListener('mouseup', () => {
      this.words.handlePointerUp();
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        const { x, y } = this.getCanvasCoords(touch.clientX, touch.clientY);
        this.words.handlePointerDown(x, y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        const { x, y } = this.getCanvasCoords(touch.clientX, touch.clientY);
        this.words.handlePointerMove(x, y);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      this.words.handlePointerUp();
    }, { passive: false });

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (key === 'f') {
        this.words.clearAll();
      } else if (key === 'c') {
        this.words.generatePreset();
      }
    });
  }

  private loop(time: number): void {
    if (!this.running) return;

    if (this.lastTime === 0) this.lastTime = time;
    const elapsed = time - this.lastTime;
    this.lastTime = time;
    const dt = Math.min(elapsed / 1000, 0.05);

    const cssW = this.canvas.width / this.dpr;
    const cssH = this.canvas.height / this.dpr;
    const scaleX = cssW / BASE_WIDTH;
    const scaleY = cssH / BASE_HEIGHT;
    const scale = Math.min(scaleX, scaleY);
    const offsetX = (cssW - BASE_WIDTH * scale) / 2;
    const offsetY = (cssH - BASE_HEIGHT * scale) / 2;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.clearRect(0, 0, cssW, cssH);

    const bgGrad = this.ctx.createLinearGradient(0, 0, 0, cssH);
    bgGrad.addColorStop(0, '#0a0a2e');
    bgGrad.addColorStop(1, '#1a0a2e');
    this.ctx.fillStyle = bgGrad;
    this.ctx.fillRect(0, 0, cssW, cssH);

    this.ctx.save();
    this.ctx.translate(offsetX, offsetY);
    this.ctx.scale(scale, scale);

    this.particles.update();
    this.particles.render(this.ctx);
    this.words.update(dt);
    this.words.render(this.ctx);

    this.ctx.restore();

    requestAnimationFrame(this.loop);
  }
}

new Application();
