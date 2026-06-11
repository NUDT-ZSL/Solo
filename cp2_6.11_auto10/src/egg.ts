import { Renderer } from './renderer';

export interface EggGenes {
  bodyColor: string;
  eyeColor: string;
  accentColor: string;
  patternSeed: number;
}

export class Egg {
  public x: number;
  public y: number;
  public size: number = 32;
  public clickCount: number = 0;
  public requiredClicks: number = 10;
  public isHatched: boolean = false;
  public isHatching: boolean = false;
  public hatchProgress: number = 0;
  public eggColor: string;
  public genes: EggGenes;
  private pixelGrid: (string | null)[][];
  private wobbleTime: number = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;

    const palettes = [
      { egg: '#F5D442', body: '#FFB347', eye: '#2C3E50', accent: '#E74C3C' },
      { egg: '#FF8C42', body: '#E25822', eye: '#1B2838', accent: '#F39C12' },
      { egg: '#A78BFA', body: '#8B5CF6', eye: '#1B2838', accent: '#EC4899' },
      { egg: '#34D399', body: '#10B981', eye: '#1B2838', accent: '#FBBF24' },
      { egg: '#60A5FA', body: '#3B82F6', eye: '#1E3A5F', accent: '#F472B6' },
      { egg: '#F87171', body: '#EF4444', eye: '#1B2838', accent: '#FCD34D' },
    ];
    const palette = palettes[Math.floor(Math.random() * palettes.length);
    this.eggColor = palette.egg;

    this.genes = {
      bodyColor: palette.body,
      eyeColor: palette.eye,
      accentColor: palette.accent,
      patternSeed: Math.random()
    };

    this.pixelGrid = this.buildEggGrid();
  }

  private buildEggGrid(): (string | null)[][] {
    const size = this.size;
    const grid: (string | null)[][] = Array(size);
    const darkShade = this.shadeColor(this.eggColor, -0.25);
    const lightShade = this.shadeColor(this.eggColor, 0.15);
    const spotColor = this.shadeColor(this.eggColor, -0.1);

    const cx = size / 2;
    const cy = size / 2;

    for (let y = 0; y < size; y++) {
      grid[y] = new Array(size).fill(null);
      for (let x = 0; x < size; x++) {
        const dx = (x - cx) / (size * 0.42);
        const dy = (y - cy) / (size * 0.5);
        const dist = dx * dx + dy * dy;

        if (dist <= 1.0) {
          let color = this.eggColor;

          if (dist > 0.88) {
            color = darkShade;
          } else {
            const nx = (x - cx) / (size * 0.4);
            const ny = (y - cy) / (size * 0.48);
            if (nx * nx + (ny + 0.3) * (ny + 0.3) < 0.12) {
              color = lightShade;
            }
          }

          const seed = (x * 7 + y * 13) % 100 / 100;
          if (dist < 0.75 && seed < 0.18 && Math.abs(x - cx) > 4 && Math.abs(y - cy) > 4) {
            color = spotColor;
          }

          grid[y][x] = color;
        }
      }
    }
    return grid;
  }

  private shadeColor(hex: string, percent: number): string {
    const num = parseInt(hex.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent * 100);
    const R = Math.max(0, Math.min(255, (num >> 16) + amt));
    const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amt));
    const B = Math.max(0, Math.min(255, (num & 0x0000FF) + amt));
    return '#' + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
  }

  public onClick(renderer: Renderer): boolean {
    if (this.isHatched || this.isHatching) return false;

    this.clickCount++;
    this.wobbleTime = 300;

    const particleColors = [this.eggColor, this.shadeColor(this.eggColor, 0.2), this.genes.accentColor, '#FFFFFF'];
    const count = 20 + Math.floor(Math.random() * 11);
    for (let i = 0; i < count; i++) {
      const color = particleColors[Math.floor(Math.random() * particleColors.length)];
      renderer.addHatchParticles(this.x + this.size / 2, this.y + this.size / 2, color, 1);
    }

    if (this.clickCount >= this.requiredClicks) {
      this.isHatching = true;
      this.hatchProgress = 0;
      return true;
    }
    return false;
  }

  public update(dt: number): boolean {
    if (this.wobbleTime > 0) {
      this.wobbleTime -= dt;
    }
    if (this.isHatching && !this.isHatched) {
      this.hatchProgress += dt;
      if (this.hatchProgress >= 1000) {
        this.isHatched = true;
        return true;
      }
    }
    return false;
  }

  public draw(renderer: Renderer): void {
    if (this.isHatched) return;

    let offsetX = 0;
    if (this.wobbleTime > 0) {
      const wobble = Math.sin(this.wobbleTime / 30) * (this.wobbleTime / 300) * 2;
      offsetX = wobble;
    }

    let progress = this.isHatching ? this.hatchProgress / 1000 : 0;
    if (progress > 0) {
      const shake = Math.sin(progress * 50) * 3 * (1 - progress * 0.5);
      offsetX += shake;
    }

    if (progress > 0.5) {
      const alpha = 1 - (progress - 0.5) * 2;
      renderer.drawPixelGrid(this.pixelGrid, this.x + offsetX, this.y, 1, Math.max(0.3, alpha));
    } else {
      renderer.drawPixelGrid(this.pixelGrid, this.x + offsetX, this.y, 1);
    }
  }

  public getCenter(): { x: number; y: number } {
    return { x: this.x + this.size / 2, y: this.y + this.size / 2 };
  }

  public containsPoint(px: number, py: number): boolean {
    const cx = this.x + this.size / 2;
    const cy = this.y + this.size / 2;
    const dx = (px - cx) / (this.size * 0.45);
    const dy = (py - cy) / (this.size * 0.55);
    return dx * dx + dy * dy <= 1.1;
  }

  public triggerShellBreak(renderer: Renderer): void {
    renderer.createShellFragments(
      this.x + this.size / 2,
      this.y + this.size / 2,
      this.size,
      this.eggColor
    );
  }
}
