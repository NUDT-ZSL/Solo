export interface Platform {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

const PLATFORM_HEIGHT = 20;
const MIN_WIDTH = 100;
const MAX_WIDTH = 140;
const MIN_GAP = 20;
const MAX_GAP = 50;
const LAYERS = 5;

function lerpColor(a: string, b: string, t: number): string {
  const ar = parseInt(a.slice(1, 3), 16);
  const ag = parseInt(a.slice(3, 5), 16);
  const ab = parseInt(a.slice(5, 7), 16);
  const br = parseInt(b.slice(1, 3), 16);
  const bg = parseInt(b.slice(3, 5), 16);
  const bb = parseInt(b.slice(5, 7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b2 = Math.round(ab + (bb - ab) * t);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b2.toString(16).padStart(2, '0')}`;
}

function rand(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

export class PlatformManager {
  platforms: Platform[] = [];
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.generate();
  }

  generate(): void {
    this.platforms = [];
    const centerX = this.canvasWidth / 2;
    const startY = this.canvasHeight * 0.3;
    const layerSpacing = (this.canvasHeight * 0.6) / LAYERS;

    const centerWidth = 180;
    this.platforms.push({
      x: centerX - centerWidth / 2,
      y: startY,
      width: centerWidth,
      height: PLATFORM_HEIGHT,
      color: lerpColor('#FF6B6B', '#FFD93D', 0),
    });

    for (let layer = 1; layer < LAYERS; layer++) {
      const y = startY + layer * layerSpacing;
      const t = layer / (LAYERS - 1);
      const baseColor = lerpColor('#FF6B6B', '#FFD93D', t);
      let placed = 0;
      let attempts = 0;
      const minPlatforms = 2;
      const maxPlatforms = 4;
      const targetPlatforms = Math.floor(rand(minPlatforms, maxPlatforms + 1));

      while (placed < targetPlatforms && attempts < 50) {
        attempts++;
        const width = rand(MIN_WIDTH, MAX_WIDTH);
        const x = rand(40, this.canvasWidth - 40 - width);
        let overlaps = false;
        for (const p of this.platforms) {
          if (Math.abs(p.y - y) < 1) {
            if (x < p.x + p.width + MIN_GAP && x + width + MIN_GAP > p.x) {
              overlaps = true;
              break;
            }
          }
        }
        if (!overlaps) {
          this.platforms.push({
            x,
            y,
            width,
            height: PLATFORM_HEIGHT,
            color: baseColor,
          });
          placed++;
        }
      }
    }
  }

  getStartPosition(): { x: number; y: number } {
    const center = this.platforms[0];
    return {
      x: center.x + center.width / 2,
      y: center.y - 20,
    };
  }

  checkCollision(x: number, y: number, w: number, h: number, prevY: number): Platform | null {
    for (const p of this.platforms) {
      if (
        x + w / 2 > p.x &&
        x - w / 2 < p.x + p.width &&
        prevY + h / 2 <= p.y + 2 &&
        y + h / 2 >= p.y
      ) {
        return p;
      }
    }
    return null;
  }

  resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.generate();
  }
}
