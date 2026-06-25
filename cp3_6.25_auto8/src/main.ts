import { GameEngine } from './game-engine';
import { UIRenderer } from './ui-renderer';

class Game {
  private engine: GameEngine;
  private renderer: UIRenderer;
  private lastTime: number;
  private animationFrameId: number | null;

  constructor() {
    this.engine = new GameEngine();
    this.renderer = new UIRenderer(this.engine);
    this.lastTime = 0;
    this.animationFrameId = null;

    this.engine.addLog('info', '欢迎来到像素地牢！');
    this.engine.addLog('info', '使用 WASD 或方向键移动');
    this.engine.addLog('info', '找到黄色楼梯进入下一层');
  }

  public start(): void {
    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);
  }

  private gameLoop(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    this.engine.updateAnimations(deltaTime);
    this.renderer.render(this.engine.getState());

    this.animationFrameId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  public stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }
}

const game = new Game();
game.start();
