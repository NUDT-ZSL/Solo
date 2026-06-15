import { BeatManager, LEVELS, Note, LevelConfig } from './BeatManager';
import { NoteRenderer } from './NoteRenderer';

export type GameState = 'menu' | 'playing' | 'paused' | 'transitioning' | 'levelComplete' | 'gameOver';

export interface GameStats {
  score: number;
  combo: number;
  maxCombo: number;
  perfect: number;
  good: number;
  miss: number;
  progress: number;
  level: number;
  levelName: string;
}

export type StatsCallback = (stats: GameStats) => void;
export type StateCallback = (state: GameState) => void;

const PERFECT_WINDOW = 0.08;
const GOOD_WINDOW = 0.15;
const MISS_WINDOW = 0.25;
const COMBO_TIDAL_THRESHOLD = 20;
const SCORE_PERFECT = 300;
const SCORE_GOOD = 100;
const DARK_OVERLAY_ON_MISS = 0.4;
const DARK_OVERLAY_DECAY = 0.92;

export class GameEngine {
  private beatManager: BeatManager;
  private renderer: NoteRenderer;
  private canvas: HTMLCanvasElement;
  private animFrameId = 0;
  private lastTimestamp = 0;
  private running = false;

  private state: GameState = 'menu';
  private currentLevel = 0;
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private perfectCount = 0;
  private goodCount = 0;
  private missCount = 0;
  private darkOverlay = 0;

  private transitionAlpha = 0;
  private transitionPhase: 'out' | 'in' | 'none' = 'none';
  private transitionCallback: (() => void) | null = null;

  private onStatsUpdate: StatsCallback | null = null;
  private onStateChange: StateCallback | null = null;

  private hitLineY = 0;
  private laneXs: number[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.renderer = new NoteRenderer(canvas);
    this.beatManager = new BeatManager(LEVELS[0]);
    this.updateLayout();
  }

  setStatsCallback(cb: StatsCallback): void {
    this.onStatsUpdate = cb;
  }

  setStateCallback(cb: StateCallback): void {
    this.onStateChange = cb;
  }

  private updateLayout(): void {
    this.hitLineY = this.canvas.height / (window.devicePixelRatio || 1) * 0.82;
    const config = this.beatManager.getConfig();
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    this.laneXs = [];
    for (let i = 0; i < this.beatManager.getLaneCount(); i++) {
      this.laneXs.push(this.beatManager.getLaneX(i, w));
    }
  }

  startLevel(levelIndex: number): void {
    this.currentLevel = levelIndex;
    const config = LEVELS[levelIndex];
    this.beatManager.reset(config);
    this.renderer.clear();
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.darkOverlay = 0;
    this.setState('playing');
    this.emitStats(config);
    this.startLoop();
  }

  startGame(): void {
    this.startLevel(0);
  }

  pause(): void {
    if (this.state !== 'playing') return;
    this.setState('paused');
    this.stopLoop();
  }

  resume(): void {
    if (this.state !== 'paused') return;
    this.setState('playing');
    this.startLoop();
  }

