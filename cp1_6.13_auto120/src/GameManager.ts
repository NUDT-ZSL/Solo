import { audioEngine, BeatSchedule } from './audioEngine';
import { networkManager } from './NetworkManager';

export type GameState = 'idle' | 'playing' | 'ended';

export interface Character {
  x: number;
  y: number;
  vy: number;
  isJumping: boolean;
  rotation: number;
  onGround: boolean;
  width: number;
  height: number;
}

export interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  passed: boolean;
}

export interface Note {
  x: number;
  y: number;
  collected: boolean;
  size: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameStateData {
  state: GameState;
  score: number;
  character: Character;
  obstacles: Obstacle[];
  notes: Note[];
  particles: Particle[];
  beatSchedule: BeatSchedule | null;
  currentBeatIndex: number;
  progress: number;
  glowActive: boolean;
  glowAlpha: number;
  combo: number;
  lastLanding: 'none' | 'perfect' | 'good' | 'miss';
  songId: string | null;
  songName: string;
  bpm: number;
}

export type Difficulty = 'easy' | 'normal' | 'hard';

const DIFFICULTY_MULTIPLIER: Record<Difficulty, number> = {
  easy: 0.8,
  normal: 1.0,
  hard: 1.2,
};

class GameManager {
  private gameState: GameState = 'idle';
  private score: number = 0;
  private combo: number = 0;
  private character!: Character;
  private obstacles: Obstacle[] = [];
  private notes: Note[] = [];
  private particles: Particle[] = [];
  private beatSchedule: BeatSchedule | null = null;
  private currentBeatIndex: number = -1;
  private lastProcessedBeat: number = -1;
  private canvasWidth: number = 800;
  private canvasHeight: number = 500;
  private groundY: number = 400;
  private gameSpeed: number = 200;
  private difficulty: Difficulty = 'normal';
  private beatInterval: number = 0.5;
  private jumpDuration: number = 0;
  private jumpStartTime: number = 0;
  private jumpHeight: number = 120;
  private landPressed: boolean = false;
  private landTime: number = 0;
  private glowActive: boolean = false;
  private glowTime: number = 0;
  private glowDuration: number = 0.5;
  private lastLanding: 'none' | 'perfect' | 'good' | 'miss' = 'none';
  private songId: string | null = null;
  private songName: string = '';
  private bpm: number = 120;
  private onScoreUpdate?: (score: number) => void;
  private onGameEnd?: (score: number) => void;
  private lastFrameTime: number = 0;

  init(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.groundY = canvasHeight - 100;
    this.resetCharacter();
  }

  private resetCharacter(): void {
    this.character = {
      x: 150,
      y: this.groundY - 40,
      vy: 0,
      isJumping: false,
      rotation: 0,
      onGround: true,
      width: 30,
      height: 40,
    };
  }

  setDifficulty(diff: Difficulty): void {
    this.difficulty = diff;
  }

  getDifficulty(): Difficulty {
    return this.difficulty;
  }

  async loadSong(songId: string, songName: string, beats: number[], bpm: number, duration: number, audioUrl: string): Promise<void> {
    this.songId = songId;
    this.songName = songName;
    this.bpm = bpm;
    this.beatInterval = 60 / bpm;
    this.jumpDuration = this.beatInterval;
    this.gameSpeed = (150 + bpm * 1.5) * DIFFICULTY_MULTIPLIER[this.difficulty];
    this.beatSchedule = audioEngine.getBeatSchedule(beats, bpm, duration);
    this.currentBeatIndex = -1;
    this.lastProcessedBeat = -1;
    this.score = 0;
    this.combo = 0;
    this.obstacles = [];
    this.notes = [];
    this.particles = [];
    this.glowActive = false;
    this.lastLanding = 'none';
    this.resetCharacter();

    await audioEngine.loadSong(audioUrl);
  }

  start(): void {
    if (!this.beatSchedule) return;
    this.gameState = 'playing';
    this.lastFrameTime = performance.now();
    audioEngine.play();
  }

