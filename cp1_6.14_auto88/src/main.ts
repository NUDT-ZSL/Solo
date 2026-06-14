import { GravityEngine } from './gravityEngine';
import { FieldRenderer } from './fieldRenderer';
import { UIController } from './uiController';

const MAX_PARTICLES = 200;

class Application {
  private engine: GravityEngine;
  private renderer: FieldRenderer;
  private ui: UIController;
  private lastTime = 0;
  private running = true;

  constructor() {
    this.engine = new GravityEngine();

    const container = document.getElementById('canvas-container');
    if (!container) throw new Error('canvas-container element not found');
    this.renderer = new FieldRenderer(container, this.engine);

    this.ui = new UIController(this.engine);

    this.bindUICallbacks();
    this.setupDefaults();
    this.renderer.updateSources();
    this.ui.refreshSourceList();
  }

  private bindUICallbacks(): void {
    this.renderer.setOnSourceDoubleClick((x, y) => {
      this.ui.showAddSourceModal(x, y);
    });

    this.renderer.setOnSourceChange(() => {
      this.ui.refreshSourceList();
    });

    this.ui.setOnLaunch(() => {
      this.launchParticleFromCorner();
    });

    this.ui.setOnReset(() => {
      this.resetSimulation();
    });

    this.ui.setOnSourceAdded(() => {
      this.renderer.updateSources();
      this.ui.refreshSourceList();
    });
  }

  private setupDefaults(): void {
    this.engine.addSource(-100, 50, 1.0);
    this.engine.addSource(120, -60, 3.0);
  }

  private getParticleStartPosition(): { x: number; y: number } {
    const canvasWidth = this.getCanvasWorldWidth();
    const canvasHeight = this.getCanvasWorldHeight();
    return {
      x: -canvasWidth / 2 + 30,
      y: canvasHeight / 2 - 30
    };
  }

  private getCanvasWorldWidth(): number {
    const container = document.getElementById('canvas-container');
    if (!container) return 800;
    return container.clientWidth;
  }

  private getCanvasWorldHeight(): number {
    const container = document.getElementById('canvas-container');
    if (!container) return 600;
    return container.clientHeight;
  }

  private launchParticleFromCorner(): void {
    const aliveCount = this.engine.getAliveParticleCount();
    if (aliveCount >= MAX_PARTICLES) {
      console.log(`[GravField] 粒子数量已达上限 ${MAX_PARTICLES}，自动移除最早的`);
    }

    const start = this.getParticleStartPosition();
    const sources = this.engine.getSources();

    let tx = 0, ty = 0;
    if (sources.length > 0) {
      for (const s of sources) {
        tx += s.x;
        ty += s.y;
      }
      tx /= sources.length;
      ty /= sources.length;
    } else {
      tx = start.x + 200;
      ty = start.y - 100;
    }

    const dx = tx - start.x;
    const dy = ty - start.y;
    const dist = Math.max(50, Math.hypot(dx, dy));
    const speed = 90;
    const vx = (dx / dist) * speed + (Math.random() - 0.5) * 20;
    const vy = (dy / dist) * speed + (Math.random() - 0.5) * 20;

    this.engine.launchParticle(start.x, start.y, vx, vy);
  }

  private resetSimulation(): void {
    this.engine.reset();
    this.renderer.resetView();
    this.renderer.clearSources();
    this.setupDefaults();
    this.renderer.updateSources();
    this.ui.refreshSourceList();
  }

  private animate = (time: number): void => {
    if (!this.running) return;
    requestAnimationFrame(this.animate);

    if (!this.lastTime) this.lastTime = time;
    let dt = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (dt > 0.05) dt = 0.05;

    this.engine.update(dt);
    this.renderer.updateSources();
    this.renderer.updateParticles();
    this.renderer.render();
  };

  public start(): void {
    requestAnimationFrame(this.animate);
  }

  public stop(): void {
    this.running = false;
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.start();
  (window as unknown as { _gravfield?: Application })._gravfield = app;
});
