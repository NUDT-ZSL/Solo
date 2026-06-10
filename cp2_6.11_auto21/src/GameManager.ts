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
  animating: boolean;
  animationProgress: number;
  inSlot: boolean;
  slotIndex: number;
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
  public shakeAmount: number = 0;
  public shakeTime: number = 0;

  public playingMelody: boolean = false;
  public melodyStartTime: number = 0;

  public winAnimationTime: number = 0;

  public canvasWidth: number = 0;
  public canvasHeight: number = 0;

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
        animating: false,
        animationProgress: 0,
        inSlot: false,
        slotIndex: -1
      });
    }

    for (let i = 0; i < trackCount; i++) {
      this.slots.push({
        x: 0,
        y: 0,
        width: 90,
        height: 40,
        filled: false,
        blockId: null
      });
    }

    this.layoutLevel();
  }

  private layoutLevel(): void {
    const padding = 20;
    const blockWidth = 80;
    const blockHeight = 40;
    const gap = 8;

    const trackCount = this.tracks.length;
    const gridCols = Math.ceil(Math.sqrt(trackCount * 1.5));
    const gridRows = Math.ceil(trackCount / gridCols);

    const gridWidth = gridCols * blockWidth + (gridCols - 1) * gap;
    const gridHeight = gridRows * blockHeight + (gridRows - 1) * gap;
    const gridStartX = (this.canvasWidth - gridWidth) / 2;
    const gridStartY = 140;

    this.tracks.forEach((track, i) => {
      const col = i % gridCols;
      const row = Math.floor(i / gridCols);
      const x = gridStartX + col * (blockWidth + gap);
      const y = gridStartY + row * (blockHeight + gap);

      if (!track.animating && !track.inSlot) {
        track.x = x;
        track.y = y;
      }
      track.originalX = x;
      track.originalY = y;
      track.targetX = x;
      track.targetY = y;
    });

    const slotWidth = 90;
    const slotHeight = 40;
    const slotGap = 8;
    const totalSlotWidth = trackCount * slotWidth + (trackCount - 1) * slotGap;
    const slotStartX = (this.canvasWidth - totalSlotWidth) / 2;
    const slotY = this.canvasHeight - 100;

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
      if (track.animating) continue;
      if (x >= track.x && x <= track.x + 80 && y >= track.y && y <= track.y + 40) {
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
      const trackCenterX = track.x + 40;
      const trackCenterY = track.y + 20;
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
      track.x = nearestSlot.x + (nearestSlot.width - 80) / 2;
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
    this.flashAlpha = 0.5;

    this.slots.forEach(slot => {
      const track = this.tracks.find(t => t.id === slot.blockId);
      if (track) {
        this.spawnSuccessParticles(track.x + 40, track.y + 20, track.color);
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

    this.slots.forEach(slot => {
      const track = this.tracks.find(t => t.id === slot.blockId);
      if (track) {
        this.spawnFailureParticles(track.x + 40, track.y + 20);
      }
    });

    setTimeout(() => {
      this.slots.forEach(slot => {
        slot.filled = false;
        slot.blockId = null;
      });
      this.tracks.forEach(track => {
        if (track.inSlot) {
          this.animateTrackTo(track, track.originalX, track.originalY);
        }
      });
      this.playingMelody = false;
    }, 1200);
  }

  private spawnSuccessParticles(x: number, y: number, color: string): void {
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: Math.random() * 4 + 2,
        color,
        alpha: 1,
        life: 1500,
        maxLife: 1500
      });
    }
  }

  private spawnFailureParticles(x: number, y: number): void {
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 2 + 1;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: Math.random() * 3 + 2,
        color: '#FF4444',
        alpha: 1,
        life: 1000,
        maxLife: 1000
      });
    }
  }

  private spawnWinParticles(): void {
    for (let i = 0; i < 500; i++) {
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

  public update(deltaTime: number): void {
    this.tracks.forEach(track => {
      if (track.animating) {
        track.animationProgress += deltaTime / 200;
        if (track.animationProgress >= 1) {
          track.animationProgress = 1;
          track.animating = false;
          track.x = track.targetX;
          track.y = track.targetY;
        } else {
          const t = 1 - Math.pow(1 - track.animationProgress, 3);
          track.x = track.x + (track.targetX - track.x) * t;
          track.y = track.y + (track.targetY - track.y) * t;
        }
      }
    });

    this.particles = this.particles.filter(p => {
      p.life -= deltaTime;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;
      p.alpha = p.life / p.maxLife;
      return p.life > 0;
    });

    if (this.flashColor !== null && this.flashAlpha > 0) {
      this.flashAlpha -= deltaTime / 400;
      if (this.flashAlpha <= 0) {
        this.flashAlpha = 0;
        this.flashColor = null;
      }
    }

    if (this.shakeTime > 0) {
      this.shakeTime -= deltaTime;
      if (this.shakeTime <= 0) {
        this.shakeAmount = 0;
        this.shakeTime = 0;
      }
    }

    if (this.state === 'win') {
      this.winAnimationTime += deltaTime;
    }
  }
}
