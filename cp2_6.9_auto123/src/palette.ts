export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface BaseColor {
  name: string;
  hex: string;
  rgb: RGB;
}

export const BASE_COLORS: BaseColor[] = [
  { name: '朱红', hex: '#C23B22', rgb: { r: 194, g: 59, b: 34 } },
  { name: '藤黄', hex: '#FFD700', rgb: { r: 255, g: 215, b: 0 } },
  { name: '花青', hex: '#2E5D8A', rgb: { r: 46, g: 93, b: 138 } },
  { name: '赭石', hex: '#A0522D', rgb: { r: 160, g: 82, b: 45 } },
  { name: '石绿', hex: '#3CB371', rgb: { r: 60, g: 179, b: 113 } },
  { name: '钛白', hex: '#FFFFFF', rgb: { r: 255, g: 255, b: 255 } },
  { name: '墨黑', hex: '#1A1A1A', rgb: { r: 26, g: 26, b: 26 } },
  { name: '胭脂', hex: '#DC143C', rgb: { r: 220, g: 20, b: 60 } },
  { name: '三绿', hex: '#00A86B', rgb: { r: 0, g: 168, b: 107 } },
  { name: '酞青', hex: '#003366', rgb: { r: 0, g: 51, b: 102 } },
  { name: '钛青', hex: '#0D98BA', rgb: { r: 13, g: 152, b: 186 } },
  { name: '玫瑰红', hex: '#FF007F', rgb: { r: 255, g: 0, b: 127 } },
];

export class Palette {
  private _currentColor: RGBA;
  private _activeBaseIndex: number;
  private _listeners: Set<() => void>;

  constructor() {
    this._currentColor = { r: 194, g: 59, b: 34, a: 0.7 };
    this._activeBaseIndex = 0;
    this._listeners = new Set();
  }

  get currentColor(): RGBA {
    return { ...this._currentColor };
  }

  get activeBaseIndex(): number {
    return this._activeBaseIndex;
  }

  onChange(callback: () => void): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  private _emit(): void {
    this._listeners.forEach((cb) => cb());
  }

  setRGB(r: number, g: number, b: number): void {
    this._currentColor.r = Math.max(0, Math.min(255, Math.round(r)));
    this._currentColor.g = Math.max(0, Math.min(255, Math.round(g)));
    this._currentColor.b = Math.max(0, Math.min(255, Math.round(b)));
    this._activeBaseIndex = -1;
    this._emit();
  }

  setR(value: number): void {
    this.setRGB(value, this._currentColor.g, this._currentColor.b);
  }

  setG(value: number): void {
    this.setRGB(this._currentColor.r, value, this._currentColor.b);
  }

  setB(value: number): void {
    this.setRGB(this._currentColor.r, this._currentColor.g, value);
  }

  setAlpha(value: number): void {
    this._currentColor.a = Math.max(0, Math.min(1, value));
    this._emit();
  }

  selectBaseColor(index: number): void {
    if (index >= 0 && index < BASE_COLORS.length) {
      const color = BASE_COLORS[index];
      this._currentColor.r = color.rgb.r;
      this._currentColor.g = color.rgb.g;
      this._currentColor.b = color.rgb.b;
      this._activeBaseIndex = index;
      this._emit();
    }
  }

  setFromRGBA(rgba: RGBA): void {
    this._currentColor = {
      r: Math.max(0, Math.min(255, Math.round(rgba.r))),
      g: Math.max(0, Math.min(255, Math.round(rgba.g))),
      b: Math.max(0, Math.min(255, Math.round(rgba.b))),
      a: Math.max(0, Math.min(1, rgba.a)),
    };
    this._activeBaseIndex = -1;
    this._emit();
  }

  getCssColor(alphaOverride?: number): string {
    const a = alphaOverride !== undefined ? alphaOverride : this._currentColor.a;
    return `rgba(${this._currentColor.r}, ${this._currentColor.g}, ${this._currentColor.b}, ${a})`;
  }

  static hexToRgb(hex: string): RGB | null {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  static rgbToHex(r: number, g: number, b: number): string {
    return (
      '#' +
      [r, g, b]
        .map((x) => {
          const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
          return hex.length === 1 ? '0' + hex : hex;
        })
        .join('')
        .toUpperCase()
    );
  }
}
