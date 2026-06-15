import {
  NOTE_COLORS,
  NoteColor,
  PARTICLE,
  PATH,
  NOTE,
  ANIMATION,
  BACKGROUND
} from './config';

export interface NoteData {
  id: number;
  color: NoteColor;
  x: number;
  y: number;
  pulseProgress: number;
  isPlaying: boolean;
  pathProgress: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  colorRgb: { r: number; g: number; b: number };
  life: number;
  decay: number;
  initialSize: number;
}

interface BgColorState {
  target: { r: number; g: number; b: number };
  current: { r: number; g: number; b: number };
  transitionProgress: number;
}

export class DrawEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;

  private notes: NoteData[] = [];
  private particles: Particle[] = [];
  private nextNoteId: number = 1;

  private fadeProgress: number = 1;
  private fadeDirection: number = 0;
  private time: number = 0;

  private bg: BgColorState = {
    target: { ...BACKGROUND.COLOR_A },
    current: { ...BACKGROUND.COLOR_A },
    transitionProgress: 1
  };

  private dragPreview: { color: NoteColor; x: number; y: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.resize();
  }

  public resize(): void {
    const wrapper = this.canvas.parentElement;
    if (!wrapper) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = wrapper.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  public addNote(color: NoteColor, x: number, y: number): NoteData {
    const note: NoteData = {
      id: this.nextNoteId++,
      color,
      x,
      y,
      pulseProgress: 1,
      isPlaying: false,
      pathProgress: this.notes.length > 0 ? 0 : 1
    };
    this.notes.push(note);
    return note;
  }

  public removeLastNote(): boolean {
    if (this.notes.length === 0) return false;
    this.notes.pop();
    this.startFade();
    return true;
  }

  public clearAll(): void {
    this.notes = [];
    this.particles = [];
    this.fadeProgress = 1;
  }

  public getNotes(): NoteData[] {
    return this.notes;
  }

  public triggerNotePulse(index: number): void {
    const note = this.notes[index];
    if (!note) return;
    note.isPlaying = true;
    note.pulseProgress = 0;
  }

  public emitParticles(x: number, y: number, color: NoteColor, speed: number): void {
    const cfg = NOTE_COLORS[color];
    const count = Math.max(10, Math.round(PARTICLE.BASE_COUNT / Math.sqrt(speed)));
    const baseSpeed = PARTICLE.BASE_SPEED * Math.sqrt(speed);
    const lifetime = PARTICLE.BASE_LIFETIME / speed;
    const size = PARTICLE.BASE_SIZE * (1 + 0.3 / speed);

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= PARTICLE.MAX_PARTICLES) {
        this.particles.shift();
      }
      const angle = Math.random() * Math.PI * 2;
      const velocity = baseSpeed * (0.4 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        color: cfg.hex,
        colorRgb: cfg.rgb,
        life: 1,
        decay: 1 / (lifetime * 60),
        initialSize: size * (0.6 + Math.random() * 0.6)
      });
    }
  }

  public shiftBackground(color: NoteColor): void {
    const cfg = NOTE_COLORS[color];
    this.bg.target = {
      r: Math.round((BACKGROUND.COLOR_A.r + cfg.rgb.r) * 0.25),
      g: Math.round((BACKGROUND.COLOR_A.g + cfg.rgb.g) * 0.25),
      b: Math.round((BACKGROUND.COLOR_A.b + cfg.rgb.b) * 0.35)
    };
    this.bg.transitionProgress = 0;
  }

  public setDragPreview(color: NoteColor | null, x: number = 0, y: number = 0): void {
    if (color === null) {
      this.dragPreview = null;
    } else {
      this.dragPreview = { color, x, y };
    }
  }

  private startFade(): void {
    this.fadeProgress = 1;
    this.fadeDirection = -1;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    if (this.fadeDirection !== 0) {
      const step = deltaTime / ANIMATION.FADE_DURATION;
      this.fadeProgress += this.fadeDirection * step * 2;
      if (this.fadeProgress <= 0) {
        this.fadeProgress = 0;
        this.fadeDirection = 1;
      } else if (this.fadeProgress >= 1) {
        this.fadeProgress = 1;
        this.fadeDirection = 0;
      }
    }

    if (this.bg.transitionProgress < 1) {
      this.bg.transitionProgress = Math.min(1, this.bg.transitionProgress + deltaTime / ANIMATION.BG_TRANSITION_DURATION);
      const t = this.easeOutCubic(this.bg.transitionProgress);
      this.bg.current.r = Math.round(this.lerp(this.bg.current.r, this.bg.target.r, t * 0.1));
      this.bg.current.g = Math.round(this.lerp(this.bg.current.g, this.bg.target.g, t * 0.1));
      this.bg.current.b = Math.round(this.lerp(this.bg.current.b, this.bg.target.b, t * 0.1));
    } else {
      const t = (Math.sin(this.time * BACKGROUND.CYCLE_SPEED) + 1) / 2;
      this.bg.current.r = Math.round(this.lerp(BACKGROUND.COLOR_A.r, BACKGROUND.COLOR_B.r, t * 0.4));
      this.bg.current.g = Math.round(this.lerp(BACKGROUND.COLOR_A.g, BACKGROUND.COLOR_B.g, t * 0.4));
      this.bg.current.b = Math.round(this.lerp(BACKGROUND.COLOR_A.b, BACKGROUND.COLOR_B.b, t * 0.4));
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.life -= p.decay * deltaTime * 60;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    for (const note of this.notes) {
      if (note.pathProgress < 1) {
        note.pathProgress = Math.min(1, note.pathProgress + deltaTime / ANIMATION.PATH_DRAW_DURATION);
      }
      if (note.isPlaying && note.pulseProgress < 1) {
        note.pulseProgress = Math.min(1, note.pulseProgress + deltaTime / NOTE.PULSE_DURATION);
        if (note.pulseProgress >= 1) {
          note.isPlaying = false;
        }
      }
    }
  }

  public render(): void {
    const ctx = this.ctx;
    const alpha = this.fadeProgress;

    this.drawBackground();

    ctx.save();
    ctx.globalAlpha = alpha;

    this.drawPaths();

    this.drawNotes();

    this.drawParticles();

    if (this.dragPreview) {
      this.drawDragPreview();
    }

    ctx.restore();
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const { r, g, b } = this.bg.current;
    const gradient = ctx.createRadialGradient(
      this.width / 2,
      this.height / 2,
      0,
      this.width / 2,
      this.height / 2,
      Math.max(this.width, this.height) * 0.7
    );
    gradient.addColorStop(0, `rgb(${Math.min(255, r + 8)}, ${Math.min(255, g + 8)}, ${Math.min(255, b + 12)})`);
    gradient.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawPaths(): void {
    const ctx = this.ctx;
    if (this.notes.length < 2) return;

    const pulse = (Math.sin(this.time * PATH.PULSE_SPEED) + 1) / 2;
    const lineWidth = PATH.MIN_WIDTH + (PATH.MAX_WIDTH - PATH.MIN_WIDTH) * pulse;

    for (let i = 1; i < this.notes.length; i++) {
      const from = this.notes[i - 1];
      const to = this.notes[i];
      const progress = to.pathProgress;
      if (progress <= 0) continue;

      const fromColor = NOTE_COLORS[from.color];
      const toColor = NOTE_COLORS[to.color];

      const endX = from.x + (to.x - from.x) * progress;
      const endY = from.y + (to.y - from.y) * progress;

      const grad = ctx.createLinearGradient(from.x, from.y, endX, endY);
      grad.addColorStop(0, this.rgba(fromColor.rgb, 0.9));
      grad.addColorStop(1, this.rgba(toColor.rgb, 0.9));

      ctx.save();
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.shadowColor = this.rgba(toColor.rgb, 0.6);
      ctx.shadowBlur = PATH.GLOW_INTENSITY;
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(endX, endY);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawNotes(): void {
    const ctx = this.ctx;
    for (const note of this.notes) {
      const cfg = NOTE_COLORS[note.color];
      let scale = 1;
      if (note.isPlaying) {
        const t = note.pulseProgress;
        const pulse = Math.sin(t * Math.PI);
        scale = 1 + (NOTE.PULSE_SCALE - 1) * pulse;
      }
      const radius = NOTE.RADIUS * scale;

      ctx.save();
      ctx.shadowColor = cfg.hex;
      ctx.shadowBlur = NOTE.GLOW_INTENSITY * (note.isPlaying ? 2 : 1);

      const grad = ctx.createRadialGradient(note.x, note.y, 0, note.x, note.y, radius);
      grad.addColorStop(0, this.rgba(cfg.rgb, 1));
      grad.addColorStop(0.7, this.rgba(cfg.rgb, 0.85));
      grad.addColorStop(1, this.rgba(cfg.rgb, 0.5));

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(note.x, note.y, radius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(note.x - radius * 0.3, note.y - radius * 0.3, radius * 0.25, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawParticles(): void {
    const ctx = this.ctx;
    for (const p of this.particles) {
      const size = p.initialSize * p.life;
      if (size <= 0) continue;
      ctx.save();
      ctx.globalAlpha = p.life * 0.9;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawDragPreview(): void {
    if (!this.dragPreview) return;
    const ctx = this.ctx;
    const cfg = NOTE_COLORS[this.dragPreview.color];
    const radius = NOTE.RADIUS;

    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.shadowColor = cfg.hex;
    ctx.shadowBlur = NOTE.GLOW_INTENSITY * 1.5;
    ctx.fillStyle = cfg.hex;
    ctx.beginPath();
    ctx.arc(this.dragPreview.x, this.dragPreview.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private rgba(rgb: { r: number; g: number; b: number }, a: number): string {
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }
}