  returnToMenu(): void {
    this.stopLoop();
    this.setState('menu');
    this.renderer.clear();
    const ctx = this.canvas.getContext('2d')!;
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  nextLevel(): void {
    if (this.currentLevel + 1 < LEVELS.length) {
      this.startTransition(() => {
        this.startLevel(this.currentLevel + 1);
      });
    } else {
      this.setState('gameOver');
      this.stopLoop();
    }
  }

  private startTransition(callback: () => void): void {
    this.transitionPhase = 'out';
    this.transitionAlpha = 0;
    this.transitionCallback = callback;
    this.setState('transitioning');
  }

  handleInput(clientX: number, clientY: number): void {
    if (this.state !== 'playing') return;

    const rect = this.canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    const activeNotes = this.beatManager.getActiveNotes(MISS_WINDOW);
    const elapsed = this.beatManager.getElapsed();

    let bestNote: Note | null = null;
    let bestDiff = Infinity;
    let bestDist = Infinity;

    for (const note of activeNotes) {
      if (note.hit || note.missed) continue;
      const nx = this.laneXs[note.lane] || 0;
      const timeDiff = Math.abs(elapsed - note.time);
      const approachTime = 2.0;
      const progress = 1 - (note.time - elapsed) / approachTime;
      const ny = progress * this.hitLineY;

      const dist = Math.sqrt((x - nx) ** 2 + (y - ny) ** 2);
      const hitRadius = note.radius * 2.5;

      if (dist < hitRadius && timeDiff < bestDiff) {
        bestNote = note;
        bestDiff = timeDiff;
        bestDist = dist;
      }
    }

    if (bestNote && bestDiff <= MISS_WINDOW) {
      const nx = this.laneXs[bestNote.lane] || 0;
      const approachTime = 2.0;
      const progress = 1 - (bestNote.time - elapsed) / approachTime;
      const ny = progress * this.hitLineY;

      bestNote.hit = true;

      if (bestDiff <= PERFECT_WINDOW) {
        this.combo++;
        this.score += SCORE_PERFECT * (1 + Math.floor(this.combo / 10) * 0.1);
        this.perfectCount++;
      } else if (bestDiff <= GOOD_WINDOW) {
        this.combo++;
        this.score += SCORE_GOOD * (1 + Math.floor(this.combo / 10) * 0.1);
        this.goodCount++;
      } else {
        this.combo = 0;
        this.missCount++;
        this.renderer.triggerShake(8);
        this.darkOverlay = DARK_OVERLAY_ON_MISS;
      }

      if (this.combo > this.maxCombo) this.maxCombo = this.combo;

      this.renderer.addRipple(nx, ny, bestNote.color);

      if (this.combo > 0 && this.combo % COMBO_TIDAL_THRESHOLD === 0) {
        this.renderer.triggerTidalBurst(this.beatManager.getConfig().noteColors);
      }
    }

    this.emitStats(this.beatManager.getConfig());
  }

  resize(): void {
    this.renderer.resize();
    this.updateLayout();
  }

  private emitStats(config: LevelConfig): void {
    this.onStatsUpdate?.({
      score: Math.floor(this.score),
      combo: this.combo,
      maxCombo: this.maxCombo,
      perfect: this.perfectCount,
      good: this.goodCount,
      miss: this.missCount,
      progress: this.beatManager.getProgress(),
      level: this.currentLevel + 1,
      levelName: config.name,
    });
  }

  private setState(s: GameState): void {
    this.state = s;
    this.onStateChange?.(s);
  }

  private startLoop(): void {
    if (this.running) return;
    this.running = true;
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  private stopLoop(): void {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
  }

  private loop = (timestamp: number): void => {
    if (!this.running) return;

    const rawDt = (timestamp - this.lastTimestamp) / 1000;
    const dt = Math.min(rawDt, 1 / 30);
    this.lastTimestamp = timestamp;

    if (this.state === 'transitioning') {
      this.updateTransition(dt);
    }

    if (this.state === 'playing') {
      this.beatManager.update(dt);

      const elapsed = this.beatManager.getElapsed();
      const allNotes = this.beatManager.getAllNotes();

      for (const note of allNotes) {
        if (!note.hit && !note.missed && elapsed - note.time > MISS_WINDOW) {
          note.missed = true;
          this.combo = 0;
          this.missCount++;
          this.renderer.triggerShake(6);
          this.darkOverlay = DARK_OVERLAY_ON_MISS;
        }
      }

      this.darkOverlay *= DARK_OVERLAY_DECAY;
      if (this.darkOverlay < 0.01) this.darkOverlay = 0;
      this.renderer.setDarkOverlay(this.darkOverlay);

      if (this.beatManager.isLevelComplete()) {
        this.setState('levelComplete');
        this.emitStats(this.beatManager.getConfig());
      }

      this.emitStats(this.beatManager.getConfig());
    }

    const config = this.beatManager.getConfig();
    this.renderer.render(
      this.beatManager.getAllNotes(),
      config,
      this.beatManager.getElapsed(),
      this.hitLineY,
      this.laneXs
    );

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private updateTransition(dt: number): void {
    const speed = 2.0;
    if (this.transitionPhase === 'out') {
      this.transitionAlpha += dt * speed;
      if (this.transitionAlpha >= 1) {
        this.transitionAlpha = 1;
        this.transitionPhase = 'in';
        this.transitionCallback?.();
        this.transitionCallback = null;
      }
    } else if (this.transitionPhase === 'in') {
      this.transitionAlpha -= dt * speed;
      if (this.transitionAlpha <= 0) {
        this.transitionAlpha = 0;
        this.transitionPhase = 'none';
        this.setState('playing');
      }
    }
    this.renderer.setFadeAlpha(this.transitionAlpha);
  }

  getState(): GameState {
    return this.state;
  }

  getLevels() {
    return LEVELS;
  }

  destroy(): void {
    this.stopLoop();
    this.onStatsUpdate = null;
    this.onStateChange = null;
  }
}
