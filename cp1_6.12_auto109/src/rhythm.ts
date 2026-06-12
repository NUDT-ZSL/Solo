import { AudioManager } from './audio';
import {
  Particle,
  TILE_SIZE,
  BEAT_WINDOW_PERFECT,
  BEAT_WINDOW_GOOD,
  BeatAccuracy
} from './entities';

export interface RhythmBeatEvent {
  beatIndex: number;
  audioTime: number;
  progress: number;
}

type BeatEventListener = (event: RhythmBeatEvent) => void;
type AttackEvaluator = (result: BeatAccuracy, damageMultiplier: number) => void;

export class RhythmManager {
  private audio: AudioManager;
  private unregisterAudioCallback: (() => void) | null = null;

  private beatEventListeners: BeatEventListener[] = [];
  private attackListeners: AttackEvaluator[] = [];
  private currentBeatIndex: number = -1;
  private beatProgress: number = 0;

  private particles: Particle[] = [];
  private screenShakeX: number = 0;
  private screenShakeY: number = 0;
  private screenShakeTime: number = 0;
  private screenShakeIntensity: number = 0;

  private flashColor: string | null = null;
  private flashAlpha: number = 0;
  private flashTotal: number = 0;
  private flashTime: number = 0;

  private comboBarFlash: boolean = false;
  private comboBarFlashTime: number = 0;
  private comboBarFlashDuration: number = 300;
  private lastFlashComboCount: number = -1;

  constructor(audio: AudioManager) {
    this.audio = audio;
  }

  start(): void {
    this.stop();
    this.unregisterAudioCallback = this.audio.registerBeatCallback(
      (beatIndex, audioTime) => this.handleAudioBeat(beatIndex, audioTime)
    );
  }

  stop(): void {
    if (this.unregisterAudioCallback) {
      this.unregisterAudioCallback();
      this.unregisterAudioCallback = null;
    }
    this.currentBeatIndex = -1;
    this.particles = [];
    this.screenShakeTime = 0;
    this.flashTime = 0;
    this.comboBarFlash = false;
    this.comboBarFlashTime = 0;
    this.lastFlashComboCount = -1;
  }

  resetForNewGame(): void {
    this.currentBeatIndex = -1;
    this.particles = [];
    this.screenShakeTime = 0;
    this.flashTime = 0;
    this.comboBarFlash = false;
    this.comboBarFlashTime = 0;
    this.lastFlashComboCount = -1;
  }

