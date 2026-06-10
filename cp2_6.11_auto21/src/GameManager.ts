import { AudioEngine } from './AudioEngine';

export type GameState = 'menu' | 'playing' | 'win';

export interface TrackBlock {
  id: number;
  color: string;
  pitch: number;
  noteSymbol: string;
  x: number;
  y: number;
  originalX: number;
  originalY: number;
  targetX: number;
  targetY: number;
  startX: number;
  startY: number;
  animating: boolean;
  animationProgress: number;
  inSlot: boolean;
  slotIndex: number;
  flying: boolean;
  flyProgress: number;
  flyStartX: number;
  flyStartY: number;
  flyTargetX: number;
  flyTargetY: number;
  flyRotation: number;
  flyColor: string;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

export interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
  filled: boolean;
  blockId: number | null;
}

const COLORS = [
  '#FF4444', '#FF8C00', '#FFD700', '#32CD32',
  '#00CED1', '#4169E1', '#8A2BE2', '#FF69B4'
];

const NOTE_SYMBOLS = ['♩', '♪', '♫', '♬'];

const BLOCK_WIDTH = 80;
const BLOCK_HEIGHT = 40;
const GAP = 8;
const PADDING = 20;
const GRID_COLS = 4;

export class GameManager {
  public state: GameState = 'menu';
  public score: number = 0;
  public level: number = 1;
  public maxLevel: number = 8;

  public tracks: TrackBlock[] = [];
  public slots: Slot[] = [];
  public targetMelody: number[] = [];
  public particles: Particle[] = [];
  public nebulaParticles: Particle[] = [];

  public draggingTrack: TrackBlock | null = null;
  public dragOffsetX: number = 0;
  public dragOffsetY: number = 0;

  public flashColor: string | null = null;
  public flashAlpha: number = 0;
  public flashDuration: number = 0;
  public shakeAmount: number = 0;
  public shakeTime: number = 0;
  public shakeElapsed: number = 0;

  public playingMelody: boolean = false;
  public melodyStartTime: number = 0;

  public winAnimationTime: number = 0;

  public canvasWidth: number = 0;
  public canvasHeight: number = 0;

  public frameCount: number = 0;
  public fpsTimer: number = 0;
  public currentFPS: number = 60;

