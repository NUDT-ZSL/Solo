import { TrackSystem } from './track';
import { NoteManager, HitEvent } from './note';
import { UIRenderer, GameState } from './ui';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  private trackSystem!: TrackSystem;
  private noteManager!: NoteManager;
  private uiRenderer!: UIRenderer;

  private gameState: GameState = 'ready';
  private lastTime: number = 0;
  private animationId: number = 0;

  private score: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private comboMultiplier: number = 1;
  private maxMultiplier: number = 1;
  private currentDifficultyLevel: number = 1;
  private lastDifficultyThreshold: number = 0;

  private audioContext: AudioContext | null = null;
  private bpmOscillatorInterval: number | null = null;
  private gameDuration: number = 0;
  private maxGameDuration: number = 180;

  private restartBtn: { x: number; y: number; w: number; h: number } | null = null;

  constructor() {
    const canvasEl = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    if (!canvasEl) throw new Error('Canvas not found');
    this.canvas = canvasEl;

    const ctxEl = this.canvas.getContext('2d');
    if (!ctxEl) throw new Error('2D context not available');
    this.ctx = ctxEl;

    this.resize();
    this.initSystems();
    this.bindEvents();
    this.start();
  }

  private resize(): void {
    this.canvasWidth = window.innerWidth;
    this.canvasHeight = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.canvasWidth * dpr;
    this.canvas.height = this.canvasHeight * dpr;
    this.canvas.style.width = `${this.canvasWidth}px`;
    this.canvas.style.height = `${this.canvasHeight}px`;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initSystems(): void {
    this.trackSystem = new TrackSystem(this.canvasWidth, this.canvasHeight);
    this.noteManager = new NoteManager(
      this.trackSystem,
      this.canvasWidth,
      this.canvasHeight,
      (event: HitEvent) => this.onNoteHit(event)
    );
    this.uiRenderer = new UIRenderer(this.canvasWidth, this.canvasHeight);
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => {
      this.resize();
      this.trackSystem.resize(this.canvasWidth, this.canvasHeight);
      this.noteManager.resize(this.canvasWidth, this.canvasHeight);
      this.uiRenderer.resize(this.canvasWidth, this.canvasHeight);
    });

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (this.gameState === 'ready') {
        this.startGame();
        return;
      }
      if (this.gameState !== 'playing') return;

      const key = e.key.toLowerCase();
      let trackId = -1;
      if (key === 'd') trackId = 0;
      else if (key === 'f') trackId = 1;
      else if (key === 'j') trackId = 2;

      if (trackId !== -1) {
        e.preventDefault();
        this.trackSystem.brightenTrack(trackId);
        this.noteManager.handleKeyPress(trackId);
        this.playBeep(trackId);
      }
    });

    this.canvas.addEventListener('click', (e: MouseEvent) => {
      if (this.gameState === 'ended' && this.restartBtn) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const btn = this.restartBtn;
        if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
          this.resetGame();
          this.startGame();
        }
      }
      if (this.gameState === 'ready') {
        this.startGame();
      }
    });
  }

  private startGame(): void {
    if (this.gameState === 'playing') return;
    this.gameState = 'playing';
    this.initAudio();
    this.startBPMBeat();
  }

  private resetGame(): void {
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.comboMultiplier = 1;
    this.maxMultiplier = 1;
    this.currentDifficultyLevel = 1;
    this.lastDifficultyThreshold = 0;
    this.gameDuration = 0;
    this.trackSystem.setDifficultyLevel(1);
    this.noteManager.setDifficultyLevel(1);
    this.noteManager.reset();
    this.gameState = 'ready';
    this.stopBPMBeat();
  }

  private endGame(): void {
    this.gameState = 'ended';
    this.stopBPMBeat();
  }

  private initAudio(): void {
    if (!this.audioContext) {
      try {
        this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      } catch {
        this.audioContext = null;
      }
    }
    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
  }

  private startBPMBeat(): void {
    this.stopBPMBeat();
    if (!this.audioContext) return;
    const beatInterval = (60 / 120) * 1000;
    this.bpmOscillatorInterval = window.setInterval(() => {
      this.playBassBeat();
    }, beatInterval);
  }

  private stopBPMBeat(): void {
    if (this.bpmOscillatorInterval !== null) {
      clearInterval(this.bpmOscillatorInterval);
      this.bpmOscillatorInterval = null;
    }
  }

  private playBassBeat(): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(65.41, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(32.7, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.15);
  }

  private playBeep(trackId: number): void {
    if (!this.audioContext) return;
    const ctx = this.audioContext;
    const frequencies = [523.25, 659.25, 783.99];
    const freq = frequencies[trackId] || 440;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + 0.05);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  }

  private onNoteHit(event: HitEvent): void {
    this.uiRenderer.onHit(event);

    switch (event.type) {
      case 'perfect':
        this.addScore(100);
        this.incrementCombo();
        break;
      case 'good':
        this.addScore(50);
        this.incrementCombo();
        break;
      case 'reverse_hit':
        this.addScore(200);
        this.incrementCombo();
        break;
      case 'miss':
        this.breakCombo();
        break;
      case 'reverse_miss':
        this.addScore(-50);
        this.breakCombo();
        break;
    }

    this.checkDifficultyUp();
  }

  private addScore(points: number): void {
    const multiplied = Math.round(points * this.comboMultiplier);
    this.score = Math.max(0, this.score + multiplied);
  }

  private incrementCombo(): void {
    this.combo++;
    if (this.combo > this.maxCombo) {
      this.maxCombo = this.combo;
    }
    const newMultiplier = Math.min(8, 1 + Math.floor(this.combo / 5));
    if (newMultiplier > this.comboMultiplier) {
      this.comboMultiplier = newMultiplier;
      this.uiRenderer.triggerComboBounce();
    }
    if (this.comboMultiplier > this.maxMultiplier) {
      this.maxMultiplier = this.comboMultiplier;
    }
  }

  private breakCombo(): void {
    this.combo = 0;
    this.comboMultiplier = 1;
  }

  private checkDifficultyUp(): void {
    const threshold = Math.floor(this.score / 1000) * 1000;
    if (threshold > this.lastDifficultyThreshold) {
      this.lastDifficultyThreshold = threshold;
      const newLevel = Math.min(10, this.currentDifficultyLevel + 1);
      if (newLevel > this.currentDifficultyLevel) {
        this.currentDifficultyLevel = newLevel;
        this.trackSystem.setDifficultyLevel(newLevel);
        this.noteManager.setDifficultyLevel(newLevel);
        this.uiRenderer.triggerDifficultyFlash();
      }
    }
  }

  private update(deltaTime: number): void {
    const now = performance.now();

    if (this.gameState === 'playing') {
      this.gameDuration += deltaTime;
      this.trackSystem.update(deltaTime);
      this.noteManager.update(deltaTime);

      if (this.gameDuration >= this.maxGameDuration) {
        this.endGame();
      }
    }

    this.uiRenderer.update(deltaTime, now);
  }

  private render(): void {
    const now = performance.now();

    this.uiRenderer.renderBackground(this.ctx);

    if (this.gameState === 'playing' || this.gameState === 'ended') {
      this.trackSystem.render(this.ctx);
      this.noteManager.render(this.ctx);
    }

    if (this.gameState === 'playing') {
      this.uiRenderer.renderGameUI(
        this.ctx,
        this.score,
        this.combo,
        this.comboMultiplier,
        this.currentDifficultyLevel,
        now
      );

      this.ctx.save();
      this.ctx.font = '14px \'Segoe UI\', sans-serif';
      this.ctx.fillStyle = '#8888aa';
      this.ctx.textAlign = 'right';
      this.ctx.textBaseline = 'top';
      const remaining = Math.max(0, this.maxGameDuration - this.gameDuration);
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      this.ctx.fillText(`剩余时间: ${mins}:${secs.toString().padStart(2, '0')}`, this.canvasWidth - 30, 30);
      this.ctx.restore();
    }

    if (this.gameState === 'ready') {
      this.uiRenderer.renderReadyScreen(this.ctx);
    }

    if (this.gameState === 'ended') {
      this.restartBtn = null;
      const btn = this.uiRenderer.renderEndScreen(
        this.ctx,
        this.score,
        this.maxCombo,
        this.maxMultiplier,
        now
      );
      this.restartBtn = { x: btn.restartX, y: btn.restartY, w: btn.restartW, h: btn.restartH };
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.lastTime) this.lastTime = timestamp;
    const deltaTime = Math.min(0.05, (timestamp - this.lastTime) / 1000);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    this.lastTime = 0;
    this.animationId = requestAnimationFrame(this.loop);
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.stopBPMBeat();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
