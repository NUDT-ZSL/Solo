import { AudioEngine } from './AudioEngine';
import { GameManager } from './GameManager';
import { LevelRenderer } from './LevelRenderer';

class GameApp {
  private canvas: HTMLCanvasElement;
  private audioEngine: AudioEngine;
  private gameManager: GameManager;
  private renderer: LevelRenderer;

  private lastTime: number = 0;
  private animationFrameId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) {
      throw new Error('找不到canvas元素');
    }

    this.audioEngine = new AudioEngine();
    this.gameManager = new GameManager(this.audioEngine);
    this.renderer = new LevelRenderer(this.canvas, this.gameManager);

    this.setupCanvas();
    this.setupEventListeners();
    this.startGameLoop();
  }

  private setupCanvas(): void {
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;

    const ctx = this.canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    this.gameManager.resize(rect.width, rect.height);
    this.renderer.resize();
  }

  private setupEventListeners(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.canvas.addEventListener('mouseleave', (e) => this.onMouseUp(e));

    document.addEventListener('keydown', (e) => this.onKeyDown(e));
  }

  private getMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseDown(e: MouseEvent): void {
    const { x, y } = this.getMousePos(e);

    const clicked = this.renderer.handleMouseUp(x, y);
    if (clicked === '开始游戏') {
      this.gameManager.startGame();
      return;
    } else if (clicked === '重新开始') {
      this.gameManager.endGame();
      this.gameManager.startGame();
      return;
    }

    this.renderer.handleMouseDown(x, y);
    this.gameManager.handleMouseDown(x, y);
  }

  private onMouseMove(e: MouseEvent): void {
    const { x, y } = this.getMousePos(e);
    this.renderer.handleMouseMove(x, y);
    this.gameManager.handleMouseMove(x, y);
  }

  private onMouseUp(e: MouseEvent): void {
    const { x, y } = this.getMousePos(e);

    const clicked = this.renderer.handleMouseUp(x, y);
    if (clicked === '开始游戏') {
      this.gameManager.startGame();
      return;
    } else if (clicked === '重新开始') {
      this.gameManager.endGame();
      this.gameManager.startGame();
      return;
    }

    this.gameManager.handleMouseUp(x, y);
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      if (this.gameManager.state === 'playing' || this.gameManager.state === 'win') {
        this.gameManager.endGame();
      }
    }
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    this.loop();
  }

  private loop(): void {
    const currentTime = performance.now();
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.gameManager.update(deltaTime);
    this.renderer.render(deltaTime);

    this.animationFrameId = requestAnimationFrame(() => this.loop());
  }

  public destroy(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.audioEngine.stopAll();
  }
}

let app: GameApp | null = null;

declare global {
  interface Window {
    debugGame: {
      fillAllSlotsWithTarget: () => void;
      fillAllSlotsRandomly: () => void;
      triggerFail: () => void;
      goToWin: () => void;
      getState: () => any;
    };
  }
}

function createDebugAPI(gameManager: GameManager, audioEngine: AudioEngine) {
  return {
    fillAllSlotsWithTarget: () => {
      if (gameManager.state !== 'playing') return;
      gameManager.slots.forEach((slot, i) => {
        const targetPitch = gameManager.targetMelody[i];
        const matchingTrack = gameManager.tracks.find(t =>
          t.pitch === targetPitch && !t.inSlot && !t.animating && !t.flying
        );
        if (matchingTrack) {
          matchingTrack.x = slot.x + (slot.width - 80) / 2;
          matchingTrack.y = slot.y;
          matchingTrack.inSlot = true;
          matchingTrack.slotIndex = i;
          slot.filled = true;
          slot.blockId = matchingTrack.id;
        }
      });
      audioEngine.playDing();
      setTimeout(() => {
        if (gameManager.slots.every(s => s.filled)) {
          (gameManager as any).checkMelody();
        }
      }, 300);
    },
    fillAllSlotsRandomly: () => {
      if (gameManager.state !== 'playing') return;
      const available = gameManager.tracks.filter(t => !t.inSlot && !t.animating && !t.flying);
      gameManager.slots.forEach((slot, i) => {
        if (slot.filled) return;
        const track = available[i % available.length];
        if (track) {
          track.x = slot.x + (slot.width - 80) / 2;
          track.y = slot.y;
          track.inSlot = true;
          track.slotIndex = i;
          slot.filled = true;
          slot.blockId = track.id;
        }
      });
      audioEngine.playDing();
      setTimeout(() => {
        if (gameManager.slots.every(s => s.filled)) {
          (gameManager as any).checkMelody();
        }
      }, 300);
    },
    triggerFail: () => {
      if (gameManager.state !== 'playing') return;
      gameManager.score = 0;
      (gameManager as any).onFailure();
    },
    goToWin: () => {
      gameManager.level = gameManager.maxLevel;
      gameManager.nextLevel();
    },
    getState: () => ({
      state: gameManager.state,
      level: gameManager.level,
      score: gameManager.score,
      fps: gameManager.currentFPS,
      particles: gameManager.particles.length,
      tracks: gameManager.tracks.length,
      slots: gameManager.slots.length,
      filledSlots: gameManager.slots.filter(s => s.filled).length,
      shakeTime: gameManager.shakeTime,
      flashAlpha: gameManager.flashAlpha
    })
  };
}

window.addEventListener('DOMContentLoaded', () => {
  app = new GameApp();
  setTimeout(() => {
    if (app) {
      const gm = (app as any).gameManager as GameManager;
      const ae = (app as any).audioEngine as AudioEngine;
      (window as any).debugGame = createDebugAPI(gm, ae);
      console.log('debugGame API available:', Object.keys((window as any).debugGame));
    }
  }, 500);
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});