  private handleAudioBeat(beatIndex: number, audioTime: number): void {
    this.currentBeatIndex = beatIndex;

    const event: RhythmBeatEvent = {
      beatIndex,
      audioTime,
      progress: 0
    };
    for (const listener of this.beatEventListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Rhythm beat listener error:', e);
      }
    }
  }

  addBeatListener(listener: BeatEventListener): () => void {
    if (this.beatEventListeners.indexOf(listener) === -1) {
      this.beatEventListeners.push(listener);
    }
    return () => this.removeBeatListener(listener);
  }

  removeBeatListener(listener: BeatEventListener): void {
    const idx = this.beatEventListeners.indexOf(listener);
    if (idx >= 0) this.beatEventListeners.splice(idx, 1);
  }

  addAttackListener(listener: AttackEvaluator): () => void {
    if (this.attackListeners.indexOf(listener) === -1) {
      this.attackListeners.push(listener);
    }
    return () => {
      const idx = this.attackListeners.indexOf(listener);
      if (idx >= 0) this.attackListeners.splice(idx, 1);
    };
  }

  update(dt: number): void {
    this.beatProgress = this.audio.getBeatProgress();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * (dt / 16);
      p.y += p.vy * (dt / 16);
      p.vy += 0.12 * (dt / 16);
      p.vx *= 0.99;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.screenShakeTime > 0) {
      this.screenShakeTime -= dt;
      const t = this.screenShakeTime > 0 ? this.screenShakeTime / this.flashTotal : 0;
      const mag = this.screenShakeIntensity * t;
      this.screenShakeX = (Math.random() * 2 - 1) * mag;
      this.screenShakeY = (Math.random() * 2 - 1) * mag;
      if (this.screenShakeTime <= 0) {
        this.screenShakeX = 0;
        this.screenShakeY = 0;
      }
    }

    if (this.flashTime > 0) {
      this.flashTime -= dt;
      if (this.flashTime <= 0) {
        this.flashColor = null;
        this.flashAlpha = 0;
      } else {
        this.flashAlpha = Math.max(0, this.flashTime / this.flashTotal);
      }
    }
  }

  evaluateAttack(shieldActive: boolean): { result: BeatAccuracy; multiplier: number } {
    let result: BeatAccuracy;
    let multiplier: number;

    const offset = this.audio.getBeatOffsetMs();
    const absOffset = Math.abs(offset);

    if (shieldActive && absOffset > BEAT_WINDOW_GOOD) {
      result = 'perfect';
      multiplier = 2;
    } else if (absOffset <= BEAT_WINDOW_PERFECT) {
      result = 'perfect';
      multiplier = 2;
    } else if (absOffset <= BEAT_WINDOW_GOOD) {
      result = 'good';
      multiplier = 1;
    } else {
      result = 'miss';
      multiplier = 0.5;
    }

    for (const listener of this.attackListeners) {
      try {
        listener(result, multiplier);
      } catch (e) {
        console.error('Attack listener error:', e);
      }
    }

    return { result, multiplier };
  }

  updateComboBarState(perfectStreak: number): void {
    const currentThreshold = Math.floor(perfectStreak / 5);
    if (perfectStreak > 0 &&
        perfectStreak % 5 === 0 &&
        currentThreshold !== this.lastFlashComboCount) {
      this.comboBarFlash = true;
      this.comboBarFlashTime = this.comboBarFlashDuration;
      this.lastFlashComboCount = currentThreshold;
    }

    if (this.comboBarFlashTime > 0) {
      this.comboBarFlashTime -= 16;
      if (this.comboBarFlashTime <= 0) {
        this.comboBarFlash = false;
      }
    }
  }

  getComboBarState(): { flash: boolean; flashAlpha: number } {
    if (!this.comboBarFlash) {
      return { flash: false, flashAlpha: 0 };
    }
    const alpha = this.comboBarFlashTime > 0
      ? Math.sin((1 - this.comboBarFlashTime / this.comboBarFlashDuration) * Math.PI)
      : 0;
    return { flash: true, flashAlpha: alpha };
  }

  createNoteParticles(x: number, y: number, isPerfect: boolean): void {
    const colors = isPerfect
      ? ['#ff6b6b', '#ffd700', '#4ecdc4', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3']
      : ['#c8d6e5', '#8395a7', '#a4b0be'];
    const count = isPerfect ? 24 : 10;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.6;
      const speed = (isPerfect ? 3 : 1.8) + Math.random() * 3;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 8,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (isPerfect ? 2 : 1),
        life: 500 + Math.random() * 600,
        maxLife: 1100,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isPerfect ? 3 + Math.random() * 4 : 2 + Math.random() * 2
      });
    }
  }

  createHitParticles(x: number, y: number, color: string = '#ff6b6b', count: number = 14): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 250 + Math.random() * 250,
        maxLife: 500,
        color,
        size: 2 + Math.random() * 3
      });
    }
  }

  createDeathParticles(x: number, y: number): void {
    const colors = ['#ff6b6b', '#ffd700', '#4ecdc4', '#ff9ff3'];
    for (let i = 0; i < 36; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 6;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1.5,
        life: 350 + Math.random() * 250,
        maxLife: 600,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 5
      });
    }
  }

  createExplosionParticles(x: number, y: number): void {
    const colors = ['#ff6b6b', '#ffa502', '#ffd700', '#ff4757', '#ff6348'];
    for (let i = 0; i < 60; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 9;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500 + Math.random() * 400,
        maxLife: 900,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 4 + Math.random() * 8
      });
    }
  }

  createChestParticles(x: number, y: number): void {
    const colors = ['#ffd700', '#feca57', '#ff9ff3', '#48dbfb'];
    for (let i = 0; i < 18; i++) {
      const angle = (Math.PI * 2 * i) / 18 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 400 + Math.random() * 300,
        maxLife: 700,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 3 + Math.random() * 3
      });
    }
  }

  triggerScreenShake(intensity: number, duration: number): void {
    this.screenShakeIntensity = intensity;
    this.screenShakeTime = duration;
    this.flashTotal = duration;
  }

  triggerFlash(color: string, duration: number = 200): void {
    this.flashColor = color;
    this.flashTotal = duration;
    this.flashTime = duration;
    this.flashAlpha = 1;
  }

  getBeatIndex(): number {
    return this.currentBeatIndex;
  }

  getBeatProgress(): number {
    return this.beatProgress;
  }

  getBreathScale(): number {
    return 1 + Math.pow(Math.sin(this.beatProgress * Math.PI), 0.5) * 0.02;
  }

  getScreenShake(): { x: number; y: number } {
    return { x: this.screenShakeX, y: this.screenShakeY };
  }

  getFlash(): { color: string; alpha: number } | null {
    if (!this.flashColor || this.flashAlpha <= 0) return null;
    return { color: this.flashColor, alpha: Math.min(1, this.flashAlpha) };
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getParticlesSorted(): Particle[] {
    return [...this.particles].sort((a, b) => a.life - b.life);
  }

  clearParticles(): void {
    this.particles = [];
  }
}
