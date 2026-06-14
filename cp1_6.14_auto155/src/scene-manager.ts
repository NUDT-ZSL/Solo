import { ParticleSystem } from './particle-system';
import { AsteroidManager } from './asteroid-manager';
import { FleetManager } from './fleet-manager';
import { UIPanel } from './ui-panel';

const COLOR_1 = { r: 0x0a, g: 0x0a, b: 0x2e };
const COLOR_2 = { r: 0x2a, g: 0x0a, b: 0x3a };

export class SceneManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleSystem;
  private asteroids: AsteroidManager;
  private fleet: FleetManager;
  private uiPanel: UIPanel;

  private width = 0;
  private height = 0;
  private time = 0;
  private nebulaPhase = 0;
  private rafId = 0;
  private lastTs = 0;
  private running = false;

  private fpsAccum = 0;
  private fpsFrames = 0;
  private fpsCurrent = 60;
  private fpsLastReport = 0;
  private showFps = true;
  private stressTestMode = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.particles = new ParticleSystem();
    this.asteroids = new AsteroidManager(this.particles);
    this.fleet = new FleetManager(this.particles, this.asteroids);
    this.uiPanel = new UIPanel(this.fleet);

    this.bindEvents();
    this.handleResize();
    this.fleet.spawnInitialFleet(this.width / 2, this.height / 2);
    this.uiPanel.init();
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.handleResize);

    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      const { x, y } = this.toCanvasCoord(e.clientX, e.clientY);
      this.fleet.handleMouseDown(x, y, e.button, e.shiftKey);
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const { x, y } = this.toCanvasCoord(e.clientX, e.clientY);
      this.fleet.handleMouseMove(x, y);
    });

    window.addEventListener('mouseup', (e) => {
      const { x, y } = this.toCanvasCoord(e.clientX, e.clientY);
      this.fleet.handleMouseUp(x, y, e.button);
    });

    let touchStartX = 0, touchStartY = 0, touchStartT = 0, touchLongPress = 0;
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const { x, y } = this.toCanvasCoord(t.clientX, t.clientY);
      touchStartX = x; touchStartY = y; touchStartT = performance.now();
      this.fleet.handleMouseDown(x, y, 0, false);
      touchLongPress = window.setTimeout(() => {
        this.fleet.handleMouseUp(x, y, 0);
        this.fleet.handleMouseDown(x, y, 2, false);
        this.fleet.handleMouseUp(x, y, 2);
      }, 500);
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const t = e.touches[0];
      if (!t) return;
      const { x, y } = this.toCanvasCoord(t.clientX, t.clientY);
      const dx = x - touchStartX, dy = y - touchStartY;
      if (dx * dx + dy * dy > 25 && touchLongPress) {
        clearTimeout(touchLongPress);
        touchLongPress = 0;
      }
      this.fleet.handleMouseMove(x, y);
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      if (touchLongPress) { clearTimeout(touchLongPress); touchLongPress = 0; }
      const t = e.changedTouches[0];
      if (!t) return;
      const dt = performance.now() - touchStartT;
      const { x, y } = this.toCanvasCoord(t.clientX, t.clientY);
      if (dt < 450) {
        this.fleet.handleMouseUp(x, y, 0);
      }
    }, { passive: false });
  }

  private toCanvasCoord(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (clientX - rect.left) * (this.width / rect.width),
      y: (clientY - rect.top) * (this.height / rect.height),
    };
  }

  private handleResize = (): void => {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(rect.width * dpr);
    this.canvas.height = Math.floor(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.particles.setCanvasSize(this.width, this.height);
    this.asteroids.setCanvasSize(this.width, this.height);
    this.fleet.setCanvasSize(this.width, this.height);
  };

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTs = performance.now();
    this.loop(this.lastTs);
  }

  stop(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private loop = (ts: number): void => {
    if (!this.running) return;
    const dt = Math.min(48, ts - this.lastTs);
    this.lastTs = ts;
    this.time += dt;
    this.nebulaPhase += dt * 0.00006;
    this.update(dt);
    this.draw();
    this.rafId = requestAnimationFrame(this.loop);
  };

  private update(dt: number): void {
    const centroid = this.fleet.getFleetCentroid();
    this.asteroids.update(dt, centroid.x, centroid.y);
    this.fleet.update(dt);
    this.particles.update(dt);
    this.uiPanel.update();
  }

  private draw(): void {
    const ctx = this.ctx;
    const t = this.nebulaPhase;
    const mix1 = 0.5 + 0.5 * Math.sin(t * 2.2);
    const mix2 = 0.5 + 0.5 * Math.cos(t * 1.7);
    const r = Math.round(COLOR_1.r + (COLOR_2.r - COLOR_1.r) * mix1);
    const g = Math.round(COLOR_1.g + (COLOR_2.g - COLOR_1.g) * mix2);
    const b = Math.round(COLOR_1.b + (COLOR_2.b - COLOR_1.b) * ((mix1 + mix2) / 2));

    const grad = ctx.createRadialGradient(
      this.width * 0.3, this.height * 0.4, 50,
      this.width * 0.5, this.height * 0.5, Math.max(this.width, this.height) * 0.8
    );
    grad.addColorStop(0, this.rgb(r + 15, g + 8, b + 20));
    grad.addColorStop(0.5, this.rgb(r, g, b));
    grad.addColorStop(1, this.rgb(
      Math.max(0, r - 10),
      Math.max(0, g - 6),
      Math.max(0, b - 8)
    ));
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.width, this.height);

    this.drawNebulaClouds(ctx);
    this.particles.drawBackgroundStars(ctx, this.time);
    this.asteroids.draw(ctx, this.time);
    this.fleet.draw(ctx, this.time);
    this.particles.drawForeground(ctx);
  }

  private drawNebulaClouds(ctx: CanvasRenderingContext2D): void {
    const t = this.time * 0.00005;
    const blobs = 4;
    for (let i = 0; i < blobs; i++) {
      const phase = t + i * 1.7;
      const cx = this.width * (0.3 + 0.4 * ((0.5 + 0.5 * Math.sin(phase * 1.3 + i))));
      const cy = this.height * (0.3 + 0.5 * ((0.5 + 0.5 * Math.cos(phase * 0.9 + i * 1.3))));
      const r = Math.max(this.width, this.height) * (0.25 + 0.08 * Math.sin(phase * 2 + i * 0.7));
      const hueShift = i % 2 === 0 ? 0 : 40;
      const cloud = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
      cloud.addColorStop(0, `rgba(${120 + hueShift}, ${40 + i * 8}, ${180 - i * 10}, 0.22)`);
      cloud.addColorStop(0.5, `rgba(${80 + hueShift}, ${30 + i * 5}, ${140 - i * 8}, 0.08)`);
      cloud.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = cloud;
      ctx.fillRect(0, 0, this.width, this.height);
    }
  }

  private rgb(r: number, g: number, b: number): string {
    return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
  }

  getFleetManager(): FleetManager {
    return this.fleet;
  }
}
