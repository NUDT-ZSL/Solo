import { NebulaEngine } from './nebula-engine';
import { ShipController } from './ship-controller';
import { ParticleField } from './particle-field';
import { UIPanel } from './ui-panel';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private nebulaEngine: NebulaEngine;
  private ship: ShipController;
  private particleField: ParticleField;
  private uiPanel: UIPanel;

  private lastTime: number = 0;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;

    this.resize();

    this.nebulaEngine = new NebulaEngine(this.width, this.height);
    this.ship = new ShipController(this.width, this.height);
    this.particleField = new ParticleField(this.width, this.height);
    this.uiPanel = new UIPanel();

    this.ship.setupInput();
    window.addEventListener('resize', () => this.resize());
  }

  private resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.nebulaEngine) this.nebulaEngine.resize(this.width, this.height);
    if (this.ship) this.ship.resize(this.width, this.height);
    if (this.particleField) this.particleField.resize(this.width, this.height);
  }

  private update(deltaTime: number): void {
    this.nebulaEngine.update(deltaTime);
    this.ship.update(deltaTime);

    const shipState = this.ship.getState();
    const engineParticleCount = this.ship.getParticleCount();
    this.particleField.perturb(shipState, engineParticleCount);
    this.particleField.update(deltaTime);

    const fieldDensity = this.particleField.getLocalDensity(shipState.x, shipState.y);
    const nebulaDensity = this.nebulaEngine.getLocalDensity(shipState.x, shipState.y);
    const combinedDensity = (fieldDensity * 0.6 + nebulaDensity * 0.4);

    this.uiPanel.update({
      x: shipState.x,
      y: shipState.y,
      speed: this.ship.getMappedSpeed(),
      density: combinedDensity
    });
  }

  private render(): void {
    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(0, 0, this.width, this.height);

    const vignetteGradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, Math.min(this.width, this.height) * 0.3,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) * 0.8
    );
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.7)');

    this.nebulaEngine.render(this.ctx);
    this.particleField.render(this.ctx);
    this.ship.render(this.ctx);

    this.ctx.fillStyle = vignetteGradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private loop = (timestamp: number): void => {
    if (this.lastTime === 0) this.lastTime = timestamp;
    let deltaTime = (timestamp - this.lastTime) / 1000;
    this.lastTime = timestamp;

    deltaTime = Math.min(deltaTime, 0.05);

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    this.animationId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

const game = new Game();
game.start();
