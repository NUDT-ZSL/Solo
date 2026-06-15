import { Ship } from './ship';
import type { ResourceType } from './ship';
import { FaultSystem } from './fault';
import { Renderer } from './renderer';

const GAME_DURATION = 120;
const SCORE_PER_SECOND = 10;
const SCORE_FAULT_RESOLVED = 50;
const SCORE_FAULT_FAILED = -20;

class Game {
  private ship: Ship;
  private faultSystem: FaultSystem;
  private renderer: Renderer;
  private canvas: HTMLCanvasElement;
  private lastTime: number = 0;
  private currentTime: number = 0;
  private score: number = 0;
  private timeRemaining: number = GAME_DURATION;
  private gameOver: boolean = false;
  private fireworksTriggered: boolean = false;
  private draggingResource: ResourceType | null = null;
  private running: boolean = true;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ship = new Ship();
    this.faultSystem = new FaultSystem();
    this.renderer = new Renderer(canvas);
    this.bindEvents();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.renderer.resize());

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.gameOver) {
        this.restart();
        return;
      }
      const { x, y } = this.getCanvasCoords(e);
      const resource = this.renderer.isPointInSlider(x, y, this.ship.state.allocation);
      if (resource) {
        this.draggingResource = resource;
        this.renderer.triggerShake();
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const { y } = this.getCanvasCoords(e);
      if (this.draggingResource) {
        const value = this.renderer.getValueFromY(this.draggingResource, y);
        this.ship.setAllocation(this.draggingResource, value);
      }
    });

    window.addEventListener('mouseup', () => {
      if (this.draggingResource) {
        this.draggingResource = null;
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (this.gameOver) {
        this.restart();
        return;
      }
      const touch = e.touches[0];
      const { x, y } = this.getCanvasCoords(touch);
      const resource = this.renderer.isPointInSlider(x, y, this.ship.state.allocation);
      if (resource) {
        this.draggingResource = resource;
        this.renderer.triggerShake();
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (this.draggingResource) {
        const touch = e.touches[0];
        const { y } = this.getCanvasCoords(touch);
        const value = this.renderer.getValueFromY(this.draggingResource, y);
        this.ship.setAllocation(this.draggingResource, value);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', () => {
      this.draggingResource = null;
    });
  }

  private getCanvasCoords(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.clientWidth / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.clientHeight / rect.height)
    };
  }

  private restart(): void {
    this.ship = new Ship();
    this.faultSystem = new FaultSystem();
    this.lastTime = 0;
    this.currentTime = 0;
    this.score = 0;
    this.timeRemaining = GAME_DURATION;
    this.gameOver = false;
    this.fireworksTriggered = false;
    this.draggingResource = null;
  }

  private update(dt: number): void {
    if (this.gameOver) return;

    this.currentTime += dt;
    this.timeRemaining -= dt;

    this.score += SCORE_PER_SECOND * dt;

    this.ship.applyAllocation(dt);

    const { resolved, failed } = this.faultSystem.update(dt, this.ship.state.allocation, this.currentTime);

    resolved.forEach(() => {
      this.score += SCORE_FAULT_RESOLVED;
      this.renderer.triggerShake();
    });

    failed.forEach((fault) => {
      this.ship.damageSubsystem(fault.targetSubsystem, 25);
      this.score += SCORE_FAULT_FAILED;
      this.renderer.triggerShake();
    });

    if (this.timeRemaining <= 0 || this.ship.isAllSystemsDead()) {
      this.timeRemaining = Math.max(0, this.timeRemaining);
      this.gameOver = true;
    }

    if (this.gameOver && !this.fireworksTriggered) {
      this.fireworksTriggered = true;
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      this.renderer.spawnFireworks(w / 2, h / 2);
    }
  }

  public start(): void {
    const loop = (timestamp: number) => {
      if (!this.running) return;

      if (this.lastTime === 0) this.lastTime = timestamp;
      const dt = Math.min(0.05, (timestamp - this.lastTime) / 1000);
      this.lastTime = timestamp;

      this.update(dt);

      this.renderer.render(
        this.ship.state,
        this.faultSystem.faults,
        Math.floor(this.score),
        this.timeRemaining,
        this.gameOver,
        this.currentTime,
        dt
      );

      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }
}

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('找不到Canvas元素');
    return;
  }
  const game = new Game(canvas);
  game.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
