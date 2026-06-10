import { GameState } from './gameState';
import { Renderer } from './renderer';

class Game {
  private gameState: GameState;
  private renderer: Renderer;
  private lastTime: number;
  private animationId: number;
  private isRunning: boolean;
  private fps: number;
  private frameCount: number;
  private fpsUpdateTime: number;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) {
      throw new Error('Canvas element not found');
    }

    this.gameState = new GameState();
    this.renderer = new Renderer(canvas, this.gameState);
    this.lastTime = 0;
    this.animationId = 0;
    this.isRunning = false;
    this.fps = 60;
    this.frameCount = 0;
    this.fpsUpdateTime = 0;

    this.setupEventListeners();
    this.gameState.onGameOver = (score) => this.handleGameOver(score);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.getCanvas();

    canvas.addEventListener('click', (e) => this.handleClick(e));
    canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    canvas.addEventListener('mouseleave', () => this.handleMouseLeave());

    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGame());
    }

    const shareBtn = document.getElementById('share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.shareScore());
    }
  }

  private handleClick(e: MouseEvent): void {
    if (this.gameState.isGameOver) return;

    const cell = this.renderer.getCellAtPosition(e.clientX, e.clientY);
    if (cell) {
      this.gameState.selectTalisman(cell.row, cell.col);
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const cell = this.renderer.getCellAtPosition(e.clientX, e.clientY);
    if (cell) {
      this.renderer.setHoveredCell(cell.row, cell.col);
    } else {
      this.renderer.setHoveredCell(null, null);
    }
  }

  private handleMouseLeave(): void {
    this.renderer.setHoveredCell(null, null);
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.gameState.startGame();
    this.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop(): void {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    this.updateFPS(deltaTime);
    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(() => this.gameLoop());
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;

    if (this.fpsUpdateTime >= 1) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }
  }

  private update(deltaTime: number): void {
    this.gameState.update(deltaTime);
    this.renderer.update(deltaTime);
  }

  private render(): void {
    this.renderer.render();
  }

  private handleGameOver(_score: number): void {
    const modal = document.getElementById('game-over-modal');
    const finalScoreEl = document.getElementById('final-score');
    const leaderboardList = document.getElementById('leaderboard-list');

    if (modal) modal.classList.remove('hidden');
    if (finalScoreEl) finalScoreEl.textContent = this.gameState.score.toString();
    
    if (leaderboardList) {
      leaderboardList.innerHTML = '';
      const currentRank = this.gameState.getRank(this.gameState.score);
      
      this.gameState.leaderboard.forEach((score, index) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        
        const isCurrentScore = score === this.gameState.score && index + 1 === currentRank;
        if (isCurrentScore) {
          item.classList.add('current');
        }
        
        const rankNames = ['🥇', '🥈', '🥉', '4.', '5.'];
        item.innerHTML = `
          <span>${rankNames[index]} 第${index + 1}名</span>
          <span>${score}分</span>
        `;
        leaderboardList.appendChild(item);
      });
    }
  }

  private restartGame(): void {
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.classList.add('hidden');
    
    this.gameState.startGame();
  }

  private async shareScore(): Promise<void> {
    const rank = this.gameState.getRank(this.gameState.score);
    const text = `我在符咒叠塔中获得了${this.gameState.score}分，排名第${rank}！`;
    
    try {
      await navigator.clipboard.writeText(text);
      alert('成绩已复制到剪贴板！');
    } catch (err) {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
        alert('成绩已复制到剪贴板！');
      } catch (e) {
        alert('复制失败，请手动复制：' + text);
      }
      document.body.removeChild(textarea);
    }
  }

  getFPS(): number {
    return this.fps;
  }

  destroy(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
  
  (window as any).game = game;
});
