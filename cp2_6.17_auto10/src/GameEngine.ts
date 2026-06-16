import type { GameState, TrackId, Note, GameSnapshot, HitEffect, HitResult, FlameEffect } from '@/types';
import { CONFIG, TRACK_COLORS } from '@/types';
import { audioManager } from '@/utils/AudioManager';
import { particleSystem } from '@/utils/ParticleSystem';

const TRACKS: TrackId[] = ['Q', 'W', 'E'];

export class GameEngine {
  private gameState: GameState = 'idle';
  private notes: Note[] = [];
  private score = 0;
  private combo = 0;
  private comboMultiplier = 1;
  private offeringProgress = 0;
  private hitEffects: HitEffect[] = [];
  private flameEffects: FlameEffect[] = [];
  private transitionProgress = 0;
  private victoryProgress = 0;
  private finalScore = 0;

  private waveTimer = 0;
  private noteIdCounter = 0;
  private effectIdCounter = 0;
  private running = false;
  private pendingTransition: GameState | null = null;

  private totemCenters: Array<{ x: number; y: number }> = [];

  constructor() {
    this.calculateTotemPositions();
  }

  private calculateTotemPositions(): void {
    const centerX = CONFIG.CANVAS_SIZE / 2;
    const centerY = CONFIG.CANVAS_SIZE / 2 + 20;
    const totalWidth = CONFIG.TOTEM_COUNT * CONFIG.TOTEM_WIDTH + (CONFIG.TOTEM_COUNT - 1) * CONFIG.TOTEM_SPACING;
    const startX = centerX - totalWidth / 2 + CONFIG.TOTEM_WIDTH / 2;

    this.totemCenters = TRACKS.map((_, i) => ({
      x: startX + i * (CONFIG.TOTEM_WIDTH + CONFIG.TOTEM_SPACING),
      y: centerY - CONFIG.TOTEM_HEIGHT / 2,
    }));
  }

  getTotemCenter(track: TrackId): { x: number; y: number } {
    const index = TRACKS.indexOf(track);
    return this.totemCenters[index];
  }

