import {
  RGB,
  Vec2,
  hsvToRgb,
  lerp,
  smoothLerp,
  smoothLerpVec2,
  randomRange,
  randomInt,
  clamp,
  distance,
  normalize,
  sinWave,
  SpeedCalculator,
  createSpeedCalculator,
  updateSpeed,
  mixRgb
} from './utils';
import { Renderer, BlockRenderData } from './render';

enum BlockState {
  Trailing,
  Bursting,
  Gathering
}

interface Block {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  burstOriginX: number;
  burstOriginY: number;
  burstTargetX: number;
  burstTargetY: number;
  size: number;
  baseSize: number;
  color: RGB;
  alpha: number;
  baseAlpha: number;
  delay: number;
  birthTime: number;
  hue: number;
  state: BlockState;
  burstStartTime: number;
  burstDuration: number;
  gatherProgress: number;
  brightnessBoost: number;
  glow: boolean;
  offsetFromCenter: number;
  angleOffset: number;
  trailPhase: number;
}

export interface SpectrumConfig {
  bandWidth: number;
  hueFromX: boolean;
  minBlockSize: number;
  maxBlockSize: number;
  smoothing: number;
  speedThreshold: number;
  burstRadius: number;
  burstDuration: number;
  gatherSpeed: number;
  blocksPerSpawn: number;
  maxBlocks: number;
  alphaPeriod: number;
  alphaMin: number;
  alphaMax: number;
  pulsePeriod: number;
  pulseMin: number;
  pulseMax: number;
}

const DEFAULT_CONFIG: SpectrumConfig = {
  bandWidth: 150,
  hueFromX: true,
  minBlockSize: 2,
  maxBlockSize: 6,
  smoothing: 10,
  speedThreshold: 300,
  burstRadius: 100,
  burstDuration: 500,
  gatherSpeed: 3,
  blocksPerSpawn: 8,
  maxBlocks: 2000,
  alphaPeriod: 6000,
  alphaMin: 0.3,
  alphaMax: 0.8,
  pulsePeriod: 2000,
  pulseMin: 0.8,
  pulseMax: 1.2
};

