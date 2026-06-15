export type ArtStyle = 'abstract' | 'impressionist';

export interface ArtConfig {
  style: ArtStyle;
  palette: string[];
  seed: number;
}

interface Shape {
  type: 'rect' | 'ellipse' | 'curve' | 'stroke';
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  opacity: number;
  angle: number;
  points?: { x: number; y: number }[];
}

const ABSTRACT_PALETTES: string[][] = [
  ['#8B0000', '#1a237e', '#FFD700', '#FAFAFA', '#212121'],
  ['#0d47a1', '#e65100', '#00695c', '#FFF8E1', '#263238'],
  ['#880e4f', '#1b5e20', '#0d47a1', '#ff7043', '#37474f'],
  ['#4a148c', '#f57f17', '#004d40', '#ff5252', '#1a1a2e'],
  ['#b71c1c', '#006064', '#f9a825', '#e0e0e0', '#1b1b1b'],
];

const IMPRESSIONIST_PALETTES: string[][] = [
  ['#E6D5F5', '#F5C6D0', '#D5E8F5', '#C6F5D5', '#FFF5E1'],
  ['#F5E6CC', '#C6D5A0', '#D5A0C6', '#A0C6D5', '#F5D5C6'],
  ['#FFE4C4', '#C4E4FF', '#E4FFC4', '#FFC4E4', '#C4FFE4'],
  ['#F0D0A0', '#A0D0F0', '#D0A0F0', '#A0F0D0', '#F0A0D0'],
  ['#E8D5B0', '#B0D5E8', '#D5B0E8', '#B0E8D5', '#E8B0D5'],
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class ArtGenerator {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private config: ArtConfig | null = null;
  private shapes: Shape[] = [];
  private rand: (() => number) | null = null;

  constructor(private size: number) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = size;
    this.canvas.height = size;
    this.ctx = this.canvas.getContext('2d')!;
  }

  generate(level: number): ArtConfig {
    const style: ArtStyle = level % 2 === 1 ? 'abstract' : 'impressionist';
    const paletteIndex = (level - 1) % 5;
    const palette =
      style === 'abstract'
        ? ABSTRACT_PALETTES[paletteIndex]
        : IMPRESSIONIST_PALETTES[paletteIndex];
    const seed = level * 7919 + 42;

    this.config = { style, palette, seed };
    this.rand = seededRandom(seed);
    this.shapes = this.createShapes();

    this.renderArt();
    return this.config;
  }

  private createShapes(): Shape[] {
    if (!this.config || !this.rand) return [];
    const { style, palette } = this.config;
    const rand = this.rand;
    const s = this.size;
    const shapes: Shape[] = [];

    if (style === 'abstract') {
      const bg = palette[4];
      shapes.push({
        type: 'rect',
        x: 0,
        y: 0,
        w: s,
        h: s,
        color: bg,
        opacity: 1,
        angle: 0,
      });

      for (let i = 0; i < 12; i++) {
        const type = rand() > 0.5 ? 'ellipse' : 'rect';
        shapes.push({
          type,
          x: rand() * s * 0.8,
          y: rand() * s * 0.8,
          w: s * 0.15 + rand() * s * 0.4,
          h: s * 0.15 + rand() * s * 0.4,
          color: palette[Math.floor(rand() * 4)],
          opacity: 0.4 + rand() * 0.5,
          angle: rand() * Math.PI * 0.5,
        });
      }

      for (let i = 0; i < 6; i++) {
        const points: { x: number; y: number }[] = [];
        const startX = rand() * s;
        const startY = rand() * s;
        points.push({ x: startX, y: startY });
        for (let j = 0; j < 4; j++) {
          points.push({
            x: startX + (rand() - 0.5) * s * 0.6,
            y: startY + (rand() - 0.5) * s * 0.6,
          });
        }
        shapes.push({
          type: 'curve',
          x: 0,
          y: 0,
          w: 0,
          h: 0,
          color: palette[Math.floor(rand() * 4)],
          opacity: 0.5 + rand() * 0.4,
          angle: 0,
          points,
        });
      }

      for (let i = 0; i < 8; i++) {
        const points: { x: number; y: number }[] = [];
        const y = rand() * s;
        const x = rand() * s * 0.3;
        points.push({ x, y });
        points.push({ x: x + s * 0.3 + rand() * s * 0.5, y: y + (rand() - 0.5) * s * 0.1 });
        shapes.push({
          type: 'stroke',
          x: 0,
          y: 0,
          w: 0,
          h: 0,
          color: palette[Math.floor(rand() * 4)],
          opacity: 0.3 + rand() * 0.5,
          angle: 0,
          points,
        });
      }
    } else {
      const bg = palette[4];
      shapes.push({
        type: 'rect',
        x: 0,
        y: 0,
        w: s,
        h: s,
        color: bg,
        opacity: 1,
        angle: 0,
      });

      const gradX1 = rand() * s;
      const gradY1 = rand() * s;
      shapes.push({
        type: 'rect',
        x: 0,
        y: 0,
        w: s,
        h: s,
        color: palette[0],
        opacity: 0.3,
        angle: 0,
      });

      for (let i = 0; i < 150; i++) {
        const radius = s * 0.01 + rand() * s * 0.04;
        shapes.push({
          type: 'ellipse',
          x: rand() * s - radius,
          y: rand() * s - radius,
          w: radius * 2,
          h: radius * 2,
          color: palette[Math.floor(rand() * 5)],
          opacity: 0.15 + rand() * 0.45,
          angle: 0,
        });
      }

      for (let i = 0; i < 40; i++) {
        const points: { x: number; y: number }[] = [];
        const startX = rand() * s;
        const startY = rand() * s;
        points.push({ x: startX, y: startY });
        points.push({
          x: startX + (rand() - 0.5) * s * 0.15,
          y: startY + (rand() - 0.5) * s * 0.15,
        });
        shapes.push({
          type: 'stroke',
          x: 0,
          y: 0,
          w: 0,
          h: 0,
          color: palette[Math.floor(rand() * 5)],
          opacity: 0.2 + rand() * 0.4,
          angle: 0,
          points,
        });
      }

      for (let i = 0; i < 20; i++) {
        shapes.push({
          type: 'ellipse',
          x: rand() * s,
          y: rand() * s,
          w: s * 0.05 + rand() * s * 0.1,
          h: s * 0.05 + rand() * s * 0.1,
          color: palette[Math.floor(rand() * 5)],
          opacity: 0.1 + rand() * 0.2,
          angle: rand() * Math.PI,
        });
      }
    }

    return shapes;
  }

  private renderArt(): void {
    const ctx = this.ctx;
    const s = this.size;
    ctx.clearRect(0, 0, s, s);

    for (const shape of this.shapes) {
      ctx.save();
      ctx.globalAlpha = shape.opacity;

      switch (shape.type) {
        case 'rect': {
          if (shape.angle !== 0) {
            ctx.translate(shape.x + shape.w / 2, shape.y + shape.h / 2);
            ctx.rotate(shape.angle);
            ctx.translate(-shape.w / 2, -shape.h / 2);
            ctx.fillStyle = shape.color;
            ctx.fillRect(0, 0, shape.w, shape.h);
          } else {
            ctx.fillStyle = shape.color;
            ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
          }
          break;
        }
        case 'ellipse': {
          ctx.translate(shape.x + shape.w / 2, shape.y + shape.h / 2);
          if (shape.angle) ctx.rotate(shape.angle);
          ctx.beginPath();
          ctx.ellipse(0, 0, shape.w / 2, shape.h / 2, 0, 0, Math.PI * 2);
          ctx.fillStyle = shape.color;
          ctx.fill();
          break;
        }
        case 'curve': {
          if (!shape.points || shape.points.length < 2) break;
          ctx.lineWidth = 2 + Math.random() * 8;
          ctx.strokeStyle = shape.color;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          for (let i = 1; i < shape.points.length - 1; i++) {
            const xc = (shape.points[i].x + shape.points[i + 1].x) / 2;
            const yc = (shape.points[i].y + shape.points[i + 1].y) / 2;
            ctx.quadraticCurveTo(shape.points[i].x, shape.points[i].y, xc, yc);
          }
          const last = shape.points[shape.points.length - 1];
          ctx.lineTo(last.x, last.y);
          ctx.stroke();
          break;
        }
        case 'stroke': {
          if (!shape.points || shape.points.length < 2) break;
          ctx.lineWidth = 3 + Math.random() * 12;
          ctx.strokeStyle = shape.color;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(shape.points[0].x, shape.points[0].y);
          ctx.lineTo(shape.points[1].x, shape.points[1].y);
          ctx.stroke();
          break;
        }
      }

      ctx.restore();
    }
  }

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  getSize(): number {
    return this.size;
  }

  getConfig(): ArtConfig | null {
    return this.config;
  }
}
