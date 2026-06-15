import { Point, Theme, Flower } from './flower.js';
import { Branch } from './branch.js';

interface ThemeColors {
  bgStart: string;
  bgEnd: string;
  flowerGlow: string;
  flowerShadow: string;
}

const THEMES: Record<Theme, ThemeColors> = {
  night: {
    bgStart: '#0d0d2b',
    bgEnd: '#000011',
    flowerGlow: 'rgba(255, 180, 220, 0.6)',
    flowerShadow: 'transparent'
  },
  morning: {
    bgStart: '#e8f5e9',
    bgEnd: '#fff9c4',
    flowerGlow: 'transparent',
    flowerShadow: 'rgba(0, 0, 0, 0.12)'
  }
};

const MAX_UNDO = 10;

export interface HoverResult {
  id: string | null;
  name: string | null;
  position: Point | null;
}

export class Garden {
  private branches: Branch[] = [];
  private undoStack: string[][] = [];
  public theme: Theme = 'night';
  private _elapsed: number = 0;
  private _hoveredFlowerId: string | null = null;
  private _hoveredFlowerName: string | null = null;
  private _hoveredPosition: Point | null = null;

  private _themeTransition: {
    active: boolean;
    progress: number;
    from: Theme;
    to: Theme;
  } = { active: false, progress: 0, from: 'night', to: 'morning' };

  constructor() {}

  public addBranch(points: Point[]): void {
    if (points.length < 2) return;
    const branch = new Branch(points, 0);
    this.branches.push(branch);
    this.undoStack.push([branch.id]);
    if (this.undoStack.length > MAX_UNDO) {
      this.undoStack.shift();
    }
  }

  public undo(): boolean {
    const lastIds = this.undoStack.pop();
    if (!lastIds || lastIds.length === 0) return false;
    this.branches = this.branches.filter(b => !lastIds.includes(b.id));
    return true;
  }

  public clear(): void {
    this.branches = [];
    this.undoStack = [];
  }

  public toggleTheme(): void {
    const next: Theme = this.theme === 'night' ? 'morning' : 'night';
    this._themeTransition = {
      active: true,
      progress: 0,
      from: this.theme,
      to: next
    };
  }

  public getHoverResult(): HoverResult {
    if (this._hoveredFlowerId && this._hoveredFlowerName) {
      return {
        id: this._hoveredFlowerId,
        name: this._hoveredFlowerName,
        position: this._hoveredPosition
      };
    }
    return { id: null, name: null, position: null };
  }

  public update(dt: number, mouseX: number, mouseY: number): void {
    this._elapsed += dt;
    if (this._themeTransition.active) {
      this._themeTransition.progress = Math.min(1, this._themeTransition.progress + dt);
      if (this._themeTransition.progress >= 1) {
        this.theme = this._themeTransition.to;
        this._themeTransition.active = false;
      }
    }
    this._updateHover(mouseX, mouseY);
    for (const branch of this.branches) {
      branch.update(dt, 1.0, this._hoveredFlowerId);
    }
  }

  public render(ctx: CanvasRenderingContext2D, width: number, height: number): void {
    const colors = this._getCurrentColors();
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, colors.bgStart);
    gradient.addColorStop(1, colors.bgEnd);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    const wind = Math.sin(this._elapsed * (Math.PI * 2 / 3)) * 0.3;
    for (const branch of this.branches) {
      branch.render(ctx, this.theme, wind, this._elapsed);
    }
  }

  private _getCurrentColors(): ThemeColors {
    if (!this._themeTransition.active) {
      return THEMES[this.theme];
    }
    const t = this._easeInOutCubic(this._themeTransition.progress);
    const from = THEMES[this._themeTransition.from];
    const to = THEMES[this._themeTransition.to];
    return {
      bgStart: this._interpolateHex(from.bgStart, to.bgStart, t),
      bgEnd: this._interpolateHex(from.bgEnd, to.bgEnd, t),
      flowerGlow: from.flowerGlow,
      flowerShadow: from.flowerShadow
    };
  }

  private _updateHover(mouseX: number, mouseY: number): void {
    this._hoveredFlowerId = null;
    this._hoveredFlowerName = null;
    this._hoveredPosition = null;
    for (let i = this.branches.length - 1; i >= 0; i--) {
      const allFlowers: { id: string; flower: Flower }[] = this.branches[i].getAllFlowers();
      for (let j = allFlowers.length - 1; j >= 0; j--) {
        const { id, flower } = allFlowers[j];
        const dx = mouseX - flower.position.x;
        const dy = mouseY - flower.position.y;
        const hitRadius = flower.maxRadius * 1.8;
        if (dx * dx + dy * dy <= hitRadius * hitRadius) {
          this._hoveredFlowerId = id;
          this._hoveredFlowerName = flower.name;
          this._hoveredPosition = { x: mouseX, y: mouseY };
          return;
        }
      }
    }
  }

  private _easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private _interpolateHex(hex1: string, hex2: string, t: number): string {
    const c1 = this._parseHex(hex1);
    const c2 = this._parseHex(hex2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `rgb(${r},${g},${b})`;
  }

  private _parseHex(hex: string): { r: number; g: number; b: number } {
    const m = hex.replace('#', '');
    if (m.length === 3) {
      return {
        r: parseInt(m[0] + m[0], 16),
        g: parseInt(m[1] + m[1], 16),
        b: parseInt(m[2] + m[2], 16)
      };
    }
    return {
      r: parseInt(m.substring(0, 2), 16),
      g: parseInt(m.substring(2, 4), 16),
      b: parseInt(m.substring(4, 6), 16)
    };
  }
}
