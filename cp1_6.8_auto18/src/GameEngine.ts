import { DrumManager, type ParticleData } from './DrumManager';
import {
  getLevels,
  generateBeatSequence,
  getHitWindow,
  type BeatEvent,
  type LevelConfig,
} from './BeatAnalyzer';

export type GamePhase = 'menu' | 'countdown' | 'playing' | 'levelComplete' | 'gameOver';

export interface GameSettings {
  musicVolume: number;
  sfxVolume: number;
  latencyOffset: number;
}

export interface GameSnapshot {
  phase: GamePhase;
  level: LevelConfig | null;
  score: number;
  highScore: number;
  combo: number;
  maxCombo: number;
  progress: number;
  countdownValue: number;
  lastHitQuality: 'perfect' | 'good' | 'miss' | null;
  pillarStates: ReturnType<DrumManager['getState']>;
  settings: GameSettings;
}

type GameListener = (snapshot: GameSnapshot) => void;

const SCORE_MAP = { perfect: 300, good: 100, miss: 0 };
const COMBO_BONUS = 10;

export class GameEngine {
  private phase: GamePhase = 'menu';
  private currentLevel: LevelConfig | null = null;
  private levelIndex: number = 0;
  private score: number = 0;
  private highScore: number = 0;
  private combo: number = 0;
  private maxCombo: number = 0;
  private progress: number = 0;
  private countdownValue: number = 3;

  private drumManager: DrumManager;
  private beatSequence: BeatEvent[] = [];
  private beatIndex: number = 0;
  private hitWindow: number = 200;

  private startTime: number = 0;
  private lastFrameTime: number = 0;
  private animFrameId: number = 0;

  private settings: GameSettings = {
    musicVolume: 0.5,
    sfxVolume: 0.7,
    latencyOffset: 0,
  };

  private lastHitQuality: 'perfect' | 'good' | 'miss' | null = null;
  private listeners: Set<GameListener> = new Set();
  private running: boolean = false;

  constructor() {
    this.drumManager = new DrumManager(9);
    this.loadHighScore();
  }

  private loadHighScore(): void {
    try {
      const saved = localStorage.getItem('drumRhythmTotem_highScore');
      if (saved) this.highScore = parseInt(saved, 10) || 0;
    } catch {
      // ignore
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem('drumRhythmTotem_highScore', String(this.highScore));
    } catch {
      // ignore
    }
  }

  subscribe(listener: GameListener): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  private emit(): void {
    const snapshot: GameSnapshot = {
      phase: this.phase,
      level: this.currentLevel,
      score: this.score,
      highScore: this.highScore,
      combo: this.combo,
      maxCombo: this.maxCombo,
      progress: this.progress,
      countdownValue: this.countdownValue,
      lastHitQuality: this.lastHitQuality,
      pillarStates: this.drumManager.getState(),
      settings: { ...this.settings },
    };
    this.listeners.forEach((l) => l(snapshot));
  }

  getSettings(): GameSettings {
    return { ...this.settings };
  }

  updateSettings(patch: Partial<GameSettings>): void {
    if (patch.musicVolume !== undefined) {
      this.settings.musicVolume = patch.musicVolume;
      this.drumManager.setMusicVolume(patch.musicVolume);
    }
    if (patch.sfxVolume !== undefined) {
      this.settings.sfxVolume = patch.sfxVolume;
      this.drumManager.setSfxVolume(patch.sfxVolume);
    }
    if (patch.latencyOffset !== undefined) {
      this.settings.latencyOffset = Math.max(-100, Math.min(100, patch.latencyOffset));
    }
    this.emit();
  }

  startGame(): void {
    const levels = getLevels();
    this.levelIndex = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.startLevel(levels[0]);
  }

  private startLevel(level: LevelConfig): void {
    this.currentLevel = level;
    this.phase = 'countdown';
    this.countdownValue = 3;
    this.progress = 0;
    this.beatIndex = 0;
    this.lastHitQuality = null;

    this.drumManager.resize(level.pillarCount);
    this.beatSequence = generateBeatSequence(level);
    this.hitWindow = getHitWindow(level.bpm);

    this.emit();

    this.runCountdown();
  }

  private runCountdown(): void {
    let count = 3;
    const tick = () => {
      this.countdownValue = count;
      this.emit();
      if (count > 0) {
        count--;
        setTimeout(tick, 1000);
      } else {
        this.beginPlaying();
      }
    };
    tick();
  }

