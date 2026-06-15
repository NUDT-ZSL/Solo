import { RhythmGenerator, Direction } from './rhythm';

export type HitGrade = 'perfect' | 'good' | 'miss';

export interface Star {
  id: number;
  direction: Direction;
  color: string;
  spawnTime: number;
  hitTime: number;
  flightDuration: number;
  progress: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  x: number;
  y: number;
  alive: boolean;
  isMiss: boolean;
  fadeOut: number;
}

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  life: number;
  maxLife: number;
  size: number;
}

export interface Trail {
  id: number;
  x: number;
  y: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface Shard {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface GameState {
  stars: Star[];
  particles: Particle[];
  trails: Trail[];
  shards: Shard[];
  score: number;
  combo: number;
  maxCombo: number;
  comboAnim: number;
  flashAlpha: number;
  flashColor: string;
  shakeX: number;
  shakeY: number;
  shakeTime: number;
  paused: boolean;
  pulsePhase: number;
  lastHitGrade: HitGrade | null;
  lastHitTime: number;
  canvasWidth: number;
  canvasHeight: number;
}

const DIRECTION_COLORS: Record<Direction, string> = {
  up: '#88ff88',
  down: '#88ccff',
  left: '#ff88cc',
  right: '#ffcc88'
};

const MAX_PARTICLES = 200;
const STAR_RADIUS = 18;
const MISS_WINDOW_AFTER = 120;

let idCounter = 0;
const nextId = (): number => ++idCounter;

export class Game {
  public rhythm: RhythmGenerator;
  public state: GameState;
  private paused: boolean = false;
  private pauseButtonRect: { x: number; y: number; r: number } = { x: 0, y: 0, r: 28 };
  private hoverPause: boolean = false;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.rhythm = new RhythmGenerator();
    this.state = this.createInitialState(canvasWidth, canvasHeight);
  }

  private createInitialState(w: number, h: number): GameState {
    return {
      stars: [],
      particles: [],
      trails: [],
      shards: [],
      score: 0,
      combo: 0,
      maxCombo: 0,
      comboAnim: 1,
      flashAlpha: 0,
      flashColor: '#ffdd44',
      shakeX: 0,
      shakeY: 0,
      shakeTime: 0,
      paused: false,
      pulsePhase: 0,
      lastHitGrade: null,
      lastHitTime: -1000,
      canvasWidth: w,
      canvasHeight: h
    };
  }

  public start(currentTime: number): void {
    this.rhythm.start(currentTime);
  }

  public resize(w: number, h: number): void {
    this.state.canvasWidth = w;
    this.state.canvasHeight = h;
    this.pauseButtonRect.x = w - 48;
    this.pauseButtonRect.y = h - 48;
    for (const star of this.state.stars) {
      const pos = this.getStarStartEnd(star.direction);
      star.startX = pos.startX;
      star.startY = pos.startY;
      star.endX = pos.endX;
      star.endY = pos.endY;
      this.updateStarPosition(star);
    }
  }

  public getPauseButtonRect(): { x: number; y: number; r: number } {
    return {
      x: this.state.canvasWidth - 48,
      y: this.state.canvasHeight - 48,
      r: this.pauseButtonRect.r
    };
  }

  public isPauseHovered(): boolean {
    return this.hoverPause;
  }

  public setPauseHovered(v: boolean): void {
    this.hoverPause = v;
  }

  public togglePause(): void {
    this.paused = !this.paused;
    this.state.paused = this.paused;
    this.rhythm.ensureAudioRunning();
  }

  public isPaused(): boolean {
    return this.paused;
  }

  private getStarStartEnd(direction: Direction): { startX: number; startY: number; endX: number; endY: number } {
    const cx = this.state.canvasWidth / 2;
    const cy = this.state.canvasHeight / 2;
    let startX = cx, startY = cy;
    switch (direction) {
      case 'up':
        startX = cx;
        startY = -STAR_RADIUS - 10;
        break;
      case 'down':
        startX = cx;
        startY = this.state.canvasHeight + STAR_RADIUS + 10;
        break;
      case 'left':
        startX = -STAR_RADIUS - 10;
        startY = cy;
        break;
      case 'right':
        startX = this.state.canvasWidth + STAR_RADIUS + 10;
        startY = cy;
        break;
    }
    return { startX, startY, endX: cx, endY: cy };
  }

  public spawnStar(direction: Direction, beatTime: number, currentTime: number): void {
    const flightDuration = this.rhythm.getBeatInterval();
    const color = DIRECTION_COLORS[direction];
    const pos = this.getStarStartEnd(direction);
    const star: Star = {
      id: nextId(),
      direction,
      color,
      spawnTime: currentTime,
      hitTime: beatTime,
      flightDuration,
      progress: 0,
      startX: pos.startX,
      startY: pos.startY,
      endX: pos.endX,
      endY: pos.endY,
      x: pos.startX,
      y: pos.startY,
      alive: true,
      isMiss: false,
      fadeOut: 1
    };
    this.state.stars.push(star);
  }

  private updateStarPosition(star: Star): void {
    const t = Math.max(0, Math.min(1.5, star.progress));
    star.x = star.startX + (star.endX - star.startX) * t;
    star.y = star.startY + (star.endY - star.startY) * t;
  }

  public handleKeyPress(direction: Direction, currentTime: number): void {
    if (this.paused) return;
    this.rhythm.ensureAudioRunning();
    let bestStar: Star | null = null;
    let bestDelta = Infinity;
    for (const star of this.state.stars) {
      if (!star.alive || star.isMiss) continue;
      if (star.direction !== direction) continue;
      const delta = Math.abs(currentTime - star.hitTime);
      if (delta < bestDelta) {
        bestDelta = delta;
        bestStar = star;
      }
    }
    if (!bestStar) return;

    let grade: HitGrade | null = null;
    if (bestDelta <= 30) {
      grade = 'perfect';
    } else if (bestDelta <= 80) {
      grade = 'good';
    }

    if (grade) {
      this.onHit(bestStar, grade, currentTime);
    }
  }

  private onHit(star: Star, grade: HitGrade, currentTime: number): void {
    star.alive = false;
    this.state.combo += 1;
    if (this.state.combo > this.state.maxCombo) {
      this.state.maxCombo = this.state.combo;
    }
    this.state.comboAnim = 1.2;
    this.state.lastHitGrade = grade;
    this.state.lastHitTime = currentTime;

    const baseScore = grade === 'perfect' ? 150 : 100;
    this.state.score += baseScore;

    this.spawnHitParticles(star, grade);
    this.rhythm.playHitSound(grade === 'perfect');

    const combo = this.state.combo;
    if (combo > 5) {
      this.applyShake();
    }
    if (combo >= 10) {
      this.spawnTrail(star.x, star.y);
    }
    if (combo >= 20) {
      this.spawnShards(star.x, star.y);
    }
    if (combo === 30 || (combo > 30 && combo % 30 === 0)) {
      this.triggerGoldFlash();
    }
  }

  private spawnHitParticles(star: Star, grade: HitGrade): void {
    const count = 15;
    const color = grade === 'perfect' ? '#ffd700' : star.color;
    const sizeMultiplier = this.state.combo > 5 ? 2 : 1;
    const baseSize = (grade === 'perfect' ? 4.5 : 3) * sizeMultiplier;

    for (let i = 0; i < count; i++) {
      if (this.state.particles.length >= MAX_PARTICLES) {
        this.state.particles.shift();
      }
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 60 + Math.random() * 60;
      const p: Particle = {
        id: nextId(),
        x: star.x,
        y: star.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color,
        life: 0.6,
        maxLife: 0.6,
        size: baseSize * (0.7 + Math.random() * 0.6)
      };
      this.state.particles.push(p);
    }
  }

  private spawnTrail(x: number, y: number): void {
    const t: Trail = {
      id: nextId(),
      x,
      y,
      life: 0.5,
      maxLife: 0.5,
      color: '#4488ff'
    };
    this.state.trails.push(t);
  }

  private spawnShards(x: number, y: number): void {
    for (let i = 0; i < 3; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 80 + Math.random() * 60;
      const s: Shard = {
        id: nextId(),
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.55,
        maxLife: 0.55,
        color: '#cc66ff',
        size: 6 + Math.random() * 3
      };
      this.state.shards.push(s);
    }
  }

  private triggerGoldFlash(): void {
    this.state.flashAlpha = 0.3;
    this.state.flashColor = '#ffd700';
  }

  private applyShake(): void {
    this.state.shakeTime = 0.15;
  }

  private onMiss(star: Star): void {
    star.isMiss = true;
    star.alive = false;
    star.fadeOut = 1;
    this.state.combo = 0;
    this.state.lastHitGrade = 'miss';
    this.state.lastHitTime = performance.now();
  }

  public update(currentTime: number, dt: number): void {
    if (this.paused) return;

    this.state.pulsePhase = (this.state.pulsePhase + dt) % 1.0;

    if (this.state.comboAnim > 1.0) {
      this.state.comboAnim = Math.max(1.0, this.state.comboAnim - dt * 4);
    }

    if (this.state.flashAlpha > 0) {
      this.state.flashAlpha = Math.max(0, this.state.flashAlpha - dt * 1.5);
    }

    if (this.state.shakeTime > 0) {
      this.state.shakeTime = Math.max(0, this.state.shakeTime - dt);
      const intensity = this.state.shakeTime / 0.15;
      this.state.shakeX = (Math.random() * 2 - 1) * 5 * intensity;
      this.state.shakeY = (Math.random() * 2 - 1) * 5 * intensity;
    } else {
      this.state.shakeX = 0;
      this.state.shakeY = 0;
    }

    const beat = this.rhythm.checkAndFireBeat(currentTime);
    if (beat) {
      const flightDuration = this.rhythm.getBeatInterval();
      this.spawnStar(beat.direction, beat.time, currentTime - flightDuration);
      const nextBeatTime = this.rhythm.getNextBeatTime(currentTime);
      const nextIdx = this.rhythm.getCurrentBeatIndex(nextBeatTime - 1) + 1;
      const nextDir = this.rhythm.getDirectionForBeat(nextIdx);
      this.spawnStar(nextDir, nextBeatTime, currentTime);
    }

    for (const star of this.state.stars) {
      if (star.alive) {
        const elapsed = currentTime - star.spawnTime;
        star.progress = elapsed / star.flightDuration;
        this.updateStarPosition(star);
        if (star.progress > 1.0 && currentTime > star.hitTime + MISS_WINDOW_AFTER) {
          this.onMiss(star);
        }
      } else if (star.isMiss) {
        star.fadeOut = Math.max(0, star.fadeOut - dt * 2.5);
      }
    }

    this.state.stars = this.state.stars.filter(s => s.alive || (s.isMiss && s.fadeOut > 0));

    for (const p of this.state.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life = Math.max(0, p.life - dt);
    }
    this.state.particles = this.state.particles.filter(p => p.life > 0);

    for (const t of this.state.trails) {
      t.life = Math.max(0, t.life - dt);
    }
    this.state.trails = this.state.trails.filter(t => t.life > 0);

    for (const s of this.state.shards) {
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 60 * dt;
      s.life = Math.max(0, s.life - dt);
    }
    this.state.shards = this.state.shards.filter(s => s.life > 0);
  }

  public getStarRadius(): number {
    return STAR_RADIUS;
  }

  public getDirectionColors(): Record<Direction, string> {
    return DIRECTION_COLORS;
  }
}
