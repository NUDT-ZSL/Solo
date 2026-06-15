export interface Note {
  id: number;
  pitchIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  triggered: boolean;
  glowIntensity: number;
}

export interface RenderState {
  notes: Note[];
  isPlaying: boolean;
  canvasWidth: number;
  canvasHeight: number;
}

export const GRID_COLOR = '#3A3A4A';
export const BG_COLOR = '#1E1E2E';
export const NOTE_HEIGHT = 24;
export const NOTE_WIDTH = 20;
export const PITCH_COUNT = 13;
export const SEMITONE_NAMES = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4', 'C5'];
export const PITCH_FREQUENCIES: Record<string, number> = {
  'C4': 261.63, 'C#4': 277.18, 'D4': 293.66, 'D#4': 311.13,
  'E4': 329.63, 'F4': 349.23, 'F#4': 369.99, 'G4': 392.00,
  'G#4': 415.30, 'A4': 440.00, 'A#4': 466.16, 'B4': 493.88, 'C5': 523.25
};

const COLOR_START = { r: 255, g: 107, b: 107 };
const COLOR_END = { r: 78, g: 205, b: 196 };

export function getPitchColor(pitchIndex: number): string {
  const t = pitchIndex / (PITCH_COUNT - 1);
  const r = Math.round(COLOR_START.r + (COLOR_END.r - COLOR_START.r) * t);
  const g = Math.round(COLOR_START.g + (COLOR_END.g - COLOR_START.g) * t);
  const b = Math.round(COLOR_START.b + (COLOR_END.b - COLOR_START.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

export function getRowHeight(canvasHeight: number): number {
  return canvasHeight / PITCH_COUNT;
}

export function getColWidth(): number {
  return NOTE_WIDTH;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;
  }

  clear(): void {
    this.ctx.fillStyle = BG_COLOR;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawGrid(): void {
    const { width, height } = this.canvas;
    this.ctx.strokeStyle = GRID_COLOR;
    this.ctx.lineWidth = 1;

    const rowHeight = getRowHeight(height);
    for (let i = 0; i <= PITCH_COUNT; i++) {
      const y = i * rowHeight;
      this.ctx.beginPath();
      this.ctx.moveTo(0, y);
      this.ctx.lineTo(width, y);
      this.ctx.stroke();
    }

    const colWidth = getColWidth();
    const colCount = Math.ceil(width / colWidth) + 1;
    for (let i = 0; i <= colCount; i++) {
      const x = i * colWidth;
      this.ctx.beginPath();
      this.ctx.moveTo(x, 0);
      this.ctx.lineTo(x, height);
      this.ctx.stroke();
    }

    this.ctx.fillStyle = '#6A6A7A';
    this.ctx.font = '10px sans-serif';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'middle';
    for (let i = 0; i < PITCH_COUNT; i++) {
      const y = i * rowHeight + rowHeight / 2;
      this.ctx.fillText(SEMITONE_NAMES[PITCH_COUNT - 1 - i], 4, y);
    }
  }

  drawNote(note: Note): void {
    const { ctx } = this;

    if (note.glowIntensity > 0) {
      const glowRadius = 30 + note.glowIntensity * 40;
      const gradient = ctx.createRadialGradient(
        note.x + note.width / 2, note.y + note.height / 2, 0,
        note.x + note.width / 2, note.y + note.height / 2, glowRadius
      );
      gradient.addColorStop(0, `${note.color}${Math.floor(note.glowIntensity * 128).toString(16).padStart(2, '0')}`);
      gradient.addColorStop(1, `${note.color}00`);
      ctx.fillStyle = gradient;
      ctx.fillRect(
        note.x - glowRadius,
        note.y - glowRadius,
        note.width + glowRadius * 2,
        note.height + glowRadius * 2
      );
    }

    ctx.fillStyle = `${note.color}CC`;
    ctx.fillRect(note.x, note.y, note.width, note.height);

    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.strokeRect(note.x + 0.5, note.y + 0.5, note.width - 1, note.height - 1);
  }

  render(state: RenderState): void {
    this.clear();
    this.drawGrid();
    for (const note of state.notes) {
      this.drawNote(note);
    }
  }
}
