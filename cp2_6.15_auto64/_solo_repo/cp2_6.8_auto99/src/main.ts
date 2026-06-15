import { Maze, MAZE_SIZE, CELL_SIZE } from './maze';
import { Player, PlayerEvent } from './player';
import { UI } from './ui';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const MINIMAP_SIZE = 120;
const MINIMAP_MARGIN = 20;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private maze: Maze;
  private player: Player;
  private ui: UI;
  private keys: Set<string>;
  private lastTime: number;
  private elapsedTime: number;
  private mazeOffsetX: number;
  private mazeOffsetY: number;
  private running: boolean;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;

    this.keys = new Set();
    this.lastTime = 0;
    this.elapsedTime = 0;
    this.running = true;

    this.maze = new Maze();
    this.player = new Player(this.maze);
    this.ui = new UI();

    const mazePixelWidth = MAZE_SIZE * CELL_SIZE;
    const mazePixelHeight = MAZE_SIZE * CELL_SIZE;
    this.mazeOffsetX = (CANVAS_WIDTH - mazePixelWidth) / 2;
    this.mazeOffsetY = (CANVAS_HEIGHT - mazePixelHeight) / 2;

    this.player.onEvent = (event: PlayerEvent) => this.handlePlayerEvent(event);

    this.setupEventListeners();
    this.gameLoop = this.gameLoop.bind(this);
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      this.keys.add(e.code);

      if (this.ui.isGameOver() && e.code === 'Space') {
        this.restart();
      }

      if (this.ui.isWin() && this.ui.getWinProgress() >= 1 && e.code === 'KeyR') {
        this.restart();
      }

      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'Space',
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD'
        ].includes(e.code)
      ) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      this.keys.delete(e.code);
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;

      const minimapX = CANVAS_WIDTH - MINIMAP_SIZE - MINIMAP_MARGIN;
      const minimapY = MINIMAP_MARGIN + 30;
      const scale = this.ui.getMinimapScale();
      const effectiveSize = MINIMAP_SIZE * scale;

      const isOver =
        mx >= minimapX &&
        mx <= minimapX + effectiveSize &&
        my >= minimapY &&
        my <= minimapY + effectiveSize;

      this.ui.setMinimapHover(isOver);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.ui.setMinimapHover(false);
    });
  }

  private handlePlayerEvent(event: PlayerEvent): void {
    switch (event) {
      case 'trap':
        this.ui.triggerTrap();
        break;
      case 'death':
        this.ui.triggerDeath();
        break;
      case 'exit':
        this.ui.triggerWin(this.elapsedTime);
        break;
    }
  }

  private restart(): void {
    this.maze = new Maze();
    this.player.maze = this.maze;
    this.player.reset();
    this.ui.reset();
    this.elapsedTime = 0;
    this.player.onEvent = (event: PlayerEvent) => this.handlePlayerEvent(event);
  }

  private update(deltaTime: number): void {
    if (!this.ui.isGameOver() && !this.ui.isWin()) {
      this.elapsedTime += deltaTime;
    }

    this.maze.update(deltaTime);
    this.player.update(deltaTime);
    this.ui.update(deltaTime);

    if (!this.ui.isGameOver() && !this.ui.isWin()) {
      this.player.handleInput(this.keys);
    }
  }

  private render(): void {
    const ctx = this.ctx;
    const screenShake = this.ui.getScreenShake();

    ctx.save();

    const winProgress = this.ui.getWinProgress();
    if (winProgress > 0) {
      const r = Math.floor(26 * (1 - winProgress) + 236 * winProgress);
      const g = Math.floor(32 * (1 - winProgress) + 201 * winProgress);
      const b = Math.floor(44 * (1 - winProgress) + 75 * winProgress);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    } else {
      ctx.fillStyle = '#0a0a0a';
    }
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.translate(screenShake.x, screenShake.y);

    this.maze.render(ctx, this.mazeOffsetX, this.mazeOffsetY);
    this.player.render(ctx, this.mazeOffsetX, this.mazeOffsetY);

    ctx.restore();

    this.ui.renderHealth(ctx, this.player, 20, 20);
    this.ui.renderTimer(ctx, this.elapsedTime, CANVAS_WIDTH - 20, 20);

    const minimapX = CANVAS_WIDTH - MINIMAP_SIZE - MINIMAP_MARGIN;
    const minimapY = MINIMAP_MARGIN + 30;
    const minimapScale = this.ui.getMinimapScale();
    this.maze.renderMinimap(
      ctx,
      minimapX,
      minimapY,
      MINIMAP_SIZE,
      this.player.x,
      this.player.y,
      minimapScale
    );

    this.ui.renderTrapMessage(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ui.renderGameOver(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ui.renderWinOverlay(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private gameLoop(currentTime: number): void {
    if (!this.running) return;

    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }

    let deltaTime = (currentTime - this.lastTime) / 1000;
    if (deltaTime > 0.1) deltaTime = 0.1;
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame(this.gameLoop);
  }

  public start(): void {
    this.running = true;
    requestAnimationFrame(this.gameLoop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
