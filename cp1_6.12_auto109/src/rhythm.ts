import { AudioManager } from './audio';
import { BEAT_INTERVAL, Particle, TILE_SIZE } from './entities';

export type AttackResult = 'perfect' | 'good' | 'miss';

export interface BeatEvent {
  beatIndex: number;
  time: number;
  progress: number;
}

export class RhythmManager {
  private audio: AudioManager;
  private perfectWindow: number = 80;
  private goodWindow: number = 180;
  private perfectCombo: number = 0;
  private maxCombo: number = 0;
  private totalAttacks: number = 0;
  private perfectHits: number = 0;
  private goodHits: number = 0;
  private beatCount: number = 0;
  private lastBeatIndex: number = -1;
  private beatProgress: number = 0;
  private onBeatListeners: Array<(e: BeatEvent) => void> = [];
  private particles: Particle[] = [];
  private screenShake: number = 0;
  private screenShakeDuration: number = 0;
  private flashColor: string | null = null;
  private flashAlpha: number = 0;
  private flashDuration: number = 0;

  constructor(audio: AudioManager) {
    this.audio = audio;
    this.audio.onBeat((idx, time) => this.handleBeat(idx, time));
  }

  private handleBeat(beatIndex: number, time: number): void {
    this.beatCount = beatIndex;
    this.lastBeatIndex = beatIndex;
    const event: BeatEvent = {
      beatIndex,
      time,
      progress: 0
    };
    for (const listener of this.onBeatListeners) {
      try {
        listener(event);
      } catch (e) {
        console.error('Beat listener error:', e);
      }
    }
  }

  onBeatEvent(callback: (e: BeatEvent) => void): void {
    this.onBeatListeners.push(callback);
  }

  offBeatEvent(callback: (e: BeatEvent) => void): void {
    const idx = this.onBeatListeners.indexOf(callback);
    if (idx >= 0) this.onBeatListeners.splice(idx, 1);
  }

  update(dt: number): void {
    this.beatProgress = this.audio.getBeatProgress();

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 0.2 * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.screenShakeDuration > 0) {
      this.screenShakeDuration -= dt;
      if (this.screenShakeDuration <= 0) {
        this.screenShake = 0;
      }
    }

