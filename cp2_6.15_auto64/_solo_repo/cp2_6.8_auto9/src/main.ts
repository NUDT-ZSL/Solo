import { DungeonMap, GameMap } from './map';
import { Player } from './player';
import { Renderer } from './render';

const MAP_WIDTH = 25;
const MAP_HEIGHT = 20;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private map: DungeonMap;
  private player: Player;
  private lastTime: number;
  private accumulator: number;
  private running: boolean;
  private animationFrameId: number | null;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvas;
    this.renderer = new Renderer(canvas, MAP_WIDTH, MAP_HEIGHT);
    this.map = new DungeonMap(MAP_WIDTH, MAP_HEIGHT);
    const tileSize = this.renderer.getTileSize();
    const startPos = this.map.getRandomFloorPosition();
    this.player = new Player(startPos.x, startPos.y, tileSize);
    this.lastTime = 0;
    this.accumulator = 0;
    this.running = false;
    this.animationFrameId = null;
    this.setupInput();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      if (!this.running) return;
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.player.move(0, -1, this.map);
          break;
        case 's':
        case 'arrowdown':
          this.player.move(0, 1, this.map);
          break;
        case 'a':
        case 'arrowleft':
          this.player.move(-1, 0, this.map);
          break;
        case 'd':
        case 'arrowright':
          this.player.move(1, 0, this.map);
          break;
      }
    });
  }

  private regenerateMap(): void {
    const coinCount = this.player.getState().coinCount;
    this.map = new DungeonMap(MAP_WIDTH, MAP_HEIGHT);
    const tileSize = this.renderer.getTileSize();
    const startPos = this.map.getRandomFloorPosition();
    this.player = new Player(startPos.x, startPos.y, tileSize, coinCount);
  }

  private checkPortalTransition(): void {
    if (this.player.checkPortal(this.map)) {
      this.regenerateMap();
    }
  }

  private update(deltaTime: number): void {
    this.player.update(deltaTime, this.map);
    if (!this.player.getState().isMoving) {
      this.checkPortalTransition();
    }
  }

  private render(): void {
    const mapData: GameMap = this.map.getData();
    const playerState = this.player.getState();
    this.renderer.renderAll(mapData, playerState);
  }

  private gameLoop(timestamp: number): void {
    if (!this.running) return;

    if (this.lastTime === 0) {
      this.lastTime = timestamp;
    }

    const frameTime = timestamp - this.lastTime;
    this.lastTime = timestamp;
    this.accumulator += frameTime;

    while (this.accumulator >= FRAME_TIME) {
      this.update(FRAME_TIME / 1000);
      this.accumulator -= FRAME_TIME;
    }

    this.render();
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  public start(): void {
    this.running = true;
    this.lastTime = 0;
    this.accumulator = 0;
    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  public stop(): void {
    this.running = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const game = new Game();
    game.start();
  } catch (error) {
    console.error('Failed to start game:', error);
  }
});
