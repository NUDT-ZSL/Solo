import {
  NoteColor,
  NOTE_COLORS,
  PARTICLE_BASE_COUNT,
  PARTICLE_MAX_TOTAL,
  PARTICLE_LIFETIME,
  PARTICLE_INITIAL_SIZE,
  PARTICLE_SPEED_BASE,
  PATH_MIN_WIDTH,
  PATH_MAX_WIDTH,
  PATH_PULSE_SPEED,
  NOTE_RADIUS,
  NOTE_PULSE_DURATION,
  NOTE_PULSE_SCALE,
  BG_COLOR_START,
  BG_COLOR_END,
  BG_TRANSITION_DURATION,
  BG_ANIMATION_SPEED,
  UNDO_FADE_DURATION,
} from './config';

export interface PlacedNote {
  color: NoteColor;
  x: number;
  y: number;
  id: number;
  pulseTime: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: NoteColor;
  life: number;
  maxLife: number;
}

interface BgTintState {
  targetRgb: { r: number; g: number; b: number };
  currentRgb: { r: number; g: number; b: number };
  transitionProgress: number;
}

export class DrawEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private notes: PlacedNote[] = [];
  private particles: Particle[] = [];
  private nextNoteId: number = 0;
  private speed: number = 1;
  private time: number = 0;
  private bgTint: BgTintState;
  private undoFadeProgress: number = 1;
  private undoFadeActive: boolean = false;
  private dragPreview: { color: NoteColor; x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;

    const defaultRgb = this.hexToRgb(BG_COLOR_START);
    this.bgTint = {
      targetRgb: { ...defaultRgb },
      currentRgb: { ...defaultRgb },
      transitionProgress: 1,
    };

    this.resize();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public setSpeed(speed: number): void {
    this.speed = speed;
  }

  public getNotes(): PlacedNote[] {
    return this.notes;
  }

  public addNote(color: NoteColor, x: number, y: number): PlacedNote {
    const note: PlacedNote = {
      color,
      x,
      y,
      id: this.nextNoteId++,
      pulseTime: 0,
    };
    this.notes.push(note);
    return note;
  }

  public removeLastNote(): void {
    this.notes.pop();
    this.triggerUndoFade();
  }

  public clearAll(): void {
    this.notes = [];
    this.particles = [];
  }

  public setDragPreview(preview: { color: NoteColor; x: number; y: number } | null): void {
    this.dragPreview = preview;
  }

  public triggerNotePulse(noteIndex: number): void {
    if (noteIndex >= 0 && noteIndex < this.notes.length) {
      this.notes[noteIndex].pulseTime = NOTE_PULSE_DURATION;
      this.spawnParticles(this.notes[noteIndex]);
      this.setBackgroundTint(this.notes[noteIndex].color);
    }
  }

  private spawnParticles(note: PlacedNote): void {
    const particleCount = Math.max(
      10,
      Math.floor(PARTICLE_BASE_COUNT / Math.pow(this.speed, 0.5))
    );
    const lifetime = PARTICLE_LIFETIME / Math.pow(this.speed, 0.3);
    const speedMultiplier = Math.pow(this.speed, 0.7);

    const toSpawn = Math.min(
      particleCount,
      PARTICLE_MAX_TOTAL - this.particles.length
    );

    for (let i = 0; i < toSpawn; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = PARTICLE_SPEED_BASE * (0.5 + Math.random()) * speedMultiplier;
      this.particles.push({
        x: note.x,
        y: note.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: PARTICLE_INITIAL_SIZE * (0.6 + Math.random() * 0.8),
        color: note.color,
        life: lifetime,
        maxLife: lifetime,
      });
    }
  }

  private setBackgroundTint(color: NoteColor): void {
    const tintHex = NOTE_COLORS[color].bgTint;
    this.bgTint.targetRgb = this.hexToRgb(tintHex);
    this.bgTint.transitionProgress = 0;
  }

  private triggerUndoFade(): void {
    this.undoFadeActive = true;
    this.undoFadeProgress = 1;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) {
      return { r: 11, g: 11, b: 42 };
    }
    return {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16),
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  public update(dt: number): void {
    this.time += dt;

    if (this.bgTint.transitionProgress < 1) {
      this.bgTint.transitionProgress = Math.min(
        1,
        this.bgTint.transitionProgress + dt / BG_TRANSITION_DURATION
      );
      const t = this.easeInOut(this.bgTint.transitionProgress);
      const defaultRgb = this.hexToRgb(BG_COLOR_START);
      this.bgTint.currentRgb = {
        r: Math.round(this.lerp(this.bgTint.targetRgb.r, defaultRgb.r, t)),
        g: Math.round(this.lerp(this.bgTint.targetRgb.g, defaultRgb.g, t)),
        b: Math.round(this.lerp(this.bgTint.targetRgb.b, defaultRgb.b, t)),
      };
    }

    if (this.undoFadeActive) {
      this.undoFadeProgress -= dt / (UNDO_FADE_DURATION / 2);
      if (this.undoFadeProgress <= 0) {
        this.undoFadeProgress = 0;
        this.undoFadeActive = false;
      }
    } else if (this.undoFadeProgress < 1) {
      this.undoFadeProgress = Math.min(
        1,
        this.undoFadeProgress + dt / (UNDO_FADE_DURATION / 2)
      );
    }

    this.notes.forEach((note) => {
      if (note.pulseTime > 0) {
        note.pulseTime = Math.max(0, note.pulseTime - dt);
      }
    });

    const trailLengthFactor = 1 / Math.pow(this.speed, 0.4);
    this.particles = this.particles.filter((p) => {
      p.life -= dt;
      if (p.life <= 0) return false;
      const decayFactor = trailLengthFactor;
      p.x += p.vx * dt * decayFactor;
      p.y += p.vy * dt * decayFactor;
      p.vx *= 0.96;
      p.vy *= 0.96;
      return true;
    });
  }

  public render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    this.drawBackground(ctx, w, h);

    const pathAlpha = this.undoFadeActive
      ? Math.abs(this.undoFadeProgress - 0.5) * 2
      : this.undoFadeProgress;

    this.drawPaths(ctx, pathAlpha);
    this.drawParticles(ctx);
    this.drawNotes(ctx, pathAlpha);

    if (this.dragPreview) {
      this.drawDragPreview(ctx);
    }
  }

  private drawBackground(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number
  ): void {
    const bgOffset = Math.sin(this.time * BG_ANIMATION_SPEED) * 0.5 + 0.5;
    const startRgb = this.bgTint.currentRgb;
    const endRgb = this.hexToRgb(BG_COLOR_END);

    const mixedEnd = {
      r: Math.round(this.lerp(endRgb.r, startRgb.r, 0.3)),
      g: Math.round(this.lerp(endRgb.g, startRgb.g, 0.3)),
      b: Math.round(this.lerp(endRgb.b, startRgb.b, 0.3)),
    };

    const gradient = ctx.createLinearGradient(
      0,
      0,
      w * (0.7 + bgOffset * 0.3),
      h * (0.7 + (1 - bgOffset) * 0.3)
    );
    gradient.addColorStop(
      0,
      `rgb(${startRgb.r}, ${startRgb.g}, ${startRgb.b})`
    );
    gradient.addColorStop(
      1,
      `rgb(${mixedEnd.r}, ${mixedEnd.g}, ${mixedEnd.b})`
    );

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  private drawPaths(ctx: CanvasRenderingContext2D, alpha: number): void {
    if (this.notes.length < 2) return;

    const pulse =
      (Math.sin(this.time * PATH_PULSE_SPEED) + 1) / 2;
    const lineWidth = this.lerp(PATH_MIN_WIDTH, PATH_MAX_WIDTH, pulse);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < this.notes.length - 1; i++) {
      const a = this.notes[i];
      const b = this.notes[i + 1];
      const colorA = NOTE_COLORS[a.color];
      const colorB = NOTE_COLORS[b.color];

      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      gradient.addColorStop(0, `rgba(${colorA.rgb}, 0.9)`);
      gradient.addColorStop(1, `rgba(${colorB.rgb}, 0.9)`);

      ctx.strokeStyle = gradient;
      ctx.shadowColor = `rgba(${colorA.rgb}, 0.5)`;
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawNotes(ctx: CanvasRenderingContext2D, alpha: number): void {
    ctx.save();
    ctx.globalAlpha = alpha;

    this.notes.forEach((note) => {
      const color = NOTE_COLORS[note.color];
      const pulseProgress = 1 - note.pulseTime / NOTE_PULSE_DURATION;
      const scale =
        note.pulseTime > 0
          ? 1 + (NOTE_PULSE_SCALE - 1) * Math.sin(pulseProgress * Math.PI)
          : 1;
      const radius = NOTE_RADIUS * scale;
      const glowIntensity = note.pulseTime > 0 ? 25 : 12;

      ctx.shadowColor = `rgba(${color.rgb}, 0.8)`;
      ctx.shadowBlur = glowIntensity;

      const gradient = ctx.createRadialGradient(
        note.x,
        note.y,
        0,
        note.x,
        note.y,
        radius
      );
      gradient.addColorStop(0, color.hex);
      gradient.addColorStop(0.7, color.hex);
      gradient.addColorStop(1, `rgba(${color.rgb}, 0.3)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(note.x, note.y, radius, 0, Math.PI * 2);
      ctx.fill();
    });

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    this.particles.forEach((p) => {
      const color = NOTE_COLORS[p.color];
      const lifeRatio = p.life / p.maxLife;
      const size = p.size * lifeRatio;
      const alpha = lifeRatio * 0.9;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = `rgba(${color.rgb}, 0.8)`;
      ctx.shadowBlur = 8;
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  private drawDragPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.dragPreview) return;
    const { color, x, y } = this.dragPreview;
    const noteConfig = NOTE_COLORS[color];

    ctx.save();
    ctx.globalAlpha = 0.6;
    ctx.shadowColor = `rgba(${noteConfig.rgb}, 0.8)`;
    ctx.shadowBlur = 15;
    ctx.fillStyle = noteConfig.hex;
    ctx.beginPath();
    ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}