    if (this.flashDuration > 0) {
      this.flashDuration -= dt;
      if (this.flashDuration <= 0) {
        this.flashColor = null;
        this.flashAlpha = 0;
      } else {
        this.flashAlpha = this.flashDuration / 200;
      }
    }
  }

  evaluateAttack(): { result: AttackResult; damageMultiplier: number } {
    this.totalAttacks++;
    const timeFromLast = this.audio.getTimeFromLastBeat();
    const timeToNext = this.audio.getTimeToNextBeat();
    const offset = Math.min(timeFromLast, timeToNext);

    if (this.audio.activeShield && offset > this.goodWindow) {
      return { result: 'perfect', damageMultiplier: 2 };
    }

    if (offset <= this.perfectWindow) {
      this.perfectHits++;
      this.perfectCombo++;
      this.maxCombo = Math.max(this.maxCombo, this.perfectCombo);
      return { result: 'perfect', damageMultiplier: 2 };
    } else if (offset <= this.goodWindow) {
      this.goodHits++;
      this.perfectCombo = 0;
      return { result: 'good', damageMultiplier: 1 };
    } else {
      this.perfectCombo = 0;
      return { result: 'miss', damageMultiplier: 0.5 };
    }
  }

  evaluateMove(): { result: AttackResult; canMove: boolean } {
    const timeFromLast = this.audio.getTimeFromLastBeat();
    const timeToNext = this.audio.getTimeToNextBeat();
    const offset = Math.min(timeFromLast, timeToNext);

    if (offset <= this.goodWindow) {
      if (offset <= this.perfectWindow) {
        return { result: 'perfect', canMove: true };
      }
      return { result: 'good', canMove: true };
    }

    const beatProg = this.audio.getBeatProgress();
    if (beatProg > 0.7 || beatProg < 0.1) {
      return { result: 'good', canMove: true };
    }

    return { result: 'miss', canMove: false };
  }

  createNoteParticles(x: number, y: number, isPerfect: boolean): void {
    const colors = isPerfect
      ? ['#ff6b6b', '#ffd700', '#4ecdc4', '#ff9ff3', '#54a0ff', '#5f27cd']
      : ['#aaa', '#888', '#ccc'];
    const count = isPerfect ? 20 : 8;

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 600 + Math.random() * 400,
        maxLife: 1000,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: isPerfect ? 4 + Math.random() * 4 : 2 + Math.random() * 2
      });
    }
  }

  createHitParticles(x: number, y: number, color: string = '#ff6b6b'): void {
    for (let i = 0; i < 12; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 300 + Math.random() * 200,
        maxLife: 500,
        color,
        size: 3 + Math.random() * 3
      });
    }
  }

  createDeathParticles(x: number, y: number): void {
    for (let i = 0; i < 30; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 400 + Math.random() * 200,
        maxLife: 600,
        color: i % 3 === 0 ? '#ffd700' : i % 3 === 1 ? '#4ecdc4' : '#ff6b6b',
        size: 3 + Math.random() * 5
      });
    }
  }

  createExplosionParticles(x: number, y: number): void {
    for (let i = 0; i < 50; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 8;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 500 + Math.random() * 300,
        maxLife: 800,
        color: ['#ff6b6b', '#ffa502', '#ffd700', '#ff4757'][Math.floor(Math.random() * 4)],
        size: 4 + Math.random() * 8
      });
    }
  }

  triggerScreenShake(intensity: number, duration: number): void {
    this.screenShake = intensity;
    this.screenShakeDuration = duration;
  }

  triggerFlash(color: string, duration: number = 200): void {
    this.flashColor = color;
    this.flashDuration = duration;
    this.flashAlpha = 1;
  }

  getBeatPulse(): number {
    const prog = this.beatProgress;
    return Math.pow(Math.sin(prog * Math.PI), 0.5);
  }

  getBreathScale(): number {
    return 1 + this.getBeatPulse() * 0.02;
  }

  getChestRotationOffset(): number {
    return this.beatProgress * 5;
  }

  getComboFillRatio(): number {
    const capped = Math.min(this.perfectCombo, 5);
    return capped / 5;
  }

  isComboMaxed(): boolean {
    return this.perfectCombo > 0 && this.perfectCombo % 5 === 0;
  }

  getComboFlashAlpha(): number {
    if (!this.isComboMaxed()) return 0;
    const t = this.beatProgress;
    return Math.pow(Math.sin(t * Math.PI), 2) * 0.8;
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  getScreenShake(): { x: number; y: number } {
    if (this.screenShakeDuration <= 0 || this.screenShake <= 0) {
      return { x: 0, y: 0 };
    }
    const t = this.screenShakeDuration / 200;
    const mag = this.screenShake * t;
    return {
      x: (Math.random() - 0.5) * mag * 2,
      y: (Math.random() - 0.5) * mag * 2
    };
  }

  getFlash(): { color: string; alpha: number } | null {
    if (!this.flashColor || this.flashAlpha <= 0) return null;
    return { color: this.flashColor, alpha: this.flashAlpha };
  }

  getPerfectCombo(): number {
    return this.perfectCombo;
  }

  resetCombo(): void {
    this.perfectCombo = 0;
  }

  getStats(): {
    total: number;
    perfect: number;
    good: number;
    maxCombo: number;
    accuracy: number;
  } {
    const total = this.totalAttacks || 1;
    return {
      total: this.totalAttacks,
      perfect: this.perfectHits,
      good: this.goodHits,
      maxCombo: this.maxCombo,
      accuracy: ((this.perfectHits + this.goodHits * 0.5) / total) * 100
    };
  }

  clearParticles(): void {
    this.particles = [];
  }
}
