import { RGB, rgbToCss } from './utils';

export interface BlockRenderData {
  x: number;
  y: number;
  size: number;
  color: RGB;
  alpha: number;
  glow: boolean;
  brightnessBoost: number;
}

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private dpr: number;

  constructor(ctx: CanvasRenderingContext2D, dpr: number) {
    this.ctx = ctx;
    this.dpr = dpr;
  }

  public clear(width: number, height: number): void {
    this.ctx.clearRect(0, 0, width * this.dpr, height * this.dpr);
  }

  public drawBackground(
    width: number,
    height: number,
    innerColor: string = '#0a1128',
    outerColor: string = '#000000'
  ): void {
    const centerX = (width * this.dpr) / 2;
    const centerY = (height * this.dpr) / 2;
    const radius = Math.sqrt(centerX * centerX + centerY * centerY);

    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    gradient.addColorStop(0, innerColor);
    gradient.addColorStop(1, outerColor);

    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width * this.dpr, height * this.dpr);
  }

  public drawTrailOverlay(width: number, height: number, fadeAmount: number): void {
    this.ctx.globalCompositeOperation = 'destination-out';
    this.ctx.fillStyle = `rgba(0, 0, 0, ${fadeAmount})`;
    this.ctx.fillRect(0, 0, width * this.dpr, height * this.dpr);
    this.ctx.globalCompositeOperation = 'source-over';
  }

  public drawBlocks(blocks: BlockRenderData[]): void {
    this.ctx.save();
    this.ctx.scale(this.dpr, this.dpr);

    for (const block of blocks) {
      this.drawSingleBlock(block);
    }

    this.ctx.restore();
  }

  private drawSingleBlock(block: BlockRenderData): void {
    const boostedColor = this.boostBrightness(block.color, block.brightnessBoost);
    const finalAlpha = Math.max(0, Math.min(1, block.alpha));

    if (block.glow) {
      this.applyGlow(block.size, boostedColor, finalAlpha * 0.6);
    }

    this.ctx.fillStyle = rgbToCss(boostedColor, finalAlpha);
    this.ctx.fillRect(
      block.x - block.size / 2,
      block.y - block.size / 2,
      block.size,
      block.size
    );
  }

  private applyGlow(size: number, color: RGB, alpha: number): void {
    const glowSize = size * 2.5;
    const halfGlow = glowSize / 2;

    this.ctx.shadowColor = rgbToCss(color, alpha);
    this.ctx.shadowBlur = glowSize * 0.4;
  }

  private boostBrightness(color: RGB, boost: number): RGB {
    if (boost <= 0) return color;

    const factor = 1 + boost;
    return {
      r: Math.min(255, Math.round(color.r * factor + (factor - 1) * 60)),
      g: Math.min(255, Math.round(color.g * factor + (factor - 1) * 60)),
      b: Math.min(255, Math.round(color.b * factor + (factor - 1) * 60))
    };
  }

  public drawGlowComposite(
    blocks: BlockRenderData[],
    intensity: number = 1
  ): void {
    this.ctx.save();
    this.ctx.scale(this.dpr, this.dpr);
    this.ctx.globalCompositeOperation = 'lighter';

    for (const block of blocks) {
      if (!block.glow && block.brightnessBoost <= 0) continue;

      const boostedColor = this.boostBrightness(block.color, block.brightnessBoost);
      const glowAlpha = Math.min(1, (block.alpha * 0.3 + block.brightnessBoost * 0.5) * intensity);
      const glowSize = block.size * 3;

      const gradient = this.ctx.createRadialGradient(
        block.x, block.y, 0,
        block.x, block.y, glowSize
      );
      gradient.addColorStop(0, rgbToCss(boostedColor, glowAlpha));
      gradient.addColorStop(0.5, rgbToCss(boostedColor, glowAlpha * 0.3));
      gradient.addColorStop(1, rgbToCss(boostedColor, 0));

      this.ctx.fillStyle = gradient;
      this.ctx.fillRect(
        block.x - glowSize,
        block.y - glowSize,
        glowSize * 2,
        glowSize * 2
      );
    }

    this.ctx.restore();
  }

  public setGlobalAlpha(alpha: number): void {
    this.ctx.globalAlpha = alpha;
  }

  public resetGlobalAlpha(): void {
    this.ctx.globalAlpha = 1;
  }
}