  pause(): void {
    this.gameState = 'idle';
    audioEngine.pause();
  }

  stop(): void {
    this.gameState = 'idle';
    audioEngine.stop();
    this.resetCharacter();
    this.obstacles = [];
    this.notes = [];
    this.particles = [];
    this.score = 0;
    this.combo = 0;
    this.currentBeatIndex = -1;
    this.lastProcessedBeat = -1;
  }

  handleJumpPress(): void {
    if (this.gameState !== 'playing') return;
    if (this.character.isJumping && !this.landPressed) {
      this.landPressed = true;
      this.landTime = audioEngine.getCurrentTime();
    }
  }

  setOnScoreUpdate(callback: (score: number) => void): void {
    this.onScoreUpdate = callback;
  }

  setOnGameEnd(callback: (score: number) => void): void {
    this.onGameEnd = callback;
  }

  update(): void {
    if (this.gameState !== 'playing') return;

    const now = audioEngine.getCurrentTime();
    const progress = audioEngine.getProgress();

    if (progress >= 1 && this.gameState === 'playing') {
      this.endGame();
      return;
    }

    this.checkBeats(now);
    this.updateCharacter(now);
    this.updateObstacles();
    this.updateNotes();
    this.updateParticles();
    this.checkCollisions();
    this.checkNoteCollection();
    this.updateGlow();
  }

  private checkBeats(currentTime: number): void {
    if (!this.beatSchedule) return;

    const beats = this.beatSchedule.beats;
    for (let i = this.lastProcessedBeat + 1; i < beats.length; i++) {
      if (currentTime >= beats[i]) {
        this.onBeat(i, beats[i]);
        this.lastProcessedBeat = i;
      } else {
        break;
      }
    }
  }

  private onBeat(beatIndex: number, beatTime: number): void {
    this.currentBeatIndex = beatIndex;
    this.spawnObstacle();
    if (beatIndex % 2 === 0 || Math.random() > 0.4) {
      this.spawnNote();
    }

    if (!this.character.isJumping && this.character.onGround) {
      this.startJump(beatTime);
    }
  }

  private startJump(beatTime: number): void {
    this.character.isJumping = true;
    this.character.onGround = false;
    this.jumpStartTime = beatTime;
    this.landPressed = false;
    this.landTime = 0;
  }

  private updateCharacter(currentTime: number): void {
    if (!this.beatSchedule) return;

    if (this.character.isJumping) {
      const elapsed = currentTime - this.jumpStartTime;
      const progress = Math.min(elapsed / this.jumpDuration, 1);

      const jumpProgress = progress * Math.PI;
      const heightRatio = Math.sin(jumpProgress);
      this.character.y = this.groundY - this.character.height - heightRatio * this.jumpHeight;

      const targetRotation = this.landPressed ? 0 : (progress * 360);
      this.character.rotation = targetRotation;

      if (progress >= 1) {
        this.landCharacter();
      }
    } else {
      this.character.y = this.groundY - this.character.height;
      this.character.rotation = 0;
    }
  }

  private landCharacter(): void {
    this.character.isJumping = false;
    this.character.onGround = true;
    this.character.y = this.groundY - this.character.height;
    this.character.rotation = 0;

    if (this.landPressed && this.beatSchedule) {
      const idealLandTime = this.jumpStartTime + this.jumpDuration;
      const diff = Math.abs(this.landTime - idealLandTime);
      const window = this.beatInterval * 0.1;

      if (diff <= window) {
        this.lastLanding = 'perfect';
        this.score += 25;
        this.activateGlow();
        this.spawnCollectParticles(this.character.x + this.character.width / 2, this.character.y + this.character.height, '#facc15');
      } else {
        this.lastLanding = 'good';
        this.score += 10;
      }
      this.combo++;
    } else {
      this.lastLanding = 'miss';
      this.combo = 0;
    }

    this.onScoreUpdate?.(this.score);
  }

  private activateGlow(): void {
    this.glowActive = true;
    this.glowTime = 0;
  }

