import {
  ParticleSystem,
  drawBackground,
  drawMeditationBackground,
  drawPlant,
  drawBreathCircle,
  drawBase,
  drawGrowthPercent,
  drawWaterSparkle,
} from '../art/Visuals';
import type { PlantState, SoundType, PlantStage } from '../art/Visuals';
import {
  createInitialPlantState,
  updatePlantState,
  applyWater,
  MOOD_COLORS,
} from './PlantState';
import { SoundEngine } from './SoundEngine';
import { MeditationController } from './MeditationController';

export type { PlantState, SoundType, PlantStage };
export { MOOD_COLORS };

export interface GameState {
  plant: PlantState;
  activeSound: SoundType;
  isMeditating: boolean;
  meditationRemaining: number;
  canWater: boolean;
  waterCooldownMs: number;
}

export type StateCallback = (state: GameState) => void;

const TARGET_FPS = 60;
const FRAME_INTERVAL = 1000 / TARGET_FPS;
const WATER_COOLDOWN_MS = 5000;

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particles: ParticleSystem;
  private soundEngine: SoundEngine;
  private meditation: MeditationController;
  private stateCallback: StateCallback;

  private animFrameId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;
  private accumulator: number = 0;

  private plant: PlantState;
  private waterCooldownRemaining: number = 0;
  private lastWaterTime: number = 0;

  private canvasLogicalWidth: number = 0;
  private canvasLogicalHeight: number = 0;

  constructor(canvas: HTMLCanvasElement, callback: StateCallback) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.particles = new ParticleSystem();
    this.soundEngine = new SoundEngine();
    this.meditation = new MeditationController();
    this.stateCallback = callback;
    this.plant = createInitialPlantState();

    this.soundEngine.init();
  }

  start() {
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

  private loop = (timestamp: number) => {
    if (!this.running) return;

    const dt = Math.min(timestamp - this.lastTime, 100);
    this.lastTime = timestamp;

    this.accumulator += dt;

    while (this.accumulator >= FRAME_INTERVAL) {
      this.fixedUpdate(FRAME_INTERVAL);
      this.accumulator -= FRAME_INTERVAL;
    }

    this.render();
    this.emitState();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private fixedUpdate(dt: number) {
    const stageChanged = updatePlantState(this.plant, dt);

    if (stageChanged) {
      this.onStageChange(stageChanged);
    }

    if (this.waterCooldownRemaining > 0) {
      this.waterCooldownRemaining = Math.max(0, this.waterCooldownRemaining - dt);
    }

    this.particles.update(dt);
    this.particles.emitAmbient(this.canvasLogicalWidth, this.canvasLogicalHeight);

    const activeSound = this.soundEngine.getActiveSound();
    if (activeSound !== 'none') {
      this.particles.emitSoundParticles(activeSound, this.canvasLogicalWidth, this.canvasLogicalHeight);
    }

    if (this.plant.stage === 'bloom' && Math.random() < 0.04) {
      const cx = this.canvasLogicalWidth / 2;
      const gy = this.canvasLogicalHeight - 100;
      this.particles.emitPetals(cx + (Math.random() - 0.5) * 40, gy - this.plant.stemDrawHeight - 10, 2);
    }

    this.meditation.update(dt);
  }

  private onStageChange(newStage: PlantStage) {
    const cx = this.canvasLogicalWidth / 2;
    const gy = this.canvasLogicalHeight - 100;

    if (newStage === 'sprout') {
      this.particles.emitBurst(cx, gy - 10, 40);
    } else if (newStage === 'bloom') {
      this.particles.emitPetals(cx, gy - this.plant.stemDrawHeight - 10, 25);
    } else if (newStage === 'stem') {
      this.particles.emitBurst(cx, gy - this.plant.stemDrawHeight * 0.5, 20);
    } else if (newStage === 'bud') {
      this.particles.emitSparkle(cx, gy - this.plant.stemDrawHeight - 5, 15);
    }
  }

  private render() {
    const ctx = this.ctx;
    const w = this.canvasLogicalWidth;
    const h = this.canvasLogicalHeight;
    if (w <= 0 || h <= 0) return;

    ctx.save();
    const dpr = window.devicePixelRatio || 1;
    ctx.scale(dpr, dpr);

    if (this.meditation.isActive()) {
      drawMeditationBackground(ctx, w, h);
    } else {
      drawBackground(ctx, w, h);
    }

    const cx = w / 2;
    const groundY = h - 100;

    drawBase(ctx, cx, groundY);
    drawPlant(ctx, this.plant, cx, groundY, this.meditation.isActive());
    drawWaterSparkle(ctx, this.plant, cx, groundY);

    if (this.plant.stage !== 'seed') {
      drawGrowthPercent(ctx, cx, groundY - this.plant.stemDrawHeight - 25, this.plant.growthPercent);
    } else {
      drawGrowthPercent(ctx, cx, groundY - 25, this.plant.growthPercent);
    }

    this.particles.draw(ctx);

    if (this.meditation.isActive()) {
      const medState = this.meditation.getState();
      drawBreathCircle(ctx, w / 2, h / 2, medState.breathPhase);
    }

    ctx.restore();
  }

  private emitState() {
    const medState = this.meditation.getState();
    this.stateCallback({
      plant: { ...this.plant, leafUnfurlProgress: [...this.plant.leafUnfurlProgress] },
      activeSound: this.soundEngine.getActiveSound(),
      isMeditating: medState.isActive,
      meditationRemaining: medState.remainingSeconds,
      canWater: this.waterCooldownRemaining <= 0,
      waterCooldownMs: this.waterCooldownRemaining,
    });
  }

  water() {
    if (this.waterCooldownRemaining > 0) return;
    const now = performance.now();
    if (now - this.lastWaterTime < WATER_COOLDOWN_MS) return;

    this.lastWaterTime = now;
    this.waterCooldownRemaining = WATER_COOLDOWN_MS;

    applyWater(this.plant);

    const cx = this.canvasLogicalWidth / 2;
    const gy = this.canvasLogicalHeight - 100;
    this.particles.emitSparkle(cx, gy - this.plant.stemDrawHeight * 0.5, 15);

    setTimeout(() => {
      this.particles.emitDrip(cx, gy - this.plant.stemDrawHeight + 15, 5);
    }, 500);
  }

  setLight(value: number) {
    this.plant.lightLevel = Math.max(0, Math.min(100, value));
  }

  toggleSound(): SoundType {
    return this.soundEngine.toggle();
  }

  enterMeditation() {
    this.meditation.enter(() => {
      this.soundEngine.playHarp();
    });
  }

  exitMeditationManual() {
    this.meditation.exit();
  }

  resize(width: number, height: number) {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.canvasLogicalWidth = width;
    this.canvasLogicalHeight = height;
  }

  destroy() {
    this.stop();
    this.soundEngine.destroy();
  }
}