  private beginPlaying(): void {
    this.phase = 'playing';
    this.startTime = performance.now();
    this.lastFrameTime = this.startTime;
    this.running = true;
    this.emit();
    this.loop();
  }

  private loop = (): void => {
    if (!this.running) return;

    const now = performance.now();
    const dt = now - this.lastFrameTime;
    this.lastFrameTime = now;
    const elapsed = now - this.startTime;

    this.processBeats(elapsed);
    this.checkMissedBeats(elapsed);

    this.drumManager.tickMetronome(elapsed, this.currentLevel!.bpm, 0);
    this.drumManager.update(dt);

    if (this.currentLevel) {
      this.progress = Math.min(elapsed / this.currentLevel.duration, 1.0);
    }

    if (this.progress >= 1.0) {
      this.completeLevel();
      return;
    }

    this.emit();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private processBeats(elapsed: number): void {
    if (!this.currentLevel) return;
    const beatInterval = 60000 / this.currentLevel.bpm;
    const previewAhead = beatInterval;

    while (this.beatIndex < this.beatSequence.length) {
      const beat = this.beatSequence[this.beatIndex];
      const previewTime = beat.time - previewAhead;

      if (elapsed >= previewTime && elapsed < beat.time) {
        this.drumManager.triggerPreview(beat.pillarIndex, beat);
        this.beatIndex++;
      } else if (elapsed >= beat.time) {
        this.drumManager.activatePillar(beat.pillarIndex);
        this.beatIndex++;
      } else {
        break;
      }
    }
  }

  private checkMissedBeats(elapsed: number): void {
    if (!this.currentLevel) return;
    const state = this.drumManager.getState();
    for (const pillar of state.pillars) {
      if (pillar.state === 'active' && pillar.pendingBeat) {
        const diff = elapsed - pillar.pendingBeat.time;
        if (diff > this.hitWindow * 1.5) {
          this.onMiss(pillar.index);
        }
      }
    }
  }

  handlePillarClick(pillarIndex: number): void {
    if (this.phase !== 'playing') return;
    const now = performance.now();
    const elapsed = now - this.startTime;

    const result = this.drumManager.tryHit(
      pillarIndex,
      elapsed,
      this.hitWindow,
      this.settings.latencyOffset
    );

    if (result === 'perfect') {
      this.onPerfect(pillarIndex);
    } else if (result === 'good') {
      this.onGood(pillarIndex);
    } else if (result === 'miss') {
      this.onMiss(pillarIndex);
    }
  }

  private onPerfect(_pillarIndex: number): void {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.score += SCORE_MAP.perfect + this.combo * COMBO_BONUS;
    this.lastHitQuality = 'perfect';
    if (this.combo > 1) {
      this.drumManager.spawnComboParticles(this.combo);
    }
    this.updateHighScore();
  }

  private onGood(_pillarIndex: number): void {
    this.combo++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.score += SCORE_MAP.good + this.combo * COMBO_BONUS;
    this.lastHitQuality = 'good';
    if (this.combo > 3) {
      this.drumManager.spawnComboParticles(this.combo);
    }
    this.updateHighScore();
  }

  private onMiss(_pillarIndex: number): void {
    this.drumManager.handleMiss(_pillarIndex);
    this.combo = 0;
    this.lastHitQuality = 'miss';
  }

  private updateHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      this.saveHighScore();
    }
  }

  private completeLevel(): void {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    this.phase = 'levelComplete';
    this.emit();

    const levels = getLevels();
    this.levelIndex++;
    if (this.levelIndex < levels.length) {
      setTimeout(() => {
        this.startLevel(levels[this.levelIndex]);
      }, 2000);
    } else {
      setTimeout(() => {
        this.phase = 'gameOver';
        this.emit();
      }, 2000);
    }
  }

  pause(): void {
    if (this.phase !== 'playing') return;
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
  }

  resume(): void {
    if (this.phase !== 'playing') return;
    this.running = true;
    this.lastFrameTime = performance.now();
    this.loop();
  }

  backToMenu(): void {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    this.phase = 'menu';
    this.currentLevel = null;
    this.drumManager.reset();
    this.emit();
  }

  retryLevel(): void {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    if (this.currentLevel) {
      this.startLevel(this.currentLevel);
    }
  }

  getParticles(): ParticleData[] {
    return this.drumManager.getState().particles;
  }

  destroy(): void {
    this.running = false;
    cancelAnimationFrame(this.animFrameId);
    this.listeners.clear();
  }
}
