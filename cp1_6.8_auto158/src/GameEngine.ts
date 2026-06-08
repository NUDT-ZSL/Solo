import { FragmentManager } from './FragmentManager';
import { ParticleSystem } from './ParticleSystem';
import { PortalRenderer } from './PortalRenderer';
import { LEVELS } from './LevelConfig';
import type { Fragment, GamePhase } from './types';
import { useGameStore } from './store';

export class GameEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  fragmentManager: FragmentManager = new FragmentManager();
  particleSystem: ParticleSystem = new ParticleSystem();
  portalRenderer: PortalRenderer = new PortalRenderer();

  private draggingFragment: Fragment | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };

  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private centerX: number = 0;
  private centerY: number = 0;

  private currentLevel: number = 0;
  private phase: GamePhase = 'idle';
  private portalEmitted: boolean = false;

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.loadLevel(0);
  }

  resize() {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx!.scale(dpr, dpr);
    this.canvasWidth = rect.width;
    this.canvasHeight = rect.height;
    this.centerX = rect.width / 2;
    this.centerY = rect.height / 2;
  }

  loadLevel(levelIndex: number) {
    this.currentLevel = levelIndex;
    if (levelIndex >= LEVELS.length) {
      this.setPhase('complete');
      return;
    }
    const level = LEVELS[levelIndex];
    this.fragmentManager.init(level.fragments, level.gridSpacing, this.canvasWidth, this.canvasHeight);
    this.particleSystem.clear();
    this.portalRenderer.stop();
    this.portalEmitted = false;
    this.draggingFragment = null;
    this.setPhase('playing');
  }

  resetCurrentLevel() {
    this.fragmentManager.reset(this.canvasWidth, this.canvasHeight);
    this.particleSystem.clear();
    this.portalRenderer.stop();
    this.portalEmitted = false;
    this.draggingFragment = null;
    this.setPhase('playing');
  }

  private setPhase(phase: GamePhase) {
    this.phase = phase;
    const store = useGameStore.getState();
    store.setPhase(phase);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop = (time: number) => {
    if (!this.running) return;
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;
    this.update(dt);
    this.render();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    if (this.phase === 'playing') {
      this.fragmentManager.update(dt);
      this.particleSystem.update(dt);

      if (this.fragmentManager.allMerged()) {
        this.setPhase('portal');
        this.portalRenderer.start();
        this.portalEmitted = false;
      }
    }

    if (this.phase === 'portal') {
      this.portalRenderer.update(dt);
      this.particleSystem.update(dt);
      this.fragmentManager.update(dt);

      if (this.portalRenderer.isActive && this.portalRenderer.progress > 0.2 && !this.portalEmitted) {
        this.portalEmitted = true;
        this.particleSystem.emitPortal(0, 0, 0);
      }

      if (this.portalRenderer.progress > 0.1) {
        this.particleSystem.emitPortal(0, 0, this.portalRenderer.progress);
      }

      if (this.portalRenderer.isComplete) {
        this.portalRenderer.stop();
        this.setPhase('transitioning');
        setTimeout(() => {
          const store = useGameStore.getState();
          store.nextLevel();
          this.loadLevel(store.currentLevel);
        }, 300);
      }
    }

    if (this.phase === 'complete') {
      this.particleSystem.update(dt);
    }
  }

  private render() {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.canvasWidth;
    const h = this.canvasHeight;

    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    this.drawGrid(ctx, w, h);

    if (this.phase === 'playing' || this.phase === 'portal') {
      this.fragmentManager.drawTargetOutlines(ctx, this.centerX, this.centerY);
    }

    this.fragmentManager.draw(ctx, this.centerX, this.centerY, this.getHintId());

    this.particleSystem.draw(ctx, this.centerX, this.centerY);

    if (this.phase === 'portal') {
      this.portalRenderer.draw(ctx, this.centerX, this.centerY);
    }

    if (this.phase === 'complete') {
      this.drawCompleteScreen(ctx, w, h);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const spacing = this.currentLevel < LEVELS.length ? LEVELS[this.currentLevel].gridSpacing : 40;
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    const startX = this.centerX % spacing;
    const startY = this.centerY % spacing;
    for (let x = startX; x < w; x += spacing) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = startY; y < h; y += spacing) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  private drawCompleteScreen(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#00FFD1';
    ctx.shadowBlur = 20;
    ctx.fillStyle = '#00FFD1';
    ctx.font = 'bold 48px Orbitron, monospace';
    ctx.fillText('虚境重构', w / 2, h / 2 - 40);

    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FF00AA';
    ctx.font = '24px Rajdhani, sans-serif';
    ctx.fillText('ALL REALMS RECONSTRUCTED', w / 2, h / 2 + 20);

    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.font = '16px Rajdhani, sans-serif';
    ctx.fillText('Click to restart', w / 2, h / 2 + 60);
  }

  private getHintId(): number | null {
    const store = useGameStore.getState();
    if (!store.showHint) return null;
    const next = this.fragmentManager.getNextMergeable();
    return next ? next.id : null;
  }

  handlePointerDown(clientX: number, clientY: number) {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const worldX = screenX - this.centerX;
    const worldY = screenY - this.centerY;

    if (this.phase === 'complete') {
      const store = useGameStore.getState();
      store.setCurrentLevel(0);
      this.loadLevel(0);
      return;
    }

    if (this.phase !== 'playing') return;

    const fragment = this.fragmentManager.findFragmentAt(worldX, worldY);
    if (fragment) {
      this.draggingFragment = fragment;
      this.dragOffset = {
        x: fragment.position.x - worldX,
        y: fragment.position.y - worldY,
      };
      this.fragmentManager.startDrag(fragment, worldX, worldY);
    }
  }

  handlePointerMove(clientX: number, clientY: number) {
    if (!this.draggingFragment || !this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const screenX = clientX - rect.left;
    const screenY = clientY - rect.top;
    const worldX = screenX - this.centerX + this.dragOffset.x;
    const worldY = screenY - this.centerY + this.dragOffset.y;
    this.fragmentManager.updateDrag(this.draggingFragment, worldX, worldY);
  }

  handlePointerUp() {
    if (!this.draggingFragment) return;
    const result = this.fragmentManager.endDrag(this.draggingFragment);
    if (result.merged) {
      this.particleSystem.emitMerge(this.draggingFragment.position, this.draggingFragment.glowColor, 25);
    }
    const store = useGameStore.getState();
    store.incrementSteps();
    this.draggingFragment = null;
  }

  getHintFragmentId(): number | null {
    const next = this.fragmentManager.getNextMergeable();
    return next ? next.id : null;
  }

  triggerHint() {
    const store = useGameStore.getState();
    const next = this.fragmentManager.getNextMergeable();
    if (next) {
      store.setHintFragmentId(next.id);
      store.setShowHint(true);
      setTimeout(() => store.setShowHint(false), 3000);
    }
  }
}
