import { EmotionType, Plant } from './plant';
import { ParticleSystem } from './particles';
import { Renderer, GameState } from './renderer';
import { UIManager } from './ui';

const MAX_PLANTS = 30;
const DEFAULT_WIDTH = 800;
const DEFAULT_HEIGHT = 600;
const EMOTION_RATE_PER_SECOND = 5;
const BACKGROUND_TRANSITION_DURATION = 1200;
const HALO_DURATION = 1200;
const POINTER_TRANSITION_DURATION = 200;

const EMOTION_GRADIENTS: Record<EmotionType, { start: string; end: string }> = {
  happy: { start: '#e6ffb3', end: '#b3ff66' },
  sad: { start: '#b3ccff', end: '#9966ff' },
  angry: { start: '#ff6666', end: '#ff9933' },
  calm: { start: '#ccffff', end: '#99ccff' },
};

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;
  private ui: UIManager;
  private particleSystem = new ParticleSystem();
  private plants: Plant[] = [];

  private gridPoints: { x: number; y: number }[] = [];

  private emotionValues: Record<EmotionType, number> = {
    happy: 0,
    sad: 0,
    angry: 0,
    calm: 0,
  };

  private targetEmotion: EmotionType = 'happy';
  private currentEmotion: EmotionType = 'happy';

  private backgroundTransitionProgress = 1;
  private backgroundTransitionStart = 0;
  private previousEmotion: EmotionType = 'happy';

  private haloProgress = 0;
  private haloActive = false;
  private haloStartTime = 0;

  private pointerTargetIndex = 0;
  private pointerProgress = 0;
  private pointerStartTime = 0;

  private waterBubbles: GameState['waterBubbles'] = [];

  private lastTime = 0;
  private running = false;
  private animationId: number | null = null;

  private frameTimes: number[] = [];
  private fps = 60;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas上下文');
    this.ctx = ctx;

    this.renderer = new Renderer(ctx);
    this.ui = new UIManager(this.canvas, {
      onEmotionClick: this.handleEmotionClick.bind(this),
      onPlantClick: this.handlePlantClick.bind(this),
      onPlantRightClick: this.handlePlantRightClick.bind(this),
      onPruneConfirm: this.handlePruneConfirm.bind(this),
      onPruneCancel: this.handlePruneCancel.bind(this),
    });

    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());

    this.setupGarden();
  }

  private resizeCanvas() {
    const pixelRatio = window.devicePixelRatio || 1;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    this.canvas.width = viewportWidth * pixelRatio;
    this.canvas.height = viewportHeight * pixelRatio;
    this.canvas.style.width = viewportWidth + 'px';
    this.canvas.style.height = viewportHeight + 'px';
    this.ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    this.particleSystem.setCanvasSize(viewportWidth, viewportHeight);
    this.renderer.layoutButtons(viewportWidth, viewportHeight);
    this.ui.updateButtons(this.renderer.getButtons());
    this.setupGarden();
  }

  private setupGarden() {
    const viewportWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const viewportHeight = this.canvas.height / (window.devicePixelRatio || 1);

    const gardenX = 180;
    const gardenY = viewportHeight * 0.1;
    const gardenWidth = viewportWidth - 220;
    const gardenHeight = viewportHeight * 0.72;

    const gridSize = 40;
    const points: { x: number; y: number }[] = [];

    for (let y = gardenY + gridSize * 2; y < gardenY + gardenHeight - gridSize; y += gridSize) {
      for (let x = gardenX + gridSize; x < gardenX + gardenWidth - gridSize; x += gridSize) {
        const jitterX = (Math.random() - 0.5) * 10;
        const jitterY = (Math.random() - 0.5) * 8;
        points.push({ x: x + jitterX, y: y + jitterY });
      }
    }

    for (let i = points.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [points[i], points[j]] = [points[j], points[i]];
    }

    this.gridPoints = points;

    const existingPositions = new Map<string, Plant>();
    for (const p of this.plants) {
      const key = `${Math.round(p.x / 20)}_${Math.round(p.y / 20)}`;
      existingPositions.set(key, p);
    }

    const newPlants: Plant[] = [];
    const usedPoints = new Set<number>();

    for (const [key, plant] of existingPositions) {
      let nearestIdx = -1;
      let nearestDist = Infinity;
      for (let i = 0; i < this.gridPoints.length; i++) {
        if (usedPoints.has(i)) continue;
        const gp = this.gridPoints[i];
        const dist = Math.abs(gp.x - plant.x) + Math.abs(gp.y - plant.y);
        if (dist < nearestDist && dist < 60) {
          nearestDist = dist;
          nearestIdx = i;
        }
      }
      if (nearestIdx >= 0) {
        usedPoints.add(nearestIdx);
        newPlants.push(plant);
      }
    }

    for (let i = 0; i < this.gridPoints.length && newPlants.length < MAX_PLANTS; i++) {
      if (usedPoints.has(i)) continue;
      if (newPlants.length < MAX_PLANTS) {
        const gp = this.gridPoints[i];
        const plant = new Plant(gp.x, gp.y);
        newPlants.push(plant);
        usedPoints.add(i);
      }
    }

    this.plants = newPlants;
    this.ui.updatePlants(this.plants);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop() {
    if (!this.running) return;

    const now = performance.now();
    let deltaTime = now - this.lastTime;
    this.lastTime = now;

    if (deltaTime > 100) deltaTime = 100;

    this.update(deltaTime);
    this.render(deltaTime);

    this.frameTimes.push(deltaTime);
    if (this.frameTimes.length > 60) this.frameTimes.shift();
    const avgFrame = this.frameTimes.reduce((a, b) => a + b, 0) / this.frameTimes.length;
    this.fps = 1000 / avgFrame;

    this.animationId = requestAnimationFrame(() => this.loop());
  }

  private update(deltaTime: number) {
    this.updateEmotionValues(deltaTime);
    this.updateTransitions(deltaTime);

    for (const plant of this.plants) {
      plant.update(deltaTime, this.currentEmotion, this.emotionValues);
    }

    this.particleSystem.update(deltaTime, this.currentEmotion, this.emotionValues);
  }

  private updateEmotionValues(deltaTime: number) {
    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'calm'];
    const target = this.targetEmotion;
    const rate = (EMOTION_RATE_PER_SECOND / 1000) * deltaTime;

    for (const emotion of emotions) {
      if (emotion === target) {
        this.emotionValues[emotion] = Math.min(100, this.emotionValues[emotion] + rate * 100);
      } else {
        this.emotionValues[emotion] = Math.max(0, this.emotionValues[emotion] - rate * 40);
      }
    }
  }

  private updateTransitions(deltaTime: number) {
    if (this.backgroundTransitionProgress < 1) {
      const elapsed = performance.now() - this.backgroundTransitionStart;
      this.backgroundTransitionProgress = Math.min(1, elapsed / BACKGROUND_TRANSITION_DURATION);
      if (this.backgroundTransitionProgress >= 1) {
        this.previousEmotion = this.currentEmotion;
      }
    }

    if (this.haloActive) {
      const elapsed = performance.now() - this.haloStartTime;
      this.haloProgress = Math.min(1, elapsed / HALO_DURATION);
      if (this.haloProgress >= 1) {
        this.haloActive = false;
        this.haloProgress = 0;
      }
    }

    if (this.pointerProgress < 1) {
      const elapsed = performance.now() - this.pointerStartTime;
      this.pointerProgress = Math.min(1, elapsed / POINTER_TRANSITION_DURATION);
    }
  }

  private render(deltaTime: number) {
    const viewportWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const viewportHeight = this.canvas.height / (window.devicePixelRatio || 1);

    const state: GameState = {
      canvasWidth: viewportWidth,
      canvasHeight: viewportHeight,
      gardenX: 180,
      gardenY: viewportHeight * 0.1,
      gardenWidth: viewportWidth - 220,
      gardenHeight: viewportHeight * 0.72,
      currentEmotion: this.currentEmotion,
      emotionValues: { ...this.emotionValues },
      emotionColors: EMOTION_GRADIENTS,
      backgroundTransitionProgress: this.backgroundTransitionProgress,
      previousEmotion: this.previousEmotion,
      haloProgress: this.haloProgress,
      haloActive: this.haloActive,
      pointerProgress: this.pointerProgress,
      pointerTargetIndex: this.pointerTargetIndex,
      waterBubbles: this.waterBubbles,
      fps: this.fps,
    };

    this.renderer.render(state, this.plants, this.particleSystem, deltaTime);
    this.ui.updateButtons(this.renderer.getButtons());

    this.ctx.save();
    this.ctx.fillStyle = 'rgba(255,255,255,0.4)';
    this.ctx.font = '11px monospace';
    this.ctx.textAlign = 'right';
    this.ctx.fillText(`FPS: ${Math.round(this.fps)}`, viewportWidth - 15, viewportHeight - 15);
    this.ctx.fillText(`Plants: ${this.plants.length}/${MAX_PLANTS}`, viewportWidth - 15, viewportHeight - 30);
    this.ctx.restore();
  }

  private handleEmotionClick(emotion: EmotionType, buttonIndex: number) {
    if (this.targetEmotion !== emotion) {
      this.targetEmotion = emotion;
      this.previousEmotion = this.currentEmotion;
      this.currentEmotion = emotion;
      this.backgroundTransitionProgress = 0;
      this.backgroundTransitionStart = performance.now();
      this.haloActive = true;
      this.haloProgress = 0;
      this.haloStartTime = performance.now();
    }

    if (this.pointerTargetIndex !== buttonIndex) {
      this.pointerTargetIndex = buttonIndex;
      this.pointerProgress = 0;
      this.pointerStartTime = performance.now();
    }
  }

  private handlePlantClick(plant: Plant) {
    plant.water();
    const topY = plant.y - plant.currentState.stemHeight;
    this.waterBubbles.push({
      x: plant.x,
      y: topY - 10,
      text: '已浇水 💧',
      age: 0,
      lifespan: 1200,
    });
  }

  private handlePlantRightClick(plant: Plant, screenX: number, screenY: number) {
    this.ui.showContextMenu(screenX, screenY, plant);
  }

  private handlePruneConfirm(plant: Plant) {
    plant.prune();
  }

  private handlePruneCancel() {}
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
