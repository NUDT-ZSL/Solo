import * as THREE from 'three';

export type AnimationMode = 'idle' | 'explode' | 'spiral' | 'wave' | 'shuffle';

export interface ParticleTextOptions {
  text: string;
  particlesPerLetter?: [number, number];
  color: string;
  size?: number;
  maxParticles?: number;
  zOffsetRange?: [number, number];
}

interface ParticleTextCallbacks {
  onParticleCountChange?: (count: number) => void;
  onFpsUpdate?: (fps: number) => void;
}

const PRESET_COLORS: Record<string, string> = {
  cyan: '#22d3ee',
  magenta: '#e879f9',
  gold: '#fcd34d',
  lime: '#a3e635',
};

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function pickRandomPresetColor(): string {
  const keys = Object.keys(PRESET_COLORS);
  return PRESET_COLORS[keys[Math.floor(Math.random() * keys.length)]];
}

export class ParticleText {
  private scene: THREE.Scene;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private spriteTexture: THREE.Texture | null = null;

  private text: string;
  private particlesPerLetter: [number, number];
  private maxParticles: number;
  private zOffsetRange: [number, number];

  private particleCount: number = 0;

  private targetPositions: Float32Array = new Float32Array();
  private currentPositions: Float32Array = new Float32Array();
  private startPositions: Float32Array = new Float32Array();
  private tempPositions: Float32Array = new Float32Array();

  private shuffledIndices: Int32Array = new Int32Array();

  private animationMode: AnimationMode = 'idle';
  private previousMode: AnimationMode = 'idle';
  private animationElapsed: number = 0;
  private transitionElapsed: number = 0;
  private transitionDuration: number = 0.5;
  private isTransitioning: boolean = false;
  private speedMultiplier: number = 1;

  private explodePhase: 'out' | 'in' = 'out';
  private explodeRadius: number = 0;

  private spiralRandomOffsets: Float32Array = new Float32Array();

  private lastFrameTime: number = 0;
  private fpsAccumulator: number = 0;
  private fpsFrameCount: number = 0;

  private callbacks: ParticleTextCallbacks;

  constructor(
    scene: THREE.Scene,
    options: ParticleTextOptions,
    callbacks: ParticleTextCallbacks = {}
  ) {
    this.scene = scene;
    this.text = options.text || 'HELLO';
    this.particlesPerLetter = options.particlesPerLetter || [600, 800];
    this.zOffsetRange = options.zOffsetRange || [0, 3];
    this.maxParticles = options.maxParticles || 10000;
    this.callbacks = callbacks;

    this.createSpriteTexture();
    this.buildParticles(options.color || pickRandomPresetColor(), options.size || 2);
  }

