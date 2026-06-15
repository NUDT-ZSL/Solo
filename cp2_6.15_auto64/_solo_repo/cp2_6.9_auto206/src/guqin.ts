import { HUI_POSITIONS } from './score';

export interface HighlightPos {
  stringIdx: number;
  huiIdx: number;
}

interface ActiveNote extends HighlightPos {
  startTime: number;
  duration: number;
  isDemo?: boolean;
}

interface DemoMarker extends HighlightPos {}

export class GuqinRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private readonly QIN_WIDTH: number;
  private readonly QIN_HEIGHT: number;
  private readonly STRING_COUNT: number = 7;
  private readonly HUI_COUNT: number = 19;
  private readonly STRING_SPACING: number = 20;
  private readonly HUI_SPACING: number = 50;
  private readonly HUI_RADIUS: number = 3;

  private stringStartX: number;
  private stringEndX: number;
  private firstStringY: number;

  private activeNotes: ActiveNote[] = [];
  private demoMarkers: DemoMarker[] = [];
  private animationFrameId: number | null = null;
  private lastTime: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.QIN_WIDTH = canvas.width;
    this.QIN_HEIGHT = canvas.height;

    this.stringStartX = 80;
    this.stringEndX = this.QIN_WIDTH - 80;
    this.firstStringY = this.QIN_HEIGHT / 2 - ((this.STRING_COUNT - 1) * this.STRING_SPACING) / 2;

    this.startAnimationLoop();
    this.draw();
  }

  getPosition(stringIdx: number, huiIdx: number): { x: number; y: number } {
    const x = this.stringStartX + huiIdx * this.HUI_SPACING;
    const y = this.firstStringY + stringIdx * this.STRING_SPACING;
    return { x, y };
  }

  getStringHuiAtPoint(px: number, py: number): HighlightPos | null {
    const tolerance = 12;
    let nearest: { dist: number; pos: HighlightPos } | null = null;

    for (let s = 0; s < this.STRING_COUNT; s++) {
      for (let h = 0; h < this.HUI_COUNT; h++) {
        const pos = this.getPosition(s, h);
        const dx = px - pos.x;
        const dy = py - pos.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < tolerance && (!nearest || dist < nearest.dist)) {
          nearest = { dist, pos: { stringIdx: s, huiIdx: h } };
        }
      }
    }

    return nearest ? nearest.pos : null;
  }

  addActiveNote(stringIdx: number, huiIdx: number, duration: number = 600, isDemo: boolean = false): void {
    this.activeNotes.push({
      stringIdx,
      huiIdx,
      startTime: performance.now(),
      duration,
      isDemo
    });
  }

  setDemoMarkers(markers: HighlightPos[]): void {
    this.demoMarkers = markers.map(m => ({ stringIdx: m.stringIdx, huiIdx: m.huiIdx }));
  }

  clearDemoMarkers(): void {
    this.demoMarkers = [];
  }

  private startAnimationLoop(): void {
    const loop = (now: number) => {
      if (now - this.lastTime >= 16) {
        this.activeNotes = this.activeNotes.filter(n => now - n.startTime < n.duration);
        this.draw();
        this.lastTime = now;
      }
      this.animationFrameId = requestAnimationFrame(loop);
    };
    this.animationFrameId = requestAnimationFrame(loop);
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.QIN_WIDTH, this.QIN_HEIGHT);

    this.drawQinBody();
    this.drawStrings();
    this.drawHuis();
    this.drawDemoMarkers();
    this.drawActiveNotes();
  }

  private drawQinBody(): void {
    const ctx = this.ctx;

    const bodyGradient = ctx.createLinearGradient(0, 0, this.QIN_WIDTH, this.QIN_HEIGHT);
    bodyGradient.addColorStop(0, '#7A4A22');
    bodyGradient.addColorStop(0.3, '#8B5A2B');
    bodyGradient.addColorStop(0.5, '#9A6A3B');
    bodyGradient.addColorStop(0.7, '#8B5A2B');
    bodyGradient.addColorStop(1, '#6B4226');

    const radius = 8;
    ctx.beginPath();
    ctx.roundRect(0, 0, this.QIN_WIDTH, this.QIN_HEIGHT, radius);
    ctx.fillStyle = bodyGradient;
    ctx.fill();

    ctx.strokeStyle = 'rgba(50, 25, 10, 0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.strokeStyle = 'rgba(60, 30, 15, 0.12)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 25; i++) {
      const y = Math.random() * this.QIN_HEIGHT;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.bezierCurveTo(
        this.QIN_WIDTH * 0.25, y + (Math.random() - 0.5) * 10,
        this.QIN_WIDTH * 0.75, y + (Math.random() - 0.5) * 10,
        this.QIN_WIDTH, y + (Math.random() - 0.5) * 6
      );
      ctx.stroke();
    }
  }

  private drawStrings(): void {
    const ctx = this.ctx;

    for (let s = 0; s < this.STRING_COUNT; s++) {
      const y = this.firstStringY + s * this.STRING_SPACING;
      const thickness = 1.2 + s * 0.25;

      const stringGradient = ctx.createLinearGradient(this.stringStartX, y - 1, this.stringEndX, y + 1);
      stringGradient.addColorStop(0, '#B8956A');
      stringGradient.addColorStop(0.3, '#D4A76A');
      stringGradient.addColorStop(0.5, '#E8C48A');
      stringGradient.addColorStop(0.7, '#D4A76A');
      stringGradient.addColorStop(1, '#B8956A');

      ctx.beginPath();
      ctx.moveTo(this.stringStartX, y);
      ctx.lineTo(this.stringEndX, y);
      ctx.strokeStyle = stringGradient;
      ctx.lineWidth = thickness;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(this.stringStartX, y - 0.5);
      ctx.lineTo(this.stringEndX, y - 0.5);
      ctx.strokeStyle = 'rgba(255, 235, 200, 0.35)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    }

    for (let s = 0; s < this.STRING_COUNT; s++) {
      const y = this.firstStringY + s * this.STRING_SPACING;
      ctx.beginPath();
      ctx.arc(this.stringStartX - 8, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#3D2B1F';
      ctx.fill();

      ctx.beginPath();
      ctx.arc(this.stringEndX + 8, y, 3, 0, Math.PI * 2);
      ctx.fillStyle = '#3D2B1F';
      ctx.fill();
    }
  }

  private drawHuis(): void {
    const ctx = this.ctx;

    for (let s = 0; s < this.STRING_COUNT; s++) {
      const y = this.firstStringY + s * this.STRING_SPACING;
      for (let h = 0; h < this.HUI_COUNT; h++) {
        const x = this.stringStartX + h * this.HUI_SPACING;

        ctx.beginPath();
        ctx.arc(x, y, this.HUI_RADIUS, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(230, 230, 230, 0.7)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(x, y, this.HUI_RADIUS + 0.5, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(180, 180, 180, 0.4)';
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  private drawDemoMarkers(): void {
    const ctx = this.ctx;
    for (const marker of this.demoMarkers) {
      const pos = this.getPosition(marker.stringIdx, marker.huiIdx);

      const glowGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, 15);
      glowGradient.addColorStop(0, 'rgba(255, 80, 80, 0.5)');
      glowGradient.addColorStop(1, 'rgba(255, 80, 80, 0)');

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 15, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 60, 60, 0.7)';
      ctx.fill();
    }
  }

  private drawActiveNotes(): void {
    const ctx = this.ctx;
    const now = performance.now();

    for (const note of this.activeNotes) {
      const elapsed = now - note.startTime;
      const progress = elapsed / note.duration;
      if (progress >= 1) continue;

      const pos = this.getPosition(note.stringIdx, note.huiIdx);
      const alpha = 1 - progress;
      const radius = 12 + progress * 10;

      const glowGradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius);
      glowGradient.addColorStop(0, `rgba(255, 215, 100, ${0.8 * alpha})`);
      glowGradient.addColorStop(0.5, `rgba(255, 180, 80, ${0.4 * alpha})`);
      glowGradient.addColorStop(1, 'rgba(255, 150, 50, 0)');

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = glowGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 240, 180, ${alpha})`;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 5.5, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 220, 120, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}