export class Spectrum {
  private blocks: Block[] = [];
  private nextBlockId = 0;
  private mouse: Vec2 = { x: 0, y: 0 };
  private smoothedMouse: Vec2 = { x: 0, y: 0 };
  private isMouseDown = false;
  private isMouseInside = false;
  private speedCalc: SpeedCalculator;
  private currentSpeed = 0;
  private lastSpawnTime = 0;
  private spawnInterval = 8;
  private config: SpectrumConfig;
  private renderer: Renderer;
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    renderer: Renderer,
    width: number,
    height: number,
    config: Partial<SpectrumConfig> = {}
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.renderer = renderer;
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.speedCalc = createSpeedCalculator({ x: width / 2, y: height / 2 }, 0);
  }

  public setSize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public onMouseMove(x: number, y: number, time: number): void {
    this.mouse.x = x;
    this.mouse.y = y;
    this.isMouseInside = true;
    this.currentSpeed = updateSpeed(this.speedCalc, { x, y }, time);
  }

  public onMouseDown(): void {
    this.isMouseDown = true;
    this.triggerBrightnessBurst(1.5, 600);
  }

  public onMouseUp(): void {
    this.isMouseDown = false;
  }

  public onMouseEnter(x: number, y: number, time: number): void {
    this.isMouseInside = true;
    this.mouse.x = x;
    this.mouse.y = y;
    this.smoothedMouse.x = x;
    this.smoothedMouse.y = y;
    this.speedCalc = createSpeedCalculator({ x, y }, time);
    this.triggerBrightnessBurst(0.8, 400);
  }

  public onMouseLeave(): void {
    this.isMouseInside = false;
  }

  private triggerBrightnessBurst(intensity: number, duration: number): void {
    for (const block of this.blocks) {
      block.brightnessBoost = Math.max(block.brightnessBoost, intensity);
      block.glow = true;
      setTimeout(() => {
        block.brightnessBoost = Math.max(0, block.brightnessBoost - intensity * 0.5);
      }, duration * 0.5);
      setTimeout(() => {
        block.glow = false;
      }, duration);
    }
  }

  public update(time: number, dt: number): void {
    const dtSec = dt / 1000;

    this.smoothedMouse = smoothLerpVec2(
      this.smoothedMouse,
      this.mouse,
      this.config.smoothing,
      dtSec
    );

    if (this.isMouseInside) {
      const timeSinceLastSpawn = time - this.lastSpawnTime;
      if (timeSinceLastSpawn >= this.spawnInterval) {
        this.spawnBlocks(time);
        this.lastSpawnTime = time;
      }
    }

    this.checkAndTriggerBurst(time);
    this.updateBlocks(time, dtSec);
    this.cleanupOldBlocks();
  }

  private spawnBlocks(time: number): void {
    const count = this.config.blocksPerSpawn +
      Math.floor(this.currentSpeed / 200);

    for (let i = 0; i < count; i++) {
      if (this.blocks.length >= this.config.maxBlocks) break;

      const size = randomRange(this.config.minBlockSize, this.config.maxBlockSize);
      const hue = this.config.hueFromX
        ? (this.smoothedMouse.x / this.canvasWidth) * 360 + randomRange(-10, 10)
        : (time / 50) % 360;

      const normalizedHue = ((hue % 360) + 360) % 360;
      const sat = randomRange(0.7, 1);
      const val = randomRange(0.7, 1);
      const color = hsvToRgb(normalizedHue, sat, val);

      const offsetFromCenter = randomRange(-this.config.bandWidth / 2, this.config.bandWidth / 2);
      const angleOffset = randomRange(0, Math.PI * 2);

      this.blocks.push({
        id: this.nextBlockId++,
        x: this.smoothedMouse.x,
        y: this.smoothedMouse.y,
        targetX: this.smoothedMouse.x,
        targetY: this.smoothedMouse.y,
        burstOriginX: this.smoothedMouse.x,
        burstOriginY: this.smoothedMouse.y,
        burstTargetX: this.smoothedMouse.x,
        burstTargetY: this.smoothedMouse.y,
        size,
        baseSize: size,
        color,
        alpha: randomRange(0.5, 0.9),
        baseAlpha: randomRange(0.5, 0.9),
        delay: randomRange(0, 150),
        birthTime: time,
        hue: normalizedHue,
        state: BlockState.Trailing,
        burstStartTime: 0,
        burstDuration: this.config.burstDuration,
        gatherProgress: 0,
        brightnessBoost: this.isMouseDown ? 1.2 : 0.3,
        glow: false,
        offsetFromCenter,
        angleOffset,
        trailPhase: randomRange(0, Math.PI * 2)
      });
    }
  }

  private checkAndTriggerBurst(time: number): void {
    if (this.currentSpeed < this.config.speedThreshold) return;
    if (!this.isMouseInside) return;

    const burstRatio = clamp(
      (this.currentSpeed - this.config.speedThreshold) / 500,
      0.1,
      0.4
    );

    for (const block of this.blocks) {
      if (block.state !== BlockState.Trailing) continue;

      const distFromMouse = distance(
        { x: block.x, y: block.y },
        this.smoothedMouse
      );

      if (distFromMouse < this.config.bandWidth * 1.5 && Math.random() < burstRatio) {
        this.triggerBlockBurst(block, time);
      }
    }
  }

  private triggerBlockBurst(block: Block, time: number): void {
    block.state = BlockState.Bursting;
    block.burstStartTime = time;
    block.burstOriginX = block.x;
    block.burstOriginY = block.y;

    const angle = randomRange(0, Math.PI * 2);
    const dist = randomRange(30, this.config.burstRadius);
    block.burstTargetX = block.x + Math.cos(angle) * dist;
    block.burstTargetY = block.y + Math.sin(angle) * dist;
    block.brightnessBoost = 1.5;
    block.glow = true;
  }

  private updateBlocks(time: number, dtSec: number): void {
    const alphaMultiplier = sinWave(
      this.config.alphaMin,
      this.config.alphaMax,
      this.config.alphaPeriod,
      time
    );
    const sizeMultiplier = sinWave(
      this.config.pulseMin,
      this.config.pulseMax,
      this.config.pulsePeriod,
      time
    );

    for (const block of this.blocks) {
      block.alpha = block.baseAlpha * alphaMultiplier;
      block.size = block.baseSize * sizeMultiplier;

      if (block.brightnessBoost > 0) {
        block.brightnessBoost = Math.max(0, block.brightnessBoost - dtSec * 1.5);
      }
      if (block.brightnessBoost <= 0.2) {
        block.glow = false;
      }

      switch (block.state) {
        case BlockState.Trailing:
          this.updateTrailingBlock(block, time, dtSec);
          break;
        case BlockState.Bursting:
          this.updateBurstingBlock(block, time);
          break;
        case BlockState.Gathering:
          this.updateGatheringBlock(block, time, dtSec);
          break;
      }
    }

    this.mixBurstColors(time);
  }

  private updateTrailingBlock(block: Block, time: number, dtSec: number): void {
    const age = time - block.birthTime;
    const delayedAge = Math.max(0, age - block.delay);
    const delayFactor = clamp(delayedAge / 200, 0, 1);

    const waveOffset = Math.sin((time / 300) + block.trailPhase) * 15;
    const perpAngle = Math.atan2(
      this.mouse.y - this.smoothedMouse.y,
      this.mouse.x - this.smoothedMouse.x
    ) + Math.PI / 2;

    const offsetX = Math.cos(perpAngle + block.angleOffset) *
      block.offsetFromCenter * 0.3 +
      Math.cos(block.angleOffset) * waveOffset * 0.5;
    const offsetY = Math.sin(perpAngle + block.angleOffset) *
      block.offsetFromCenter * 0.3 +
      Math.sin(block.angleOffset) * waveOffset * 0.5;

    block.targetX = this.smoothedMouse.x + offsetX;
    block.targetY = this.smoothedMouse.y + offsetY;

    const smoothing = this.config.smoothing * delayFactor;
    block.x = smoothLerp(block.x, block.targetX, smoothing, dtSec);
    block.y = smoothLerp(block.y, block.targetY, smoothing, dtSec);
  }

  private updateBurstingBlock(block: Block, time: number): void {
    const elapsed = time - block.burstStartTime;
    const progress = clamp(elapsed / block.burstDuration, 0, 1);

    const easeOut = 1 - Math.pow(1 - progress, 3);

    block.x = lerp(block.burstOriginX, block.burstTargetX, easeOut);
    block.y = lerp(block.burstOriginY, block.burstTargetY, easeOut);

    block.brightnessBoost = Math.max(block.brightnessBoost, 0.8 * (1 - easeOut));

    if (progress >= 1) {
      block.state = BlockState.Gathering;
      block.burstStartTime = time;
      block.gatherProgress = 0;
    }
  }

  private updateGatheringBlock(block: Block, time: number, dtSec: number): void {
    block.gatherProgress = clamp(
      block.gatherProgress + dtSec * this.config.gatherSpeed,
      0,
      1
    );

    const easeInOut = block.gatherProgress < 0.5
      ? 2 * block.gatherProgress * block.gatherProgress
      : 1 - Math.pow(-2 * block.gatherProgress + 2, 2) / 2;

    block.x = lerp(block.burstTargetX, this.smoothedMouse.x, easeInOut);
    block.y = lerp(block.burstTargetY, this.smoothedMouse.y, easeInOut);

    block.brightnessBoost = Math.max(block.brightnessBoost, 0.3 * (1 - easeInOut));

    if (block.gatherProgress >= 1) {
      block.state = BlockState.Trailing;
    }
  }

  private mixBurstColors(time: number): void {
    const gatheringBlocks = this.blocks.filter(b => b.state === BlockState.Gathering);

    for (let i = 0; i < gatheringBlocks.length; i++) {
      for (let j = i + 1; j < gatheringBlocks.length; j++) {
        const a = gatheringBlocks[i];
        const b = gatheringBlocks[j];

        const dist = distance({ x: a.x, y: a.y }, { x: b.x, y: b.y });
        if (dist < 30 && Math.random() < 0.02) {
          const mixT = 0.3;
          const origColorA = { ...a.color };
          a.color = mixRgb(a.color, b.color, mixT);
          b.color = mixRgb(b.color, origColorA, mixT);
        }
      }
    }
  }

  private cleanupOldBlocks(): void {
    if (this.blocks.length <= this.config.maxBlocks) return;

    this.blocks.sort((a, b) => b.birthTime - a.birthTime);
    this.blocks = this.blocks.slice(0, this.config.maxBlocks);
  }

  public render(): void {
    const renderData: BlockRenderData[] = this.blocks.map(block => ({
      x: block.x,
      y: block.y,
      size: block.size,
      color: block.color,
      alpha: block.alpha,
      glow: block.glow || block.brightnessBoost > 0.5,
      brightnessBoost: block.brightnessBoost
    }));

    const sortedData = renderData.sort((a, b) => a.alpha - b.alpha);

    this.renderer.drawGlowComposite(sortedData, 1.2);
    this.renderer.drawBlocks(sortedData);
  }

  public getBlockCount(): number {
    return this.blocks.length;
  }

  public getSpeed(): number {
    return this.currentSpeed;
  }
}