  private updateGlow(): void {
    if (!this.glowActive) return;
    this.glowTime += 1 / 60;
    if (this.glowTime >= this.glowDuration) {
      this.glowActive = false;
    }
  }

  getGlowAlpha(): number {
    if (!this.glowActive) return 0;
    const progress = this.glowTime / this.glowDuration;
    return 0.3 + Math.sin(progress * Math.PI * 4) * 0.25 + 0.25;
  }

  private spawnObstacle(): void {
    const obstacle: Obstacle = {
      x: this.canvasWidth + 50,
      y: this.groundY - 50,
      width: 30,
      height: 50,
      passed: false,
    };
    this.obstacles.push(obstacle);
  }

  private spawnNote(): void {
    const noteHeightVariants = [this.groundY - 80, this.groundY - 130, this.groundY - 180];
    const y = noteHeightVariants[Math.floor(Math.random() * noteHeightVariants.length)];
    const note: Note = {
      x: this.canvasWidth + 50 + Math.random() * 100,
      y,
      collected: false,
      size: 20,
    };
    this.notes.push(note);
  }

  private updateObstacles(): void {
    const dt = 1 / 60;
    for (const obs of this.obstacles) {
      obs.x -= this.gameSpeed * dt;
      if (!obs.passed && obs.x + obs.width < this.character.x) {
        obs.passed = true;
      }
    }
    this.obstacles = this.obstacles.filter(o => o.x > -100);
  }

  private updateNotes(): void {
    const dt = 1 / 60;
    for (const note of this.notes) {
      note.x -= this.gameSpeed * dt;
    }
    this.notes = this.notes.filter(n => n.x > -100 && !n.collected);
  }

  private updateParticles(): void {
    const dt = 1 / 60;
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private spawnCollectParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const speed = 100 + Math.random() * 100;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color,
        size: 4,
      });
    }
  }

  private checkCollisions(): void {
    if (!this.character.isJumping) return;

    const charLeft = this.character.x;
    const charRight = this.character.x + this.character.width;
    const charTop = this.character.y;
    const charBottom = this.character.y + this.character.height;

    for (const obs of this.obstacles) {
      const obsLeft = obs.x;
      const obsRight = obs.x + obs.width;
      const obsTop = obs.y;

      if (charRight > obsLeft && charLeft < obsRight && charBottom > obsTop && this.character.y + this.character.height > this.groundY - 50) {
        this.combo = 0;
      }
    }
  }

  private checkNoteCollection(): void {
    const charCenterX = this.character.x + this.character.width / 2;
    const charCenterY = this.character.y + this.character.height / 2;

    for (const note of this.notes) {
      if (note.collected) continue;
      const dx = charCenterX - note.x;
      const dy = charCenterY - note.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < this.character.width / 2 + note.size / 2) {
        note.collected = true;
        this.score += 15;
        this.spawnCollectParticles(note.x, note.y, '#facc15');
        this.onScoreUpdate?.(this.score);
      }
    }
  }

  private endGame(): void {
    this.gameState = 'ended';
    audioEngine.stop();
    this.onGameEnd?.(this.score);
  }

  getState(): GameStateData {
    return {
      state: this.gameState,
      score: this.score,
      character: { ...this.character },
      obstacles: this.obstacles.map(o => ({ ...o })),
      notes: this.notes.map(n => ({ ...n })),
      particles: this.particles.map(p => ({ ...p })),
      beatSchedule: this.beatSchedule,
      currentBeatIndex: this.currentBeatIndex,
      progress: audioEngine.getProgress(),
      glowActive: this.glowActive,
      glowAlpha: this.getGlowAlpha(),
      combo: this.combo,
      lastLanding: this.lastLanding,
      songId: this.songId,
      songName: this.songName,
      bpm: this.bpm,
    };
  }

  getScore(): number {
    return this.score;
  }

  getSongId(): string | null {
    return this.songId;
  }

  async submitScore(playerName: string): Promise<{ success: boolean; entry: any } | null> {
    if (!this.songId) return null;
    return networkManager.submitScore(playerName, this.score, this.songId);
  }
}

export const gameManager = new GameManager();
