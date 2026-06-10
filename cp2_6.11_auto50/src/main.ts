import { GameState } from './gameState';
import { Renderer } from './renderer';

const MAX_FRAME_TIME = 1000 / 30;

class Game {
  private gameState: GameState;
  private renderer: Renderer;
  private lastFrameTime: number;
  private rafId: number;
  private running: boolean;
  private fps: number;
  private fpsFrames: number;
  private fpsTimer: number;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas #game-canvas not found');

    this.gameState = new GameState();
    this.renderer = new Renderer(canvas, this.gameState);
    this.lastFrameTime = 0;
    this.rafId = 0;
    this.running = false;
    this.fps = 60;
    this.fpsFrames = 0;
    this.fpsTimer = 0;

    this.bindEvents();
    this.gameState.onGameOver = (score) => this.showGameOver(score);
  }

  private bindEvents(): void {
    const canvas = this.renderer.getCanvas();

    canvas.addEventListener('click', (e) => {
      const cell = this.renderer.getCellAtPosition(e.clientX, e.clientY);
      if (cell) this.gameState.selectTalisman(cell.row, cell.col);
    });

    canvas.addEventListener('mousemove', (e) => {
      const cell = this.renderer.getCellAtPosition(e.clientX, e.clientY);
      if (cell) {
        this.renderer.setHoveredCell(cell.row, cell.col);
      } else {
        this.renderer.setHoveredCell(null, null);
      }
    });

    canvas.addEventListener('mouseleave', () => {
      this.renderer.setHoveredCell(null, null);
    });

    let dragStart: { row: number; col: number } | null = null;

    canvas.addEventListener('mousedown', (e) => {
      const cell = this.renderer.getCellAtPosition(e.clientX, e.clientY);
      if (cell) dragStart = cell;
    });

    canvas.addEventListener('mouseup', (e) => {
      if (!dragStart) return;
      const endCell = this.renderer.getCellAtPosition(e.clientX, e.clientY);
      if (endCell &&
          (endCell.row !== dragStart.row || endCell.col !== dragStart.col)) {
        this.gameState.selectTalisman(dragStart.row, dragStart.col);
        this.gameState.selectTalisman(endCell.row, endCell.col);
      }
      dragStart = null;
    });

    const restart = document.getElementById('restart-btn');
    if (restart) restart.addEventListener('click', () => this.restart());

    const share = document.getElementById('share-btn');
    if (share) share.addEventListener('click', () => this.share());
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.gameState.startGame();
    this.lastFrameTime = performance.now();
    this.loop();
  }

  private loop(): void {
    if (!this.running) return;
    this.rafId = requestAnimationFrame(() => this.loop());

    const now = performance.now();
    let dt = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;

    if (dt > MAX_FRAME_TIME / 1000) dt = MAX_FRAME_TIME / 1000;

    this.fpsFrames++;
    this.fpsTimer += dt;
    if (this.fpsTimer >= 1) {
      this.fps = this.fpsFrames;
      this.fpsFrames = 0;
      this.fpsTimer = 0;
    }

    this.gameState.update(dt);
    this.renderer.update(dt);
    this.renderer.render();
  }

  private showGameOver(_score: number): void {
    const modal = document.getElementById('game-over-modal');
    const finalEl = document.getElementById('final-score');
    const list = document.getElementById('leaderboard-list');

    if (modal) modal.classList.remove('hidden');
    if (finalEl) finalEl.textContent = String(this.gameState.score);
    if (list) {
      list.innerHTML = '';
      const currentRank = this.gameState.getRank(this.gameState.score);
      const medals = ['🥇', '🥈', '🥉', '4.', '5.'];
      let matchedCurrent = false;

      this.gameState.leaderboard.forEach((s, idx) => {
        const item = document.createElement('div');
        item.className = 'leaderboard-item';
        const isCurrent = !matchedCurrent && s === this.gameState.score && idx + 1 === currentRank;
        if (isCurrent) {
          item.classList.add('current');
          matchedCurrent = true;
        }
        item.innerHTML = `<span>${medals[idx]} 第${idx + 1}名</span><span>${s}分</span>`;
        list.appendChild(item);
      });
    }
  }

  private restart(): void {
    const modal = document.getElementById('game-over-modal');
    if (modal) modal.classList.add('hidden');
    this.gameState.startGame();
  }

  private async share(): Promise<void> {
    const rank = this.gameState.getRank(this.gameState.score);
    const text = `我在符咒叠塔中获得了${this.gameState.score}分，排名第${rank}！`;
    try {
      await navigator.clipboard.writeText(text);
      alert('成绩已复制到剪贴板！');
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        alert('成绩已复制到剪贴板！');
      } catch {
        alert('复制失败，请手动复制：' + text);
      }
      document.body.removeChild(ta);
    }
  }

  destroy(): void {
    this.running = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  getFPS(): number { return this.fps; }
}

let game: Game | null = null;

function boot(): void {
  try {
    game = new Game();
    game.start();
    (window as any).game = game;
  } catch (err) {
    console.error('Failed to boot game:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
