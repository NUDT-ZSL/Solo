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
  PlacedNote,
  NotePulseState,
  DragPreview,
} from './config';

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

type UndoPhase = 'idle' | 'fading-out' | 'switching' | 'fading-in';

export class DrawEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private notes: NotePulseState[] = [];
  private particles: Particle[] = [];
  private nextNoteId: number = 0;
  private speed: number = 1;
  private time: number = 0;
  private bgTint: BgTintState;
  private undoPhase: UndoPhase = 'idle';
  private undoPhaseProgress: number = 0;
  private pendingUndo: boolean = false;
  private dragPreview: DragPreview | null = null;

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

  public getSpeed(): number {
    return this.speed;
  }

  public getNotes(): PlacedNote[] {
    return this.notes.map((n) => ({
      color: n.color,
      x: n.x,
      y: n.y,
      id: n.id,
    }));
  }

  public addNote(color: NoteColor, x: number, y: number): PlacedNote {
    const note: NotePulseState = {
      color,
      x,
      y,
      id: this.nextNoteId++,
      pulseTime: 0,
    };
    this.notes.push(note);
    return { color, x, y, id: note.id };
  }

  public removeLastNote(): void {
    if (this.notes.length === 0) return;
    if (this.undoPhase !== 'idle') return;
    this.pendingUndo = true;
    this.undoPhase = 'fading-out';
    this.undoPhaseProgress = 0;
  }

  public clearAll(): void {
    this.notes = [];
    this.particles = [];
    this.undoPhase = 'idle';
    this.undoPhaseProgress = 0;
    this.pendingUndo = false;
  }

  public setDragPreview(preview: DragPreview | null): void {
    this.dragPreview = preview;
  }

  public triggerNotePulse(noteIndex: number): void {
    if (noteIndex >= 0 && noteIndex < this.notes.length) {
      this.notes[noteIndex].pulseTime = NOTE_PULSE_DURATION;
      this.spawnParticles(this.notes[noteIndex]);
      this.setBackgroundTint(this.notes[noteIndex].color);
    }
  }

  private spawnParticles(note: NotePulseState): void {
    if (this.particles.length >= PARTICLE_MAX_TOTAL) {
      const overflow = this.particles.length - PARTICLE_MAX_TOTAL + 10;
      if (overflow > 0) {
        this.particles.splice(0, overflow);
      }
    }

    const countFactor = 1 / Math.pow(this.speed, 0.6);
    const particleCount = Math.max(
      8,
      Math.floor(PARTICLE_BASE_COUNT * countFactor)
    );
    const lifetime = PARTICLE_LIFETIME / Math.pow(this.speed, 0.35);
    const speedMultiplier = Math.pow(this.speed, 0.75);
    const sizeFactor = 1 / Math.pow(this.speed, 0.25);

    const availableSlots = PARTICLE_MAX_TOTAL - this.particles.length;
    const toSpawn = Math.min(particleCount, availableSlots);

    if (toSpawn <= 0) return;

    for (let i = 0; i < toSpawn; i++) {
      const angle = Math.random() * Math.PI * 2;
      const randomSpeed = PARTICLE_SPEED_BASE * (0.4 + Math.random() * 0.8) * speedMultiplier;
      this.particles.push({
        x: note.x,
        y: note.y,
        vx: Math.cos(angle) * randomSpeed,
        vy: Math.sin(angle) * randomSpeed,
        size: PARTICLE_INITIAL_SIZE * (0.5 + Math.random() * 0.9) * sizeFactor,
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

    if (this.undoPhase !== 'idle') {
      const phaseDuration = UNDO_FADE_DURATION / 2;
      this.undoPhaseProgress += dt / phaseDuration;

      if (this.undoPhase === 'fading-out' && this.undoPhaseProgress >= 1) {
        if (this.pendingUndo) {
          this.notes.pop();
          this.pendingUndo = false;
        }
        this.undoPhase = 'fading-in';
        this.undoPhaseProgress = 0;
      } else if (this.undoPhase === 'fading-in' && this.undoPhaseProgress >= 1) {
        this.undoPhase = 'idle';
        this.undoPhaseProgress = 0;
      }
    }

    this.notes.forEach((note) => {
      if (note.pulseTime > 0) {
        note.pulseTime = Math.max(0, note.pulseTime - dt);
      }
    });

    const trailDecayFactor = 1 / Math.pow(Math.max(this.speed, 0.1), 0.45);
    const updated: Particle[] = [];
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      p.x += p.vx * dt * trailDecayFactor;
      p.y += p.vy * dt * trailDecayFactor;
      p.vx *= 0.955;
      p.vy *= 0.955;
      updated.push(p);
    }
    this.particles = updated;

    if (this.particles.length > PARTICLE_MAX_TOTAL) {
      this.particles.splice(0, this.particles.length - PARTICLE_MAX_TOTAL);
    }
  }

  private getUndoAlpha(): number {
    if (this.undoPhase === 'idle') return 1;
    const t = this.easeInOut(Math.min(1, this.undoPhaseProgress));
    if (this.undoPhase === 'fading-out') {
      return this.lerp(1, 0, t);
    } else {
      return this.lerp(0, 1, t);
    }
  }

  public render(): void {
    const ctx = this.ctx;
    const w = this.canvas.width / (window.devicePixelRatio || 1);
    const h = this.canvas.height / (window.devicePixelRatio || 1);

    this.drawBackground(ctx, w, h);

    const contentAlpha = this.getUndoAlpha();

    this.drawPaths(ctx, contentAlpha);
    this.drawParticles(ctx);
    this.drawNotes(ctx, contentAlpha);

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

    const pulse = (Math.sin(this.time * PATH_PULSE_SPEED) + 1) / 2;
    const lineWidth = this.lerp(PATH_MIN_WIDTH, PATH_MAX_WIDTH, pulse);

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    for (let i = 0; i < this.notes.length - 1; i++) {
      const a = this.notes[i];
      const b = this.notes[i + 1];
      const colorA = NOTE_COLORS[a.color];
      const colorB = NOTE_COLORS[b.color];

      const midX = (a.x + b.x) / 2;
      const midY = (a.y + b.y) / 2;

      ctx.shadowColor = `rgba(${colorA.rgb}, 0.35)`;
      ctx.shadowBlur = 16;
      ctx.lineWidth = lineWidth + 3;
      ctx.strokeStyle = `rgba(${colorA.rgb}, 0.15)`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      ctx.stroke();

      const gradient = ctx.createLinearGradient(a.x, a.y, b.x, b.y);
      gradient.addColorStop(0, `rgba(${colorA.rgb}, 0.92)`);
      gradient.addColorStop(1, `rgba(${colorB.rgb}, 0.92)`);

      ctx.shadowColor = `rgba(${colorA.rgb}, 0.55)`;
      ctx.shadowBlur = 14;
      ctx.lineWidth = lineWidth;
      ctx.strokeStyle = gradient;

      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.quadraticCurveTo(midX, midY, b.x, b.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawNotes(ctx: CanvasRenderingContext2D, alpha: number): void {
    ctx.save();
    ctx.globalAlpha = alpha;

    this.notes.forEach((note) => {
      const color = NOTE_COLORS[note.color];
      const pulseProgress =
        note.pulseTime > 0 ? 1 - note.pulseTime / NOTE_PULSE_DURATION : 0;
      const scale =
        note.pulseTime > 0
          ? 1 + (NOTE_PULSE_SCALE - 1) * Math.sin(pulseProgress * Math.PI)
          : 1;
      const radius = NOTE_RADIUS * scale;
      const glowIntensity = note.pulseTime > 0 ? 30 : 14;

      ctx.shadowColor = `rgba(${color.rgb}, 0.85)`;
      ctx.shadowBlur = glowIntensity;

      const gradient = ctx.createRadialGradient(
        note.x - radius * 0.25,
        note.y - radius * 0.25,
        0,
        note.x,
        note.y,
        radius
      );
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.18, color.hex);
      gradient.addColorStop(0.7, color.hex);
      gradient.addColorStop(1, `rgba(${color.rgb}, 0.22)`);

      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(note.x, note.y, radius, 0, Math.PI * 2);
      ctx.fill();

      if (note.pulseTime > 0) {
        const ringAlpha = note.pulseTime / NOTE_PULSE_DURATION;
        ctx.globalAlpha = ringAlpha * 0.5 * alpha;
        ctx.strokeStyle = color.hex;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(note.x, note.y, radius + 8 * pulseProgress, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = alpha;
      }
    });

    ctx.restore();
  }

  private drawParticles(ctx: CanvasRenderingContext2D): void {
    const len = this.particles.length;
    for (let i = 0; i < len; i++) {
      const p = this.particles[i];
      const color = NOTE_COLORS[p.color];
      const lifeRatio = p.life / p.maxLife;
      if (lifeRatio <= 0) continue;

      const size = p.size * lifeRatio;
      const alpha = lifeRatio * 0.92;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = `rgba(${color.rgb}, 0.75)`;
      ctx.shadowBlur = 6;
      ctx.fillStyle = color.hex;
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(0.5, size), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawDragPreview(ctx: CanvasRenderingContext2D): void {
    if (!this.dragPreview) return;
    const { color, x, y } = this.dragPreview;
    const noteConfig = NOTE_COLORS[color];

    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.shadowColor = `rgba(${noteConfig.rgb}, 0.8)`;
    ctx.shadowBlur = 18;

    const gradient = ctx.createRadialGradient(
      x - NOTE_RADIUS * 0.2,
      y - NOTE_RADIUS * 0.2,
      0,
      x,
      y,
      NOTE_RADIUS
    );
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(0.2, noteConfig.hex);
    gradient.addColorStop(1, `rgba(${noteConfig.rgb}, 0.3)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(x, y, NOTE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  public getParticleCount(): number {
    return this.particles.length;
  }
}
