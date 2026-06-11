import { NoteManager, type TrajectoryType } from './note';
import { Player } from './player';
import { UIRenderer, type GamePhase, type GameState, type UIData } from './ui';

const CANVAS_SIZE = 800;
const CENTER_X = CANVAS_SIZE / 2;
const CENTER_Y = CANVAS_SIZE / 2;
const TARGET_OUTER_RADIUS = 60;

const HIT_WINDOW = [300, 250, 200];
const GAME_DURATION = 90000;
const PHASE_DURATION = 30000;
const TRAJECTORY_SWITCH_INTERVAL = 5000;
const BASE_SPAWN_INTERVAL = 1500;
const PHASE_SPAWN_MULTIPLIER = [1, 0.8, 0.64];
const PHASE_SPEED_MULTIPLIER = [1, 1.2, 1.44];

const TRAJECTORY_TYPES: TrajectoryType[] = ['linear', 's_curve', 'spiral'];

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private noteManager: NoteManager;
  private player: Player;
  private uiRenderer: UIRenderer;
  
  private gameState: GameState = 'playing';
  private gamePhase: GamePhase = 1;
  private timeRemaining: number = GAME_DURATION;
  private phaseTimeElapsed: number = 0;
  private trajectoryTimeElapsed: number = 0;
  private currentTrajectory: TrajectoryType = 'linear';
  private spawnTimeElapsed: number = 0;
  private phaseTransition: boolean = false;
  private phaseTransitionTimer: number = 0;
  
  private lastTime: number = 0;
  private animationId: number | null = null;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  
  private scale: number = 1;
  
  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.noteManager = new NoteManager(CENTER_X, CENTER_Y, CANVAS_SIZE);
    this.player = new Player();
    
    const uiData: UIData = {
      playerState: this.player.getState(),
      gameState: this.gameState,
      gamePhase: this.gamePhase,
      timeRemaining: this.timeRemaining,
      centerX: CENTER_X,
      centerY: CENTER_Y,
      canvasSize: CANVAS_SIZE,
      phaseTransition: this.phaseTransition,
      phaseTransitionTimer: this.phaseTransitionTimer
    };
    
    this.uiRenderer = new UIRenderer(uiData);
    
    this.bindEvents();
    this.switchTrajectory();
  }
  
  private resizeCanvas(): void {
    const container = document.getElementById('app')!;
    const size = Math.min(container.clientWidth, container.clientHeight);
    this.scale = size / CANVAS_SIZE;
    
    this.canvas.width = CANVAS_SIZE;
    this.canvas.height = CANVAS_SIZE;
    this.canvas.style.width = `${size}px`;
    this.canvas.style.height = `${size}px`;
  }
  
  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.handleClick(e));
    this.canvas.addEventListener('touchstart', (e) => this.handleTouch(e), { passive: false });
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
  }
  
  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / this.scale;
    const y = (clientY - rect.top) / this.scale;
    return { x, y };
  }
  
  private handleClick(e: MouseEvent): void {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    this.processInput(x, y);
  }
  
  private handleTouch(e: TouchEvent): void {
    e.preventDefault();
    
    for (const touch of e.touches) {
      const { x, y } = this.getCanvasCoords(touch.clientX, touch.clientY);
      this.processInput(x, y);
    }
  }
  
  private handleMouseMove(e: MouseEvent): void {
    if (this.gameState !== 'ended') return;
    
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);
    const isHover = this.uiRenderer.checkRestartButton(x, y);
    this.uiRenderer.setButtonHover(isHover);
    this.canvas.style.cursor = isHover ? 'pointer' : 'default';
  }
  
  private processInput(x: number, y: number): void {
    if (this.gameState === 'ended') {
      if (this.uiRenderer.checkRestartButton(x, y)) {
        this.restart();
      }
      return;
    }
    
    if (this.gameState !== 'playing') return;
    
    const distToCenter = Math.sqrt((x - CENTER_X) ** 2 + (y - CENTER_Y) ** 2);
    
    if (this.player.isUltimateReady() && distToCenter <= TARGET_OUTER_RADIUS) {
      const clearedCount = this.noteManager.clearAllNotes();
      const score = this.player.useUltimate(clearedCount);
      this.uiRenderer.addScorePopup(CENTER_X, CENTER_Y - 80, score);
      return;
    }
    
    const hitWindow = HIT_WINDOW[this.gamePhase - 1];
    const result = this.noteManager.handleClick(x, y, hitWindow);
    
    if (result.hit && result.note) {
      const score = this.player.hit();
      this.uiRenderer.addScorePopup(result.note.x, result.note.y, score);
    } else if (result.missed) {
      this.player.miss();
    } else if (!result.hit && distToCenter <= TARGET_OUTER_RADIUS) {
      const activeNotes = this.noteManager.getActiveNotes();
      const nearNotes = activeNotes.filter(n => {
        const dist = Math.sqrt((n.x - CENTER_X) ** 2 + (n.y - CENTER_Y) ** 2);
        return dist < TARGET_OUTER_RADIUS;
      });
      
      if (nearNotes.length > 0) {
        this.player.miss();
      }
    }
  }
  
  private switchTrajectory(): void {
    const availableTypes = TRAJECTORY_TYPES.filter(t => t !== this.currentTrajectory);
    this.currentTrajectory = availableTypes[Math.floor(Math.random() * availableTypes.length)];
  }
  
  private updatePhase(deltaTime: number): void {
    this.phaseTimeElapsed += deltaTime;
    
    if (this.phaseTimeElapsed >= PHASE_DURATION && this.gamePhase < 3) {
      this.gamePhase = (this.gamePhase + 1) as GamePhase;
      this.phaseTimeElapsed = 0;
      this.phaseTransition = true;
      this.phaseTransitionTimer = 2000;
      this.switchTrajectory();
      this.trajectoryTimeElapsed = 0;
    }
    
    if (this.phaseTransition) {
      this.phaseTransitionTimer -= deltaTime;
      if (this.phaseTransitionTimer <= 0) {
        this.phaseTransition = false;
      }
    }
  }
  
  private updateTrajectory(deltaTime: number): void {
    this.trajectoryTimeElapsed += deltaTime;
    
    if (this.trajectoryTimeElapsed >= TRAJECTORY_SWITCH_INTERVAL) {
      this.trajectoryTimeElapsed = 0;
      this.switchTrajectory();
    }
  }
  
  private spawnNotes(deltaTime: number): void {
    this.spawnTimeElapsed += deltaTime;
    
    const comboSpeedMultiplier = this.player.getSpeedMultiplier();
    const phaseSpeedMultiplier = PHASE_SPEED_MULTIPLIER[this.gamePhase - 1];
    const totalSpeedMultiplier = comboSpeedMultiplier * phaseSpeedMultiplier;
    const spawnInterval = BASE_SPAWN_INTERVAL * PHASE_SPAWN_MULTIPLIER[this.gamePhase - 1] / totalSpeedMultiplier;
    
    if (this.spawnTimeElapsed >= spawnInterval) {
      this.spawnTimeElapsed = 0;
      this.noteManager.spawnNote(this.currentTrajectory, totalSpeedMultiplier);
    }
  }
  
  private update(deltaTime: number): void {
    if (this.gameState !== 'playing') {
      this.uiRenderer.update(deltaTime);
      return;
    }
    
    this.timeRemaining -= deltaTime;
    if (this.timeRemaining <= 0) {
      this.timeRemaining = 0;
      this.gameState = 'ended';
    }
    
    this.updatePhase(deltaTime);
    this.updateTrajectory(deltaTime);
    this.spawnNotes(deltaTime);
    
    const result = this.noteManager.update(deltaTime);
    for (let i = 0; i < result.missedCount; i++) {
      this.player.miss();
    }
    
    this.player.update(deltaTime);
    this.uiRenderer.update(deltaTime);
    
    this.uiRenderer.updateData({
      playerState: this.player.getState(),
      gameState: this.gameState,
      gamePhase: this.gamePhase,
      timeRemaining: this.timeRemaining,
      phaseTransition: this.phaseTransition,
      phaseTransitionTimer: this.phaseTransitionTimer
    });
    
    this.frameCount++;
    this.fpsTime += deltaTime;
    if (this.fpsTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsTime = 0;
    }
  }
  
  private render(): void {
    this.ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    
    this.uiRenderer.drawBackground(this.ctx);
    
    this.noteManager.drawTrajectories(this.ctx);
    
    const playerState = this.player.getState();
    this.uiRenderer.drawTarget(this.ctx, playerState.targetFlash, playerState.ultimateReady);
    
    this.noteManager.drawNotes(this.ctx);
    this.noteManager.drawParticles(this.ctx);
    this.noteManager.drawMissTexts(this.ctx);
    
    this.uiRenderer.drawPhaseGlow(this.ctx);
    
    this.uiRenderer.render(this.ctx);
    
    if (this.fps > 0) {
      this.ctx.save();
      this.ctx.font = '12px monospace';
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      this.ctx.textAlign = 'right';
      this.ctx.fillText(`FPS: ${this.fps}`, CANVAS_SIZE - 10, CANVAS_SIZE - 10);
      this.ctx.restore();
    }
  }
  
  private loop = (currentTime: number = performance.now()): void => {
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;
    
    this.update(deltaTime);
    this.render();
    
    this.animationId = requestAnimationFrame(this.loop);
  };
  
  start(): void {
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.loop);
  }
  
  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  restart(): void {
    this.uiRenderer.triggerResetFlash();
    
    setTimeout(() => {
      this.stop();
      
      this.gameState = 'playing';
      this.gamePhase = 1;
      this.timeRemaining = GAME_DURATION;
      this.phaseTimeElapsed = 0;
      this.trajectoryTimeElapsed = 0;
      this.spawnTimeElapsed = 0;
      this.phaseTransition = false;
      this.phaseTransitionTimer = 0;
      
      this.noteManager.reset();
      this.player.reset();
      this.switchTrajectory();
      
      this.uiRenderer.updateData({
        playerState: this.player.getState(),
        gameState: this.gameState,
        gamePhase: this.gamePhase,
        timeRemaining: this.timeRemaining,
        phaseTransition: this.phaseTransition,
        phaseTransitionTimer: this.phaseTransitionTimer
      });
      
      this.start();
    }, 300);
  }
}

function init(): void {
  const game = new Game();
  game.start();
}

document.addEventListener('DOMContentLoaded', init);