  start(): void {
    if (this.gameState !== 'idle' && this.gameState !== 'victory' && this.gameState !== 'defeat') return;

    this.reset();
    this.gameState = 'transition';
    this.pendingTransition = 'playing';
    this.transitionProgress = 0;
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  private reset(): void {
    this.notes = [];
    this.score = 0;
    this.combo = 0;
    this.comboMultiplier = 1;
    this.offeringProgress = 0;
    this.hitEffects = [];
    this.flameEffects = [];
    this.victoryProgress = 0;
    this.finalScore = 0;
    this.waveTimer = 0;
    this.noteIdCounter = 0;
    this.effectIdCounter = 0;
    particleSystem.clear();
  }

  handleKeyPress(key: string): void {
    const upperKey = key.toUpperCase() as TrackId;

    if (this.gameState === 'idle') {
      this.start();
      return;
    }

    if (this.gameState === 'victory' || this.gameState === 'defeat') {
      this.start();
      return;
    }

    if (this.gameState !== 'playing') return;

    if (!TRACKS.includes(upperKey)) return;

    this.processHit(upperKey);
  }

  private processHit(track: TrackId): void {
    const trackNotes = this.notes.filter(n => n.track === track && !n.hit && !n.missed);
    if (trackNotes.length === 0) {
      this.handleMiss(track);
      return;
    }

    const targetNote = trackNotes.reduce((closest, note) => {
      const closestDist = this.getDistanceToCenter(closest);
      const noteDist = this.getDistanceToCenter(note);
      return noteDist < closestDist ? note : closest;
    });

    const distance = this.getDistanceToCenter(targetNote);

    if (distance <= CONFIG.PERFECT_THRESHOLD) {
      this.handleHit(targetNote, 'perfect');
    } else if (distance <= CONFIG.NORMAL_THRESHOLD) {
      this.handleHit(targetNote, 'normal');
    } else {
      this.handleMiss(track);
    }
  }

  private getDistanceToCenter(note: Note): number {
    const angleFromCenter = Math.abs(note.angle - Math.PI);
    return (angleFromCenter / Math.PI) * CONFIG.ORBIT_RADIUS;
  }

  private handleHit(note: Note, result: HitResult): void {
    note.hit = true;

    const isPerfect = result === 'perfect';
    const baseScore = isPerfect ? CONFIG.PERFECT_SCORE : CONFIG.NORMAL_SCORE;
    const scoreGain = baseScore * this.comboMultiplier;

    this.score += scoreGain;

    if (isPerfect) {
      this.combo++;
      this.offeringProgress = Math.min(100, this.offeringProgress + CONFIG.PERFECT_OFFERING);

      if (this.combo >= CONFIG.COMBO_THRESHOLD) {
        this.comboMultiplier = 2;
      }

      const trackIndex = TRACKS.indexOf(note.track);
      let intensity = 0;
      if (this.combo >= 20) intensity = 2;
      else if (this.combo >= 10) intensity = 1.5;
      else if (this.combo >= 5) intensity = 1;

      if (intensity > 0) {
        const center = this.totemCenters[trackIndex];
        particleSystem.spawnFlameParticles(center.x, center.y, intensity);
        this.addFlameEffect(note.track, intensity);
      }
    } else {
      this.combo = 0;
      this.comboMultiplier = 1;
      this.offeringProgress = Math.min(100, this.offeringProgress + CONFIG.NORMAL_OFFERING);
    }

    this.addHitEffect(note.track, result);

    const center = this.getTotemCenter(note.track);
    particleSystem.spawnHitParticles(center.x, center.y, result);

    audioManager.playDrum(isPerfect);

    if (this.offeringProgress >= 100) {
      this.triggerVictory();
    }
  }

  private handleMiss(track: TrackId): void {
    this.combo = 0;
    this.comboMultiplier = 1;
    this.offeringProgress = Math.max(0, this.offeringProgress + CONFIG.MISS_OFFERING);
    this.addHitEffect(track, 'miss');
    audioManager.playMiss();

    if (this.offeringProgress <= 0) {
      this.triggerDefeat();
    }
  }

  private addHitEffect(track: TrackId, type: HitResult): void {
    this.hitEffects.push({
      id: `effect-${this.effectIdCounter++}`,
      track,
      type,
      time: 0,
      duration: 0.3,
    });
  }

  private addFlameEffect(track: TrackId, intensity: number): void {
    const existing = this.flameEffects.find(f => f.track === track);
    if (existing) {
      existing.intensity = Math.max(existing.intensity, intensity);
    } else {
      this.flameEffects.push({ track, intensity });
    }
  }

  private triggerVictory(): void {
    this.finalScore = this.score;
    this.gameState = 'transition';
    this.pendingTransition = 'victory';
    this.transitionProgress = 0;
    this.victoryProgress = 0;
    audioManager.playVictory();
  }

  private triggerDefeat(): void {
    this.finalScore = this.score;
    this.gameState = 'transition';
    this.pendingTransition = 'defeat';
    this.transitionProgress = 0;
    audioManager.playDefeat();
  }

  private spawnWave(): void {
    for (const track of TRACKS) {
      const angularSpeed = (CONFIG.NOTE_SPEED / CONFIG.ORBIT_RADIUS) * (180 / Math.PI) * (Math.PI / 180);

      this.notes.push({
        id: `note-${this.noteIdCounter++}`,
        track,
        angle: 0,
        speed: angularSpeed,
        hit: false,
        missed: false,
      });
    }
  }

  update(deltaTime: number): void {
    if (!this.running) return;

    particleSystem.update(deltaTime);

    if (this.gameState === 'transition') {
      this.transitionProgress += deltaTime / CONFIG.TRANSITION_DURATION;
      if (this.transitionProgress >= 1) {
        this.transitionProgress = 0;
        if (this.pendingTransition) {
          this.gameState = this.pendingTransition;
          this.pendingTransition = null;
        }
      }
      return;
    }

    if (this.gameState === 'victory') {
      this.victoryProgress += deltaTime / CONFIG.VICTORY_DURATION;
      return;
    }

    if (this.gameState === 'defeat') {
      return;
    }

    if (this.gameState !== 'playing') return;

    this.waveTimer += deltaTime;
    if (this.waveTimer >= CONFIG.WAVE_INTERVAL) {
      this.waveTimer = 0;
      this.spawnWave();
    }

    for (const note of this.notes) {
      if (!note.hit && !note.missed) {
        note.angle += note.speed * deltaTime;

        if (note.angle > Math.PI * 1.1) {
          note.missed = true;
          this.handleMiss(note.track);
        }
      }
    }

    this.notes = this.notes.filter(n => !n.hit || this.hitEffects.some(e => e.track === n.track && e.time < e.duration));

    for (let i = this.hitEffects.length - 1; i >= 0; i--) {
      this.hitEffects[i].time += deltaTime;
      if (this.hitEffects[i].time >= this.hitEffects[i].duration) {
        this.hitEffects.splice(i, 1);
      }
    }

    this.notes = this.notes.filter(n => !n.missed || n.angle < Math.PI * 1.3);
    this.flameEffects = this.flameEffects.filter(f => {
      f.intensity -= deltaTime * 2;
      return f.intensity > 0;
    });
  }

  getState(): GameSnapshot {
    return {
      notes: [...this.notes],
      score: this.score,
      combo: this.combo,
      comboMultiplier: this.comboMultiplier,
      offeringProgress: this.offeringProgress,
      gameState: this.gameState,
      hitEffects: [...this.hitEffects],
      flameEffects: [...this.flameEffects],
      transitionProgress: this.transitionProgress,
      victoryProgress: this.victoryProgress,
      finalScore: this.finalScore,
    };
  }
}

export const gameEngine = new GameEngine();
