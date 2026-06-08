import { Game, Direction } from './game';
import { Renderer } from './renderer';
import { InputManager } from './input';

class GameApp {
  private canvas: HTMLCanvasElement;
  private game: Game;
  private renderer: Renderer;
  private scoreDisplay: HTMLElement;
  private lengthDisplay: HTMLElement;
  private gameoverPanel: HTMLElement;
  private highScoreDisplay: HTMLElement;
  private finalScoreDisplay: HTMLElement;
  private restartBtn: HTMLButtonElement;
  private logoAnimation: HTMLElement;
  private lastTime = 0;
  private gameOverShown = false;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;

    this.scoreDisplay = this.getEl('scoreDisplay');
    this.lengthDisplay = this.getEl('lengthDisplay');
    this.gameoverPanel = this.getEl('gameoverPanel');
    this.highScoreDisplay = this.getEl('highScoreDisplay');
    this.finalScoreDisplay = this.getEl('finalScoreDisplay');
    this.restartBtn = document.getElementById('restartBtn') as HTMLButtonElement;
    this.logoAnimation = this.getEl('logoAnimation');

    this.game = new Game();
    this.renderer = new Renderer(this.canvas);
    new InputManager({
      onDirection: (dir: Direction) => this.handleDirection(dir),
      onBlink: () => this.handleBlink()
    });

    this.restartBtn.addEventListener('click', () => this.restart());

    setTimeout(() => {
      this.logoAnimation.classList.add('hidden');
    }, 1500);

    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    requestAnimationFrame(this.loop);
  }

  private getEl(id: string): HTMLElement {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element ${id} not found`);
    return el;
  }

  private handleDirection(dir: Direction): void {
    this.game.setDirection(dir);
  }

  private handleBlink(): void {
    this.game.startBlink();
  }

  private restart(): void {
    this.game.init();
    this.gameoverPanel.classList.remove('active');
    this.gameOverShown = false;
  }

  private updateUI(): void {
    this.scoreDisplay.textContent = `SCORE: ${this.game.score}`;
    this.lengthDisplay.textContent = `LENGTH: ${this.game.snake.length}`;

    if (this.game.gameState === 'gameover' && !this.gameOverShown) {
      const elapsed = performance.now() - this.game.gameOverStartTime;
      if (elapsed > 800) {
        this.gameOverShown = true;
        this.highScoreDisplay.textContent = `HIGH SCORE: ${this.game.getHighScore()}`;
        this.finalScoreDisplay.textContent = `YOUR SCORE: ${this.game.score}`;
        this.gameoverPanel.classList.add('active');
      }
    }
  }

  private loop(now: number): void {
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    this.game.update(deltaTime, now);
    this.renderer.render(this.game, now);
    this.updateUI();

    requestAnimationFrame(this.loop);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new GameApp();
});
