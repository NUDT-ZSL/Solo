import { Dungeon } from './dungeon';
import { Player } from './player';

type GameState = 'playing' | 'gameover' | 'victory-flash' | 'victory';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private dungeon: Dungeon;
  private player: Player;
  private input: { up: boolean; down: boolean; left: boolean; right: boolean };
  private frameCount: number;
  private gameState: GameState;
  private victoryTimer: number;
  private startTime: number;
  private elapsedTime: number;
  private heartsEl: HTMLElement;
  private keysEl: HTMLElement;
  private timerEl: HTMLElement;
  private warningEl: HTMLElement;
  private overlayEl: HTMLElement;
  private overlayTitleEl: HTMLElement;
  private overlayStatsEl: HTMLElement;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    this.ctx.imageSmoothingEnabled = false;

    this.heartsEl = document.getElementById('hearts')!;
    this.keysEl = document.getElementById('keys')!;
    this.timerEl = document.getElementById('timer')!;
    this.warningEl = document.getElementById('warning')!;
    this.overlayEl = document.getElementById('overlay')!;
    this.overlayTitleEl = document.getElementById('overlay-title')!;
    this.overlayStatsEl = document.getElementById('overlay-stats')!;

    this.dungeon = new Dungeon();
    this.player = new Player(this.dungeon.playerStart.x, this.dungeon.playerStart.y);
    this.input = { up: false, down: false, left: false, right: false };
    this.frameCount = 0;
    this.gameState = 'playing';
    this.victoryTimer = 0;
    this.startTime = Date.now();
    this.elapsedTime = 0;

    this.setupInput();
    this.hideOverlay();
    this.updateHUD();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.input.up = true;
          break;
        case 's':
        case 'arrowdown':
          this.input.down = true;
          break;
        case 'a':
        case 'arrowleft':
          this.input.left = true;
          break;
        case 'd':
        case 'arrowright':
          this.input.right = true;
          break;
        case 'r':
          if (this.gameState === 'gameover' || this.gameState === 'victory') {
            this.restart();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          this.input.up = false;
          break;
        case 's':
        case 'arrowdown':
          this.input.down = false;
          break;
        case 'a':
        case 'arrowleft':
          this.input.left = false;
          break;
        case 'd':
        case 'arrowright':
          this.input.right = false;
          break;
      }
    });
  }

  public restart(): void {
    this.dungeon.generate();
    this.player.reset(this.dungeon.playerStart.x, this.dungeon.playerStart.y);
    this.frameCount = 0;
    this.gameState = 'playing';
    this.victoryTimer = 0;
    this.startTime = Date.now();
    this.elapsedTime = 0;
    this.hideOverlay();
    this.updateHUD();
  }

  private hideOverlay(): void {
    this.overlayEl.classList.remove('active', 'gameover', 'victory-flash', 'victory');
  }

  private showGameOver(): void {
    this.overlayEl.classList.add('active', 'gameover');
    this.overlayTitleEl.textContent = 'GAME OVER';
    this.overlayStatsEl.innerHTML = `存活时间: ${this.formatTime(this.elapsedTime)}<br>收集钥匙: ${this.player.keysCollected}/3`;
  }

  private showVictoryFlash(): void {
    this.overlayEl.classList.add('active', 'victory-flash');
    this.overlayTitleEl.textContent = '';
    this.overlayStatsEl.textContent = '';
  }

  private showVictory(): void {
    this.overlayEl.classList.remove('victory-flash');
    this.overlayEl.classList.add('active', 'victory');
    this.overlayTitleEl.textContent = 'ESCAPED!';
    this.overlayStatsEl.innerHTML = `用时: ${this.formatTime(this.elapsedTime)}<br>收集钥匙: ${this.player.keysCollected}/3`;
  }

  private formatTime(ms: number): string {
    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  }

  private updateHUD(): void {
    const numHearts = Math.ceil(this.player.health / 2);
    const maxHearts = Math.ceil(this.player.maxHealth / 2);
    let heartsStr = '';
    for (let i = 0; i < numHearts; i++) {
      heartsStr += '\u2665';
    }
    for (let i = numHearts; i < maxHearts; i++) {
      heartsStr += '\u2661';
    }
    this.heartsEl.textContent = heartsStr;

    this.keysEl.textContent = `钥匙: ${this.player.keysCollected}/3`;

    if (this.gameState === 'playing') {
      this.elapsedTime = Date.now() - this.startTime;
    }
    this.timerEl.textContent = this.formatTime(this.elapsedTime);
  }

  public update(): void {
    this.frameCount++;

    if (this.gameState === 'playing') {
      const { warning } = this.dungeon.update(this.frameCount, this.player.x, this.player.y);
      this.player.update(this.input, this.dungeon);

      if (warning) {
        this.warningEl.classList.add('visible');
      } else {
        this.warningEl.classList.remove('visible');
      }

      if (this.player.isDead()) {
        this.gameState = 'gameover';
        this.elapsedTime = Date.now() - this.startTime;
        this.showGameOver();
      } else if (this.player.isAtExit(this.dungeon)) {
        this.gameState = 'victory-flash';
        this.victoryTimer = 0;
        this.elapsedTime = Date.now() - this.startTime;
        this.showVictoryFlash();
      }

      this.updateHUD();
    } else if (this.gameState === 'victory-flash') {
      this.victoryTimer++;
      if (this.victoryTimer >= 60) {
        this.gameState = 'victory';
        this.showVictory();
      }
    }
  }

  public render(): void {
    this.ctx.fillStyle = '#2D3748';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.dungeon.render(this.ctx);
    this.player.render(this.ctx);
  }

  public loop(): void {
    this.update();
    this.render();
    requestAnimationFrame(() => this.loop());
  }

  public start(): void {
    this.loop();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
