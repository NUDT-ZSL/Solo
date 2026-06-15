import { TrackSystem } from './track';

export type HitType = 'perfect' | 'good' | 'miss' | 'reverse_hit' | 'reverse_miss';

export interface HitEvent {
  type: HitType;
  trackId: number;
  x: number;
  y: number;
  color: string;
  timestamp: number;
}

export interface Note {
  id: number;
  trackId: number;
  x: number;
  y: number;
  active: boolean;
  color: string;
  reverse: boolean;
  spawnTime: number;
  triggered: boolean;
  size: number;
  rotation: number;
}

const MAX_POOL_SIZE = 200;
const BASE_NOTE_SIZE = 8;
const PERFECT_RANGE = 15;
const GOOD_RANGE = 25;

export class NoteManager {
  private pool: Note[];
  private activeNotes: Note[];
  private trackSystem: TrackSystem;
  private canvasWidth: number;
  private spawnTimer: number;
  private spawnInterval: number;
  private baseSpawnInterval: number;
  private hitCallback: (event: HitEvent) => void;
  private nextNoteId: number;
  private reverseEnabled: boolean;
  private elapsedTime: number;

  constructor(
    trackSystem: TrackSystem,
    canvasWidth: number,
    _canvasHeight: number,
    hitCallback: (event: HitEvent) => void
  ) {
    this.trackSystem = trackSystem;
    this.canvasWidth = canvasWidth;
    void _canvasHeight;
    this.hitCallback = hitCallback;
    this.pool = [];
    this.activeNotes = [];
    this.spawnTimer = 0;
    this.baseSpawnInterval = 1.25;
    this.spawnInterval = this.baseSpawnInterval;
    this.nextNoteId = 0;
    this.reverseEnabled = false;
    this.elapsedTime = 0;
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < MAX_POOL_SIZE; i++) {
      this.pool.push({
        id: i,
        trackId: 0,
        x: 0,
        y: 0,
        active: false,
        color: '',
        reverse: false,
        spawnTime: 0,
        triggered: false,
        size: BASE_NOTE_SIZE,
        rotation: 0
      });
    }
  }

  public resize(canvasWidth: number, _canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    void _canvasHeight;
  }

  public setDifficultyLevel(level: number): void {
    this.spawnInterval = this.baseSpawnInterval / (1 + (level - 1) * 0.125);
    this.reverseEnabled = level >= 5;
  }

  public reset(): void {
    this.activeNotes.forEach(note => {
      note.active = false;
      this.pool.push(note);
    });
    this.activeNotes = [];
    this.spawnTimer = 0;
    this.elapsedTime = 0;
  }

  private acquireNote(): Note | null {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return null;
  }

  private releaseNote(note: Note): void {
    note.active = false;
    if (this.pool.length < MAX_POOL_SIZE) {
      this.pool.push(note);
    }
  }

  public handleKeyPress(trackId: number): void {
    const tracks = this.trackSystem.getTracks();
    const track = tracks[trackId];
    if (!track) return;

    const triggerZoneX = this.trackSystem.getTriggerZoneX();
    let bestNote: Note | null = null;
    let bestDistance = Infinity;

    for (const note of this.activeNotes) {
      if (note.trackId !== trackId || note.triggered) continue;

      const distance = Math.abs(note.x - triggerZoneX);
      if (note.reverse) {
        if (distance < bestDistance && distance <= GOOD_RANGE) {
          bestDistance = distance;
          bestNote = note;
        }
      } else {
        if (distance < bestDistance && distance <= GOOD_RANGE) {
          bestDistance = distance;
          bestNote = note;
        }
      }
    }

    if (bestNote) {
      bestNote.triggered = true;
      let hitType: HitType;

      if (bestNote.reverse) {
        hitType = bestDistance <= PERFECT_RANGE ? 'reverse_hit' : 'reverse_hit';
      } else {
        if (bestDistance <= PERFECT_RANGE) {
          hitType = 'perfect';
        } else {
          hitType = 'good';
        }
      }

      this.hitCallback({
        type: hitType,
        trackId: trackId,
        x: triggerZoneX,
        y: track.currentY,
        color: track.color,
        timestamp: performance.now()
      });

      this.releaseNote(bestNote);
      this.activeNotes = this.activeNotes.filter(n => n !== bestNote);
    } else {
      this.hitCallback({
        type: 'miss',
        trackId: trackId,
        x: triggerZoneX,
        y: track.currentY,
        color: '#EF4444',
        timestamp: performance.now()
      });
    }
  }

  private spawnNote(): void {
    const tracks = this.trackSystem.getTracks();
    if (tracks.length === 0) return;

    const note = this.acquireNote();
    if (!note) return;

    const trackId = Math.floor(Math.random() * tracks.length);
    const track = tracks[trackId];
    const isReverse = this.reverseEnabled && Math.random() < 0.2;

    note.id = this.nextNoteId++;
    note.trackId = trackId;
    note.color = track.color;
    note.active = true;
    note.reverse = isReverse;
    note.triggered = false;
    note.spawnTime = this.elapsedTime;
    note.size = BASE_NOTE_SIZE;
    note.rotation = 0;

    if (isReverse) {
      note.x = this.trackSystem.getTriggerZoneX() + 500;
    } else {
      note.x = -50;
    }
    note.y = track.currentY;

    this.activeNotes.push(note);
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;
    this.spawnTimer += deltaTime;

    const currentInterval = this.spawnInterval * (0.8 + Math.random() * 0.4);
    if (this.spawnTimer >= currentInterval) {
      this.spawnTimer = 0;
      this.spawnNote();
    }

    const speed = this.trackSystem.getSpeed();
    const tracks = this.trackSystem.getTracks();
    const triggerZoneX = this.trackSystem.getTriggerZoneX();

    for (let i = this.activeNotes.length - 1; i >= 0; i--) {
      const note = this.activeNotes[i];
      if (!note.active || note.triggered) continue;

      if (note.reverse) {
        note.x -= speed * deltaTime;
      } else {
        note.x += speed * deltaTime;
      }

      const track = tracks[note.trackId];
      if (track) {
        note.y = track.currentY;
      }

      note.rotation += deltaTime * 3;

      let missed = false;
      if (note.reverse) {
        if (note.x < triggerZoneX - GOOD_RANGE) {
          missed = true;
        }
      } else {
        if (note.x > triggerZoneX + GOOD_RANGE) {
          missed = true;
        }
      }

      if (missed && !note.triggered) {
        note.triggered = true;
        const hitType: HitType = note.reverse ? 'reverse_miss' : 'miss';
        this.hitCallback({
          type: hitType,
          trackId: note.trackId,
          x: triggerZoneX,
          y: track ? track.currentY : note.y,
          color: note.reverse ? '#EF4444' : track?.color || '#EF4444',
          timestamp: performance.now()
        });
        this.releaseNote(note);
        this.activeNotes.splice(i, 1);
        continue;
      }

      if (note.x < -100 || note.x > this.canvasWidth + 100) {
        this.releaseNote(note);
        this.activeNotes.splice(i, 1);
      }
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const note of this.activeNotes) {
      if (!note.active) continue;

      ctx.save();
      ctx.translate(note.x, note.y);
      ctx.rotate(note.rotation);

      const glowIntensity = note.reverse ? 20 : 12;
      ctx.shadowColor = note.color;
      ctx.shadowBlur = glowIntensity;

      if (note.reverse) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
      }

      ctx.fillStyle = note.color;
      const s = note.size;
      ctx.beginPath();
      if (note.reverse) {
        ctx.moveTo(-s, 0);
        ctx.lineTo(s * 0.5, -s * 0.866);
        ctx.lineTo(s * 0.5, s * 0.866);
      } else {
        ctx.moveTo(s, 0);
        ctx.lineTo(-s * 0.5, -s * 0.866);
        ctx.lineTo(-s * 0.5, s * 0.866);
      }
      ctx.closePath();
      ctx.fill();

      if (note.reverse) {
        ctx.stroke();
      }

      ctx.restore();
    }
  }
}