  private audioEngine: AudioEngine;

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
    this.initNebulaParticles();
  }

  private initNebulaParticles(): void {
    this.nebulaParticles = [];
    for (let i = 0; i < 200; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 400 + 100;
      this.nebulaParticles.push({
        x: 0,
        y: 0,
        vx: Math.cos(angle),
        vy: Math.sin(angle),
        size: Math.random() * 2 + 2,
        color: this.lerpColor('#6A5ACD', '#9370DB', Math.random()),
        alpha: Math.random() * 0.5 + 0.3,
        life: radius,
        maxLife: radius
      });
    }
  }

  private lerpColor(color1: string, color2: string, t: number): string {
    const r1 = parseInt(color1.slice(1, 3), 16);
    const g1 = parseInt(color1.slice(3, 5), 16);
    const b1 = parseInt(color1.slice(5, 7), 16);
    const r2 = parseInt(color2.slice(1, 3), 16);
    const g2 = parseInt(color2.slice(3, 5), 16);
    const b2 = parseInt(color2.slice(5, 7), 16);
    const r = Math.round(r1 + (r2 - r1) * t);
    const g = Math.round(g1 + (g2 - g1) * t);
    const b = Math.round(b1 + (b2 - b1) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    if (this.state === 'playing') {
      this.layoutLevel();
    }
  }

  public startGame(): void {
    this.state = 'playing';
    this.score = 0;
    this.level = 1;
    this.initLevel();
  }

  public nextLevel(): void {
    this.level++;
    if (this.level > this.maxLevel) {
      this.state = 'win';
      this.winAnimationTime = 0;
      this.spawnWinParticles();
      return;
    }
    this.initLevel();
  }

  public endGame(): void {
    this.state = 'menu';
    this.tracks = [];
    this.slots = [];
    this.particles = [];
    this.audioEngine.stopAll();
  }

  private initLevel(): void {
    this.tracks = [];
    this.slots = [];
    this.particles = [];
    this.playingMelody = false;
    this.flashColor = null;
    this.flashAlpha = 0;
    this.shakeTime = 0;
    this.shakeElapsed = 0;

    const trackCount = Math.min(3 + this.level, 8);
    const pitchRange = Math.min(6 + this.level, 18);

    this.targetMelody = [];
    for (let i = 0; i < trackCount; i++) {
      this.targetMelody.push(Math.floor(Math.random() * pitchRange));
    }

    const shuffledMelody = [...this.targetMelody];
    for (let i = shuffledMelody.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffledMelody[i], shuffledMelody[j]] = [shuffledMelody[j], shuffledMelody[i]];
    }

    for (let i = 0; i < trackCount; i++) {
      this.tracks.push({
        id: i,
        color: COLORS[i % COLORS.length],
        pitch: shuffledMelody[i],
        noteSymbol: NOTE_SYMBOLS[Math.floor(Math.random() * NOTE_SYMBOLS.length)],
        x: 0,
        y: 0,
        originalX: 0,
        originalY: 0,
        targetX: 0,
        targetY: 0,
        startX: 0,
        startY: 0,
        animating: false,
        animationProgress: 0,
        inSlot: false,
        slotIndex: -1,
        flying: false,
        flyProgress: 0,
        flyStartX: 0,
        flyStartY: 0,
        flyTargetX: 0,
        flyTargetY: 0,
        flyRotation: 0,
        flyColor: COLORS[i % COLORS.length]
      });
    }

    for (let i = 0; i < trackCount; i++) {
      this.slots.push({
        x: 0,
        y: 0,
        width: BLOCK_WIDTH + 10,
        height: BLOCK_HEIGHT,
        filled: false,
        blockId: null
      });
    }

    this.layoutLevel();
  }

  private layoutLevel(): void {
    const trackCount = this.tracks.length;
    const gridRows = Math.ceil(trackCount / GRID_COLS);

    const gridWidth = GRID_COLS * BLOCK_WIDTH + (GRID_COLS - 1) * GAP;
    const gridHeight = gridRows * BLOCK_HEIGHT + (gridRows - 1) * GAP;

    const availableWidth = this.canvasWidth - PADDING * 2;
    const gridStartX = PADDING + Math.max(0, (availableWidth - gridWidth) / 2);
    const gridStartY = PADDING + 100;

    this.tracks.forEach((track, i) => {
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const x = gridStartX + col * (BLOCK_WIDTH + GAP);
      const y = gridStartY + row * (BLOCK_HEIGHT + GAP);

      if (!track.animating && !track.inSlot && !track.flying) {
        track.x = x;
        track.y = y;
      }
      track.originalX = x;
      track.originalY = y;
      track.targetX = x;
      track.targetY = y;
    });

    const slotWidth = BLOCK_WIDTH + 10;
    const slotHeight = BLOCK_HEIGHT;
    const slotGap = GAP;
    const totalSlotWidth = trackCount * slotWidth + (trackCount - 1) * slotGap;
    const availableSlotWidth = this.canvasWidth - PADDING * 2;
    const slotStartX = PADDING + Math.max(0, (availableSlotWidth - totalSlotWidth) / 2);
    const slotY = this.canvasHeight - PADDING - slotHeight - 20;

    this.slots.forEach((slot, i) => {
      slot.x = slotStartX + i * (slotWidth + slotGap);
      slot.y = slotY;
      slot.width = slotWidth;
      slot.height = slotHeight;
    });
  }

  public handleMouseDown(x: number, y: number): void {
    if (this.state !== 'playing' || this.playingMelody) return;

    for (let i = this.tracks.length - 1; i >= 0; i--) {
      const track = this.tracks[i];
      if (track.animating || track.flying) continue;
      if (x >= track.x && x <= track.x + BLOCK_WIDTH && y >= track.y && y <= track.y + BLOCK_HEIGHT) {
        this.draggingTrack = track;
        this.dragOffsetX = x - track.x;
        this.dragOffsetY = y - track.y;

        if (track.inSlot) {
          const slot = this.slots[track.slotIndex];
          if (slot) {
            slot.filled = false;
            slot.blockId = null;
          }
          track.inSlot = false;
          track.slotIndex = -1;
        }

        this.tracks.splice(i, 1);
        this.tracks.push(track);
        break;
      }
    }
  }

  public handleMouseMove(x: number, y: number): void {
    if (this.draggingTrack) {
      this.draggingTrack.x = x - this.dragOffsetX;
      this.draggingTrack.y = y - this.dragOffsetY;
    }
  }

  public handleMouseUp(x: number, y: number): void {
    if (!this.draggingTrack) return;

    const track = this.draggingTrack;
    let nearestDist = Infinity;
    let nearestIndex = -1;

    for (let i = 0; i < this.slots.length; i++) {
      const slot = this.slots[i];
      const slotCenterX = slot.x + slot.width / 2;
      const slotCenterY = slot.y + slot.height / 2;
      const trackCenterX = track.x + BLOCK_WIDTH / 2;
      const trackCenterY = track.y + BLOCK_HEIGHT / 2;
      const dist = Math.sqrt(
        Math.pow(slotCenterX - trackCenterX, 2) + Math.pow(slotCenterY - trackCenterY, 2)
      );

      if (dist < nearestDist && dist < 30 && !slot.filled) {
        nearestDist = dist;
        nearestIndex = i;
      }
    }

    if (nearestIndex >= 0) {
      const nearestSlot = this.slots[nearestIndex];
      track.x = nearestSlot.x + (nearestSlot.width - BLOCK_WIDTH) / 2;
      track.y = nearestSlot.y;
      track.inSlot = true;
      track.slotIndex = nearestIndex;
      nearestSlot.filled = true;
      nearestSlot.blockId = track.id;
      this.audioEngine.playDing();

      if (this.slots.every(s => s.filled)) {
        this.checkMelody();
      }
    } else {
      this.animateTrackTo(track, track.originalX, track.originalY);
    }

    this.draggingTrack = null;
  }

  private animateTrackTo(track: TrackBlock, tx: number, ty: number): void {
    track.startX = track.x;
    track.startY = track.y;
    track.targetX = tx;
    track.targetY = ty;
    track.animating = true;
    track.animationProgress = 0;
    track.inSlot = false;
    track.slotIndex = -1;

    this.slots.forEach(slot => {
      if (slot.blockId === track.id) {
        slot.filled = false;
        slot.blockId = null;
      }
    });
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private checkMelody(): void {
    this.playingMelody = true;
    this.melodyStartTime = performance.now();

    const playerMelody = this.slots.map(slot => {
      const track = this.tracks.find(t => t.id === slot.blockId);
      return track ? track.pitch : 0;
    });

    this.audioEngine.playMelody(playerMelody);

    setTimeout(() => {
      const isCorrect = playerMelody.every((p, i) => p === this.targetMelody[i]);
      if (isCorrect) {
        this.onSuccess();
      } else {
        this.onFailure();
      }
    }, 3200);
  }

  private onSuccess(): void {
    this.score += 100;
    this.flashColor = '#FFD700';
    this.flashAlpha = 0.6;
    this.flashDuration = 200;

    this.slots.forEach(slot => {
      const track = this.tracks.find(t => t.id === slot.blockId);
      if (track) {
        this.launchTrackFly(track, true);
        this.spawnSuccessParticles(track.x + BLOCK_WIDTH / 2, track.y + BLOCK_HEIGHT / 2, track.color);
      }
    });

    setTimeout(() => {
      this.nextLevel();
    }, 1800);
  }

  private onFailure(): void {
    this.score = 0;
    this.shakeAmount = 5;
    this.shakeTime = 300;
    this.shakeElapsed = 0;

    this.slots.forEach(slot => {
      const track = this.tracks.find(t => t.id === slot.blockId);
      if (track) {
        this.launchTrackFly(track, false);
        this.spawnFailureParticles(track.x + BLOCK_WIDTH / 2, track.y + BLOCK_HEIGHT / 2);
      }
    });

    setTimeout(() => {
      this.slots.forEach(slot => {
        slot.filled = false;
        slot.blockId = null;
      });
      this.tracks.forEach(track => {
        track.flying = false;
        track.x = track.originalX;
        track.y = track.originalY;
        track.inSlot = false;
        track.slotIndex = -1;
      });
      this.playingMelody = false;
    }, 1200);
  }

  private launchTrackFly(track: TrackBlock, success: boolean): void {
    track.flying = true;
    track.flyProgress = 0;
    track.flyStartX = track.x;
    track.flyStartY = track.y;
    track.flyColor = success ? track.color : '#FF4444';

    const angle = success
      ? (-Math.PI / 2) + (Math.random() - 0.5) * 0.8
      : (Math.random() * Math.PI * 2);
    const distance = success
      ? 200 + Math.random() * 200
      : 80 + Math.random() * 100;

    track.flyTargetX = track.x + Math.cos(angle) * distance;
    track.flyTargetY = success
      ? track.y - (150 + Math.random() * 200)
      : track.y + Math.sin(angle) * distance;
    track.flyRotation = (Math.random() - 0.5) * Math.PI * 2;
  }

  private spawnSuccessParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 25; i++) {
      const angle = (-Math.PI / 2) + (Math.random() - 0.5) * Math.PI;
      const speed = Math.random() * 4 + 2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        size: Math.random() * 5 + 2,
        color,
        alpha: 1,
        life: 1500,
        maxLife: 1500
      });
    }
  }

  private spawnFailureParticles(x: number, y: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 4 + 2,
        color: '#FF4444',
        alpha: 1,
        life: 1000,
        maxLife: 1000
      });
    }
  }

  private spawnWinParticles(): void {
    const maxParticles = 500;
    const availableSlots = Math.max(0, maxParticles - this.particles.length);
    const toSpawn = Math.min(500, availableSlots);

    for (let i = 0; i < toSpawn; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 6 + 2;
      this.particles.push({
        x: this.canvasWidth / 2,
        y: this.canvasHeight / 2,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 5 + 2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 1,
        life: 5000,
        maxLife: 5000
      });
    }
  }

  public getShakeOffset(): number {
    if (this.shakeTime <= 0) return 0;
    const frequency = 10;
    const t = this.shakeElapsed / 1000;
    const decay = Math.max(0, 1 - this.shakeElapsed / this.shakeTime);
    return Math.sin(t * Math.PI * 2 * frequency) * this.shakeAmount * decay;
  }

  public update(deltaTime: number): void {
    this.frameCount++;
    this.fpsTimer += deltaTime;
    if (this.fpsTimer >= 1000) {
      this.currentFPS = Math.round(this.frameCount * 1000 / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    this.tracks.forEach(track => {
      if (track.animating) {
        track.animationProgress += deltaTime / 200;
        if (track.animationProgress >= 1) {
          track.animationProgress = 1;
          track.animating = false;
          track.x = track.targetX;
          track.y = track.targetY;
        } else {
          const t = this.easeOutCubic(track.animationProgress);
          track.x = track.startX + (track.targetX - track.startX) * t;
          track.y = track.startY + (track.targetY - track.startY) * t;
        }
      }

      if (track.flying) {
        const flyDuration = track.flyColor === '#FF4444' ? 1000 : 1500;
        track.flyProgress += deltaTime / flyDuration;
        if (track.flyProgress >= 1) {
          track.flyProgress = 1;
        } else {
          const t = this.easeOutCubic(track.flyProgress);
          track.x = track.flyStartX + (track.flyTargetX - track.flyStartX) * t;
          track.y = track.flyStartY + (track.flyTargetY - track.flyStartY) * t;
        }
      }
    });

    this.particles = this.particles.filter(p => {
      p.life -= deltaTime;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.alpha = Math.max(0, p.life / p.maxLife);
      return p.life > 0;
    });

    if (this.flashColor !== null && this.flashDuration > 0) {
      this.flashDuration -= deltaTime;
      this.flashAlpha = Math.max(0, (this.flashDuration / 200) * 0.6);
      if (this.flashDuration <= 0) {
        this.flashAlpha = 0;
        this.flashColor = null;
      }
    }

    if (this.shakeTime > 0) {
      this.shakeElapsed += deltaTime;
      if (this.shakeElapsed >= this.shakeTime) {
        this.shakeTime = 0;
        this.shakeElapsed = 0;
        this.shakeAmount = 0;
      }
    }

    if (this.state === 'win') {
      this.winAnimationTime += deltaTime;
    }
  }
}
