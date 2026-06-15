import { DungeonMap } from './map';
import { Player, Direction, DIRECTION } from './player';
import { Renderer } from './render';

type GameState = 'playing' | 'victory' | 'animating';

class Game {
  private map!: DungeonMap;
  private player!: Player;
  private renderer!: Renderer;
  private ctx!: CanvasRenderingContext2D;
  private minimapCtx!: CanvasRenderingContext2D;

  private gameState: GameState = 'playing';
  private keys: Set<string> = new Set();
  private lastFrameTime: number = 0;
  private inputCooldown: number = 0;
  private readonly INPUT_DELAY: number = 120;

  private hudFuelBar!: HTMLElement;
  private hudGemCount!: HTMLElement;
  private hudStepCount!: HTMLElement;
  private victoryOverlay!: HTMLElement;
  private finalSteps!: HTMLElement;
  private finalGems!: HTMLElement;
  private resetBtn!: HTMLElement;

  constructor() {
    this.init();
  }

  private init(): void {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    const minimap = document.getElementById('minimap') as HTMLCanvasElement;

    if (!canvas || !minimap) {
      console.error('Canvas elements not found!');
      return;
    }

    const ctx = canvas.getContext('2d');
    const minimapCtx = minimap.getContext('2d');

    if (!ctx || !minimapCtx) {
      console.error('Failed to get canvas contexts!');
      return;
    }

    this.ctx = ctx;
    this.minimapCtx = minimapCtx;

    this.hudFuelBar = document.getElementById('fuel-bar')!;
    this.hudGemCount = document.getElementById('gem-count')!;
    this.hudStepCount = document.getElementById('step-count')!;
    this.victoryOverlay = document.getElementById('victory-overlay')!;
    this.finalSteps = document.getElementById('final-steps')!;
    this.finalGems = document.getElementById('final-gems')!;
    this.resetBtn = document.getElementById('reset-btn')!;

    this.resetBtn.addEventListener('click', () => this.reset());

    this.setupInput();
    this.reset();
    this.startGameLoop();
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        this.keys.add(key);
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();
      this.keys.delete(key);
    });
  }

  private reset(): void {
    this.map = new DungeonMap();
    this.player = new Player(this.map);
    this.renderer = new Renderer(this.ctx, this.minimapCtx);
    this.gameState = 'playing';
    this.victoryOverlay.classList.remove('active');
    this.inputCooldown = 0;
    this.keys.clear();
    this.updateHUD();
  }

  private startGameLoop(): void {
    const loop = (timestamp: number) => {
      const deltaTime = timestamp - this.lastFrameTime;
      this.lastFrameTime = timestamp;

      if (this.gameState === 'playing') {
        this.update(deltaTime, timestamp);
      }

      this.render(timestamp);
      requestAnimationFrame(loop);
    };

    requestAnimationFrame(loop);
  }

  private update(deltaTime: number, _timestamp: number): void {
    if (this.inputCooldown > 0) {
      this.inputCooldown -= deltaTime;
    }

    if (this.inputCooldown <= 0 && !this.player.isCurrentlyMoving()) {
      const direction = this.getDirectionFromInput();
      if (direction) {
        const started = this.player.startMove(direction, this.map);
        if (started) {
          this.inputCooldown = this.INPUT_DELAY;
        }
      }
    }

    const result = this.player.update(this.map);

    if (result.movedToNewTile) {
      this.updateHUD();
    }

    if (result.reachedExit) {
      this.triggerVictory();
    }
  }

  private getDirectionFromInput(): Direction | null {
    if (this.keys.has('w') || this.keys.has('arrowup')) return DIRECTION.UP;
    if (this.keys.has('s') || this.keys.has('arrowdown')) return DIRECTION.DOWN;
    if (this.keys.has('a') || this.keys.has('arrowleft')) return DIRECTION.LEFT;
    if (this.keys.has('d') || this.keys.has('arrowright')) return DIRECTION.RIGHT;
    return null;
  }

  private render(timestamp: number): void {
    this.renderer.update(timestamp);

    if (this.gameState !== 'animating') {
      this.renderer.render(this.map, this.player);
    }

    this.renderer.drawMinimap(this.map, this.player);
  }

  private updateHUD(): void {
    this.hudFuelBar.style.width = `${this.player.fuel}%`;
    this.hudGemCount.textContent = this.player.gems.toString();
    this.hudStepCount.textContent = this.player.steps.toString();
  }

  private triggerVictory(): void {
    if (this.gameState !== 'playing') return;

    this.gameState = 'animating';

    this.renderer.playVictoryAnimation(this.map, this.player, () => {
      this.finalSteps.textContent = this.player.steps.toString();
      this.finalGems.textContent = this.player.gems.toString();
      this.victoryOverlay.classList.add('active');
      this.gameState = 'victory';
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
