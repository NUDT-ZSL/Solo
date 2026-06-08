export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  glowColor: string;
  alive: boolean;
  scale: number;
  destroyTimer: number;
  row: number;
  col: number;
}

const BRICK_WIDTH = 50;
const BRICK_HEIGHT = 20;
const BRICK_GAP = 2;
const BRICK_BORDER = 2;
const DESTROY_DURATION = 0.15;

const ROW_CONFIGS = [
  { count: 12, colors: ['#FF3366', '#FF5544', '#FF7722', '#FF9933'] },
  { count: 12, colors: ['#FF3366', '#FF5544', '#FF7722', '#FF9933'] },
  { count: 12, colors: ['#FF3366', '#FF5544', '#FF7722', '#FF9933'] },
  { count: 10, colors: ['#FFD700', '#CCFF33', '#66FF66', '#33FF99'] },
  { count: 10, colors: ['#FFD700', '#CCFF33', '#66FF66', '#33FF99'] },
  { count: 8, colors: ['#3399FF', '#5566FF', '#7744FF', '#9933FF'] },
  { count: 8, colors: ['#3399FF', '#5566FF', '#7744FF', '#9933FF'] }
];

const NEON_COLORS = [
  '#FF3366',
  '#FF9933',
  '#FFD700',
  '#33FF99',
  '#3399FF',
  '#9933FF'
];

function brightenColor(hex: string, percent: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const br = Math.min(255, Math.round(r + (255 - r) * percent));
  const bg = Math.min(255, Math.round(g + (255 - g) * percent));
  const bb = Math.min(255, Math.round(b + (255 - b) * percent));

  return `#${br.toString(16).padStart(2, '0')}${bg.toString(16).padStart(2, '0')}${bb.toString(16).padStart(2, '0')}`;
}

function lerpColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);

  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

export class BrickManager {
  bricks: Brick[] = [];

  generateBricks(randomize: boolean = false): void {
    this.bricks = [];

    let currentY = 50;

    for (let row = 0; row < ROW_CONFIGS.length; row++) {
      const config = ROW_CONFIGS[row];
      const rowWidth = config.count * BRICK_WIDTH + (config.count - 1) * BRICK_GAP;
      const startX = (800 - rowWidth) / 2;

      for (let col = 0; col < config.count; col++) {
        let color: string;

        if (randomize) {
          color = NEON_COLORS[Math.floor(Math.random() * NEON_COLORS.length)];
        } else {
          const colors = config.colors;
          const t = col / (config.count - 1 || 1);
          const segmentCount = colors.length - 1;
          const segment = Math.min(Math.floor(t * segmentCount), segmentCount - 1);
          const localT = (t * segmentCount) - segment;
          color = lerpColor(colors[segment], colors[segment + 1], localT);
        }

        const glowColor = brightenColor(color, 0.3);

        this.bricks.push({
          x: startX + col * (BRICK_WIDTH + BRICK_GAP),
          y: currentY,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          color,
          glowColor,
          alive: true,
          scale: 1,
          destroyTimer: 0,
          row,
          col
        });
      }

      currentY += BRICK_HEIGHT + BRICK_GAP;
    }
  }

  destroyBrick(brick: Brick): void {
    if (!brick.alive || brick.destroyTimer > 0) return;
    brick.destroyTimer = DESTROY_DURATION;
  }

  update(dt: number): void {
    for (const brick of this.bricks) {
      if (brick.destroyTimer > 0) {
        brick.destroyTimer -= dt;
        brick.scale = Math.max(0, brick.destroyTimer / DESTROY_DURATION);
        if (brick.destroyTimer <= 0) {
          brick.alive = false;
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const brick of this.bricks) {
      if (!brick.alive && brick.scale <= 0) continue;

      const scaledWidth = brick.width * brick.scale;
      const scaledHeight = brick.height * brick.scale;
      const cx = brick.x + brick.width / 2;
      const cy = brick.y + brick.height / 2;
      const drawX = cx - scaledWidth / 2;
      const drawY = cy - scaledHeight / 2;

      ctx.save();
      ctx.shadowBlur = 12;
      ctx.shadowColor = brick.glowColor;

      ctx.fillStyle = brick.color;
      ctx.fillRect(drawX, drawY, scaledWidth, scaledHeight);

      ctx.shadowBlur = 0;
      ctx.strokeStyle = brick.glowColor;
      ctx.lineWidth = BRICK_BORDER;
      ctx.strokeRect(
        drawX + BRICK_BORDER / 2,
        drawY + BRICK_BORDER / 2,
        scaledWidth - BRICK_BORDER,
        scaledHeight - BRICK_BORDER
      );

      ctx.restore();
    }
  }

  isAllCleared(): boolean {
    return this.bricks.every(b => !b.alive);
  }

  getActiveBricks(): Brick[] {
    return this.bricks.filter(b => b.alive && b.destroyTimer <= 0);
  }
}
