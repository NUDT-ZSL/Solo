export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface BrushState {
  x: number;
  y: number;
  pressure: number;
  color: RGB;
  colorHex: string;
  size: number;
  alpha: number;
  isDrawing: boolean;
}

export const PRESET_COLORS: string[] = [
  '#1a1a1a',
  '#8b4513',
  '#003366',
  '#ffd700',
  '#dc143c',
  '#2e8b57',
  '#f5f5f5',
  '#ff4500'
];

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const bigint = parseInt(clean, 16);
  return {
    r: (bigint >> 16) & 255,
    g: (bigint >> 8) & 255,
    b: bigint & 255
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export class Brush {
  state: BrushState;

  constructor() {
    this.state = {
      x: 0,
      y: 0,
      pressure: 0.5,
      color: hexToRgb(PRESET_COLORS[0]),
      colorHex: PRESET_COLORS[0],
      size: 15,
      alpha: 0.8,
      isDrawing: false
    };
  }

  updatePosition(x: number, y: number): void {
    this.state.x = x;
    this.state.y = y;
  }

  updatePressure(pressure: number): void {
    this.state.pressure = Math.max(0, Math.min(1, pressure));
  }

  setColorByHex(hex: string): void {
    this.state.color = hexToRgb(hex);
    this.state.colorHex = hex.toLowerCase();
  }

  setColorByIndex(index: number): void {
    if (index >= 0 && index < PRESET_COLORS.length) {
      this.setColorByHex(PRESET_COLORS[index]);
    }
  }

  setRandomColor(): void {
    const idx = Math.floor(Math.random() * PRESET_COLORS.length);
    this.setColorByHex(PRESET_COLORS[idx]);
  }

  setSize(size: number): void {
    this.state.size = Math.max(5, Math.min(30, size));
  }

  setAlpha(alpha: number): void {
    this.state.alpha = Math.max(0.1, Math.min(1.0, alpha));
  }

  startDrawing(): void {
    this.state.isDrawing = true;
  }

  stopDrawing(): void {
    this.state.isDrawing = false;
  }

  reset(): void {
    this.state.x = 0;
    this.state.y = 0;
    this.state.pressure = 0.5;
    this.state.isDrawing = false;
  }
}