  private createSpriteTexture(): void {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(
      size / 2, size / 2, 0,
      size / 2, size / 2, size / 2
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    this.spriteTexture = new THREE.CanvasTexture(canvas);
    this.spriteTexture.needsUpdate = true;
  }

  private sampleTextPositions(text: string): { positions: Float32Array; count: number } {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;

    const fontSize = 200;
    const padding = 40;
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    const metrics = ctx.measureText(text || ' ');
    const textWidth = Math.ceil(metrics.width) + padding * 2;
    const textHeight = fontSize * 1.4 + padding * 2;
    canvas.width = textWidth;
    canvas.height = textHeight;

    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${fontSize}px Arial, Helvetica, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.fillText(text || ' ', padding, textHeight / 2);

    const imageData = ctx.getImageData(0, 0, textWidth, textHeight);
    const data = imageData.data;

    const letterCount = Math.max(1, (text || ' ').replace(/\s/g, '').length);
    const minPerLetter = Math.floor(
      this.particlesPerLetter[0] +
      Math.random() * (this.particlesPerLetter[1] - this.particlesPerLetter[0])
    ));
    const targetCount = Math.min(letterCount * minPerLetter, this.maxParticles);

    const whitePixels: Array<[number, number]> = [];

    for (let y = 0; y < textHeight; y += 2) {
      for (let x = 0; x < textWidth; x += 2) {
        const idx = (y * textWidth + x) * 4;
        if (data[idx + 3] > 128) {
          whitePixels.push([x, y]);
        }
      }
    }

    const positions = new Float32Array(targetCount * 3);
    const actualCount = Math.min(targetCount, whitePixels.length);
    const step = Math.max(1, Math.floor(whitePixels.length / actualCount));

    const centerX = textWidth / 2;
    const centerY = textHeight / 2;
    const scale = 0.04;

    for (let i = 0; i < actualCount; i++) {
      const pixelIdx = (i * step) % whitePixels.length;
      const [px, py] = whitePixels[pixelIdx];
      const jitterX = (Math.random() - 0.5) * 1.5;
      const jitterY = (Math.random() - 0.5) * 1.5;
      positions[i * 3] = (px - centerX + jitterX) * scale;
      positions[i * 3 + 1] = -(py - centerY + jitterY) * scale;
      positions[i * 3 + 2] = Math.random() * (this.zOffsetRange[1] - this.zOffsetRange[0]) + this.zOffsetRange[0];
    }

    for (let i = actualCount; i < targetCount; i++) {
      const [px, py] = whitePixels[Math.floor(Math.random() * whitePixels.length)];
      const jitterX = (Math.random() - 0.5) * 2;
      const jitterY = (Math.random() - 0.5) * 2;
      positions[i * 3] = (px - centerX + jitterX) * scale;
      positions[i * 3 + 1] = -(py - centerY + jitterY) * scale;
      positions[i * 3 + 2] = Math.random() * (this.zOffsetRange[1] - this.zOffsetRange[0]) + this.zOffsetRange[0];
    }

    return { positions, count: targetCount };
  }

