import { Timeline } from './timeline';
import { MovingPlatform, Missile, TimeGate } from './entities';
import { Renderer } from './renderer';

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 600;

class GameApp {
  canvas: HTMLCanvasElement;
  timeline: Timeline;
  renderer: Renderer;
  lastTime: number = 0;
  accumulator: number = 0;
  fixedTimestep: number = 1000 / 60;
  running: boolean = false;
  autoResetTimer: number = 0;
  pendingAutoReset: boolean = false;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;

    this.timeline = new Timeline();
    this.renderer = new Renderer(this.canvas);

    this.initializeEntities();
    this.setupEventListeners();

    this.timeline.onWin = () => {
      this.renderer.triggerWin();
      this.pendingAutoReset = true;
      this.autoResetTimer = 180;
    };

    this.timeline.onLose = () => {
      this.renderer.triggerLose();
      this.pendingAutoReset = true;
      this.autoResetTimer = 120;
    };
  }

  private initializeEntities(): void {
    this.timeline.reset();
    this.renderer.resetState();
    this.pendingAutoReset = false;
    this.autoResetTimer = 0;

    const entities: any[] = [];

    const platform1 = new MovingPlatform('p1', 100, 200, 'horizontal', 50, 350);
    const platform2 = new MovingPlatform('p2', 400, 400, 'horizontal', 350, 600);
    const platform3 = new MovingPlatform('p3', 700, 150, 'vertical', 100, 400);
    entities.push(platform1, platform2, platform3);

    const missile1 = new Missile('m1', 50, 300, 3.5, -3);
    const missile2 = new Missile('m2', 50, 380, 4, -4.5);
    entities.push(missile1, missile2);

    const gate = new TimeGate('gate', 600, 280);
    entities.push(gate);

    this.timeline.setEntities(entities);
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.repeat) return;

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          this.timeline.togglePause();
          break;
        case 'KeyZ':
          e.preventDefault();
          this.timeline.startRewind();
          break;
        case 'KeyX':
          e.preventDefault();
          this.timeline.startFastForward();
          break;
        case 'KeyR':
          e.preventDefault();
          this.initializeEntities();
          break;
      }
    });
  }

  start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.accumulator += deltaTime;

    const maxUpdates = 5;
    let updates = 0;
    while (this.accumulator >= this.fixedTimestep && updates < maxUpdates) {
      this.update();
      this.accumulator -= this.fixedTimestep;
      updates++;
    }

    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private update(): void {
    this.timeline.update();

    if (this.pendingAutoReset) {
      this.autoResetTimer--;
      if (this.autoResetTimer <= 0) {
        this.initializeEntities();
      }
    }
  }

  private render(): void {
    const status = this.timeline.getStatus();
    this.renderer.render(this.timeline.entities, status);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new GameApp();
  app.start();
});
