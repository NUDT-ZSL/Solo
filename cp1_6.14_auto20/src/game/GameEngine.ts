import { GameLogic, type GameState, type PlantStage, type SoundType } from './GameLogic';
import type { PlantState } from './GameLogic';
import { SoundEngine } from './SoundEngine';
import {
  ParticleSystem,
  drawBackground,
  drawMeditationBackground,
  drawPlant,
  drawBreathCircle,
  drawBase,
  drawGrowthPercent,
  drawWaterEffect,
} from '../art/Visuals';

export { type GameState, type PlantState, type PlantStage, type SoundType };
export { MOOD_COLORS } from './GameLogic';

export type StateCallback = (state: GameState) => void;

const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private logic: GameLogic;
  private particles: ParticleSystem;
  private sound: SoundEngine;
  private stateCallback: StateCallback;

  private animFrameId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private accumulator: number = 0;
  private fps: number = 60;

  private canvasW: number = 0;
  private canvasH: number = 0;

  constructor(canvas: HTMLCanvasElement, callback: StateCallback) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.logic = new GameLogic();
    this.particles = new ParticleSystem();
    this.sound = new SoundEngine();
    this.stateCallback = callback;

    this.sound.init().catch(() => { /* audio not available */ });
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
      this.animFrameId = 0;
    }
  }

  private loop = (timestamp: number) => {
    if (!this.running) return;

    const dt = Math.min(timestamp - this.lastTime, 100);
    this.lastTime = timestamp;
    this.fps = 1000 / dt;

    this.accumulator += dt;

    let fixedSteps = 0;
    while (this.accumulator >= FRAME_INTERVAL && fixedSteps < 5) {
      this.fixedUpdate(FRAME_INTERVAL, timestamp - this.accumulator);
      this.accumulator -= FRAME_INTERVAL;
      fixedSteps++;
    }

    if (fixedSteps >= 5) {
      this.accumulator = 0;
    }

    this.render();
    this.stateCallback(this.logic.getState());

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private fixedUpdate(dt: number, currentTimeMs: number) {
    const stageChanged = this.logic.update(dt, currentTimeMs);

    if (stageChanged) {
      this.onStageChange(stageChanged);
    }

    const state = this.logic.getState();
    this.particles.update(dt);
    this.particles.maintainAmbient(this.canvasW, this.canvasH);

    const activeSound = this.logic.getActiveSound();
    if (activeSound !== 'none') {
      this.particles.emitSoundParticles(activeSound, this.canvasW, this.canvasH);
    }

    if (state.plant.stage === 'bloom' && Math.random() < 0.05) {
      const cx = this.canvasW / 2;
      const gy = this.canvasH - 100;
      this.particles.emitPetals(
        cx + (Math.random() - 0.5) * 45,
        gy - state.plant.stemHeight - 10,
        2
      );
    }
  }

  private onStageChange(stage: PlantStage) {
    const cx = this.canvasW / 2;
    const gy = this.canvasH - 100;
    const plant = this.logic.getPlant();

    if (stage === 'sprout') {
      this.particles.emitBurst(cx, gy - 10, 45);
    } else if (stage === 'stem') {
      this.particles.emitBurst(cx, gy - plant.stemHeight * 0.5, 25);
    } else if (stage === 'bud') {
      this.particles.emitSparkle(cx, gy - plant.stemHeight - 5, 20);
    } else if (stage === 'bloom') {
      this.particles.emitPetals(cx, gy - plant.stemHeight - 10, 30);
    }
  }

  private render() {
    const ctx = this.ctx;
    if (this.canvasW <= 0 || this.canvasH <= 0) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.save();
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const state = this.logic.getState();
    const isMeditating = state.isMeditating;

    if (isMeditating) {
      drawMeditationBackground(ctx, this.canvasW, this.canvasH);
    } else {
      drawBackground(ctx, this.canvasW, this.canvasH);
    }

    const cx = this.canvasW / 2;
    const groundY = this.canvasH - 100;

    drawBase(ctx, cx, groundY);
    drawPlant(ctx, state.plant, cx, groundY, isMeditating);
    drawWaterEffect(ctx, state.plant, cx, groundY);

    if (state.plant.stage !== 'seed') {
      drawGrowthPercent(ctx, cx, groundY - state.plant.stemHeight - 28, state.plant.growthPercent);
    } else {
      drawGrowthPercent(ctx, cx, groundY - 28, state.plant.growthPercent);
    }

    this.particles.draw(ctx);

    if (isMeditating) {
      const breathPhase = this.getBreathPhase();
      drawBreathCircle(ctx, this.canvasW / 2, this.canvasH / 2, breathPhase);
    }

    ctx.restore();
  }

  private getBreathPhase(): number {
    const state = this.logic.getState();
    const period = 4000;
    return (state.meditationElapsedMs % period) / period * Math.PI * 2;
  }

  water(): void {
    const didWater = this.logic.water(performance.now());
    if (didWater) {
      const state = this.logic.getState();
      const cx = this.canvasW / 2;
      const gy = this.canvasH - 100;
      this.particles.emitSparkle(cx, gy - state.plant.stemHeight * 0.5, 18);
      setTimeout(() => {
        if (this.running) {
          const s = this.logic.getState();
          this.particles.emitDrip(cx, gy - s.plant.stemHeight + 15, 5);
        }
      }, 500);
    }
  }

  setLight(value: number): void {
    this.logic.setLight(value);
  }

  toggleSound(): SoundType {
    const current = this.logic.getActiveSound();
    const sounds: SoundType[] = ['none', 'rain', 'stream', 'wind'];
    const idx = sounds.indexOf(current);
    const next = sounds[(idx + 1) % sounds.length];
    const result = this.sound.play(next);
    this.logic.setSound(result);
    return result;
  }

  toggleMeditation(): void {
    const state = this.logic.getState();
    if (state.isMeditating) {
      this.logic.exitMeditation();
    } else {
      this.logic.enterMeditation();
    }
  }

  enterMeditation(): void {
    this.logic.enterMeditation();
  }

  exitMeditation(): void {
    this.logic.exitMeditation();
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = Math.max(1, width * dpr);
    this.canvas.height = Math.max(1, height * dpr);
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvasW = width;
    this.canvasH = height;
  }

  getState(): GameState {
    return this.logic.getState();
  }

  getFPS(): number {
    return this.fps;
  }

  getParticleCount(): number {
    return this.particles.count;
  }

  destroy() {
    this.stop();
    this.sound.destroy();
  }
}