  private buildParticles(color: string, size: number): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.geometry?.dispose();
      this.material?.dispose();
    }

    const { positions, count } = this.sampleTextPositions(this.text);
    this.particleCount = count;

    this.targetPositions = positions;
    this.currentPositions = new Float32Array(positions);
    this.startPositions = new Float32Array(positions);
    this.tempPositions = new Float32Array(positions.length);
    this.spiralRandomOffsets = new Float32Array(count * 3);
    this.shuffledIndices = new Int32Array(count);

    for (let i = 0; i < count; i++) {
      this.shuffledIndices[i] = i;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 15 + Math.random() * 10;
      this.spiralRandomOffsets[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      this.spiralRandomOffsets[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.spiralRandomOffsets[i * 3 + 2] = r * Math.cos(phi);
    }

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));

    this.material = new THREE.PointsMaterial({
      size: size,
      color: new THREE.Color(color),
      map: this.spriteTexture!,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.animationMode = 'spiral';
    this.animationElapsed = 0;
    this.transitionElapsed = 0;
    this.isTransitioning = false;
    this.callbacks.onParticleCountChange?.(this.particleCount);
  }

  public setText(text: string): void {
    const trimmed = text.trim();
    if (trimmed === this.text) return;
    this.text = trimmed;
    const color = this.material?.color.getHexString();
    const size = this.material?.size || 2;
    this.buildParticles('#' + color, size);
  }

  public setAnimation(mode: AnimationMode): void {
    if (mode === this.animationMode && !this.isTransitioning) return;
    this.startPositions.set(this.currentPositions);
    this.previousMode = this.animationMode;
    this.animationMode = mode;
    this.animationElapsed = 0;
    this.transitionElapsed = 0;
    this.isTransitioning = true;

    if (mode === 'explode') {
      this.explodePhase = 'out';
      this.explodeRadius = 0;
    }
    if (mode === 'shuffle') {
      this.reshuffleIndices();
    }
  }

  private reshuffleIndices(): void {
    const n = this.shuffledIndices.length;
    for (let i = n - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.shuffledIndices[i], this.shuffledIndices[j]] = [this.shuffledIndices[j], this.shuffledIndices[i]];
    }
  }

  public setColor(hex: string): void {
    if (this.material) {
      this.material.color.set(hex);
    }
  }

  public setSize(size: number): void {
    if (this.material) {
      this.material.size = Math.max(0.5, Math.min(10, size));
    }
  }

  public setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.1, Math.min(5, multiplier));
  }

  private updateIdlePositions(time: number): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const breath = Math.sin(time * 1.5 + this.targetPositions[i3] * 3) * 0.06;
      this.tempPositions[i3] = this.targetPositions[i3] + breath * 0.3;
      this.tempPositions[i3 + 1] = this.targetPositions[i3 + 1] + breath * 0.3;
      this.tempPositions[i3 + 2] = this.targetPositions[i3 + 2] + breath;
    }
  }

  private updateExplodePositions(time: number): void {
    const totalDuration = 1.5;
    const phaseDuration = totalDuration;

    const t = Math.min(1, this.animationElapsed / phaseDuration);
    const eased = easeInOutCubic(t);

    if (t >= 1) {
      if (this.explodePhase === 'out') {
        this.explodePhase = 'in';
        this.animationElapsed = 0;
        this.startPositions.set(this.tempPositions);
      } else {
        this.explodePhase = 'out';
        this.animationElapsed = 0;
        this.startPositions.set(this.targetPositions);
        this.animationMode = 'idle';
        this.isTransitioning = true;
        this.previousMode = 'explode';
        this.transitionElapsed = 0;
        return;
      }
    }

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const tx = this.targetPositions[i3];
      const ty = this.targetPositions[i3 + 1];
      const tz = this.targetPositions[i3 + 2];

      const dirX = tx !== 0 || ty !== 0 || tz !== 0
        ? tx
        : (Math.random() - 0.5);
      const dirY = ty !== 0 || tx !== 0 || tz !== 0
        ? ty
        : (Math.random() - 0.5);
      const dirZ = tz !== 0 || tx !== 0 || ty !== 0
        ? tz
        : (Math.random() - 0.5);
      const len = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ) || 1;
      const nx = dirX / len;
      const ny = dirY / len;
      const nz = dirZ / len;

      const dist = 12 + (i % 17) * 0.3;

      if (this.explodePhase === 'out') {
        this.tempPositions[i3] = lerp(this.startPositions[i3], tx + nx * dist, eased);
        this.tempPositions[i3 + 1] = lerp(this.startPositions[i3 + 1], ty + ny * dist, eased);
        this.tempPositions[i3 + 2] = lerp(this.startPositions[i3 + 2], tz + nz * dist, eased);
      } else {
        this.tempPositions[i3] = lerp(this.startPositions[i3], tx, eased);
        this.tempPositions[i3 + 1] = lerp(this.startPositions[i3 + 1], ty, eased);
        this.tempPositions[i3 + 2] = lerp(this.startPositions[i3 + 2], tz, eased);
      }
    }
  }

  private updateSpiralPositions(time: number): void {
    const totalDuration = 2.0;
    const t = Math.min(1, this.animationElapsed / totalDuration);
    const eased = easeInOutCubic(t);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      const tx = this.targetPositions[i3];
      const ty = this.targetPositions[i3 + 1];
      const tz = this.targetPositions[i3 + 2];

      const sx = this.spiralRandomOffsets[i3];
      const sy = this.spiralRandomOffsets[i3 + 1];
      const sz = this.spiralRandomOffsets[i3 + 2];

      const angle = (1 - eased) * (Math.PI * 3 + (i % 13) * 0.2);
      const radiusLerp = 1 - eased;

      const rotatedX = sx * Math.cos(angle) - sy * Math.sin(angle);
      const rotatedY = sx * Math.sin(angle) + sy * Math.cos(angle);

      this.tempPositions[i3] = lerp(rotatedX, tx, eased);
      this.tempPositions[i3 + 1] = lerp(rotatedY, ty, eased);
      this.tempPositions[i3 + 2] = lerp(sz * radiusLerp, tz, eased);
    }

    if (t >= 1 && !this.isTransitioning) {
      this.animationMode = 'idle';
    }
  }

  private updateWavePositions(time: number): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const tx = this.targetPositions[i3];
      const ty = this.targetPositions[i3 + 1];
      const tz = this.targetPositions[i3 + 2];

      const phase = tx * 1.2 + time * 2.5;
      const waveY = Math.sin(phase) * 0.6;
      const waveZ = Math.cos(phase * 0.7) * 0.25;

      this.tempPositions[i3] = tx + Math.sin(time * 1.2 + tx * 0.5) * 0.1;
      this.tempPositions[i3 + 1] = ty + waveY;
      this.tempPositions[i3 + 2] = tz + waveZ;
    }
  }

  private updateShufflePositions(time: number): void {
    const totalDuration = 2.5;
    const t = Math.min(1, this.animationElapsed / totalDuration);
    const eased = easeInOutCubic(t);

    if (eased < 0.85) {
      const subT = eased / 0.85;
      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        const si = this.shuffledIndices[i] * 3;

        const ox = this.targetPositions[si];
        const oy = this.targetPositions[si + 1];
        const oz = this.targetPositions[si + 2];

        const tx = this.targetPositions[i3];
        const ty = this.targetPositions[i3 + 1];
        const tz = this.targetPositions[i3 + 2];

        const jump = Math.sin(subT * Math.PI) * 3;

        this.tempPositions[i3] = lerp(tx, ox, easeInOutCubic(subT));
        this.tempPositions[i3 + 1] = lerp(ty, oy, easeInOutCubic(subT)) + jump;
        this.tempPositions[i3 + 2] = lerp(tz, oz, easeInOutCubic(subT)) + jump * 0.5;
      }
    } else {
      const subT = (eased - 0.85) / 0.15;
      const subEased = easeInOutCubic(subT);
      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        const si = this.shuffledIndices[i] * 3;

        const ox = this.targetPositions[si];
        const oy = this.targetPositions[si + 1];
        const oz = this.targetPositions[si + 2];

        const tx = this.targetPositions[i3];
        const ty = this.targetPositions[i3 + 1];
        const tz = this.targetPositions[i3 + 2];

        this.tempPositions[i3] = lerp(ox, tx, subEased);
        this.tempPositions[i3 + 1] = lerp(oy, ty, subEased);
        this.tempPositions[i3 + 2] = lerp(oz, tz, subEased);
      }
    }
  }

  public update(rawDelta: number): void {
    if (!this.geometry) return;

    const delta = rawDelta * this.speedMultiplier;
    this.animationElapsed += delta;
    if (this.isTransitioning) {
      this.transitionElapsed += delta;
    }

    const time = this.animationElapsed;

    switch (this.animationMode) {
      case 'idle':
        this.updateIdlePositions(time);
        break;
      case 'explode':
        this.updateExplodePositions(time);
        break;
      case 'spiral':
        this.updateSpiralPositions(time);
        break;
      case 'wave':
        this.updateWavePositions(time);
        break;
      case 'shuffle':
        this.updateShufflePositions(time);
        break;
    }

    if (this.isTransitioning) {
      const t = Math.min(1, this.transitionElapsed / this.transitionDuration);
      const eased = easeInOutCubic(t);
      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;
        this.currentPositions[i3] = lerp(this.startPositions[i3], this.tempPositions[i3], eased);
        this.currentPositions[i3 + 1] = lerp(this.startPositions[i3 + 1], this.tempPositions[i3 + 1], eased);
        this.currentPositions[i3 + 2] = lerp(this.startPositions[i3 + 2], this.tempPositions[i3 + 2], eased);
      }
      if (t >= 1) {
        this.isTransitioning = false;
        this.currentPositions.set(this.tempPositions);
      }
    } else {
      this.currentPositions.set(this.tempPositions);
    }

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    positionAttr.needsUpdate = true;

    this.fpsFrameCount++;
    this.fpsAccumulator += rawDelta;
    if (this.fpsAccumulator >= 0.5) {
      const fps = Math.round(this.fpsFrameCount / this.fpsAccumulator);
      this.callbacks.onFpsUpdate?.(fps);
      this.fpsFrameCount = 0;
      this.fpsAccumulator = 0;
    }
  }

  public dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
    }
    this.geometry?.dispose();
    this.material?.dispose();
    this.spriteTexture?.dispose();
  }
}

export const PRESET_COLOR_MAP = PRESET_COLORS;
